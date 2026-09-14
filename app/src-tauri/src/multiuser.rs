//! 免 root 多用户方案：通过特权 shell 执行 pm/am 的 Tauri 命令。
//! root 设备用 su；无 root 用自建特权服务（见 tauri-plugin-shizuku）提供 shell 权限。

use serde::Serialize;

use crate::shell::shell_root;
use crate::PACKAGE;

#[derive(Serialize)]
pub(crate) struct UserInfo {
    id: i32,
    name: String,
    running: bool,
    current: bool,
}

fn parse_users(out: &str, current: i32) -> Vec<UserInfo> {
    let mut users = Vec::new();
    for line in out.lines() {
        if let Some(i) = line.find("UserInfo{") {
            let rest = &line[i + "UserInfo{".len()..];
            if let Some(close) = rest.find('}') {
                let inner = &rest[..close]; // "0:机主:4c13"
                let parts: Vec<&str> = inner.splitn(3, ':').collect();
                if parts.len() >= 2 {
                    if let Ok(id) = parts[0].trim().parse::<i32>() {
                        users.push(UserInfo {
                            id,
                            name: parts[1].to_string(),
                            running: line.contains("running"),
                            current: id == current,
                        });
                    }
                }
            }
        }
    }
    users
}

#[tauri::command]
pub fn mu_list_users() -> Result<Vec<UserInfo>, String> {
    let cur = shell_root("am get-current-user")
        .ok()
        .and_then(|s| s.trim().parse::<i32>().ok())
        .unwrap_or(-1);
    let out = shell_root("pm list users")?;
    Ok(parse_users(&out, cur))
}

#[tauri::command]
pub fn mu_create_user(name: String) -> Result<i32, String> {
    let name = name.trim().replace(char::is_whitespace, "_");
    if name.is_empty() {
        return Err("用户名不能为空".into());
    }
    let out = shell_root(&format!("pm create-user {name}"))?;
    // "Success: created user id 11"
    out.split_whitespace()
        .last()
        .and_then(|s| s.parse::<i32>().ok())
        .ok_or_else(|| format!("创建用户失败：{}", out.trim()))
}

#[tauri::command]
pub fn mu_install_lolm(user_id: i32) -> Result<String, String> {
    let out = shell_root(&format!("pm install-existing --user {user_id} {PACKAGE}"))?;
    Ok(out.trim().to_string())
}

#[tauri::command]
pub fn mu_switch_user(user_id: i32) -> Result<String, String> {
    shell_root(&format!("am switch-user {user_id}"))?;
    Ok(format!("已切换到用户 {user_id}"))
}

#[tauri::command]
pub fn mu_remove_user(user_id: i32) -> Result<String, String> {
    if user_id == 0 {
        return Err("不能删除主用户".into());
    }
    let out = shell_root(&format!("pm remove-user {user_id}"))?;
    Ok(out.trim().to_string())
}
