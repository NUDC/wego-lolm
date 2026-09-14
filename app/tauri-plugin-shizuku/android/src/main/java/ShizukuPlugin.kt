package com.plugin.shizuku

import android.app.Activity
import android.net.LocalSocket
import android.net.LocalSocketAddress
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import app.tauri.plugin.Invoke

@InvokeArg
class ExecArgs {
    var cmd: String = ""
}

@TauriPlugin
class ShizukuPlugin(private val activity: Activity) : Plugin(activity) {

    // 固定 socket 名，与 PrivServer.SOCK 一致（跨用户共享同一服务）
    private val sock = "lolmsw_a7f3e9c2_priv"

    private fun sockName(): String = sock

    /** 向自建服务发送一条命令，返回 (exitCode, output) */
    private fun send(cmd: String): Pair<Int, String> {
        val socket = LocalSocket()
        socket.connect(LocalSocketAddress(sockName(), LocalSocketAddress.Namespace.ABSTRACT))
        socket.outputStream.write((cmd + "\n").toByteArray())
        socket.outputStream.flush()
        socket.shutdownOutput()
        val text = socket.inputStream.bufferedReader().readText()
        socket.close()
        val nl = text.indexOf('\n')
        val code = if (nl >= 0) text.substring(0, nl).trim().toIntOrNull() ?: -1 else -1
        val body = if (nl >= 0) text.substring(nl + 1) else ""
        return Pair(code, body)
    }

    @Command
    fun status(invoke: Invoke) {
        val ret = JSObject()
        var running = false
        try {
            val (c, _) = send("__PING__")
            running = c == 0
        } catch (_: Throwable) {
        }
        ret.put("running", running)
        invoke.resolve(ret)
    }

    @Command
    fun getStartCommand(invoke: Invoke) {
        val apk = activity.applicationInfo.sourceDir
        val pkg = activity.packageName
        val cmd =
            "CLASSPATH=$apk app_process /system/bin --nice-name=$pkg:priv com.plugin.shizuku.PrivServer"
        val ret = JSObject()
        ret.put("command", cmd)
        invoke.resolve(ret)
    }

    @Command
    fun exec(invoke: Invoke) {
        val args = invoke.parseArgs(ExecArgs::class.java)
        try {
            val (code, body) = send(args.cmd)
            val ret = JSObject()
            ret.put("stdout", body.trim())
            ret.put("stderr", "")
            ret.put("code", code)
            invoke.resolve(ret)
        } catch (e: Throwable) {
            invoke.reject("特权服务未连接（请先按提示用 ADB/无线调试启动）：" + (e.message ?: ""))
        }
    }
}
