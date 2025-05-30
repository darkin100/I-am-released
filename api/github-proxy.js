const { createClient } = require('@supabase/supabase-js');
const { Octokit } = require('@octokit/rest');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Rate limiting store (in production, use Vercel KV or Redis)
const rateLimitStore = new Map();

async function checkRateLimit(userId, limit = 60) {
  const now = Date.now();
  const userLimit = rateLimitStore.get(userId);
  
  if (!userLimit || userLimit.resetAt < now) {
    rateLimitStore.set(userId, {
      count: 1,
      resetAt: now + 3600000 // 1 hour
    });
    return true;
  }
  
  if (userLimit.count >= limit) { // 60 requests per hour
    return false;
  }
  
  userLimit.count++;
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

module.exports = async function handler(req, res) {
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

  try {
    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Check rate limit
    if (!await checkRateLimit(user.id)) {
      return res.status(429).json({ error: 'Rate limit exceeded. Try again later.' });
    }

    // Get the provider token securely with refresh capability
    const providerToken = await getProviderToken(user.id, token);
    const octokit = new Octokit({ auth: providerToken });

    // Handle different GitHub API endpoints
    const { endpoint, ...params } = req.body;

    if (!endpoint || typeof endpoint !== 'string') {
      return res.status(400).json({ error: 'Invalid endpoint' });
    }

    let result;
    switch (endpoint) {
      case 'repos.listTags':
        result = await octokit.repos.listTags(params);
        break;
      
      case 'repos.compareCommits':
        result = await octokit.repos.compareCommits(params);
        break;
      
      case 'repos.listForAuthenticatedUser':
        result = await octokit.repos.listForAuthenticatedUser(params);
        break;
      
      case 'repos.get':
        result = await octokit.repos.get(params);
        break;
      
      default:
        return res.status(400).json({ error: 'Unsupported endpoint' });
    }

    // Log usage for monitoring (never log sensitive data)
    console.log(`GitHub API ${endpoint} called by user ${user.id}`);

    return res.status(200).json({
      data: result.data,
      headers: {
        'x-ratelimit-remaining': result.headers['x-ratelimit-remaining'],
        'x-ratelimit-reset': result.headers['x-ratelimit-reset']
      }
    });

  } catch (error) {
    console.error('GitHub API proxy error:', error);
    
    // Handle specific errors
    if (error.message === 'GitHub token not found') {
      return res.status(401).json({ 
        error: 'GitHub authentication required. Please sign out and sign in again.' 
      });
    }
    
    if (error.status === 401) {
      return res.status(401).json({ 
        error: 'GitHub token expired. Please sign out and sign in again.' 
      });
    }
    
    if (error.status === 404) {
      return res.status(404).json({ 
        error: 'Resource not found' 
      });
    }
    
    // Never expose internal errors to clients
    return res.status(500).json({ 
      error: 'An error occurred while processing your request' 
    });
  }
};