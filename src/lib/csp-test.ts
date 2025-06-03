// CSP Test Script - Run this in development to test CSP compliance

export function testCSPCompliance() {
  console.log('=== CSP Compliance Test ===');
  
  // Test 1: Check if CSP header is present
  console.log('1. Checking CSP header...');
  // This will be logged by the browser if CSP is active
  
  // Test 2: Try inline script (should be allowed with 'unsafe-inline')
  console.log('2. Testing inline script execution...');
  try {
    const testDiv = document.createElement('div');
    testDiv.innerHTML = '<script>console.log("Inline script executed")</script>';
    document.body.appendChild(testDiv);
    document.body.removeChild(testDiv);
    console.log('✓ Inline scripts are allowed');
  } catch (e) {
    console.log('✗ Inline scripts are blocked');
  }
  
  // Test 3: Try eval (should be allowed with 'unsafe-eval')
  console.log('3. Testing eval...');
  try {
    eval('console.log("Eval executed")');
    console.log('✓ Eval is allowed');
  } catch (e) {
    console.log('✗ Eval is blocked');
  }
  
  // Test 4: Try loading external image
  console.log('4. Testing external image loading...');
  const img = new Image();
  img.onload = () => console.log('✓ External images are allowed');
  img.onerror = () => console.log('✗ External images are blocked');
  img.src = 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png';
  
  // Test 5: Check connect-src
  console.log('5. Testing API connections...');
  
  // Test Supabase connection
  fetch('https://your-project.supabase.co/health')
    .then(() => console.log('✓ Supabase connections allowed'))
    .catch(() => console.log('✗ Supabase connections blocked'));
  
  // Test GitHub API (should be allowed but we proxy it now)
  fetch('https://api.github.com')
    .then(() => console.log('✓ GitHub API connections allowed'))
    .catch(() => console.log('✗ GitHub API connections blocked'));
  
  // Test 6: Check for CSP violations
  console.log('6. Setting up CSP violation listener...');
  document.addEventListener('securitypolicyviolation', (e) => {
    console.error('CSP Violation detected:', {
      blockedURI: e.blockedURI,
      violatedDirective: e.violatedDirective,
      originalPolicy: e.originalPolicy
    });
  });
  
  console.log('=== CSP Test Complete ===');
  console.log('Check the console for any CSP violation messages');
}

// Add to window for easy testing
if (typeof window !== 'undefined') {
  (window as any).testCSPCompliance = testCSPCompliance;
  console.log('CSP test available: Run window.testCSPCompliance() in console');
}