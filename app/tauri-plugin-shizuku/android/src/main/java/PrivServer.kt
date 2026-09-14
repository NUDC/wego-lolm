package com.plugin.shizuku

import android.net.LocalServerSocket
import android.net.LocalSocket
import java.io.BufferedReader
import java.io.InputStreamReader

/**
 * 借鉴 Shizuku 的自建特权服务（最小版）。
 * 由 ADB/无线调试用 app_process 拉起，运行在 shell(uid 2000) 或 root(uid 0) 权限：
 *   CLASSPATH=<apk> app_process /system/bin --nice-name=<pkg>:priv com.plugin.shizuku.PrivServer <token>
 * 通过抽象命名空间的 LocalSocket 与 App 通信（socket 名含随机 token，充当简单鉴权）。
 * 协议：每连接一条命令 —— App 发 "<cmd>\n"；服务端回 "<exitCode>\n<合并的stdout+stderr>"。
 */
object PrivServer {
    // 固定 socket 名：跨用户共享同一服务（每个用户里的 App 都连它）。
    // 抽象命名空间 socket 跨 uid 可见，这里用一个固定串作轻量标识。
    private const val SOCK = "lolmsw_a7f3e9c2_priv"

    @JvmStatic
    fun main(args: Array<String>) {
        val name = if (args.isNotEmpty() && args[0].isNotBlank()) "lolmsw_${args[0]}" else SOCK
        val server = LocalServerSocket(name)
        System.err.println("PrivServer listening @$name uid=" + android.os.Process.myUid())
        while (true) {
            val socket = try {
                server.accept()
            } catch (e: Throwable) {
                continue
            }
            try {
                handle(socket)
            } catch (_: Throwable) {
            } finally {
                try { socket.close() } catch (_: Throwable) {}
            }
        }
    }

    private fun handle(socket: LocalSocket) {
        val reader = BufferedReader(InputStreamReader(socket.inputStream))
        val cmd = reader.readLine() ?: return
        val out = socket.outputStream
        if (cmd == "__PING__") {
            out.write("0\nok".toByteArray())
            out.flush()
            return
        }
        try {
            val p = ProcessBuilder("sh", "-c", cmd).redirectErrorStream(true).start()
            val text = p.inputStream.bufferedReader().readText()
            val code = p.waitFor()
            out.write("$code\n$text".toByteArray())
        } catch (e: Throwable) {
            out.write(("255\n" + (e.message ?: "exec error")).toByteArray())
        }
        out.flush()
    }
}
