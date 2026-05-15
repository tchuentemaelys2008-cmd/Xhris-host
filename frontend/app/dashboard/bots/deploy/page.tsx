'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Bot, Zap, ArrowLeft, Loader2, CheckCircle, MessageCircle, Plus, Key, ExternalLink } from 'lucide-react';
import { extractApiList, marketplaceApi, botsApi } from '@/lib/api';
import toast from 'react-hot-toast';

function AddBotRequestBanner({ user }: { user: any }) {
  const handleSendRequest = () => {
    const msg = encodeURIComponent(
      `Bonjour ! Je suis développeur sur XHRIS Host et je souhaite ajouter mon bot sur la marketplace.\n\n📧 Email: ${user?.email || 'N/A'}\n👤 Username: ${user?.name || 'N/A'}\n\nMerci de me contacter pour la suite du processus.`
    );
    // Replace with your WhatsApp business number (format: country code + number, no +)
    window.open(`https://wa.me/237670000000?text=${msg}`, '_blank');
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-purple-600/10 to-blue-600/10 border border-purple-500/20 rounded-xl p-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <Plus className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-white mb-0.5">
              Voulez-vous ajouter un bot ?
            </p>
            <p className="text-xs text-gray-400">
              Vous êtes développeur ? Soumettez votre bot pour qu&apos;il soit publié sur la marketplace.
            </p>
          </div>
        </div>
        <button
          onClick={handleSendRequest}
          className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-2 rounded-lg transition-colors flex-shrink-0 font-medium"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          Oui, contacter
        </button>
      </div>
    </motion.div>
  );
}

const parseEnv = (v: any): Record<string, any> => {
  if (!v) return {};
  if (typeof v === 'string') {
    try { return JSON.parse(v); } catch { return {}; }
  }
  return typeof v === 'object' ? v : {};
};

const DEFAULT_ENV_TEMPLATES: Record<string, Record<string, any>> = {
  WHATSAPP: {
    SESSION_ID:   { label: 'Session ID',          type: 'text',     required: true,  description: 'Session WhatsApp generee sur le site de pairing du bot' },
    BOT_NAME:     { label: 'Nom du bot',          type: 'text',     required: true },
    OWNER_NUMBER: { label: 'Numero proprietaire', type: 'text',     required: true,  description: 'Avec indicatif, sans le + (ex: 237xxxxxxxxx)' },
    SUDO:         { label: 'Numeros SUDO',        type: 'text',     required: false, description: 'Numeros admin separes par des virgules' },
    PREFIX:       { label: 'Prefixe',             type: 'text',     required: false, default: '.' },
  },
  TELEGRAM: {
    BOT_TOKEN: { label: 'Bot Token',  type: 'password', required: true,  description: 'Token obtenu via @BotFather' },
    BOT_NAME:  { label: 'Nom du bot', type: 'text',     required: true },
    OWNER_ID:  { label: 'Owner ID',   type: 'text',     required: true,  description: 'Votre ID Telegram numerique' },
  },
  DISCORD: {
    BOT_TOKEN: { label: 'Bot Token', type: 'password', required: true },
    CLIENT_ID: { label: 'Client ID', type: 'text',     required: true },
    GUILD_ID:  { label: 'Guild ID',  type: 'text',     required: false },
  },
};

const resolveEnvTemplate = (bot: any) => {
  const adminTemplate = parseEnv(bot?.envTemplate);
  const platform = (bot?.platform || 'WHATSAPP').toUpperCase();
  const defaults = DEFAULT_ENV_TEMPLATES[platform] || {};
  return { ...defaults, ...adminTemplate };
};

