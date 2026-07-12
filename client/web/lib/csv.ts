/**
 * Minimal RFC-4180-ish CSV parser: handles quoted fields, escaped quotes ("")
 * inside quotes, and commas / newlines within quotes. Returns rows of string
 * cells. Blank trailing lines are dropped.
 */
export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  const text = input.replace(/\r\n?/g, "\n"); // normalize newlines

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(cell);
      cell = "";
    } else if (c === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += c;
    }
  }
  // flush the final cell/row if the file didn't end with a newline
  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }
  // drop fully-empty rows
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}
