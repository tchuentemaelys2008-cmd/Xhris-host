'use client';

import Link from 'next/link';
import { MessageSquare } from 'lucide-react';

export default function DashboardCommunityPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Communauté</h1>
        <p className="text-gray-400 text-sm mt-1">Rejoignez la communauté XHRIS HOST.</p>
      </div>
      <div className="bg-[#111118] border border-white/5 rounded-xl p-6 text-center">
        <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <MessageSquare className="w-8 h-8 text-purple-400" />
        </div>
        <p className="text-gray-400 mb-4">Accédez à la communauté complète.</p>
        <Link href="/community" className="btn-primary inline-flex items-center gap-2">
          <MessageSquare className="w-4 h-4" /> Ouvrir la Communauté
        </Link>
      </div>
    </div>
  );
}
