import type { SlotMeta } from "../types";
import { fmtRelTime } from "../lib/format";

interface Props {
  slot: SlotMeta;
  active: boolean;
  busy: boolean;
  onSwitch: (slot: string) => void;
  onLaunch: () => void;
  onEdit: (slot: string) => void;
}

export default function SlotCard({ slot, active, busy, onSwitch, onLaunch, onEdit }: Props) {
  const meta = [slot.user_id ? `#${slot.user_id}` : null, fmtRelTime(slot.updated_at_ms)]
    .filter(Boolean)
    .join("  ·  ");

  return (
    <div className="account">
      {/* 整行进详情，右侧只留一个操作按钮——每行一个控件就够了 */}
      <button className="account-main" disabled={busy} onClick={() => onEdit(slot.slot)}>
        <span className="account-name">
          {slot.name}
          {active && <span className="tag">当前</span>}
        </span>
        <span className="account-meta">{meta}</span>
      </button>
      {/* 已经是当前号时，需要的是「打开游戏」而不是再走一遍快照搬运 */}
      <button
        className="btn btn-tonal btn-sm"
        disabled={busy}
        onClick={() => (active ? onLaunch() : onSwitch(slot.slot))}
      >
        {active ? "启动" : "切换"}
      </button>
    </div>
  );
}
