'use client';

import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { Bot, FolderKanban, Inbox, LogOut, Sparkles } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { getClientAuth, getClientDb } from '@/lib/firebase-client';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

export function AppSidebar() {
  const pathname = usePathname();
  const auth = useAuth();
  const [inboxCount, setInboxCount] = useState<number>(0);

  // Live count of minutes with projectId === null. Subscribing (rather than
  // polling /api/minutes/inbox-count once on mount) ensures the badge reacts
  // to PATCH /api/minutes/[id]/move and to new minutes landing in /inbox
  // without a page refresh.
  const uid = auth.status === 'authenticated' ? auth.user.uid : null;
  useEffect(() => {
    if (!uid) {
      setInboxCount(0);
      return;
    }
    const q = query(
      collection(getClientDb(), 'minutes'),
      where('ownerId', '==', uid),
      where('projectId', '==', null),
    );
    const unsub = onSnapshot(
      q,
      (snap) => setInboxCount(snap.size),
      (err) => console.warn('[sidebar] inbox-count snapshot error', err),
    );
    return () => unsub();
  }, [uid]);

  async function handleSignOut() {
    await signOut(getClientAuth());
  }

  const userName =
    auth.status === 'authenticated'
      ? auth.user.displayName ?? auth.user.email ?? 'Пользователь'
      : '';
  const userInitial = userName.trim().charAt(0).toUpperCase() || '?';

  const navItems = [
    { href: '/projects' as const, label: 'Проекты', icon: FolderKanban, badge: null },
    { href: '/inbox' as const, label: 'Входящие', icon: Inbox, badge: inboxCount > 0 ? inboxCount : null },
    { href: '/join' as const, label: 'Подключить бота', icon: Bot, badge: null },
  ];

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
        {navItems.map(({ href, label, icon: Icon, badge }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
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
              <Icon className="h-4 w-4" />
              <span className="flex-1">{label}</span>
              {badge !== null && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/15 px-1.5 text-[11px] font-medium tabular-nums">
                  {badge}
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
