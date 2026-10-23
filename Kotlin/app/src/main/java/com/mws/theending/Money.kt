package com.mws.theending

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.MoreHoriz
import androidx.compose.material.icons.outlined.BookmarkBorder
import androidx.compose.material.icons.outlined.SlowMotionVideo
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.mws.theending.ui.Banner
import com.mws.theending.ui.Btn
import com.mws.theending.ui.C
import com.mws.theending.ui.CoinIcon
import com.mws.theending.ui.CrownIcon
import com.mws.theending.ui.Empty
import com.mws.theending.ui.Kind
import com.mws.theending.ui.LoadOr
import com.mws.theending.ui.Loading
import com.mws.theending.ui.Poster
import com.mws.theending.ui.PosterCard
import com.mws.theending.ui.T
import com.mws.theending.ui.Title
import com.mws.theending.ui.TopBar
import com.mws.theending.ui.outlined
import kotlinx.coroutines.delay

// ---------------- Rewards ----------------

@Composable
fun RewardsScreen() {
    val store = LocalStore.current
    val context = LocalContext.current
    val me = store.me ?: return
    val cfg = store.config
    var reward by remember { mutableStateOf<Pair<Int, Int>?>(null) }
    var ad by remember { mutableStateOf<Pair<String, Int>?>(null) }
    var busy by remember { mutableStateOf(false) }

    LaunchedEffect(ad) {
        val a = ad ?: return@LaunchedEffect
        delay(1000)
        if (a.second > 1) { ad = a.first to a.second - 1; return@LaunchedEffect }
        try { store.completeAd(a.first); store.show("+${cfg?.tasks?.get("ad") ?: 20} coins") } catch (e: ApiException) { store.show(e.message ?: "") }
        ad = null
    }
    val act = { block: suspend () -> Unit -> store.act { busy = true; try { block() } finally { busy = false } }; Unit }
    val amounts = cfg?.checkin.orEmpty()
    val pos = if (amounts.isEmpty()) 0 else me.checkinStreak % amounts.size
    val cycleDone = me.checkinStreak > 0 && pos == 0 && !me.canCheckIn
    val notifGranted = Build.VERSION.SDK_INT < 33 || ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED

    Box(Modifier.fillMaxSize()) {
        LazyColumn(Modifier.statusBarsPadding(), contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(24.dp)) {
            item {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    T("Rewards", 28.sp, FontWeight.ExtraBold, modifier = Modifier.weight(1f))
                    Row(Modifier.clip(RoundedCornerShape(17.dp)).background(C.Surface).clickable { store.go(Route.Wallet) }.padding(horizontal = 14.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) { CoinIcon(); T("${me.coins}", weight = FontWeight.ExtraBold) }
                }
            }
            item {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row { Title("Daily check-in", modifier = Modifier.weight(1f)); T("${me.checkinStreak}-day streak", 13.sp, FontWeight.SemiBold, C.Warn) }
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        amounts.forEachIndexed { i, amt ->
                            val claimed = cycleDone || i < pos
                            val today = me.canCheckIn && i == pos
                            Column(Modifier.weight(1f).heightIn(min = 76.dp).clip(RoundedCornerShape(12.dp)).background(if (today) C.AccentSoft else C.Surface)
                                .border(1.5.dp, if (today) C.Accent else Color.Transparent, RoundedCornerShape(12.dp)).padding(vertical = 8.dp),
                                horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp, Alignment.CenterVertically)) {
                                if (claimed) Icon(Icons.Default.Check, "claimed", tint = C.Text3, modifier = Modifier.size(20.dp)) else CoinIcon(20.dp)
                                T("+$amt", 12.sp, FontWeight.ExtraBold, if (claimed) C.Text3 else if (i == amounts.lastIndex) C.Warn else C.Text)
                                T(if (today) "Today" else "Day ${i + 1}", 10.sp, color = C.Text3)
                            }
                        }
                    }
                    Btn(if (me.canCheckIn) "Check in · +${me.nextCheckin} coins" else "Checked in today · come back tomorrow",
                        { act { reward = store.checkIn() } }, Modifier.fillMaxWidth(), enabled = me.canCheckIn && !busy)
                    if (me.vip && (cfg?.vipBonus ?: 0) > 0) T("VIP adds +${cfg?.vipBonus} coins to every check-in.", 13.sp, color = C.Gold)
                }
            }
            item { Title("Tasks") }
            items(me.tasks, key = { it.key }) { t ->
                Row(Modifier.fillMaxWidth().padding(vertical = 4.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                        T(t.name, weight = FontWeight.SemiBold)
                        T("+${t.amount} coins" + if (t.note.isNotEmpty()) " · ${t.note}" else "", 13.sp, FontWeight.SemiBold, C.Warn)
                    }
                    when {
                        t.done -> Btn("Done", {}, kind = Kind.Secondary, small = true, enabled = false)
                        t.key == "ad" -> Btn("Watch", { act { ad = store.startAd("reward") } }, small = true, enabled = !busy)
                        t.key == "watch" && t.claimable -> Btn("Claim", { act { store.claimTask("watch"); store.show("+${t.amount} coins") } }, small = true)
                        t.key == "watch" -> Btn("Go", { store.tab = Tab.Home }, small = true)
                        t.key == "notify" && notifGranted -> Btn("Claim", { act { store.claimTask("notify"); store.show("+${t.amount} coins") } }, small = true)
                        t.key == "notify" -> Btn("Open", { store.go(Route.NotifySettings) }, small = true)
                        t.key == "invite" && me.user.signedIn -> Btn("Invite", {
                            context.startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).apply {
                                type = "text/plain"; putExtra(Intent.EXTRA_TEXT, "Join me on The Ending. We both get free coins. ${store.api.baseUrl}/?ref=${me.user.id}")
                            }, "Invite a friend"))
                        }, small = true)
                        else -> Btn("Sign in", { store.go(Route.Login) }, small = true)
                    }
                }
                Box(Modifier.fillMaxWidth().height(1.dp).background(C.Surface))
            }
        }
        ad?.let { a ->
            Box(Modifier.fillMaxSize().background(Color.Black).clickable(remember { MutableInteractionSource() }, null) {}, contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    T("Sponsored · demo ad", 12.sp, color = C.Text3)
                    Box(Modifier.width(220.dp).aspectRatio(9f / 16f).clip(RoundedCornerShape(16.dp)).background(C.InfoBg), contentAlignment = Alignment.Center) { T("Your ad here", weight = FontWeight.Bold, color = C.Info) }
                    T("Reward in ${a.second}s", weight = FontWeight.Bold)
                }
            }
        }
        reward?.let { (amount, bonus) ->
            DialogCard({ reward = null }) {
                CoinIcon(72.dp)
                T("+${amount + bonus} coins", 28.sp, FontWeight.Black, C.Warn)
                T((if (bonus > 0) "Includes your +$bonus VIP bonus. " else "") + "Come back tomorrow for +${me.nextCheckin}.", color = C.Text2, align = TextAlign.Center)
                Btn("Collect", { reward = null }, Modifier.fillMaxWidth())
            }
        }
    }
}

