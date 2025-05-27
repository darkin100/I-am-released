import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY! // Service key for server-side validation
);

// Rate limiting store (in production, use Vercel KV or Redis)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

async function checkRateLimit(userId: string): Promise<boolean> {
  const now = Date.now();
  const userLimit = rateLimitStore.get(userId);
  
  if (!userLimit || userLimit.resetAt < now) {
    rateLimitStore.set(userId, {
      count: 1,
      resetAt: now + 3600000 // 1 hour
    });
    return true;
  }
  
  if (userLimit.count >= 10) { // 10 requests per hour
    return false;
  }
  
  userLimit.count++;
  return true;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
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

    // Validate request body
    const { markdown } = req.body;
    if (!markdown || typeof markdown !== 'string' || markdown.length > 10000) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    // Initialize OpenAI with server-side key
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Generate enhanced release notes
    const response = await openai.chat.completions.create({
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
          content: markdown
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    const enhancedContent = response.choices[0]?.message?.content;
    
    if (!enhancedContent) {
      return res.status(500).json({ error: 'Failed to generate content' });
    }

    // Log usage for monitoring (never log the content)
    console.log(`AI enhancement used by user ${user.id}`);

    return res.status(200).json({ 
      enhanced: enhancedContent,
      usage: {
        requestsRemaining: 10 - (rateLimitStore.get(user.id)?.count || 1)
      }
    });

  } catch (error) {
    console.error('Enhancement error:', error);
    
    // Never expose internal errors to clients
    return res.status(500).json({ 
      error: 'An error occurred while processing your request' 
    });
  }
}