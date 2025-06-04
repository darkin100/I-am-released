const { createClient } = require('@supabase/supabase-js');
const { sanitizeMarkdown } = require('./validation/schemas');
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

async function checkRateLimit(userId, logger = null) {
  const now = Date.now();
  const userLimit = rateLimitStore.get(userId);
  const limit = 10; // 10 requests per hour
  
  if (!userLimit || userLimit.resetAt < now) {
    rateLimitStore.set(userId, {
      count: 1,
      resetAt: now + 3600000 // 1 hour
    });
    if (logger) logger.logRateLimit(userId, true, limit, 1);
    return true;
  }
  
  if (userLimit.count >= limit) {
    if (logger) logger.logRateLimit(userId, false, limit, userLimit.count);
    return false;
  }
  
  userLimit.count++;
  if (logger) logger.logRateLimit(userId, true, limit, userLimit.count);
  return true;
}

async function enhanceReleaseNotesHandler(req, res) {
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
        error: 'Server configuration error',
        requestId: logger.requestId
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      logger.error('Missing OpenAI API key');
      return res.status(500).json({ 
        error: 'AI enhancement service not configured',
        requestId: logger.requestId
      });
    }

    // Verify authentication
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      logger.logAuth(false, null, new Error('Missing authorization header'));
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
    if (!await checkRateLimit(user.id, logger)) {
      return res.status(429).json({ 
        error: 'Rate limit exceeded. Try again later.',
        requestId: logger.requestId
      });
    }

    // Validate request body
    const { markdown } = req.body;
    if (!markdown || typeof markdown !== 'string') {
      logger.warn('Invalid request: missing markdown field');
      return res.status(400).json({ error: 'Invalid request: markdown field is required' });
    }
    
    if (markdown.length < 10) {
      logger.warn('Invalid request: markdown too short', { length: markdown.length });
      return res.status(400).json({ error: 'Invalid request: markdown content too short' });
    }
    
    if (markdown.length > 10000) {
      logger.warn('Invalid request: markdown too long', { length: markdown.length });
      return res.status(400).json({ error: 'Invalid request: markdown content too long (max 10000 characters)' });
    }
    
    // Sanitize the markdown input
    const sanitizedMarkdown = sanitizeMarkdown(markdown);
    logger.info('Processing enhancement request', { 
      userId: user.id,
      markdownLength: markdown.length,
      sanitizedLength: sanitizedMarkdown.length
    });

    // Dynamically import OpenAI (ESM module)
    const OpenAI = await import('openai');
    const openai = new OpenAI.default({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Generate enhanced release notes
    const openaiStartTime = Date.now();
    let response;
    try {
      response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a technical writer specializing in creating engaging release notes. Your task is to rewrite the provided release notes to be more engaging, user-friendly, and exciting while maintaining technical accuracy. 

Guidelines:
- Keep the same structure and all technical details
- Make the language more engaging and enthusiastic
- Highlight the benefits to users
- Keep commit links and technical references intact
- Maintain professionalism while being friendly
- If there are breaking changes, make them very clear
- Preserve all markdown formatting and links`
        },
        {
          role: 'user',
          content: sanitizedMarkdown
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });
      
      const openaiDuration = Date.now() - openaiStartTime;
      logger.logExternalAPI('openai', 'chat.completions.create', true, openaiDuration);
      logger.info('OpenAI response received', {
        model: 'gpt-4o-mini',
        promptTokens: response.usage?.prompt_tokens,
        completionTokens: response.usage?.completion_tokens,
        totalTokens: response.usage?.total_tokens,
        duration: openaiDuration
      });
      
    } catch (openaiError) {
      const openaiDuration = Date.now() - openaiStartTime;
      logger.logExternalAPI('openai', 'chat.completions.create', false, openaiDuration, openaiError);
      throw openaiError;
    }

    const enhancedContent = response.choices[0]?.message?.content;
    
    if (!enhancedContent) {
      logger.error('OpenAI returned empty content', null, { 
        choices: response.choices?.length,
        finishReason: response.choices[0]?.finish_reason
      });
      return res.status(500).json({ 
        error: 'Failed to generate content',
        requestId: logger.requestId
      });
    }

    // Log successful enhancement
    logger.info('Enhancement completed successfully', {
      userId: user.id,
      enhancedLength: enhancedContent.length,
      remainingRequests: 10 - (rateLimitStore.get(user.id)?.count || 1)
    });

    return res.status(200).json({ 
      enhanced: enhancedContent,
      usage: {
        requestsRemaining: 10 - (rateLimitStore.get(user.id)?.count || 1)
      }
    });

  } catch (error) {
    logger.error('Enhancement error', error, {
      userId: req.body?.userId,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
      errorType: error.constructor.name
    });
    
    // Handle specific OpenAI errors
    if (error.response?.status === 429) {
      return res.status(429).json({ 
        error: 'AI service rate limit exceeded. Please try again later.',
        requestId: logger.requestId
      });
    }
    
    if (error.response?.status === 401) {
      logger.error('OpenAI authentication failed - invalid API key');
      return res.status(500).json({ 
        error: 'AI service configuration error',
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
module.exports = withLogging('enhance-release-notes', enhanceReleaseNotesHandler);