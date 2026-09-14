const COMMANDS: &[&str] = &["status", "get_start_command", "exec"];

fn main() {
  tauri_plugin::Builder::new(COMMANDS)
    .android_path("android")
    .build();
}
