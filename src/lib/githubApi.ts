
import { Octokit } from "@octokit/rest";
import { Commit, Tag } from "@/types";

const GITHUB_API_URL = "https://api.github.com";

// Initialize Octokit. A PAT can be provided by the user for higher rate limits / private repos.
// For now, it will make unauthenticated requests or use a PAT if provided.
let octokitInstance: Octokit | null = null;

const getOctokit = (pat?: string) => {
  if (pat) {
    return new Octokit({ auth: pat });
  }
  // Return a new instance for unauthenticated requests if no PAT is provided
  // This helps avoid issues if a PAT was previously set and then removed.
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
    if (error instanceof Error && 'status' in error && (error as any).status === 404) {
      errorMessage = "Failed to fetch commits. One of the tags/commits might not exist or the repository is private and no PAT was provided.";
    } else if (error instanceof Error) {
      errorMessage = `Failed to fetch commits: ${error.message}`;
    }
    throw new Error(errorMessage);
  }
};
