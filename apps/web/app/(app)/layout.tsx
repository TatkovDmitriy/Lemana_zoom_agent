import { AppSidebar } from '@/components/app-sidebar';
import { Toaster } from 'sonner';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <div className="flex flex-1 flex-col overflow-auto">
        <main className="flex-1">{children}</main>
      </div>
      <Toaster position="bottom-right" richColors />
    </div>
  );
}
