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

/// 自检结果：决定前端走 root 一键切换还是免 root 多用户。
#[derive(Serialize)]
pub(crate) struct CheckResult {
    /// "root" = 有 root，走一键切换；"multiuser" = 无 root，走多用户
    pub mode: String,
    pub root: bool,
    pub uid: String,
    pub gid: String,
    pub package: String,
    pub subdirs: Vec<String>,
    pub device_slot_root: String,
    pub running: bool,
    pub magisk_version: String,
    pub denylisted: bool,
}
