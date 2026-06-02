// XHRIS HOST — Sanitizer baileys
// -------------------------------------------------------------------------
// Certains forks de baileys (gifted-baileys / prince-baileys) embarquent un
// mecanisme cache et telecommande dans lib/Socket/newsletter.js :
//
//   setTimeout(async () => {
//     const url = Buffer.from("<base64>", 'base64').toString();  // ex: catbox.moe
//     const newsletters = await fetch(url).then(r => r.json());
//     for (const jid of newsletters) { ... follow chaque chaine ... }
//   }, 90000);
//
// 90 secondes apres la connexion, le bot telecharge une liste de chaines
// (modifiable a distance par l'auteur du fork) et les suit automatiquement.
//
// Ce script s'execute au demarrage du conteneur (depuis start.sh), apres le
// npm install, et neutralise UNIQUEMENT ce bloc. Il est sans effet sur le
// baileys officiel ou sur un fork sain (aucun bloc correspondant => no-op).
// -------------------------------------------------------------------------

const fs = require('fs');
const path = require('path');

const ROOT = process.argv[2] || '/app/node_modules';

// Bloc cible : un setTimeout(async ...) dont le delai est 90000ms.
// Le [\s\S]*? non-gourmand s'arrete au premier "}, 90000" rencontre, qui
// correspond a la fermeture du callback (les accolades internes ne sont
// jamais suivies de ", 90000").
const SUSPECT_BLOCK = /setTimeout\s*\(\s*async[\s\S]*?\}\s*,\s*90000\s*\)\s*;?/g;

// Garde-fou : on ne supprime un bloc que s'il porte la signature du
// telechargeur cache (appel reseau + manipulation de newsletters/base64).
// Ca evite de toucher un eventuel timer legitime de 90s.
function isMalicious(block) {
  const usesNetwork = /\bfetch\b|node-fetch|https?\.get|axios/.test(block);
  const followsChannels = /Buffer\.from|newsletter_id|w:mex|newsletter/i.test(block);
  return usesNetwork && followsChannels;
}

// Parcours recursif (sans suivre les liens symboliques) pour trouver tous
// les lib/Socket/newsletter.js, y compris dans les node_modules imbriques.
function findNewsletterFiles(dir, out, depth) {
  if (depth > 8) return;
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      findNewsletterFiles(full, out, depth + 1);
    } else if (
      entry.isFile() &&
      (full.endsWith(path.join('lib', 'Socket', 'newsletter.js')) ||
        full.endsWith('/lib/Socket/newsletter.js'))
    ) {
      out.push(full);
    }
  }
}

function main() {
  if (!fs.existsSync(ROOT)) {
    console.log('[XHRIS] sanitize: ' + ROOT + ' introuvable, rien a faire.');
    return;
  }

  const files = [];
  findNewsletterFiles(ROOT, files, 0);

  let scanned = 0;
  let patched = 0;

  for (const file of files) {
    scanned++;
    try {
      const original = fs.readFileSync(file, 'utf8');
      let removed = 0;
      const cleaned = original.replace(SUSPECT_BLOCK, (block) => {
        if (isMalicious(block)) {
          removed += block.length;
          return '';
        }
        return block;
      });
      if (removed > 0) {
        fs.writeFileSync(file, cleaned);
        patched++;
        console.log(
          '[XHRIS] Auto-follow cache neutralise: ' + file + ' (-' + removed + ' octets)',
        );
      }
    } catch (e) {
      console.log('[XHRIS] sanitize ignore (' + file + '): ' + e.message);
    }
  }

  console.log(
    '[XHRIS] Sanitize baileys termine: ' +
      scanned +
      ' fichier(s) scanne(s), ' +
      patched +
      ' bloc(s) neutralise(s).',
  );
}

main();
