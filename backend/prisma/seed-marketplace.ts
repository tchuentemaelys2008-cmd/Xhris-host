import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.findFirst({
    where: { role: { in: ['ADMIN', 'SUPERADMIN'] as any } },
  });
  if (!admin) {
    console.log("Aucun admin trouvé — créez un compte admin d'abord");
    return;
  }

  let devProfile = await prisma.developerProfile.findUnique({ where: { userId: admin.id } });
  if (!devProfile) {
    devProfile = await prisma.developerProfile.create({
      data: { userId: admin.id, displayName: 'XHRIS Team', verified: true },
    });
  }

  const bots = [
    {
      name: 'FLAVOR MD',
      description: 'Bot WhatsApp polyvalent avec téléchargement de médias, IA, stickers, et plus de 200 commandes.',
      platform: 'WHATSAPP',
      tags: ['whatsapp', 'media', 'ai', 'stickers'],
      status: 'PUBLISHED',
      githubUrl: 'https://github.com/flavormd/flavor-md',
      sessionUrl: 'https://flavor-session.xhrishost.site',
      envTemplate: {
        BOT_NAME: { label: 'Nom du bot', required: true, default: 'FLAVOR MD', type: 'text' },
        SESSION_ID: { label: 'Session ID', required: true, type: 'text', description: "Obtenez-le via le bouton 'Obtenir la Session'" },
        OWNER_NUMBER: { label: 'Numéro propriétaire', required: true, type: 'text', placeholder: '237xxxxxxxxx' },
        PREFIX: { label: 'Préfixe des commandes', required: false, default: '.', type: 'text' },
        AUTO_READ: { label: 'Lecture automatique', required: false, default: 'true', type: 'select', options: ['true', 'false'] },
        SUDO: { label: 'Numéros sudo (séparés par ,)', required: false, type: 'text' },
      },
      coinsPerDay: 10,
    },
    {
      name: 'GURU BOT',
      description: 'Bot WhatsApp avancé avec GPT-4, génération d\'images, et outils de groupe.',
      platform: 'WHATSAPP',
      tags: ['whatsapp', 'gpt', 'ai', 'group-tools'],
      status: 'PUBLISHED',
      githubUrl: 'https://github.com/gurubot/guru-bot',
      sessionUrl: 'https://guru-session.xhrishost.site',
      envTemplate: {
        BOT_NAME: { label: 'Nom du bot', required: true, default: 'GURU BOT', type: 'text' },
        SESSION_ID: { label: 'Session ID', required: true, type: 'text' },
        OWNER_NUMBER: { label: 'Numéro propriétaire', required: true, type: 'text', placeholder: '237xxxxxxxxx' },
        OPENAI_KEY: { label: 'Clé API OpenAI', required: false, type: 'password' },
        PREFIX: { label: 'Préfixe', required: false, default: '!', type: 'text' },
        PACK_NAME: { label: 'Nom du pack stickers', required: false, default: 'GURU', type: 'text' },
      },
      coinsPerDay: 10,
    },
  ];

  for (const bot of bots) {
    const existing = await prisma.marketplaceBot.findFirst({ where: { name: bot.name } });
    if (!existing) {
      await prisma.marketplaceBot.create({
        data: {
          ...bot,
          platform: bot.platform as any,
          status: bot.status as any,
          envTemplate: bot.envTemplate,
          developerId: devProfile.id,
        },
      });
      console.log(`✅ Bot "${bot.name}" créé`);
    } else {
      console.log(`⏭️  Bot "${bot.name}" existe déjà`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
