export const metadata = { title: 'Documentation - Glow' };

export default function DocumentationPage() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Documentation</h1>
        <p className="text-lg text-gray-600 mb-6">Guides, tutorials, and API documentation to help you build with Glow.</p>
        <div className="space-y-4">
          <div className="p-6 border rounded-lg">
            <h3 className="text-xl font-semibold">Getting Started</h3>
            <p className="text-gray-700">How to create your first site with the visual editor.</p>
          </div>
          <div className="p-6 border rounded-lg">
            <h3 className="text-xl font-semibold">Using Templates</h3>
            <p className="text-gray-700">How to import and customize .glow files.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
