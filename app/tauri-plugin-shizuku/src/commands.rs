use tauri::{command, AppHandle, Runtime};

use crate::models::*;
use crate::Result;
use crate::ShizukuExt;

#[command]
pub(crate) async fn status<R: Runtime>(app: AppHandle<R>) -> Result<StatusResponse> {
    app.shizuku().status()
}

#[command]
pub(crate) async fn get_start_command<R: Runtime>(app: AppHandle<R>) -> Result<StartCommandResponse> {
    app.shizuku().get_start_command()
}

#[command]
pub(crate) async fn exec<R: Runtime>(app: AppHandle<R>, payload: ExecArgs) -> Result<ExecResponse> {
    app.shizuku().exec(payload)
}
