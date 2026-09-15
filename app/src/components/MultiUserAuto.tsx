import { useCallback, useEffect, useState } from "react";
import { mu } from "../lib/mu";
import { errMsg } from "../api";
import type { AndroidUser } from "../types";

type Kind = "ok" | "err" | "warn" | "info";
interface Props {
  toast: (msg: string, kind?: Kind) => void;
  askInput: (
    title: string,
    opts?: { label?: string; placeholder?: string; initial?: string; ok?: string },
  ) => Promise<string | null>;
  askConfirm: (
    title: string,
    message: string,
    opts?: { danger?: boolean; ok?: string },
  ) => Promise<boolean>;
}

export default function MultiUserAuto({ toast, askInput, askConfirm }: Props) {
  const [users, setUsers] = useState<AndroidUser[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setUsers(await mu.listUsers());
    } catch (e) {
      toast(`读取用户失败：${errMsg(e)}`, "err");
    }
  }, [toast]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addAndInstall = async () => {
    const name = await askInput("新建账号", {
      label: "用户名",
      placeholder: "如 小号",
      ok: "创建",
    });
    if (!name) return;
    setBusy(true);
    try {
      const id = await mu.createUser(name);
      await mu.installLolm(id);
      await mu.installSelf(id);
      toast(`已创建用户 ${id}，装好 LOLM + 切换器`, "ok");
      await refresh();
    } catch (e) {
      toast(`创建失败：${errMsg(e)}`, "err");
    } finally {
      setBusy(false);
    }
  };

  const doSwitch = async (id: number) => {
    setBusy(true);
    try {
      await mu.switchUser(id);
      toast(`已切换到用户 ${id}`, "ok");
      await refresh();
    } catch (e) {
      toast(`切换失败：${errMsg(e)}`, "err");
    } finally {
      setBusy(false);
    }
  };

  const doRemove = async (u: AndroidUser) => {
    if (u.id === 0) return;
    const ok = await askConfirm("删除用户", `删除「${u.name}」\n用户 id ${u.id} 及其全部数据？`, {
      danger: true,
      ok: "删除",
    });
    if (!ok) return;
    setBusy(true);
    try {
      await mu.removeUser(u.id);
      toast("已删除用户", "ok");
      await refresh();
    } catch (e) {
      toast(`删除失败：${errMsg(e)}`, "err");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card">
      <div className="card-title">
        <h2>多用户切换</h2>
        <span className="status ok">
          <span className="dot" />
          免 Root 已就绪
        </span>
      </div>
      <p className="subtle">每个号跑在独立系统、独立登录，对反作弊最友好。切号 = 切用户。</p>

      <div className="toolbar" style={{ marginTop: 14 }}>
        <button className="btn btn-primary" disabled={busy} onClick={addAndInstall}>
          ➕ 新建账号
        </button>
        <button className="btn btn-ghost" disabled={busy} onClick={refresh}>
          ↻ 刷新
        </button>
      </div>

      <div className="list" style={{ marginTop: 14 }}>
        {users.map((u) => (
          <div className={`row${u.current ? " active" : ""}`} key={u.id}>
            <div className="avatar">{(u.name || String(u.id)).charAt(0)}</div>
            <div className="row-main">
              <div className="row-name">
                {u.name}
                {u.current && <span className="tag">当前</span>}
              </div>
              <div className="row-meta">
                用户 {u.id}
                {u.running ? "  ·  运行中" : ""}
                {u.id === 0 ? "  ·  主用户" : ""}
              </div>
            </div>
            <div className="row-actions">
              <button
                className="btn btn-primary btn-sm"
                disabled={busy || u.current}
                onClick={() => doSwitch(u.id)}
              >
                {u.current ? "使用中" : "切换"}
              </button>
              {u.id !== 0 && (
                <button className="icon-btn danger" title="删除" disabled={busy} onClick={() => doRemove(u)}>
                  🗑
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
