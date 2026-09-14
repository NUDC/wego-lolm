use serde::{Deserialize, Serialize};

/// 无参命令占位
#[derive(Debug, Default, Deserialize, Serialize)]
pub struct EmptyArgs {}

/// 自建特权服务状态
#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StatusResponse {
  /// 特权服务是否在运行（LocalSocket 可连）
  pub running: bool,
}

/// 启动命令（供用户用 ADB/无线调试执行）
#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StartCommandResponse {
  pub command: String,
}

/// exec 参数
#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecArgs {
  pub cmd: String,
}

/// exec 结果
#[derive(Debug, Clone, Default, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ExecResponse {
  pub stdout: String,
  pub stderr: String,
  pub code: i32,
}
