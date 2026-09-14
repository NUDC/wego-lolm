//! root 模式：登录态快照/还原 + 相关 Tauri 命令。
//! 三条铁律：先 force-stop 再动文件；还原后 chown 回游戏 uid + restorecon；快照只读、可回滚。

use tauri::AppHandle;

use crate::device::{
    data_items, game_running, game_uid_gid, read_user_id, slot_items, slot_size_kb, stop_game,
};
use crate::index::{read_index, upsert_meta, write_index};
use crate::models::{CheckResult, Index};
use crate::shell::shell_root;
use crate::{BACKUP_ROOT, DEVICE_SLOT_ROOT, PACKAGE};

// ---------------- 核心流程 ----------------

fn do_save(app: &AppHandle, slot: &str, name: &Option<String>) -> Result<Vec<String>, String> {
    if slot.trim().is_empty() {
        return Err("slot 不能为空".into());
    }
    if game_running() {
        stop_game()?;
    }
    let slot_path = format!("{DEVICE_SLOT_ROOT}/{slot}");
    shell_root(&format!("rm -rf {slot_path} && mkdir -p {slot_path}"))?;

    let items = data_items()?;
    if items.is_empty() {
        return Err("没有可保存的登录态数据（/data/data 为空？）。".into());
    }
    let mut saved = Vec::new();
    for it in &items {
        shell_root(&format!("cp -a /data/data/{PACKAGE}/{it} {slot_path}/"))?;
        saved.push(it.clone());
    }

    let (uid, _gid) = game_uid_gid()?;
    let size_kb = slot_size_kb(slot);
    let user_id = read_user_id();
    let mut idx = read_index(app)?;
    upsert_meta(&mut idx, slot, name, &uid, &saved, size_kb, &user_id);
    idx.active = Some(slot.to_string());
    write_index(app, &idx)?;
    Ok(saved)
}

fn do_restore(slot: &str) -> Result<(), String> {
    let slot_path = format!("{DEVICE_SLOT_ROOT}/{slot}");
    let exists = shell_root(&format!("test -d {slot_path} && echo yes || echo no"))?;
    if exists.trim() != "yes" {
        return Err(format!("slot '{slot}' 的快照不存在。"));
    }
    let (uid, gid) = game_uid_gid()?;

    stop_game()?;

    for it in data_items()? {
        shell_root(&format!("rm -rf /data/data/{PACKAGE}/{it}"))?;
    }
    for it in slot_items(slot)? {
        shell_root(&format!("cp -a {slot_path}/{it} /data/data/{PACKAGE}/"))?;
    }
    // 修正属主 + SELinux 上下文（整目录一次性处理）
    shell_root(&format!("chown -R {uid}:{gid} /data/data/{PACKAGE}"))?;
    let _ = shell_root(&format!("restorecon -R /data/data/{PACKAGE}"));
    Ok(())
}

fn launch_game() -> Result<(), String> {
    shell_root(&format!(
        "monkey -p {PACKAGE} -c android.intent.category.LAUNCHER 1"
    ))?;
    Ok(())
}

// ---------------- Tauri 命令 ----------------

#[tauri::command]
pub fn check() -> Result<CheckResult, String> {
    // 探测 root：su 返回 0 即有 root；否则回退多用户（不报错）
    let has_root = shell_root("id -u").map(|o| o.trim() == "0").unwrap_or(false);
    if !has_root {
        return Ok(CheckResult {
            mode: "multiuser".to_string(),
            root: false,
            uid: String::new(),
            gid: String::new(),
            package: PACKAGE.to_string(),
            subdirs: Vec::new(),
            device_slot_root: DEVICE_SLOT_ROOT.to_string(),
            running: false,
            magisk_version: String::new(),
            denylisted: false,
        });
    }
    let magisk_version = shell_root("magisk -v 2>/dev/null")
        .unwrap_or_default()
        .lines()
        .next()
        .unwrap_or("")
        .trim()
        .to_string();
    let denylisted = shell_root("magisk --denylist ls 2>/dev/null")
        .map(|o| o.lines().any(|l| l.contains(PACKAGE)))
        .unwrap_or(false);
    let (uid, gid) = game_uid_gid()?;
    Ok(CheckResult {
        mode: "root".to_string(),
        root: true,
        uid,
        gid,
        package: PACKAGE.to_string(),
        subdirs: data_items().unwrap_or_default(),
        device_slot_root: DEVICE_SLOT_ROOT.to_string(),
        running: game_running(),
        magisk_version,
        denylisted,
    })
}

