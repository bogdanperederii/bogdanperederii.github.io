import fs from 'node:fs';
import path from 'node:path';

const searchRoots = [
  'D:\\01_2026_Projects', 'D:\\Projects', 'D:\\',
  'E:\\01_2026_Projects', 'E:\\Projects', 'E:\\',
  'F:\\', 'I:\\'
];

const publicDir = path.join(process.cwd(), 'public', 'images', 'projects');

console.log('🚀 Spúšťam masívny zber VŠETKÝCH fotiek z web_optimized priečinkov...');
let totalCopied = 0;

function cleanSlug(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/_20\d\d_\d+|_20\d\d/g, '') // Odstráni prípony ako _2025_1, _2025 z názvov priečinkov na disku
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function processDirectory(dir) {
  try {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        const lowerName = entry.name.toLowerCase();

        // Ak sme našli zložku web_optimized alebo bts, skopírujeme jej obsah!
        if (lowerName === 'web_optimized' || lowerName === 'bts' || lowerName === 'gallery') {
          // Zistíme názov nadradeného projektu (napr. "crazy_wall_2025")
          const parentDirName = path.basename(path.dirname(fullPath));
          const slug = cleanSlug(parentDirName);

          const targetProjectDir = path.join(publicDir, slug);
          if (!fs.existsSync(targetProjectDir)) {
            fs.mkdirSync(targetProjectDir, { recursive: true });
          }

          // Prejdeme všetky obrázky v tejto zložke
          const images = fs.readdirSync(fullPath);
          for (const img of images) {
            if (/\.(webp|png|jpe?g)$/i.test(img)) {
              const srcFile = path.join(fullPath, img);
              const destFile = path.join(targetProjectDir, img);

              if (!fs.existsSync(destFile)) {
                fs.copyFileSync(srcFile, destFile);
                totalCopied++;
              }
            }
          }
          console.log(`📁 Spracovaná zložka pre projekt [slug: ${slug}]`);
        } else {
          // Rekurzívne hľadáme ďalej
          if (!['$RECYCLE.BIN', 'System Volume Information', 'node_modules', 'Windows', 'Program Files'].includes(entry.name)) {
            processDirectory(fullPath);
          }
        }
      }
    }
  } catch (err) {
    // Ignorujeme chyby prístupu
  }
}

for (const root of searchRoots) {
  if (fs.existsSync(root)) {
    console.log(` -> Skenujem disk: ${root}`);
    processDirectory(root);
  }
}

console.log('\n=======================================');
console.log(`🎉 HOTOVO!`);
console.log(`📸 Celkovo skopírovaných fotiek do public/: ${totalCopied}`);
console.log('=======================================');