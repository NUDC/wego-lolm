# LOLM 账号切换器

英雄联盟手游（`com.tencent.lolm`）同机多账号切换器。Tauri（Rust 后端 + React/TS WebView 前端）安卓应用，**自动按设备能力二选一**：

| 模式 | 触发 | 机制 |
|---|---|---|
| **root 快照切换** | 设备有 root（Magisk 的 `su`） | 对登录态目录 `files`+`shared_prefs` 打快照/还原，同一实例**免扫码秒切** |
| **免 root 多用户** | 无 root | 系统多用户：每号一个独立用户，**一键建/切/删用户**；特权由自建服务提供 |

App 启动自检：有 `su` → 快照模式；否则 → 多用户模式（服务未起时引导启动）。

---

## 技术栈 / 结构

- 前端：React 19 + TypeScript + Vite 8（`src/`），三态 UI（root / 多用户自动 / 引导）。
- 后端：Rust（`src-tauri/src/`，按模块拆分）：
  - `lib.rs` 常量 + `run()`；`shell.rs` 常驻 `su` 会话；`device.rs` 设备读操作；
  - `index.rs` 快照索引；`snapshot.rs` 快照/还原 + 命令；`multiuser.rs` 多用户命令。
- 自建特权服务：`tauri-plugin-shizuku/`（Kotlin `PrivServer` + `LocalSocket`，免 root 借 shell 权限跑 `pm/am`）。

---

## 构建

需 Android 工具链（JDK / SDK / NDK）。每次 android 命令前设好环境变量：

```bash
export JAVA_HOME="D:/Program Files/Android Studio/jbr"
export ANDROID_HOME="D:/software/Android/SDK"
export NDK_HOME="D:/software/Android/SDK/ndk/29.0.13846066"
```

```bash
cd app
npm install                                              # 首次
npm run tauri android dev                                # 连设备热重载调试
npm run tauri android build -- --apk --target aarch64 --target x86_64   # 通用签名 release（真机+模拟器通吃）
# 产物：src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release.apk
```

- **签名**：`gen/android/keystore.properties` + `release.jks` 已配好，release 自动签名。
- **防混淆**：`consumer-rules.pro` / `proguard-rules.pro` keep 住 `PrivServer`（它靠 app_process 按类名启动）。
- **纯前端改动**后需让 Rust 重编（前端编译期嵌入 `.so`），改一行 `lib.rs` 即可触发。

安装（debug↔release 签名不同，切换需先卸载）：
```bash
adb install app/LOLM账号切换器-通用-release.apk
```

---

## 使用

**root 模式**
1. 点 **自检** → Magisk 弹窗授权 → 显示 uid/gid 即就绪。
2. 登录账号 A → **保存当前号**（slot `a`）；登录 B → 保存 `b`。
3. 列表点 **切换** 互切（自动：回存当前号 → 停游戏 → 还原 → 修属主/SELinux → 拉起）。

**免 root 多用户模式**
1. 按引导用 **ADB / 无线调试**执行一条命令启动特权服务（重启后需再启动一次）。
2. 服务就绪后：**新建用户并装 LOLM**（会一并装切换器）→ 切到该用户登录另一个号。
3. 列表里 **切换/删除** 用户即切号。

数据：快照存 `/data/local/tmp/lolm-slots/<slot>`，元数据存应用数据目录 `slots-index.json`。

---

## 调试

- 前端：Chrome `chrome://inspect/#devices` → inspect 本 App 的 WebView（Console/断点）。
- 后端：`adb logcat | grep -iE "su|panic|lolm"`（`su` 执行处有 `log::info!`）。

---

## 注意

- **root 快照**：需设备真 root（`adb root` ≠ App 能用 `su`）；模拟器结果不代表真机，是否被 ACE 拦以真机为准。
- **免 root 多用户**：特权服务的 ADB/无线调试激活一步绕不过（Android 安全所限）；每号独立系统，对 ACE 最友好但切换稍慢、存储翻倍。
- 仅用于管理自己的账号，控制切换频率。
- `release.jks` / `keystore.properties` 含签名口令，提交仓库前请加 `.gitignore`。
