import React, { useState, useEffect, useCallback } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Search, GitBranch, Lock, Globe, Star } from 'lucide-react';
import { fetchUserRepositories, Repository } from '@/lib/githubApi';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from "@/hooks/use-toast";

interface RepositoryPickerProps {
  onSelect: (repo: Repository) => void;
  selectedRepo?: Repository | null;
}

export const RepositoryPicker: React.FC<RepositoryPickerProps> = ({ onSelect, selectedRepo }) => {
  const [open, setOpen] = useState(false);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [filteredRepos, setFilteredRepos] = useState<Repository[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const { getGitHubToken } = useAuth();

  const loadRepositories = useCallback(async (pageNum: number) => {
    const token = getGitHubToken();
    if (!token) {
      toast({ title: "Authentication Required", description: "Please sign in to continue.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { repositories: newRepos, hasMore: more } = await fetchUserRepositories(token, pageNum);
      
      if (pageNum === 1) {
        setRepositories(newRepos);
        setFilteredRepos(newRepos);
      } else {
        setRepositories(prev => [...prev, ...newRepos]);
        setFilteredRepos(prev => [...prev, ...newRepos]);
      }
      
      setHasMore(more);
    } catch (error: any) {
      toast({ title: "Error loading repositories", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [getGitHubToken]);

  useEffect(() => {
    if (open && repositories.length === 0) {
      loadRepositories(1);
    }
  }, [open, repositories.length, loadRepositories]);

  useEffect(() => {
    const filtered = repositories.filter(repo => 
      repo.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (repo.description && repo.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    setFilteredRepos(filtered);
  }, [searchQuery, repositories]);

  const handleSelect = (repo: Repository) => {
    onSelect(repo);
    setOpen(false);
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadRepositories(nextPage);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start text-left font-normal">
          {selectedRepo ? (
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4" />
              <span className="truncate">{selectedRepo.full_name}</span>
              {selectedRepo.private && <Lock className="h-3 w-3 text-muted-foreground" />}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <GitBranch className="h-4 w-4" />
              <span>Select a repository</span>
            </div>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[600px]">
        <DialogHeader>
          <DialogTitle>Select Repository</DialogTitle>
          <DialogDescription>
            Choose a repository to generate release notes for
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search repositories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <ScrollArea className="h-[400px] pr-4">
            {loading && repositories.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredRepos.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                {searchQuery ? 'No repositories found matching your search' : 'No repositories found'}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredRepos.map((repo) => (
                  <button
                    key={repo.id}
                    onClick={() => handleSelect(repo)}
                    className="w-full p-3 rounded-lg border hover:bg-accent hover:border-accent-foreground/20 transition-colors text-left"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{repo.name}</span>
                          {repo.private ? (
                            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                          ) : (
                            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {repo.language && (
                            <Badge variant="secondary" className="text-xs">
                              {repo.language}
                            </Badge>
                          )}
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Star className="h-3 w-3" />
                            {repo.stargazers_count}
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{repo.owner.login}/{repo.name}</p>
                      {repo.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">{repo.description}</p>
                      )}
                    </div>
                  </button>
                ))}
                {hasMore && (
                  <Button
                    variant="ghost"
                    onClick={loadMore}
                    disabled={loading}
                    className="w-full"
                  >
                    {loading ? 'Loading...' : 'Load more repositories'}
                  </Button>
                )}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
};