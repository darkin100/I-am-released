import OpenAI from 'openai';

const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

if (!apiKey) {
  console.warn('OpenAI API key not configured. AI enhancement will be disabled.');
}

export const openai = apiKey ? new OpenAI({
  apiKey,
  dangerouslyAllowBrowser: true // Note: In production, you should proxy API calls through your backend
}) : null;

export async function enhanceReleaseNotes(markdown: string): Promise<string> {
  if (!openai) {
    console.warn('OpenAI not configured, returning original content');
    return markdown;
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You are a technical writer specializing in creating engaging release notes. Your task is to rewrite the provided release notes to be more engaging, user-friendly, and exciting while maintaining technical accuracy. 

Guidelines:
- Keep the same structure and all technical details
- Make the language more engaging and enthusiastic
- Add emojis where appropriate (but don't overdo it)
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

    return response.choices[0]?.message?.content || markdown;
  } catch (error) {
    console.error('Error enhancing release notes:', error);
    return markdown; // Return original if enhancement fails
  }
}