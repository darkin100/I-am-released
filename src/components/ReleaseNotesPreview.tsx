import React from 'react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { ClipboardCopy, Download, Sparkles, Eye, Code } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ReleaseNotesPreviewProps {
  markdown: string;
  fileName?: string;
  loading?: boolean;
}

const ReleaseNotesPreview: React.FC<ReleaseNotesPreviewProps> = ({ markdown, fileName = "release-notes.md", loading = false }) => {
  if (!markdown) return null;

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(markdown)
      .then(() => toast({ title: "Copied to clipboard!" }))
      .catch(err => toast({ title: "Failed to copy", description: err.message, variant: "destructive" }));
  };

  const handleDownload = () => {
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) { // feature detection
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({ title: "Download started!"});
    } else {
       toast({ title: "Download not supported", description: "Your browser does not support direct file downloads.", variant: "destructive" });
    }
  };

  return (
    <div className="mt-8 p-6 border rounded-lg shadow-sm bg-card relative">
      {loading && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm rounded-lg flex items-center justify-center z-10">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-5 w-5 animate-pulse" />
            <span className="text-sm font-medium">Enhancing with AI...</span>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold">Generated Release Notes</h2>
        <div className="flex space-x-2">
          <Button onClick={handleCopyToClipboard} variant="outline" size="sm" disabled={loading}>
            <ClipboardCopy className="h-4 w-4 mr-2" />
            Copy
          </Button>
          <Button onClick={handleDownload} variant="outline" size="sm" disabled={loading}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </div>
      
      <Tabs defaultValue="preview" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Preview
          </TabsTrigger>
          <TabsTrigger value="raw" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            Raw Markdown
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="preview" className="mt-4">
          <ScrollArea className="h-[500px] w-full p-6 border rounded-md bg-background">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  // Style the headings
                  h2: ({children}) => <h2 className="text-xl font-bold mt-6 mb-4">{children}</h2>,
                  h3: ({children}) => <h3 className="text-lg font-semibold mt-4 mb-2">{children}</h3>,
                  // Style links
                  a: ({href, children}) => (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {children}
                    </a>
                  ),
                  // Style lists
                  ul: ({children}) => <ul className="list-disc pl-6 space-y-1">{children}</ul>,
                  li: ({children}) => <li className="text-sm">{children}</li>,
                  // Style paragraphs
                  p: ({children}) => <p className="mb-4">{children}</p>,
                  // Style strong text
                  strong: ({children}) => <strong className="font-semibold">{children}</strong>,
                  // Style code
                  code: ({children}) => <code className="px-1 py-0.5 bg-muted rounded text-xs">{children}</code>,
                }}
              >
                {markdown}
              </ReactMarkdown>
            </div>
          </ScrollArea>
        </TabsContent>
        
        <TabsContent value="raw" className="mt-4">
          <ScrollArea className="h-[500px] w-full p-4 border rounded-md bg-muted/30">
            <pre className="text-sm whitespace-pre-wrap break-words font-mono">{markdown}</pre>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReleaseNotesPreview;