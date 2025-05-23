import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { Github } from 'lucide-react'

export default function Login() {
  const { user, signInWithGitHub } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true })
    }
  }, [user, navigate])

  const handleLogin = async () => {
    try {
      await signInWithGitHub()
    } catch (error) {
      console.error('Login error:', error)
      // Show error to user
      alert(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome to I am Released</CardTitle>
          <CardDescription>
            Sign in with GitHub to generate release notes for your repositories
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handleLogin}
            className="w-full"
            size="lg"
          >
            <Github className="mr-2 h-5 w-5" />
            Sign in with GitHub
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            By signing in, you'll grant access to read your public and private repositories
          </p>
        </CardContent>
      </Card>
    </div>
  )
}