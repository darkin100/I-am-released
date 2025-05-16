
import React from 'react';
import { GitBranch } from 'lucide-react';

const Header = () => {
  return (
    <header className="py-6 bg-background border-b">
      <div className="container mx-auto flex items-center justify-center sm:justify-start">
        <GitBranch className="h-8 w-8 text-primary mr-3" />
        <h1 className="text-3xl font-bold text-primary">Released</h1>
      </div>
      <div className="container mx-auto mt-2">
        <p className="text-sm text-muted-foreground text-center sm:text-left">
          Generate release notes from your Git commit history.
        </p>
      </div>
    </header>
  );
};

export default Header;
