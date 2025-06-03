# Security Headers Documentation

## Content Security Policy (CSP)

The Content Security Policy has been configured in `vercel.json` to enhance security by controlling which resources can be loaded and executed.

### Current CSP Configuration

```
default-src 'self'; 
script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; 
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; 
font-src 'self' https://fonts.gstatic.com data:; 
img-src 'self' data: https: blob:; 
connect-src 'self' https://api.github.com https://*.supabase.co wss://*.supabase.co https://api.openai.com; 
frame-ancestors 'none'; 
base-uri 'self'; 
form-action 'self';
```

### Directive Explanations

- **default-src 'self'**: By default, only allow resources from the same origin
- **script-src**: 
  - `'self'`: Allow scripts from same origin
  - `'unsafe-inline'`: Required for React's inline scripts
  - `'unsafe-eval'`: Required for some build tools and libraries
  - `https://cdn.jsdelivr.net`: For any CDN-hosted libraries
- **style-src**:
  - `'self'`: Allow stylesheets from same origin
  - `'unsafe-inline'`: Required for styled-components and inline styles
  - `https://fonts.googleapis.com`: For Google Fonts
- **font-src**:
  - `'self'`: Local fonts
  - `https://fonts.gstatic.com`: Google Fonts files
  - `data:`: For inline font data
- **img-src**:
  - `'self'`: Local images
  - `data:`: For inline images (base64)
  - `https:`: Allow images from any HTTPS source
  - `blob:`: For blob URLs (file uploads)
- **connect-src**:
  - `'self'`: API calls to same origin
  - `https://api.github.com`: GitHub API (though we proxy it now)
  - `https://*.supabase.co`: Supabase APIs
  - `wss://*.supabase.co`: Supabase WebSocket connections
  - `https://api.openai.com`: OpenAI API (though we proxy it now)
- **frame-ancestors 'none'**: Prevent the site from being embedded in iframes
- **base-uri 'self'**: Restrict base tag to same origin
- **form-action 'self'**: Only allow form submissions to same origin

### Other Security Headers

The following security headers are also configured:

- **X-Frame-Options: DENY**: Prevents clickjacking attacks
- **X-Content-Type-Options: nosniff**: Prevents MIME type sniffing
- **Referrer-Policy: strict-origin-when-cross-origin**: Controls referrer information
- **X-XSS-Protection: 1; mode=block**: Legacy XSS protection (for older browsers)
- **Permissions-Policy**: Disables unnecessary browser features

### Testing the CSP

1. **Browser Developer Tools**:
   - Open Chrome DevTools
   - Go to the Console tab
   - Look for CSP violation messages
   - Check the Network tab for blocked resources

2. **CSP Evaluator**:
   - Use Google's CSP Evaluator: https://csp-evaluator.withgoogle.com/
   - Copy the CSP header value and paste it for analysis

3. **Manual Testing**:
   - Navigate through all app features
   - Ensure all functionality works:
     - GitHub OAuth login
     - Repository selection
     - Release notes generation
     - AI enhancement
     - File downloads

4. **Common Issues**:
   - If inline scripts are blocked, check for CSP violations in console
   - If external resources fail to load, add their domains to appropriate directives
   - For development, you may need to adjust the policy temporarily

### Monitoring CSP Violations

Consider implementing CSP reporting to monitor violations in production:

```json
"Content-Security-Policy": "... ; report-uri https://your-csp-reporter.com/endpoint"
```

This will send violation reports to your monitoring service.

### Future Improvements

1. Remove `'unsafe-inline'` and `'unsafe-eval'` by:
   - Using nonces or hashes for inline scripts
   - Refactoring code to avoid eval()
   - Moving inline styles to external stylesheets

2. Implement CSP reporting to monitor violations

3. Use stricter policies for production vs development