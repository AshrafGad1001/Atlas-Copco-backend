const fs = require('fs');
let c = fs.readFileSync('scripts/check_encoding.js', 'utf8');
c = c.replace(/\/\(\\\?\\\?\\\?\+\/\.test\(line\)/g, 'new RegExp("\\\\?{3,}").test(line)');
fs.writeFileSync('scripts/check_encoding.js', c);
