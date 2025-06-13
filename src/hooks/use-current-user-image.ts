import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export const useCurrentUserImage = () => {
  const [image, setImage] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserImage = async () => {
      try {
        const { data, error } = await createClient().auth.getSession()
        if (error) {
          console.error(error)
          setImage(null)
          return
        }

        const userImage = data.session?.user.user_metadata.avatar_url as string | undefined
        setImage(userImage ?? null)
      } catch (error) {
        console.error('Failed to fetch user image:', error)
        setImage(null)
      }
    }

    void fetchUserImage()
  }, [])

  return image
}
