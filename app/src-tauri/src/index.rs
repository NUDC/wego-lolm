//! 快照索引（slots-index.json）的读写，存于应用数据目录。

use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

use crate::models::{now_ms, Index, SlotMeta};

fn index_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("获取应用数据目录失败：{e}"))?;
    fs::create_dir_all(&dir).map_err(|e| format!("创建数据目录失败：{e}"))?;
    Ok(dir.join("slots-index.json"))
}

pub(crate) fn read_index(app: &AppHandle) -> Result<Index, String> {
    let p = index_path(app)?;
    if !p.exists() {
        return Ok(Index::default());
    }
    let txt = fs::read_to_string(&p).map_err(|e| format!("读取索引失败：{e}"))?;
    serde_json::from_str(&txt).map_err(|e| format!("解析索引失败：{e}"))
}

pub(crate) fn write_index(app: &AppHandle, idx: &Index) -> Result<(), String> {
    let p = index_path(app)?;
    let txt = serde_json::to_string_pretty(idx).map_err(|e| format!("序列化索引失败：{e}"))?;
    fs::write(&p, txt).map_err(|e| format!("写入索引失败：{e}"))
}

#[allow(clippy::too_many_arguments)]
pub(crate) fn upsert_meta(
    idx: &mut Index,
    slot: &str,
    name: &Option<String>,
    uid: &str,
    items: &[String],
    size_kb: u64,
    user_id: &str,
) {
    if let Some(m) = idx.slots.iter_mut().find(|m| m.slot == slot) {
        m.updated_at_ms = now_ms();
        m.uid = uid.to_string();
        m.subdirs = items.to_vec();
        m.size_kb = size_kb;
        if !user_id.is_empty() {
            m.user_id = user_id.to_string();
        }
        if let Some(n) = name {
            if !n.trim().is_empty() {
                m.name = n.clone();
            }
        }
    } else {
        idx.slots.push(SlotMeta {
            slot: slot.to_string(),
            name: name
                .clone()
                .filter(|n| !n.trim().is_empty())
                .unwrap_or_else(|| slot.to_string()),
            updated_at_ms: now_ms(),
            uid: uid.to_string(),
            subdirs: items.to_vec(),
            size_kb,
            user_id: user_id.to_string(),
        });
    }
}
