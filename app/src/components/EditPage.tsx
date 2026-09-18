import { useState } from "react";
import type { SlotMeta } from "../types";
import { fmtSize, fmtRelTime } from "../lib/format";
import Icon from "./Icon";

interface Props {
  slot: SlotMeta;
  active: boolean;
  busy: boolean;
  onBack: () => void;
  onRename: (slot: string, name: string) => Promise<void>;
  onDelete: (slot: string, name: string) => Promise<void>;
}

export default function EditPage({ slot, active, busy, onBack, onRename, onDelete }: Props) {
  const [name, setName] = useState(slot.name);
  const trimmed = name.trim();
  const dirty = trimmed !== slot.name && trimmed.length > 0;

  // 「当前使用中」并入信息表，不再单独占一块
  const info: [string, string, string?][] = [
    ...(active ? ([["状态", "当前使用中", "ok"]] as [string, string, string?][]) : []),
    ["账号标识", slot.user_id ? `#${slot.user_id}` : "未知"],
    ["快照大小", fmtSize(slot.size_kb)],
    ["最近保存", fmtRelTime(slot.updated_at_ms)],
  ];

  return (
    <div className="page">
      <div className="page-head">
        <button className="back-btn" onClick={onBack} aria-label="返回">
          <Icon name="arrowLeft" size={19} />
        </button>
        <div className="page-title">账号详情</div>
      </div>

      <div className="page-body">
        <div className="field">
          <label>昵称</label>
          <input
            type="text"
            value={name}
            placeholder="如 大号 / 朋友A的号"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && dirty) void onRename(slot.slot, trimmed);
            }}
          />
        </div>

        <div className="group">
          {info.map(([k, v, cls]) => (
            <div className="group-row" key={k}>
              <span className="group-k">{k}</span>
              <span className={cls ? `group-v ${cls}` : "group-v"}>{v}</span>
            </div>
          ))}
        </div>

        <div className="stack">
          <button
            className="btn btn-primary btn-block"
            disabled={!dirty || busy}
            onClick={() => onRename(slot.slot, trimmed)}
          >
            保存
          </button>
          <button
            className="btn btn-danger btn-block"
            disabled={busy}
            onClick={() => onDelete(slot.slot, trimmed || slot.name)}
          >
            删除
          </button>
        </div>
      </div>
    </div>
  );
}
