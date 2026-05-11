'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Star, Download, CheckCircle, ArrowRight, Zap, ExternalLink, Bot,
  MessageSquare, Music, Smartphone, Settings, Wrench, BookOpen, Loader2,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { marketplaceApi } from '@/lib/api';

const STEPS = [
  { n: 1, label: 'Choisir un bot', sub: 'Sélectionnez le bot à déployer' },
  { n: 2, label: 'Configuration', sub: 'Configurez votre bot' },
  { n: 3, label: 'Sélection du serveur', sub: 'Choisissez un serveur' },
  { n: 4, label: 'Déploiement', sub: 'Lancez le déploiement' },
  { n: 5, label: 'Terminé', sub: 'Votre bot est en ligne' },
];

const PLATFORM_ICONS: Record<string, any> = {
  whatsapp: Smartphone,
  telegram: MessageSquare,
  discord: MessageSquare,
  tiktok: Music,
};

const DOC_LINKS = [
  { Icon: BookOpen, l: 'Comment déployer un bot', sub: 'Guide étape par étape' },
  { Icon: Settings, l: 'Variables d\'environnement', sub: 'Comprendre la configuration' },
  { Icon: Wrench, l: 'Problèmes courants', sub: 'Solutions aux erreurs fréquentes' },
];

export default function DeployBotPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedBot, setSelectedBot] = useState<any>(null);
  const [selectedServer, setSelectedServer] = useState('');
  const [envVars, setEnvVars] = useState<Record<string, string>>({});
  const [deploying, setDeploying] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['marketplace-bots'],
    queryFn: () => marketplaceApi.getAll({ sort: 'popular' }),
  });

  const _raw_bots = (data as any)?.data?.bots ?? (data as any)?.data ?? [];
  const bots: any[] = Array.isArray(_raw_bots) ? _raw_bots : [];

  const handleDeploy = async () => {
    if (!selectedBot || !selectedServer) return;
    setDeploying(true);
    setTimeout(() => {
      setDeploying(false);
      setCurrentStep(5);
      toast.success(`Bot déployé ! +${selectedBot.coinsPerDeploy || 2} coins crédités au développeur`);
    }, 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Déployer un Bot</h1>
          <p className="text-gray-400 text-sm mt-1">Déployez facilement un bot sur vos serveurs en quelques étapes.</p>
        </div>
        <Link href="/docs" className="flex items-center gap-2 bg-white/5 border border-white/10 text-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-white/10 transition-colors">
          <BookOpen className="w-3.5 h-3.5" /> Guide du développeur
        </Link>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-0 bg-[#111118] border border-white/5 rounded-xl p-4 overflow-x-auto">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex items-center flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${currentStep === s.n ? 'bg-purple-600 border-purple-600 text-white' : currentStep > s.n ? 'bg-green-600 border-green-600 text-white' : 'bg-transparent border-white/20 text-gray-500'}`}>
                {currentStep > s.n ? <CheckCircle className="w-4 h-4" /> : s.n}
              </div>
              <div className="hidden md:block">
                <div className={`text-xs font-medium ${currentStep === s.n ? 'text-white' : currentStep > s.n ? 'text-green-400' : 'text-gray-500'}`}>{s.label}</div>
                <div className="text-[10px] text-gray-600">{s.sub}</div>
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-px mx-3 bg-white/10">
                <div className="h-px bg-purple-500 transition-all duration-500" style={{ width: currentStep > s.n ? '100%' : '0%' }} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2">
          {/* Step 1: Choose bot */}
          {currentStep === 1 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="bg-[#111118] border border-white/5 rounded-xl p-4 sm:p-5">
                <h2 className="font-semibold text-white mb-1">1. Choisissez le bot à déployer</h2>
                <p className="text-xs text-gray-400 mb-4">Parcourez les bots disponibles et sélectionnez celui que vous souhaitez déployer.</p>
                <div className="flex gap-3 mb-4">
                  <input className="input-field flex-1" placeholder="Rechercher un bot..." />
                  <select className="bg-[#1A1A24] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none hidden sm:block">
                    <option>Catégorie</option>
                  </select>
                </div>
                {isLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-purple-400 animate-spin" /></div>
                ) : (
                  <div className="space-y-3">
                    {bots.map((bot: any) => {
                      const PIcon = PLATFORM_ICONS[bot.platform?.toLowerCase()] || Bot;
                      return (
                        <div key={bot.id || bot.name}
                          onClick={() => setSelectedBot(bot)}
                          className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${selectedBot?.id === bot.id ? 'border-purple-500 bg-purple-500/10' : 'border-white/5 hover:border-white/20 bg-[#1A1A24]'}`}>
                          <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                            <PIcon className="w-5 h-5 text-purple-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              <span className="text-sm font-medium text-white">{bot.name}</span>
                              <span className={`badge text-xs ${bot.status === 'Public' || bot.status === 'PUBLISHED' ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>{bot.status}</span>
                            </div>
                            <div className="text-xs text-gray-400">{bot.description || bot.desc}</div>
                            <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-gray-500">
                              {bot.developer && <span>Par {bot.developer}</span>}
                              {(bot.rating ?? 0) > 0 && (
                                <span className="flex items-center gap-1">
                                  <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />{bot.rating}
                                </span>
                              )}
                              <span className="text-green-400 font-medium flex items-center gap-1">
                                +{bot.coinsPerDeploy || 2} Coins/déploiement
                              </span>
                            </div>
                          </div>
                          <button className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex-shrink-0 ${selectedBot?.id === bot.id ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-300 hover:bg-white/10'}`}>
                            {selectedBot?.id === bot.id ? <CheckCircle className="w-3.5 h-3.5" /> : 'Choisir'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-xs text-gray-400">Pas ce que vous cherchez ?</p>
                  <Link href="/marketplace" className="text-xs text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1">
                    Voir le Marketplace <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>

              {selectedBot && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#111118] border border-white/5 rounded-xl p-5">
                  <h3 className="font-semibold text-white mb-4">Aperçu du bot sélectionné</h3>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-6 h-6 text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-semibold text-white">{selectedBot.name}</span>
                        <span className="badge bg-green-500/20 text-green-400 text-xs">{selectedBot.status}</span>
                      </div>
                      {selectedBot.developer && <div className="text-xs text-gray-400 mb-2">Par {selectedBot.developer}</div>}
                      <div className="flex gap-2 flex-wrap mb-3">
                        {(selectedBot.tags || []).map((t: string) => <span key={t} className="badge bg-white/5 text-gray-400 text-xs">{t}</span>)}
                      </div>
                      <p className="text-sm text-gray-300">{selectedBot.description || selectedBot.desc}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs text-gray-400 mb-1">Récompense</div>
                      <div className="text-xl font-bold text-green-400">+{selectedBot.coinsPerDeploy || 2}</div>
                      <div className="text-xs text-gray-500">Coins/déploiement</div>
                    </div>
                  </div>
                </motion.div>
              )}

              <div className="flex justify-end">
                <button onClick={() => selectedBot && setCurrentStep(2)} disabled={!selectedBot}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                  Continuer <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Configure */}
          {currentStep === 2 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="bg-[#111118] border border-white/5 rounded-xl p-5">
                <h2 className="font-semibold text-white mb-1">2. Configuration du bot</h2>
                <p className="text-xs text-gray-400 mb-4">Configurez les paramètres nécessaires au bon fonctionnement du bot.</p>
                <div className="space-y-4">
                  {[
                    { key: 'OPENAI_API_KEY', desc: 'Clé API OpenAI pour GPT-4', required: true, type: 'password' },
                    { key: 'SESSION_SECRET', desc: 'Secret pour la session WhatsApp', required: true, type: 'password' },
                    { key: 'PREFIX', desc: 'Préfixe des commandes (défaut: !)', required: false, type: 'text' },
                    { key: 'AUTO_REPLY', desc: 'Activer les réponses auto', required: false, type: 'select', options: ['true', 'false'] },
                  ].map(e => (
                    <div key={e.key}>
                      <div className="flex items-center gap-2 mb-1.5">
                        <code className="text-xs font-mono text-purple-400">{e.key}</code>
                        {e.required && <span className="badge bg-red-500/20 text-red-400 text-[10px]">Requis</span>}
                      </div>
                      <div className="text-xs text-gray-500 mb-1.5">{e.desc}</div>
                      {e.type === 'select' ? (
                        <select className="input-field" onChange={ev => setEnvVars({ ...envVars, [e.key]: ev.target.value })}>
                          <option value="">Sélectionner...</option>
                          {e.options?.map(o => <option key={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input type={e.type} className="input-field" placeholder={e.required ? 'Requis' : 'Optionnel'}
                          onChange={ev => setEnvVars({ ...envVars, [e.key]: ev.target.value })} />
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex justify-between">
                <button onClick={() => setCurrentStep(1)} className="btn-secondary">← Retour</button>
                <button onClick={() => setCurrentStep(3)} className="btn-primary flex items-center gap-2">
                  Continuer <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Server selection */}
          {currentStep === 3 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="bg-[#111118] border border-white/5 rounded-xl p-5">
                <h2 className="font-semibold text-white mb-1">3. Sélection du serveur</h2>
                <p className="text-xs text-gray-400 mb-4">Choisissez un serveur où déployer votre bot.</p>
                <div className="space-y-3">
                  {['Mon Serveur Pro (2 vCPU / 2 GB RAM)', 'Mon Serveur Starter (1 vCPU / 1 GB RAM)', '+ Créer un nouveau serveur'].map(s => (
                    <label key={s} onClick={() => setSelectedServer(s)}
                      className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${selectedServer === s ? 'border-purple-500 bg-purple-500/10' : 'border-white/5 bg-[#1A1A24] hover:border-white/20'}`}>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedServer === s ? 'border-purple-500' : 'border-white/20'}`}>
                        {selectedServer === s && <div className="w-2 h-2 bg-purple-500 rounded-full" />}
                      </div>
                      <span className="text-sm text-white">{s}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-between">
                <button onClick={() => setCurrentStep(2)} className="btn-secondary">← Retour</button>
                <button onClick={() => selectedServer && setCurrentStep(4)} disabled={!selectedServer} className="btn-primary flex items-center gap-2 disabled:opacity-50">
                  Continuer <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Deploy */}
          {currentStep === 4 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="bg-[#111118] border border-white/5 rounded-xl p-5">
                <h2 className="font-semibold text-white mb-4">4. Déploiement</h2>
                <div className="space-y-3 mb-6">
                  {[
                    { l: 'Bot sélectionné', v: selectedBot?.name },
                    { l: 'Serveur', v: selectedServer },
                    { l: 'Variables configurées', v: `${Object.keys(envVars).length} variable(s)` },
                    { l: 'Coût', v: '10 Coins / jour' },
                  ].map(i => (
                    <div key={i.l} className="flex justify-between py-2 border-b border-white/5 last:border-0 text-sm">
                      <span className="text-gray-400">{i.l}</span>
                      <span className="text-white font-medium">{i.v}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 mb-4 text-xs text-gray-400 flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                  <span>En déployant ce bot, <span className="text-green-400">+{selectedBot?.coinsPerDeploy || 2} coins</span> seront crédités au développeur {selectedBot?.developer}.</span>
                </div>
                <button onClick={handleDeploy} disabled={deploying}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60">
                  {deploying ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Déploiement en cours...</>
                  ) : (
                    <><Zap className="w-4 h-4" /> Lancer le déploiement</>
                  )}
                </button>
              </div>
              <div className="flex justify-between">
                <button onClick={() => setCurrentStep(3)} className="btn-secondary">← Retour</button>
              </div>
            </motion.div>
          )}

          {/* Step 5: Success */}
          {currentStep === 5 && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-10">
              <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Votre bot est en ligne !</h2>
              <p className="text-gray-400 mb-2">{selectedBot?.name} a été déployé avec succès.</p>
              <p className="text-green-400 text-sm mb-8">+{selectedBot?.coinsPerDeploy || 2} coins crédités à {selectedBot?.developer}</p>
              <div className="flex gap-3 justify-center">
                <Link href="/dashboard/bots" className="btn-primary flex items-center gap-2">Voir mes bots</Link>
                <button onClick={() => { setCurrentStep(1); setSelectedBot(null); setSelectedServer(''); }}
                  className="btn-secondary">Déployer un autre bot</button>
              </div>
            </motion.div>
          )}
        </div>

        {/* How it works sidebar */}
        <div className="space-y-4">
          <div className="bg-[#111118] border border-white/5 rounded-xl p-5">
            <h3 className="font-semibold text-white mb-4">Comment ça fonctionne ?</h3>
            {STEPS.map(s => (
              <div key={s.n} className="flex gap-3 mb-3 last:mb-0">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${currentStep >= s.n ? 'bg-purple-600 text-white' : 'bg-white/10 text-gray-500'}`}>{s.n}</div>
                <div>
                  <div className={`text-sm font-medium ${currentStep >= s.n ? 'text-white' : 'text-gray-500'}`}>{s.label}</div>
                  <div className="text-xs text-gray-500">{s.sub}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-[#111118] border border-white/5 rounded-xl p-5">
            <h3 className="font-semibold text-white mb-3">Documentation</h3>
            {DOC_LINKS.map(r => (
              <button key={r.l} className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0 w-full hover:opacity-80 transition-opacity">
                <div className="w-7 h-7 bg-white/5 rounded-lg flex items-center justify-center flex-shrink-0">
                  <r.Icon className="w-3.5 h-3.5 text-purple-400" />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-xs font-medium text-white">{r.l}</div>
                  <div className="text-xs text-gray-500">{r.sub}</div>
                </div>
                <ExternalLink className="w-3 h-3 text-gray-500" />
              </button>
            ))}
          </div>

          <div className="bg-[#111118] border border-white/5 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-semibold text-white">Besoin d'aide ?</h3>
            </div>
            <p className="text-xs text-gray-400 mb-3">Notre équipe est là pour vous aider à déployer votre bot.</p>
            <Link href="/dashboard/support"
              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2">
              <MessageSquare className="w-3.5 h-3.5" /> Contacter le support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
