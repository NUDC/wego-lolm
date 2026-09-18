/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 由 Pages 工作流从 app/src-tauri/Cargo.toml 注入 */
  readonly VITE_APP_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
