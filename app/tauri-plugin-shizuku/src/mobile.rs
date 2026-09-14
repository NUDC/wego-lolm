use serde::de::DeserializeOwned;
use tauri::{
  plugin::{PluginApi, PluginHandle},
  AppHandle, Runtime,
};

use crate::models::*;

pub fn init<R: Runtime, C: DeserializeOwned>(
  _app: &AppHandle<R>,
  api: PluginApi<R, C>,
) -> crate::Result<Shizuku<R>> {
  #[cfg(target_os = "android")]
  let handle = api.register_android_plugin("com.plugin.shizuku", "ShizukuPlugin")?;
  Ok(Shizuku(handle))
}

/// Access to the priv-server APIs.
pub struct Shizuku<R: Runtime>(PluginHandle<R>);

impl<R: Runtime> Shizuku<R> {
  pub fn status(&self) -> crate::Result<StatusResponse> {
    self
      .0
      .run_mobile_plugin("status", EmptyArgs::default())
      .map_err(Into::into)
  }

  pub fn get_start_command(&self) -> crate::Result<StartCommandResponse> {
    self
      .0
      .run_mobile_plugin("getStartCommand", EmptyArgs::default())
      .map_err(Into::into)
  }

  pub fn exec(&self, payload: ExecArgs) -> crate::Result<ExecResponse> {
    self.0.run_mobile_plugin("exec", payload).map_err(Into::into)
  }
}
