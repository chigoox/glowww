export const metadata = { title: 'Blog - Glow' };

export default function BlogListPage() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Blog</h1>
        <p className="text-lg text-gray-600 mb-6">Latest articles and updates.</p>
        <div className="space-y-6">
          <article className="p-6 border rounded-lg">
            <h2 className="text-2xl font-semibold">Post Title 1</h2>
            <p className="text-sm text-gray-500">Jan 1, 2025 — Admin</p>
            <p className="mt-3 text-gray-700">Summary of the post...</p>
          </article>
          <article className="p-6 border rounded-lg">
            <h2 className="text-2xl font-semibold">Post Title 2</h2>
            <p className="text-sm text-gray-500">Dec 10, 2024 — Admin</p>
            <p className="mt-3 text-gray-700">Summary of the post...</p>
          </article>
        </div>
      </div>
    </main>
  );
}
