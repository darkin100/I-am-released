// Security test file to verify no tokens are exposed

export function runSecurityChecks() {
  console.log('=== Security Check Results ===');
  
  // Check localStorage
  console.log('localStorage items:', Object.keys(localStorage));
  const hasGitHubPat = localStorage.getItem('github_pat');
  console.log('GitHub PAT in localStorage:', hasGitHubPat ? 'FOUND (SECURITY RISK!)' : 'Not found ✓');
  
  // Check sessionStorage
  console.log('sessionStorage items:', Object.keys(sessionStorage));
  
  // Check window object for exposed tokens
  const windowKeys = Object.keys(window).filter(key => 
    key.toLowerCase().includes('token') || 
    key.toLowerCase().includes('auth') ||
    key.toLowerCase().includes('github')
  );
  console.log('Window object auth-related keys:', windowKeys);
  
  // Check for Supabase session
  const supabaseKey = localStorage.getItem('supabase.auth.token');
  console.log('Supabase auth token:', supabaseKey ? 'Present (expected)' : 'Not found');
  
  // Look for provider tokens
  const allLocalStorageKeys = Object.keys(localStorage);
  const providerTokenKeys = allLocalStorageKeys.filter(key => 
    key.includes('provider_token') || 
    key.includes('github') && key.includes('token')
  );
  console.log('Provider token keys found:', providerTokenKeys.length > 0 ? providerTokenKeys : 'None ✓');
  
  console.log('=== End Security Check ===');
}

// Run checks on page load
if (typeof window !== 'undefined') {
  window.addEventListener('load', () => {
    setTimeout(runSecurityChecks, 1000);
  });
}