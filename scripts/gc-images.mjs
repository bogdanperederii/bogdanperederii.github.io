import fs from 'node:fs';
import path from 'node:path';

const projectsDir = path.join(process.cwd(), 'src', 'content', 'projects');
const publicProjectsDir = path.join(process.cwd(), 'public', 'images', 'projects');

if (!fs.existsSync(publicProjectsDir)) {
  console.error('❌ Priečinok public/images/projects neexistuje!');
  process.exit(1);
}

console.log('🧹 Spúšťam Garbage Collector pre nepoužité fotky...\n');

// 1. Zozbierame všetky použité cesty/súbory zo všetkých MDX súborov
const usedFiles = new Set();
const mdxFiles = fs.readdirSync(projectsDir).filter(f => f.endsWith('.mdx') || f.endsWith('.md'));

for (const file of mdxFiles) {
  const filePath = path.join(projectsDir, file);
  const content = fs.readFileSync(filePath, 'utf-8');

  // Hľadáme akékoľvek cesty začínajúce na /images/projects/
  const matches = content.match(/\/images\/projects\/[^\s"'()]+/g);
  if (matches) {
    matches.forEach(m => {
      // Normalizujeme cestu na lokálny disk (napr. /images/projects/kuko/abc.webp -> public/images/projects/kuko/abc.webp)
      const relativePart = m.replace(/^\/images\/projects\//, '');
      usedFiles.add(relativePart.toLowerCase());
    });
  }
}

console.log(`✓ V MDX súboroch je celkovo odkazovaných ${usedFiles.size} unikátnych obrázkov.\n`);

// 2. Prejdeme fyzický disk v public/images/projects/ a zmažeme nepotrebné
let deletedCount = 0;
let freedSpaceBytes = 0;

function cleanFolder(currentDir, relativePath = '') {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(currentDir, entry.name);
    const relPath = path.join(relativePath, entry.name).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      cleanFolder(fullPath, relPath);
      // Ak je po vymazaní priečinok prázdny, môžeme ho zmazať
      try {
        if (fs.readdirSync(fullPath).length === 0) {
          fs.rmdirSync(fullPath);
          console.log(`📁 Zmazaný prázdny priečinok: ${relPath}`);
        }
      } catch (e) {}
    } else if (entry.isFile()) {
      // Porovnáme s množinou použitých (ignorujeme veľkosť písmen)
      if (!usedFiles.has(relPath.toLowerCase())) {
        const stats = fs.statSync(fullPath);
        freedSpaceBytes += stats.size;
        fs.unlinkSync(fullPath);
        deletedCount++;
        console.log(`🗑️ Zmazaná nepoužitá fotka: ${relPath}`);
      }
    }
  }
}

cleanFolder(publicProjectsDir);

const freedMB = (freedSpaceBytes / (1024 * 1024)).toFixed(2);

console.log('\n=======================================');
console.log(`🎉 UPPRATANÉ!`);
console.log(`🗑️ Zmazaných nepoužitých súborov: ${deletedCount}`);
console.log(`💾 Uvoľnené miesto na disku: ${freedMB} MB`);
console.log('=======================================');