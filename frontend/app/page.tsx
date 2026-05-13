'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  Bot, Server, Coins, BarChart3, Shield, Zap, Globe,
  ArrowRight, Star, CheckCircle,
  ChevronRight, Sparkles, Play
} from 'lucide-react';

// ── Translations ─────────────────────────────────────────────────
const T = {
  fr: {
    nav: { features: 'Fonctionnalités', pricing: 'Tarifs', marketplace: 'Marketplace', login: 'Connexion', start: 'Commencer' },
    hero: {
      badge: 'Plateforme SaaS nouvelle génération',
      title1: 'Hébergez vos',
      title2: 'Bots WhatsApp',
      title3: '& Serveurs Cloud',
      sub: 'Déployez, gérez et monétisez vos bots WhatsApp en quelques clics. Panel tout-en-un avec terminal live, monitoring et marketplace.',
      cta: 'Démarrer gratuitement',
      demo: 'Voir la démo',
    },
    stats: [
      { value: '12,453', label: 'Utilisateurs actifs' },
      { value: '3,248', label: 'Bots déployés' },
      { value: '1,025', label: 'Serveurs actifs' },
      { value: '99.9%', label: 'Uptime garanti' },
    ],
    featuresTitle: 'Tout ce dont vous avez besoin',
    featuresSub: 'Une plateforme complète pour héberger, gérer et faire évoluer vos projets.',
    learnMore: 'En savoir plus',
    pricingTitle: 'Tarifs simples et transparents',
    pricingSub: 'Commencez gratuitement. Évoluez selon vos besoins.',
    popular: 'Populaire',
    choosePlan: 'Choisir ce plan',
    startFree: 'Commencer',
    testiTitle: 'Ce que disent nos utilisateurs',
    ctaTitle: 'Prêt à démarrer ?',
    ctaSub: 'Rejoignez plus de 12,000 développeurs qui font confiance à XHRIS Host. Commencez gratuitement avec 10 coins offerts.',
    ctaBtn: 'Créer mon compte gratuitement',
    footer: {
      desc: 'La plateforme SaaS tout-en-un pour héberger vos bots WhatsApp et serveurs cloud.',
      product: 'Produit',
      community: 'Communauté',
      company: 'Entreprise',
      developer: 'Développeur',
      portfolio: 'Portfolio',
      rights: '© 2026 XHRIS HOST. Tous droits réservés.',
      terms: "Conditions d'utilisation",
      privacy: 'Confidentialité',
      contact: 'Contact',
    },
  },
  en: {
    nav: { features: 'Features', pricing: 'Pricing', marketplace: 'Marketplace', login: 'Login', start: 'Get Started' },
    hero: {
      badge: 'Next-generation SaaS Platform',
      title1: 'Host your',
      title2: 'WhatsApp Bots',
      title3: '& Cloud Servers',
      sub: 'Deploy, manage and monetize your WhatsApp bots in a few clicks. All-in-one panel with live terminal, monitoring and marketplace.',
      cta: 'Start for free',
      demo: 'Watch demo',
    },
    stats: [
      { value: '12,453', label: 'Active users' },
      { value: '3,248', label: 'Bots deployed' },
      { value: '1,025', label: 'Active servers' },
      { value: '99.9%', label: 'Uptime guarantee' },
    ],
    featuresTitle: 'Everything you need',
    featuresSub: 'A complete platform to host, manage and scale your projects.',
    learnMore: 'Learn more',
    pricingTitle: 'Simple, transparent pricing',
    pricingSub: 'Start for free. Scale as you grow.',
    popular: 'Popular',
    choosePlan: 'Choose this plan',
    startFree: 'Get started',
    testiTitle: 'What our users say',
    ctaTitle: 'Ready to get started?',
    ctaSub: 'Join more than 12,000 developers who trust XHRIS Host. Start free with 10 coins offered.',
    ctaBtn: 'Create my free account',
    footer: {
      desc: 'The all-in-one SaaS platform for hosting WhatsApp bots and cloud servers.',
      product: 'Product',
      community: 'Community',
      company: 'Company',
      developer: 'Developer',
      portfolio: 'Portfolio',
      rights: '© 2026 XHRIS HOST. All rights reserved.',
      terms: 'Terms of use',
      privacy: 'Privacy policy',
      contact: 'Contact',
    },
  },
};

