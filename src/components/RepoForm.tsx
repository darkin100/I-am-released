
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Repository } from "@/lib/githubApi";
import { secureGitHubAPI } from "@/lib/githubApiSecure";
import { Tag } from "@/types";
import { toast } from "@/hooks/use-toast";
import { Tags, Wand2 } from 'lucide-react';
import { RepositoryPicker } from './RepositoryPicker';
import { githubRepoUrlSchema } from '@/lib/validation';
import { z } from 'zod';

interface RepoFormProps {
  onSubmit: (repoUrl: string, startRef: string, endRef: string) => void;
  loading: boolean;
}

const RepoForm: React.FC<RepoFormProps> = ({ onSubmit, loading }) => {
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [tags, setTags] = useState<Tag[]>([]);
  const [startRef, setStartRef] = useState('');
  const [endRef, setEndRef] = useState('');
  const [fetchingTags, setFetchingTags] = useState(false);

  // Clear tags when repository changes
  useEffect(() => {
    if (selectedRepo) {
      setTags([]);
      setStartRef('');
      setEndRef('');
    }
  }, [selectedRepo]);

  const handleRepoSelect = (repo: Repository) => {
    setSelectedRepo(repo);
  };
  

  const loadTags = async () => {
    if (!selectedRepo) {
      toast({ title: "No Repository Selected", description: "Please select a repository first.", variant: "destructive" });
      return;
    }
    
    setFetchingTags(true);
    try {
      const fetchedTags = await secureGitHubAPI.fetchTags(selectedRepo.owner.login, selectedRepo.name);
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
    if (!selectedRepo || !startRef || !endRef) {
      toast({ title: "Missing Information", description: "Please select a repository and choose start/end references.", variant: "destructive" });
      return;
    }
    
    // Validate repository URL
    try {
      githubRepoUrlSchema.parse(selectedRepo.html_url);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ 
          title: "Invalid Repository", 
          description: error.errors[0].message, 
          variant: "destructive" 
        });
        return;
      }
    }
    
    onSubmit(selectedRepo.html_url, startRef, endRef);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 p-6 border rounded-lg shadow-sm bg-card">
      <div>
        <Label htmlFor="repository" className="mb-2">
          GitHub Repository
        </Label>
        <RepositoryPicker
          onSelect={handleRepoSelect}
          selectedRepo={selectedRepo}
        />
      </div>

      {selectedRepo && (
        <Button type="button" onClick={loadTags} disabled={fetchingTags || !selectedRepo} className="w-full">
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
      
      <Button type="submit" disabled={loading || !selectedRepo || !startRef || !endRef} className="w-full">
        <Wand2 className="h-4 w-4 mr-2" />
        {loading ? 'Generating...' : 'Generate Release Notes'}
      </Button>
    </form>
  );
};

export default RepoForm;
