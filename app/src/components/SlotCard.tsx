import type { SlotMeta } from "../types";
import { fmtSize, fmtTime } from "../lib/format";

interface Props {
  slot: SlotMeta;
  active: boolean;
  busy: boolean;
  onSwitch: (slot: string, active: boolean) => void;
  onRename: (slot: string, name: string) => void;
  onExport: (slot: string) => void;
  onDelete: (slot: string, name: string) => void;
}

export default function SlotCard({
  slot,
  active,
  busy,
  onSwitch,
  onRename,
  onExport,
  onDelete,
}: Props) {
  const meta = [
    slot.user_id ? `#${slot.user_id}` : null,
    slot.slot,
    fmtSize(slot.size_kb),
    fmtTime(slot.updated_at_ms),
  ]
    .filter(Boolean)
    .join("  ·  ");
  const initial = (slot.name || slot.slot).trim().charAt(0) || "?";

  return (
    <div className={`row${active ? " active" : ""}`}>
      <div className="avatar">{initial}</div>
      <div className="row-main">
        <div className="row-name">
          {slot.name}
          {active && <span className="tag">当前</span>}
        </div>
        <div className="row-meta">{meta}</div>
      </div>
      <div className="row-actions">
        <button
          className="btn btn-primary btn-sm"
          disabled={busy}
          onClick={() => onSwitch(slot.slot, active)}
        >
          {active ? "重载" : "切换"}
        </button>
        <button className="icon-btn" title="改名" disabled={busy} onClick={() => onRename(slot.slot, slot.name)}>
          ✏️
        </button>
        <button className="icon-btn" title="导出" disabled={busy} onClick={() => onExport(slot.slot)}>
          📤
        </button>
        <button
          className="icon-btn danger"
          title="删除"
          disabled={busy}
          onClick={() => onDelete(slot.slot, slot.name)}
        >
          🗑
        </button>
      </div>
    </div>
  );
}
