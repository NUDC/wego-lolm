import { useCallback, useEffect, useRef, useState } from "react";
import { api, errMsg } from "./api";
import type { CheckResult, SlotIndex, PrivStatus, PageState } from "./types";
import SlotCard from "./components/SlotCard";
import Page from "./components/Page";
import MultiUserGuide from "./components/MultiUserGuide";
import MultiUserAuto from "./components/MultiUserAuto";

type Kind = "ok" | "err" | "warn" | "info";
interface BannerState {
  msg: string;
  kind: Kind;
}
interface LogEntry {
  time: string;
  msg: string;
  kind: Kind;
}

export interface InputOpts {
  label?: string;
  placeholder?: string;
  initial?: string;
  ok?: string;
}
export interface ConfirmOpts {
  danger?: boolean;
  ok?: string;
}

export default function App() {
  const [check, setCheck] = useState<CheckResult | null>(null);
  const [checkErr, setCheckErr] = useState<string | null>(null);
  const [index, setIndex] = useState<SlotIndex>({ active: null, slots: [] });
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<BannerState | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [page, setPage] = useState<PageState | null>(null);
  const [saveSlot, setSaveSlot] = useState("");
  const [saveName, setSaveName] = useState("");
  const [priv, setPriv] = useState<PrivStatus | null>(null);
  const [startCmd, setStartCmd] = useState<string>("");

  const bannerTimer = useRef<number | undefined>(undefined);
  const rooted = !!check?.root;
  const isMultiUser = check?.mode === "multiuser";

  const log = useCallback((msg: string, kind: Kind = "info") => {
    setLogs((prev) =>
      [{ time: new Date().toLocaleTimeString(), msg, kind }, ...prev].slice(0, 60),
    );
  }, []);

  const toast = useCallback((msg: string, kind: Kind = "info", ms = 2800) => {
    setBanner({ msg, kind });
    window.clearTimeout(bannerTimer.current);
    if (ms) bannerTimer.current = window.setTimeout(() => setBanner(null), ms);
  }, []);

  // 页面式输入 / 确认（替代弹窗）
  const askInput = useCallback(
    (title: string, opts: InputOpts = {}) =>
      new Promise<string | null>((resolve) =>
        setPage({
          kind: "input",
          title,
          label: opts.label,
          placeholder: opts.placeholder,
          value: opts.initial ?? "",
          ok: opts.ok ?? "确定",
          resolve,
        }),
      ),
    [],
  );
  const askConfirm = useCallback(
    (title: string, message: string, opts: ConfirmOpts = {}) =>
      new Promise<boolean>((resolve) =>
        setPage({ kind: "confirm", title, message, danger: opts.danger, ok: opts.ok ?? "确定", resolve }),
      ),
    [],
  );

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
        toast("建议在 Magisk 排除列表勾选 com.tencent.lolm，降低被 ACE 检测", "warn", 6000);
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

  const openUserSettings = useCallback(
    () => toast("请前往：设置 → 系统 → 多个用户", "info", 5000),
    [toast],
  );

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
    async (slot: string, _active: boolean) => {
      if (!(await guardRoot())) return toast("未获得 root，无法切换", "err");
      setBusy(true);
      log(`切换到 '${slot}'…`);
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
    async (slot: string, curName: string) => {
      const value = await askInput("重命名账号", { label: "昵称", initial: curName, ok: "保存" });
      if (!value) return;
      try {
        const msg = await api.renameSlot(slot, value);
        log(msg, "ok");
        await refresh();
      } catch (e) {
        toast(`重命名失败：${errMsg(e)}`, "err");
      }
    },
    [askInput, toast, log, refresh],
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
      const ok = await askConfirm("删除账号", `确认删除「${name}」\nslot：${slot} 的快照？`, {
        danger: true,
        ok: "删除",
      });
      if (!ok) return;
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
    [askConfirm, toast, log, refresh],
  );

  useEffect(() => {
    void refresh();
    void doCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const status = rooted
    ? { text: "Root 已就绪", cls: "ok" }
    : isMultiUser
      ? { text: "免 Root 模式", cls: "" }
      : checkErr
        ? { text: "未获得 Root", cls: "err" }
        : { text: "未连接", cls: "" };

  return (
    <div className="container">
      <header className="appbar">
        <div className="brand">
          <div className="logo">🎮</div>
          <div className="brand-text">
            <h1>LOLM 账号切换器</h1>
            <p>同机多账号 · 一键切换</p>
          </div>
        </div>
        <span className={`status ${status.cls}`}>
          <span className="dot" />
          {status.text}
        </span>
      </header>

      {banner && (
        <div className={`toast ${banner.kind}`}>
          <span>{banner.kind === "ok" ? "✅" : banner.kind === "err" ? "⚠️" : banner.kind === "warn" ? "💡" : "ℹ️"}</span>
          <span>{banner.msg}</span>
        </div>
      )}

      <section className="card">
        <div className="toolbar">
          <button className="btn btn-primary" disabled={busy} onClick={doCheck}>
            🔍 自检
          </button>
          {!isMultiUser && (
            <>
              <button className="btn btn-ghost" disabled={busy} onClick={refresh}>
                ↻ 刷新
              </button>
              <button className="btn btn-ghost" disabled={busy} onClick={doImport}>
                📥 导入
              </button>
            </>
          )}
        </div>

        {check?.mode === "root" && (
          <div className="stats">
            <div className="stat">
              <div className="k">游戏 UID / GID</div>
              <div className="v">
                {check.uid}/{check.gid}
              </div>
            </div>
            <div className="stat">
              <div className="k">Magisk</div>
              <div className="v">{check.magisk_version || "未知"}</div>
            </div>
            <div className="stat">
              <div className="k">DenyList 隐藏</div>
              <div className={`v ${check.denylisted ? "ok" : "warn"}`}>
                {check.denylisted ? "已加入" : "未加入"}
              </div>
            </div>
            <div className="stat">
              <div className="k">游戏运行中</div>
              <div className="v">{check.running ? "是" : "否"}</div>
            </div>
            <div className="stat wide">
              <div className="k">快照集</div>
              <div className="v">{check.subdirs.join("  ·  ")}</div>
            </div>
          </div>
        )}
        {checkErr && (
          <div className="stats">
            <div className="stat wide">
              <div className="k">自检失败</div>
              <div className="v warn">{checkErr}</div>
            </div>
          </div>
        )}
      </section>

      {isMultiUser ? (
        priv?.running ? (
          <MultiUserAuto toast={toast} askInput={askInput} askConfirm={askConfirm} />
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
            <div className="card-title">
              <h2>账号列表</h2>
              {index.slots.length > 0 && <span className="count">{index.slots.length} 个</span>}
            </div>
            {index.slots.length === 0 ? (
              <div className="empty">
                <div className="em">👤</div>
                <p>还没有保存的账号</p>
                <p>在游戏里登录后，用下方「保存当前号」</p>
              </div>
            ) : (
              <div className="list">
                {index.slots.map((s) => (
                  <SlotCard
                    key={s.slot}
                    slot={s}
                    active={index.active === s.slot}
                    busy={busy}
                    onSwitch={doSwitch}
                    onRename={doRename}
                    onExport={doExport}
                    onDelete={doDelete}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="card">
            <div className="card-title">
              <h2>保存当前登录的账号</h2>
            </div>
            <p className="subtle" style={{ marginBottom: 14 }}>
              登录好某个号并进入大厅后，填写标识保存。
            </p>
            <div className="field">
              <label>slot 标识</label>
              <input
                type="text"
                placeholder="如 a / main"
                value={saveSlot}
                onChange={(e) => setSaveSlot(e.target.value)}
              />
            </div>
            <div className="field">
              <label>昵称（可选）</label>
              <input
                type="text"
                placeholder="如 大号"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
              />
            </div>
            <button className="btn btn-primary btn-block" disabled={busy} onClick={doSave}>
              💾 保存当前号
            </button>
          </section>
        </>
      )}

      <details className="log-card">
        <summary>操作日志</summary>
        <div className="log">
          {logs.length === 0 ? (
            <div className="log-line">暂无日志</div>
          ) : (
            logs.map((l, i) => (
              <div key={i} className={`log-line ${l.kind}`}>
                <span className="ts">{l.time}</span>
                {l.msg}
              </div>
            ))
          )}
        </div>
      </details>

      {page && (
        <Page
          state={page}
          onCancel={() => {
            page.kind === "input" ? page.resolve(null) : page.resolve(false);
            setPage(null);
          }}
          onOk={(value) => {
            page.kind === "input" ? page.resolve(value) : page.resolve(true);
            setPage(null);
          }}
        />
      )}
    </div>
  );
}
