import { invoke } from "@tauri-apps/api/core";
import type { CheckResult, SlotIndex, PrivStatus, StartCommand, ExecResult } from "./types";

// Tauri 命令封装（camelCase 参数会自动映射到 Rust 的 snake_case）
export const api = {
  check: () => invoke<CheckResult>("check"),
  listSlots: () => invoke<SlotIndex>("list_slots"),
  saveSlot: (slot: string, name: string | null) =>
    invoke<string>("save_slot", { slot, name }),
  switchSlot: (slot: string, noSaveCurrent = false) =>
    invoke<string>("switch_slot", { slot, noSaveCurrent }),
  renameSlot: (slot: string, name: string) =>
    invoke<string>("rename_slot", { slot, name }),
  exportSlot: (slot: string) => invoke<string>("export_slot", { slot }),
  importBackups: () => invoke<string>("import_backups"),
  deleteSlot: (slot: string) => invoke<string>("delete_slot", { slot }),

  // 自建特权服务（免 root shell 权限；由 ADB/无线调试启动）
  priv: {
    status: () => invoke<PrivStatus>("plugin:shizuku|status"),
    getStartCommand: () => invoke<StartCommand>("plugin:shizuku|get_start_command"),
    exec: (cmd: string) =>
      invoke<ExecResult>("plugin:shizuku|exec", { payload: { cmd } }),
  },
};

// 后端 Err(String) 会以异常抛出，这里统一转成可读文案
export function errMsg(e: unknown): string {
  if (typeof e === "string") return e;
  if (e instanceof Error) return e.message;
  return String(e);
}
