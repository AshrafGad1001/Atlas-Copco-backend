
function getCairoStartOfDay(dateInput = new Date()) {
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
  
  if (gParts === "1" || gParts === "01") {
    guess = new Date(`${year}-${month}-${day}T00:00:00+03:00`);
  } else if (gParts === "23") {
    guess = new Date(`${year}-${month}-${day}T00:00:00+01:00`);
  }
  return guess;
}

function getCairoStartOfMonth(dateInput = new Date()) {
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
  
  if (gParts === "1" || gParts === "01") {
    guess = new Date(`${year}-${month}-01T00:00:00+03:00`);
  } else if (gParts === "23") {
    guess = new Date(`${year}-${month}-01T00:00:00+01:00`);
  }
  return guess;
}

module.exports = { getCairoStartOfDay, getCairoStartOfMonth };

