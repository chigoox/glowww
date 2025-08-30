export const metadata = { title: 'Templates - Glow' };

export default function TemplatesPage() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Glow Templates</h1>
        <p className="text-lg text-gray-600 mb-6">Browse and download .glow templates to jump-start your site.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 border rounded-lg">Template 1 — Portfolio</div>
          <div className="p-6 border rounded-lg">Template 2 — Blog</div>
          <div className="p-6 border rounded-lg">Template 3 — Online Store</div>
        </div>

        <div className="mt-8 text-sm text-gray-500">Note: Template import/export will be available soon.</div>
      </div>
    </main>
  );
}
