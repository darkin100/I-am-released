const { createClient } = require('@supabase/supabase-js');
const { Octokit } = require('@octokit/rest');
const { validateGitHubEndpoint } = require('./validation/schemas');
const { withLogging } = require('./utils/logger');

// Check for required environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('Missing required environment variables: SUPABASE_URL or SUPABASE_SERVICE_KEY');
}

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || ''
);

// Rate limiting store (in production, use Vercel KV or Redis)
const rateLimitStore = new Map();

async function checkRateLimit(userId, limit = 60, logger = null) {
  const now = Date.now();
  const userLimit = rateLimitStore.get(userId);
  
  if (!userLimit || userLimit.resetAt < now) {
    rateLimitStore.set(userId, {
      count: 1,
      resetAt: now + 3600000 // 1 hour
    });
    if (logger) logger.logRateLimit(userId, true, limit, 1);
    return true;
  }
  
  if (userLimit.count >= limit) { // 60 requests per hour
    if (logger) logger.logRateLimit(userId, false, limit, userLimit.count);
    return false;
  }
  
  userLimit.count++;
  if (logger) logger.logRateLimit(userId, true, limit, userLimit.count);
  return true;
}

async function getProviderToken(userId, sessionToken) {
  try {
    // First, try to get the current session to check token validity
    const { data: { user }, error: userError } = await supabase.auth.getUser(sessionToken);
    
    if (userError || !user) {
      throw new Error('Invalid session');
    }

    // Try to refresh the session to get fresh tokens
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    
    if (!refreshError && refreshData?.session?.provider_token) {
      // Return the refreshed token
      return refreshData.session.provider_token;
    }

    // Fallback: fetch from database (this might be stale)
    const { data, error } = await supabase
      .from('auth.users')
      .select('raw_app_meta_data')
      .eq('id', userId)
      .single();

    if (error || !data?.raw_app_meta_data?.provider_token) {
      throw new Error('GitHub token not found');
    }

    return data.raw_app_meta_data.provider_token;
  } catch (error) {
    console.error('Error getting provider token:', error);
    throw new Error('GitHub token not found');
  }
}

async function githubProxyHandler(req, res) {
  const logger = req.logger;
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check for required environment variables
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      logger.error('Missing Supabase environment variables', null, {
        hasSupabaseUrl: !!process.env.SUPABASE_URL,
        hasSupabaseKey: !!process.env.SUPABASE_SERVICE_KEY
      });
      return res.status(500).json({ 
        error: 'Server configuration error. Please check environment variables.',
        requestId: logger.requestId
      });
    }

    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      logger.logAuth(false, null, new Error('Missing or invalid authorization header'));
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    const authStartTime = Date.now();
    const { data: { user }, error } = await supabase.auth.getUser(token);
    const authDuration = Date.now() - authStartTime;

    if (error || !user) {
      logger.logAuth(false, null, error);
      logger.logExternalAPI('supabase', 'auth.getUser', false, authDuration, error);
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    logger.logAuth(true, user.id);
    logger.logExternalAPI('supabase', 'auth.getUser', true, authDuration);

    // Check rate limit
    if (!await checkRateLimit(user.id, 60, logger)) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded. Try again later.',
        requestId: logger.requestId
      });
    }

    // Get the provider token securely with refresh capability
    const tokenStartTime = Date.now();
    let providerToken;
    try {
      providerToken = await getProviderToken(user.id, token);
      logger.info('Provider token retrieved successfully', { 
        userId: user.id,
        duration: Date.now() - tokenStartTime
      });
    } catch (tokenError) {
      logger.error('Failed to get provider token', tokenError, { userId: user.id });
      throw tokenError;
    }
    const octokit = new Octokit({ auth: providerToken });

    // Handle different GitHub API endpoints
    const { endpoint, ...params } = req.body;

    if (!endpoint || typeof endpoint !== 'string') {
      logger.warn('Invalid endpoint provided', { endpoint });
      return res.status(400).json({ error: 'Invalid endpoint' });
    }

    // Validate parameters for the endpoint
    const validation = validateGitHubEndpoint(endpoint, params);
    if (validation.error) {
      logger.warn('Validation failed', { endpoint, error: validation.error });
      return res.status(400).json({ error: validation.error });
    }
    
    logger.info('Processing GitHub API request', { endpoint, userId: user.id });

    let result;
    const githubStartTime = Date.now();
    try {
      switch (endpoint) {
        case 'repos.listTags':
          result = await octokit.repos.listTags(validation.value);
          break;
        
        case 'repos.compareCommits':
          result = await octokit.repos.compareCommits(validation.value);
          break;
        
        case 'repos.listForAuthenticatedUser':
          result = await octokit.repos.listForAuthenticatedUser(validation.value);
          break;
        
        case 'repos.get':
          result = await octokit.repos.get(validation.value);
          break;
        
        default:
          logger.warn('Unsupported endpoint requested', { endpoint });
          return res.status(400).json({ error: 'Unsupported endpoint' });
      }
      
      const githubDuration = Date.now() - githubStartTime;
      logger.logExternalAPI('github', endpoint, true, githubDuration);
      
    } catch (githubError) {
      const githubDuration = Date.now() - githubStartTime;
      logger.logExternalAPI('github', endpoint, false, githubDuration, githubError);
      throw githubError;
    }

    // Log successful response metrics
    logger.info('GitHub API call successful', {
      endpoint,
      userId: user.id,
      rateLimitRemaining: result.headers['x-ratelimit-remaining'],
      responseSize: JSON.stringify(result.data).length
    });

    return res.status(200).json({
      data: result.data,
      headers: {
        'x-ratelimit-remaining': result.headers['x-ratelimit-remaining'],
        'x-ratelimit-reset': result.headers['x-ratelimit-reset']
      }
    });

  } catch (error) {
    logger.error('GitHub API proxy error', error, {
      endpoint: req.body?.endpoint,
      userId: req.body?.userId,
      errorStatus: error.status
    });
    
    // Handle specific errors
    if (error.message === 'GitHub token not found') {
      return res.status(401).json({ 
        error: 'GitHub authentication required. Please sign out and sign in again.',
        requestId: logger.requestId
      });
    }
    
    if (error.status === 401) {
      return res.status(401).json({ 
        error: 'GitHub token expired. Please sign out and sign in again.',
        requestId: logger.requestId
      });
    }
    
    if (error.status === 404) {
      return res.status(404).json({ 
        error: 'Resource not found',
        requestId: logger.requestId
      });
    }
    
    // Never expose internal errors to clients
    return res.status(500).json({ 
      error: 'An error occurred while processing your request',
      requestId: logger.requestId
    });
  }
}

// Export with logging middleware
module.exports = withLogging('github-proxy', githubProxyHandler);