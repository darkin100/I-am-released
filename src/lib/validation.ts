import { z } from 'zod';

const GITHUB_REPO_URL_REGEX = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/;
const GITHUB_USERNAME_REGEX = /^[\w.-]+$/;
const GITHUB_REPO_NAME_REGEX = /^[\w.-]+$/;

export const githubRepoUrlSchema = z.string()
  .min(1, "Repository URL is required")
  .regex(GITHUB_REPO_URL_REGEX, "Invalid GitHub repository URL format. Example: https://github.com/owner/repo")
  .transform((url) => url.trim().replace(/\/$/, ''));

export const githubPatSchema = z.string()
  .optional()
  .refine((pat) => !pat || pat.match(/^(ghp_|github_pat_)/), {
    message: "Invalid GitHub Personal Access Token format"
  });

export const githubOwnerSchema = z.string()
  .min(1, "Owner is required")
  .regex(GITHUB_USERNAME_REGEX, "Invalid GitHub username format");

export const githubRepoSchema = z.string()
  .min(1, "Repository name is required")
  .regex(GITHUB_REPO_NAME_REGEX, "Invalid repository name format");

export const releaseNotesFormSchema = z.object({
  repoUrl: githubRepoUrlSchema,
  pat: githubPatSchema,
  fromRef: z.string().min(1, "From reference is required"),
  toRef: z.string().min(1, "To reference is required"),
});

export const repoFormSchema = z.object({
  repoUrl: githubRepoUrlSchema,
  pat: githubPatSchema,
});

export const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '')
    .slice(0, 1000);
};

export const sanitizeRepoUrl = (url: string): string => {
  const sanitized = sanitizeInput(url);
  try {
    const parsed = new URL(sanitized);
    if (parsed.hostname !== 'github.com') {
      throw new Error('Not a GitHub URL');
    }
    return parsed.href.replace(/\/$/, '');
  } catch {
    return sanitized;
  }
};

export const parseGitHubUrl = (url: string): { owner: string; repo: string } | null => {
  try {
    const validated = githubRepoUrlSchema.parse(url);
    const match = validated.match(/github\.com\/([^/]+)\/([^/]+)$/);
    if (match) {
      return {
        owner: githubOwnerSchema.parse(match[1]),
        repo: githubRepoSchema.parse(match[2]),
      };
    }
  } catch {
    return null;
  }
  return null;
};

export type ReleaseNotesFormData = z.infer<typeof releaseNotesFormSchema>;
export type RepoFormData = z.infer<typeof repoFormSchema>;