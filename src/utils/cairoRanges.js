
function getCairoRanges(range) {
  const now = new Date();
  return { start: new Date(now.getFullYear(), 0, 1), end: now };
}
module.exports = { getCairoRanges };