// ---------------- My List and History ----------------

@Composable
fun MyListScreen(history: Boolean, standalone: Boolean = false) {
    val store = LocalStore.current
    val me = store.me ?: return
    var showHistory by remember { mutableStateOf(history) }
    var editing by remember { mutableStateOf(false) }
    Column(Modifier.fillMaxSize()) {
        if (standalone) TopBar("Watch history", { store.back() })
        Column(Modifier.then(if (standalone) Modifier else Modifier.statusBarsPadding()).padding(horizontal = 16.dp, vertical = 12.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            if (!standalone) Row(verticalAlignment = Alignment.CenterVertically) {
                T("My List", 28.sp, FontWeight.ExtraBold, modifier = Modifier.weight(1f))
                if (!showHistory && me.saved.isNotEmpty()) Btn(if (editing) "Done" else "Edit", { editing = !editing }, kind = Kind.Ghost, small = true)
                if (showHistory && me.progress.isNotEmpty()) Btn("Clear", { store.act { store.clearHistory() } }, kind = Kind.Ghost, small = true)
            }
            if (!standalone) Row(horizontalArrangement = Arrangement.spacedBy(22.dp)) {
                listOf(false to "Saved", true to "History").forEach { (h, label) ->
                    Column(Modifier.clickable { showHistory = h }) {
                        T(label, 16.sp, if (showHistory == h) FontWeight.ExtraBold else FontWeight.SemiBold, if (showHistory == h) C.Text else C.Text3)
                        Box(Modifier.padding(top = 6.dp).size(width = 40.dp, height = 3.dp).background(if (showHistory == h) C.Red else Color.Transparent))
                    }
                }
            }
        }
        if (store.dramas == null) { Loading(); return@Column }
        if (showHistory) {
            val rows = me.progress.entries.sortedByDescending { it.value.updated }.mapNotNull { (id, p) -> store.drama(id)?.let { it to p.ep } }
            if (rows.isEmpty()) { Empty(Icons.Outlined.SlowMotionVideo, "No history yet", "Dramas you start watching show up here so you can jump back in.", action = { Btn("Start watching", { store.openTab(Tab.Home) }) }); return@Column }
            LazyColumn(contentPadding = PaddingValues(horizontal = 16.dp)) {
                items(rows, key = { it.first.id }) { (d, ep) ->
                    val done = ep >= d.episodes && d.completed
                    Row(Modifier.fillMaxWidth().padding(vertical = 10.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Poster(d, Modifier.width(60.dp).clickable { store.go(Route.Drama(d.id)) }, showEps = false, badge = false)
                        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            T(d.title, weight = FontWeight.Bold, lines = 1)
                            T("EP $ep of ${d.episodes}", 13.sp, color = C.Text3)
                            Box(Modifier.width(120.dp).height(4.dp).clip(RoundedCornerShape(2.dp)).background(C.Surface2)) {
                                Box(Modifier.fillMaxWidth((ep / d.episodes.coerceAtLeast(1).toFloat()).coerceIn(0f, 1f)).height(4.dp).background(C.Red))
                            }
                        }
                        Btn(if (done) "Rewatch" else "Continue", { store.go(Route.Watch(d.id, if (done) 1 else ep)) }, kind = Kind.Soft, small = true)
                    }
                    Box(Modifier.fillMaxWidth().height(1.dp).background(C.Surface))
                }
            }
        } else {
            val items = store.pick(me.saved)
            if (items.isEmpty()) { Empty(Icons.Outlined.BookmarkBorder, "Nothing saved yet", "Tap Save on any drama and it lands here, with a note when new episodes drop.", action = { Btn("Find something to watch", { store.openTab(Tab.Home) }) }); return@Column }
            LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                items(items.chunked(3)) { row ->
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        row.forEach { d ->
                            val at = me.progress[d.id]?.ep ?: 0
                            Box(Modifier.weight(1f)) {
                                PosterCard(d, { store.go(if (at > 0 && d.published) Route.Watch(d.id, at) else Route.Drama(d.id)) },
                                    sub = if (!d.published) "Coming soon" else if (at > 0) "EP $at / ${d.episodes}" else "Not started", progress = at / d.episodes.coerceAtLeast(1).toFloat(), badge = false)
                                if (editing) Box(Modifier.align(Alignment.TopEnd).padding(4.dp).size(36.dp).clip(CircleShape).background(Color(0xCC0F0C11)).clickable { store.act { store.toggle("saved", d.id) } },
                                    contentAlignment = Alignment.Center) { Icon(Icons.Default.Close, "Remove ${d.title}", tint = Color.White, modifier = Modifier.size(16.dp)) }
                            }
                        }
                        repeat(3 - row.size) { Spacer(Modifier.weight(1f)) }
                    }
                }
            }
        }
    }
}

