// Parses the weekly meal table a coach pastes straight out of a spreadsheet
// (Excel/Sheets copy-paste is tab-separated; typed-by-hand rows use | as a
// fallback) into structured rows for the Plan PDF's landscape table - see
// server/services/planPdf.js. Column order matches the real "Nutrition
// Chart" project workbook (desktop) exactly: Day, Meal, Time, Eat order,
// Dish (Option A), Swap (Option B), Protein g, Carb g, Fat g, Fibre g,
// kcal, Note. Blank Day/Meal/Time cells inherit the value above them, the
// same convention a spreadsheet uses to show a merged/grouped column - so
// pasting a real range works without any reformatting.

const COLUMNS = ['day', 'meal', 'time', 'eatOrder', 'dish', 'swap', 'proteinG', 'carbG', 'fatG', 'fibreG', 'kcal', 'note'];
const NUMERIC_FIELDS = ['proteinG', 'carbG', 'fatG', 'fibreG', 'kcal'];
const INHERITED_FIELDS = ['day', 'meal', 'time'];

function splitLine(line) {
  return line.includes('\t') ? line.split('\t') : line.split('|');
}

function parseMealPlanTable(raw) {
  if (!raw || !raw.trim()) return [];
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length);
  const rows = [];
  const last = { day: '', meal: '', time: '' };

  lines.forEach((line) => {
    const cells = splitLine(line).map((c) => c.trim());
    if (cells[0] && cells[0].toLowerCase() === 'day') return; // tolerate a pasted header row

    const row = {};
    COLUMNS.forEach((col, i) => {
      row[col] = cells[i] !== undefined ? cells[i] : '';
    });
    if (!row.dish) return; // a blank spacer/total row from the source sheet

    INHERITED_FIELDS.forEach((field) => {
      if (row[field]) last[field] = row[field];
      else row[field] = last[field];
    });
    NUMERIC_FIELDS.forEach((field) => {
      row[field] = parseFloat(row[field]) || 0;
    });
    rows.push(row);
  });

  return rows;
}

function eatOrderCategory(eatOrder) {
  const t = (eatOrder || '').trim();
  if (t.startsWith('1')) return 'fibre';
  if (t.startsWith('2')) return 'protein';
  if (t.startsWith('3')) return 'fat';
  if (t.startsWith('4')) return 'carb';
  return 'other';
}

function sumMacros(rows) {
  return rows.reduce(
    (acc, r) => {
      acc.proteinG += r.proteinG;
      acc.carbG += r.carbG;
      acc.fatG += r.fatG;
      acc.fibreG += r.fibreG;
      acc.kcal += r.kcal;
      return acc;
    },
    { proteinG: 0, carbG: 0, fatG: 0, fibreG: 0, kcal: 0 }
  );
}

function groupByDay(rows) {
  const days = [];
  let current = null;
  rows.forEach((row) => {
    if (!current || current.day !== row.day) {
      current = { day: row.day, rows: [] };
      days.push(current);
    }
    current.rows.push(row);
  });
  return days.map((d) => ({ ...d, totals: sumMacros(d.rows) }));
}

function weeklyAverage(days) {
  if (!days.length) return null;
  const sum = sumMacros(days.map((d) => d.totals));
  const n = days.length;
  return {
    proteinG: Math.round(sum.proteinG / n),
    carbG: Math.round(sum.carbG / n),
    fatG: Math.round(sum.fatG / n),
    fibreG: Math.round(sum.fibreG / n),
    kcal: Math.round(sum.kcal / n),
  };
}

module.exports = { parseMealPlanTable, eatOrderCategory, groupByDay, weeklyAverage };
