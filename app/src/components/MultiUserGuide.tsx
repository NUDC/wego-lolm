// 无 root 且特权服务未启动时：引导用户用 ADB/无线调试启动"自建特权服务"，
// 启动后 App 通过 LocalSocket 连接自己的服务，实现免 root 一键多用户。
// （若不想折腾，也可用最下方的纯手动多用户，零依赖。）

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
      <div className="mu-head">
        <h2>免 root · 多用户</h2>
        <span className="chip chip-idle">未检测到 root</span>
      </div>

      <p className="hint">
        本机无 root。启用<b>特权服务</b>后即可在 App 内<b>一键创建/切换多用户</b>（免 root）。
        只需用 <b>ADB 或无线调试</b>执行下面这条命令启动一次（重启后需再启动一次）：
      </p>

      <pre className="cmd-box">{startCommand || "（启动命令获取中…点上方“自检”重试）"}</pre>
      <div className="toolbar">
        <button className="primary" onClick={copy} disabled={!startCommand}>
          复制启动命令
        </button>
        <button className="ghost" onClick={onRecheck}>
          我已启动，重新检测
        </button>
      </div>
      <p className="hint" style={{ marginTop: 8 }}>
        无线调试：设置 → 开发者选项 → 无线调试（配对后，用手机上的终端 App 或电脑执行上面命令）。
        启动成功后点“重新检测”，会自动进入一键多用户面板。
      </p>

      <details style={{ marginTop: 14 }}>
        <summary className="mu-summary">不想启用特权服务？用纯手动多用户（零依赖）</summary>
        <div className="mu-steps" style={{ marginTop: 10 }}>
          {MANUAL.map((s) => (
            <div className="mu-step" key={s.t}>
              <div className="mu-step-t">{s.t}</div>
              <div className="mu-step-d">{s.d}</div>
            </div>
          ))}
        </div>
        <div className="toolbar" style={{ marginTop: 10 }}>
          <button className="ghost" onClick={onOpenSettings}>
            打开系统用户设置
          </button>
        </div>
      </details>
    </section>
  );
}
