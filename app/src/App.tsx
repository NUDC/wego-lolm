import { useCallback, useEffect, useRef, useState } from "react";
import { api, errMsg } from "./api";
import type { CheckResult, SlotIndex, PrivStatus } from "./types";
import SlotCard from "./components/SlotCard";
import Modal from "./components/Modal";
import MultiUserGuide from "./components/MultiUserGuide";
import MultiUserAuto from "./components/MultiUserAuto";

type BannerKind = "ok" | "err" | "warn" | "info";
interface BannerState {
  msg: string;
  kind: BannerKind;
}
interface LogEntry {
  time: string;
  msg: string;
  kind: BannerKind;
}
interface RenameState {
  slot: string;
  name: string;
}

export default function App() {
  const [check, setCheck] = useState<CheckResult | null>(null);
  const [checkErr, setCheckErr] = useState<string | null>(null);
  const [index, setIndex] = useState<SlotIndex>({ active: null, slots: [] });
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<BannerState | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [rename, setRename] = useState<RenameState | null>(null);
  const [saveSlot, setSaveSlot] = useState("");
  const [saveName, setSaveName] = useState("");
  const [priv, setPriv] = useState<PrivStatus | null>(null);
  const [startCmd, setStartCmd] = useState<string>("");

  const bannerTimer = useRef<number | undefined>(undefined);

  const rooted = !!check?.root;

  const log = useCallback((msg: string, kind: BannerKind = "info") => {
    setLogs((prev) =>
      [{ time: new Date().toLocaleTimeString(), msg, kind }, ...prev].slice(0, 60),
    );
  }, []);

  const toast = useCallback((msg: string, kind: BannerKind = "info", ms = 2800) => {
    setBanner({ msg, kind });
    window.clearTimeout(bannerTimer.current);
    if (ms) bannerTimer.current = window.setTimeout(() => setBanner(null), ms);
  }, []);

  const refresh = useCallback(async () => {
    try {
      setIndex(await api.listSlots());
    } catch (e) {
      log(`读取列表失败：${errMsg(e)}`, "err");
    }
  }, [log]);

  const doCheck = useCallback(async () => {
    try {
      const r = await api.check();
      setCheck(r);
      setCheckErr(null);
      log("自检通过", "ok");
      if (r.mode === "root" && !r.denylisted) {
        toast(
          "建议在 Magisk → 排除列表(DenyList) 勾选 com.tencent.lolm，降低被 ACE 检测",
          "warn",
          6000,
        );
      }
      if (r.mode === "multiuser") {
        try {
          setPriv(await api.priv.status());
        } catch {
          setPriv({ running: false });
        }
        try {
          setStartCmd((await api.priv.getStartCommand()).command);
        } catch {
          setStartCmd("");
        }
      }
      return r;
    } catch (e) {
      setCheck(null);
      setCheckErr(errMsg(e));
      log(`自检失败：${errMsg(e)}`, "err");
      return null;
    }
  }, [log, toast]);

  const guardRoot = useCallback(async () => {
    if (rooted) return true;
    const r = await doCheck();
    return !!r?.root;
  }, [rooted, doCheck]);

  const doSave = useCallback(async () => {
    const slot = saveSlot.trim();
    const name = saveName.trim();
    if (!slot) return toast("请填写 slot 标识", "err");
    if (!(await guardRoot())) return toast("未获得 root，无法保存", "err");
    setBusy(true);
    log(`保存 '${slot}' 中…（会先强停游戏）`);
    try {
      const msg = await api.saveSlot(slot, name || null);
      log(msg, "ok");
      toast("保存成功", "ok");
      setSaveSlot("");
      setSaveName("");
      await refresh();
    } catch (e) {
      log(`保存失败：${errMsg(e)}`, "err");
      toast(`保存失败：${errMsg(e)}`, "err", 4000);
    } finally {
      setBusy(false);
    }
  }, [saveSlot, saveName, guardRoot, toast, log, refresh]);

  const doSwitch = useCallback(
    async (slot: string, active: boolean) => {
      if (!active && !confirm(`切换到「${slot}」？\n将强制关闭游戏、还原该号并重启游戏。`)) return;
      if (!(await guardRoot())) return toast("未获得 root，无法切换", "err");
      setBusy(true);
      log(`切换到 '${slot}'…（回存当前号→停游戏→还原→修属主/上下文→拉起）`);
      try {
        const msg = await api.switchSlot(slot);
        log(msg, "ok");
        toast(`已切换到 ${slot}`, "ok");
        await refresh();
      } catch (e) {
        log(`切换失败：${errMsg(e)}`, "err");
        toast(`切换失败：${errMsg(e)}`, "err", 4000);
      } finally {
        setBusy(false);
      }
    },
    [guardRoot, toast, log, refresh],
  );

  const doRename = useCallback(
    async (slot: string, value: string) => {
      setRename(null);
      if (!value) return;
      try {
        const msg = await api.renameSlot(slot, value);
        log(msg, "ok");
        await refresh();
      } catch (e) {
        toast(`重命名失败：${errMsg(e)}`, "err");
      }
    },
    [toast, log, refresh],
  );

  const doExport = useCallback(
    async (slot: string) => {
      if (!(await guardRoot())) return toast("未获得 root，无法导出", "err");
      setBusy(true);
      try {
        const msg = await api.exportSlot(slot);
        log(msg, "ok");
        toast("已导出到 /sdcard 备份", "ok", 3200);
      } catch (e) {
        toast(`导出失败：${errMsg(e)}`, "err");
      } finally {
        setBusy(false);
      }
    },
    [guardRoot, toast, log],
  );

  const doImport = useCallback(async () => {
    if (!(await guardRoot())) return toast("未获得 root，无法导入", "err");
    setBusy(true);
    try {
      const msg = await api.importBackups();
      log(msg, "ok");
      toast(msg, "ok");
      await refresh();
    } catch (e) {
      toast(`导入失败：${errMsg(e)}`, "err", 3600);
    } finally {
      setBusy(false);
    }
  }, [guardRoot, toast, log, refresh]);

  const doDelete = useCallback(
    async (slot: string, name: string) => {
      if (!confirm(`确认删除账号「${name}」(slot: ${slot}) 的快照？`)) return;
      setBusy(true);
      try {
        const msg = await api.deleteSlot(slot);
        log(msg, "ok");
        toast("已删除", "ok");
        await refresh();
      } catch (e) {
        toast(`删除失败：${errMsg(e)}`, "err");
      } finally {
        setBusy(false);
      }
    },
    [toast, log, refresh],
  );

  useEffect(() => {
    void refresh();
    void doCheck();
    // 仅首次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isMultiUser = check?.mode === "multiuser";
  const openUserSettings = useCallback(
    () => toast("请前往：设置 → 系统 → 多个用户，创建用户并在其中安装/登录 LOLM", "info", 6000),
    [toast],
  );

  const chip = rooted
    ? { text: "root 已授权", cls: "chip-ok" }
    : isMultiUser
      ? { text: "多用户模式", cls: "chip-idle" }
      : checkErr
        ? { text: "未获得 root", cls: "chip-err" }
        : { text: "未连接", cls: "chip-idle" };

  return (
    <main className="container">
      <header>
        <div className="title-row">
          <h1>LOLM 账号切换器</h1>
          <span className={`chip ${chip.cls}`}>{chip.text}</span>
        </div>
        <p className="sub">同机本地 · 需 root 授权</p>
      </header>

      {banner && <div className={`banner ${banner.kind}`}>{banner.msg}</div>}

      <section className="card">
        <div className="toolbar">
          <button className="primary" disabled={busy} onClick={doCheck}>
            自检
          </button>
          {!isMultiUser && (
            <>
              <button className="ghost" disabled={busy} onClick={refresh}>
                刷新
              </button>
              <button className="ghost" disabled={busy} onClick={doImport}>
                从备份导入
              </button>
            </>
          )}
        </div>
        {check?.mode === "root" && (
          <div className="info">
            {`游戏包：${check.package}  uid/gid=${check.uid}/${check.gid}\n`}
            {`Magisk：${check.magisk_version || "未知"}\n`}
            {`DenyList 隐藏：${check.denylisted ? "已加入 ✔" : "未加入 ✘（建议加入防 ACE）"}\n`}
            {`快照最小集：${check.subdirs.join(", ")}\n`}
            {`游戏运行中：${check.running ? "是" : "否"}`}
          </div>
        )}
        {checkErr && <div className="info err-text">{`✘ ${checkErr}`}</div>}
      </section>

      {isMultiUser ? (
        priv?.running ? (
          <MultiUserAuto toast={toast} />
        ) : (
          <MultiUserGuide
            startCommand={startCmd}
            onRecheck={doCheck}
            onOpenSettings={openUserSettings}
            onToast={toast}
          />
        )
      ) : (
        <>
          <section className="card">
            <div className="card-head">
              <h2>账号列表</h2>
              <span className="muted">{index.slots.length ? `${index.slots.length} 个` : ""}</span>
            </div>
            {index.slots.length === 0 ? (
              <p className="hint">还没有保存的账号。在游戏里登录后，用下方“保存当前号”。</p>
            ) : (
              <div className="slots">
                {index.slots.map((s) => (
                  <SlotCard
                    key={s.slot}
                    slot={s}
                    active={index.active === s.slot}
                    busy={busy}
                    onSwitch={doSwitch}
                    onRename={(slot, name) => setRename({ slot, name })}
                    onExport={doExport}
                    onDelete={doDelete}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="card">
            <h2>保存当前登录的账号</h2>
            <p className="hint">在设备上登录好某个号并进入大厅后，填写标识并保存。</p>
            <div className="form-row">
              <input
                type="text"
                placeholder="slot 标识（如 a / main）"
                value={saveSlot}
                onChange={(e) => setSaveSlot(e.target.value)}
              />
              <input
                type="text"
                placeholder="昵称（可选，如 大号）"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
              />
              <button className="primary" disabled={busy} onClick={doSave}>
                保存当前号
              </button>
            </div>
          </section>
        </>
      )}

      <details className="card log-card">
        <summary>操作日志</summary>
        <div className="log">
          {logs.map((l, i) => (
            <div key={i} className={`log-line ${l.kind}`}>
              [{l.time}] {l.msg}
            </div>
          ))}
        </div>
      </details>

      {rename && (
        <Modal
          title={`重命名「${rename.name}」`}
          initial={rename.name}
          onOk={(v) => doRename(rename.slot, v)}
          onCancel={() => setRename(null)}
        />
      )}
    </main>
  );
}
