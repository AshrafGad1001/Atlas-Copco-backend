const cloudinary = require('cloudinary').v2;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'test',
  api_key: process.env.CLOUDINARY_API_KEY || '123',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'abc'
});
module.exports = cloudinary;
