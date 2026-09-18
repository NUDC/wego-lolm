import { useEffect, useState } from "react";
import Preview from "./components/Preview";
import { SwapIcon, DownloadIcon } from "./components/icons";

const REPO = "NUDC/wego-lolm";
const ASSET = "lolm-switcher-arm64-release.apk";
const DOWNLOAD = `https://github.com/${REPO}/releases/latest/download/${ASSET}`;

const FEATURES = [
  {
    title: "扫一次，管很久",
    body: "账号绑在别人微信上时，每次切回来都要找对方扫码。存成快照后，切号不再需要任何人配合。",
  },
  {
    title: "一份安装，十个号",
    body: "快照只存登录态目录，每个号几十 MB。不像多用户方案那样按账号数翻倍占用存储。",
  },
  {
    title: "同一实例秒切",
    body: "回存当前号 → 停游戏 → 还原目标号 → 自动拉起，全程几秒，不用切换系统用户。",
  },
];

const STEPS = [
  {
    title: "安装并授权",
    body: "装好 APK 后打开，在 Magisk 或 KernelSU 的超级用户列表里给它授权。授权后应用会自动重启。",
  },
  {
    title: "登录第一个号",
    body: "点「登录新号」，应用会清空登录态并拉起游戏。扫码登录好之后回到应用，点「保存当前号」。",
  },
  {
    title: "重复到所有号都存好",
    body: "每加一个号重复上一步。应用会在清空前自动回存当前号，不会弄丢已登录的账号。",
  },
  {
    title: "之后只用列表",
    body: "点「切换」即可换号，不再需要扫码。当前号那一行是「启动」，直接打开游戏。",
  },
];

const RISKS = [
  {
    title: "必须 Root",
    body: "登录态存在游戏的私有目录里，Android 沙箱不允许其他应用读写。没有 root 无法实现，这是系统限制而非功能取舍。",
  },
  {
    title: "切换会强制停止游戏",
    body: "切号要替换游戏数据目录，因此会先 force-stop。对局中误触会直接掉线。",
  },
  {
    title: "自行判断账号风险",
    body: "本工具仅用于管理自己的账号。频繁切换是否触发游戏方的风控，需自行判断和控制频率。",
  },
];

/// 版本号优先用构建期注入的值；本地 dev 没注入时回退查最新 release。
function useVersion() {
  const injected = import.meta.env.VITE_APP_VERSION;
  const [version, setVersion] = useState(injected ?? "");

  useEffect(() => {
    if (injected) return;
    let alive = true;
    fetch(`https://api.github.com/repos/${REPO}/releases/latest`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((j: { tag_name?: string }) => {
        if (alive) setVersion(String(j.tag_name ?? "").replace(/^v/, ""));
      })
      .catch(() => alive && setVersion(""));
    return () => {
      alive = false;
    };
  }, [injected]);

  return version;
}

export default function App() {
  const version = useVersion();

  return (
    <div className="wrap">
      <header>
        <div className="mark">
          <SwapIcon size={46} color="var(--gold)" />
        </div>
        <h1>LOLM 账号切换器</h1>
        <p className="tagline">
          英雄联盟手游同机多账号切换。把每个号的登录态存成快照，
          扫一次码存下来，之后切号免扫码、几秒完成。
        </p>

        <div className="badges">
          <span className="badge ok">
            <i className="dot" />
            {version ? `v${version}` : "—"}
          </span>
          <span className="badge">Android 7.0+</span>
          <span className="badge">需要 Root</span>
          <span className="badge">arm64</span>
        </div>

        <div className="cta">
          <a className="btn btn-primary" href={DOWNLOAD}>
            <DownloadIcon />
            下载 APK
          </a>
          <a className="btn" href={`https://github.com/${REPO}`}>
            源码
          </a>
          <a className="btn" href={`https://github.com/${REPO}/releases`}>
            历史版本
          </a>
        </div>
        <p className="cta-note">
          仅提供 arm64 包（现代手机都是这个架构）。安装后需在 Magisk 或 KernelSU 中授予 root 权限。
        </p>
      </header>

      <section>
        <h2>它解决什么</h2>
        <div className="grid">
          {FEATURES.map((f) => (
            <div className="card" key={f.title}>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2>界面</h2>
        <Preview />
      </section>

      <section>
        <h2>怎么用</h2>
        <ol className="steps">
          {STEPS.map((s) => (
            <li key={s.title}>
              <b>{s.title}</b>
              <span>{s.body}</span>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2>限制与风险</h2>
        <div className="warn">
          {RISKS.map((r) => (
            <div key={r.title}>
              <h3>{r.title}</h3>
              <p>{r.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer>
        开源于 <a href={`https://github.com/${REPO}`}>github.com/{REPO}</a>
        <br />
        与 Riot Games、腾讯均无关联。
      </footer>
    </div>
  );
}
