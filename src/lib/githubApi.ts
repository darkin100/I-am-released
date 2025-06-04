
import { Octokit } from "@octokit/rest";
import { Commit, Tag } from "@/types";

const GITHUB_API_URL = "https://api.github.com";

const getOctokit = (token?: string) => {
  if (token) {
    return new Octokit({ auth: token });
  }
  // This shouldn't happen in authenticated flow, but provide fallback
  return new Octokit();
};


export const parseRepoUrl = (url: string): { owner: string; repo: string } | null => {
  try {
    const parsedUrl = new URL(url);
    if (parsedUrl.hostname !== "github.com") {
      return null;
    }
    const pathParts = parsedUrl.pathname.split("/").filter(Boolean);
    if (pathParts.length >= 2) {
      return { owner: pathParts[0], repo: pathParts[1].replace(".git", "") };
    }
    return null;
  } catch (error) {
    console.error("Invalid URL:", error);
    return null;
  }
};

export const fetchTags = async (owner: string, repo: string, pat?: string): Promise<Tag[]> => {
  const octokit = getOctokit(pat);
  try {
    const response = await octokit.repos.listTags({ owner, repo, per_page: 100 });
    return response.data.map((tag) => ({
      name: tag.name,
      commit: { sha: tag.commit.sha, url: tag.commit.url },
    }));
  } catch (error) {
    console.error("Error fetching tags:", error);
    throw new Error("Failed to fetch tags. Ensure the repository is public or a valid PAT is provided for private repositories.");
  }
};

export const fetchCommitsBetweenRefs = async (
  owner: string,
  repo: string,
  base: string,
  head: string,
  pat?: string
): Promise<Commit[]> => {
  const octokit = getOctokit(pat);
  try {
    // The compareCommits endpoint is suitable for this
    const response = await octokit.repos.compareCommits({
      owner,
      repo,
      base,
      head,
      per_page: 100, // Max 250 commits are returned by this endpoint in total if > 1 page
    });

    if (response.data.commits) {
      return response.data.commits.map((commitData) => ({
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
    let errorMessage = "Failed to fetch commits.";
    if (error instanceof Error && 'status' in error && (error as Error & { status: number }).status === 404) {
      errorMessage = "Failed to fetch commits. One of the tags/commits might not exist or the repository is private and no PAT was provided.";
    } else if (error instanceof Error) {
      errorMessage = `Failed to fetch commits: ${error.message}`;
    }
    throw new Error(errorMessage);
  }
};

export interface Repository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description: string | null;
  owner: {
    login: string;
    avatar_url: string;
  };
  updated_at: string;
  language: string | null;
  stargazers_count: number;
}

export const fetchUserRepositories = async (token: string, page = 1, per_page = 30): Promise<{
  repositories: Repository[];
  hasMore: boolean;
}> => {
  const octokit = getOctokit(token);
  try {
    const response = await octokit.repos.listForAuthenticatedUser({
      sort: 'updated',
      direction: 'desc',
      per_page,
      page,
      type: 'all'
    });

    return {
      repositories: response.data,
      hasMore: response.data.length === per_page
    };
  } catch (error) {
    console.error("Error fetching repositories:", error);
    throw new Error("Failed to fetch repositories. Please try again.");
  }
};

export const githubAPI = {
  fetchCommitsBetweenRefs,
  fetchTags,
  fetchUserRepositories,
  parseRepoUrl
};
