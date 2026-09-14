use serde::de::DeserializeOwned;
use tauri::{plugin::PluginApi, AppHandle, Runtime};

use crate::models::*;

pub fn init<R: Runtime, C: DeserializeOwned>(
  app: &AppHandle<R>,
  _api: PluginApi<R, C>,
) -> crate::Result<Shizuku<R>> {
  Ok(Shizuku(app.clone()))
}

/// Access to the priv-server APIs.
pub struct Shizuku<R: Runtime>(AppHandle<R>);

impl<R: Runtime> Shizuku<R> {
  pub fn status(&self) -> crate::Result<StatusResponse> {
    Ok(StatusResponse::default())
  }

  pub fn get_start_command(&self) -> crate::Result<StartCommandResponse> {
    Ok(StartCommandResponse {
      command: "（仅 Android 可用）".into(),
    })
  }

  pub fn exec(&self, _payload: ExecArgs) -> crate::Result<ExecResponse> {
    Ok(ExecResponse {
      stdout: String::new(),
      stderr: "特权服务仅在 Android 上可用".into(),
      code: -1,
    })
  }
}
