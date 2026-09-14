//! LOLM 同机本地账号切换器 —— Tauri 安卓后端。
//!
//! 两种模式：
//! - root：对 com.tencent.lolm 的登录态目录打快照/还原（见 `snapshot`）。
//! - 免 root：系统多用户（见 `multiuser`），特权由自建服务或 su 提供。
//!
//! 设备操作只在 Android target 下真正执行（本机 su）；桌面 `tauri dev` 仅供调 UI。
//! 前端资源在编译期嵌入本 crate；改动前端后需重编本 crate 以更新嵌入内容。(rev2)

mod device;
mod index;
mod models;
mod multiuser;
mod shell;
mod snapshot;

// ---------------- 全局配置 ----------------

pub(crate) const PACKAGE: &str = "com.tencent.lolm";
/// 最小集（已实测）：files 单独即可决定账号；shared_prefs 含 lastUserId/kcsdk 保状态一致。
pub(crate) const INCLUDE: [&str; 2] = ["files", "shared_prefs"];
pub(crate) const DEVICE_SLOT_ROOT: &str = "/data/local/tmp/lolm-slots";
/// 导出备份目录（/sdcard，卸载/重装后仍在）。
pub(crate) const BACKUP_ROOT: &str = "/sdcard/Download/lolm-slots-backup";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shizuku::init())
        .invoke_handler(tauri::generate_handler![
            snapshot::check,
            snapshot::list_slots,
            snapshot::save_slot,
            snapshot::switch_slot,
            snapshot::delete_slot,
            snapshot::rename_slot,
            snapshot::export_slot,
            snapshot::import_backups,
            multiuser::mu_list_users,
            multiuser::mu_create_user,
            multiuser::mu_install_lolm,
            multiuser::mu_switch_user,
            multiuser::mu_remove_user,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
