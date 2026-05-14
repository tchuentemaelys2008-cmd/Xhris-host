'use client';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-md">
        <div className="text-6xl">📡</div>
        <h1 className="text-2xl font-bold text-white">Hors ligne</h1>
        <p className="text-gray-400">
          Vous n'êtes pas connecté à Internet. Vérifiez votre connexion et réessayez.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}
