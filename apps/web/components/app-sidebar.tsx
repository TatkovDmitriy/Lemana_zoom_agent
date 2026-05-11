'use client';

import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { FolderKanban, LogOut, Bot } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { getClientAuth } from '@/lib/firebase-client';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/projects' as const, label: 'Проекты', icon: FolderKanban },
];

export function AppSidebar() {
  const pathname = usePathname();

  async function handleSignOut() {
    await signOut(getClientAuth());
  }

  return (
    <aside className="flex h-screen w-56 flex-col border-r bg-background">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <Bot className="h-5 w-5 text-primary" />
        <span className="font-semibold text-sm">Lemana Zoom</span>
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {navItems.map(({ href, label, icon: Icon }) => (
          <NextLink
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
              pathname.startsWith(href)
                ? 'bg-accent text-accent-foreground font-medium'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </NextLink>
        ))}
      </nav>

      <div className="border-t p-2">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <LogOut className="h-4 w-4" />
          Выйти
        </button>
      </div>
    </aside>
  );
}
