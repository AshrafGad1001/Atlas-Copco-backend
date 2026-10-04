
function getCairoStartOfDay(dateInput) {
  const date = new Date(dateInput);
  
  // Get Cairo YYYY-MM-DD
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Cairo",
    year: "numeric", month: "2-digit", day: "2-digit"
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find(p => p.type === "year").value;
  const month = parts.find(p => p.type === "month").value;
  const day = parts.find(p => p.type === "day").value;
  
  // Try 00:00:00 with UTC offset
  // In Cairo, it is either +02:00 or +03:00.
  // If we create date with +02:00, and format it, if it says 23:00 of previous day, we need +03:00.
  let guess = new Date(`${year}-${month}-${day}T00:00:00+02:00`);
  
  let gParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Cairo", hour: "numeric", hour12: false
  }).format(guess);
  
  if (gParts === "24" || gParts === "0" || gParts === "00") {
    // wait, could be +02:00 is correct
  } else if (gParts === "23") {
    // it was an hour behind, so offset is +03:00
    guess = new Date(`${year}-${month}-${day}T00:00:00+03:00`);
  } else if (gParts === "1" || gParts === "01") {
    // it was an hour ahead, so offset is +01:00
    guess = new Date(`${year}-${month}-${day}T00:00:00+01:00`);
  }
  return guess;
}

console.log(getCairoStartOfDay("2026-07-15T21:30:00Z").toISOString()); // Should be 2026-07-15T21:00:00Z
console.log(getCairoStartOfDay("2026-01-15T22:30:00Z").toISOString()); // Should be 2026-01-15T22:00:00Z

function getCairoStartOfMonth(dateInput) {
  const date = new Date(dateInput);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Cairo",
    year: "numeric", month: "2-digit"
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find(p => p.type === "year").value;
  const month = parts.find(p => p.type === "month").value;
  
  let guess = new Date(`${year}-${month}-01T00:00:00+02:00`);
  let gParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Cairo", hour: "numeric", hour12: false
  }).format(guess);
  
  if (gParts === "23") {
    guess = new Date(`${year}-${month}-01T00:00:00+03:00`);
  } else if (gParts === "1" || gParts === "01") {
    guess = new Date(`${year}-${month}-01T00:00:00+01:00`);
  }
  return guess;
}

console.log("Month 07:", getCairoStartOfMonth("2026-07-15T21:30:00Z").toISOString());
console.log("Month 01:", getCairoStartOfMonth("2026-01-15T22:30:00Z").toISOString());

