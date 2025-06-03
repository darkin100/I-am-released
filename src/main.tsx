import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Import CSP and security tests in development
if (import.meta.env.DEV) {
  import('./lib/csp-test.ts');
  import('./lib/security-test.ts');
}

createRoot(document.getElementById("root")!).render(<App />);
