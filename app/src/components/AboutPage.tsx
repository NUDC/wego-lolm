import type { CheckResult } from "../types";
import Icon from "./Icon";

interface Props {
  check: CheckResult | null;
  checkErr: string | null;
  version: string;
  onBack: () => void;
}

/// 纯只读页：版本 + 设备状态，没有任何操作。
export default function AboutPage({ check, checkErr, version, onBack }: Props) {
  const info: [string, string, string?][] = [
    ["版本", version || "—"],
    ...(check
      ? ([
          ["Root", "已就绪", "ok"],
          [
            "英雄联盟手游",
            check.game_installed ? "已安装" : "未找到",
            check.game_installed ? "ok" : "err",
          ],
          ["游戏 UID / GID", check.game_installed ? `${check.uid} / ${check.gid}` : "-"],
          ["游戏运行中", check.running ? "是" : "否"],
          ["快照集", check.subdirs.join(" · ") || "-"],
        ] as [string, string, string?][])
      : ([["Root", checkErr ? "未获得" : "检测中…", checkErr ? "err" : undefined]] as [
          string,
          string,
          string?,
        ][])),
  ];

  return (
    <div className="page">
      <div className="page-head">
        <button className="back-btn" onClick={onBack} aria-label="返回">
          <Icon name="arrowLeft" size={19} />
        </button>
        <div className="page-title">关于</div>
      </div>

      <div className="page-body">
        <div className="group">
          {info.map(([k, v, cls]) => (
            <div className="group-row" key={k}>
              <span className="group-k">{k}</span>
              <span className={cls ? `group-v ${cls}` : "group-v"}>{v}</span>
            </div>
          ))}
        </div>

        {checkErr && <p className="note">{checkErr}</p>}
      </div>
    </div>
  );
}