#[tauri::command]
pub fn list_slots(app: AppHandle) -> Result<Index, String> {
    read_index(&app)
}

#[tauri::command]
pub fn save_slot(app: AppHandle, slot: String, name: Option<String>) -> Result<String, String> {
    let saved = do_save(&app, &slot, &name)?;
    Ok(format!("已保存 '{slot}'，包含：{}", saved.join(", ")))
}

#[tauri::command]
pub fn switch_slot(
    app: AppHandle,
    slot: String,
    no_save_current: Option<bool>,
) -> Result<String, String> {
    let mut idx = read_index(&app)?;
    if !idx.slots.iter().any(|m| m.slot == slot) {
        return Err(format!("slot '{slot}' 未登记，请先保存。"));
    }
    if !no_save_current.unwrap_or(false) {
        if let Some(active) = idx.active.clone() {
            if active != slot {
                do_save(&app, &active, &None)?;
                idx = read_index(&app)?;
            }
        }
    }
    do_restore(&slot)?;
    launch_game()?;
    idx.active = Some(slot.clone());
    write_index(&app, &idx)?;
    Ok(format!("已切换到 '{slot}'（若还原成功应免扫码进入）。"))
}

#[tauri::command]
pub fn delete_slot(app: AppHandle, slot: String) -> Result<String, String> {
    let _ = shell_root(&format!("rm -rf {DEVICE_SLOT_ROOT}/{slot}"));
    let mut idx = read_index(&app)?;
    idx.slots.retain(|m| m.slot != slot);
    if idx.active.as_deref() == Some(slot.as_str()) {
        idx.active = None;
    }
    write_index(&app, &idx)?;
    Ok(format!("已删除 '{slot}'。"))
}

#[tauri::command]
pub fn rename_slot(app: AppHandle, slot: String, name: String) -> Result<String, String> {
    if name.trim().is_empty() {
        return Err("昵称不能为空".into());
    }
    let mut idx = read_index(&app)?;
    let m = idx
        .slots
        .iter_mut()
        .find(|m| m.slot == slot)
        .ok_or_else(|| format!("slot '{slot}' 不存在"))?;
    m.name = name.trim().to_string();
    write_index(&app, &idx)?;
    Ok(format!("已重命名为 '{}'", name.trim()))
}

#[tauri::command]
pub fn export_slot(slot: String) -> Result<String, String> {
    let src = format!("{DEVICE_SLOT_ROOT}/{slot}");
    let exists = shell_root(&format!("test -d {src} && echo yes || echo no"))?;
    if exists.trim() != "yes" {
        return Err(format!("slot '{slot}' 的快照不存在"));
    }
    let dst = format!("{BACKUP_ROOT}/{slot}");
    shell_root(&format!("mkdir -p {BACKUP_ROOT} && rm -rf {dst} && cp -a {src} {dst}"))?;
    Ok(format!("已导出到 {dst}"))
}

#[tauri::command]
pub fn import_backups(app: AppHandle) -> Result<String, String> {
    let out = shell_root(&format!("ls {BACKUP_ROOT} 2>/dev/null"))?;
    let slots: Vec<String> = out
        .lines()
        .map(|l| l.trim().to_string())
        .filter(|l| !l.is_empty())
        .collect();
    if slots.is_empty() {
        return Err(format!("{BACKUP_ROOT} 下没有备份"));
    }
    let mut idx = read_index(&app)?;
    let mut n = 0;
    for slot in &slots {
        let src = format!("{BACKUP_ROOT}/{slot}");
        let dst = format!("{DEVICE_SLOT_ROOT}/{slot}");
        shell_root(&format!("mkdir -p {DEVICE_SLOT_ROOT} && rm -rf {dst} && cp -a {src} {dst}"))?;
        let items = slot_items(slot)?;
        let size_kb = slot_size_kb(slot);
        upsert_meta(&mut idx, slot, &None, "", &items, size_kb, "");
        n += 1;
    }
    write_index(&app, &idx)?;
    Ok(format!("已从备份导入 {n} 个 slot"))
}
