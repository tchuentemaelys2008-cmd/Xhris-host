'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Zap, Mail, MessageSquare, Send, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) return toast.error('Remplissez tous les champs requis');
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setLoading(false);
    setSent(true);
    toast.success('Message envoyé !');
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <nav className="border-b border-white/5 px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-white">XHRIS <span className="text-purple-400">HOST</span></span>
        </Link>
        <Link href="/auth/login" className="btn-primary text-sm">Se connecter</Link>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-3">Contactez-nous</h1>
          <p className="text-gray-400">Notre équipe est là pour vous aider. Réponse sous 24h.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Contact info */}
          <div className="space-y-6">
            {[
              { icon: Mail, title: 'Email', value: 'support@xhris.host', color: 'text-purple-400', bg: 'bg-purple-500/10' },
              { icon: MessageSquare, title: 'Discord', value: 'discord.gg/xhrishost', color: 'text-blue-400', bg: 'bg-blue-500/10' },
            ].map((item) => (
              <div key={item.title} className="bg-[#111118] border border-white/5 rounded-xl p-5">
                <div className={`w-10 h-10 ${item.bg} rounded-lg flex items-center justify-center mb-3`}>
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <div className="text-sm font-medium text-white mb-1">{item.title}</div>
                <div className={`text-sm ${item.color}`}>{item.value}</div>
              </div>
            ))}
            <div className="bg-[#111118] border border-white/5 rounded-xl p-5">
              <div className="text-sm font-medium text-white mb-2">Heures de support</div>
              <div className="text-sm text-gray-400">Lun–Ven : 9h–18h</div>
              <div className="text-sm text-gray-400">Sam : 10h–15h</div>
            </div>
          </div>

          {/* Form */}
          <div className="md:col-span-2 bg-[#111118] border border-white/5 rounded-xl p-6">
            {sent ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center">
                <CheckCircle className="w-16 h-16 text-green-400 mb-4" />
                <h2 className="text-xl font-bold text-white mb-2">Message envoyé !</h2>
                <p className="text-gray-400 mb-6">Nous vous répondrons dans les 24h.</p>
                <button onClick={() => setSent(false)} className="btn-secondary text-sm">Envoyer un autre message</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-400 block mb-1.5">Nom *</label>
                    <input className="input-field" placeholder="Votre nom"
                      value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 block mb-1.5">Email *</label>
                    <input type="email" className="input-field" placeholder="votre@email.com"
                      value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-400 block mb-1.5">Sujet</label>
                  <select className="input-field" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}>
                    <option value="">Sélectionner un sujet</option>
                    <option>Support technique</option>
                    <option>Facturation</option>
                    <option>Partenariat</option>
                    <option>Autre</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-400 block mb-1.5">Message *</label>
                  <textarea rows={5} className="input-field resize-none" placeholder="Décrivez votre problème ou votre demande..."
                    value={form.message} onChange={e => setForm({ ...form, message: e.target.value })} required />
                </div>
                <button type="submit" disabled={loading}
                  className="btn-primary w-full py-3 flex items-center justify-center gap-2 disabled:opacity-60">
                  {loading
                    ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <><Send className="w-4 h-4" /> Envoyer le message</>
                  }
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