// ---------------- Store, VIP, payment, wallet ----------------

@Composable
fun StoreScreen() {
    val store = LocalStore.current
    val me = store.me ?: return
    val packs = store.config?.coinPacks.orEmpty()
    var pick by remember { mutableIntStateOf(1) }
    Column(Modifier.fillMaxSize()) {
        TopBar("Coin Store", { store.back() }) { Btn("Records", { store.go(Route.Wallet) }, kind = Kind.Ghost, small = true) }
        LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            item {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    T("Your balance", 13.sp, color = C.Text2)
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) { CoinIcon(30.dp); T("${me.coins}", 34.sp, FontWeight.Black) }
                    T("Most episodes cost ${store.config?.coinsPerEpisode ?: 60} coins.", 13.sp, color = C.Text3)
                }
            }
            item { Banner("VIP watches everything", "Cheaper than coins if you binge", C.GoldBg, C.Gold, onClick = { store.go(Route.Vip) }, icon = { CrownIcon(26.dp) }) }
            items(packs.chunked(2)) { row ->
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    row.forEach { p ->
                        val i = packs.indexOf(p)
                        Column(Modifier.weight(1f).heightIn(min = 92.dp).clip(RoundedCornerShape(16.dp)).background(if (pick == i) C.AccentSoft else C.Surface).outlined(pick == i).clickable { pick = i }.padding(14.dp),
                            verticalArrangement = Arrangement.spacedBy(4.dp, Alignment.CenterVertically)) {
                            if (p.tag.isNotEmpty()) T(p.tag, 10.sp, FontWeight.ExtraBold, C.Accent)
                            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                CoinIcon(); T("${p.coins}", 20.sp, FontWeight.ExtraBold)
                                if (p.bonus > 0) T("+${p.bonus}", 13.sp, FontWeight.Bold, C.Warn)
                            }
                            T(price(p.priceCents), 14.sp, FontWeight.SemiBold, C.Text2)
                        }
                    }
                    if (row.size == 1) Spacer(Modifier.weight(1f))
                }
            }
            packs.getOrNull(pick)?.let { p ->
                item {
                    if (me.user.signedIn) Btn("Pay ${price(p.priceCents)} · get ${p.coins + p.bonus} coins", { store.go(Route.Payment(p.id)) }, Modifier.fillMaxWidth())
                    else Btn("Sign in to buy coins", { store.go(Route.Login) }, Modifier.fillMaxWidth())
                }
            }
            item { T("Demo checkout: no real payment is made. The store build pays through Google Play.", 12.sp, color = C.Text3, align = TextAlign.Center, modifier = Modifier.fillMaxWidth()) }
        }
    }
}

