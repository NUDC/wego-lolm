# 自建特权服务由 app_process 按类名启动，禁止混淆/裁剪
-keep class com.plugin.shizuku.PrivServer { *; }
-keep class com.plugin.shizuku.** { *; }
