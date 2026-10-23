package com.mws.theending

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings as AndroidSettings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.ExpandLess
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.outlined.Email
import androidx.compose.material.icons.outlined.PersonOutline
import androidx.compose.material.icons.outlined.SlowMotionVideo
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
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
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.mws.theending.ui.Avatar
import com.mws.theending.ui.Banner
import com.mws.theending.ui.Btn
import com.mws.theending.ui.C
import com.mws.theending.ui.ChipBtn
import com.mws.theending.ui.CoinIcon
import com.mws.theending.ui.CrownIcon
import com.mws.theending.ui.Empty
import com.mws.theending.ui.Field
import com.mws.theending.ui.GroupTitle
import com.mws.theending.ui.Kind
import com.mws.theending.ui.ListRow
import com.mws.theending.ui.LoadOr
import com.mws.theending.ui.T
import com.mws.theending.ui.Toggle
import com.mws.theending.ui.TopBar
import kotlinx.coroutines.delay

@Composable
fun Input(value: String, onChange: (String) -> Unit, placeholder: String = "", modifier: Modifier = Modifier, keyboard: KeyboardType = KeyboardType.Text,
          singleLine: Boolean = true, minLines: Int = 1, enabled: Boolean = true) {
    OutlinedTextField(value, onChange, modifier.fillMaxWidth(), enabled = enabled, singleLine = singleLine, minLines = minLines,
        placeholder = { Text(placeholder, color = C.Text3) }, keyboardOptions = KeyboardOptions(keyboardType = keyboard), shape = RoundedCornerShape(14.dp),
        colors = OutlinedTextFieldDefaults.colors(focusedBorderColor = C.Accent, unfocusedBorderColor = Color(0xFF3A3340), focusedContainerColor = C.Surface,
            unfocusedContainerColor = C.Surface, disabledContainerColor = Color(0xFF15121A), cursorColor = C.Accent, disabledTextColor = C.Text2))
}

// ---------------- Sign-in ----------------

@Composable
fun LoginScreen() {
    val store = LocalStore.current
    var busy by remember { mutableStateOf(false) }
    Column(Modifier.fillMaxSize().statusBarsPadding().navigationBarsPadding().padding(24.dp, 16.dp, 24.dp, 32.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) { Btn("Not now", { store.back() }, kind = Kind.Ghost, small = true) }
        Column(Modifier.weight(1f).fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(16.dp, Alignment.CenterVertically)) {
            Image(painterResource(R.drawable.logo_mark), "The Ending logo", Modifier.size(80.dp, 112.dp))
            T("The Endıng", 30.sp, FontWeight.Black)
            T("Sign in to save your progress, collect coins and continue on any device.", color = C.Text2, align = TextAlign.Center)
        }
        Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Btn("Continue with Google", {
                store.act {
                    busy = true
                    try {
                        val me = store.signInWithGoogle()
                        store.reset(); store.tab = Tab.Home
                        if (!me.onboarded) store.go(Route.Welcome)
                    } finally { busy = false }
                }
            }, Modifier.fillMaxWidth(), Kind.Light, enabled = !busy, leading = { T("G", 18.sp, FontWeight.Black, Color(0xFF4285F4)) })
            Btn("Continue with email", { store.go(Route.Email) }, Modifier.fillMaxWidth(), Kind.Secondary,
                leading = { Icon(Icons.Outlined.Email, null, tint = C.Text, modifier = Modifier.size(20.dp)) })
            T("Demo sign-in: Google is simulated and makes a new account each time. Use email to come back to the same account. By continuing you agree to our Terms and Privacy Policy.",
                12.sp, color = C.Text3, align = TextAlign.Center, lineHeight = 18.sp)
        }
    }
}

private val emailRe = Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")

