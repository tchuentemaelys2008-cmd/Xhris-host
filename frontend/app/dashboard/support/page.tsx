'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import {
  HelpCircle, Ticket, Megaphone, Search, BookOpen, ChevronRight,
  Rocket, Bot, Coins, Server, Shield, Cpu, Receipt, Code,
  Eye, Plus, Send, Loader2, CheckCircle, Clock, AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { supportApi } from '@/lib/api';
import { formatRelative, formatDateTime, cn } from '@/lib/utils';

const TABS = [
  { id: 'help', label: "Centre d'aide", icon: HelpCircle },
  { id: 'tickets', label: 'Mes tickets', icon: Ticket },
  { id: 'news', label: 'Annonces', icon: Megaphone },
];

const CATEGORIES = [
  { icon: Rocket, label: 'Premiers pas', desc: 'Découvrez XHRIS HOST et apprenez les bases pour bien démarrer.', count: 5, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { icon: Bot, label: 'Bots & Déploiement', desc: 'Tout sur le déploiement, la gestion et l\'optimisation de vos bots.', count: 12, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { icon: Coins, label: 'Coins & Abonnements', desc: 'Gérez vos Coins, abonnements et moyens de paiement.', count: 8, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  { icon: Server, label: 'Serveurs', desc: 'Informations sur nos serveurs, status et maintenance.', count: 6, color: 'text-green-400', bg: 'bg-green-500/10' },
  { icon: Shield, label: 'Sécurité', desc: 'Protégez votre compte et vos données avec nos guides.', count: 7, color: 'text-red-400', bg: 'bg-red-500/10' },
  { icon: Cpu, label: 'Intégrations', desc: 'Connectez XHRIS HOST avec vos outils préférés.', count: 4, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  { icon: Receipt, label: 'Facturation', desc: 'Comprendre vos factures et gérer vos paiements.', count: 4, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  { icon: Code, label: 'API & Développeurs', desc: 'Documentation technique et référence de l\'API.', count: 9, color: 'text-pink-400', bg: 'bg-pink-500/10' },
];

const TICKET_PRIORITY = { LOW: 'Faible', MEDIUM: 'Moyen', HIGH: 'Élevé', URGENT: 'Urgent' };
const TICKET_STATUS = { OPEN: 'Ouvert', IN_PROGRESS: 'En cours', WAITING: 'En attente', RESOLVED: 'Résolu', CLOSED: 'Fermé' };

export default function SupportPage() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const user = session?.user as any;
  const [tab, setTab] = useState('help');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [newTicket, setNewTicket] = useState({ subject: '', message: '', category: 'general', priority: 'MEDIUM' });

  const { data: articlesData } = useQuery({ queryKey: ['support-articles', search], queryFn: () => supportApi.getArticles({ search: search || undefined }) });
  const { data: ticketsData, isLoading: ticketsLoading } = useQuery({ queryKey: ['tickets'], queryFn: () => supportApi.getTickets(), enabled: tab === 'tickets' });
  const { data: faqData } = useQuery({ queryKey: ['faq'], queryFn: () => supportApi.getFaq() });

  const _rawArticles = (articlesData as any)?.data?.articles ?? (articlesData as any)?.data;
  const articles: any[] = Array.isArray(_rawArticles) ? _rawArticles : [];
  const _rawTickets = (ticketsData as any)?.data?.tickets ?? (ticketsData as any)?.data;
  const tickets: any[] = Array.isArray(_rawTickets) ? _rawTickets : [];
  const _rawFaq = (faqData as any)?.data?.faq ?? (faqData as any)?.data;
  const faq: any[] = Array.isArray(_rawFaq) ? _rawFaq : [];

  const createMutation = useMutation({
    mutationFn: () => supportApi.createTicket(newTicket),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tickets'] });
      setShowCreate(false);
      setNewTicket({ subject: '', message: '', category: 'general', priority: 'MEDIUM' });
      setTab('tickets');
      toast.success('Ticket créé avec succès ! Notre équipe vous répondra sous 2h.');
    },
    onError: (e: any) => {
      toast.error(e?.response?.data?.message || 'Erreur lors de la création du ticket. Réessayez.');
    },
  });

  const ticketStatusIcon = (status: string) => {
    switch (status) {
      case 'OPEN': return <AlertCircle className="w-3.5 h-3.5 text-blue-400" />;
      case 'IN_PROGRESS': return <Clock className="w-3.5 h-3.5 text-yellow-400" />;
      case 'RESOLVED': case 'CLOSED': return <CheckCircle className="w-3.5 h-3.5 text-green-400" />;
      default: return <Clock className="w-3.5 h-3.5 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Support</h1>
          <p className="text-gray-400 text-sm mt-1">Nous sommes là pour vous aider. Trouvez des réponses ou contactez notre équipe.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Ouvrir un ticket
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#0D0D14] border border-white/5 rounded-xl p-1">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn('flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-all', tab === t.id ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white')}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'help' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-[#111118] border border-white/5 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-white mb-1">Comment pouvons-nous vous aider ?</h2>
              <p className="text-gray-400 text-sm mb-4">Recherchez des articles d'aide, des guides et des réponses à vos questions.</p>
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input className="input-field w-full pl-10" placeholder="Rechercher dans la documentation..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <button className="btn-primary px-6">Rechercher</button>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white mb-4">Parcourir par catégorie</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CATEGORIES.map(cat => (
                  <motion.div key={cat.label} whileHover={{ scale: 1.01 }} className="bg-[#111118] border border-white/5 rounded-xl p-4 cursor-pointer hover:border-white/10 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 ${cat.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                        <cat.icon className={`w-5 h-5 ${cat.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white">{cat.label}</div>
                        <div className="text-xs text-gray-400 mt-0.5 line-clamp-2">{cat.desc}</div>
                        <div className="flex items-center gap-1 mt-2 text-xs text-purple-400">
                          <span>{cat.count} articles</span>
                          <ChevronRight className="w-3 h-3" />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white mb-4">Articles populaires</h3>
              <div className="bg-[#111118] border border-white/5 rounded-xl divide-y divide-white/5">
                {articles.length === 0 ? (
                  [
                    { title: 'Comment déployer mon premier bot ?', views: '12.4K' },
                    { title: 'Comment acheter des Coins et les utiliser ?', views: '8.7K' },
                    { title: 'Comprendre les niveaux d\'abonnement Premium', views: '6.2K' },
                    { title: 'Résoudre les problèmes de connexion', views: '4.1K' },
                    { title: 'Comment sécuriser mon compte', views: '3.8K' },
                  ].map((a, i) => (
                    <div key={i} className="flex items-center gap-3 p-4 hover:bg-white/5 cursor-pointer transition-colors">
                      <BookOpen className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <span className="flex-1 text-sm text-white">{a.title}</span>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Eye className="w-3.5 h-3.5" />
                        {a.views} vues
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-600" />
                    </div>
                  ))
                ) : articles.map((a: any) => (
                  <div key={a.id} className="flex items-center gap-3 p-4 hover:bg-white/5 cursor-pointer transition-colors">
                    <BookOpen className="w-4 h-4 text-gray-500 flex-shrink-0" />
                    <span className="flex-1 text-sm text-white">{a.title}</span>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Eye className="w-3.5 h-3.5" />
                      {a.views} vues
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full mt-3 btn-secondary">Voir tous les articles</button>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-[#111118] border border-white/5 rounded-xl p-5">
              <h4 className="text-sm font-semibold text-white mb-3">Statut des services</h4>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-sm text-white">Tous les systèmes opérationnels</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">Dernière mise à jour : il y a 2 min</p>
            </div>

            <div className="bg-[#111118] border border-white/5 rounded-xl p-5">
              <h4 className="text-sm font-semibold text-white mb-3">Liens rapides</h4>
              <div className="space-y-2">
                {[
                  { icon: Code, label: 'Documentation API', desc: 'Consultez notre documentation technique' },
                  { icon: Rocket, label: 'Guide de démarrage', desc: 'Suivez notre guide pas à pas' },
                  { icon: Bot, label: 'Tutoriels vidéo', desc: 'Apprenez avec nos vidéos' },
                ].map(l => (
                  <button key={l.label} className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-colors text-left">
                    <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center flex-shrink-0">
                      <l.icon className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-white">{l.label}</div>
                      <div className="text-xs text-gray-500">{l.desc}</div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-600 flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-[#111118] border border-white/5 rounded-xl p-5">
              <h4 className="text-sm font-semibold text-white mb-2">Vous ne trouvez pas votre réponse ?</h4>
              <p className="text-xs text-gray-400 mb-3">Notre équipe support est là pour vous aider rapidement.</p>
              <button onClick={() => setShowCreate(true)} className="btn-primary w-full flex items-center justify-center gap-2">
                <Ticket className="w-4 h-4" />
                Ouvrir un ticket
              </button>
              <div className="text-xs text-gray-500 text-center mt-2">Temps de réponse moyen : 2h</div>
            </div>
          </div>
        </div>
      )}

      {tab === 'tickets' && (
        <div className="space-y-4">
          {ticketsLoading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 text-purple-400 animate-spin" /></div>
          ) : tickets.length === 0 ? (
            <div className="bg-[#111118] border border-white/5 rounded-xl p-12 text-center">
              <Ticket className="w-12 h-12 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">Aucun ticket ouvert</p>
              <button onClick={() => setShowCreate(true)} className="btn-primary">Créer mon premier ticket</button>
            </div>
          ) : tickets.map((ticket: any) => (
            <motion.div key={ticket.id} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="bg-[#111118] border border-white/5 rounded-xl p-5 hover:border-white/10 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    {ticketStatusIcon(ticket.status)}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">{ticket.subject}</div>
                    <div className="text-xs text-gray-500 mt-0.5">#{ticket.id?.slice(0, 8)} · {formatRelative(ticket.createdAt)}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={cn('text-xs px-2 py-0.5 rounded-full', {
                    'bg-blue-500/10 text-blue-400': ticket.status === 'OPEN',
                    'bg-yellow-500/10 text-yellow-400': ticket.status === 'IN_PROGRESS' || ticket.status === 'WAITING',
                    'bg-green-500/10 text-green-400': ticket.status === 'RESOLVED' || ticket.status === 'CLOSED',
                  })}>{TICKET_STATUS[ticket.status as keyof typeof TICKET_STATUS] || ticket.status}</span>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full', {
                    'bg-gray-500/10 text-gray-400': ticket.priority === 'LOW',
                    'bg-blue-500/10 text-blue-400': ticket.priority === 'MEDIUM',
                    'bg-orange-500/10 text-orange-400': ticket.priority === 'HIGH',
                    'bg-red-500/10 text-red-400': ticket.priority === 'URGENT',
                  })}>{TICKET_PRIORITY[ticket.priority as keyof typeof TICKET_PRIORITY] || ticket.priority}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {tab === 'news' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {faq.length === 0 ? (
            <div className="md:col-span-2 text-center py-12 text-gray-400">Aucune annonce disponible</div>
          ) : faq.map((item: any) => (
            <div key={item.id} className="bg-[#111118] border border-white/5 rounded-xl p-5">
              <div className="text-sm font-semibold text-white mb-2">{item.question}</div>
              <div className="text-xs text-gray-400">{item.answer}</div>
            </div>
          ))}
        </div>
      )}

      {/* Create ticket modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-[#111118] border border-white/10 rounded-2xl p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold text-white mb-4">Ouvrir un ticket</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Sujet</label>
                <input className="input-field w-full" placeholder="Décrivez brièvement votre problème" value={newTicket.subject} onChange={e => setNewTicket(f => ({ ...f, subject: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Catégorie</label>
                  <select className="input-field w-full" value={newTicket.category} onChange={e => setNewTicket(f => ({ ...f, category: e.target.value }))}>
                    <option value="general">Général</option>
                    <option value="bots">Bots</option>
                    <option value="servers">Serveurs</option>
                    <option value="coins">Coins</option>
                    <option value="account">Compte</option>
                    <option value="billing">Facturation</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1.5 block">Priorité</label>
                  <select className="input-field w-full" value={newTicket.priority} onChange={e => setNewTicket(f => ({ ...f, priority: e.target.value }))}>
                    <option value="LOW">Faible</option>
                    <option value="MEDIUM">Moyen</option>
                    <option value="HIGH">Élevé</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1.5 block">Message</label>
                <textarea className="input-field w-full resize-none" rows={4} placeholder="Décrivez votre problème en détail..." value={newTicket.message} onChange={e => setNewTicket(f => ({ ...f, message: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Annuler</button>
              <button onClick={() => createMutation.mutate()} disabled={!newTicket.subject || !newTicket.message || createMutation.isPending} className="btn-primary flex-1 flex items-center justify-center gap-2">
                {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Envoyer</>}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
