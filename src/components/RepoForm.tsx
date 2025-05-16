
import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fetchTags, parseRepoUrl } from "@/lib/githubApi";
import { Tag } from "@/types";
import { toast } from "@/hooks/use-toast";
import { Github, Tags, Wand2 } from 'lucide-react';

interface RepoFormProps {
  onSubmit: (repoUrl: string, startRef: string, endRef: string, pat: string) => void;
  loading: boolean;
}

const RepoForm: React.FC<RepoFormProps> = ({ onSubmit, loading }) => {
  const [repoUrl, setRepoUrl] = useState('');
  const [pat, setPat] = useState('');
  const [tags, setTags] = useState<Tag[]>([]);
  const [startRef, setStartRef] = useState('');
  const [endRef, setEndRef] = useState('');
  const [repoInfo, setRepoInfo] = useState<{owner: string, repo: string} | null>(null);
  const [fetchingTags, setFetchingTags] = useState(false);

  useEffect(() => {
    const GITHUB_PAT_KEY = 'github_pat_released_app';
    const storedPat = localStorage.getItem(GITHUB_PAT_KEY);
    if (storedPat) {
      setPat(storedPat);
    }
  }, []);

  const handleRepoUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setRepoUrl(url);
    const parsed = parseRepoUrl(url);
    setRepoInfo(parsed);
    if (!parsed) {
      setTags([]); // Clear tags if URL is invalid or not GitHub
      setStartRef('');
      setEndRef('');
    }
  };
  
  const handlePatChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newPat = e.target.value;
    setPat(newPat);
    const GITHUB_PAT_KEY = 'github_pat_released_app';
    if (newPat) {
      localStorage.setItem(GITHUB_PAT_KEY, newPat);
    } else {
      localStorage.removeItem(GITHUB_PAT_KEY);
    }
  };

  const loadTags = async () => {
    if (!repoInfo) {
      toast({ title: "Invalid Repository URL", description: "Please enter a valid GitHub repository URL.", variant: "destructive" });
      return;
    }
    setFetchingTags(true);
    try {
      const fetchedTags = await fetchTags(repoInfo.owner, repoInfo.repo, pat);
      setTags(fetchedTags);
      if (fetchedTags.length >= 2) {
        setStartRef(fetchedTags[1].name); // Default to second latest tag
        setEndRef(fetchedTags[0].name);   // Default to latest tag
      } else if (fetchedTags.length === 1) {
        setStartRef(fetchedTags[0].name); // If only one tag, use it as start
        setEndRef('HEAD');                // And HEAD as end
      } else {
        setStartRef('');
        setEndRef('HEAD'); // Default to HEAD if no tags
      }
      toast({ title: "Tags loaded successfully!", description: `Found ${fetchedTags.length} tags.` });
    } catch (error: any) {
      toast({ title: "Error fetching tags", description: error.message, variant: "destructive" });
      setTags([]);
    } finally {
      setFetchingTags(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl || !startRef || !endRef) {
      toast({ title: "Missing Information", description: "Please fill in all fields.", variant: "destructive" });
      return;
    }
    onSubmit(repoUrl, startRef, endRef, pat);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6 border rounded-lg shadow-sm bg-card">
      <div>
        <Label htmlFor="repoUrl" className="flex items-center mb-2">
          <Github className="h-4 w-4 mr-2" />
          GitHub Repository URL
        </Label>
        <Input
          id="repoUrl"
          type="url"
          placeholder="https://github.com/owner/repo"
          value={repoUrl}
          onChange={handleRepoUrlChange}
          required
        />
      </div>
      
      <div>
        <Label htmlFor="pat" className="flex items-center mb-2">
          GitHub Personal Access Token (Optional)
        </Label>
        <Input
          id="pat"
          type="password"
          placeholder="Enter your PAT for private repos or higher rate limits"
          value={pat}
          onChange={handlePatChange}
        />
        <p className="text-xs text-muted-foreground mt-1">Stored in browser's localStorage. Required for private repositories or to avoid rate limits.</p>
      </div>

      {repoInfo && (
        <Button type="button" onClick={loadTags} disabled={fetchingTags || !repoInfo} className="w-full">
          <Tags className="h-4 w-4 mr-2" />
          {fetchingTags ? 'Fetching Tags...' : 'Load Tags'}
        </Button>
      )}

      {tags.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="startRef">Start Ref (e.g., previous tag/commit)</Label>
            <Select onValueChange={setStartRef} value={startRef}>
              <SelectTrigger id="startRef">
                <SelectValue placeholder="Select start tag/commit" />
              </SelectTrigger>
              <SelectContent>
                {tags.map(tag => <SelectItem key={tag.name} value={tag.name}>{tag.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input
              type="text"
              placeholder="Or enter commit SHA / branch"
              value={startRef}
              onChange={(e) => setStartRef(e.target.value)}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="endRef">End Ref (e.g., current tag/commit)</Label>
            <Select onValueChange={setEndRef} value={endRef}>
              <SelectTrigger id="endRef">
                <SelectValue placeholder="Select end tag/commit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HEAD">HEAD</SelectItem>
                {tags.map(tag => <SelectItem key={tag.name} value={tag.name}>{tag.name}</SelectItem>)}
              </SelectContent>
            </Select>
             <Input
              type="text"
              placeholder="Or enter commit SHA / branch"
              value={endRef}
              onChange={(e) => setEndRef(e.target.value)}
              className="mt-2"
            />
          </div>
        </div>
      )}
      
      <Button type="submit" disabled={loading || !repoUrl || !startRef || !endRef} className="w-full">
        <Wand2 className="h-4 w-4 mr-2" />
        {loading ? 'Generating...' : 'Generate Release Notes'}
      </Button>
    </form>
  );
};

export default RepoForm;
