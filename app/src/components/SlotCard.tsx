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
    slot.user_id ? `ID:${slot.user_id}` : null,
    `slot:${slot.slot}`,
    fmtSize(slot.size_kb),
    fmtTime(slot.updated_at_ms),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={`slot${active ? " active" : ""}`}>
      <div className="slot-main">
        <div className="slot-name">
          {slot.name}
          {active && <span className="badge">当前</span>}
        </div>
        <div className="slot-meta">{meta}</div>
      </div>
      <div className="slot-actions">
        <button className="primary" disabled={busy} onClick={() => onSwitch(slot.slot, active)}>
          {active ? "重载" : "切换"}
        </button>
        <button className="ghost" disabled={busy} onClick={() => onRename(slot.slot, slot.name)}>
          改名
        </button>
        <button className="ghost" disabled={busy} onClick={() => onExport(slot.slot)}>
          导出
        </button>
        <button className="danger" disabled={busy} onClick={() => onDelete(slot.slot, slot.name)}>
          删除
        </button>
      </div>
    </div>
  );
}
