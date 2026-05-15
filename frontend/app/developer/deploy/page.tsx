'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Star, Download, CheckCircle, ArrowRight, Zap, ExternalLink, Bot,
  MessageSquare, Music, Smartphone, Settings, Wrench, BookOpen, Loader2, Copy, Key,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { extractApiList, marketplaceApi } from '@/lib/api';

const STEPS = [
  { n: 1, label: 'Choisir un bot', sub: 'Sélectionnez le bot à déployer' },
  { n: 2, label: 'Configuration', sub: 'Configurez les paramètres du bot' },
  { n: 3, label: 'Déploiement', sub: 'Lancez et suivez le déploiement' },
  { n: 4, label: 'Terminé', sub: 'Votre bot est en ligne' },
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
  const [envVars, setEnvVars] = useState<Record<string, string>>({});
  const [deploying, setDeploying] = useState(false);
  const [deployLogs, setDeployLogs] = useState<string[]>([]);
  const [generatedApiKey, setGeneratedApiKey] = useState<string | null>(null);
  const [deployedBot, setDeployedBot] = useState<any>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['marketplace-bots'],
    queryFn: () => marketplaceApi.getAll({ sort: 'popular' }),
  });

  const bots = extractApiList(data, 'bots');

  const handleDeploy = async () => {
    if (!selectedBot) return;
    setDeploying(true);
    setDeployLogs([]);

    const addLog = (msg: string) =>
      setDeployLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

    addLog('Préparation du déploiement...');
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : '';
      addLog('Connexion au serveur...');
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || '/api'}/bots/deploy`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            name: selectedBot.name,
            platform: selectedBot.platform || 'WHATSAPP',
            envVars: {
              ...envVars,
              ...(selectedBot.githubUrl ? { GITHUB_URL: selectedBot.githubUrl } : {}),
            },
            marketplaceBotId: selectedBot.id,
            sessionLink: envVars.SESSION_ID || '',
          }),
        }
      );
      addLog('Traitement par le serveur...');
      const data = await res.json();

      if (data.success) {
        addLog('✅ Bot créé avec succès !');
        addLog('Installation des dépendances...');
        await new Promise(r => setTimeout(r, 1500));
        addLog('Injection du connector XHRIS HOST...');
        await new Promise(r => setTimeout(r, 1000));
        addLog('Démarrage du conteneur...');
        await new Promise(r => setTimeout(r, 1000));
        addLog('✅ Bot en ligne !');

        setDeployedBot(data.data);
        if (data.data?.apiKey) setGeneratedApiKey(data.data.apiKey);

        await new Promise(r => setTimeout(r, 500));
        setCurrentStep(4);
        toast.success('Bot déployé avec succès !');
      } else {
        const errMsg = data.message || 'Erreur inconnue';
        addLog(`❌ Erreur: ${errMsg}`);
        console.error('[XHRIS DEPLOY] Échec du déploiement:', errMsg, data);
        toast.error(errMsg);
      }
    } catch (err: any) {
      const errMsg = err.message || 'Erreur réseau';
      addLog(`❌ Erreur de connexion: ${errMsg}`);
      console.error('[XHRIS DEPLOY] Erreur de connexion:', err);
      toast.error('Erreur de connexion au serveur');
    }
    setDeploying(false);
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

          {/* Step 2: Configuration standardisée */}
          {currentStep === 2 && selectedBot && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

              {/* Bouton obtenir la session — toujours en haut si sessionUrl existe */}
              {selectedBot.sessionUrl && (
                <div className="bg-[#111118] border border-purple-500/30 rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-xl bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                      <Key className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">Étape 1 — Obtenez votre Session ID</p>
                      <p className="text-xs text-gray-400">Cliquez sur le bouton, connectez-vous, puis copiez votre Session ID</p>
                    </div>
                  </div>
                  <a
                    href={selectedBot.sessionUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 active:bg-purple-800 text-white py-3 rounded-xl text-sm font-semibold transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Obtenir ma Session ID — {selectedBot.name}
                  </a>
                </div>
              )}

              {/* Champs de configuration */}
              <div className="bg-[#111118] border border-white/5 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                    {selectedBot.sessionUrl ? '2' : '1'}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Configuration de {selectedBot.name}</p>
                    <p className="text-xs text-gray-400">Remplissez les paramètres ci-dessous</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* SESSION_ID — toujours présent */}
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <label className="text-sm font-medium text-white">Session ID</label>
                      <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-medium">Requis</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-1.5">
                      {selectedBot.sessionUrl
                        ? 'Collez ici le Session ID obtenu via le bouton ci-dessus'
                        : 'Votre identifiant de session WhatsApp'}
                    </p>
                    <input
                      className="input-field font-mono text-xs"
                      placeholder="Collez votre Session ID ici..."
                      value={envVars.SESSION_ID || ''}
                      onChange={e => setEnvVars({ ...envVars, SESSION_ID: e.target.value })}
                    />
                  </div>

                  {/* BOT_NAME */}
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <label className="text-sm font-medium text-white">Nom du bot</label>
                      <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-medium">Requis</span>
                    </div>
                    <input
                      className="input-field"
                      placeholder={selectedBot.name || 'Mon Bot'}
                      defaultValue={selectedBot.name || ''}
                      onChange={e => setEnvVars({ ...envVars, BOT_NAME: e.target.value })}
                    />
                  </div>

                  {/* OWNER_NUMBER */}
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <label className="text-sm font-medium text-white">Numéro propriétaire</label>
                      <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-medium">Requis</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-1.5">Votre numéro WhatsApp avec indicatif (sans +)</p>
                    <input
                      className="input-field font-mono"
                      placeholder="237xxxxxxxxx"
                      value={envVars.OWNER_NUMBER || ''}
                      onChange={e => setEnvVars({ ...envVars, OWNER_NUMBER: e.target.value })}
                    />
                  </div>

                  {/* SUDO */}
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <label className="text-sm font-medium text-white">Numéros SUDO</label>
                      <span className="text-[10px] bg-gray-500/20 text-gray-400 px-1.5 py-0.5 rounded font-medium">Optionnel</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-1.5">Numéros avec accès admin au bot, séparés par des virgules</p>
                    <input
                      className="input-field font-mono"
                      placeholder="237xxxxxxxxx,237yyyyyyyyy"
                      value={envVars.SUDO || ''}
                      onChange={e => setEnvVars({ ...envVars, SUDO: e.target.value })}
                    />
                  </div>

                  {/* PREFIX */}
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <label className="text-sm font-medium text-white">Préfixe des commandes</label>
                      <span className="text-[10px] bg-gray-500/20 text-gray-400 px-1.5 py-0.5 rounded font-medium">Optionnel</span>
                    </div>
                    <input
                      className="input-field w-24"
                      placeholder="."
                      defaultValue="."
                      maxLength={3}
                      onChange={e => setEnvVars({ ...envVars, PREFIX: e.target.value || '.' })}
                    />
                  </div>

                  {/* Champs supplémentaires depuis envTemplate (hors champs standard) */}
                  {(() => {
                    const standard = ['SESSION_ID','BOT_NAME','OWNER_NUMBER','SUDO','PREFIX'];
                    const extra = Object.entries(selectedBot.envTemplate || {})
                      .filter(([k]) => !standard.includes(k));
                    if (extra.length === 0) return null;
                    return (
                      <>
                        <div className="border-t border-white/5 pt-4">
                          <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wider">Paramètres spécifiques à {selectedBot.name}</p>
                          <div className="space-y-4">
                            {extra.map(([key, config]: [string, any]) => (
                              <div key={key}>
                                <div className="flex items-center gap-2 mb-1.5">
                                  <label className="text-sm font-medium text-white">{config.label || key}</label>
                                  {config.required && <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-medium">Requis</span>}
                                </div>
                                {config.description && <p className="text-xs text-gray-500 mb-1.5">{config.description}</p>}
                                {config.type === 'select' ? (
                                  <select className="input-field"
                                    value={envVars[key] || config.default || ''}
                                    onChange={e => setEnvVars({ ...envVars, [key]: e.target.value })}>
                                    <option value="">Sélectionner...</option>
                                    {(config.options || []).map((o: string) => <option key={o} value={o}>{o}</option>)}
                                  </select>
                                ) : (
                                  <input
                                    type={config.type === 'password' ? 'password' : 'text'}
                                    className="input-field"
                                    placeholder={config.placeholder || config.default || (config.required ? 'Requis' : 'Optionnel')}
                                    defaultValue={config.default || ''}
                                    onChange={e => setEnvVars({ ...envVars, [key]: e.target.value })}
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="flex justify-between">
                <button onClick={() => setCurrentStep(1)} className="btn-secondary">← Retour</button>
                <button
                  onClick={() => {
                    if (!envVars.SESSION_ID?.trim()) { toast.error('Le Session ID est requis'); return; }
                    if (!envVars.BOT_NAME?.trim() && !selectedBot.name) { toast.error('Le nom du bot est requis'); return; }
                    if (!envVars.OWNER_NUMBER?.trim()) { toast.error('Le numéro propriétaire est requis'); return; }
                    // Appliquer les defaults si champ non touché
                    setEnvVars(prev => ({
                      ...prev,
                      BOT_NAME: prev.BOT_NAME || selectedBot.name || 'MonBot',
                      PREFIX: prev.PREFIX || '.',
                    }));
                    setCurrentStep(3);
                  }}
                  className="btn-primary flex items-center gap-2"
                >
                  Sauvegarder et continuer <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 3: Deploy + logs */}
          {currentStep === 3 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="bg-[#111118] border border-white/5 rounded-xl p-5">
                <h2 className="font-semibold text-white mb-4">3. Déploiement</h2>

                {!deploying && !deployedBot && (
                  <>
                    <div className="space-y-3 mb-6">
                      {[
                        { l: 'Bot', v: selectedBot?.name },
                        { l: 'Plateforme', v: selectedBot?.platform },
                        { l: 'Variables configurées', v: `${Object.keys(envVars).filter(k => envVars[k]).length} variable(s)` },
                        { l: 'Coût', v: `${selectedBot?.coinsPerDay || 10} Coins / jour` },
                      ].map(i => (
                        <div key={i.l} className="flex justify-between py-2 border-b border-white/5 last:border-0 text-sm">
                          <span className="text-gray-400">{i.l}</span>
                          <span className="text-white font-medium">{i.v}</span>
                        </div>
                      ))}
                    </div>
                    <button onClick={handleDeploy}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors">
                      <Zap className="w-4 h-4" /> Lancer le déploiement
                    </button>
                  </>
                )}

                {deploying && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 mb-4">
                      <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                      <span className="text-white font-medium">Déploiement en cours...</span>
                    </div>
                    <div className="bg-black/40 rounded-lg p-4 font-mono text-xs text-gray-400 space-y-1 max-h-48 overflow-y-auto">
                      {deployLogs.map((log, i) => (
                        <div key={i} className="flex gap-2">
                          <span className="text-purple-500 flex-shrink-0">&gt;</span>
                          <span>{log}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 text-center">Veuillez patienter, cela peut prendre quelques minutes...</p>
                  </div>
                )}
              </div>
              {!deploying && !deployedBot && (
                <div className="flex justify-between">
                  <button onClick={() => setCurrentStep(2)} className="btn-secondary">← Retour</button>
                </div>
              )}
            </motion.div>
          )}

          {/* Step 4: Success */}
          {currentStep === 4 && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
              <div className="text-center py-6">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-10 h-10 text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Votre bot est en ligne !</h2>
                <p className="text-gray-400 mb-1">{selectedBot?.name} a été déployé avec succès.</p>
              </div>

              {/* API Key card */}
              {generatedApiKey && (
                <div className="bg-[#111118] border border-yellow-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Key className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm font-semibold text-yellow-400">Clé API générée</span>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">
                    ⚠️ Sauvegardez cette clé maintenant — elle ne sera plus affichée en clair.
                    Elle est déjà injectée dans les variables d&apos;environnement de votre bot.
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs font-mono text-gray-200 bg-black/40 px-3 py-2 rounded-lg truncate">
                      {generatedApiKey}
                    </code>
                    <button
                      onClick={() => { navigator.clipboard.writeText(generatedApiKey); toast.success('Clé copiée !'); }}
                      className="p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 text-gray-400 flex-shrink-0"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Connector info */}
              <div className="bg-[#111118] border border-purple-500/20 rounded-xl p-4 text-sm">
                <p className="text-gray-400 mb-2">
                  Incluez <code className="text-purple-400">xhrishost-connector.js</code> dans votre bot pour accéder aux commandes de gestion via WhatsApp.
                </p>
                <a
                  href="/xhrishost-connector.js"
                  download="xhrishost-connector.js"
                  className="inline-flex items-center gap-2 text-purple-400 hover:text-purple-300 text-xs"
                >
                  <Download className="w-3.5 h-3.5" /> Télécharger le Connector
                </a>
              </div>

              <div className="flex gap-3 justify-center pt-2">
                <Link href="/dashboard/bots" className="btn-primary flex items-center gap-2">Voir mes bots</Link>
                <button
                  onClick={() => { setCurrentStep(1); setSelectedBot(null); setEnvVars({}); setDeployLogs([]); setGeneratedApiKey(null); setDeployedBot(null); }}
                  className="btn-secondary"
                >Déployer un autre bot</button>
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
