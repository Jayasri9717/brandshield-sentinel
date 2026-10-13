export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const input = text.replace(/^\uFEFF/, "");

  for (let index = 0; index < input.length; index += 1) {
    const char = input[index];
    if (char === '"' && quoted && input[index + 1] === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field.trim());
      field = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && input[index + 1] === "\n") index += 1;
      row.push(field.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (quoted) throw new Error("CSV contains an unclosed quoted field.");
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

export function parseCsvObjects(text: string, requiredColumns: string[]): Record<string, string>[] {
  const [headers = [], ...records] = parseCsvRows(text);
  const normalizedHeaders = headers.map((header) => header.trim().toLowerCase());
  const missing = requiredColumns.filter((column) => !normalizedHeaders.includes(column.toLowerCase()));
  if (missing.length) throw new Error(`CSV is missing required column${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}.`);
  return records.map((record) => Object.fromEntries(
    normalizedHeaders.map((header, index) => [header, record[index] ?? ""]),
  ));
}
