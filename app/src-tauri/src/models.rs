//! 数据结构与通用工具。

use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

pub(crate) fn now_ms() -> u128 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis())
        .unwrap_or(0)
}

/// 单个账号快照的元数据。
#[derive(Serialize, Deserialize, Clone, Default)]
pub(crate) struct SlotMeta {
    pub slot: String,
    pub name: String,
    #[serde(default)]
    pub updated_at_ms: u128,
    #[serde(default)]
    pub uid: String,
    #[serde(default)]
    pub subdirs: Vec<String>,
    #[serde(default)]
    pub size_kb: u64,
    #[serde(default)]
    pub user_id: String,
}

/// PC/应用侧的快照索引（当前活动号 + 全部 slot）。
#[derive(Serialize, Deserialize, Default)]
pub(crate) struct Index {
    pub active: Option<String>,
    pub slots: Vec<SlotMeta>,
}

/// 自检结果。返回 Ok 即代表 root 已就绪；无 root 时 `check` 直接返回 Err。
/// root 正常但游戏没装是另一类问题，用 `game_installed` 区分，别混进 root 报错里。
#[derive(Serialize)]
pub(crate) struct CheckResult {
    pub game_installed: bool,
    /// game_installed 为 false 时的具体原因（含原始命令返回，便于定位）
    pub problem: String,
    pub uid: String,
    pub gid: String,
    pub subdirs: Vec<String>,
    pub running: bool,
}
