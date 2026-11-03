import fs from 'node:fs';
import path from 'node:path';

const searchRoots = ['D:\\', 'E:\\', 'F:\\', 'I:\\'];
const projectsDir = path.join(process.cwd(), 'src', 'content', 'projects');
const publicProjectsDir = path.join(process.cwd(), 'public', 'images', 'projects');

if (!fs.existsSync(projectsDir)) {
  console.error('❌ Priečinok src/content/projects neexistuje!');
  process.exit(1);
}

// 1. Zozbierame všetky požadované fotky zo všetkých MDX projektov
console.log('📋 Analyzujem všetky MDX projekty...');
const mdxFiles = fs.readdirSync(projectsDir).filter(f => f.endsWith('.mdx') || f.endsWith('.md'));
const projectRequirements = new Map(); // slug => Set of filenames
const allRequiredFilenames = new Set();

for (const file of mdxFiles) {
  const slug = path.basename(file, path.extname(file));
  const filePath = path.join(projectsDir, file);
  const content = fs.readFileSync(filePath, 'utf-8');

  // Hľadáme cesty v tvare /images/projects/[slug]/filename.webp
  const matches = content.match(/\/images\/projects\/[^\s"'()+\/]+\/([^\/\s"'()]+\.(webp|png|jpe?g))/gi);
  
  const filenames = new Set();
  if (matches) {
    matches.forEach(m => {
      const filename = path.basename(m);
      filenames.add(filename.toLowerCase());
      allRequiredFilenames.add(filename.toLowerCase());
    });
  }
  projectRequirements.set(slug, filenames);
}

console.log(`✓ Celkovo nájdených ${mdxFiles.length} projektov, ktoré vyžadujú ${allRequiredFilenames.size} unikátnych fotiek.\n`);

// 2. Prehľadáme disky a vytvoríme globálny index umiestnení
console.log('🔍 Prehľadávam disky (D, E, F, I) a indexujem súbory...');
const fileIndex = new Map(); // filename.toLowerCase() => fullPath

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
        if (allRequiredFilenames.has(lowerName)) {
          // Uprednostníme súbor z priečinka web_optimized
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
    console.log(` -> Skenujem: ${root}`);
    scanDisks(root);
  }
}

console.log(`✓ Na diskoch sa podarilo nájsť ${fileIndex.size} z ${allRequiredFilenames.size} požadovaných súborov.\n`);

// 3. Kontrola a kopírovanie pre každý projekt zvlášť
let totalCopied = 0;
let totalSkipped = 0;
let totalMissing = 0;

for (const [slug, filenames] of projectRequirements.entries()) {
  const targetDir = path.join(publicProjectsDir, slug);
  let projectCopied = 0;
  let projectMissing = 0;

  for (const filename of filenames) {
    const destPath = path.join(targetDir, filename);

    // Ak už fotka v priečinku projektu fyzicky je, preskočíme ju
    if (fs.existsSync(destPath)) {
      totalSkipped++;
      continue;
    }

    // Ak ju nemáme vytvorenú, ale existuje na diskoch, skopírujeme ju
    if (fileIndex.has(filename)) {
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }
      const srcPath = fileIndex.get(filename);
      fs.copyFileSync(srcPath, destPath);
      totalCopied++;
      projectCopied++;
    } else {
      totalMissing++;
      projectMissing++;
      console.warn(`  ⚠️ [${slug}] Chýba na diskoch: ${filename}`);
    }
  }

  if (projectCopied > 0) {
    console.log(`✓ [${slug}] Doplnených ${projectCopied} chýbajúcich fotiek.`);
  }
}

console.log('\n=======================================');
console.log(`🎉 HROMADNÁ MIGRÁCIA DOKONČENÁ!`);
console.log(`📥 Novo skopírovaných fotiek: ${totalCopied}`);
console.log(`⏭️  Preskočených (už existovali): ${totalSkipped}`);
if (totalMissing > 0) {
  console.log(`❌ Úplne chýbajúcich na diskoch: ${totalMissing}`);
}
console.log('=======================================');