@Composable
fun VipScreen() {
    val store = LocalStore.current
    val me = store.me ?: return
    val cfg = store.config
    val plans = cfg?.vipPlans.orEmpty()
    var pick by remember { mutableIntStateOf(1) }
    val sub = me.subscription
    val perks = listOf("All episodes unlocked", "No ads", "1080p and 4K", "New dramas first", "+${cfg?.vipBonus ?: 20} coins on check-in", "Watch on web too")
    Column(Modifier.fillMaxSize().background(Color(0xFF120F0B))) {
        TopBar(onBack = { store.back() })
        LazyColumn(contentPadding = PaddingValues(16.dp, 0.dp, 16.dp, 32.dp), verticalArrangement = Arrangement.spacedBy(24.dp)) {
            item {
                Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    CrownIcon(48.dp)
                    T("The Ending VIP", 26.sp, FontWeight.Black, C.Gold)
                    T("Every episode, every drama. No waiting, no ads.", color = Color(0xFFD9CFC0), align = TextAlign.Center)
                }
            }
            when (sub.state) {
                "active" -> item {
                    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(C.GoldBg).padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        T("You're VIP · ${sub.plan}", weight = FontWeight.Bold, color = C.Gold)
                        T("Active until ${fmtDate(sub.until)}. In the store build you manage or cancel VIP in Google Play.", 13.sp, color = Color(0xFFD9B571))
                        Btn("End VIP now (demo)", { store.act { store.cancelVip(); store.show("VIP ended") } }, kind = Kind.Secondary, small = true)
                    }
                }
                "pending" -> item { Banner("Payment pending", "Your VIP ${sub.plan} payment is being confirmed. You don't need to pay again.", C.InfoBg, C.Info) }
                "failed" -> item { Banner("Payment didn't go through", "You weren't charged; pick a plan to try again.", C.BadBg, C.Bad) }
                "expired" -> item { Banner("VIP ended on ${fmtDate(sub.until)}", "Renew to keep watching everything.", C.BadBg, C.Bad) }
            }
            item {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    perks.chunked(2).forEach { row ->
                        Row {
                            row.forEach { p -> Row(Modifier.weight(1f), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                Icon(Icons.Default.Check, null, tint = C.Gold, modifier = Modifier.size(18.dp)); T(p, 14.sp, color = Color(0xFFF5EDE0)) } }
                        }
                    }
                }
            }
            items(plans) { p ->
                val i = plans.indexOf(p)
                Box {
                    Row(Modifier.fillMaxWidth().heightIn(min = 68.dp).clip(RoundedCornerShape(16.dp)).background(if (pick == i) C.GoldBg else Color(0xFF1E1914)).outlined(pick == i, C.Gold).clickable { pick = i }.padding(horizontal = 16.dp),
                        verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) { T(p.name, 16.sp, FontWeight.Bold); if (p.note.isNotEmpty()) T(p.note, 13.sp, color = Color(0xFFB8AC98)) }
                        T(price(p.priceCents), 18.sp, FontWeight.Bold)
                    }
                    if (p.tag.isNotEmpty()) T(p.tag, 11.sp, FontWeight.ExtraBold, Color(0xFF2A1A00), Modifier.padding(start = 14.dp).background(C.Gold, RoundedCornerShape(8.dp)).padding(horizontal = 8.dp, vertical = 2.dp))
                }
            }
            plans.getOrNull(pick)?.let { p ->
                item {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        if (me.user.signedIn) Btn("${if (sub.state == "active") "Add" else "Start"} ${p.name} VIP · ${price(p.priceCents)}", { store.go(Route.Payment(p.id)) }, Modifier.fillMaxWidth(), Kind.Gold)
                        else Btn("Sign in to join VIP", { store.go(Route.Login) }, Modifier.fillMaxWidth(), Kind.Gold)
                        T("${p.name} plan renews automatically at ${price(p.priceCents)}. Cancel anytime in Google Play. Demo checkout: no real payment.", 12.sp, color = Color(0xFF9A9080), align = TextAlign.Center, modifier = Modifier.fillMaxWidth())
                    }
                }
            }
        }
    }
}