type Lang = 'fr' | 'en';

function getFeatures(lang: Lang) {
  const data = {
    fr: [
      { icon: Bot, title: 'Bot WhatsApp Deploy', desc: 'Déployez vos bots WhatsApp en quelques clics. Session auto, reconnexion intelligente.', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
      { icon: Server, title: 'Serveurs Cloud', desc: 'Créez et gérez vos serveurs VPS avec terminal live, gestionnaire de fichiers et monitoring.', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
      { icon: Coins, title: 'Système de Coins', desc: '10 coins offerts à l\'inscription. Gagnez, transférez et gérez vos crédits facilement.', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
      { icon: BarChart3, title: 'Analytics Avancés', desc: 'Visualisez les performances de vos bots et serveurs en temps réel avec des graphiques détaillés.', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
      { icon: Shield, title: 'Sécurité Premium', desc: 'Rate limiting, anti-spam, chiffrement de bout en bout, sessions sécurisées JWT.', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
      { icon: Globe, title: 'Marketplace de Bots', desc: 'Découvrez et déployez des bots depuis notre marketplace. Devenez développeur certifié.', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
    ],
    en: [
      { icon: Bot, title: 'WhatsApp Bot Deploy', desc: 'Deploy your WhatsApp bots in a few clicks. Auto session, smart reconnection.', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
      { icon: Server, title: 'Cloud Servers', desc: 'Create and manage VPS servers with live terminal, file manager and monitoring.', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
      { icon: Coins, title: 'Coins System', desc: '10 coins offered at registration. Earn, transfer and manage your credits easily.', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
      { icon: BarChart3, title: 'Advanced Analytics', desc: 'Visualize the performance of your bots and servers in real time with detailed charts.', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
      { icon: Shield, title: 'Premium Security', desc: 'Rate limiting, anti-spam, end-to-end encryption, secure JWT sessions.', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
      { icon: Globe, title: 'Bot Marketplace', desc: 'Discover and deploy bots from our marketplace. Become a certified developer.', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
    ],
  };
  return data[lang];
}

const plans = [
  { name: 'Starter', price: 'Gratuit', priceEn: 'Free', period: '', coins: '10 coins/jour', coinsEn: '10 coins/day', cpu: '1 vCPU', ram: '1 GB RAM', storage: '10 GB SSD', popular: false, color: 'border-white/10' },
  { name: 'Pro', price: '5€', priceEn: '5€', period: '/mois', periodEn: '/mo', coins: '20 coins/jour', coinsEn: '20 coins/day', cpu: '2 vCPU', ram: '2 GB RAM', storage: '20 GB SSD', popular: true, color: 'border-purple-500' },
  { name: 'Advanced', price: '15€', priceEn: '15€', period: '/mois', periodEn: '/mo', coins: '40 coins/jour', coinsEn: '40 coins/day', cpu: '4 vCPU', ram: '4 GB RAM', storage: '40 GB SSD', popular: false, color: 'border-white/10' },
  { name: 'Elite', price: '40€', priceEn: '40€', period: '/mois', periodEn: '/mo', coins: '80 coins/jour', coinsEn: '80 coins/day', cpu: '8 vCPU', ram: '8 GB RAM', storage: '80 GB SSD', popular: false, color: 'border-white/10' },
];

const testimonials = {
  fr: [
    { name: 'DarkUser', role: 'Développeur Bot', avatar: 'DU', comment: 'XHRIS Host est incroyable ! Mes bots fonctionnent 24/7 sans interruption. Le panel est intuitif et les logs en temps réel sont parfaits.', stars: 5 },
    { name: 'NeonDev', role: 'Full Stack Developer', avatar: 'ND', comment: 'Le marketplace de bots est une révolution. J\'ai pu monétiser mes créations et toucher des milliers d\'utilisateurs facilement.', stars: 5 },
    { name: 'CodeMaster', role: 'Bot Creator', avatar: 'CM', comment: 'Le système de crédits est bien pensé. Le referral system m\'a permis de gagner des coins et garder mes bots actifs gratuitement.', stars: 5 },
  ],
  en: [
    { name: 'DarkUser', role: 'Bot Developer', avatar: 'DU', comment: 'XHRIS Host is incredible! My bots run 24/7 without interruption. The panel is intuitive and real-time logs are perfect.', stars: 5 },
    { name: 'NeonDev', role: 'Full Stack Developer', avatar: 'ND', comment: 'The bot marketplace is a revolution. I was able to monetize my creations and reach thousands of users easily.', stars: 5 },
    { name: 'CodeMaster', role: 'Bot Creator', avatar: 'CM', comment: 'The credit system is well thought out. The referral system allowed me to earn coins and keep my bots active for free.', stars: 5 },
  ],
};

export default function HomePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [lang, setLang] = useState<Lang>('fr');

  useEffect(() => {
    const stored = localStorage.getItem('xhris_language') as Lang | null;
    if (stored === 'fr' || stored === 'en') setLang(stored);
  }, []);

  const toggleLang = () => {
    const next: Lang = lang === 'fr' ? 'en' : 'fr';
    setLang(next);
    localStorage.setItem('xhris_language', next);
  };

  const t = T[lang];
  const features = getFeatures(lang);
  const testis = testimonials[lang];

  const handleMarketplaceClick = (e: React.MouseEvent) => {
    if (!session) {
      e.preventDefault();
      router.push('/auth/login?callbackUrl=%2Fmarketplace');
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0F] overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-dark border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-purple-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-base">
              <span className="text-white">XHRIS</span>{' '}
              <span className="text-purple-400">HOST</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-5 text-xs text-gray-400">
            <Link href="#features" className="hover:text-white transition-colors">{t.nav.features}</Link>
            <Link href="#pricing" className="hover:text-white transition-colors">{t.nav.pricing}</Link>
            <Link href="/marketplace" onClick={handleMarketplaceClick} className="hover:text-white transition-colors">{t.nav.marketplace}</Link>
          </div>

          <div className="flex items-center gap-2">
            {/* Language toggle */}
            <button
              onClick={toggleLang}
              className="flex items-center justify-center w-8 h-8 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
              title={lang === 'fr' ? 'Switch to English' : 'Passer en Français'}
            >
              <span className="text-xs font-bold text-gray-300">{lang === 'fr' ? 'FR' : 'EN'}</span>
            </button>
            <Link href="/auth/login" className="btn-secondary text-xs hidden sm:flex px-3 py-1.5">
              {t.nav.login}
            </Link>
            <Link href="/auth/register" className="btn-primary text-xs flex items-center gap-1 px-3 py-1.5">
              <Sparkles className="w-3 h-3" />
              {t.nav.start}
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 pb-14 px-4">
        <div className="absolute inset-0 bg-mesh-dark opacity-60" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-purple-600/10 blur-[120px] rounded-full" />

        <div className="relative max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-full px-3 py-1 text-xs text-purple-400 mb-5">
              <Sparkles className="w-3 h-3" />
              <span>{t.hero.badge}</span>
            </div>

            <h1 className="text-4xl md:text-6xl font-bold mb-5 leading-tight">
              <span className="text-white">{t.hero.title1} </span>
              <span className="gradient-text">{t.hero.title2}</span>
              <br />
              <span className="text-white">{t.hero.title3}</span>
            </h1>

            <p className="text-base text-gray-400 mb-8 max-w-xl mx-auto leading-relaxed">
              {t.hero.sub}
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/auth/register" className="btn-primary text-sm px-7 py-3 flex items-center justify-center gap-2 rounded-xl">
                <Zap className="w-4 h-4" />
                {t.hero.cta}
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <Link href="/docs" className="btn-secondary text-sm px-7 py-3 flex items-center justify-center gap-2 rounded-xl">
                <Play className="w-3.5 h-3.5" />
                {t.hero.demo}
              </Link>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-14"
          >
            {t.stats.map((stat) => (
              <div key={stat.label} className="xhris-card text-center py-4">
                <div className="text-2xl font-bold text-white mb-0.5">{stat.value}</div>
                <div className="text-xs text-gray-400">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-3">{t.featuresTitle}</h2>
            <p className="text-gray-400 text-sm max-w-xl mx-auto">{t.featuresSub}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                viewport={{ once: true }}
                className={`xhris-card-hover border ${feature.border} group`}
              >
                <div className={`w-9 h-9 ${feature.bg} ${feature.border} border rounded-lg flex items-center justify-center mb-3`}>
                  <feature.icon className={`w-4 h-4 ${feature.color}`} />
                </div>
                <h3 className="font-semibold text-white text-sm mb-1.5">{feature.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{feature.desc}</p>
                <div className={`mt-3 flex items-center gap-1 text-xs ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity`}>
                  <span>{t.learnMore}</span>
                  <ChevronRight className="w-3 h-3" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16 px-4 bg-[#080810]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-3">{t.pricingTitle}</h2>
            <p className="text-gray-400 text-sm">{t.pricingSub}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                viewport={{ once: true }}
                className={`relative bg-[#111118] border-2 ${plan.color} rounded-xl p-5 flex flex-col`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs px-3 py-0.5 rounded-full font-medium">
                    {t.popular}
                  </div>
                )}
                <div className="mb-5">
                  <h3 className="font-bold text-white text-base mb-1.5">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-white">{lang === 'fr' ? plan.price : plan.priceEn}</span>
                    <span className="text-gray-400 text-xs">{lang === 'fr' ? plan.period : plan.periodEn}</span>
                  </div>
                </div>

                <div className="space-y-2 flex-1 mb-5">
                  {[plan.cpu, plan.ram, plan.storage, lang === 'fr' ? plan.coins : plan.coinsEn].map((spec) => (
                    <div key={spec} className="flex items-center gap-2 text-xs text-gray-300">
                      <CheckCircle className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                      <span>{spec}</span>
                    </div>
                  ))}
                </div>

                <Link
                  href="/auth/register"
                  className={`w-full py-2 px-4 rounded-lg text-xs font-medium text-center transition-all ${
                    plan.popular
                      ? 'bg-purple-600 hover:bg-purple-700 text-white'
                      : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                  }`}
                >
                  {plan.price === 'Gratuit' || plan.priceEn === 'Free' ? t.startFree : t.choosePlan}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-white mb-3">{t.testiTitle}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {testis.map((testi, i) => (
              <motion.div
                key={testi.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="xhris-card"
              >
                <div className="flex items-center gap-1 mb-3">
                  {Array.from({ length: testi.stars }).map((_, j) => (
                    <Star key={j} className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-300 text-xs leading-relaxed mb-3">"{testi.comment}"</p>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-purple-600/30 rounded-full flex items-center justify-center text-xs font-bold text-purple-400">
                    {testi.avatar}
                  </div>
                  <div>
                    <div className="text-xs font-medium text-white">{testi.name}</div>
                    <div className="text-xs text-gray-500">{testi.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-gradient-to-b from-transparent to-purple-950/20">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">{t.ctaTitle}</h2>
          <p className="text-gray-400 text-sm mb-6">{t.ctaSub}</p>
          <Link href="/auth/register" className="btn-primary text-sm px-8 py-3 rounded-xl inline-flex items-center gap-2">
            <Zap className="w-4 h-4" />
            {t.ctaBtn}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

    </div>
  );
}
