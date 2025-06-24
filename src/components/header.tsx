'use client'

import Link from 'next/link';
import { CurrentUserAvatar } from '@/components/current-user-avatar';
import { DropdownLogoutButton } from '@/components/logout-button';
import { useCurrentUserName } from '@/hooks/use-current-user-name';
import { useCurrentUserEmail } from '@/hooks/use-current-user-email';
import { DropdownModeToggle } from "@/components/mode-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useLayoutContext } from "@/context/LayoutProvider";
import { ChevronDown, Download } from 'lucide-react';
import { Button } from './ui/button';

export const Header = () => {
  const { colorClass: contextColorClass } = useLayoutContext();
  const { baseName: contextBaseName } = useLayoutContext();
  const colorClass = contextColorClass ?? 'bg-primary';
  const baseName = contextBaseName;

  return (
    <header className={`flex items-center justify-between px-6 py-4 ${colorClass}`}>
      <div className='flex items-center gap-4'>
        <Link href={'/dashboard'}>
          <div className='h-5 w-5 flex items-center justify-center'>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="70.1703 95.216 176.9161 229.2266" width="176.916px" height="229.227px">
              <path d="M90.0389,12.3675 L24.0799,39.6605 C20.4119,41.1785 20.4499,46.3885 24.1409,47.8515 L90.3759,74.1175 C96.1959,76.4255 102.6769,76.4255 108.4959,74.1175 L174.7319,47.8515 C178.4219,46.3885 178.4609,41.1785 174.7919,39.6605 L108.8339,12.3675 C102.8159,9.8775 96.0559,9.8775 90.0389,12.3675" style={{ fill: 'white' }} transform="matrix(1, 0, 0, 1, 59.13017449170866, 165.9424030167579)"/>
              <path d="M105.3122,88.4608 L105.3122,154.0768 C105.3122,157.1978 108.4592,159.3348 111.3602,158.1848 L185.1662,129.5368 C186.8512,128.8688 187.9562,127.2408 187.9562,125.4288 L187.9562,59.8128 C187.9562,56.6918 184.8092,54.5548 181.9082,55.7048 L108.1022,84.3528 C106.4182,85.0208 105.3122,86.6488 105.3122,88.4608" style={{ fill: 'white' }} transform="matrix(1, 0, 0, 1, 59.13017449170866, 165.9424030167579)"/>
              <path d="M88.0781,91.8464 L66.1741,102.4224 L63.9501,103.4974 L17.7121,125.6524 C14.7811,127.0664 11.0401,124.9304 11.0401,121.6744 L11.0401,60.0884 C11.0401,58.9104 11.6441,57.8934 12.4541,57.1274 C12.7921,56.7884 13.1751,56.5094 13.5731,56.2884 C14.6781,55.6254 16.2541,55.4484 17.5941,55.9784 L87.7101,83.7594 C91.2741,85.1734 91.5541,90.1674 88.0781,91.8464" style={{ fill: 'white' }} transform="matrix(1, 0, 0, 1, 59.13017449170866, 165.9424030167579)"/>
              <path d="M 14.05 -37.655 L 14.05 27.961 C 14.05 31.082 17.197 33.219 20.098 32.069 L 93.904 3.421 C 95.589 2.753 96.694 1.125 96.694 -0.687 L 96.694 -66.303 C 96.694 -69.424 93.547 -71.561 90.646 -70.411 L 16.84 -41.763 C 15.156 -41.095 14.05 -39.467 14.05 -37.655" style={{ fill: 'white', strokeWidth: 1 }} transform="matrix(1, 0, 0, 1, 59.13017449170866, 165.9424030167579)"/>
            </svg>
          </div>
        </Link>
        <div className='flex items-center gap-4'>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className='flex items-center gap-2 cursor-pointer'>
                <h1 className='text-lg font-semibold text-white'>{baseName}</h1>
                <ChevronDown className="w-4 h-4 text-white" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={15}>
              <DropdownMenuItem disabled>Information about your base</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className='items-center gap-2 hidden sm:flex'>
            <Button className='rounded-full bg-black/15' variant={"header"} size="sm">
              Data
            </Button>
            <Button className="rounded-full" variant={"header"} size="sm">
              Automations
            </Button>
            <Button className="rounded-full" variant={"header"} size="sm">
              Interfaces
            </Button>
            <div className="bg-white/25 h-5 w-[1px] mx-2"></div>
            <Button className="rounded-full" variant={"header"} size="sm">
              Forms
            </Button>
          </div>
        </div>
      </div>
      <div className='flex items-center gap-4'>
        <DropdownMenu>
          <DropdownMenuTrigger>
            <div className='border-1 rounded-full border-white'>
              <CurrentUserAvatar />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent sideOffset={5} align="end">
            <DropdownMenuLabel>
              <div className='flex flex-col gap-1'>
                <span className="font-semibold">{useCurrentUserName()}</span>
                <span className='font-normal'>{useCurrentUserEmail()}</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator></DropdownMenuSeparator>
            <DropdownModeToggle />
            <DropdownLogoutButton />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}