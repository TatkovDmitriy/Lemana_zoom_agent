import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(ts: unknown): string {
  let date: Date;
  if (typeof ts === 'string') {
    date = new Date(ts);
  } else if (ts && typeof ts === 'object') {
    const rec = ts as Record<string, number>;
    date = new Date(((rec['_seconds'] ?? rec['seconds']) || 0) * 1000);
  } else {
    return '—';
  }
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
