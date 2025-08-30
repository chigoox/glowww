export const metadata = { title: 'Temeple Market Place - Glow' };

export default function MarketplacePage() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Temeple Market Place</h1>
        <p className="text-lg text-gray-600 mb-6">Buy and sell .glow site files and templates. This is a placeholder Temeple Market Place page.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 border rounded-lg">Listing 1 — .glow template</div>
          <div className="p-6 border rounded-lg">Listing 2 — .glow template</div>
          <div className="p-6 border rounded-lg">Listing 3 — .glow template</div>
        </div>

        <div className="mt-8 text-sm text-gray-500">Note: Marketplace features (uploads, payments, licensing) will be implemented later.</div>
      </div>
    </main>
  );
}
