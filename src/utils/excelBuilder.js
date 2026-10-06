const exceljs = require('exceljs');

const buildWorkbook = (columns, rows, sheetName = 'Sheet1') => {
  const workbook = new exceljs.Workbook();
  const sheet = workbook.addWorksheet(sheetName, {
    views: [
      {
        rightToLeft: true,
        state: 'frozen',
        ySplit: 1, // Freeze header
      }
    ]
  });

  sheet.columns = columns;

  // Header styling
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFDEE8F2' }
  };
  
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length }
  };

  rows.forEach(r => {
    const row = sheet.addRow(r);
    row.alignment = { wrapText: true, vertical: 'top' };
  });

  return workbook;
};

// Date formatter helper (Cairo)
const formatCairoDate = (date) => {
  if (!date) return '';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Cairo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(date));
};

const formatCairoTime = (date) => {
  if (!date) return '';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Cairo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(date));
};

module.exports = { buildWorkbook, formatCairoDate, formatCairoTime };
