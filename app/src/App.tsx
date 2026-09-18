import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, errMsg } from "./api";
import type { CheckResult, SlotIndex, PageState, Route } from "./types";
import { nextSlotId } from "./lib/format";
import Icon from "./components/Icon";
import SlotCard from "./components/SlotCard";
import Page from "./components/Page";
import EditPage from "./components/EditPage";
import AboutPage from "./components/AboutPage";

type Kind = "ok" | "err" | "warn" | "info";
interface BannerState {
  msg: string;
  kind: Kind;
}

export default function App() {
  const [check, setCheck] = useState<CheckResult | null>(null);
  const [checkErr, setCheckErr] = useState<string | null>(null);
  const [index, setIndex] = useState<SlotIndex>({ active: null, slots: [] });
  const [busy, setBusy] = useState<string | null>(null);
  const [banner, setBanner] = useState<BannerState | null>(null);
  const [page, setPage] = useState<PageState | null>(null);
  const [route, setRoute] = useState<Route>({ kind: "home" });
  const [version, setVersion] = useState("");

  const bannerTimer = useRef<number | undefined>(undefined);

  const toast = useCallback((msg: string, kind: Kind = "info", ms = 2800) => {
    setBanner({ msg, kind });
    window.clearTimeout(bannerTimer.current);
    if (ms) bannerTimer.current = window.setTimeout(() => setBanner(null), ms);
  }, []);

  const askConfirm = useCallback(
    (title: string, message: string, ok = "确定", danger = false) =>
      new Promise<boolean>((resolve) => setPage({ title, message, danger, ok, resolve })),
    [],
  );

  const refresh = useCallback(async () => {
    try {
      setIndex(await api.listSlots());
    } catch (e) {
      toast(`读取列表失败：${errMsg(e)}`, "err", 4000);
    }
  }, [toast]);

  const doCheck = useCallback(async () => {
    try {
      const r = await api.check();
      setCheck(r);
      setCheckErr(null);
      return r;
    } catch (e) {
      setCheck(null);
      setCheckErr(errMsg(e));
      return null;
    }
  }, []);

  /// 统一包一层：全局忙碌遮罩 + 日志 + toast，避免每个操作重复五行样板。
  const run = useCallback(
    async (busyMsg: string, okMsg: string | null, fn: () => Promise<string>) => {
      if (!check && !(await doCheck())) {
        toast("未获得 root，操作已取消", "err");
        return false;
      }
      setBusy(busyMsg);
      try {
        const msg = await fn();
        toast(okMsg ?? msg, "ok");
        await refresh();
        return true;
      } catch (e) {
        toast(errMsg(e), "err", 4200);
        return false;
      } finally {
        setBusy(null);
      }
    },
    [check, doCheck, toast, refresh],
  );

  // ---------------- 首页两个一键操作 ----------------

  const doSave = useCallback(async () => {
    const slot = nextSlotId(index.slots.map((s) => s.slot));
    const name = `账号 ${index.slots.length + 1}`;
    const ok = await run(`正在保存「${name}」`, null, () => api.saveSlot(slot, name));
    if (ok) toast(`已保存为「${name}」，可在编辑里改名`, "ok", 3600);
  }, [index.slots, run, toast]);

  const doSwitch = useCallback(
    (slot: string) => {
      const name = index.slots.find((s) => s.slot === slot)?.name ?? slot;
      return run(`正在切换到「${name}」`, `已切换到「${name}」`, () => api.switchSlot(slot));
    },
    [index.slots, run],
  );

  // 只是拉起游戏，不动数据也不改状态，所以不走 run 的忙碌遮罩
  const doLaunch = useCallback(async () => {
    try {
      await api.launch();
      toast("已启动游戏", "ok");
    } catch (e) {
      toast(errMsg(e), "err", 4000);
    }
  }, [toast]);

  // ---------------- 编辑页操作 ----------------

  const doRename = useCallback(
    async (slot: string, name: string) => {
      await run("正在改名", "已改名", () => api.renameSlot(slot, name));
    },
    [run],
  );

  /// 登录新号：回存当前号 → 清空登录态 → 拉起游戏到扫码界面。
  /// 当前号没被保存过时，清空就等于把它弄丢了，所以要重点警告。
  const doNewLogin = useCallback(async () => {
    const unsaved = index.active === null;
    const ok = await askConfirm(
      "登录新号",
      unsaved
        ? "当前登录的号还没有保存过。\n\n清空登录态后它会丢失，需要重新找人扫码才能拿回来。建议先点「保存当前号」再来登录新号。\n\n确定要清空吗？"
        : "会先把当前号的最新状态回存，再清空登录态并拉起游戏。\n\n游戏会回到扫码登录界面，登录好新号后回来点「保存当前号」存成一个新槽位。",
      unsaved ? "仍要清空" : "继续",
      unsaved,
    );
    if (!ok) return;
    await run("正在清空登录态", "已拉起游戏，请扫码登录新号", () => api.newLogin());
  }, [index.active, askConfirm, run]);

  const doDelete = useCallback(
    async (slot: string, name: string) => {
      const ok = await askConfirm(
        "删除账号",
        `确认删除「${name}」的快照？\n\n删除后需要重新扫码登录才能拿回这个号。如果之前导出过备份，可以从备份导入找回。`,
        "删除",
        true,
      );
      if (!ok) return;
      if (await run("正在删除", "已删除", () => api.deleteSlot(slot))) {
        setRoute({ kind: "home" });
      }
    },
    [askConfirm, run],
  );

  useEffect(() => {
    void refresh();
    void doCheck();
    void api.version().then(setVersion).catch(() => setVersion(""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 当前号置顶，其余按最近保存时间倒序——号多时最常用的在最上面
  const sorted = useMemo(
    () =>
      [...index.slots].sort((a, b) => {
        if (a.slot === index.active) return -1;
        if (b.slot === index.active) return 1;
        return Number(b.updated_at_ms) - Number(a.updated_at_ms);
      }),
    [index],
  );

  const editing = route.kind === "edit" ? index.slots.find((s) => s.slot === route.slot) : undefined;
  const status = check
    ? { text: "就绪", cls: "ok" }
    : checkErr
      ? { text: "未获得 Root", cls: "err" }
      : { text: "检测中", cls: "" };

  return (
    <div className="container">
      <header className="appbar">
        <div className="appbar-inner">
          <div className="brand">
            <div className="brand-mark">
              <Icon name="swap" size={19} />
            </div>
            <div className="brand-text">
              <h1>LOLM 账号切换器</h1>
              <p>{index.slots.length > 0 ? `${index.slots.length} 个账号` : "同机多账号 · 一键切换"}</p>
            </div>
          </div>
          <button
            className={`status ${status.cls}`}
            onClick={() => setRoute({ kind: "about" })}
            aria-label="关于"
          >
            <span className="dot" />
            {status.text}
            <Icon name="chevronRight" size={14} />
          </button>
        </div>
      </header>

      {banner && (
        <div className={`toast ${banner.kind}`}>
          <Icon
            name={banner.kind === "ok" ? "check" : banner.kind === "info" ? "info" : "alert"}
            size={17}
          />
          <span>{banner.msg}</span>
        </div>
      )}

      {checkErr ? (
        <section className="blocked">
          <div className="icon-wrap">
            <Icon name="lock" size={24} />
          </div>
          <h2>未获得 Root 权限</h2>
          <p className="reason">{checkErr}</p>
          <p className="note">
            本应用靠 root 读写游戏的登录态目录来实现免扫码切号，没有 root 无法工作。
            请在 Magisk 或 KernelSU 的超级用户列表里给本应用授权，再点下面重试。
          </p>
          <button className="btn btn-primary btn-block" onClick={doCheck}>
            <Icon name="refresh" size={18} />
            重新自检
          </button>
        </section>
      ) : check && !check.game_installed ? (
        <section className="blocked">
          <div className="icon-wrap">
            <Icon name="alert" size={24} />
          </div>
          <h2>未找到英雄联盟手游</h2>
          <p className="reason">{check.problem}</p>
          <p className="note">
            Root 已就绪，但读不到 com.tencent.lolm 的数据目录。请确认游戏已安装、
            并且至少启动登录过一次（刚装完没进过游戏时数据目录可能还是空的）。
          </p>
          <button className="btn btn-primary btn-block" onClick={doCheck}>
            <Icon name="refresh" size={18} />
            重新自检
          </button>
        </section>
      ) : (
        <>
          {sorted.length === 0 ? (
            <div className="empty">
              <div className="icon-wrap">
                <Icon name="users" size={24} />
              </div>
              <h2>还没有保存的账号</h2>
              <p className="note">
                点「登录新号」会清空登录态并拉起游戏，扫码登录好之后回来点「保存当前号」存下来。
                以后切回这个号就不用再扫码了。
              </p>
            </div>
          ) : (
            <div className="accounts">
              {sorted.map((s) => (
                <SlotCard
                  key={s.slot}
                  slot={s}
                  active={index.active === s.slot}
                  busy={!!busy}
                  onSwitch={doSwitch}
                  onLaunch={doLaunch}
                  onEdit={(slot) => setRoute({ kind: "edit", slot })}
                />
              ))}
            </div>
          )}

          <div className="fab-bar">
            <div className="fab-inner">
              <button className="btn" disabled={!!busy || !check} onClick={doNewLogin}>
                <Icon name="userPlus" size={18} />
                登录新号
              </button>
              <button className="btn btn-primary" disabled={!!busy || !check} onClick={doSave}>
                <Icon name="plus" size={18} />
                保存当前号
              </button>
            </div>
          </div>
        </>
      )}

      {editing && (
        <EditPage
          key={editing.slot}
          slot={editing}
          active={index.active === editing.slot}
          busy={!!busy}
          onBack={() => setRoute({ kind: "home" })}
          onRename={doRename}
          onDelete={doDelete}
        />
      )}

      {route.kind === "about" && (
        <AboutPage
          check={check}
          checkErr={checkErr}
          version={version}
          onBack={() => setRoute({ kind: "home" })}
        />
      )}

      {page && (
        <Page
          state={page}
          onCancel={() => {
            page.resolve(false);
            setPage(null);
          }}
          onOk={() => {
            page.resolve(true);
            setPage(null);
          }}
        />
      )}

      {busy && (
        <div className="busy">
          <div className="busy-box">
            <div className="spinner" />
            <div className="busy-msg">{busy}…</div>
            <div className="busy-sub">正在操作游戏数据，请勿退出</div>
          </div>
        </div>
      )}
    </div>
  );
}
