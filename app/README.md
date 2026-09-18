# LOLM 账号切换器

英雄联盟手游（`com.tencent.lolm`）同机多账号切换器，Tauri 安卓应用（Rust + React）。**需 root。**

对登录态目录 `files` + `shared_prefs` 打快照 / 还原，同一实例免扫码秒切。一份游戏安装 + 每个号几十 MB 的槽位，账号再多也不翻倍占存储。

## 用法

首页就是账号列表，底部两个常驻按钮：**启动游戏** / **保存当前登录的号**。

1. 首次打开若显示「未获得 Root」，去 Magisk 或 KernelSU 的超级用户列表给本应用授权（授权后 app 会被自动重启），再点重新自检。
2. **启动游戏** → 登录一个号 → 回到切换器点 **保存当前登录的号**。槽位 id 自动分配，名字默认「账号 N」，可在编辑页改。每个号存一次。
3. 列表点 **切换**：回存当前号 → 停游戏 → 还原 → 修属主/SELinux → 拉起。当前号那行是 **启动**（只拉起游戏，不动数据）。
4. 行尾 `›` 进编辑页：改名、更新快照、还原快照、导出、删除。
5. **导出 / 导入**：槽位备份到 `/sdcard`，刷机清数据换机都不丢，每个号只需扫一次码。

顶栏状态胶囊点进去是「设备与工具」：root 方案、游戏 uid/gid、重新自检、从备份导入、操作日志。

路径：快照 `/data/local/tmp/lolm-slots/<slot>`，备份 `/sdcard/Download/lolm-slots-backup/<slot>`，元数据 `slots-index.json`（应用数据目录）。

## 构建

工具链路径已配在**用户级系统环境变量**（`JAVA_HOME` / `ANDROID_HOME` / `NDK_HOME`），不需要每次 export。注意 `ANDROID_HOME` 必须是**含 `ndk` 子目录的那套 SDK**（`D:\software\Android\SDK`），指到另一套会导致交叉编译找不到 NDK。

```bash
cd app && npm install
npm run tauri android dev                                               # 连设备热重载
npm run tauri android build -- --apk --target aarch64 --target x86_64   # release，真机+模拟器通吃
# 产物：src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release.apk
```

- 签名已配好（`gen/android/keystore.properties` + `release.jks`），release 自动签名。
- 前端在编译期嵌入 `.so`，但 `tauri-build` 对 `dist/` 有 `rerun-if-changed`，纯前端改动会自动触发 Rust 重编，不需要手动改 `lib.rs`。
- debug 与 release 签名不同，互装需先卸载：`adb install app/LOLM账号切换器-通用-release.apk`。

## 调试

前端：Chrome `chrome://inspect/#devices` inspect 本 App 的 WebView。
后端：`adb logcat | grep -iE "su|panic|lolm"`（`su` 执行处有 `log::info!`）。

## 注意

- **必须用 `su -M`（--mount-master）**。Android 的 app data isolation 让每个 app 自己的挂载命名空间里
  `/data/data` 只挂了本包一个目录——不切到全局命名空间，即使拿到 uid 0 也看不见游戏数据，
  `test -d /data/data/com.tencent.lolm` 直接返回 no。见 `shell.rs::spawn`。
- 支持 Magisk 和 KernelSU，自检会识别并给出对应的隐藏建议（Magisk → DenyList；KernelSU → App Profile 的卸载模块/UMOUNT）。
- 需真 root（`adb root` ≠ App 能用 `su`）；模拟器结果不代表真机，是否被 ACE 拦以真机为准。
- 仅用于管理自己的账号，控制切换频率。
