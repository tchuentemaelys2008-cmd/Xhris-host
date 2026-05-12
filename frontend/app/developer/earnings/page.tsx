'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Code, Bot, CheckCircle, Clock, XCircle, Zap, Star,
  Upload, ArrowRight, Loader2, BookOpen, Trophy, Gift,
} from 'lucide-react';
import { developerApi } from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';

export default function DeveloperPage() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const router = useRouter();
  const user = session?.user as any;

  const [form, setForm] = useState({
    name: '',
    description: '',
    platform: 'WHATSAPP',
    githubUrl: '',
    demoUrl: '',
    tags: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['dev-publications'],
    queryFn: () => developerApi.getPublications(),
    enabled: !!user,
  });

  const _raw_publications = (data as any)?.data?.bots ?? (data as any)?.data ?? [];
  const publications: any[] = Array.isArray(_raw_publications) ? _raw_publications : [];
  const hasApproved = publications.some((p: any) => p.status === 'PUBLISHED' || p.status === 'APPROVED');
  const hasPending = publications.some((p: any) => p.status === 'PENDING');
  const hasAny = publications.length > 0;

  const submitMutation = useMutation({
    mutationFn: () => developerApi.submitBot({
      ...form,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dev-publications'] });
      toast.success('Bot soumis pour validation !');
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || 'Erreur lors de la soumission'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (hasApproved) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Espace Développeur</h1>
          <p className="text-gray-400 text-sm mt-1">Gérez vos bots, suivez vos revenus et développez votre audience.</p>
        </div>

        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 flex items-center gap-4">
          <CheckCircle className="w-10 h-10 text-green-400 flex-shrink-0" />
          <div>
            <div className="text-lg font-semibold text-white">Votre accès développeur est actif !</div>
            <p className="text-sm text-gray-400">Vous avez un bot approuvé. Explorez votre espace développeur.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { href: '/developer/hub', icon: Code, label: 'Developer Hub', desc: 'Centre de contrôle développeur', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
            { href: '/developer/publications', icon: Bot, label: 'Mes Publications', desc: 'Gérez vos bots publiés', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
            { href: '/developer/statistics', icon: Zap, label: 'Statistiques', desc: 'Analytics et performances', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
            { href: '/developer/earnings', icon: Gift, label: 'Gains', desc: 'Vos revenus en Coins', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
            { href: '/developer/leaderboard', icon: Trophy, label: 'Classement', desc: 'Votre position', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
            { href: '/developer/referral', icon: Star, label: 'Parrainage', desc: 'Invitez des développeurs', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
          ].map(item => (
            <Link key={item.href} href={item.href}
              className={`bg-[#111118] border ${item.border} rounded-xl p-5 hover:bg-[#15151f] transition-colors group`}>
              <div className={`w-10 h-10 ${item.bg} rounded-lg flex items-center justify-center mb-3`}>
                <item.icon className={`w-5 h-5 ${item.color}`} />
              </div>
              <div className="font-medium text-white mb-1 flex items-center gap-2">
                {item.label}
                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-xs text-gray-400">{item.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  if (hasPending) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Espace Développeur</h1>
          <p className="text-gray-400 text-sm mt-1">Votre demande est en cours de validation.</p>
        </div>

        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-8 text-center">
          <Clock className="w-14 h-14 text-yellow-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Demande en attente</h2>
          <p className="text-gray-400 mb-2">Votre bot a été soumis et est en cours de validation par notre équipe.</p>
          <p className="text-sm text-gray-500">Délai moyen : 24 à 48 heures. Vous serez notifié par email.</p>

          <div className="mt-6 space-y-3 max-w-md mx-auto">
            {publications.map((p: any) => (
              <div key={p.id} className="bg-[#111118] border border-white/5 rounded-lg p-4 flex items-center gap-3 text-left">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  p.status === 'PENDING' ? 'bg-yellow-400' :
                  p.status === 'APPROVED' || p.status === 'PUBLISHED' ? 'bg-green-400' :
                  'bg-red-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white">{p.name}</div>
                  <div className="text-xs text-gray-500 capitalize">{p.status?.toLowerCase()}</div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => qc.invalidateQueries({ queryKey: ['dev-publications'] })}
            className="btn-secondary mt-6 flex items-center gap-2 mx-auto"
          >
            <Loader2 className="w-4 h-4" /> Actualiser le statut
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Devenir Développeur</h1>
        <p className="text-gray-400 text-sm mt-1">Soumettez votre premier bot pour débloquer l&apos;espace développeur et commencer à gagner des Coins.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-2">
        {[
          { icon: Upload, label: '1. Soumettez votre bot', desc: 'Remplissez le formulaire ci-dessous avec les infos de votre bot.', color: 'text-purple-400', bg: 'bg-purple-500/10' },
          { icon: CheckCircle, label: '2. Validation admin', desc: 'Notre équipe vérifie votre bot sous 24-48h.', color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { icon: Zap, label: '3. Accès développeur', desc: 'Débloquez les stats, revenus et outils développeur.', color: 'text-green-400', bg: 'bg-green-500/10' },
          { icon: Gift, label: '4. Gagnez des Coins', desc: '+2 Coins crédités sur votre compte à chaque déploiement de votre bot par un utilisateur.', color: 'text-amber-400', bg: 'bg-amber-500/10' },
        ].map(step => (
          <div key={step.label} className="bg-[#111118] border border-white/5 rounded-xl p-4">
            <div className={`w-9 h-9 ${step.bg} rounded-lg flex items-center justify-center mb-3`}>
              <step.icon className={`w-4 h-4 ${step.color}`} />
            </div>
            <div className="text-sm font-medium text-white mb-1">{step.label}</div>
            <div className="text-xs text-gray-400">{step.desc}</div>
          </div>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="bg-[#111118] border border-white/5 rounded-xl p-6">
        <h2 className="font-semibold text-white mb-5">Soumettre votre premier bot</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Nom du bot *</label>
            <input className="input-field w-full" placeholder="Mon Bot WhatsApp"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Plateforme *</label>
            <select className="input-field w-full" value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}>
              <option value="WHATSAPP">WhatsApp</option>
              <option value="DISCORD">Discord</option>
              <option value="TELEGRAM">Telegram</option>
              <option value="INSTAGRAM">Instagram</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-gray-400 mb-1.5 block">Description *</label>
            <textarea className="input-field w-full resize-none" rows={3}
              placeholder="Décrivez les fonctionnalités de votre bot..."
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Lien GitHub (optionnel)</label>
            <input className="input-field w-full" placeholder="https://github.com/..."
              value={form.githubUrl} onChange={e => setForm(f => ({ ...f, githubUrl: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1.5 block">Lien démo (optionnel)</label>
            <input className="input-field w-full" placeholder="https://..."
              value={form.demoUrl} onChange={e => setForm(f => ({ ...f, demoUrl: e.target.value }))} />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-gray-400 mb-1.5 block">Tags (séparés par des virgules)</label>
            <input className="input-field w-full" placeholder="IA, automatisation, support..."
              value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} />
          </div>
        </div>

        <div className="flex items-center gap-3 mt-6">
          <button
            onClick={() => submitMutation.mutate()}
            disabled={!form.name || !form.description || submitMutation.isPending}
            className="btn-primary flex items-center gap-2 disabled:opacity-50"
          >
            {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Soumettre pour validation
          </button>
          <Link href="/docs" className="btn-secondary flex items-center gap-2">
            <BookOpen className="w-4 h-4" /> Voir les guidelines
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