@Composable
fun EmailScreen() {
    val store = LocalStore.current
    var email by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val valid = emailRe.matches(email.trim())
    Column(Modifier.fillMaxSize().imePadding()) {
        TopBar(onBack = { store.back() })
        Column(Modifier.weight(1f).padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            T("Sign in with email", 28.sp, FontWeight.ExtraBold)
            T("We'll send a 6-digit code. No password needed.", color = C.Text2)
            Spacer(Modifier.height(24.dp))
            Field("Email address") { Input(email, { email = it }, "you@example.com", keyboard = KeyboardType.Email) }
            error?.let { T(it, 13.sp, color = C.Bad) }
        }
        Column(Modifier.navigationBarsPadding().padding(20.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Btn("Send code", {
                store.act {
                    busy = true; error = null
                    try { store.go(store.startEmail(email.trim())) } catch (e: ApiException) { error = e.message } finally { busy = false }
                }
            }, Modifier.fillMaxWidth(), enabled = valid && !busy)
            T("Demo: no email is sent. The code is shown on the next screen and expires in 10 minutes.", 12.sp, color = C.Text3, align = TextAlign.Center, modifier = Modifier.fillMaxWidth())
        }
    }
}

@Composable
fun CodeScreen(start: Route.Code) {
    val store = LocalStore.current
    var challenge by remember { mutableStateOf(start) }
    var code by remember { mutableStateOf("") }
    var error by remember { mutableStateOf<String?>(null) }
    var locked by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }
    var wait by remember { mutableIntStateOf(45) }
    LaunchedEffect(wait) { if (wait > 0) { delay(1000); wait-- } }
    Column(Modifier.fillMaxSize().imePadding()) {
        TopBar(onBack = { store.back() })
        Column(Modifier.weight(1f).padding(horizontal = 20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            T("Enter the code", 28.sp, FontWeight.ExtraBold)
            T("Sent to ${challenge.email}", color = C.Text2)
            Spacer(Modifier.height(20.dp))
            Input(code, { v -> code = v.filter { it.isDigit() }.take(6); if (!locked) error = null }, "6-digit code", keyboard = KeyboardType.NumberPassword)
            error?.let {
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Icon(Icons.Default.ErrorOutline, null, tint = C.Bad, modifier = Modifier.size(18.dp)); T(it, 13.sp, color = C.Bad)
                }
            }
            if (wait > 0) T("Resend code in 0:%02d".format(wait), 13.sp, color = C.Text3)
            else T("Resend code", 13.sp, FontWeight.Bold, C.Accent, Modifier.clickable {
                store.act { challenge = store.startEmail(challenge.email); wait = 45; locked = false; error = null; code = "" }
            })
            T("Demo: no email was sent. Your code is ${challenge.demoCode}.", 12.sp, color = C.Text3)
        }
        Btn("Verify", {
            store.act {
                busy = true
                try {
                    val me = store.verifyEmail(challenge.challengeId, code)
                    store.reset(); store.tab = Tab.Home
                    if (!me.onboarded) store.go(Route.Welcome)
                } catch (e: ApiException) {
                    error = e.message
                    if (e.status == 429 || e.status == 410) locked = true
                } finally { busy = false }
            }
        }, Modifier.fillMaxWidth().navigationBarsPadding().padding(20.dp), enabled = code.length == 6 && !busy && !locked)
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
fun WelcomeScreen() {
    val store = LocalStore.current
    var picked by remember { mutableStateOf(listOf("Romance", "CEO", "Revenge")) }
    val finish = { genres: List<String> -> store.act { store.updateMe(json("onboarded" to true, "genres" to genres)); store.reset(); store.bump() } }
    Column(Modifier.fillMaxSize().statusBarsPadding().navigationBarsPadding().padding(20.dp)) {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) { Btn("Skip", { finish(emptyList()) }, kind = Kind.Ghost, small = true) }
        T("What do you love to watch?", 28.sp, FontWeight.ExtraBold, modifier = Modifier.padding(top = 24.dp, bottom = 8.dp), lineHeight = 34.sp)
        T("Pick a few. We'll fill your For You feed with stories like these.", color = C.Text2, modifier = Modifier.padding(bottom = 28.dp))
        FlowRow(horizontalArrangement = Arrangement.spacedBy(10.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            store.config?.genres.orEmpty().forEach { g ->
                val on = g in picked
                Box(Modifier.heightIn(min = 44.dp).clip(RoundedCornerShape(22.dp)).background(if (on) C.Primary else C.Surface).clickable { picked = if (on) picked - g else picked + g }.padding(horizontal = 18.dp),
                    contentAlignment = Alignment.Center) { T(g, weight = FontWeight.SemiBold, color = if (on) Color.White else Color(0xFFE6E0E8)) }
            }
        }
        Spacer(Modifier.weight(1f))
        T("${picked.size} selected", 13.sp, color = C.Text3, align = TextAlign.Center, modifier = Modifier.fillMaxWidth().padding(bottom = 12.dp))
        Btn("Start watching", { finish(picked) }, Modifier.fillMaxWidth())
    }
}

// ---------------- Me ----------------

@Composable
fun MeScreen() {
    val store = LocalStore.current
    val me = store.me ?: return
    val lang = LANGUAGES.firstOrNull { it.first == me.settings.language }?.third ?: "English"
    LazyColumn(Modifier.statusBarsPadding(), contentPadding = PaddingValues(16.dp, 24.dp, 16.dp, 24.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        item {
            if (me.user.signedIn) {
                Row(Modifier.clickable { store.go(Route.EditProfile) }, verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                    Avatar(me.user.initial, Color(me.user.color), 64.dp)
                    Column(Modifier.weight(1f)) { T(me.user.name, 20.sp, FontWeight.Bold); T("ID ${me.user.id} · ${me.user.via}", 13.sp, color = C.Text3) }
                    Icon(Icons.Default.ChevronRight, null, tint = C.Text3)
                }
            } else {
                Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                        Box(Modifier.size(64.dp).clip(CircleShape).background(C.Surface), contentAlignment = Alignment.Center) { Icon(Icons.Outlined.PersonOutline, null, tint = C.Text3, modifier = Modifier.size(30.dp)) }
                        Column { T("Guest", 20.sp, FontWeight.Bold); T("Progress is saved to this device's guest account", 13.sp, color = C.Text3) }
                    }
                    Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(C.AccentSoft).padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        T("Sign in to keep your coins safe", 17.sp, FontWeight.Bold)
                        T("Sync your list and progress across phone and web, and get ${store.config?.tasks?.get("signin") ?: 30} bonus coins.", 13.sp, color = Color(0xFFD7C3CB))
                        Btn("Sign in", { store.go(Route.Login) }, Modifier.fillMaxWidth())
                    }
                }
            }
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                Column(Modifier.weight(1f).clip(RoundedCornerShape(16.dp)).background(C.Surface).clickable { store.go(Route.Wallet) }.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    T("Coins", 13.sp, color = C.Text2)
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) { CoinIcon(20.dp); T("${me.coins}", 22.sp, FontWeight.Black) }
                    T("Top up ›", 13.sp, FontWeight.Bold, C.Accent)
                }
                Column(Modifier.weight(1f).clip(RoundedCornerShape(16.dp)).background(C.GoldBg).clickable { store.go(Route.Vip) }.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    T("Membership", 13.sp, color = Color(0xFFD9B571))
                    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) { CrownIcon(20.dp); T(if (me.vip) "VIP" else "Free", 22.sp, FontWeight.Black, C.Gold) }
                    T(if (me.vip) "Until ${fmtDate(me.subscription.until)}" else "Join VIP ›", 13.sp, color = Color(0xFFD9B571))
                }
            }
        }
        item {
            Column {
                if (me.user.signedIn) ListRow("Notifications", { store.go(Route.Inbox) }, badge = me.unread)
                ListRow("Coin store", { store.go(Route.Store) })
                ListRow("Watch history", { store.go(Route.History) })
                ListRow("Invite friends", { store.tab = Tab.Rewards }, "+${store.config?.tasks?.get("invite") ?: 50} coins")
                ListRow("Language", { store.go(Route.Language) }, lang)
                ListRow("Settings", { store.go(Route.Settings) })
                ListRow("Help & feedback", { store.go(Route.Help) })
                ListRow("About", { store.go(Route.About) })
            }
        }
        item { T("The admin panel opens on the web at ${store.api.baseUrl}/admin/", 12.sp, color = C.Text3) }
    }
}

