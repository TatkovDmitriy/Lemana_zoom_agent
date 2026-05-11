import { AppSidebar } from '@/components/app-sidebar';
import { Toaster } from 'sonner';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-background">
      <AppSidebar />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto w-full max-w-6xl px-4 md:px-8 py-6 md:py-10">{children}</div>
      </main>
      <Toaster position="bottom-right" richColors />
    </div>
  );
}
