import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export const useCurrentUserName = () => {
  const [name, setName] = useState<string | null>(null)

  useEffect(() => {
    const fetchProfileName = async () => {
      try {
        const { data, error } = await createClient().auth.getSession()
        if (error) {
          console.error(error)
          setName('?')
          return
        }

        const userName = data.session?.user.user_metadata.full_name as string | undefined
        setName(userName ?? '?')
      } catch (error) {
        console.error('Failed to fetch user name:', error)
        setName('?')
      }
    }

    void fetchProfileName()
  }, [])

  return name ?? '?'
}
