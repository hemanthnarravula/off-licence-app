/** Minimal CSV parser for documented import templates (quoted fields supported). */
export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (!lines.length) {
    return { headers: [], rows: [] };
  }

  const parsed = lines.map(parseCsvLine);
  const headers = parsed[0].map((h) => h.trim());
  const rows = parsed.slice(1);
  return { headers, rows };
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }
    if (char === ",") {
      cells.push(current);
      current = "";
      continue;
    }
    current += char;
  }

  cells.push(current);
  return cells;
}

export function rowToRecord(
  headers: string[],
  cells: string[],
): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((header, index) => {
    record[header] = (cells[index] ?? "").trim();
  });
  return record;
}
