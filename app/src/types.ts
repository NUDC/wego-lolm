// 与 Rust 后端序列化字段一一对应（serde 默认 snake_case）

export interface CheckResult {
  mode: "root" | "multiuser";
  root: boolean;
  uid: string;
  gid: string;
  package: string;
  subdirs: string[];
  device_slot_root: string;
  running: boolean;
  magisk_version: string;
  denylisted: boolean;
}

export interface SlotMeta {
  slot: string;
  name: string;
  updated_at_ms: number;
  uid: string;
  subdirs: string[];
  size_kb: number;
  user_id: string;
}

export interface SlotIndex {
  active: string | null;
  slots: SlotMeta[];
}

// 自建特权服务（免 root 多用户）
export interface PrivStatus {
  running: boolean;
}

export interface StartCommand {
  command: string;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  code: number;
}

export interface AndroidUser {
  id: number;
  name: string;
  running: boolean;
  current: boolean;
}
