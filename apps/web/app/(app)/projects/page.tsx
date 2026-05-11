'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { getClientAuth } from '@/lib/firebase-client';

type Project = {
  id: string;
  name: string;
  description: string;
  color: string | null;
};

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const auth = getClientAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.replace('/sign-in');
        return;
      }
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/projects', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`${res.status}`);
        setProjects(await res.json());
      } catch {
        setError('Не удалось загрузить проекты');
      }
    });
    return () => unsubscribe();
  }, [router]);

  return (
    <main className="container mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Проекты</h1>
      {error ? (
        <p className="text-destructive">{error}</p>
      ) : projects === null ? (
        <p className="text-muted-foreground">Загрузка проектов…</p>
      ) : projects.length === 0 ? (
        <p className="text-muted-foreground">Проектов пока нет.</p>
      ) : (
        <ul className="space-y-3">
          {projects.map((p) => (
            <li key={p.id}>
              <a
                href={`/projects/${p.id}`}
                className="block rounded-lg border p-4 transition-colors hover:bg-muted"
              >
                <span className="font-medium">{p.name}</span>
                {p.description && (
                  <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
                )}
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
