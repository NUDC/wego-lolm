// 与 Rust 后端序列化字段一一对应（serde 默认 snake_case）

/// 自检成功即代表 root 已就绪；无 root 时后端直接抛错。
export interface CheckResult {
  game_installed: boolean;
  problem: string;
  uid: string;
  gid: string;
  subdirs: string[];
  running: boolean;
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

// 路由：首页 = 账号列表，其余都是整页切换
export type Route =
  | { kind: "home" }
  | { kind: "edit"; slot: string }
  | { kind: "about" };

// 确认页（替代弹窗）。改名等输入已内联到编辑页，不再需要输入态。
export interface PageState {
  title: string;
  message: string;
  danger: boolean;
  ok: string;
  resolve: (v: boolean) => void;
}