@Composable
fun EditProfileScreen() {
    val store = LocalStore.current
    val me = store.me ?: return
    var name by remember { mutableStateOf(me.user.name) }
    var confirmOut by remember { mutableStateOf(false) }
    val trimmed = name.trim()
    Column(Modifier.fillMaxSize()) {
        TopBar("Edit profile", { store.back() }) {
            Btn("Save", { store.act { store.updateMe(json("name" to trimmed)); store.show("Profile saved") } }, kind = Kind.Ghost, small = true, enabled = trimmed.isNotEmpty() && trimmed != me.user.name)
        }
        Column(Modifier.verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(24.dp)) {
            Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) { Avatar(trimmed.take(1).uppercase().ifEmpty { me.user.initial }, Color(me.user.color), 88.dp) }
            Field("Display name") { Input(name, { if (it.length <= 30) name = it }) }
            T("Shown on your comments.", 12.sp, color = C.Text3)
            if (me.user.email.isNotEmpty()) Field("Email") { Input(me.user.email, {}, enabled = false) }
            Column {
                GroupTitle("Sign-in method")
                ListRow(me.user.via, value = "Connected")
            }
            Column {
                ListRow("Sign out", { confirmOut = true })
                ListRow("Delete account", { store.go(Route.DeleteAccount) }, color = C.Bad)
            }
        }
    }
    if (confirmOut) DialogCard({ confirmOut = false }) {
        T("Sign out?", 20.sp, FontWeight.ExtraBold)
        T("Your coins, VIP and list stay safe in your account. Sign in again any time to get them back.", color = C.Text2, align = TextAlign.Center)
        Btn("Sign out", { confirmOut = false; store.act { store.signOut(); store.reset(); store.tab = Tab.Me } }, Modifier.fillMaxWidth(), Kind.Danger)
        Btn("Cancel", { confirmOut = false }, Modifier.fillMaxWidth(), Kind.Ghost)
    }
}

