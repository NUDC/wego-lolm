import { invoke } from "@tauri-apps/api/core";
import type { CheckResult, SlotIndex } from "./types";

// Tauri 命令封装（camelCase 参数会自动映射到 Rust 的 snake_case）
export const api = {
  check: () => invoke<CheckResult>("check"),
  version: () => invoke<string>("app_version"),
  listSlots: () => invoke<SlotIndex>("list_slots"),
  saveSlot: (slot: string, name: string | null) =>
    invoke<string>("save_slot", { slot, name }),
  switchSlot: (slot: string) => invoke<string>("switch_slot", { slot }),
  launch: () => invoke<string>("launch"),
  newLogin: () => invoke<string>("new_login"),
  renameSlot: (slot: string, name: string) =>
    invoke<string>("rename_slot", { slot, name }),
  deleteSlot: (slot: string) => invoke<string>("delete_slot", { slot }),
};

// 后端 Err(String) 会以异常抛出，这里统一转成可读文案
export function errMsg(e: unknown): string {
  if (typeof e === "string") return e;
  if (e instanceof Error) return e.message;
  return String(e);
}