export default function DeployBotPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const router = useRouter();
  const [selectedBot, setSelectedBot] = useState<any>(null);
  const [envVars, setEnvVars] = useState<Record<string, string>>({});
  const [step, setStep] = useState(1);

  const { data: marketData, isLoading } = useQuery({
    queryKey: ['marketplace-bots'],
    queryFn: () => marketplaceApi.getAll(),
    enabled: !!user,
  });

  const bots = extractApiList(marketData, 'bots');

  const deployMutation = useMutation({
    mutationFn: () => botsApi.deploy({
      marketplaceBotId: selectedBot?.id,
      envVars,
      sessionLink: envVars.SESSION_ID || envVars.session_id || '',
    }),
    onSuccess: () => {
      toast.success('Bot déployé avec succès !');
      router.push('/dashboard/bots');
    },
    onError: (e: any) => toast.error(e.message || 'Erreur lors du déploiement'),
  });

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <AddBotRequestBanner user={user} />

      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4 text-gray-400" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Déployer un Bot</h1>
          <p className="text-gray-400 text-sm mt-1">Choisissez un bot et configurez-le.</p>
        </div>
      </div>

      {/* Steps */}
      <div className="flex items-center gap-2">
        {['Choisir un bot', 'Configurer', 'Déployer'].map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`flex items-center gap-1.5 ${step > i ? 'text-purple-400' : i + 1 === step ? 'text-purple-400' : 'text-gray-500'}`}>
              <div className={`w-6 h-6 rounded-full text-xs flex items-center justify-center font-medium ${step > i + 1 ? 'bg-green-600 text-white' : i + 1 === step ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-500'}`}>
                {step > i + 1 ? '✓' : i + 1}
              </div>
              <span className="text-xs hidden sm:block">{s}</span>
            </div>
            {i < 2 && <div className="flex-1 h-px bg-white/10" />}
          </div>
        ))}
      </div>

      {/* Step 1: Choose bot */}
      {step === 1 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Choisissez un bot</h2>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
            </div>
          ) : bots.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              Aucun bot disponible sur la marketplace.
            </div>
          ) : (
            <div className="grid gap-3">
              {bots.map((bot: any) => (
                <button
                  key={bot.id}
                  onClick={() => {
                    setSelectedBot(bot);
                    setEnvVars({});
                  }}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${selectedBot?.id === bot.id ? 'border-purple-500 bg-purple-500/10' : 'border-white/5 bg-[#111118] hover:border-purple-500/30'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-center">
                      <Bot className="w-5 h-5 text-green-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{bot.name}</span>
                        {bot.version && <span className="text-xs bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded">{bot.version}</span>}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">{bot.description}</div>
                    </div>
                    <div className="text-xs text-purple-400">{bot.coinsPerDay || 10} Coins/j</div>
                  </div>
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => setStep(2)}
            disabled={!selectedBot}
            className="btn-primary w-full py-3"
          >
            Continuer
          </button>
        </motion.div>
      )}

      {/* Step 2: Configure */}
      {step === 2 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Configurer {selectedBot?.name}</h2>

          {(() => {
            const envTemplate = resolveEnvTemplate(selectedBot);
            const entries = Object.entries(envTemplate);

            if (entries.length === 0) {
              return (
                <div className="bg-gray-500/10 border border-gray-500/20 rounded-xl p-4 text-sm text-gray-400">
                  Aucune variable d&apos;environnement requise pour ce bot. Vous pouvez passer directement au deploiement.
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
                        {isSession && selectedBot?.sessionUrl && (
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
                          className="input-field w-full"
                          value={envVars[key] ?? cfg.default ?? ''}
                          onChange={e => setEnvVars(v => ({ ...v, [key]: e.target.value }))}
                        >
                          <option value="">Selectionner...</option>
                          {(cfg.options || []).map((o: string) => <option key={o} value={o}>{o}</option>)}
                        </select>
                      ) : cfg.type === 'textarea' ? (
                        <textarea
                          rows={3}
                          className="input-field w-full"
                          placeholder={cfg.placeholder || cfg.default || (cfg.required ? 'Requis' : 'Optionnel')}
                          value={envVars[key] ?? cfg.default ?? ''}
                          onChange={e => setEnvVars(v => ({ ...v, [key]: e.target.value }))}
                        />
                      ) : (
                        <input
                          type={cfg.type === 'password' ? 'password' : cfg.type === 'number' ? 'number' : 'text'}
                          className={`input-field w-full${isSession ? ' font-mono text-xs' : ''}`}
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

          <div className="bg-[#111118] border border-white/5 rounded-xl p-4">
            <h3 className="text-sm font-medium text-white mb-3">Résumé</h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Bot</span>
                <span className="text-white">{selectedBot?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Coût</span>
                <span className="text-purple-400">{selectedBot?.coinsPerDay || 10} Coins/jour</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="btn-secondary flex-1">Retour</button>
            <button
              onClick={() => {
                const envTemplate = resolveEnvTemplate(selectedBot);
                for (const [key, cfg] of Object.entries(envTemplate) as [string, any][]) {
                  if (cfg.required && !envVars[key]?.trim() && !cfg.default) {
                    toast.error(`${cfg.label || key} est requis`);
                    return;
                  }
                }
                setStep(3);
              }}
              className="btn-primary flex-1"
            >
              Continuer
            </button>
          </div>
        </motion.div>
      )}

      {/* Step 3: Deploy */}
      {step === 3 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Prêt à déployer</h2>
          <div className="bg-[#111118] border border-white/5 rounded-xl p-6 text-center">
            <div className="w-16 h-16 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">{selectedBot?.name}</h3>
            <p className="text-gray-400 text-sm">
              Votre bot sera déployé et démarré automatiquement.
            </p>
            <p className="text-purple-400 text-sm mt-2">
              Coût : {selectedBot?.coinsPerDay || 10} Coins/jour
            </p>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="btn-secondary flex-1">Retour</button>
            <button
              onClick={() => deployMutation.mutate()}
              disabled={deployMutation.isPending}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {deployMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Déployer le Bot
                </>
              )}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