@Composable
fun DeleteAccountScreen() {
    val store = LocalStore.current
    val me = store.me ?: return
    var typed by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    val ok = typed.trim().uppercase() == "DELETE"
    Column(Modifier.fillMaxSize()) {
        TopBar("Delete account", { store.back() })
        Column(Modifier.verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            T("This permanently deletes your account", 22.sp, FontWeight.ExtraBold)
            listOf("Your profile, comments, list and watch history", "${me.coins} coins and every episode you unlocked", "Sign-in with ${if (me.user.via == "Google") "Google" else "email"} for this account")
                .forEach { T("•  $it", color = Color(0xFFD7D0DA)) }
            if (me.vip) Banner("VIP is billed by Google Play", "Cancel it there first, or it keeps renewing.", C.GoldBg, C.Gold)
            Field("Type DELETE to confirm") { Input(typed, { typed = it }, "DELETE") }
            Btn("Delete my account", {
                store.act { busy = true; try { store.deleteAccount(); store.reset(); store.tab = Tab.Home; store.show("Account deleted") } finally { busy = false } }
            }, Modifier.fillMaxWidth(), Kind.Danger, enabled = ok && !busy)
            Btn("Keep my account", { store.back() }, Modifier.fillMaxWidth(), Kind.Ghost)
            T("Purchase records are kept for bookkeeping without your name or email.", 12.sp, color = C.Text3, align = TextAlign.Center, modifier = Modifier.fillMaxWidth())
        }
    }
}

