package com.mws.theending

import org.json.JSONArray
import org.json.JSONObject

// Shapes returned by the Go API. Times are JavaScript milliseconds.

fun JSONArray?.strings(): List<String> = if (this == null) emptyList() else List(length()) { optString(it) }
fun JSONArray?.ints(): List<Int> = if (this == null) emptyList() else List(length()) { optInt(it) }
fun <T> JSONArray?.objects(map: (JSONObject) -> T): List<T> = if (this == null) emptyList() else List(length()) { map(getJSONObject(it)) }

/** optString that treats JSON null and the strings "null"/"undefined" as empty. */
fun JSONObject.str(key: String): String {
    if (isNull(key)) return ""
    val v = optString(key)
    return if (v == "null" || v == "undefined") "" else v
}

data class Drama(
    val id: String,
    val title: String,
    val synopsis: String,
    val genres: List<String>,
    val episodes: Int,
    val totalEpisodes: Int,
    val freeEpisodes: Int,
    val coinsPerEpisode: Int,
    val status: String,
    val completed: Boolean,
    val color: Long,
    val color2: Long,
    val badge: String,
    val releaseAt: Long,
    val poster: String,
    val banner: String,
) {
    val published get() = status == "Published"

    companion object {
        fun from(o: JSONObject) = Drama(
            id = o.str("id"), title = o.str("title"), synopsis = o.str("synopsis"), genres = o.optJSONArray("genres").strings(),
            episodes = o.optInt("episodes"), totalEpisodes = o.optInt("totalEpisodes"), freeEpisodes = o.optInt("freeEpisodes"),
            coinsPerEpisode = o.optInt("coinsPerEpisode"), status = o.str("status"), completed = o.optBoolean("completed"),
            color = hex(o.str("color")), color2 = hex(o.str("color2")), badge = o.str("badge"), releaseAt = o.optLong("releaseAt"),
            poster = o.str("poster"), banner = o.str("banner"),
        )
    }
}

fun hex(s: String): Long = runCatching { 0xFF000000 or s.removePrefix("#").toLong(16) }.getOrDefault(0xFF26202A)

data class Episode(val n: Int, val title: String, val length: Int, val free: Boolean, val hasVideo: Boolean) {
    companion object {
        fun from(o: JSONObject) = Episode(o.optInt("n"), o.str("title"), o.optInt("length"), o.optBoolean("free"), o.optBoolean("hasVideo"))
    }
}

data class Subscription(val state: String, val plan: String, val until: Long)
data class Progress(val ep: Int, val updated: Long)
data class Task(val key: String, val name: String, val amount: Int, val note: String, val done: Boolean, val claimable: Boolean)
data class Settings(val autoplay: Boolean, val autoUnlock: Boolean, val cellular: Boolean, val language: String) {
    fun json() = json("autoplay" to autoplay, "autoUnlock" to autoUnlock, "cellular" to cellular, "language" to language)
}
data class NotifyPrefs(val episodes: Boolean, val premieres: Boolean, val replies: Boolean, val offers: Boolean, val checkin: Boolean) {
    fun json() = json("episodes" to episodes, "premieres" to premieres, "replies" to replies, "offers" to offers, "checkin" to checkin)
}

data class User(val id: Long, val name: String, val initial: String, val email: String, val via: String, val color: Long, val role: String, val signedIn: Boolean)

data class Me(
    val user: User,
    val coins: Int,
    val subscription: Subscription,
    val saved: List<String>,
    val liked: List<String>,
    val reminders: List<String>,
    val unlocked: Map<String, List<Int>>,
    val progress: Map<String, Progress>,
    val checkinStreak: Int,
    val canCheckIn: Boolean,
    val nextCheckin: Int,
    val adsLeft: Int,
    val adsLimit: Int,
    val tasks: List<Task>,
    val settings: Settings,
    val notify: NotifyPrefs,
    val notifyPrompted: Boolean,
    val onboarded: Boolean,
    val genres: List<String>,
    val unread: Int,
    val muted: Boolean,
) {
    val vip get() = subscription.state == "active"

    fun canWatch(dramaId: String, ep: Episode?): Boolean =
        ep != null && (ep.free || vip || unlocked[dramaId]?.contains(ep.n) == true)

    companion object {
        fun from(o: JSONObject): Me {
            val u = o.getJSONObject("user")
            val sub = o.optJSONObject("subscription") ?: JSONObject()
            val unlocked = o.optJSONObject("unlocked") ?: JSONObject()
            val progress = o.optJSONObject("progress") ?: JSONObject()
            val checkin = o.optJSONObject("checkin") ?: JSONObject()
            val ads = o.optJSONObject("ads") ?: JSONObject()
            val s = o.optJSONObject("settings") ?: JSONObject()
            val n = o.optJSONObject("notify") ?: JSONObject()
            return Me(
                user = User(u.optLong("id"), u.str("name"), u.str("initial"), u.str("email"), u.str("via"), hex(u.str("color")), u.str("role"), u.optBoolean("signedIn")),
                coins = o.optInt("coins"),
                subscription = Subscription(sub.str("state").ifEmpty { "none" }, sub.str("plan"), sub.optLong("until")),
                saved = o.optJSONArray("saved").strings(), liked = o.optJSONArray("liked").strings(), reminders = o.optJSONArray("reminders").strings(),
                unlocked = unlocked.keys().asSequence().associateWith { unlocked.optJSONArray(it).ints() },
                progress = progress.keys().asSequence().associateWith { k -> progress.getJSONObject(k).let { Progress(it.optInt("ep"), it.optLong("updated")) } },
                checkinStreak = checkin.optInt("streak"), canCheckIn = checkin.optBoolean("canCheckIn"), nextCheckin = checkin.optInt("nextAmount"),
                adsLeft = ads.optInt("left"), adsLimit = ads.optInt("limit"),
                tasks = o.optJSONArray("tasks").objects { Task(it.str("key"), it.str("name"), it.optInt("amount"), it.str("note"), it.optBoolean("done"), it.optBoolean("claimable")) },
                settings = Settings(s.optBoolean("autoplay", true), s.optBoolean("autoUnlock"), s.optBoolean("cellular", true), s.str("language").ifEmpty { "en" }),
                notify = NotifyPrefs(n.optBoolean("episodes", true), n.optBoolean("premieres", true), n.optBoolean("replies", true), n.optBoolean("offers"), n.optBoolean("checkin", true)),
                notifyPrompted = o.optBoolean("notifyPrompted"), onboarded = o.optBoolean("onboarded"), genres = o.optJSONArray("genres").strings(),
                unread = o.optInt("unread"), muted = o.optBoolean("muted"),
            )
        }
    }
}

