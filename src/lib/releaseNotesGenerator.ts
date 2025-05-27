
import { Commit, CategorizedCommits } from "@/types";
import { enhanceReleaseNotes } from "./openai";

export const categorizeCommits = (commits: Commit[]): CategorizedCommits => {
  const categorized: CategorizedCommits = {
    features: [],
    fixes: [],
    breakingChanges: [],
    others: [],
  };

  commits.forEach((commit) => {
    const message = commit.message.toLowerCase();
    if (message.startsWith("feat") || message.startsWith("feature")) {
      categorized.features.push(commit);
    } else if (message.startsWith("fix")) {
      categorized.fixes.push(commit);
    } else if (message.includes("breaking change")) {
      categorized.breakingChanges.push(commit);
    } else {
      categorized.others.push(commit);
    }
  });

  return categorized;
};

export const generateMarkdown = (
  categorizedCommits: CategorizedCommits,
  repoUrl: string,
  startRef: string,
  endRef: string
): string => {
  let markdown = `## Release Notes (${startRef}...${endRef})\n\n`;
  const repoPath = repoUrl.replace(/^(https:\/\/github\.com\/)/, '');


  const createSection = (title: string, commits: Commit[]): string => {
    if (commits.length === 0) return "";
    let section = `### ${title}\n\n`;
    commits.forEach((commit) => {
      const firstLine = commit.message.split('\n')[0];
      section += `- ${firstLine} ([${commit.sha.substring(0, 7)}](${commit.html_url}))\n`;
    });
    return section + "\n";
  };

  markdown += createSection("🚀 Features", categorizedCommits.features);
  markdown += createSection("🐛 Bug Fixes", categorizedCommits.fixes);
  markdown += createSection("⚠️ Breaking Changes", categorizedCommits.breakingChanges);
  
  if (categorizedCommits.others.length > 0) {
    markdown += createSection("📝 Other Commits", categorizedCommits.others);
  }
  
  markdown += `\n**Full Changelog**: ${repoUrl}/compare/${startRef}...${endRef}\n`;

  return markdown;
};

export const generateEnhancedMarkdown = async (
  categorizedCommits: CategorizedCommits,
  repoUrl: string,
  startRef: string,
  endRef: string
): Promise<string> => {
  // First generate the basic markdown
  const basicMarkdown = generateMarkdown(categorizedCommits, repoUrl, startRef, endRef);
  
  // Then enhance it with AI
  const enhancedMarkdown = await enhanceReleaseNotes(basicMarkdown);
  
  return enhancedMarkdown;
};