// ---------------- Inbox ----------------

@Composable
fun InboxScreen() {
    val store = LocalStore.current
    val me = store.me ?: return
    if (!me.user.signedIn) {
        Column(Modifier.fillMaxSize()) {
            TopBar("Notifications", { store.back() })
            Empty(Icons.Outlined.PersonOutline, "Sign in to continue", "Keep your coins, list and progress safe across phone and web.", action = { Btn("Sign in", { store.go(Route.Login) }) })
        }
        return
    }
    val q = rememberLoad("inbox") { store.api.arr("/inbox").objects(InboxItem::from) }
    val items = q.data
    val refresh = { store.act { store.refreshMe() } }
    Column(Modifier.fillMaxSize()) {
        TopBar("Notifications", { store.back() }) {
            if (items?.any { !it.read } == true) Btn("Read all", { store.act { store.api.post("/inbox/read", json("id" to 0)); store.refreshMe() } }, kind = Kind.Ghost, small = true)
        }
        when {
            items == null -> LoadOr(q.error, q.reload)
            items.isEmpty() -> Empty(Icons.Default.Notifications, "All caught up", "New episodes and rewards will show up here.", muted = true)
            else -> LazyColumn(contentPadding = PaddingValues(horizontal = 16.dp)) {
                items(items, key = { it.id }) { n ->
                    Row(Modifier.fillMaxWidth().clickable {
                        if (!n.read) store.act { store.api.post("/inbox/read", json("id" to n.id)); refresh() }
                        openHref(store, n.href)
                    }.padding(vertical = 14.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        Box(Modifier.size(40.dp).clip(CircleShape).background(when (n.kind) { "ep" -> C.AccentSoft; "sys" -> C.Surface; else -> C.GoldBg }), contentAlignment = Alignment.Center) {
                            when (n.kind) {
                                "coin" -> CoinIcon(20.dp)
                                "vip" -> CrownIcon(20.dp)
                                "ep" -> Icon(Icons.Outlined.SlowMotionVideo, null, tint = C.Accent, modifier = Modifier.size(20.dp))
                                else -> Icon(Icons.Default.Notifications, null, tint = C.Text2, modifier = Modifier.size(20.dp))
                            }
                        }
                        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(3.dp)) {
                            T(n.title, weight = if (n.read) FontWeight.Medium else FontWeight.Bold)
                            if (n.body.isNotEmpty()) T(n.body, 13.sp, color = C.Text2)
                            T(fmtStamp(n.at), 12.sp, color = C.Text3)
                        }
                        if (!n.read) Box(Modifier.padding(top = 6.dp).size(8.dp).clip(CircleShape).background(C.Red))
                    }
                    Box(Modifier.fillMaxWidth().height(1.dp).background(C.Surface))
                }
                item { Btn("Clear all", { store.act { store.api.delete("/inbox"); store.refreshMe() } }, Modifier.fillMaxWidth().padding(top = 8.dp), Kind.Ghost) }
            }
        }
    }
}

/** Opens a web path from a notification inside the app when it maps to a screen. */
fun openHref(store: AppStore, href: String) {
    val path = href.substringBefore('?')
    val ep = Regex("ep=(\\d+)").find(href)?.groupValues?.get(1)?.toIntOrNull()
    val parts = path.split('/').filter { it.isNotEmpty() }
    when {
        parts.size >= 2 && parts[0] == "drama" -> store.go(Route.Drama(parts[1]))
        parts.size >= 2 && parts[0] == "watch" -> store.go(Route.Watch(parts[1], ep))
        parts.firstOrNull() == "wallet" -> store.go(Route.Wallet)
        parts.firstOrNull() == "vip" -> store.go(Route.Vip)
        parts.firstOrNull() == "rewards" -> store.openTab(Tab.Rewards)
        parts.firstOrNull() == "settings" -> store.go(Route.Settings)
        parts.firstOrNull() == "new" -> { store.openTab(Tab.Home); store.homeTab = HomeTab.New }
        else -> store.openTab(Tab.Home)
    }
}

