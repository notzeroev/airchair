'use client'

import { useCurrentUserImage } from '@/hooks/use-current-user-image'
import { useCurrentUserName } from '@/hooks/use-current-user-name'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

export const CurrentUserAvatar = () => {
  const profileImage = useCurrentUserImage()
  const name = useCurrentUserName()
  const initials = name[0]?.toUpperCase() || '?'

  const getColorClass = (c: string) => {
    if ('ABCDEF'.includes(c)) return 'bg-red-500';
    if ('GHIJKL'.includes(c)) return 'bg-green-500';
    if ('MNOPQR'.includes(c)) return 'bg-blue-500';
    if ('STUVWX'.includes(c)) return 'bg-yellow-500';
    if ('YZ'.includes(c)) return 'bg-purple-500';
    return 'bg-gray-500';
  };

  return (
    <Avatar>
      {profileImage && <AvatarImage src={profileImage} alt={initials} />}
      <AvatarFallback className={getColorClass(initials)}>{initials}</AvatarFallback>
    </Avatar>
  )
}
