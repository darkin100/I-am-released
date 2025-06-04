import React from 'react';
import { GitBranch } from 'lucide-react';

const Header = () => {
  return (
    <header className="py-6 bg-background border-b">
      <div className="container mx-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <GitBranch className="h-8 w-8 text-primary mr-3" />
            <h1 className="text-3xl font-bold text-primary">Released</h1>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Generate release notes from your Git commit history.
        </p>
      </div>
    </header>
  );
};

export default Header;