// ---------------- Settings ----------------

@Composable
fun SettingsScreen() {
    val store = LocalStore.current
    val me = store.me ?: return
    val s = me.settings
    Column(Modifier.fillMaxSize()) {
        TopBar("Settings", { store.back() })
        Column(Modifier.verticalScroll(rememberScrollState()).padding(horizontal = 16.dp).padding(bottom = 24.dp)) {
            GroupTitle("Playback")
            ListRow("Autoplay next episode", trailing = { Toggle(s.autoplay, { store.act { store.setSettings(s.copy(autoplay = it)) } }) })
            ListRow("Auto-unlock with coins", trailing = { Toggle(s.autoUnlock, { store.act { store.setSettings(s.copy(autoUnlock = it)) } }) })
            ListRow("Play on mobile data", trailing = { Toggle(s.cellular, { store.act { store.setSettings(s.copy(cellular = it)) } }) })
            GroupTitle("App")
            ListRow("Language", { store.go(Route.Language) }, LANGUAGES.firstOrNull { it.first == s.language }?.third)
            ListRow("Notifications", { store.go(Route.NotifySettings) })
            ListRow("Server", { store.go(Route.Server) }, store.api.baseUrl.removePrefix("http://").removePrefix("https://"))
            ListRow("Clear cache", { store.act { store.refreshCatalog(); store.show("Cache cleared") } })
            if (me.user.signedIn) {
                GroupTitle("Account")
                ListRow("Edit profile and sign out", { store.go(Route.EditProfile) })
                ListRow("Delete account", { store.go(Route.DeleteAccount) }, color = C.Bad)
            }
            GroupTitle("About")
            ListRow("Terms & privacy", { store.go(Route.About) })
            ListRow("Version", value = BuildConfig.VERSION_NAME)
        }
    }
}

@Composable
fun LanguageScreen() {
    val store = LocalStore.current
    val me = store.me ?: return
    Column(Modifier.fillMaxSize()) {
        TopBar("Language", { store.back() })
        LazyColumn(contentPadding = PaddingValues(horizontal = 16.dp)) {
            items(LANGUAGES) { (code, name, english) ->
                Row(Modifier.fillMaxWidth().heightIn(min = 60.dp).clickable { store.act { store.setSettings(me.settings.copy(language = code)) } }, verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) { T(name, weight = FontWeight.SemiBold); T(english, 13.sp, color = C.Text3) }
                    if (me.settings.language == code) Icon(Icons.Default.Check, "Selected", tint = C.Accent)
                }
                Box(Modifier.fillMaxWidth().height(1.dp).background(C.Surface))
            }
            item { T("Subtitles follow this language when the drama offers it. The app interface is in English for now.", 13.sp, color = C.Text3, modifier = Modifier.padding(top = 16.dp)) }
        }
    }
}