data class CoinPack(val id: String, val coins: Int, val bonus: Int, val priceCents: Int, val tag: String)
data class VipPlan(val id: String, val name: String, val priceCents: Int, val days: Int, val note: String, val tag: String)

data class AppConfig(
    val coinPacks: List<CoinPack>,
    val vipPlans: List<VipPlan>,
    val checkin: List<Int>,
    val adsPerDay: Int,
    val tasks: Map<String, Int>,
    val vipBonus: Int,
    val coinsPerEpisode: Int,
    val supportEmail: String,
    val maintenance: Boolean,
    val androidMin: String,
    val androidLatest: String,
    val iosMin: String,
    val iosLatest: String,
    val genres: List<String>,
) {
    companion object {
        fun from(o: JSONObject): AppConfig {
            val t = o.optJSONObject("tasks") ?: JSONObject()
            val v = o.optJSONObject("versions") ?: JSONObject()
            return AppConfig(
                coinPacks = o.optJSONArray("coinPacks").objects { CoinPack(it.str("id"), it.optInt("coins"), it.optInt("bonus"), it.optInt("priceCents"), it.str("tag")) },
                vipPlans = o.optJSONArray("vipPlans").objects { VipPlan(it.str("id"), it.str("name"), it.optInt("priceCents"), it.optInt("days"), it.str("note"), it.str("tag")) },
                checkin = o.optJSONArray("checkin").ints(), adsPerDay = o.optInt("adsPerDay"),
                tasks = t.keys().asSequence().associateWith { t.optInt(it) },
                vipBonus = o.optInt("vipBonus"), coinsPerEpisode = o.optInt("coinsPerEpisode"), supportEmail = o.str("supportEmail"),
                maintenance = o.optBoolean("maintenance"),
                androidMin = v.str("androidMin"), androidLatest = v.str("androidLatest"), iosMin = v.str("iosMin"), iosLatest = v.str("iosLatest"),
                genres = o.optJSONArray("genres").strings(),
            )
        }
    }
}

data class Home(val banner: List<String>, val trending: List<String>, val soon: List<String>, val picks: List<String>, val hot: List<String>) {
    companion object {
        fun from(o: JSONObject) = Home(o.optJSONArray("banner").strings(), o.optJSONArray("trending").strings(), o.optJSONArray("soon").strings(),
            o.optJSONArray("picks").strings(), o.optJSONArray("hot").strings())
    }
}

data class Comment(val id: Long, val name: String, val initial: String, val color: Long, val text: String, val at: Long, val mine: Boolean) {
    companion object {
        fun from(o: JSONObject) = Comment(o.optLong("id"), o.str("name"), o.str("initial"), hex(o.str("color")), o.str("text"), o.optLong("at"), o.optBoolean("mine"))
    }
}

data class InboxItem(val id: Long, val kind: String, val title: String, val body: String, val href: String, val read: Boolean, val at: Long) {
    companion object {
        fun from(o: JSONObject) = InboxItem(o.optLong("id"), o.str("kind"), o.str("title"), o.str("body"), o.str("href"), o.optBoolean("read"), o.optLong("at"))
    }
}

data class WalletEntry(val what: String, val amount: Int, val at: Long)

data class Payment(val order: String, val item: String, val amountCents: Int, val status: String, val at: Long) {
    companion object {
        fun from(o: JSONObject) = Payment(o.str("order"), o.str("item"), o.optInt("amountCents"), o.str("status"), o.optLong("at"))
    }
}

/** Semantic version compare: negative when a < b. Bad input sorts as 0.0.0. */
fun compareVersions(a: String, b: String): Int {
    val pa = a.split('.').map { it.toIntOrNull() ?: 0 }
    val pb = b.split('.').map { it.toIntOrNull() ?: 0 }
    for (i in 0 until maxOf(pa.size, pb.size)) {
        val d = pa.getOrElse(i) { 0 } - pb.getOrElse(i) { 0 }
        if (d != 0) return d
    }
    return 0
}
