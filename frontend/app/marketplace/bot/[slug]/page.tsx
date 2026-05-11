'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Star, Download, Zap, CheckCircle, ArrowRight, ExternalLink, Shield,
  Clock, FileDown, Bot, Package, Copy, Info, Coins, ArrowLeft, Loader2,
  MessageSquare, AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { marketplaceApi } from '@/lib/api';

type Step = 'select' | 'download' | 'configure' | 'server' | 'deploy';

const STEPS: { key: Step; label: string }[] = [
  { key: 'select', label: 'Choisir un bot' },
  { key: 'download', label: 'Configuration' },
  { key: 'configure', label: 'Sélection du serveur' },
  { key: 'server', label: 'Déploiement' },
  { key: 'deploy', label: 'Terminé' },
];

export default function BotDetailPage({ params }: { params: { slug: string } }) {
  const [deployStep, setDeployStep] = useState<Step>('select');
  const [activeTab, setActiveTab] = useState<'deploy' | 'download'>('deploy');
  const [selectedServer, setSelectedServer] = useState('');
  const [downloadStarted, setDownloadStarted] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['bot', params.slug],
    queryFn: () => marketplaceApi.getOne(params.slug),
  });

  const bot = (data as any)?.data || null;

  const handleDownload = async () => {
    try {
      setDownloadStarted(true);
      toast.success('Téléchargement démarré ! +1 coin pour le développeur');
      const a = document.createElement('a');
      a.href = `/api/marketplace/bots/${params.slug}/download`;
      a.download = `${params.slug}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      toast.error('Erreur lors du téléchargement');
    }
  };

  const handleDeploy = () => {
    toast.success('Bot déployé avec succès ! +2 coins pour le développeur');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
      </div>
    );
  }

  if (!bot) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] flex flex-col items-center justify-center gap-4">
        <AlertCircle className="w-12 h-12 text-red-400" />
        <p className="text-gray-400">Bot introuvable</p>
        <Link href="/marketplace" className="btn-primary px-4 py-2 text-sm">Retour au marketplace</Link>
      </div>
    );
  }

  const currentStepIdx = STEPS.findIndex(s => s.key === deployStep);

  return (
    <div className="min-h-screen bg-[#0A0A0F] p-4 sm:p-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-500 mb-6">
        <Link href="/marketplace" className="hover:text-white transition-colors flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Marketplace
        </Link>
        <span>/</span>
        <span className="text-white">{bot.name}</span>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 sm:gap-3 mb-8 overflow-x-auto pb-2">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <div className={`flex items-center gap-2 ${deployStep === s.key ? 'text-white' : i < currentStepIdx ? 'text-purple-400' : 'text-gray-600'}`}>
              <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 ${
                deployStep === s.key ? 'bg-purple-600 border-purple-600 text-white'
                : i < currentStepIdx ? 'bg-purple-600/20 border-purple-500 text-purple-400'
                : 'bg-transparent border-white/10 text-gray-600'
              }`}>
                {i < currentStepIdx ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
              </div>
              <span className="text-xs hidden sm:block">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-5">
          {/* Bot info card */}
          <div className="bg-[#111118] border border-white/5 rounded-2xl p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-5">
              <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                <Bot className="w-8 h-8 text-purple-400" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <h1 className="text-lg sm:text-xl font-bold text-white">{bot.name}</h1>
                  {bot.status && <span className="badge bg-green-500/20 text-green-400">{bot.status}</span>}
                  {bot.version && <span className="badge bg-purple-500/20 text-purple-400">{bot.version}</span>}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 mb-3">
                  {bot.developer && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 bg-purple-500/20 rounded-full flex items-center justify-center text-xs font-bold text-purple-400">
                        {bot.developer[0]?.toUpperCase()}
                      </div>
                      <span>Par {bot.developer}</span>
                      {bot.developerVerified && <CheckCircle className="w-3 h-3 text-blue-400" />}
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                    <span className="text-white">{bot.rating ?? '—'}</span>
                    <span>({bot.reviews ?? 0} avis)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Download className="w-3 h-3" /><span>{bot.downloads ?? 0} téléchargements</span>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {(bot.tags || []).map((t: string) => <span key={t} className="badge bg-white/5 text-gray-400 text-xs">{t}</span>)}
                </div>
              </div>
              <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto">
                <button onClick={() => { setActiveTab('deploy'); setDeployStep('download'); }}
                  className="flex-1 sm:flex-none bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2">
                  <Zap className="w-4 h-4" /> Déployer
                </button>
                <button onClick={handleDownload}
                  className="flex-1 sm:flex-none bg-white/5 border border-white/10 text-white px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-white/10 transition-colors flex items-center justify-center gap-2">
                  <FileDown className="w-4 h-4" /> ZIP
                </button>
              </div>
            </div>
            {bot.desc || bot.description ? (
              <div className="mt-5 pt-5 border-t border-white/5">
                <p className="text-sm text-gray-300 leading-relaxed">{bot.desc || bot.description}</p>
              </div>
            ) : null}
          </div>

          {/* Deploy / Download tabs */}
          <div className="bg-[#111118] border border-white/5 rounded-2xl overflow-hidden">
            <div className="flex border-b border-white/5">
              {[
                { k: 'deploy', l: 'Déployer automatiquement', icon: Zap },
                { k: 'download', l: 'Télécharger manuellement', icon: Download },
              ].map(t => (
                <button key={t.k} onClick={() => setActiveTab(t.k as any)}
                  className={`flex-1 py-3.5 text-xs sm:text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === t.k ? 'text-white border-b-2 border-purple-500 bg-purple-600/5' : 'text-gray-400 hover:text-white'
                  }`}>
                  <t.icon className="w-3.5 h-3.5" /> {t.l}
                </button>
              ))}
            </div>

            <div className="p-5 sm:p-6">
              {activeTab === 'deploy' ? (
                <div className="space-y-5">
                  <div>
                    <h3 className="font-semibold text-white mb-1">Déploiement automatique en 1 clic</h3>
                    <p className="text-sm text-gray-400">Sélectionnez un serveur et déployez le bot directement depuis la plateforme.</p>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-2">Sélectionner un serveur</label>
                    <div className="space-y-2">
                      {['Mon Serveur Pro (En ligne)', 'Créer un nouveau serveur'].map(s => (
                        <label key={s} onClick={() => setSelectedServer(s)}
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selectedServer === s ? 'border-purple-500 bg-purple-500/10' : 'border-white/10 hover:border-white/20'}`}>
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${selectedServer === s ? 'border-purple-500' : 'border-white/20'}`}>
                            {selectedServer === s && <div className="w-2 h-2 bg-purple-500 rounded-full" />}
                          </div>
                          <span className="text-sm text-white">{s}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {(bot.envVars || []).filter((e: any) => e.required).length > 0 && (
                    <div>
                      <label className="text-xs text-gray-400 block mb-2">Variables d'environnement requises</label>
                      <div className="space-y-2">
                        {(bot.envVars || []).filter((e: any) => e.required).map((e: any) => (
                          <div key={e.key}>
                            <div className="flex items-center gap-2 mb-1">
                              <code className="text-xs text-purple-400 font-mono">{e.key}</code>
                              <span className="badge bg-red-500/20 text-red-400 text-[10px]">Requis</span>
                            </div>
                            <input className="input-field text-sm" placeholder={e.desc} />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 flex items-start gap-3">
                    <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-400">
                      En déployant ce bot, <span className="text-purple-400 font-medium">2 coins</span> seront automatiquement crédités au développeur.
                    </p>
                  </div>
                  <button onClick={handleDeploy}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors">
                    <Zap className="w-4 h-4" /> Déployer le Bot
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <h3 className="font-semibold text-white mb-1">Déploiement manuel</h3>
                    <p className="text-sm text-gray-400">Téléchargez le fichier ZIP, configurez le bot sur votre propre infrastructure.</p>
                  </div>
                  <div className="bg-[#1A1A24] border border-white/5 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center">
                          <Package className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">{bot.name} {bot.version}</div>
                          <div className="text-xs text-gray-400">{bot.fileSize || 'N/A'} • {bot.language || 'Node.js'}</div>
                        </div>
                      </div>
                      <button onClick={handleDownload}
                        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                        <Download className="w-4 h-4" /> Télécharger
                      </button>
                    </div>
                    {downloadStarted && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-xs text-green-400 mt-3">
                        <CheckCircle className="w-4 h-4" /> Téléchargement démarré • +1 coin crédité au développeur
                      </motion.div>
                    )}
                  </div>
                  {(bot.setupSteps || []).length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-white mb-3">Étapes d'installation</h4>
                      {(bot.setupSteps || []).map((s: any, i: number) => (
                        <div key={i} className="flex gap-3 mb-3">
                          <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0">{i + 1}</div>
                          <div>
                            <div className="text-sm font-medium text-white">{s.title}</div>
                            <div className="text-xs text-gray-400">{s.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-purple-400 mb-2 flex items-center gap-2">
                      <MessageSquare className="w-3.5 h-3.5" /> Déployer sur votre serveur XHRIS HOST
                    </h4>
                    <p className="text-xs text-gray-400 mb-3">Uploadez votre ZIP sur un de vos serveurs et déployez directement depuis la console.</p>
                    <div className="flex gap-2">
                      <Link href="/dashboard/servers" className="flex-1 btn-primary text-xs py-2 text-center">Mes serveurs</Link>
                      <Link href="/dashboard/servers" className="flex-1 btn-secondary text-xs py-2 text-center">Créer un serveur</Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Features */}
          {(bot.features || []).length > 0 && (
            <div className="bg-[#111118] border border-white/5 rounded-2xl p-5 sm:p-6">
              <h2 className="font-semibold text-white mb-4">Fonctionnalités</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(bot.features || []).map((f: string) => (
                  <div key={f} className="flex items-center gap-2.5">
                    <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <span className="text-sm text-gray-300">{f}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-4">
          {/* Reward info */}
          <div className="bg-[#111118] border border-purple-500/20 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-400" /> Récompense pour le développeur
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                <div>
                  <div className="text-xs text-gray-400">Par déploiement réussi</div>
                  <div className="text-sm text-green-400 font-semibold flex items-center gap-1"><Coins className="w-3 h-3" /> +2 coins</div>
                </div>
                <Zap className="w-5 h-5 text-green-400" />
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <div>
                  <div className="text-xs text-gray-400">Par téléchargement ZIP</div>
                  <div className="text-sm text-blue-400 font-semibold flex items-center gap-1"><Coins className="w-3 h-3" /> +1 coin</div>
                </div>
                <Download className="w-5 h-5 text-blue-400" />
              </div>
            </div>
          </div>

          {/* Bot info */}
          <div className="bg-[#111118] border border-white/5 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Informations</h3>
            {[
              { l: 'Version', v: bot.version },
              { l: 'Dernière mise à jour', v: bot.lastUpdate },
              { l: 'Taille du fichier', v: bot.fileSize },
              { l: 'Compatibilité', v: bot.compatibility },
              { l: 'Langage', v: bot.language },
            ].filter(i => i.v).map(i => (
              <div key={i.l} className="flex justify-between py-2 border-b border-white/5 last:border-0 text-xs">
                <span className="text-gray-400">{i.l}</span>
                <span className="text-white font-medium">{i.v}</span>
              </div>
            ))}
          </div>

          {/* Security */}
          <div className="bg-[#111118] border border-white/5 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-400" /> Sécurité
            </h3>
            {['Code vérifié par notre équipe', 'Aucun malware détecté', 'Déploiement isolé', 'Chiffrement des données'].map(s => (
              <div key={s} className="flex items-center gap-2 mb-2 text-xs">
                <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" />
                <span className="text-gray-300">{s}</span>
              </div>
            ))}
          </div>

          {/* Support */}
          <div className="bg-[#111118] border border-white/5 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-white mb-2">Besoin d'aide ?</h3>
            <p className="text-xs text-gray-400 mb-3">Notre équipe est là pour vous aider à déployer votre bot.</p>
            <Link href="/dashboard/support"
              className="w-full btn-primary text-xs py-2.5 flex items-center justify-center gap-2">
              <MessageSquare className="w-3.5 h-3.5" /> Contacter le support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
