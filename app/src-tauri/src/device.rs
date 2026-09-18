//! 设备侧对 LOLM 数据目录的读取操作（均经 root shell）。

use crate::shell::shell_root;
use crate::{DEVICE_SLOT_ROOT, INCLUDE, PACKAGE};

/// 读取游戏私有目录的属主 uid/gid。
pub(crate) fn game_uid_gid() -> Result<(String, String), String> {
    let exists = shell_root(&format!("test -d /data/data/{PACKAGE} && echo yes || echo no"))?;
    if exists.trim() != "yes" {
        // 带上原始返回：区分「目录真不存在」和「su 会话返回了意料外的内容」
        return Err(format!(
            "未找到 /data/data/{PACKAGE} —— 请确认已安装英雄联盟手游并至少登录过一次。（test 返回：{:?}）",
            exists.trim()
        ));
    }
    let uid = shell_root(&format!("stat -c %u /data/data/{PACKAGE}"))?.trim().to_string();
    let gid = shell_root(&format!("stat -c %g /data/data/{PACKAGE}"))?.trim().to_string();
    if !uid.is_empty() && uid.chars().all(|c| c.is_ascii_digit())
        && !gid.is_empty() && gid.chars().all(|c| c.is_ascii_digit())
    {
        Ok((uid, gid))
    } else {
        Err(format!("读取游戏 uid/gid 失败：uid={uid} gid={gid}"))
    }
}

pub(crate) fn game_running() -> bool {
    shell_root(&format!("pidof {PACKAGE}"))
        .map(|s| !s.trim().is_empty())
        .unwrap_or(false)
}

pub(crate) fn stop_game() -> Result<(), String> {
    shell_root(&format!("am force-stop {PACKAGE}"))?;
    Ok(())
}

/// 需纳入快照的项（最小集 INCLUDE 中实际存在的）。
pub(crate) fn data_items() -> Result<Vec<String>, String> {
    let mut items = Vec::new();
    for it in INCLUDE {
        let has = shell_root(&format!("test -e /data/data/{PACKAGE}/{it} && echo yes || echo no"))?;
        if has.trim() == "yes" {
            items.push(it.to_string());
        }
    }
    Ok(items)
}

/// 某个 slot 快照里的顶层项。
pub(crate) fn slot_items(slot: &str) -> Result<Vec<String>, String> {
    let out = shell_root(&format!("ls {DEVICE_SLOT_ROOT}/{slot}"))?;
    Ok(out
        .lines()
        .map(|l| l.trim().to_string())
        .filter(|l| !l.is_empty())
        .collect())
}

/// slot 快照占用（KB）。
pub(crate) fn slot_size_kb(slot: &str) -> u64 {
    shell_root(&format!("du -sk {DEVICE_SLOT_ROOT}/{slot}"))
        .ok()
        .and_then(|o| o.split_whitespace().next().map(|s| s.to_string()))
        .and_then(|s| s.parse::<u64>().ok())
        .unwrap_or(0)
}

/// 从 lastUserId.xml 提取当前登录账号标识（第一个 pref 值；失败返回空）。
pub(crate) fn read_user_id() -> String {
    let xml = match shell_root(&format!(
        "cat /data/data/{PACKAGE}/shared_prefs/lastUserId.xml 2>/dev/null"
    )) {
        Ok(x) => x,
        Err(_) => return String::new(),
    };
    for close in ["</string>", "</long>", "</int>"] {
        if let Some(end) = xml.find(close) {
            if let Some(start) = xml[..end].rfind('>') {
                let v = xml[start + 1..end].trim();
                if !v.is_empty() {
                    return v.to_string();
                }
            }
        }
    }
    String::new()
}
