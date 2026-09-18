//! LOLM 同机本地账号切换器 —— Tauri 安卓后端（仅 root 快照模式）。
//!
//! 对 com.tencent.lolm 的登录态目录（files + shared_prefs）打快照/还原（见 `snapshot`），
//! 同一实例免扫码秒切；一份游戏安装 + 每个号几十 MB 的槽位。
//!
//! 设备操作只在 Android target 下真正执行（本机 su）；桌面 `tauri dev` 仅供调 UI。
//! 前端资源在编译期嵌入本 crate；改动前端后需重编本 crate 以更新嵌入内容。(rev5 · 仅 root)

mod device;
mod index;
mod models;
mod shell;
mod snapshot;

// ---------------- 全局配置 ----------------

pub(crate) const PACKAGE: &str = "com.tencent.lolm";
/// 最小集（已实测）：files 单独即可决定账号；shared_prefs 含 lastUserId/kcsdk 保状态一致。
pub(crate) const INCLUDE: [&str; 2] = ["files", "shared_prefs"];
pub(crate) const DEVICE_SLOT_ROOT: &str = "/data/local/tmp/lolm-slots";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            snapshot::check,
            snapshot::app_version,
            snapshot::list_slots,
            snapshot::save_slot,
            snapshot::switch_slot,
            snapshot::launch,
            snapshot::new_login,
            snapshot::delete_slot,
            snapshot::rename_slot,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
