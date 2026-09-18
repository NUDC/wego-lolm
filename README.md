# LOLM 账号切换器

英雄联盟手游（`com.tencent.lolm`）同机多账号切换器，Tauri 安卓应用。**需 root。**

对登录态目录 `files` + `shared_prefs` 打快照 / 还原，同一实例免扫码秒切。一份游戏安装 + 每个号几十 MB 的槽位，账号再多也不翻倍占存储。

官网：<https://nudc.github.io/wego-lolm/>

```
app/     Tauri 应用（Rust + React）
site/    官网（Vite + React + TS → GitHub Pages）
```

## 用法

首次打开若提示未获得 Root，去 Magisk 或 KernelSU 的超级用户列表授权（之后 app 会自动重启）。

加号：**登录新号**（回存当前号 → 清空登录态 → 拉起游戏到扫码界面）→ 扫码登录 → **保存当前号**。每个号重复一次。

之后列表点 **切换** 换号，当前号那行是 **启动**（只拉起游戏，不动数据）。

快照存 `/data/local/tmp/lolm-slots/<slot>`，元数据 `slots-index.json`（应用数据目录）。

## 构建

```bash
cd app && npm install
npm run tauri android dev                                # 连设备热重载
npm run tauri android build -- --apk --target aarch64    # release；模拟器另加 --target x86_64
# 产物：app/src-tauri/gen/android/app/build/outputs/apk/universal/release/app-universal-release.apk

cd site && npm install && npm run dev                    # 官网
```

- `JAVA_HOME` / `ANDROID_HOME` / `NDK_HOME` 已配在用户级环境变量。`ANDROID_HOME` 必须指向**含 `ndk` 子目录的那套 SDK**。
- 版本号唯一来源是 `app/src-tauri/Cargo.toml` 的 `version`：`build.gradle.kts` 读它得出 `versionName`/`versionCode`，「关于」页读 `app.package_info()`，官网由 CI 注入。
- 签名已配好，release 自动签名。debug 与 release 签名不同，互装需先卸载。
- 别在 `site/` 混用 pnpm：其符号链接布局会让后续 `npm install` 报 `EUNSUPPORTEDPROTOCOL`，删掉 `node_modules` 重装即可。
- 调试 WebView：Chrome `chrome://inspect/#devices`。

## 发布

改 `Cargo.toml` 的 `version`，然后打标签（必须与之一致，否则 CI 拒绝）：

```bash
git tag v1.0.0 && git push origin v1.0.0
```

`release.yml` 构建 arm64 签名包、核对版本/架构/签名、发到 Release，资产名固定
`lolm-switcher-arm64-release.apk`（官网下载链接指向它，发新版不用改站点）。
`pages.yml` 在推 main 时部署官网。

需先配好 secret（值取自 `app/src-tauri/gen/android/keystore.properties`），
并把 Settings → Pages 的来源设为 **GitHub Actions**：

| Secret | 值 |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | `base64 -w0 app/release.jks` |
| `ANDROID_KEYSTORE_PASSWORD` | `storePassword` |
| `ANDROID_KEY_ALIAS` | `keyAlias` |
| `ANDROID_KEY_PASSWORD` | `keyPassword` |

CI 里为什么要先 `tauri android init` 再 `git checkout` 恢复配置，见 `release.yml` 里的注释。

## 注意

- **必须用 `su -M`（--mount-master）**。Android 的 app data isolation 让 app 自己的挂载命名空间里 `/data/data` 只挂了本包一个目录，不切到全局命名空间即使拿到 uid 0 也看不见游戏数据。见 `shell.rs::spawn`。
- 需真 root（`adb root` ≠ App 能用 `su`）；模拟器结果不代表真机。
- 切换会 force-stop 游戏，对局中误触会掉线。
- 没有备份功能，快照只在 `/data/local/tmp/lolm-slots`，刷机会丢。
- 仅用于管理自己的账号，控制切换频率。
