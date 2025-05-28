// DEPRECATED: This component is no longer used for security reasons
// GitHub authentication is now handled through Supabase OAuth
// Direct PAT usage has been removed to prevent token exposure

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface GitHubTokenFormProps {
  onTokenSubmit: (token: string) => void
}

export function GitHubTokenForm({ onTokenSubmit }: GitHubTokenFormProps) {
  const [token, setToken] = useState('')
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validateToken = async () => {
    setIsValidating(true)
    setError(null)

    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json'
        }
      })

      if (!response.ok) {
        throw new Error('Invalid token')
      }

      const userData = await response.json()
      console.log('GitHub user:', userData)
      
      // Store token securely
      localStorage.setItem('github_pat', token)
      onTokenSubmit(token)
    } catch (err) {
      setError('Invalid GitHub Personal Access Token')
    } finally {
      setIsValidating(false)
    }
  }

  return (
    <div className="space-y-4 max-w-md mx-auto">
      <div>
        <Label htmlFor="github-token">GitHub Personal Access Token</Label>
        <Input
          id="github-token"
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
          className="mt-1"
        />
        <p className="text-sm text-muted-foreground mt-1">
          Create a token at{' '}
          <a
            href="https://github.com/settings/tokens/new"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            GitHub Settings
          </a>{' '}
          with 'repo' and 'user:email' scopes
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button
        onClick={validateToken}
        disabled={!token || isValidating}
        className="w-full"
      >
        {isValidating ? 'Validating...' : 'Use Personal Access Token'}
      </Button>
    </div>
  )
}