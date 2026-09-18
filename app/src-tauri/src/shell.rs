//! 本机 root shell 执行。
//! Android：常驻 `su` 会话（启动一次、保持管道，Magisk 只需授权一次）。
//! 桌面：返回“仅安卓可用”，供 `tauri dev` 调 UI。

/// 常驻 root 会话。
#[cfg(target_os = "android")]
mod rootsh {
    use std::io::{BufRead, BufReader, Write};
    use std::process::{Child, ChildStdin, ChildStdout, Command, Stdio};
    use std::sync::{Mutex, OnceLock};

    const SENTINEL: &str = "__LOLMSW_RC__";

    struct Session {
        _child: Child,
        stdin: ChildStdin,
        reader: BufReader<ChildStdout>,
    }

    static SESSION: OnceLock<Mutex<Option<Session>>> = OnceLock::new();
    fn cell() -> &'static Mutex<Option<Session>> {
        SESSION.get_or_init(|| Mutex::new(None))
    }

    /// 优先用 `su -M`（--mount-master，切到全局挂载命名空间）。
    ///
    /// Android 的 app data isolation 让每个 app 自己的挂载命名空间里 `/data/data`
    /// 只挂了本包一个目录——不切命名空间的话，即使拿到 uid 0 也看不到游戏数据，
    /// `test -d /data/data/com.tencent.lolm` 会直接返回 no。老的 su 可能不认 -M，
    /// 因此失败后回退到普通 su。
    fn spawn() -> Result<Session, String> {
        match spawn_with(&["-M"]) {
            Ok(s) => Ok(s),
            Err(_) => spawn_with(&[]),
        }
    }

    fn spawn_with(args: &[&str]) -> Result<Session, String> {
        let mut child = Command::new("su")
            .args(args)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| match e.kind() {
                // KernelSU 的 su 由内核提供，未授权时是 EACCES 而不是 ENOENT，
                // 两者提示的下一步完全不同，不能混为一谈。
                std::io::ErrorKind::PermissionDenied => format!(
                    "su 存在但被拒绝 —— 请在 Magisk / KernelSU 的超级用户列表里给本应用授权（{e}）"
                ),
                std::io::ErrorKind::NotFound => {
                    format!("未找到 su —— 设备未安装 Magisk/KernelSU 或未 root（{e}）")
                }
                _ => format!("启动 su 失败：{e}"),
            })?;
        let mut stdin = child.stdin.take().ok_or("无法获取 su stdin")?;
        let stdout = child.stdout.take().ok_or("无法获取 su stdout")?;
        let reader = BufReader::new(stdout);
        // 合并 stderr 到 stdout，便于统一按行读取
        stdin.write_all(b"exec 2>&1\n").map_err(|e| e.to_string())?;
        stdin.flush().ok();
        let mut s = Session { _child: child, stdin, reader };
        // 首条命令会触发 Magisk 授权弹窗；被拒/无 root 时 id -u 不为 0
        let (out, rc) = exec_on(&mut s, "id -u")?;
        if out.trim() != "0" || rc != 0 {
            return Err(
                "su 未授予 root —— 请在 Magisk / KernelSU 的超级用户列表里对本应用点“允许”".into(),
            );
        }
        Ok(s)
    }

    fn exec_on(s: &mut Session, cmd: &str) -> Result<(String, i32), String> {
        s.stdin.write_all(cmd.as_bytes()).map_err(|e| e.to_string())?;
        s.stdin.write_all(b"\n").map_err(|e| e.to_string())?;
        s.stdin
            .write_all(format!("echo {SENTINEL}$?\n").as_bytes())
            .map_err(|e| e.to_string())?;
        s.stdin.flush().map_err(|e| e.to_string())?;

        let mut out = String::new();
        loop {
            let mut line = String::new();
            let n = s.reader.read_line(&mut line).map_err(|e| e.to_string())?;
            if n == 0 {
                return Err("su 会话意外结束".into());
            }
            if let Some(rest) = line.trim_end().strip_prefix(SENTINEL) {
                let rc = rest.trim().parse::<i32>().unwrap_or(-1);
                return Ok((out, rc));
            }
            out.push_str(&line);
        }
    }

    /// 执行一条命令，返回 stdout（含合并的 stderr）。会话坏了自动重建一次。
    pub fn exec(cmd: &str) -> Result<String, String> {
        let mut guard = cell().lock().map_err(|_| "root 会话锁错误".to_string())?;
        if guard.is_none() {
            *guard = Some(spawn()?);
        }
        let first = { exec_on(guard.as_mut().unwrap(), cmd) };
        match first {
            Ok((out, _rc)) => Ok(out),
            Err(_) => {
                *guard = Some(spawn()?);
                let (out, _rc) = exec_on(guard.as_mut().unwrap(), cmd)?;
                Ok(out)
            }
        }
    }
}

/// 以 root 在【本机】执行一条 shell 命令（Android：常驻 su 会话）。
#[cfg(target_os = "android")]
pub(crate) fn shell_root(cmd: &str) -> Result<String, String> {
    let out = rootsh::exec(cmd)?;
    #[cfg(debug_assertions)]
    log::info!("[su] {} -> {}", cmd, out.trim());
    Ok(out)
}

/// 桌面（tauri dev 调 UI 用）：设备操作不可用。
#[cfg(not(target_os = "android"))]
pub(crate) fn shell_root(_cmd: &str) -> Result<String, String> {
    Err("设备操作仅在 Android 上可用。请用 `tauri android dev` 部署到手机（桌面模式仅供调界面）。".into())
}
