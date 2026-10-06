const fs = require('fs');
let appJs = fs.readFileSync('app.js', 'utf8');
appJs = appJs.replace(/app\.use\('\/api\/admin\/visits', require\('\.\/src\/routes\/adminVisitRoutes'\)\);/, "app.use('/api/admin/visits', require('./src/routes/adminVisitRoutes'));\napp.use('/api/admin/engineers', require('./src/routes/adminEngineerRoutes'));");
fs.writeFileSync('app.js', appJs);
