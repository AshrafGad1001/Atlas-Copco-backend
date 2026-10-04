
function getCairoStartOfDay(dateInput) {
  const date = new Date(dateInput);
  
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Cairo",
    year: "numeric", month: "2-digit", day: "2-digit"
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find(p => p.type === "year").value;
  const month = parts.find(p => p.type === "month").value;
  const day = parts.find(p => p.type === "day").value;
  
  let guess = new Date(`${year}-${month}-${day}T00:00:00+02:00`);
  
  let gParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Cairo", hour: "numeric", hour12: false
  }).format(guess);
  
  // gParts is the hour in Cairo for the time `guess`.
  // If guess is T00:00:00+02:00, and Cairo is +3, then guess in UTC is 22:00.
  // 22:00 UTC in Cairo (+3) is 01:00 AM.
  // We want Cairo 00:00. So we need 21:00 UTC.
  // 21:00 UTC = T00:00:00+03:00.
  if (gParts === "1" || gParts === "01") {
    guess = new Date(`${year}-${month}-${day}T00:00:00+03:00`);
  } else if (gParts === "23") {
    guess = new Date(`${year}-${month}-${day}T00:00:00+01:00`);
  }
  return guess;
}

console.log(getCairoStartOfDay("2026-07-15T21:30:00Z").toISOString()); // Should be 2026-07-15T21:00:00Z
console.log(getCairoStartOfDay("2026-01-15T22:30:00Z").toISOString()); // Should be 2026-01-15T22:00:00Z

