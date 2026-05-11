// Minute view — full implementation in next iteration
export default function MinutePage({ params }: { params: Promise<{ minuteId: string }> }) {
  void params;
  return (
    <main className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">Протокол встречи</h1>
      <p className="text-muted-foreground">Загрузка…</p>
    </main>
  );
}
