const fs = require('fs');
let c = fs.readFileSync('src/models/Company.js', 'utf8');

c = c.replace('name: {', 'normalizedName: { type: String, unique: true },\n  name: {');
c = c.replace('const companySchema = new mongoose.Schema({', `const normalize = (t) => t.trim().replace(/[أإآ]/g, 'ا').replace(/ة/g, 'ه').replace(/ى/g, 'ي').toLowerCase();\nconst companySchema = new mongoose.Schema({`);
c = c.replace('}, { timestamps: true });', `}, { timestamps: true });\ncompanySchema.index({ name: 'text', normalizedName: 'text' });\ncompanySchema.pre('save', function(next) { if (this.isModified('name')) { this.normalizedName = normalize(this.name); } next(); });\ncompanySchema.pre(/update/i, function(next) { const update = this.getUpdate(); if (update.name) { update.normalizedName = normalize(update.name); } next(); });`);

fs.writeFileSync('src/models/Company.js', c);
