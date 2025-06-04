import React, { useState } from 'react';
import Header from '@/components/Header';
import RepoForm from '@/components/RepoForm';
import ReleaseNotesPreview from '@/components/ReleaseNotesPreview';
import { parseRepoUrl } from '@/lib/githubApi';
import { githubAPI } from '@/lib/githubApi';
import { categorizeCommits, generateMarkdown } from '@/lib/releaseNotesGenerator';
import { Commit } from '@/types';
import { toast } from "@/hooks/use-toast";

const Index = () => {
  const [releaseNotes, setReleaseNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('release-notes.md');

  const handleGenerateNotes = async (repoUrl: string, startRef: string, endRef: string, token: string) => {
    setLoading(true);
    setReleaseNotes('');

    const repoInfo = parseRepoUrl(repoUrl);
    if (!repoInfo) {
      toast({ title: "Invalid Repository URL", description: "Please provide a valid GitHub repository URL.", variant: "destructive" });
      setLoading(false);
      return;
    }

    try {
      const commits: Commit[] = await githubAPI.fetchCommitsBetweenRefs(repoInfo.owner, repoInfo.repo, startRef, endRef, token);
      
      if (commits.length === 0) {
        toast({ title: "No commits found", description: `No new commits found between ${startRef} and ${endRef}.`, variant: "default" });
        setReleaseNotes(`## Release Notes (${startRef}...${endRef})\n\nNo new commits found in this range.\n\n**Full Changelog**: ${repoUrl}/compare/${startRef}...${endRef}`);
        setFileName(`${repoInfo.repo}-${startRef}_${endRef}-release-notes.md`);
        setLoading(false);
        return;
      }
      
      const categorized = categorizeCommits(commits);
      const markdown = generateMarkdown(categorized, repoUrl, startRef, endRef);
      
      setReleaseNotes(markdown);
      setFileName(`${repoInfo.repo}-${startRef}_${endRef}-release-notes.md`);
      toast({ title: "Release notes generated!", description: `Found ${commits.length} commits.` });
    } catch (error) {
      toast({ title: "Error Generating Notes", description: error instanceof Error ? error.message : 'An error occurred', variant: "destructive" });
      setReleaseNotes('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header />
      <main className="container mx-auto py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <RepoForm onSubmit={handleGenerateNotes} loading={loading} />
          
          {releaseNotes && (
            <ReleaseNotesPreview 
              markdown={releaseNotes} 
              fileName={fileName}
            />
          )}
        </div>
      </main>
      <footer className="py-6 border-t mt-12">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} I am Released</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;