'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTranslations } from 'next-intl';
import {
  Bot, Server, Coins, BarChart3, Shield, Zap,
  Globe, Users, Code, ArrowRight, Star, CheckCircle,
  ChevronRight, Sparkles, Play
} from 'lucide-react';

const features = [
  { icon: Bot, title: 'Bot WhatsApp Deploy', desc: 'Déployez vos bots WhatsApp en quelques clics. Session auto, reconnexion intelligente.', color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
  { icon: Server, title: 'Serveurs Cloud', desc: 'Créez et gérez vos serveurs VPS avec terminal live, gestionnaire de fichiers et monitoring.', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  { icon: Coins, title: 'Système de Coins', desc: '10 coins offerts à l\'inscription. Gagnez, transférez et gérez vos crédits facilement.', color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  { icon: BarChart3, title: 'Analytics Avancés', desc: 'Visualisez les performances de vos bots et serveurs en temps réel avec des graphiques détaillés.', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  { icon: Shield, title: 'Sécurité Premium', desc: 'Rate limiting, anti-spam, chiffrement de bout en bout, sessions sécurisées JWT.', color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  { icon: Globe, title: 'Marketplace de Bots', desc: 'Découvrez et déployez des bots depuis notre marketplace. Devenez développeur certifié.', color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
];

const plans = [
  { name: 'Starter', price: 'Gratuit', period: '', coins: '10 coins/jour', cpu: '1 vCPU', ram: '1 GB RAM', storage: '10 GB SSD', popular: false, color: 'border-white/10' },
  { name: 'Pro', price: '5€', period: '/mois', coins: '20 coins/jour', cpu: '2 vCPU', ram: '2 GB RAM', storage: '20 GB SSD', popular: true, color: 'border-purple-500' },
  { name: 'Advanced', price: '15€', period: '/mois', coins: '40 coins/jour', cpu: '4 vCPU', ram: '4 GB RAM', storage: '40 GB SSD', popular: false, color: 'border-white/10' },
  { name: 'Elite', price: '40€', period: '/mois', coins: '80 coins/jour', cpu: '8 vCPU', ram: '8 GB RAM', storage: '80 GB SSD', popular: false, color: 'border-white/10' },
];

const stats = [
  { value: '12,453', label: 'Utilisateurs actifs' },
  { value: '3,248', label: 'Bots déployés' },
  { value: '1,025', label: 'Serveurs actifs' },
  { value: '99.9%', label: 'Uptime garanti' },
];

const testimonials = [
  { name: 'DarkUser', role: 'Développeur Bot', avatar: 'DU', comment: 'XHRIS Host est incroyable ! Mes bots fonctionnent 24/7 sans interruption. Le panel est intuitif et les logs en temps réel sont parfaits.', stars: 5 },
  { name: 'NeonDev', role: 'Full Stack Developer', avatar: 'ND', comment: 'Le marketplace de bots est une révolution. J\'ai pu monétiser mes créations et toucher des milliers d\'utilisateurs facilement.', stars: 5 },
  { name: 'CodeMaster', role: 'Bot Creator', avatar: 'CM', comment: 'Le système de crédits est bien pensé. Le referral system m\'a permis de gagner des coins et garder mes bots actifs gratuitement.', stars: 5 },
];

export default function HomePage() {
  const { data: session } = useSession();
  const router = useRouter();

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg">
              <span className="text-white">XHRIS</span>{' '}
              <span className="text-purple-400">HOST</span>
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6 text-sm text-gray-400">
            <Link href="#features" className="hover:text-white transition-colors">Fonctionnalités</Link>
            <Link href="#pricing" className="hover:text-white transition-colors">Tarifs</Link>
            <Link href="/marketplace" onClick={handleMarketplaceClick} className="hover:text-white transition-colors">Marketplace</Link>
            <Link href="/docs" className="hover:text-white transition-colors">Docs</Link>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/auth/login" className="btn-secondary text-sm hidden sm:flex">
              Connexion
            </Link>
            <Link href="/auth/register" className="btn-primary text-sm flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              Commencer
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4">
        {/* Background mesh */}
        <div className="absolute inset-0 bg-mesh-dark opacity-60" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-purple-600/10 blur-[120px] rounded-full" />

        <div className="relative max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 rounded-full px-4 py-1.5 text-sm text-purple-400 mb-6">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Plateforme SaaS nouvelle génération</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
              <span className="text-white">Hébergez vos </span>
              <span className="gradient-text">Bots WhatsApp</span>
              <br />
              <span className="text-white">& Serveurs Cloud</span>
            </h1>

            <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Déployez, gérez et monétisez vos bots WhatsApp en quelques clics. 
              Panel tout-en-un avec terminal live, monitoring et marketplace.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/register" className="btn-primary text-base px-8 py-3.5 flex items-center justify-center gap-2 rounded-xl">
                <Zap className="w-5 h-5" />
                Démarrer gratuitement
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/docs" className="btn-secondary text-base px-8 py-3.5 flex items-center justify-center gap-2 rounded-xl">
                <Play className="w-4 h-4" />
                Voir la démo
              </Link>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20"
          >
            {stats.map((stat) => (
              <div key={stat.label} className="xhris-card text-center">
                <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                <div className="text-sm text-gray-400">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">
              Tout ce dont vous avez besoin
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Une plateforme complète pour héberger, gérer et faire évoluer vos projets.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                viewport={{ once: true }}
                className={`xhris-card-hover border ${feature.border} group`}
              >
                <div className={`w-10 h-10 ${feature.bg} ${feature.border} border rounded-lg flex items-center justify-center mb-4`}>
                  <feature.icon className={`w-5 h-5 ${feature.color}`} />
                </div>
                <h3 className="font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{feature.desc}</p>
                <div className={`mt-4 flex items-center gap-1 text-xs ${feature.color} opacity-0 group-hover:opacity-100 transition-opacity`}>
                  <span>En savoir plus</span>
                  <ChevronRight className="w-3 h-3" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-4 bg-[#080810]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Tarifs simples et transparents</h2>
            <p className="text-gray-400 text-lg">Commencez gratuitement. Évoluez selon vos besoins.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                viewport={{ once: true }}
                className={`relative bg-[#111118] border-2 ${plan.color} rounded-xl p-6 flex flex-col`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-600 text-white text-xs px-3 py-1 rounded-full font-medium">
                    Populaire
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="font-bold text-white text-lg mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-white">{plan.price}</span>
                    <span className="text-gray-400 text-sm">{plan.period}</span>
                  </div>
                </div>

                <div className="space-y-3 flex-1 mb-6">
                  {[plan.cpu, plan.ram, plan.storage, plan.coins].map((spec) => (
                    <div key={spec} className="flex items-center gap-2 text-sm text-gray-300">
                      <CheckCircle className="w-4 h-4 text-purple-400 flex-shrink-0" />
                      <span>{spec}</span>
                    </div>
                  ))}
                </div>

                <Link
                  href="/auth/register"
                  className={`w-full py-2.5 px-4 rounded-lg text-sm font-medium text-center transition-all ${
                    plan.popular
                      ? 'bg-purple-600 hover:bg-purple-700 text-white'
                      : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                  }`}
                >
                  {plan.price === 'Gratuit' ? 'Commencer' : 'Choisir ce plan'}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Ce que disent nos utilisateurs</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="xhris-card"
              >
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-4">"{t.comment}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-purple-600/30 rounded-full flex items-center justify-center text-xs font-bold text-purple-400">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">{t.name}</div>
                    <div className="text-xs text-gray-500">{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-4 bg-gradient-to-b from-transparent to-purple-950/20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-6">Prêt à démarrer ?</h2>
          <p className="text-gray-400 text-lg mb-8">
            Rejoignez plus de 12,000 développeurs qui font confiance à XHRIS Host. 
            Commencez gratuitement avec 10 coins offerts.
          </p>
          <Link href="/auth/register" className="btn-primary text-base px-10 py-4 rounded-xl inline-flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Créer mon compte gratuitement
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-lg text-white">XHRIS HOST</span>
              </div>
              <p className="text-sm text-gray-400 max-w-xs mb-4">
                La plateforme SaaS tout-en-un pour héberger vos bots WhatsApp et serveurs cloud.
              </p>
              <div className="flex gap-3">
                {['GitHub', 'Discord', 'Twitter'].map((social) => (
                  <a key={social} href="#" className="text-xs text-gray-500 hover:text-white transition-colors">{social}</a>
                ))}
              </div>
            </div>
            {[
              { title: 'Produit', links: ['Dashboard', 'Bots', 'Serveurs', 'Marketplace', 'Crédits'] },
              { title: 'Développeurs', links: ['Documentation', 'API Reference', 'Webhooks', 'SDK', 'Exemples'] },
              { title: 'Entreprise', links: ['À propos', 'Blog', 'Statut', 'Conditions', 'Confidentialité'] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-sm font-medium text-white mb-4">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-sm text-gray-400 hover:text-white transition-colors">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">© 2024 XHRIS HOST. Tous droits réservés.</p>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <a href="#" className="hover:text-white transition-colors">Conditions d'utilisation</a>
              <a href="#" className="hover:text-white transition-colors">Politique de confidentialité</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
