import { supabase } from './supabase';
import { Commit, Tag } from '@/types';
import { Repository } from './githubApi';

// Secure GitHub API wrapper that uses server-side proxy
class SecureGitHubAPI {
  private async callAPI(endpoint: string, params: Record<string, unknown>) {
    // Get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      throw new Error('You must be logged in to access GitHub');
    }

    // Call our secure API endpoint
    const response = await fetch('/api/github-proxy', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        endpoint,
        ...params
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch from GitHub');
    }

    return response.json();
  }

  async fetchTags(owner: string, repo: string): Promise<Tag[]> {
    try {
      const result = await this.callAPI('repos.listTags', {
        owner,
        repo,
        per_page: 100
      });

      return result.data.map((tag: { name: string; commit: { sha: string; url: string } }) => ({
        name: tag.name,
        commit: { sha: tag.commit.sha, url: tag.commit.url },
      }));
    } catch (error) {
      console.error("Error fetching tags:", error);
      if (error instanceof Error && error.message.includes('authentication required')) {
        throw error;
      }
      throw new Error("Failed to fetch tags. Please ensure you're signed in with GitHub.");
    }
  }

  async fetchCommitsBetweenRefs(
    owner: string,
    repo: string,
    base: string,
    head: string
  ): Promise<Commit[]> {
    try {
      const result = await this.callAPI('repos.compareCommits', {
        owner,
        repo,
        base,
        head,
        per_page: 100
      });

      if (result.data.commits) {
        return result.data.commits.map((commitData: { sha: string; commit: { message: string; author?: { name?: string; date?: string } }; html_url: string }) => ({
          sha: commitData.sha,
          message: commitData.commit.message,
          author: commitData.commit.author?.name || "Unknown author",
          date: commitData.commit.author?.date || new Date().toISOString(),
          html_url: commitData.html_url,
        }));
      }
      return [];
    } catch (error) {
      console.error("Error fetching commits:", error);
      if (error instanceof Error && error.message.includes('authentication required')) {
        throw error;
      }
      let errorMessage = "Failed to fetch commits.";
      if (error instanceof Error && error.message.includes('404')) {
        errorMessage = "Failed to fetch commits. One of the tags/commits might not exist.";
      }
      throw new Error(errorMessage);
    }
  }

  async fetchUserRepositories(page = 1, per_page = 30): Promise<{
    repositories: Repository[];
    hasMore: boolean;
  }> {
    try {
      const result = await this.callAPI('repos.listForAuthenticatedUser', {
        sort: 'updated',
        direction: 'desc',
        per_page,
        page,
        type: 'all'
      });

      return {
        repositories: result.data,
        hasMore: result.data.length === per_page
      };
    } catch (error) {
      console.error("Error fetching repositories:", error);
      if (error instanceof Error && error.message.includes('authentication required')) {
        throw error;
      }
      throw new Error("Failed to fetch repositories. Please try again.");
    }
  }

  async getRepository(owner: string, repo: string): Promise<Repository> {
    try {
      const result = await this.callAPI('repos.get', {
        owner,
        repo
      });

      return result.data;
    } catch (error) {
      console.error("Error fetching repository:", error);
      if (error instanceof Error && error.message.includes('404')) {
        throw new Error("Repository not found or you don't have access to it.");
      }
      throw error;
    }
  }
}

// Export a singleton instance
export const secureGitHubAPI = new SecureGitHubAPI();

// Re-export the utility function that doesn't need authentication
export { parseRepoUrl } from './githubApi';