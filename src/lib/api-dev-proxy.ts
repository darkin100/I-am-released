// Development proxy for API routes when using Vite dev server
// This file provides mock responses for API endpoints during local development

export const isDevelopment = import.meta.env.DEV;

export async function devApiProxy(endpoint: string, options: RequestInit): Promise<Response> {
  if (!isDevelopment) {
    // In production, use the real API
    return fetch(endpoint, options);
  }

  // In development, provide helpful error messages
  console.warn(`API call to ${endpoint} failed - API routes are not available in Vite dev mode.`);
  console.warn('To use API features, run: npm run dev:vercel');
  
  // Return a mock error response
  return new Response(
    JSON.stringify({ 
      error: 'API routes not available in development mode. Please run: npm run dev:vercel',
      devMode: true 
    }), 
    {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}