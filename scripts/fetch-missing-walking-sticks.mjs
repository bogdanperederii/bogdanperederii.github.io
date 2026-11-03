import fs from 'node:fs';
import path from 'node:path';

const searchRoots = ['D:\\', 'E:\\', 'F:\\', 'I:\\'];
const targetSlug = 'walking-sticks';
const mdxPath = path.join(process.cwd(), 'src', 'content', 'projects', `${targetSlug}.mdx`);
const targetDir = path.join(process.cwd(), 'public', 'images', 'projects', targetSlug);

if (!fs.existsSync(mdxPath)) {
  console.error(`❌ MDX súbor pre ${targetSlug} nebol nájdený!`);
  process.exit(1);
}

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// 1. Prečítame MDX a vyťaháme názvy všetkých súborov, ktoré projekt vyžaduje
const content = fs.readFileSync(mdxPath, 'utf-8');
const matches = content.match(/\/images\/projects\/[^\s"'()]+\/([^\/\s"'()]+\.(webp|png|jpe?g))/gi);

const requiredFilenames = new Set();
if (matches) {
  matches.forEach(m => {
    const filename = path.basename(m);
    requiredFilenames.add(filename.toLowerCase());
  });
}

console.log(`📋 Projekt '${targetSlug}' vyžaduje ${requiredFilenames.size} fotiek:`, Array.from(requiredFilenames));

// 2. Prehľadáme disky a vytvoríme index všetkých fotiek
console.log('🔍 Prehľadávam disky a hľadám chýbajúce súbory...');
const fileIndex = new Map();

function scanDisks(dir) {
  try {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (!['$RECYCLE.BIN', 'System Volume Information', 'node_modules', 'Windows', 'Program Files'].includes(entry.name)) {
          scanDisks(fullPath);
        }
      } else if (entry.isFile()) {
        const lowerName = entry.name.toLowerCase();
        if (requiredFilenames.has(lowerName)) {
          // Uložíme cestu (preferujeme web_optimized, ak existuje)
          if (!fileIndex.has(lowerName) || fullPath.toLowerCase().includes('web_optimized')) {
            fileIndex.set(lowerName, fullPath);
          }
        }
      }
    }
  } catch (err) {}
}

for (const root of searchRoots) {
  if (fs.existsSync(root)) {
    scanDisks(root);
  }
}

// 3. Skopírujeme chýbajúce súbory do cieľového priečinka
let copied = 0;
let missing = 0;

for (const filename of requiredFilenames) {
  const destPath = path.join(targetDir, filename);

  if (fs.existsSync(destPath)) {
    console.log(`  - ${filename} už v priečinku existuje.`);
    continue;
  }

  if (fileIndex.has(filename)) {
    const srcPath = fileIndex.get(filename);
    fs.copyFileSync(srcPath, destPath);
    console.log(`  ✓ Skopírované: ${filename} (z ${srcPath})`);
    copied++;
  } else {
    console.log(`  ❌ NENÁJDENÉ NA DISKOCH: ${filename}`);
    missing++;
  }
}

console.log('\n=======================================');
console.log(`🎉 TEST HOTOVÝ PRE: ${targetSlug}`);
console.log(`📥 Úspešne skopírovaných: ${copied}`);
console.log(`❌ Úplne chýbajúcich na diskoch: ${missing}`);
console.log('=======================================');