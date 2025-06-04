
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { githubAPI } from "@/lib/githubApi";
import { Tag } from "@/types";
import { toast } from "@/hooks/use-toast";
import { Tags, Wand2 } from 'lucide-react';

interface RepoFormProps {
  onSubmit: (repoUrl: string, startRef: string, endRef: string, token: string) => void;
  loading: boolean;
}

const RepoForm: React.FC<RepoFormProps> = ({ onSubmit, loading }) => {
  const [repoUrl, setRepoUrl] = useState('');
  const [token, setToken] = useState('');
  const [tags, setTags] = useState<Tag[]>([]);
  const [startRef, setStartRef] = useState('');
  const [endRef, setEndRef] = useState('');
  const [fetchingTags, setFetchingTags] = useState(false);

  // Clear tags when repository URL changes
  useEffect(() => {
    if (repoUrl) {
      setTags([]);
      setStartRef('');
      setEndRef('');
    }
  }, [repoUrl]);
  

  const loadTags = async () => {
    if (!repoUrl || !token) {
      toast({ title: "Missing Information", description: "Please provide a repository URL and GitHub token first.", variant: "destructive" });
      return;
    }

    const repoInfo = githubAPI.parseRepoUrl(repoUrl);
    if (!repoInfo) {
      toast({ title: "Invalid Repository URL", description: "Please provide a valid GitHub repository URL.", variant: "destructive" });
      return;
    }
    
    setFetchingTags(true);
    try {
      const fetchedTags = await githubAPI.fetchTags(repoInfo.owner, repoInfo.repo, token);
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
    } catch (error) {
      toast({ title: "Error fetching tags", description: error instanceof Error ? error.message : 'An error occurred', variant: "destructive" });
      setTags([]);
    } finally {
      setFetchingTags(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl || !token || !startRef || !endRef) {
      toast({ title: "Missing Information", description: "Please provide all required fields.", variant: "destructive" });
      return;
    }
    
    onSubmit(repoUrl, startRef, endRef, token);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6 border rounded-lg shadow-sm bg-card">
      <div>
        <Label htmlFor="repoUrl" className="mb-2">
          GitHub Repository URL
        </Label>
        <Input
          id="repoUrl"
          type="url"
          placeholder="https://github.com/owner/repo"
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          required
        />
      </div>

      <div>
        <Label htmlFor="token" className="mb-2">
          GitHub Personal Access Token
        </Label>
        <Input
          id="token"
          type="password"
          placeholder="ghp_..."
          value={token}
          onChange={(e) => setToken(e.target.value)}
          required
        />
      </div>

      {repoUrl && token && (
        <Button type="button" onClick={loadTags} disabled={fetchingTags} className="w-full">
          <Tags className="h-4 w-4 mr-2" />
          {fetchingTags ? 'Fetching Tags...' : 'Load Tags'}
        </Button>
      )}

      {tags.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="startRef">Start Ref (previous tag/commit)</Label>
            <Select onValueChange={setStartRef} value={startRef}>
              <SelectTrigger id="startRef">
                <SelectValue placeholder="Select start tag/commit" />
              </SelectTrigger>
              <SelectContent>
                {tags.map(tag => <SelectItem key={tag.name} value={tag.name}>{tag.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="endRef">End Ref (current tag/commit)</Label>
            <Select onValueChange={setEndRef} value={endRef}>
              <SelectTrigger id="endRef">
                <SelectValue placeholder="Select end tag/commit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="HEAD">HEAD</SelectItem>
                {tags.map(tag => <SelectItem key={tag.name} value={tag.name}>{tag.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
      
      <Button type="submit" disabled={loading || !repoUrl || !token || !startRef || !endRef} className="w-full">
        <Wand2 className="h-4 w-4 mr-2" />
        {loading ? 'Generating...' : 'Generate Release Notes'}
      </Button>
    </form>
  );
};

export default RepoForm;