@Composable
fun NotifySettingsScreen() {
    val store = LocalStore.current
    val context = LocalContext.current
    val me = store.me ?: return
    var granted by remember { mutableStateOf(Build.VERSION.SDK_INT < 33 || ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) }
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { ok ->
        granted = ok
        if (ok && me.tasks.any { it.key == "notify" && it.claimable }) store.act { store.claimTask("notify"); store.show("Notifications on · bonus coins added") }
    }
    val n = me.notify
    val row = @Composable { label: String, hint: String, on: Boolean, set: (Boolean) -> NotifyPrefs ->
        Row(Modifier.fillMaxWidth().heightIn(min = 62.dp), verticalAlignment = Alignment.CenterVertically) {
            Column(Modifier.weight(1f)) { T(label); if (hint.isNotEmpty()) T(hint, 13.sp, color = C.Text3) }
            Toggle(on, { store.act { store.setNotify(set(it)) } })
        }
        Box(Modifier.fillMaxWidth().height(1.dp).background(C.Surface))
    }
    Column(Modifier.fillMaxSize()) {
        TopBar("Notifications", { store.back() })
        Column(Modifier.verticalScroll(rememberScrollState()).padding(horizontal = 16.dp).padding(bottom = 24.dp)) {
            if (!granted) {
                Banner("Notifications are off for The Ending", "Turn them on to hear about new episodes. Your in-app inbox keeps working either way.", C.BadBg, Color(0xFFD7C3CB),
                    Modifier.padding(vertical = 8.dp), onClick = {
                        if (Build.VERSION.SDK_INT >= 33) launcher.launch(Manifest.permission.POST_NOTIFICATIONS)
                        else context.startActivity(Intent(AndroidSettings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(AndroidSettings.EXTRA_APP_PACKAGE, context.packageName))
                    })
                T("If Android stops asking, open system settings.", 12.sp, color = C.Text3, modifier = Modifier.clickable {
                    context.startActivity(Intent(AndroidSettings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:${context.packageName}")))
                })
            }
            GroupTitle("Notify me about")
            row("New episodes", "Dramas in My List", n.episodes) { n.copy(episodes = it) }
            row("Premiere reminders", "Dramas you asked to be reminded about", n.premieres) { n.copy(premieres = it) }
            row("Replies to my comments", "", n.replies) { n.copy(replies = it) }
            row("Rewards and offers", "Bonus coins and VIP deals", n.offers) { n.copy(offers = it) }
            GroupTitle("On this device")
            row("Daily check-in reminder", "A reminder at 8:00 PM", n.checkin) { n.copy(checkin = it) }
            T("Notifications arrive in your inbox under Me › Notifications.", 13.sp, color = C.Text3, modifier = Modifier.padding(top = 16.dp))
        }
    }
}

@Composable
fun ServerScreen() {
    val store = LocalStore.current
    var url by remember { mutableStateOf(store.api.baseUrl) }
    val valid = url.trim().startsWith("http://") || url.trim().startsWith("https://")
    Column(Modifier.fillMaxSize().background(C.Bg)) {
        TopBar("Server", { store.back() })
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
            Field("The Ending server address") { Input(url, { url = it }, "http://192.168.1.10:8080", keyboard = KeyboardType.Uri) }
            T("The emulator reaches your computer at http://10.0.2.2:8080. On a phone, use your computer's Wi-Fi address and start the server with ADDR=0.0.0.0:8080.", 13.sp, color = C.Text2, lineHeight = 19.sp)
            Btn("Save and reconnect", { store.changeServer(url) }, Modifier.fillMaxWidth(), enabled = valid)
            Btn("Use the emulator default", { url = BuildConfig.API_URL }, Modifier.fillMaxWidth(), Kind.Ghost)
        }
    }
}

// ---------------- Help and About ----------------

private val FAQS = listOf(
    "How do coins work?" to "Most episodes cost 60 coins to unlock, forever. Earn free coins from check-ins, tasks and short ads, or buy them in the Coin Store.",
    "I paid but didn't get coins" to "Open Wallet. If the payment shows as pending, coins arrive when your store confirms it. Still missing? Send us the order number below.",
    "How do I cancel VIP?" to "VIP renews through Google Play or the App Store. Cancel there any time; you keep VIP until the end of the paid period.",
    "A video won't play" to "Try a lower quality in the player menu, check your connection, then restart the app.",
    "Can I watch on the web?" to "Yes. Sign in with the same Google or email account and your list, coins and VIP follow you.",
)
private val TOPICS = listOf("Payment or coins", "Playback problem", "Account and sign-in", "Something else")

@Composable
fun HelpScreen() {
    val store = LocalStore.current
    var open by remember { mutableIntStateOf(0) }
    var topic by remember { mutableStateOf(TOPICS[0]) }
    var msg by remember { mutableStateOf("") }
    var sent by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }
    Column(Modifier.fillMaxSize().imePadding()) {
        TopBar("Help & feedback", { store.back() })
        Column(Modifier.verticalScroll(rememberScrollState()).padding(horizontal = 16.dp).padding(bottom = 24.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            GroupTitle("Common questions")
            FAQS.forEachIndexed { i, (q, a) ->
                Column {
                    Row(Modifier.fillMaxWidth().heightIn(min = 52.dp).clickable { open = if (open == i) -1 else i }, verticalAlignment = Alignment.CenterVertically) {
                        T(q, modifier = Modifier.weight(1f)); Icon(if (open == i) Icons.Default.ExpandLess else Icons.Default.ExpandMore, null, tint = C.Text3)
                    }
                    if (open == i) T(a, 13.sp, color = C.Text2, modifier = Modifier.padding(bottom = 14.dp), lineHeight = 20.sp)
                    Box(Modifier.fillMaxWidth().height(1.dp).background(C.Surface))
                }
            }
            GroupTitle("Still stuck? Write to us")
            if (sent) {
                Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(C.Surface).padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    T("Message sent", weight = FontWeight.Bold)
                    T("Our support team sees it in the admin panel" + (store.config?.supportEmail?.takeIf { it.isNotEmpty() }?.let { " and replies from $it" } ?: "") + ".", 13.sp, color = C.Text2)
                    Btn("Write another", { sent = false; msg = "" }, kind = Kind.Secondary, small = true)
                }
            } else {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        TOPICS.chunked(2).forEach { r -> Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) { r.forEach { ChipBtn(it, topic == it, { topic = it }, soft = true) } } }
                    }
                }
                Field("Message") { Input(msg, { if (it.length <= 2000) msg = it }, "Tell us what happened. Include the drama and episode if it's about playback.", singleLine = false, minLines = 4) }
                Btn("Send", {
                    store.act { busy = true; try { store.api.post("/help", json("topic" to topic, "message" to msg.trim())); sent = true } finally { busy = false } }
                }, Modifier.fillMaxWidth(), enabled = msg.isNotBlank() && !busy)
            }
        }
    }
}

