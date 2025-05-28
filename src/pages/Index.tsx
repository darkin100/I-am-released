
import React, { useState } from 'react';
import Header from '@/components/Header';
import RepoForm from '@/components/RepoForm';
import ReleaseNotesPreview from '@/components/ReleaseNotesPreview';
import { parseRepoUrl } from '@/lib/githubApiSecure';
import { secureGitHubAPI } from '@/lib/githubApiSecure';
import { categorizeCommits, generateMarkdown, generateEnhancedMarkdown } from '@/lib/releaseNotesGenerator';
import { Commit } from '@/types';
import { toast } from "@/hooks/use-toast";
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Sparkles } from 'lucide-react';

const Index = () => {
  const [releaseNotes, setReleaseNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('release-notes.md');
  const [useAI, setUseAI] = useState(false);
  const [enhancing, setEnhancing] = useState(false);

  const handleGenerateNotes = async (repoUrl: string, startRef: string, endRef: string) => {
    setLoading(true);
    setReleaseNotes('');

    const repoInfo = parseRepoUrl(repoUrl);
    if (!repoInfo) {
      toast({ title: "Invalid Repository URL", description: "Please provide a valid GitHub repository URL.", variant: "destructive" });
      setLoading(false);
      return;
    }

    try {
      const commits: Commit[] = await secureGitHubAPI.fetchCommitsBetweenRefs(repoInfo.owner, repoInfo.repo, startRef, endRef);
      
      if (commits.length === 0) {
        toast({ title: "No commits found", description: `No new commits found between ${startRef} and ${endRef}.`, variant: "default" });
        setReleaseNotes(`## Release Notes (${startRef}...${endRef})\n\nNo new commits found in this range.\n\n**Full Changelog**: ${repoUrl}/compare/${startRef}...${endRef}`);
        setFileName(`${repoInfo.repo}-${startRef}_${endRef}-release-notes.md`);
        setLoading(false);
        return;
      }
      
      const categorized = categorizeCommits(commits);
      const markdown = generateMarkdown(categorized, repoUrl, startRef, endRef);
      
      // Show basic notes immediately
      setReleaseNotes(markdown);
      
      // Enhance with AI if enabled
      if (useAI) {
        setEnhancing(true);
        try {
          const enhanced = await generateEnhancedMarkdown(categorized, repoUrl, startRef, endRef);
          setReleaseNotes(enhanced);
          toast({ title: "AI Enhancement Complete!", description: "Your release notes have been enhanced with AI." });
        } catch (error) {
          console.error('AI enhancement failed:', error);
          toast({ title: "AI Enhancement Failed", description: "Using standard release notes.", variant: "default" });
        } finally {
          setEnhancing(false);
        }
      }
      
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
          
          {/* AI Enhancement Toggle */}
          <div className="flex items-center space-x-2 mt-4 p-4 border rounded-lg bg-card">
            <Switch
              id="ai-mode"
              checked={useAI}
              onCheckedChange={setUseAI}
              disabled={loading || enhancing}
            />
            <Label htmlFor="ai-mode" className="flex items-center gap-2 cursor-pointer">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>Enhance with AI</span>
              <span className="text-sm text-muted-foreground">(Make release notes more engaging)</span>
            </Label>
          </div>
          
          {releaseNotes && (
            <ReleaseNotesPreview 
              markdown={releaseNotes} 
              fileName={fileName} 
              loading={enhancing}
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
