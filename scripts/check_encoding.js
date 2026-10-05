const fs = require('fs');
const path = require('path');

let hasError = false;

function searchDir(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (fs.statSync(full).isDirectory()) {
      if (f === "node_modules" || f === ".next" || f === "dist" || f === "build" || f === "coverage" || f === ".git") continue;
      searchDir(full);
    } else {
      if (!full.endsWith(".js") && !full.endsWith(".ts") && !full.endsWith(".tsx")) continue;
      if (full.includes("check_encoding")) continue;
      
      let content;
      try {
        content = fs.readFileSync(full, "utf8");
      } catch (e) {
        console.error(`Invalid UTF-8 in ${full}`);
        hasError = true;
        continue;
      }

      const lines = content.split('\n');
      lines.forEach((line, i) => {
        // Detect ??? or \ufffd
        if (/\?{3,}/.test(line) || /\ufffd/.test(line)) {
           console.log(`${full}:${i+1} -> contains corrupted text.`);
           hasError = true;
        } else if (/\?\?/.test(line)) {
           // check if ?? is not nullish coalescing or query param
           if (!/(\w\s*\?\?\s*\w)|(\?\w+=)/.test(line)) {
             console.log(`${full}:${i+1} -> contains corrupted text (??).`);
             hasError = true;
           }
        }
      });
    }
  }
}

searchDir("src");
searchDir("tests");
searchDir("scripts");

if (hasError) {
  process.exit(1);
} else {
  console.log("Encoding check passed.");
  process.exit(0);
}
