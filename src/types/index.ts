
export interface Commit {
  sha: string;
  message: string;
  author: string;
  date: string;
  html_url: string;
}

export interface Tag {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
}

export interface CategorizedCommits {
  features: Commit[];
  fixes: Commit[];
  breakingChanges: Commit[];
  others: Commit[];
  [key: string]: Commit[];
}
