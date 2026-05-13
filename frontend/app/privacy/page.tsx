'use client';

import Link from 'next/link';
import { Zap } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0F]">
      <nav className="border-b border-white/5 px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-white">XHRIS <span className="text-purple-400">HOST</span></span>
        </Link>
        <Link href="/auth/login" className="btn-primary text-sm">Se connecter</Link>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-4xl font-bold text-white mb-2">Politique de confidentialité</h1>
        <p className="text-gray-400 mb-10">Dernière mise à jour : janvier 2025</p>

        <div className="space-y-8 text-gray-300 leading-relaxed">
          {[
            {
              title: '1. Données collectées',
              content: 'Nous collectons les données que vous nous fournissez lors de votre inscription (nom, email, mot de passe chiffré), ainsi que les données d\'utilisation du service (bots déployés, serveurs créés, transactions de coins).',
            },
            {
              title: '2. Utilisation des données',
              content: 'Vos données sont utilisées pour fournir le service, améliorer l\'expérience utilisateur, envoyer des notifications importantes sur votre compte, et assurer la sécurité de la plateforme.',
            },
            {
              title: '3. Partage des données',
              content: 'Nous ne vendons pas vos données personnelles. Nous pouvons partager des données avec des prestataires de services nécessaires au fonctionnement (hébergement, paiement), toujours dans le respect de la confidentialité.',
            },
            {
              title: '4. Sécurité',
              content: 'Nous utilisons des méthodes de chiffrement standard pour protéger vos données. Les mots de passe sont hachés et jamais stockés en clair. Les sessions sont sécurisées par des tokens JWT.',
            },
            {
              title: '5. Cookies',
              content: 'Nous utilisons des cookies de session pour maintenir votre connexion. Aucun cookie de tracking tiers n\'est utilisé.',
            },
            {
              title: '6. Vos droits',
              content: 'Vous avez le droit d\'accéder, modifier ou supprimer vos données personnelles à tout moment depuis les paramètres de votre compte ou en nous contactant.',
            },
            {
              title: '7. Contact',
              content: 'Pour toute question relative à la confidentialité, contactez-nous via la page Contact.',
            },
          ].map((section) => (
            <div key={section.title}>
              <h2 className="text-xl font-semibold text-white mb-3">{section.title}</h2>
              <p>{section.content}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex gap-4 text-sm text-gray-500">
          <Link href="/terms" className="hover:text-white transition-colors">Conditions d&apos;utilisation</Link>
          <Link href="/contact" className="hover:text-white transition-colors">Nous contacter</Link>
        </div>
      </div>
    </div>
  );
}
