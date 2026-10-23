package com.mws.theending

import android.content.SharedPreferences
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import org.json.JSONTokener
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

class ApiException(val status: Int, message: String) : Exception(message)

/**
 * Client for the Go API (../Go). The session is the server's te_session cookie, kept in
 * SharedPreferences and sent back on every request.
 */
class Api(private val prefs: SharedPreferences) {
    var baseUrl: String
        get() = (prefs.getString("server", null) ?: BuildConfig.API_URL).trimEnd('/')
        set(value) {
            prefs.edit().putString("server", value.trim().trimEnd('/')).remove("session").apply()
        }

    private var session: String?
        get() = prefs.getString("session", null)
        set(value) {
            prefs.edit().apply { if (value == null) remove("session") else putString("session", value) }.apply()
        }

    /** Cookie header for requests made outside this client (video streams). */
    val cookie: String? get() = session?.let { "te_session=$it" }

    fun url(path: String): String = if (path.startsWith("http")) path else baseUrl + path

    suspend fun get(path: String): Any? = request("GET", path, null)
    suspend fun post(path: String, body: JSONObject? = null): Any? = request("POST", path, body)
    suspend fun put(path: String): Any? = request("PUT", path, null)
    suspend fun delete(path: String, body: JSONObject? = null): Any? = request("DELETE", path, body)
    suspend fun patch(path: String, body: JSONObject): Any? = request("PATCH", path, body)

    suspend fun obj(method: String, path: String, body: JSONObject? = null): JSONObject =
        request(method, path, body) as? JSONObject ?: JSONObject()

    suspend fun arr(path: String): JSONArray = request("GET", path, null) as? JSONArray ?: JSONArray()

    suspend fun request(method: String, path: String, body: JSONObject?): Any? = withContext(Dispatchers.IO) {
        val conn = try {
            URL(baseUrl + "/api" + path).openConnection() as HttpURLConnection
        } catch (e: Exception) {
            throw ApiException(0, "The server address \"$baseUrl\" isn't valid. Fix it in Settings › Server.")
        }
        try {
            conn.connectTimeout = 10_000
            conn.readTimeout = 20_000
            conn.useCaches = false
            // HttpURLConnection has no PATCH; the server accepts this override.
            if (method == "PATCH") {
                conn.requestMethod = "POST"
                conn.setRequestProperty("X-HTTP-Method-Override", "PATCH")
            } else {
                conn.requestMethod = method
            }
            conn.setRequestProperty("Accept", "application/json")
            cookie?.let { conn.setRequestProperty("Cookie", it) }
            if (body != null) {
                conn.doOutput = true
                conn.setRequestProperty("Content-Type", "application/json")
                conn.outputStream.use { it.write(body.toString().toByteArray()) }
            }
            val status = conn.responseCode
            conn.headerFields["Set-Cookie"]?.forEach { header ->
                val pair = header.substringBefore(';')
                if (pair.startsWith("te_session=")) {
                    val value = pair.removePrefix("te_session=")
                    session = value.ifEmpty { null }
                }
            }
            val text = (if (status >= 400) conn.errorStream else conn.inputStream)?.bufferedReader()?.use { it.readText() }.orEmpty()
            val parsed = if (text.isBlank()) null else runCatching { JSONTokener(text).nextValue() }.getOrNull()
            if (status >= 400) {
                val msg = (parsed as? JSONObject)?.optString("error").orEmpty().ifEmpty { "Something went wrong ($status)" }
                throw ApiException(status, msg)
            }
            parsed
        } catch (e: IOException) {
            throw ApiException(0, "Can't reach The Ending at $baseUrl. Check the server is running, or change it in Settings › Server.")
        } finally {
            conn.disconnect()
        }
    }
}

fun json(vararg pairs: Pair<String, Any?>): JSONObject = JSONObject().apply {
    pairs.forEach { (k, v) ->
        put(k, when (v) {
            is List<*> -> JSONArray(v)
            null -> JSONObject.NULL
            else -> v
        })
    }
}
