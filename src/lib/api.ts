import { supabase } from './supabase';

export async function enhanceReleaseNotes(markdown: string): Promise<string> {
  try {
    // Get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      throw new Error('You must be logged in to use AI enhancement');
    }

    // Call our secure API endpoint
    const response = await fetch('/api/enhance-release-notes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ markdown })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to enhance release notes');
    }

    const { enhanced, usage } = await response.json();
    
    // Optionally show remaining requests to user
    if (usage?.requestsRemaining !== undefined) {
      console.log(`AI enhancements remaining this hour: ${usage.requestsRemaining}`);
    }

    return enhanced;
  } catch (error) {
    console.error('Error enhancing release notes:', error);
    throw error;
  }
}