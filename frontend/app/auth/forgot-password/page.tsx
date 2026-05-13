'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, CheckCircle, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return toast.error('Entrez votre adresse email');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) {
        setSent(true);
      } else {
        toast.error('Erreur lors de l\'envoi. Vérifiez votre email.');
      }
    } catch {
      setSent(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'radial-gradient(ellipse at 50% 50%, #0D0A1F 0%, #080810 100%)' }}>
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-purple-900/20 blur-[140px] rounded-full" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-blue-900/15 blur-[100px] rounded-full" />
      </div>

      <div className="relative z-10 flex-1 flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="w-full max-w-[440px]">
          <div className="bg-[#0E0E1C]/95 border border-white/8 rounded-2xl px-10 py-10 shadow-2xl">
            <div className="flex justify-center mb-6">
              <div className="w-14 h-14 rounded-full border-2 border-purple-500/50 bg-purple-600/20 flex items-center justify-center">
                <Zap className="w-7 h-7 text-purple-400" />
              </div>
            </div>

            {sent ? (
              <div className="text-center">
                <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
                <h1 className="text-2xl font-bold text-white mb-2">Email envoyé !</h1>
                <p className="text-gray-400 text-sm mb-6">
                  Si un compte existe avec <span className="text-purple-400">{email}</span>,
                  vous recevrez un lien de réinitialisation dans quelques minutes.
                </p>
                <Link href="/auth/login" className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Retour à la connexion
                </Link>
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-white text-center mb-2">Mot de passe oublié ?</h1>
                <p className="text-gray-400 text-sm text-center mb-8">
                  Entrez votre email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-sm text-gray-300 block mb-1.5">Adresse email</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="email" value={email} onChange={e => setEmail(e.target.value)}
                        placeholder="votre@email.com"
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-all"
                        required
                      />
                    </div>
                  </div>

                  <button type="submit" disabled={loading}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white rounded-xl py-3.5 font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60">
                    {loading
                      ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      : 'Envoyer le lien de réinitialisation'
                    }
                  </button>
                </form>

                <div className="mt-6 text-center">
                  <Link href="/auth/login" className="text-sm text-gray-400 hover:text-white flex items-center justify-center gap-1 transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                    Retour à la connexion
                  </Link>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </div>

      <footer className="relative z-10 py-6 flex flex-wrap justify-center gap-x-6 gap-y-1 text-xs text-gray-600">
        <span>© 2024 XHRIS HOST. Tous droits réservés.</span>
        <Link href="/terms" className="hover:text-gray-400 transition-colors">Conditions d&apos;utilisation</Link>
        <Link href="/privacy" className="hover:text-gray-400 transition-colors">Politique de confidentialité</Link>
      </footer>
    </div>
  );
}
