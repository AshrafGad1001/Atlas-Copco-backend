const fs = require('fs');
let c = fs.readFileSync('src/models/Company.js', 'utf8');
c = c.replace("companySchema.pre('save', function(next) { if (this.isModified('name')) { this.normalizedName = normalize(this.name); } next(); });", "companySchema.pre('save', function() { if (this.isModified('name')) { this.normalizedName = normalize(this.name); } });");
c = c.replace("companySchema.pre(/update/i, function(next) { const update = this.getUpdate(); if (update.name) { update.normalizedName = normalize(update.name); } next(); });", "companySchema.pre(/update/i, function() { const update = this.getUpdate(); if (update.name) { update.normalizedName = normalize(update.name); } });");
fs.writeFileSync('src/models/Company.js', c);
