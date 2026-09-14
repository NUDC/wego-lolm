# 自建特权服务：由 app_process 按类名(com.plugin.shizuku.PrivServer)启动，
# 必须保留类名与 main 方法，禁止混淆/裁剪。
-keep class com.plugin.shizuku.PrivServer { *; }
-keep class com.plugin.shizuku.** { *; }
