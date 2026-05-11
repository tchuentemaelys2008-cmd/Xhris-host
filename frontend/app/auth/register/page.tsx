'use client';

import { useState } from 'react';
import { signIn, getSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Eye, EyeOff, User, Mail, Lock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '' });
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pwStrength, setPwStrength] = useState(0);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));
    if (name === 'password') {
      let s = 0;
      if (value.length >= 8) s++;
      if (/[A-Z]/.test(value)) s++;
      if (/[0-9]/.test(value)) s++;
      if (/[^A-Za-z0-9]/.test(value)) s++;
      setPwStrength(s);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) return toast.error('Acceptez les conditions d\'utilisation');
    if (form.password !== form.confirmPassword) return toast.error('Les mots de passe ne correspondent pas');
    if (form.password.length < 8) return toast.error('Mot de passe trop court');
    setLoading(true);
    try {
      // ✅ Chemin relatif — passe par le proxy Vercel, pas de CORS
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `${form.firstName} ${form.lastName}`.trim(), email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      toast.success('Compte créé !');
      const result = await signIn('credentials', { email: form.email, password: form.password, redirect: false });
      if (result?.ok && !result?.error) {
        const session = await getSession();
        const accessToken = (session?.user as any)?.accessToken;
        if (accessToken) localStorage.setItem('auth_token', accessToken);
        router.push('/dashboard');
      } else {
        router.push('/auth/login');
      }
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de l\'inscription');
    } finally { setLoading(false); }
  };

  const strengthColors = ['', 'bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-green-500'];

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'radial-gradient(ellipse at 50% 50%, #0D0A1F 0%, #080810 100%)' }}>
      {/* Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 60 }).map((_, i) => (
          <div key={i} className="absolute rounded-full bg-white/20" style={{
            width: Math.random() * 2 + 'px', height: Math.random() * 2 + 'px',
            top: Math.random() * 100 + '%', left: Math.random() * 100 + '%',
          }} />
        ))}
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-purple-900/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-blue-900/15 blur-[100px] rounded-full" />
      </div>

      {/* Help */}
      <div className="relative z-10 flex justify-end p-6">
        <button className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm text-gray-300 hover:bg-white/10 transition-colors">
          <span className="w-5 h-5 rounded-full border border-gray-400 flex items-center justify-center text-xs">?</span>
          Besoin d'aide ?
        </button>
      </div>

      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-4">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-[440px]">
          <div className="bg-[#0E0E1C]/95 border border-white/8 rounded-2xl px-10 py-8 shadow-2xl">

            {/* Logo */}
            <div className="flex justify-center mb-5">
              <div className="w-14 h-14 rounded-full border-2 border-purple-500/50 bg-purple-600/20 flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                  <path d="M4 4L14 14M14 14L24 4M14 14L4 24M14 14L24 24" stroke="#9F7AEA" strokeWidth="3" strokeLinecap="round"/>
                </svg>
              </div>
            </div>

            <h1 className="text-2xl font-bold text-white text-center mb-2">Créer un compte</h1>
            <p className="text-gray-400 text-sm text-center leading-relaxed mb-6">
              Rejoignez XhrisHost et commencez à gérer<br />vos bots et serveurs en quelques clics.
            </p>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* First + Last name */}
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    name="firstName" value={form.firstName} onChange={handleChange}
                    placeholder="Prénom"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-3 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-all"
                    required
                  />
                </div>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    name="lastName" value={form.lastName} onChange={handleChange}
                    placeholder="Nom"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-3 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-all"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  name="email" type="email" value={form.email} onChange={handleChange}
                  placeholder="Email"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-all"
                  required
                />
              </div>

              {/* Password */}
              <div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    name="password" type={showPw ? 'text' : 'password'} value={form.password} onChange={handleChange}
                    placeholder="Mot de passe"
                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-11 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-all"
                    required
                  />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {form.password && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1,2,3,4].map(n => (
                        <div key={n} className={`flex-1 h-1 rounded-full transition-all ${pwStrength >= n ? strengthColors[pwStrength] : 'bg-white/10'}`} />
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">
                      Le mot de passe doit contenir au moins 8 caractères, avec une majuscule, une minuscule, un chiffre et un caractère spécial.
                    </p>
                  </div>
                )}
                {!form.password && (
                  <p className="text-xs text-gray-500 mt-1.5">Le mot de passe doit contenir au moins 8 caractères, avec une majuscule, une minuscule, un chiffre et un caractère spécial.</p>
                )}
              </div>

              {/* Confirm password */}
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  name="confirmPassword" type={showConfirm ? 'text' : 'password'} value={form.confirmPassword} onChange={handleChange}
                  placeholder="Confirmer le mot de passe"
                  className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-11 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-all"
                  required
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {/* Terms */}
              <label className="flex items-start gap-3 cursor-pointer">
                <div
                  onClick={() => setAgreed(!agreed)}
                  className={`w-5 h-5 rounded mt-0.5 flex items-center justify-center flex-shrink-0 border transition-all ${agreed ? 'bg-purple-600 border-purple-600' : 'bg-transparent border-white/20 hover:border-white/40'}`}
                >
                  {agreed && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                <span className="text-sm text-gray-300">
                  J'accepte les{' '}
                  <Link href="/terms" className="text-purple-400 hover:text-purple-300">Conditions d'utilisation</Link>
                  {' '}et la{' '}
                  <Link href="/privacy" className="text-purple-400 hover:text-purple-300">Politique de confidentialité</Link>
                </span>
              </label>

              <button
                type="submit" disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-500 text-white rounded-xl py-3.5 font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-60"
              >
                {loading
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <><User className="w-4 h-4" /> Créer mon compte</>
                }
              </button>
            </form>

            <div className="flex items-center gap-4 my-4">
              <div className="flex-1 h-px bg-white/8" />
              <span className="text-xs text-gray-600">ou</span>
              <div className="flex-1 h-px bg-white/8" />
            </div>

            <button
              onClick={() => signIn('google', { callbackUrl: '/dashboard' })}
              className="w-full bg-white hover:bg-gray-100 text-gray-800 rounded-xl py-3 font-medium text-sm flex items-center justify-center gap-3 transition-all"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              S'inscrire avec Google
            </button>

            <p className="text-center text-sm text-gray-500 mt-5">
              Vous avez déjà un compte ?{' '}
              <Link href="/auth/login" className="text-purple-400 hover:text-purple-300 font-medium">Se connecter</Link>
            </p>
          </div>
        </motion.div>
      </div>

      <footer className="relative z-10 py-5 flex flex-wrap justify-center gap-x-6 gap-y-1 text-xs text-gray-600">
        <span>© 2024 XHRIS HOST. Tous droits réservés.</span>
        <Link href="/terms" className="hover:text-gray-400">Conditions d'utilisation</Link>
        <Link href="/privacy" className="hover:text-gray-400">Politique de confidentialité</Link>
        <Link href="/contact" className="hover:text-gray-400">Contact</Link>
      </footer>
    </div>
  );
}
