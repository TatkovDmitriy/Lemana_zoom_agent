'use client';

import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { FolderKanban, Inbox, LogOut, Sparkles } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { getClientAuth } from '@/lib/firebase-client';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

function useInboxCount() {
  const auth = useAuth();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (auth.status !== 'authenticated') return;
    fetch('/api/minutes/inbox-count', {
      headers: { Authorization: `Bearer ${auth.token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setCount(data.count ?? 0))
      .catch(() => {});
  }, [auth]);

  return count;
}

const staticNavItems = [
  { href: '/inbox', label: 'Входящие', icon: Inbox },
  { href: '/projects', label: 'Проекты', icon: FolderKanban },
] as const;

export function AppSidebar() {
  const pathname = usePathname();
  const auth = useAuth();
  const inboxCount = useInboxCount();

  async function handleSignOut() {
    await signOut(getClientAuth());
  }

  const userName =
    auth.status === 'authenticated'
      ? auth.user.displayName ?? auth.user.email ?? 'Пользователь'
      : '';
  const userInitial = userName.trim().charAt(0).toUpperCase() || '?';

  return (
    <aside className="hidden md:flex h-screen w-[220px] shrink-0 flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-14 items-center gap-2.5 border-b border-sidebar-border px-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-white/10">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold">Lemana Zoom</span>
          <span className="text-[10px] uppercase tracking-wider text-sidebar-muted">
            Meeting agent
          </span>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 p-2">
        {staticNavItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          const isInbox = href === '/inbox';
          return (
            <NextLink
              key={href}
              href={href as never}
              className={cn(
                'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors',
                active
                  ? 'bg-sidebar-accent text-sidebar-foreground'
                  : 'text-sidebar-muted hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{label}</span>
              {isInbox && inboxCount !== null && inboxCount > 0 && (
                <span className="ml-auto flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold tabular-nums text-primary-foreground">
                  {inboxCount > 99 ? '99+' : inboxCount}
                </span>
              )}
            </NextLink>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-2 space-y-1">
        {auth.status === 'authenticated' && (
          <div className="flex items-center gap-2.5 px-2.5 py-1.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs font-medium">
              {userInitial}
            </div>
            <span className="truncate text-[13px] text-sidebar-foreground">{userName}</span>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] text-sidebar-muted transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
        >
          <LogOut className="h-4 w-4" />
          Выйти
        </button>
      </div>
    </aside>
  );
}
