package com.mws.theending

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.staticCompositionLocalOf
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/** Every place the app can go. The tab bar screens live inside [Route.Tabs]. */
sealed interface Route {
    data object Tabs : Route
    data object Search : Route
    data class Drama(val id: String) : Route
    data class Watch(val id: String, val ep: Int? = null) : Route
    data object Login : Route
    data object Email : Route
    data class Code(val challengeId: String, val email: String, val demoCode: String) : Route
    data object Welcome : Route
    data object Store : Route
    data object Vip : Route
    data class Payment(val productId: String) : Route
    data object Wallet : Route
    data object Inbox : Route
    data object Settings : Route
    data object Language : Route
    data object NotifySettings : Route
    data object Help : Route
    data object About : Route
    data object EditProfile : Route
    data object DeleteAccount : Route
    data object Server : Route
    data object History : Route
}

enum class Tab(val label: String) { Home("Home"), Shorts("Shorts"), Rewards("Rewards"), MyList("My List"), Me("Me") }
enum class HomeTab(val label: String) { ForYou("For You"), Rankings("Rankings"), New("New"), Genres("Genres") }

val LocalStore = staticCompositionLocalOf<AppStore> { error("AppStore not provided") }

class AppStore(context: Context, private val scope: CoroutineScope) {
    private val prefs = context.getSharedPreferences("the-ending", Context.MODE_PRIVATE)
    val api = Api(prefs)

    var me by mutableStateOf<Me?>(null)
        private set
    var bootError by mutableStateOf<String?>(null)
        private set
    var config by mutableStateOf<AppConfig?>(null)
        private set
    var dramas by mutableStateOf<List<Drama>?>(null)
        private set

    /** Bumped after writes so screens that loaded lists (wallet, inbox, home) reload. */
    var version by mutableIntStateOf(0)
        private set

    // Navigation
    val stack = mutableStateListOf<Route>(Route.Tabs)
    var tab by mutableStateOf(Tab.Home)
    var homeTab by mutableStateOf(HomeTab.ForYou)
    val route: Route get() = stack.last()
    fun go(r: Route) { stack.add(r) }
    fun back(): Boolean = if (stack.size > 1) { stack.removeAt(stack.lastIndex); true } else false
    fun reset(r: Route = Route.Tabs) { stack.clear(); stack.add(r) }
    fun openTab(t: Tab) { reset(); tab = t }

    // Toast
    var toast by mutableStateOf<String?>(null)
        private set
    private var toastJob: Job? = null
    fun show(msg: String) {
        toast = msg
        toastJob?.cancel()
        toastJob = scope.launch { delay(2600); toast = null }
    }

    /** Runs a write; errors show as a toast. */
    fun act(block: suspend () -> Unit) = scope.launch {
        try { block() } catch (e: ApiException) { show(e.message ?: "Something went wrong") }
    }

    fun drama(id: String) = dramas?.firstOrNull { it.id == id }
    fun pick(ids: List<String>) = ids.mapNotNull { drama(it) }
    val published get() = dramas.orEmpty().filter { it.published }

    // ---- Boot ----

    suspend fun boot() {
        bootError = null
        try {
            me = try {
                Me.from(api.obj("GET", "/me"))
            } catch (e: ApiException) {
                if (e.status != 401) throw e
                Me.from(api.obj("POST", "/auth/guest"))
            }
            config = AppConfig.from(api.obj("GET", "/config"))
            dramas = api.arr("/dramas").objects(Drama::from)
        } catch (e: ApiException) {
            bootError = e.message
        }
    }

    suspend fun refreshCatalog() {
        config = AppConfig.from(api.obj("GET", "/config"))
        dramas = api.arr("/dramas").objects(Drama::from)
        version++
    }

    private suspend fun run(method: String, path: String, body: JSONObject? = null): Me {
        val m = Me.from(api.obj(method, path, body))
        me = m
        version++
        return m
    }

    suspend fun refreshMe() { run("GET", "/me") }

    // ---- Account ----

    suspend fun signInWithGoogle() = run("POST", "/auth/google", json("ref" to 0))

    suspend fun startEmail(email: String): Route.Code {
        val o = api.obj("POST", "/auth/email/start", json("email" to email))
        return Route.Code(o.str("challengeId"), o.str("email"), o.str("demoCode"))
    }

    suspend fun verifyEmail(challengeId: String, code: String) = run("POST", "/auth/email/verify", json("challengeId" to challengeId, "code" to code, "ref" to 0))

    suspend fun signOut() {
        api.post("/auth/logout")
        me = null
        boot()
        version++
    }

    suspend fun deleteAccount() {
        api.delete("/me", json("confirm" to "DELETE"))
        me = null
        boot()
        version++
    }

