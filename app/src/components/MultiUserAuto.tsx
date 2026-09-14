import { useCallback, useEffect, useState } from "react";
import { mu } from "../lib/mu";
import { errMsg } from "../api";
import type { AndroidUser } from "../types";

type Kind = "ok" | "err" | "warn" | "info";
interface Props {
  toast: (msg: string, kind?: Kind) => void;
}

export default function MultiUserAuto({ toast }: Props) {
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
    const name = prompt("新用户名（如 小号）");
    if (!name) return;
    setBusy(true);
    try {
      const id = await mu.createUser(name);
      await mu.installLolm(id);
      await mu.installSelf(id); // 切换器也装进新用户，切过去后仍能切回
      toast(`已创建用户 ${id}，装好 LOLM + 切换器，切过去登录另一个号`, "ok");
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
    if (!confirm(`删除用户「${u.name}」(id ${u.id}) 及其全部数据？`)) return;
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
      <div className="card-head">
        <h2>多用户（Shizuku 自动）</h2>
        <span className="chip chip-ok">免 root · 已就绪</span>
      </div>
      <p className="hint">
        每个用户是独立系统、独立 LOLM 登录，对 ACE 最友好。切号 = 切用户，一键完成。
      </p>

      <div className="toolbar" style={{ marginTop: 10 }}>
        <button className="primary" disabled={busy} onClick={addAndInstall}>
          + 新建用户并装 LOLM
        </button>
        <button className="ghost" disabled={busy} onClick={refresh}>
          刷新
        </button>
      </div>

      <div className="slots" style={{ marginTop: 12 }}>
        {users.map((u) => (
          <div className={`slot${u.current ? " active" : ""}`} key={u.id}>
            <div className="slot-main">
              <div className="slot-name">
                {u.name}
                {u.current && <span className="badge">当前</span>}
              </div>
              <div className="slot-meta">
                用户 id: {u.id}
                {u.running ? " · 运行中" : ""}
                {u.id === 0 ? " · 主用户" : ""}
              </div>
            </div>
            <div className="slot-actions">
              <button
                className="primary"
                disabled={busy || u.current}
                onClick={() => doSwitch(u.id)}
              >
                {u.current ? "使用中" : "切换"}
              </button>
              {u.id !== 0 && (
                <button className="danger" disabled={busy} onClick={() => doRemove(u)}>
                  删除
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
