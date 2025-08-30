export const metadata = { title: 'Careers - Glow' };

export default function CareersPage() {
  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">Careers</h1>
        <p className="text-lg text-gray-600 mb-6">Open roles and how to apply.</p>
        <div className="space-y-4">
          <div className="p-6 border rounded-lg">
            <h3 className="text-xl font-semibold">Frontend Engineer</h3>
            <p className="text-gray-700">Remote • Full-time</p>
          </div>
          <div className="p-6 border rounded-lg">
            <h3 className="text-xl font-semibold">Product Designer</h3>
            <p className="text-gray-700">Remote • Contract</p>
          </div>
        </div>
      </div>
    </main>
  );
}
