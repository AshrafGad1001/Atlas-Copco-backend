const fs = require('fs');
let c = fs.readFileSync('src/controllers/companyController.js', 'utf8');
c = c.replace(/Visit\.find\(\{ company: company._id, status: \{ \$ne: 'cancelled' \} \}\).*?\n/, "Visit.find({ company: company._id, isDeleted: { $ne: true } })\n");
fs.writeFileSync('src/controllers/companyController.js', c);