@Composable
fun AboutScreen() {
    val store = LocalStore.current
    val context = LocalContext.current
    val sections = listOf(
        "Terms of Service" to "This build of The Ending is a demo. Sign-in, payments and ads are simulated, and the sample dramas, coins and VIP have no real value. Publish your own terms before launch.",
        "Privacy Policy" to "Your account, list, coins, comments and watch history are stored by the server running this copy of The Ending, in its own SQLite database. Nothing is shared with third parties. Delete your account any time from Settings to remove your personal data.",
        "Coin and VIP terms" to "In the store build, unlocked episodes stay unlocked forever, coins do not expire, and VIP renews through Google Play or the App Store until you cancel there.",
        "Content guidelines" to "Comments must be respectful. Spam, spoilers without warning and harassment are hidden by moderators.",
    )
    Column(Modifier.fillMaxSize()) {
        TopBar("About", { store.back() })
        Column(Modifier.verticalScroll(rememberScrollState()).padding(16.dp), verticalArrangement = Arrangement.spacedBy(24.dp)) {
            Column(Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Image(painterResource(R.drawable.logo_mark), "The Ending logo", Modifier.size(72.dp, 101.dp))
                T("The Endıng", 24.sp, FontWeight.Black)
                T("Android ${BuildConfig.VERSION_NAME}", 13.sp, color = C.Text3)
            }
            sections.forEach { (title, body) ->
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) { T(title, 16.sp, FontWeight.ExtraBold); T(body, color = C.Text2, lineHeight = 22.sp) }
            }
            T("Open source under the MIT License · github.com/waynetunmyint/TheEnding", 13.sp, FontWeight.Normal, C.Accent, Modifier.fillMaxWidth().clickable {
                context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://github.com/waynetunmyint/TheEnding")))
            }, align = TextAlign.Center)
        }
    }
}
