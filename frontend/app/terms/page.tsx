'use client';

import Link from 'next/link';
import { Zap } from 'lucide-react';

export default function TermsPage() {
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
        <h1 className="text-4xl font-bold text-white mb-2">Conditions d&apos;utilisation</h1>
        <p className="text-gray-400 mb-10">Dernière mise à jour : janvier 2025</p>

        <div className="space-y-8 text-gray-300 leading-relaxed">
          {[
            {
              title: '1. Acceptation des conditions',
              content: 'En utilisant XHRIS Host, vous acceptez d\'être lié par ces conditions. Si vous n\'acceptez pas ces conditions, veuillez ne pas utiliser notre service.',
            },
            {
              title: '2. Description du service',
              content: 'XHRIS Host est une plateforme SaaS permettant de déployer et gérer des bots WhatsApp, des serveurs cloud, et d\'accéder à un marketplace de bots. Le service est fourni "en l\'état".',
            },
            {
              title: '3. Utilisation acceptable',
              content: 'Vous vous engagez à utiliser le service conformément aux lois applicables et à ne pas l\'utiliser à des fins illégales, frauduleuses ou nuisibles. Toute utilisation abusive entraînera la suspension du compte.',
            },
            {
              title: '4. Système de coins',
              content: 'Les coins XHRIS Host sont une monnaie virtuelle sans valeur monétaire réelle. Ils sont utilisés pour financer les ressources de la plateforme. Les coins achetés ne sont pas remboursables.',
            },
            {
              title: '5. Confidentialité des données',
              content: 'Nous collectons et traitons vos données conformément à notre Politique de confidentialité. Vous conservez la propriété de vos données.',
            },
            {
              title: '6. Limitation de responsabilité',
              content: 'XHRIS Host ne pourra être tenu responsable des dommages indirects, accessoires ou consécutifs découlant de l\'utilisation du service.',
            },
            {
              title: '7. Modifications',
              content: 'Nous nous réservons le droit de modifier ces conditions à tout moment. Les modifications entrent en vigueur dès leur publication.',
            },
          ].map((section) => (
            <div key={section.title}>
              <h2 className="text-xl font-semibold text-white mb-3">{section.title}</h2>
              <p>{section.content}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 flex gap-4 text-sm text-gray-500">
          <Link href="/privacy" className="hover:text-white transition-colors">Politique de confidentialité</Link>
          <Link href="/contact" className="hover:text-white transition-colors">Nous contacter</Link>
        </div>
      </div>
    </div>
  );
}
