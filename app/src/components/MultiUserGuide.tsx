type Kind = "ok" | "err" | "warn" | "info";

interface Props {
  startCommand: string;
  onRecheck: () => void;
  onOpenSettings: () => void;
  onToast: (msg: string, kind?: Kind) => void;
}

const MANUAL: { t: string; d: string }[] = [
  { t: "新建用户", d: "设置 → 系统 → 多个用户 → 添加用户（如「小号」）。" },
  { t: "装并登录 LOLM", d: "切到新用户 → 装英雄联盟手游 → 登录另一个号。" },
  { t: "切用户即切号", d: "下拉快捷设置或设置里切换用户。" },
];

export default function MultiUserGuide({ startCommand, onRecheck, onOpenSettings, onToast }: Props) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(startCommand);
      onToast("启动命令已复制", "ok");
    } catch {
      onToast("复制失败，请手动选择命令文本", "warn");
    }
  };

  return (
    <section className="card">
      <div className="card-title">
        <h2>启用免 Root 多用户</h2>
        <span className="status err">
          <span className="dot" />
          特权服务未启动
        </span>
      </div>
      <p className="hint">
        本机无 Root。用 <b>ADB / 无线调试</b>执行下面这条命令启动一次特权服务（重启后需再启动），
        之后即可在 App 内一键创建 / 切换多用户。
      </p>

      <div className="code-box">{startCommand || "（获取启动命令中…点上方「自检」重试）"}</div>
      <div className="toolbar">
        <button className="btn btn-primary" onClick={copy} disabled={!startCommand}>
          📋 复制命令
        </button>
        <button className="btn btn-ghost" onClick={onRecheck}>
          ↻ 已启动，重新检测
        </button>
      </div>

      <p className="hint" style={{ marginTop: 12 }}>
        无线调试：设置 → 开发者选项 → 无线调试（Android 11+ 免电脑）。启动成功后点「重新检测」自动进入多用户面板。
      </p>

      <details style={{ marginTop: 6 }}>
        <summary className="hint" style={{ cursor: "pointer", padding: "8px 0" }}>
          不想启用特权服务？改用纯手动多用户 ›
        </summary>
        <div className="steps">
          {MANUAL.map((s, i) => (
            <div className="step" key={s.t}>
              <div className="n">{i + 1}</div>
              <div>
                <div className="t">{s.t}</div>
                <div className="d">{s.d}</div>
              </div>
            </div>
          ))}
        </div>
        <button className="btn btn-ghost btn-block" style={{ marginTop: 12 }} onClick={onOpenSettings}>
          打开系统用户设置
        </button>
      </details>

      <p className="divider-note">
        想要「同一实例秒切」？给设备装 Magisk（Root），App 会自动切到快照模式。
      </p>
    </section>
  );
}