@Composable
fun PaymentScreen(productId: String) {
    val store = LocalStore.current
    val cfg = store.config
    val pack = cfg?.coinPacks?.firstOrNull { it.id == productId }
    val plan = cfg?.vipPlans?.firstOrNull { it.id == productId }
    var result by remember { mutableStateOf<Payment?>(null) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val item = when {
        pack != null -> "${pack.coins + pack.bonus} coins" + if (pack.bonus > 0) " (${pack.coins} + ${pack.bonus} bonus)" else ""
        plan != null -> "VIP ${plan.name}"
        else -> ""
    }
    val amount = price(pack?.priceCents ?: plan?.priceCents ?: 0)
    val pay = { outcome: String ->
        store.act {
            busy = true; error = null
            try { result = store.buy(productId, outcome) } catch (e: ApiException) { error = e.message } finally { busy = false }
        }
        Unit
    }
    Column(Modifier.fillMaxSize()) {
        TopBar("Payment", { store.back() })
        if (item.isEmpty()) { Empty(null, "This product isn't available", "Pick a coin pack or VIP plan again."); return@Column }
        val r = result
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            if (r == null) {
                T("Confirm purchase", 24.sp, FontWeight.ExtraBold)
                Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(C.Surface).padding(horizontal = 16.dp)) {
                    Row(Modifier.heightIn(min = 48.dp), verticalAlignment = Alignment.CenterVertically) { T("Item", color = C.Text3, modifier = Modifier.weight(1f)); T(item, weight = FontWeight.SemiBold) }
                    Box(Modifier.fillMaxWidth().height(1.dp).background(C.Surface2))
                    Row(Modifier.heightIn(min = 48.dp), verticalAlignment = Alignment.CenterVertically) { T("Price", color = C.Text3, modifier = Modifier.weight(1f)); T(amount, weight = FontWeight.Bold) }
                }
                T("Demo checkout: nothing is charged. In the store build this is the Google Play payment sheet. The order is recorded either way; pick how the store answers.", 13.sp, color = C.Text2, lineHeight = 19.sp)
                error?.let { T(it, 13.sp, color = C.Bad) }
                Btn("Pay $amount", { pay("success") }, Modifier.fillMaxWidth(), enabled = !busy)
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Btn("Store says pending", { pay("pending") }, Modifier.weight(1f), Kind.Secondary, enabled = !busy, small = true)
                    Btn("Store declines", { pay("failed") }, Modifier.weight(1f), Kind.Secondary, enabled = !busy, small = true)
                }
            } else {
                val (title, body, tint) = when (r.status) {
                    "Paid" -> Triple(if (pack != null) "${pack.coins + pack.bonus} coins added" else "Welcome to VIP ${plan?.name}", if (plan != null) "Every episode is unlocked. Enjoy." else "Your balance is updated. Enjoy the next episode.", C.Accent)
                    "Pending" -> Triple("Payment pending", "Your store is still confirming this payment. It's added the moment it clears. You don't need to pay again.", C.Info)
                    else -> Triple("Payment didn't go through", "You were not charged. Check your payment method and try again.", C.Bad)
                }
                Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Box(Modifier.size(80.dp).clip(CircleShape).background(tint.copy(alpha = .15f)), contentAlignment = Alignment.Center) {
                        Icon(when (r.status) { "Paid" -> Icons.Default.Check; "Pending" -> Icons.Default.MoreHoriz; else -> Icons.Default.Close }, null, tint = tint, modifier = Modifier.size(36.dp))
                    }
                    T(title, 24.sp, FontWeight.ExtraBold, align = TextAlign.Center)
                    T(body, color = C.Text2, align = TextAlign.Center)
                }
                listOf("Item" to item, "Amount" to amount, "Date" to fmtStamp(r.at), "Order" to r.order).forEach { (k, v) ->
                    Row(Modifier.heightIn(min = 46.dp), verticalAlignment = Alignment.CenterVertically) { T(k, 14.sp, color = C.Text3, modifier = Modifier.weight(1f)); T(v, 14.sp, FontWeight.SemiBold) }
                    Box(Modifier.fillMaxWidth().height(1.dp).background(C.Surface))
                }
                when (r.status) {
                    "Failed" -> { Btn("Try again", { result = null }, Modifier.fillMaxWidth()); Btn("Get help", { store.go(Route.Help) }, Modifier.fillMaxWidth(), Kind.Ghost) }
                    else -> { Btn("Back to watching", { store.back(); store.back() }, Modifier.fillMaxWidth()); Btn(if (r.status == "Pending") "Check status in Wallet" else "View coin records", { store.go(Route.Wallet) }, Modifier.fillMaxWidth(), Kind.Ghost) }
                }
            }
        }
    }
}

