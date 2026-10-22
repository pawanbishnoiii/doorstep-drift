export type SortDir = 'asc' | 'desc';
export function sortRows<T extends Record<string, unknown>>(rows: T[], key: keyof T, dir: SortDir): T[] {
  const m = dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = a[key], y = b[key];
    if (x == null) return 1; if (y == null) return -1;
    if (typeof x === 'number' && typeof y === 'number') return (x - y) * m;
    return String(x).localeCompare(String(y), 'en', { numeric: true }) * m;
  });
}
const cell = (v: unknown) => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
export function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return '';
  const keys = Object.keys(rows[0]!);
  return [keys.join(','), ...rows.map(r => keys.map(k => cell(r[k])).join(','))].join('\n');
}
