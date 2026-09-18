//! root 模式：登录态快照/还原 + 相关 Tauri 命令。
//! 三条铁律：先 force-stop 再动文件；还原后 chown 回游戏 uid + restorecon；快照只读、可回滚。

use tauri::AppHandle;

use crate::device::{
    data_items, game_running, game_uid_gid, read_user_id, slot_items, slot_size_kb, stop_game,
};
use crate::index::{read_index, upsert_meta, write_index};
use crate::models::{CheckResult, Index};
use crate::shell::shell_root;
use crate::{DEVICE_SLOT_ROOT, PACKAGE};

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
    // su 返回 uid 0 才算就绪；没装 Magisk / 授权被拒时 shell_root 已带出可读原因
    let uid0 = shell_root("id -u")?;
    if uid0.trim() != "0" {
        return Err(format!(
            "su 未返回 root（id -u = {}）—— 请在 Magisk / KernelSU 里对本应用点“允许”。",
            uid0.trim()
        ));
    }
    // 到这里 root 已确认可用。游戏没装不算 root 失败，单独报。
    match game_uid_gid() {
        Ok((uid, gid)) => Ok(CheckResult {
            game_installed: true,
            problem: String::new(),
            uid,
            gid,
            subdirs: data_items().unwrap_or_default(),
            running: game_running(),
        }),
        Err(problem) => Ok(CheckResult {
            game_installed: false,
            problem,
            uid: String::new(),
            gid: String::new(),
            subdirs: Vec::new(),
            running: false,
        }),
    }
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
pub fn switch_slot(app: AppHandle, slot: String) -> Result<String, String> {
    let mut idx = read_index(&app)?;
    if !idx.slots.iter().any(|m| m.slot == slot) {
        return Err(format!("slot '{slot}' 未登记，请先保存。"));
    }
    // 先把当前号的最新登录态回存，再还原目标号，避免丢进度
    if let Some(active) = idx.active.clone() {
        if active != slot {
            do_save(&app, &active, &None)?;
            idx = read_index(&app)?;
        }
    }
    do_restore(&slot)?;
    launch_game()?;
    idx.active = Some(slot.clone());
    write_index(&app, &idx)?;
    Ok(format!("已切换到 '{slot}'（若还原成功应免扫码进入）。"))
}

/// 应用版本（取自 Cargo.toml，与 APK 的 versionName 同源）。
#[tauri::command]
pub fn app_version(app: AppHandle) -> String {
    app.package_info().version.to_string()
}

/// 只拉起游戏，不碰任何快照数据。
#[tauri::command]
pub fn launch() -> Result<String, String> {
    launch_game()?;
    Ok("已启动游戏".into())
}

/// 清空登录态并拉起游戏，让游戏回到扫码/登录界面，用于登录一个新号。
/// 关键：先把当前号回存，否则清空后这个号就得重新找人扫码。
#[tauri::command]
pub fn new_login(app: AppHandle) -> Result<String, String> {
    let mut idx = read_index(&app)?;
    let kept = idx.active.clone();
    if let Some(active) = kept.clone() {
        do_save(&app, &active, &None)?;
        idx = read_index(&app)?;
    }

    let (uid, gid) = game_uid_gid()?;
    stop_game()?;
    for it in data_items()? {
        shell_root(&format!("rm -rf /data/data/{PACKAGE}/{it}"))?;
    }
    // 游戏会自己重建这些目录，但属主/上下文先修好更稳
    let _ = shell_root(&format!("chown -R {uid}:{gid} /data/data/{PACKAGE}"));
    let _ = shell_root(&format!("restorecon -R /data/data/{PACKAGE}"));
    launch_game()?;

    idx.active = None;
    write_index(&app, &idx)?;
    Ok(match kept {
        Some(slot) => format!("已回存 '{slot}' 并清空登录态，游戏已拉起，请扫码登录新号。"),
        None => "已清空登录态，游戏已拉起，请扫码登录新号。".into(),
    })
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

