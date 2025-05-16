
import React from 'react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { ClipboardCopy, Download } from 'lucide-react';

interface ReleaseNotesPreviewProps {
  markdown: string;
  fileName?: string;
}

const ReleaseNotesPreview: React.FC<ReleaseNotesPreviewProps> = ({ markdown, fileName = "release-notes.md" }) => {
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
      URL.revokeObjectURL(url);
      toast({ title: "Download started!"});
    } else {
       toast({ title: "Download not supported", description: "Your browser does not support direct file downloads.", variant: "destructive" });
    }
  };

  return (
    <div className="mt-8 p-6 border rounded-lg shadow-sm bg-card">
      <h2 className="text-2xl font-semibold mb-4">Generated Release Notes</h2>
      <div className="flex space-x-2 mb-4">
        <Button onClick={handleCopyToClipboard} variant="outline">
          <ClipboardCopy className="h-4 w-4 mr-2" />
          Copy to Clipboard
        </Button>
        <Button onClick={handleDownload} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Download .md
        </Button>
      </div>
      <ScrollArea className="h-[400px] w-full p-4 border rounded-md bg-muted/30">
        <pre className="text-sm whitespace-pre-wrap break-words">{markdown}</pre>
      </ScrollArea>
    </div>
  );
};

export default ReleaseNotesPreview;