@Composable
fun WalletScreen() {
    val store = LocalStore.current
    val me = store.me ?: return
    var tab by remember { mutableStateOf("All") }
    val wallet = rememberLoad("wallet") { store.api.arr("/wallet").objects { WalletEntry(it.str("what"), it.optInt("amount"), it.optLong("at")) } }
    val payments = rememberLoad("payments", me.user.signedIn) { if (me.user.signedIn) store.api.arr("/payments").objects(Payment::from) else emptyList() }
    val pending = payments.data.orEmpty().filter { it.status == "Pending" }
    val tabs = listOf("All", "Earned", "Spent") + if (me.user.signedIn) listOf("Purchases") else emptyList()
    Column(Modifier.fillMaxSize()) {
        TopBar("Wallet", { store.back() })
        LazyColumn(contentPadding = PaddingValues(16.dp, 0.dp, 16.dp, 24.dp)) {
            item {
                Row(Modifier.padding(top = 8.dp, bottom = 18.dp), verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        T("Coins", 13.sp, color = C.Text2)
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) { CoinIcon(28.dp); T("${me.coins}", 32.sp, FontWeight.Black) }
                    }
                    Btn("Top up", { store.go(Route.Store) }, small = true)
                }
            }
            if (pending.isNotEmpty() && tab != "Purchases") item {
                Banner(if (pending.size == 1) "1 payment is pending" else "${pending.size} payments are pending", "Coins or VIP are added the moment the store confirms. Order ${pending.first().order}.",
                    C.InfoBg, C.Info, Modifier.padding(bottom = 14.dp), onClick = { tab = "Purchases" })
            }
            item {
                Row(horizontalArrangement = Arrangement.spacedBy(22.dp)) {
                    tabs.forEach { t ->
                        Column(Modifier.clickable { tab = t }) {
                            T(t, weight = FontWeight.Bold, color = if (tab == t) C.Text else C.Text3, modifier = Modifier.padding(vertical = 10.dp))
                            Box(Modifier.size(24.dp, 2.dp).background(if (tab == t) C.Red else Color.Transparent))
                        }
                    }
                }
            }
            if (tab == "Purchases") {
                val list = payments.data
                if (list == null) item { LoadOr(payments.error, payments.reload) }
                else if (list.isEmpty()) item { Empty(null, "No purchases yet", "Coin packs and VIP you buy show up here.") }
                else items(list, key = { it.order }) { p ->
                    Row(Modifier.fillMaxWidth().padding(vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) { T(p.item, weight = FontWeight.SemiBold); T("${fmtStamp(p.at)} · ${p.order}", 12.sp, color = C.Text3) }
                        Column(horizontalAlignment = Alignment.End) {
                            T(price(p.amountCents), weight = FontWeight.Bold)
                            T(p.status, 12.sp, FontWeight.SemiBold, when (p.status) { "Paid" -> C.Good; "Pending" -> C.Warn; "Refunded" -> C.Info; else -> C.Bad })
                        }
                    }
                    Box(Modifier.fillMaxWidth().height(1.dp).background(C.Surface))
                }
            } else {
                val rows = wallet.data?.filter { tab == "All" || (tab == "Earned") == (it.amount > 0) }
                if (rows == null) item { LoadOr(wallet.error, wallet.reload) }
                else if (rows.isEmpty()) item { Empty(null, "No records yet", "Coins you earn and spend show up here.") }
                else items(rows) { r ->
                    Row(Modifier.fillMaxWidth().padding(vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) { T(r.what, weight = FontWeight.SemiBold, lines = 1); T(fmtStamp(r.at), 12.sp, color = C.Text3) }
                        T((if (r.amount > 0) "+" else "−") + kotlin.math.abs(r.amount), 16.sp, FontWeight.ExtraBold, if (r.amount > 0) C.Warn else C.Text2)
                    }
                    Box(Modifier.fillMaxWidth().height(1.dp).background(C.Surface))
                }
            }
        }
    }
}
