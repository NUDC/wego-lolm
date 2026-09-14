export function fmtSize(kb: number): string {
  if (!kb) return "-";
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}

export function fmtTime(ms: number): string {
  if (!ms) return "-";
  try {
    return new Date(Number(ms)).toLocaleString();
  } catch {
    return "-";
  }
}
