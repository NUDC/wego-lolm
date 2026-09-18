import { SwapIcon } from "./icons";

const ROWS = [
  { name: "大号", id: "#7261141836722937", time: "2 分钟前", active: true },
  { name: "小号", id: "#8805957327762259", time: "3 小时前", active: false },
  { name: "朋友的号", id: "#4417820935514663", time: "昨天", active: false },
];

/// 用纯 CSS 复刻 App 界面，不放截图——截图里有真实账号标识，不适合发到公网。
export default function Preview() {
  return (
    <div className="preview">
      <div className="pv-bar">
        <div className="pv-brand">
          <div className="pv-mark">
            <SwapIcon size={17} color="var(--accent)" />
          </div>
          <div>
            <div className="pv-title">LOLM 账号切换器</div>
            <div className="pv-sub">{ROWS.length} 个账号</div>
          </div>
        </div>
        <span className="pv-chip">
          <i className="pv-dot" />
          就绪
        </span>
      </div>

      <div className="pv-list">
        {ROWS.map((r) => (
          <div className="pv-row" key={r.name}>
            <div className="pv-main">
              <div className="pv-name">
                {r.name}
                {r.active && <span className="pv-tag">当前</span>}
              </div>
              <div className="pv-meta">
                {r.id} · {r.time}
              </div>
            </div>
            <div className="pv-act">{r.active ? "启动" : "切换"}</div>
          </div>
        ))}
      </div>

      <div className="pv-foot">
        <div className="pv-btn ghost">登录新号</div>
        <div className="pv-btn solid">＋ 保存当前号</div>
      </div>
    </div>
  );
}
