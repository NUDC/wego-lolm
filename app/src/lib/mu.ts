// 多用户自动化：通过 Shizuku 的 shell 权限执行 pm/am
import { api } from "../api";
import type { AndroidUser } from "../types";

export const LOLM_PKG = "com.tencent.lolm";
export const SELF_PKG = "com.wego.lolmswitch"; // 切换器自身，需装进每个用户以便随处切号

export function parseUsers(out: string, current: number): AndroidUser[] {
  const users: AndroidUser[] = [];
  for (const line of out.split("\n")) {
    const i = line.indexOf("UserInfo{");
    if (i < 0) continue;
    const rest = line.slice(i + "UserInfo{".length);
    const close = rest.indexOf("}");
    if (close < 0) continue;
    const inner = rest.slice(0, close); // "0:机主:c13"
    const parts = inner.split(":");
    const id = parseInt(parts[0], 10);
    if (Number.isNaN(id)) continue;
    users.push({
      id,
      name: parts[1] ?? String(id),
      running: line.includes("running"),
      current: id === current,
    });
  }
  return users;
}

async function sh(cmd: string): Promise<string> {
  const r = await api.priv.exec(cmd);
  if (r.code !== 0) throw new Error(r.stderr || r.stdout || `命令失败(${r.code})：${cmd}`);
  return r.stdout;
}

export const mu = {
  listUsers: async (): Promise<AndroidUser[]> => {
    const curRaw = (await sh("am get-current-user")).trim();
    const cur = parseInt(curRaw, 10);
    const out = await sh("pm list users");
    return parseUsers(out, Number.isNaN(cur) ? -1 : cur);
  },
  createUser: async (name: string): Promise<number> => {
    const safe = name.trim().replace(/\s+/g, "_") || "user";
    const out = await sh(`pm create-user ${safe}`);
    const m = out.match(/id\s+(\d+)/);
    if (!m) throw new Error(`创建用户失败：${out.trim()}`);
    return parseInt(m[1], 10);
  },
  installLolm: (id: number) => sh(`pm install-existing --user ${id} ${LOLM_PKG}`),
  installSelf: (id: number) => sh(`pm install-existing --user ${id} ${SELF_PKG}`),
  switchUser: (id: number) => sh(`am switch-user ${id}`),
  removeUser: (id: number) => sh(`pm remove-user ${id}`),
};
