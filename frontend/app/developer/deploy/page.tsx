'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Star, CheckCircle, ArrowRight, Zap, ExternalLink, Bot,
  MessageSquare, Smartphone, Settings, Wrench, BookOpen,
  Loader2, Copy, Key, Download, HelpCircle, AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { extractApiList, extractApiData, marketplaceApi, botsApi } from '@/lib/api';

const STEPS = [
  { n: 1, label: 'Choisir un bot',  sub: 'Sélectionnez le bot à déployer' },
  { n: 2, label: 'Configuration',   sub: 'Configurez les paramètres du bot' },
  { n: 3, label: 'Déploiement',     sub: 'Lancez et suivez le déploiement' },
  { n: 4, label: 'Terminé',         sub: 'Votre bot est en ligne' },
];

const DOC_LINKS = [
  { icon: BookOpen, label: 'Comment déployer un bot',    sub: 'Guide étape par étape' },
  { icon: Settings, label: 'Variables d\'environnement', sub: 'Comprendre la configuration' },
  { icon: Wrench,   label: 'Problèmes courants',         sub: 'Solutions aux erreurs fréquentes' },
];

const parseEnv = (v: any): Record<string, any> => {
  if (!v) return {};
  if (typeof v === 'string') { try { return JSON.parse(v); } catch { return {}; } }
  return typeof v === 'object' ? v : {};
};

const DEFAULT_ENV_TEMPLATES: Record<string, Record<string, any>> = {
  WHATSAPP: {
    SESSION_ID:   { label: 'Session ID',          type: 'text',     required: true,  description: 'Session WhatsApp générée sur le site de pairing du bot' },
    BOT_NAME:     { label: 'Nom du bot',          type: 'text',     required: true },
    OWNER_NUMBER: { label: 'Numéro propriétaire', type: 'text',     required: true,  description: 'Avec indicatif, sans le + (ex: 237xxxxxxxxx)' },
    SUDO:         { label: 'Numéros SUDO',        type: 'text',     required: false, description: 'Numéros admin séparés par des virgules' },
    PREFIX:       { label: 'Préfixe',             type: 'text',     required: false, default: '.' },
  },
  TELEGRAM: {
    BOT_TOKEN: { label: 'Bot Token',  type: 'password', required: true,  description: 'Token obtenu via @BotFather' },
    BOT_NAME:  { label: 'Nom du bot', type: 'text',     required: true },
    OWNER_ID:  { label: 'Owner ID',   type: 'text',     required: true,  description: 'Votre ID Telegram numérique' },
  },
  DISCORD: {
    BOT_TOKEN: { label: 'Bot Token', type: 'password', required: true },
    CLIENT_ID: { label: 'Client ID', type: 'text',     required: true },
    GUILD_ID:  { label: 'Guild ID',  type: 'text',     required: false },
  },
};

const PLATFORM_ICON: Record<string, any> = {
  WHATSAPP: Smartphone,
  TELEGRAM: MessageSquare,
  DISCORD:  MessageSquare,
};