    suspend fun updateMe(body: JSONObject) = run("PATCH", "/me", body)
    suspend fun setSettings(s: Settings) {
        me?.let { me = it.copy(settings = s) } // instant switch; the server's answer replaces it
        updateMe(json("settings" to s.json()))
    }
    suspend fun setNotify(n: NotifyPrefs) {
        me?.let { me = it.copy(notify = n) }
        updateMe(json("notify" to n.json()))
    }

    fun changeServer(url: String) {
        api.baseUrl = url
        me = null; config = null; dramas = null
        reset()
        scope.launch { boot() }
    }

    // ---- Lists, progress, coins ----

    suspend fun toggle(kind: String, dramaId: String) {
        val m = me ?: return
        val on = when (kind) { "saved" -> m.saved; "liked" -> m.liked; else -> m.reminders }.contains(dramaId)
        run(if (on) "DELETE" else "PUT", "/me/$kind/$dramaId")
    }

    suspend fun setProgress(dramaId: String, ep: Int) = run("POST", "/me/progress", json("dramaId" to dramaId, "ep" to ep))
    suspend fun reportWatch(seconds: Int) { api.post("/me/watch", json("seconds" to seconds)) }
    suspend fun clearHistory() = run("DELETE", "/me/history")
    suspend fun unlock(dramaId: String, ep: Int) = run("POST", "/unlock", json("dramaId" to dramaId, "ep" to ep))

    suspend fun startAd(purpose: String, dramaId: String = "", ep: Int = 0): Pair<String, Int> {
        val o = api.obj("POST", "/ads/start", json("purpose" to purpose, "dramaId" to dramaId, "ep" to ep))
        return o.str("ticket") to o.optInt("seconds", 5)
    }
    suspend fun completeAd(ticket: String) = run("POST", "/ads/complete", json("ticket" to ticket))

    suspend fun checkIn(): Pair<Int, Int> {
        val o = api.obj("POST", "/checkin")
        me = Me.from(o.getJSONObject("me"))
        version++
        return o.optInt("amount") to o.optInt("vipBonus")
    }

    suspend fun claimTask(key: String) = run("POST", "/tasks/$key/claim")
    suspend fun cancelVip() = run("POST", "/me/vip/cancel")

    suspend fun buy(productId: String, outcome: String): com.mws.theending.Payment {
        val order = api.obj("POST", "/payments", json("productId" to productId)).str("order")
        val o = api.obj("POST", "/payments/$order/complete", json("outcome" to outcome))
        me = Me.from(o.getJSONObject("me"))
        version++
        return com.mws.theending.Payment.from(o.getJSONObject("payment"))
    }

    fun bump() { version++ }
}

/** Result of loading screen data from the API. */
class Load<T>(val data: T?, val error: String?, val reload: () -> Unit)

/** Loads [fetch] when the keys or the store's version change; keeps old data while reloading. */
@Composable
fun <T> rememberLoad(vararg keys: Any?, fetch: suspend () -> T): Load<T> {
    val store = LocalStore.current
    var data by remember(*keys) { mutableStateOf<T?>(null) }
    var error by remember(*keys) { mutableStateOf<String?>(null) }
    var attempt by remember(*keys) { mutableIntStateOf(0) }
    LaunchedEffect(*keys, store.version, attempt) {
        try {
            data = fetch()
            error = null
        } catch (e: ApiException) {
            error = e.message
        }
    }
    return Load(data, if (data == null) error else null) { attempt++ }
}

// ---- Display formats: dd/MM/yyyy and a 12-hour clock ----

fun fmtDate(ms: Long): String = if (ms <= 0) "" else SimpleDateFormat("dd/MM/yyyy", Locale.US).format(Date(ms))
fun fmtStamp(ms: Long): String = if (ms <= 0) "" else SimpleDateFormat("dd/MM/yyyy · h:mm a", Locale.US).format(Date(ms))
fun price(cents: Int): String = "$" + String.format(Locale.US, "%.2f", cents / 100.0)
fun duration(seconds: Int): String = "%d:%02d".format(seconds.coerceAtLeast(0) / 60, seconds.coerceAtLeast(0) % 60)

val LANGUAGES = listOf(
    Triple("en", "English", "English"), Triple("my", "မြန်မာ", "Burmese"), Triple("th", "ไทย", "Thai"), Triple("vi", "Tiếng Việt", "Vietnamese"),
    Triple("id", "Bahasa Indonesia", "Indonesian"), Triple("zh", "中文", "Chinese"), Triple("es", "Español", "Spanish"), Triple("pt", "Português", "Portuguese"),
)
