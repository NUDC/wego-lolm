# LOLM 账号切换器

英雄联盟手游（`com.tencent.lolm`）同机多账号切换器，Tauri 安卓应用（Rust + React）。**需 root。**

对登录态目录 `files` + `shared_prefs` 打快照 / 还原，同一实例免扫码秒切。一份游戏安装 + 每个号几十 MB 的槽位，账号再多也不翻倍占存储。

官网：<https://nudc.github.io/wego-lolm/>

```
app/     Tauri 应用（Rust 后端 + React 前端）
site/    官网（Vite + React + TS，部署到 GitHub Pages）
```

## 用法

首页就是账号列表，底部两个按钮：**登录新号** / **保存当前号**。

1. 首次打开若显示「未获得 Root」，去 Magisk 或 KernelSU 的超级用户列表给本应用授权（授权后 app 会被自动重启），再点重新自检。
2. 点 **登录新号**：回存当前号 → 清空登录态 → 拉起游戏到扫码界面。扫码登录好之后回来点 **保存当前号**。
3. 每加一个号重复上一步。槽位 id 自动分配，名字默认「账号 N」，可在详情页改。
4. 之后列表点 **切换** 即可换号（回存当前号 → 停游戏 → 还原 → 修属主/SELinux → 拉起）。当前号那一行是 **启动**，只拉起游戏不动数据。
5. 行内点进 **账号详情**：改昵称、删除。顶栏状态胶囊点进去是 **关于**：版本、root 状态、游戏 uid/gid。

快照存 `/data/local/tmp/lolm-slots/<slot>`，元数据 `slots-index.json`（应用数据目录）。

## 构建

工具链路径已配在**用户级系统环境变量**（`JAVA_HOME` / `ANDROID_HOME` / `NDK_HOME`）。注意 `ANDROID_HOME` 必须是**含 `ndk` 子目录的那套 SDK**，指到另一套会导致交叉编译找不到 NDK。

```bash
cd app && npm install
npm run tauri android dev                                # 连设备热重载
npm run tauri android build -- --apk --target aarch64    # release（真机）
# 产物：app/src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release.apk
```

要在 x86_64 模拟器上跑，另加 `--target x86_64`。

- 签名已配好（`app/src-tauri/gen/android/keystore.properties` + `app/release.jks`），release 自动签名。
- 版本号唯一来源是 `app/src-tauri/Cargo.toml` 的 `version`：`build.gradle.kts` 直接读它得出 `versionName` / `versionCode`，「关于」页读 `app.package_info()`，官网由 CI 注入。
- 前端在编译期嵌入 `.so`，但 `tauri-build` 对 `dist/` 有 `rerun-if-changed`，纯前端改动会自动触发 Rust 重编。
- debug 与 release 签名不同，互装需先卸载。

官网：

```bash
cd site && npm install && npm run dev
```

全仓统一用 npm。注意别在 `site/` 里混用 pnpm——pnpm 的符号链接布局会让后续的 `npm install` 报 `EUNSUPPORTEDPROTOCOL: workspace:*`，删掉 `node_modules` 重装即可恢复。

## 发布

```bash
# 1. 改 app/src-tauri/Cargo.toml 的 version
# 2. 打标签，必须与 Cargo.toml 一致，否则 CI 拒绝
git tag v1.0.0 && git push origin v1.0.0
```

`.github/workflows/release.yml` 构建签名 APK（仅 arm64）、核对版本/架构/签名、发到 Release，资产名固定为 `lolm-switcher-arm64-release.apk`。官网下载按钮指向 `releases/latest/download/` 下这个名字，所以发新版不需要改站点。

`.github/workflows/pages.yml` 在推 main 时部署官网。

仓库需先配好四个 secret（值取自本地 `app/src-tauri/gen/android/keystore.properties`）：

| Secret | 说明 |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | `base64 -w0 app/release.jks` 的输出 |
| `ANDROID_KEYSTORE_PASSWORD` | `storePassword` |
| `ANDROID_KEY_ALIAS` | `keyAlias` |
| `ANDROID_KEY_PASSWORD` | `keyPassword` |

另需在仓库 Settings → Pages 把来源设为 **GitHub Actions**。

**为什么 CI 里要先 `tauri android init`**：`gen/android/tauri.settings.gradle` 和 `app/tauri.build.gradle.kts` 被 gitignore（内容含本机 cargo registry 的绝对路径），但 `settings.gradle` 用 `apply from` 强依赖它们，而 `tauri android build` **不会**重新生成——只有 `init` 会。init 会覆盖手工维护的 `app/build.gradle.kts`（签名配置 + 版本读取都在里面），所以紧接着用 `git checkout -- app/src-tauri/gen/android` 把已跟踪的文件恢复回来，新生成的 ignore 文件不受影响。

## 调试

前端：Chrome `chrome://inspect/#devices` inspect 本 App 的 WebView。
后端：`adb logcat | grep -iE "su|panic|lolm"`。

## 注意

- **必须用 `su -M`（--mount-master）**。Android 的 app data isolation 让每个 app 自己的挂载命名空间里 `/data/data` 只挂了本包一个目录——不切到全局命名空间，即使拿到 uid 0 也看不见游戏数据，`test -d /data/data/com.tencent.lolm` 直接返回 no。见 `shell.rs::spawn`。
- 需真 root（`adb root` ≠ App 能用 `su`）；模拟器结果不代表真机，是否被 ACE 拦以真机为准。
- 切换会 force-stop 游戏，对局中误触会掉线。
- 没有备份 / 导出功能，快照只在 `/data/local/tmp/lolm-slots`，刷机会丢。
- 仅用于管理自己的账号，控制切换频率。
