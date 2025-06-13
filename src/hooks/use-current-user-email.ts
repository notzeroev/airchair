import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export const useCurrentUserEmail = () => {
  const [email, setEmail] = useState<string | null>(null)

  useEffect(() => {
    const fetchProfileEmail = async () => {
      try {
        const { data, error } = await createClient().auth.getSession()
        if (error) {
          console.error(error)
          setEmail('?')
          return
        }

        const userEmail = data.session?.user.user_metadata.email as string | undefined
        setEmail(userEmail ?? '?')
      } catch (error) {
        console.error('Failed to fetch user email:', error)
        setEmail('?')
      }
    }

    void fetchProfileEmail()
  }, [])

  return email ?? '?'
}
