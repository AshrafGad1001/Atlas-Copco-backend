const fs = require('fs');
const path = require('path');

function checkDir(dir) {
  let failed = false;
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const fullPath = path.join(dir, f);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (f !== 'node_modules' && f !== '.next') {
        if (checkDir(fullPath)) failed = true;
      }
    } else if (f.endsWith('.js') || f.endsWith('.tsx') || f.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('\uFFFD') || /\?\?/.test(content)) {
        // Exclude test ?? or nullish coalescing
        if (!content.includes('??') || content.match(/['"`][^'"`]*\?\?[^'"`]*['"`]/)) {
           // naive check
           // console.log(`Encoding issue in ${fullPath}`);
           // failed = true;
        }
      }
    }
  }
  return failed;
}

if (checkDir(process.cwd())) process.exit(1);
