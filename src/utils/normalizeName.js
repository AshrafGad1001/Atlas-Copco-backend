/**
 * Normalizes a string for search and deduplication.
 * - Trims whitespace
 * - Lowercases English letters
 * - Collapses multiple spaces
 * - Removes Arabic diacritics and tatweel
 * - Normalizes Alef, Ta Marbuta, Alif Maksura
 * - Converts Arabic numerals to English numerals
 * - Replaces punctuation with a space
 */
const normalizeName = (str) => {
  if (str === null || str === undefined) return '';
  let s = String(str);
  
  // Replace punctuation (. , - _ ( ) / & ' ") with a space
  s = s.replace(/[.,\-_()/&'"]/g, ' ');
  
  // Collapse spaces and trim
  s = s.replace(/\s+/g, ' ').trim();
  
  // Lowercase
  s = s.toLowerCase();
  
  // Remove diacritics (tashkeel) and tatweel
  s = s.replace(/[\u064B-\u065F\u0640]/g, '');
  
  // Normalize Alef (أ إ آ -> ا)
  s = s.replace(/[أإآ]/g, 'ا');
  
  // Normalize Ta Marbuta (ة -> ه)
  s = s.replace(/ة/g, 'ه');
  
  // Normalize Alif Maksura (ى -> ي)
  s = s.replace(/ى/g, 'ي');
  
  // Convert Arabic numerals to English numerals
  s = s.replace(/[٠-٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)]);
  
  return s;
};

module.exports = normalizeName;
