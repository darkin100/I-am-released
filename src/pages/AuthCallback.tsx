import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get error from URL first
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const urlError = hashParams.get('error')
        const errorDescription = hashParams.get('error_description')
        
        if (urlError) {
          console.error('OAuth error:', urlError, errorDescription)
          setError(errorDescription || urlError)
          return
        }

        // Supabase will handle the callback automatically with detectSessionInUrl: true
        // Just check if session exists
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Session error:', sessionError)
          setError(sessionError.message)
          return
        }

        if (!session) {
          // Wait a bit more for session to be established
          setTimeout(async () => {
            const { data: { session: retrySession } } = await supabase.auth.getSession()
            if (retrySession) {
              console.log('Session established after retry:', retrySession)
              navigate('/', { replace: true })
            } else {
              setError('Failed to establish session. Please check your GitHub email privacy settings.')
            }
          }, 2000)
        } else {
          console.log('Session established:', session)
          // Log user info for debugging
          console.log('User metadata:', session.user.user_metadata)
          console.log('Provider token available:', !!session.provider_token)
          navigate('/', { replace: true })
        }
      } catch (err) {
        console.error('Auth callback error:', err)
        setError(err instanceof Error ? err.message : 'Authentication failed')
      }
    }

    handleCallback()
  }, [navigate])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-4">
        <div className="max-w-md text-center">
          <h2 className="text-xl font-semibold mb-2">Authentication Error</h2>
          <div className="text-red-600 mb-4">{error}</div>
          
          <div className="text-sm text-muted-foreground mb-4">
            <p className="mb-2">Common issues:</p>
            <ul className="text-left list-disc list-inside space-y-1">
              <li>GitHub email privacy settings blocking access</li>
              <li>OAuth app configuration mismatch</li>
              <li>Browser blocking third-party cookies</li>
            </ul>
          </div>
          
          <button 
            onClick={() => navigate('/login', { replace: true })}
            className="text-primary hover:underline"
          >
            Return to login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-2">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      <p className="text-sm text-muted-foreground">Authenticating...</p>
    </div>
  )
}