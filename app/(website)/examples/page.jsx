export const metadata = { title: 'Examples - Glow' };

export default function ExamplesPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-4xl text-center">
        <h1 className="text-4xl font-bold mb-4">Website Examples</h1>
        <p className="text-lg text-gray-600 mb-6">A showcase of templates and live sites built with Glow.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 border rounded-lg">Example 1 — Portfolio</div>
          <div className="p-6 border rounded-lg">Example 2 — Blog</div>
          <div className="p-6 border rounded-lg">Example 3 — Online Store</div>
          <div className="p-6 border rounded-lg">Example 4 — Landing Page</div>
        </div>
      </div>
    </main>
  );
}
