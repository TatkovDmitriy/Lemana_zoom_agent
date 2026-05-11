// Project minutes list — full implementation in next iteration
export default function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  void params;
  return (
    <main className="container mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Минутки проекта</h1>
      <p className="text-muted-foreground">Загрузка…</p>
    </main>
  );
}
