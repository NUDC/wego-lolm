export function fmtSize(kb: number): string {
  if (!kb) return "-";
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}

/// 相对时间：切号场景下「3 分钟前」比完整时间戳好扫视得多。
export function fmtRelTime(ms: number): string {
  if (!ms) return "从未保存";
  const d = Date.now() - Number(ms);
  if (d < 0) return "刚刚";
  if (d < 60_000) return "刚刚";
  if (d < 3_600_000) return `${Math.floor(d / 60_000)} 分钟前`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)} 小时前`;
  if (d < 2_592_000_000) return `${Math.floor(d / 86_400_000)} 天前`;
  try {
    return new Date(Number(ms)).toLocaleDateString();
  } catch {
    return "-";
  }
}

/// 槽位 id 由前端自动分配，用户只需要关心昵称。
export function nextSlotId(used: string[]): string {
  const taken = new Set(used);
  for (let i = 1; i < 1000; i++) {
    const id = `s${i}`;
    if (!taken.has(id)) return id;
  }
  return `s${Date.now()}`;
}