export default function DeployBotPage() {
  const [currentStep, setCurrentStep]         = useState(1);
  const [selectedBot, setSelectedBot]         = useState<any>(null);
  const [envVars, setEnvVars]                 = useState<Record<string, string>>({});
  const [deploying, setDeploying]             = useState(false);
  const [deployLogs, setDeployLogs]           = useState<string[]>([]);
  const [deployedBot, setDeployedBot]         = useState<any>(null);
  const [generatedApiKey, setGeneratedApiKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery]         = useState('');
  const [deployError, setDeployError]         = useState<string | null>(null);

  const pollingRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const seenLogLinesRef = useRef<Set<string>>(new Set());
  const startTimeRef = useRef<number>(0);
  const logsDivRef   = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logsDivRef.current) logsDivRef.current.scrollTop = logsDivRef.current.scrollHeight;
  }, [deployLogs]);

  useEffect(() => () => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    eventSourceRef.current?.close();
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['marketplace-bots'],
    queryFn: () => marketplaceApi.getAll({ sort: 'popular' }),
  });

  const allBots = extractApiList(data, 'bots');
  const bots = allBots.filter(b =>
    !searchQuery ||
    b.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    b.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addLog = (msg: string) => {
    const now = new Date();
    const t = [now.getHours(), now.getMinutes(), now.getSeconds()]
      .map(n => String(n).padStart(2, '0')).join(':');
    setDeployLogs(prev => [...prev, `[${t}] ${msg}`]);
  };

  const addProcessLogs = (lines: string[]) => {
    const nextLines = lines.filter(line => {
      if (!line || seenLogLinesRef.current.has(line)) return false;
      seenLogLinesRef.current.add(line);
      return true;
    });
    if (nextLines.length === 0) return;
    setDeployLogs(prev => [...prev, ...nextLines]);
  };

  const stopPolling = () => {
    if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
  };

  const stopLogStream = () => {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
  };

  const handleDeployLegacy = async () => {
    if (!selectedBot) return;
    setDeploying(true);
    setDeployLogs([]);
    setDeployError(null);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : '';
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api';

      const res = await fetch(`${apiBase}/bots/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: selectedBot.name,
          platform: selectedBot.platform || 'WHATSAPP',
          marketplaceBotId: selectedBot.id,
          envVars: { ...envVars, ...(selectedBot.githubUrl ? { GITHUB_URL: selectedBot.githubUrl } : {}) },
          sessionLink: envVars.SESSION_ID || envVars.session_id || '',
        }),
      });

      const txt = await res.text();
      let payload: any;
      try { payload = JSON.parse(txt); } catch { payload = { success: false, message: 'Réponse invalide du serveur' }; }

      if (!payload.success) {
        const msg = payload.message || 'Erreur inconnue';
        addLog(`❌ Erreur: ${msg}`);
        setDeployError(msg);
        toast.error(msg);
        setDeploying(false);
        return;
      }

      const botId: string = payload.data?.id;
      if (payload.data?.apiKey) setGeneratedApiKey(payload.data.apiKey);

      addLog(`🚀 Déploiement initié — ID: ${botId}`);
      startTimeRef.current = Date.now();

      pollingRef.current = setInterval(async () => {
        try {
          if (Date.now() - startTimeRef.current > 120_000) {
            stopPolling();
            setDeploying(false);
            setDeployError('Timeout (2 min) — vérifiez l\'état du bot dans le dashboard.');
            return;
          }

          const logsRes = await botsApi.getLogs(botId);
          const logsData = extractApiData(logsRes) || {};
          const lines: string[] = Array.isArray(logsData.logs) ? logsData.logs : [];
          const status: string = logsData.status || 'STARTING';

          if (lines.length > 0) {
            setDeployLogs(prev => {
              const head = prev[0] || '';
              return [head, ...lines].filter(Boolean);
            });
          }

          if (status === 'RUNNING') {
            stopPolling();
            setDeployLogs(prev => [...prev, '✅ Bot connecté avec succès !']);
            setDeployedBot(payload.data);
            setDeploying(false);
            setCurrentStep(4);
            toast.success('Bot déployé avec succès !');
          } else if (status === 'ERROR') {
            stopPolling();
            const errLine = [...lines].reverse().find((l: string) => /erreur|error|failed/i.test(l))
              || 'Erreur de déploiement Docker — vérifiez la config du bot.';
            setDeployLogs(prev => [...prev, `❌ ${errLine}`]);
            setDeployError(errLine);
            setDeploying(false);
          }
        } catch { /* keep polling on transient network errors */ }
      }, 2000);

    } catch (err: any) {
      addLog(`❌ Erreur réseau: ${err.message || 'Connexion impossible'}`);
      setDeployError(err.message || 'Connexion impossible');
      toast.error('Erreur de connexion au serveur');
      setDeploying(false);
    }
  };

  const handleDeploy = async () => {
    if (!selectedBot) return;
    stopPolling();
    stopLogStream();
    setDeploying(true);
    setDeployLogs([]);
    seenLogLinesRef.current.clear();
    setDeployError(null);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : '';
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '/api';

      const res = await fetch(`${apiBase}/bots/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: selectedBot.name,
          platform: selectedBot.platform || 'WHATSAPP',
          marketplaceBotId: selectedBot.id,
          envVars: { ...envVars, ...(selectedBot.githubUrl ? { GITHUB_URL: selectedBot.githubUrl } : {}) },
          sessionLink: envVars.SESSION_ID || envVars.session_id || '',
        }),
      });

      const txt = await res.text();
      let payload: any;
      try { payload = JSON.parse(txt); } catch { payload = { success: false, message: 'Reponse invalide du serveur' }; }

      if (!res.ok || !payload.success) {
        const msg = payload.message || 'Le bot n\'a pas pu demarrer';
        addLog(`Erreur: ${msg}`);
        setDeployError(msg);
        toast.error(msg);
        setDeploying(false);
        return;
      }

      const botId: string | undefined = payload.data?.id;
      if (!botId) {
        const msg = 'ID du bot manquant dans la reponse';
        addLog(`Erreur: ${msg}`);
        setDeployError(msg);
        setDeploying(false);
        return;
      }

      if (payload.data?.apiKey) setGeneratedApiKey(payload.data.apiKey);
      addLog(`Deployement initie, ID: ${botId}`);
      startTimeRef.current = Date.now();

      const streamUrl = `${apiBase}/bots/${botId}/logs/stream?token=${encodeURIComponent(token || '')}`;
      const source = new EventSource(streamUrl);
      eventSourceRef.current = source;

      source.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg?.line) addProcessLogs([msg.line]);
        } catch {
          if (event.data) addProcessLogs([event.data]);
        }
      };

      source.onerror = () => {
        addLog('Flux de logs interrompu, verification du statut en cours...');
      };

      pollingRef.current = setInterval(async () => {
        try {
          if (Date.now() - startTimeRef.current > 120_000) {
            stopPolling();
            stopLogStream();
            setDeploying(false);
            const msg = 'Timeout (2 min): le bot est toujours en demarrage. Voir dans le dashboard.';
            addLog(msg);
            setDeployError(msg);
            return;
          }

          const statusRes = await fetch(`${apiBase}/bots/${botId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const statusPayload = await statusRes.json();
          const bot = extractApiData(statusPayload) || {};
          const status = String(bot.status || '').toUpperCase();

          const logsRes = await botsApi.getLogs(botId);
          const logsData = extractApiData(logsRes) || {};
          const lines: string[] = Array.isArray(logsData.logs) ? logsData.logs : [];
          addProcessLogs(lines);

          if (status === 'RUNNING' || status === 'ONLINE') {
            stopPolling();
            stopLogStream();
            addLog('Bot connecte avec succes !');
            setDeployedBot(bot);
            setDeploying(false);
            setCurrentStep(4);
            toast.success('Bot connecte avec succes !');
          } else if (status === 'ERROR') {
            stopPolling();
            stopLogStream();
            const msg = bot.errorMessage || 'Le bot n\'a pas pu demarrer';
            addLog(`Erreur: ${msg}`);
            setDeployError(msg);
            setDeploying(false);
          }
        } catch {
          // Transient network errors should not stop an active deployment.
        }
      }, 2000);
    } catch (err: any) {
      stopLogStream();
      addLog(`Erreur reseau: ${err.message || 'Connexion impossible'}`);
      setDeployError(err.message || 'Connexion impossible');
      toast.error('Erreur de connexion au serveur');
      setDeploying(false);
    }
  };

  const resetAll = () => {
    stopPolling();
    stopLogStream();
    setCurrentStep(1);
    setSelectedBot(null);
    setEnvVars({});
    setDeployLogs([]);
    setDeployedBot(null);
    setGeneratedApiKey(null);
    setSearchQuery('');
    setDeployError(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Déployer un Bot</h1>
          <p className="text-gray-400 text-sm mt-1">Déployez facilement un bot sur vos serveurs en quelques étapes.</p>
        </div>
        <Link href="/docs" className="flex items-center gap-2 bg-white/5 border border-white/10 text-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-white/10 transition-colors">
          <BookOpen className="w-3.5 h-3.5" /> Guide du développeur
        </Link>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-0 bg-[#111118] border border-white/5 rounded-xl p-4 overflow-x-auto">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex items-center flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                currentStep === s.n ? 'bg-purple-600 border-purple-600 text-white' :
                currentStep > s.n  ? 'bg-green-600 border-green-600 text-white' :
                'bg-transparent border-white/20 text-gray-500'
              }`}>
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

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">

          {/* ── STEP 1 ── */}
          {currentStep === 1 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="bg-[#111118] border border-white/5 rounded-xl p-5">
                <h2 className="font-semibold text-white mb-1">1. Choisissez le bot à déployer</h2>
                <p className="text-xs text-gray-400 mb-4">Parcourez les bots disponibles et sélectionnez celui que vous souhaitez déployer.</p>

                <input
                  className="input-field w-full mb-4"
                  placeholder="Rechercher un bot..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />

                {isLoading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-40 bg-white/5 rounded-xl animate-pulse" />
                    ))}
                  </div>
                ) : bots.length === 0 ? (
                  <div className="text-center py-10 text-gray-500">
                    <Bot className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Aucun bot trouvé</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {bots.map((bot: any) => {
                      const Icon = PLATFORM_ICON[bot.platform?.toUpperCase()] || Bot;
                      const isSelected = selectedBot?.id === bot.id;
                      return (
                        <div
                          key={bot.id || bot.name}
                          onClick={() => setSelectedBot(bot)}
                          className={`rounded-xl border p-4 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-purple-500 bg-purple-500/10 ring-2 ring-purple-500'
                              : 'border-white/5 bg-[#1A1A24] hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-start gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                              <Icon className="w-5 h-5 text-purple-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-bold text-white">{bot.name}</span>
                                {bot.platform && (
                                  <span className="text-[10px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded">{bot.platform}</span>
                                )}
                              </div>
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {(bot.tags || []).slice(0, 3).map((t: string) => (
                                  <span key={t} className="text-[10px] bg-white/5 text-gray-400 px-1.5 py-0.5 rounded">{t}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                          <p className="text-xs text-gray-400 line-clamp-2 mb-3">{bot.description}</p>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              {(bot.rating ?? 0) > 0 && (
                                <span className="flex items-center gap-1">
                                  <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                                  {bot.rating}
                                </span>
                              )}
                              <span className="text-amber-400 font-medium">{bot.coinsPerDay || 10} Coins/jour</span>
                            </div>
                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                              isSelected ? 'border-purple-500 bg-purple-500' : 'border-white/20'
                            }`}>
                              {isSelected && <CheckCircle className="w-3.5 h-3.5 text-white" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => { if (selectedBot) setCurrentStep(2); }}
                  disabled={!selectedBot}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continuer <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 2 ── */}
          {currentStep === 2 && selectedBot && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="bg-[#111118] border border-white/5 rounded-xl p-5">
                <h2 className="font-semibold text-white mb-1">2. Configuration de {selectedBot.name}</h2>
                <p className="text-xs text-gray-400 mb-4">Remplissez les paramètres requis pour faire fonctionner le bot.</p>

                {(() => {
                  const adminTemplate = parseEnv(selectedBot.envTemplate);
                  const platform = (selectedBot.platform || 'WHATSAPP').toUpperCase();
                  const defaults = DEFAULT_ENV_TEMPLATES[platform] || {};
                  const envTemplate = { ...defaults, ...adminTemplate };
                  const entries = Object.entries(envTemplate);

                  if (entries.length === 0) {
                    return (
                      <div className="bg-gray-500/10 border border-gray-500/20 rounded-xl p-4 text-sm text-gray-400">
                        Aucune variable d&apos;environnement requise pour ce bot. Vous pouvez passer directement au déploiement.
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {entries.map(([key, cfg]: [string, any]) => {
                        const isSession = key.toUpperCase() === 'SESSION_ID';
                        return (
                          <div key={key}>
                            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                              <label className="text-sm font-medium text-white">{cfg.label || key}</label>
                              {isSession && selectedBot.sessionUrl && (
                                <a
                                  href={selectedBot.sessionUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 px-2.5 py-1 rounded-lg transition-colors font-medium"
                                >
                                  <Key className="w-3 h-3" />
                                  Obtenir ma session
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                              {cfg.required ? (
                                <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-medium">Requis</span>
                              ) : (
                                <span className="text-[10px] bg-gray-500/20 text-gray-400 px-1.5 py-0.5 rounded font-medium">Optionnel</span>
                              )}
                            </div>
                            {cfg.description && <p className="text-xs text-gray-500 mb-1.5">{cfg.description}</p>}
                            {cfg.type === 'select' ? (
                              <select
                                className="input-field"
                                value={envVars[key] ?? cfg.default ?? ''}
                                onChange={e => setEnvVars(v => ({ ...v, [key]: e.target.value }))}
                              >
                                <option value="">Sélectionner...</option>
                                {(cfg.options || []).map((o: string) => <option key={o} value={o}>{o}</option>)}
                              </select>
                            ) : cfg.type === 'textarea' ? (
                              <textarea
                                rows={3}
                                className="input-field"
                                placeholder={cfg.placeholder || cfg.default || (cfg.required ? 'Requis' : 'Optionnel')}
                                value={envVars[key] ?? cfg.default ?? ''}
                                onChange={e => setEnvVars(v => ({ ...v, [key]: e.target.value }))}
                              />
                            ) : (
                              <input
                                type={cfg.type === 'password' ? 'password' : cfg.type === 'number' ? 'number' : 'text'}
                                className={`input-field${isSession ? ' font-mono text-xs' : ''}`}
                                placeholder={cfg.placeholder || cfg.default || (cfg.required ? 'Requis' : 'Optionnel')}
                                value={envVars[key] ?? cfg.default ?? ''}
                                onChange={e => setEnvVars(v => ({ ...v, [key]: e.target.value }))}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              <div className="flex justify-between">
                <button onClick={() => setCurrentStep(1)} className="btn-secondary">← Retour</button>
                <button
                  onClick={() => {
                    const _adminTpl = parseEnv(selectedBot.envTemplate);
                    const _platform = (selectedBot.platform || 'WHATSAPP').toUpperCase();
                    const envTemplate = { ...(DEFAULT_ENV_TEMPLATES[_platform] || {}), ..._adminTpl };
                    for (const [key, cfg] of Object.entries(envTemplate) as [string, any][]) {
                      if (cfg.required && !envVars[key]?.trim() && !cfg.default) {
                        toast.error(`${cfg.label || key} est requis`);
                        return;
                      }
                    }
                    setCurrentStep(3);
                  }}
                  className="btn-primary flex items-center gap-2"
                >
                  Sauvegarder et continuer <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 3 ── */}
          {currentStep === 3 && selectedBot && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="bg-[#111118] border border-white/5 rounded-xl p-5">
                <h2 className="font-semibold text-white mb-4">3. Déploiement</h2>

                {/* Initial state: show summary + launch button */}
                {!deploying && !deployError && (
                  <>
                    <div className="space-y-0 mb-6 rounded-xl overflow-hidden border border-white/5">
                      {[
                        { l: 'Bot',                   v: selectedBot.name },
                        { l: 'Plateforme',            v: selectedBot.platform },
                        { l: 'Variables configurées', v: `${Object.keys(envVars).filter(k => envVars[k]).length} variable(s)` },
                        { l: 'Coût',                  v: `${selectedBot.coinsPerDay || 10} Coins / jour` },
                      ].map((row, i, arr) => (
                        <div key={row.l} className={`flex justify-between px-4 py-3 text-sm ${i < arr.length - 1 ? 'border-b border-white/5' : ''} bg-[#1A1A24]`}>
                          <span className="text-gray-400">{row.l}</span>
                          <span className="text-white font-medium">{row.v}</span>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleDeploy}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
                    >
                      <Zap className="w-4 h-4" /> Lancer le déploiement
                    </button>
                  </>
                )}

                {/* Active deploy or error: show real logs */}
                {(deploying || !!deployError) && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 mb-2">
                      {deploying
                        ? <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                        : <AlertCircle className="w-5 h-5 text-red-400" />
                      }
                      <span className="text-white font-medium text-sm">
                        {deploying ? 'Déploiement en cours...' : 'Échec du déploiement'}
                      </span>
                    </div>

                    <div
                      ref={logsDivRef}
                      className="bg-black/40 rounded-lg p-4 font-mono text-xs text-gray-400 space-y-1 max-h-64 overflow-y-auto"
                    >
                      {deployLogs.length === 0
                        ? <span className="text-gray-600">En attente des logs Docker...</span>
                        : deployLogs.map((log, i) => (
                          <div key={i} className="flex gap-2">
                            <span className="text-purple-500 flex-shrink-0">&gt;</span>
                            <span className="break-all">{log}</span>
                          </div>
                        ))
                      }
                    </div>

                    {deployError && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                        <p className="text-red-400 text-xs">{deployError}</p>
                      </div>
                    )}

                    {deploying && (
                      <p className="text-xs text-gray-500 text-center">
                        En attente des logs reels et du signal de connexion du bot...
                      </p>
                    )}

                    {deployError && (
                      <div className="flex gap-3 pt-1">
                        <button onClick={() => setCurrentStep(2)} className="btn-secondary flex-1">← Retour</button>
                        <button
                          onClick={handleDeploy}
                          className="btn-primary flex-1 flex items-center justify-center gap-2"
                        >
                          <Zap className="w-4 h-4" /> Réessayer
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {!deploying && !deployError && (
                <div className="flex justify-between">
                  <button onClick={() => setCurrentStep(2)} className="btn-secondary">← Retour</button>
                </div>
              )}
            </motion.div>
          )}

          {/* ── STEP 4 ── */}
          {currentStep === 4 && (
            <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
              <div className="text-center py-6">
                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-10 h-10 text-green-400" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Votre bot est en ligne !</h2>
                <p className="text-gray-400">{selectedBot?.name} a été déployé avec succès.</p>
              </div>

              {generatedApiKey && (
                <div className="bg-[#111118] border border-yellow-500/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Key className="w-4 h-4 text-yellow-400" />
                    <span className="text-sm font-semibold text-yellow-400">Clé API générée</span>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">
                    ⚠️ Sauvegardez cette clé maintenant — elle ne sera plus affichée en clair. Elle est déjà injectée dans les variables d&apos;environnement de votre bot.
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
                <button onClick={resetAll} className="btn-secondary">Déployer un autre bot</button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-[#111118] border border-white/5 rounded-xl p-5">
            <h3 className="font-semibold text-white mb-4">Comment ça fonctionne ?</h3>
            {STEPS.map(s => (
              <div key={s.n} className="flex gap-3 mb-3 last:mb-0">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  currentStep >= s.n ? 'bg-purple-600 text-white' : 'bg-white/10 text-gray-500'
                }`}>{s.n}</div>
                <div>
                  <div className={`text-sm font-medium ${currentStep >= s.n ? 'text-white' : 'text-gray-500'}`}>{s.label}</div>
                  <div className="text-xs text-gray-600">{s.sub}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-[#111118] border border-white/5 rounded-xl p-5">
            <h3 className="font-semibold text-white mb-3">Documentation</h3>
            <div className="space-y-2">
              {DOC_LINKS.map(d => (
                <Link key={d.label} href="/docs" className="flex items-start gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors group">
                  <d.icon className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-medium text-gray-300 group-hover:text-white transition-colors">{d.label}</div>
                    <div className="text-[10px] text-gray-600">{d.sub}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <div className="bg-[#111118] border border-white/5 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <HelpCircle className="w-4 h-4 text-purple-400" />
              <h3 className="font-semibold text-white text-sm">Besoin d&apos;aide ?</h3>
            </div>
            <p className="text-xs text-gray-400 mb-3">Notre équipe est disponible pour vous aider avec le déploiement de votre bot.</p>
            <Link href="/dashboard/support"
              className="w-full flex items-center justify-center gap-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/20 text-purple-300 text-xs font-medium py-2.5 rounded-lg transition-colors">
              <MessageSquare className="w-3.5 h-3.5" /> Contacter le support
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
