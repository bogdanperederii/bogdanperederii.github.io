import fs from 'node:fs';
import path from 'node:path';

const projectsDir = path.join(process.cwd(), 'src', 'content', 'projects');
const mdxFiles = fs.readdirSync(projectsDir).filter(f => f.endsWith('.mdx') || f.endsWith('.md'));
let totalCleaned = 0;

console.log('🧹 Čistím ImgBB linky na lokálne cesty...');

for (const file of mdxFiles) {
  const slug = path.basename(file, path.extname(file));
  const filePath = path.join(projectsDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');

  // Regex nájde akýkoľvek ImgBB odkaz a vytiahne z neho presný názov súboru (napr. dsc09926bezbod.webp)
  const imgbbRegex = /https?:\/\/i\.ibb\.co\/[^\/\s"']+\/([^\/\s"'\)]+)/g;

  if (imgbbRegex.test(content)) {
    content = content.replace(imgbbRegex, (match, filename) => {
      totalCleaned++;
      // Nahradí celú ImgBB URL čistou lokálnou cestou
      return `/images/projects/${slug}/${filename}`;
    });

    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✓ [${slug}] Vyčistené linky.`);
  }
}

console.log('\n=======================================');
console.log(`🎉 HOTOVO!`);
console.log(`🔗 Celkovo vyčistených a nahradených liniek: ${totalCleaned}`);
console.log('=======================================');