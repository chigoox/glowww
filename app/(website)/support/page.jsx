export const metadata = { title: 'Support - Glow' };

export default function SupportPage() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Support</h1>
        <p className="text-lg text-gray-600 mb-6">Help center, docs, and contact options.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 border rounded-lg">Help Center</div>
          <div className="p-6 border rounded-lg">Contact Form</div>
        </div>
      </div>
    </main>
  );
}
