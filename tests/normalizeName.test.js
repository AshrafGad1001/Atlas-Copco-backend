const normalizeName = require('../src/utils/normalizeName');

describe('normalizeName', () => {
  it('handles null and undefined', () => {
    expect(normalizeName(null)).toBe('');
    expect(normalizeName(undefined)).toBe('');
  });

  it('normalizes Arabic characters', () => {
    expect(normalizeName('أحمد')).toBe('احمد');
    expect(normalizeName('إيمان')).toBe('ايمان');
    expect(normalizeName('آدم')).toBe('ادم');
    expect(normalizeName('مدينة')).toBe('مدينه');
    expect(normalizeName('مصطفى')).toBe('مصطفي');
  });

  it('removes diacritics and tatweel', () => {
    expect(normalizeName('مُحَمَّد')).toBe('محمد');
    expect(normalizeName('مصنــع')).toBe('مصنع');
  });

  it('converts Arabic numerals to English', () => {
    expect(normalizeName('مصنع ١٢٣')).toBe('مصنع 123');
    expect(normalizeName('٠١٢٣٤٥٦٧٨٩')).toBe('0123456789');
  });

  it('handles English lowercase and punctuation', () => {
    expect(normalizeName('Orascom Co.')).toBe('orascom co');
    expect(normalizeName('A & B - Factory')).toBe('a b factory');
    expect(normalizeName('Test (1)')).toBe('test 1');
  });

  it('collapses multiple spaces', () => {
    expect(normalizeName('  Orascom   Co. ')).toBe('orascom co');
  });
});
