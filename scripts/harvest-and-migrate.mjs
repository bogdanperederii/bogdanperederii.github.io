import fs from 'node:fs';
import path from 'node:path';

// Automaticky prejdeme všetky disky a možné koreňové zložky s projektmi
const searchRoots = [
  'D:\\01_2026_Projects', 'D:\\Projects', 'D:\\',
  'E:\\01_2026_Projects', 'E:\\Projects', 'E:\\',
  'F:\\01_2026_Projects', 'F:\\Projects', 'F:\\',
  'I:\\01_2026_Projects', 'I:\\Projects', 'I:\\'
];

const projectsDir = path.join(process.cwd(), 'src', 'content', 'projects');
const publicDir = path.join(process.cwd(), 'public', 'images', 'projects');

console.log('🔍 Hľadám všetky optimalizované fotky na pripojených diskoch (D, E, F, I) ...');
const fileIndex = new Map(); // Mapa: "nazov-suboru.webp" => "plna_cesta"

function scanForWebp(dir) {
  try {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (!['$RECYCLE.BIN', 'System Volume Information', 'node_modules', 'Windows', 'Program Files', 'Program Files (x86)'].includes(entry.name)) {
          scanForWebp(fullPath);
        }
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.webp')) {
        const isOptimized = fullPath.toLowerCase().includes('web_optimized');
        // Uprednostníme súbor z priečinka web_optimized, ak už existuje duplikát
        if (!fileIndex.has(entry.name.toLowerCase()) || isOptimized) {
          fileIndex.set(entry.name.toLowerCase(), fullPath);
        }
      }
    }
  } catch (err) {
    // Ignorujeme zložky bez oprávnenia
  }
}

// Spustíme skenovanie na všetkých diskoch
for (const root of searchRoots) {
  if (fs.existsSync(root)) {
    console.log(` -> Prehľadávam disk/zložku: ${root}`);
    scanForWebp(root);
  }
}

console.log(`✓ Nájdených ${fileIndex.size} unikátnych WebP fotiek naprieč diskami.\n`);

// Spracovanie MDX projektov
const mdxFiles = fs.readdirSync(projectsDir).filter(f => f.endsWith('.mdx') || f.endsWith('.md'));
let copiedCount = 0;
let missingCount = 0;

for (const file of mdxFiles) {
  const slug = path.basename(file, path.extname(file));
  const filePath = path.join(projectsDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  const targetProjectDir = path.join(publicDir, slug);
  if (!fs.existsSync(targetProjectDir)) {
    fs.mkdirSync(targetProjectDir, { recursive: true });
  }

  // Hľadáme staré ImgBB linky ALEBO už prepísané lokálne linky, ktoré nemusia mať fyzický súbor
  const imgbbRegex = /https?:\/\/i\.ibb\.co\/[^\/\s"']+\/([^\/\s"'\)]+)/g;
  let fileWasChanged = false;

  content = content.replace(imgbbRegex, (fullMatch, filename) => {
    const cleanFilename = filename.toLowerCase();
    const targetFilePath = path.join(targetProjectDir, filename);

    if (fileIndex.has(cleanFilename)) {
      const sourcePath = fileIndex.get(cleanFilename);
      if (!fs.existsSync(targetFilePath)) {
        fs.copyFileSync(sourcePath, targetFilePath);
        copiedCount++;
      }
    } else {
      console.warn(`⚠️  Varovanie: Súbor '${filename}' pre projekt '${slug}' sa nenašiel na žiadnom disku!`);
      missingCount++;
    }

    fileWasChanged = true;
    return `/images/projects/${slug}/${filename}`;
  });

  if (fileWasChanged) {
    fs.writeFileSync(filePath, content, 'utf-8');
  }
}

console.log('\n=======================================');
console.log(`🎉 SKENOVANIE A KOPÍROVANIE DOKONČENÉ!`);
console.log(`📸 Skopírovaných chýbajúcich fotiek: ${copiedCount}`);
if (missingCount > 0) {
  console.log(`⚠️  Nájdených chýbajúcich súborov: ${missingCount}`);
}
console.log('=======================================');