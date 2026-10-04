const fs = require('fs');

function clean(file) {
  if (!fs.existsSync(file)) return;
  let c = fs.readFileSync(file, 'utf8');
  c = c.replace(/\?\?\?+/g, 'تم');
  fs.writeFileSync(file, c);
}

clean('tests/company.api.test.js');
clean('scripts/seedDemo.js');
