import fs from 'node:fs';
import path from 'node:path';

// Koreňové priečinky projektov na disku D: (doplň ďalšie zložky, ak máš projekty aj inde)
const sourceDirsOnD = [
  'D:\\01_2026_Projects',
  'D:\\Projects',
  'D:\\'
];

const projectsDir = path.join(process.cwd(), 'src', 'content', 'projects');
const publicDir = path.join(process.cwd(), 'public', 'images', 'projects');

// 1. KROK: Rekurzívne prehľadanie disku D: a vytvorenie indexu fotiek
console.log('🔍 Hľadám všetky optimalizované fotky na disku D: ...');
const fileIndex = new Map(); // Mapa: "nazov-suboru.webp" => "plna_cesta_na_D"

function scanForWebp(dir) {
  try {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Prehľadávame podpriečinky, vynechávame systémové
        if (!['$RECYCLE.BIN', 'System Volume Information', 'node_modules'].includes(entry.name)) {
          scanForWebp(fullPath);
        }
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.webp')) {
        // Uložíme súbor do mapy (ak je v priečinku web_optimized, má najvyššiu prioritu)
        const isOptimized = fullPath.toLowerCase().includes('web_optimized');
        if (!fileIndex.has(entry.name.toLowerCase()) || isOptimized) {
          fileIndex.set(entry.name.toLowerCase(), fullPath);
        }
      }
    }
  } catch (err) {
    // Ignorujeme priečinky s odmietnutým prístupom
  }
}

// Spustíme skenovanie na disku D:
for (const dir of sourceDirsOnD) {
  if (fs.existsSync(dir)) {
    console.log(` -> Prehľadávam ${dir}...`);
    scanForWebp(dir);
    break; // Ak našiel hlavnú zložku 01_2026_Projects, prehľadá ju
  }
}

console.log(`✓ Nájdených ${fileIndex.size} unikátnych WebP fotiek na disku D:.\n`);

// 2. KROK: Spracovanie MDX projektov
const mdxFiles = fs.readdirSync(projectsDir).filter(f => f.endsWith('.mdx') || f.endsWith('.md'));
let copiedCount = 0;
let updatedLinksCount = 0;

for (const file of mdxFiles) {
  const slug = path.basename(file, path.extname(file));
  const filePath = path.join(projectsDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  // Cieľový priečinok pre tento projekt
  const targetProjectDir = path.join(publicDir, slug);
  if (!fs.existsSync(targetProjectDir)) {
    fs.mkdirSync(targetProjectDir, { recursive: true });
  }

  // Hľadáme všetky ImgBB linky
  const imgbbRegex = /https?:\/\/i\.ibb\.co\/[^\/\s"']+\/([^\/\s"'\)]+)/g;
  let fileWasChanged = false;

  content = content.replace(imgbbRegex, (fullMatch, filename) => {
    const cleanFilename = filename.toLowerCase();
    const targetFilePath = path.join(targetProjectDir, filename);

    // Ak fotku nájdeme na disku D: a ešte nie je v projekte, skopírujeme ju
    if (fileIndex.has(cleanFilename)) {
      const sourcePath = fileIndex.get(cleanFilename);
      if (!fs.existsSync(targetFilePath)) {
        fs.copyFileSync(sourcePath, targetFilePath);
        copiedCount++;
      }
    }

    updatedLinksCount++;
    fileWasChanged = true;
    return `/images/projects/${slug}/${filename}`;
  });

  if (fileWasChanged) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✓ [${slug}] Spracované a prepísané linky.`);
  }
}

console.log('\n=======================================');
console.log(`🎉 HOTOVO ZA PÁR SEKÚND!`);
console.log(`📸 Skopírovaných nových fotiek do public/: ${copiedCount}`);
console.log(`🔗 Prepísaných liniek v .mdx súboroch: ${updatedLinksCount}`);
console.log('=======================================');