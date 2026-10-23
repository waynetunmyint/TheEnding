package com.mws.theending

import android.Manifest
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Notifications
import androidx.compose.material.icons.outlined.BookmarkBorder
import androidx.compose.material.icons.outlined.CardGiftcard
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.PersonOutline
import androidx.compose.material.icons.outlined.SlowMotionVideo
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.key
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import androidx.core.content.ContextCompat
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LifecycleEventEffect
import com.mws.theending.ui.Btn
import com.mws.theending.ui.C
import com.mws.theending.ui.ErrorState
import com.mws.theending.ui.Kind
import com.mws.theending.ui.Loading
import com.mws.theending.ui.SubBar
import com.mws.theending.ui.T
import com.mws.theending.ui.TheEndingTheme
import com.mws.theending.ui.Toast

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent { TheEndingTheme { App() } }
    }
}

@Composable
fun App() {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val store = remember { AppStore(context.applicationContext, scope) }
    LaunchedEffect(Unit) { store.boot() }
    // Subscription state and coins refresh whenever the app comes back to the foreground.
    LifecycleEventEffect(Lifecycle.Event.ON_RESUME) {
        if (store.me != null) store.act { store.refreshMe() }
    }

    CompositionLocalProvider(LocalStore provides store) {
        Box(Modifier.fillMaxSize().background(C.Bg)) {
            val me = store.me
            when {
                me == null && store.bootError == null -> Splash()
                me == null -> BootError(store.bootError!!)
                store.config?.maintenance == true && me.user.role.isEmpty() -> Maintenance()
                else -> {
                    BackHandler(enabled = store.stack.size > 1) { store.back() }
                    BackHandler(enabled = store.stack.size == 1 && store.tab != Tab.Home) { store.tab = Tab.Home }
                    key(store.stack.size, store.route) { Screen(store.route) }
                    NotifyOptIn()
                    UpdateDialog()
                }
            }
            Toast(store.toast, Modifier.align(Alignment.BottomCenter).navigationBarsPadding().padding(bottom = 120.dp))
        }
    }
}

@Composable
private fun Screen(route: Route) {
    when (route) {
        Route.Tabs -> Tabs()
        Route.Search -> SearchScreen()
        is Route.Drama -> DramaScreen(route.id)
        is Route.Watch -> PlayerScreen(route.id, route.ep)
        Route.Login -> LoginScreen()
        Route.Email -> EmailScreen()
        is Route.Code -> CodeScreen(route)
        Route.Welcome -> WelcomeScreen()
        Route.Store -> StoreScreen()
        Route.Vip -> VipScreen()
        is Route.Payment -> PaymentScreen(route.productId)
        Route.Wallet -> WalletScreen()
        Route.Inbox -> InboxScreen()
        Route.Settings -> SettingsScreen()
        Route.Language -> LanguageScreen()
        Route.NotifySettings -> NotifySettingsScreen()
        Route.Help -> HelpScreen()
        Route.About -> AboutScreen()
        Route.EditProfile -> EditProfileScreen()
        Route.DeleteAccount -> DeleteAccountScreen()
        Route.Server -> ServerScreen()
        Route.History -> MyListScreen(history = true, standalone = true)
    }
}

@Composable
private fun Tabs() {
    val store = LocalStore.current
    Column(Modifier.fillMaxSize()) {
        Box(Modifier.weight(1f)) {
            when (store.tab) {
                Tab.Home -> HomeScreen()
                Tab.Shorts -> ShortsScreen()
                Tab.Rewards -> RewardsScreen()
                Tab.MyList -> MyListScreen(history = false)
                Tab.Me -> MeScreen()
            }
        }
        SubBar(store.me) { store.go(if (store.me?.subscription?.state == "pending") Route.Wallet else Route.Vip) }
        Row(Modifier.fillMaxWidth().background(C.Bg).navigationBarsPadding().height(58.dp)) {
            Tab.entries.forEach { t ->
                val on = store.tab == t
                val icon = when (t) {
                    Tab.Home -> Icons.Outlined.Home
                    Tab.Shorts -> Icons.Outlined.SlowMotionVideo
                    Tab.Rewards -> Icons.Outlined.CardGiftcard
                    Tab.MyList -> Icons.Outlined.BookmarkBorder
                    Tab.Me -> Icons.Outlined.PersonOutline
                }
                Column(Modifier.weight(1f).fillMaxSize().clickable { store.tab = t }, horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
                    Icon(icon, t.label, tint = if (on) C.Text else C.Text3, modifier = Modifier.size(24.dp))
                    T(t.label, 11.sp, FontWeight.SemiBold, if (on) C.Text else C.Text3)
                }
            }
        }
    }
}

@Composable
private fun Splash() {
    Column(Modifier.fillMaxSize(), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.Center) {
        Image(painterResource(R.drawable.logo_mark), null, Modifier.size(80.dp, 112.dp))
        Spacer(Modifier.height(16.dp))
        T("The Endıng", 30.sp, FontWeight.Black)
        Loading()
    }
}

@Composable
private fun BootError(message: String) {
    val store = LocalStore.current
    Column(Modifier.fillMaxSize().statusBarsPadding(), verticalArrangement = Arrangement.Center) {
        ErrorState(message) { store.act { store.boot() } }
        Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
            Btn("Server settings", { store.go(Route.Server) }, kind = Kind.Ghost)
        }
        if (store.route == Route.Server) {
            Dialog({ store.back() }, DialogProperties(usePlatformDefaultWidth = false)) { ServerScreen() }
        }
    }
}

@Composable
private fun Maintenance() {
    val store = LocalStore.current
    Column(Modifier.fillMaxSize().padding(32.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(10.dp, Alignment.CenterVertically)) {
        Image(painterResource(R.drawable.logo_mark), null, Modifier.size(56.dp, 78.dp))
        T("Back soon", 24.sp, FontWeight.ExtraBold)
        T("The Ending is getting an update. Your coins, list and progress are safe.", color = C.Text2, align = TextAlign.Center)
        Btn("Try again", { store.act { store.refreshCatalog() } })
    }
}

/** Shown once after sign-in. The system permission is only requested after "Allow". */
@Composable
private fun NotifyOptIn() {
    val store = LocalStore.current
    val context = LocalContext.current
    val me = store.me ?: return
    val finish = { granted: Boolean ->
        store.act {
            if (granted && me.tasks.any { it.key == "notify" && it.claimable }) store.claimTask("notify")
            store.updateMe(json("notifyPrompted" to true))
        }
        Unit
    }
    val launcher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { finish(it) }
    // Asked once back on the main screens after sign-in, never on top of onboarding.
    if (!me.user.signedIn || me.notifyPrompted || store.stack.size > 1) return
    DialogCard(onDismiss = { finish(false) }) {
        Box(Modifier.size(64.dp).clip(CircleShape).background(C.AccentSoft), contentAlignment = Alignment.Center) {
            Icon(Icons.Default.Notifications, null, tint = C.Accent, modifier = Modifier.size(30.dp))
        }
        T("Never miss the next episode", 20.sp, FontWeight.ExtraBold, align = TextAlign.Center)
        T("We'll tell you when new episodes of dramas you follow drop, and when your daily coins are ready.", color = C.Text2, align = TextAlign.Center)
        Btn("Allow", {
            if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                launcher.launch(Manifest.permission.POST_NOTIFICATIONS)
            } else finish(true)
        }, Modifier.fillMaxWidth())
        Btn("Not now", { finish(false) }, Modifier.fillMaxWidth(), Kind.Ghost)
    }
}

/**
 * Update prompt driven by the admin panel's app versions: below the minimum it can't be
 * dismissed; below the latest, "Later" hides it for this version for a day.
 */
@Composable
private fun UpdateDialog() {
    val store = LocalStore.current
    val context = LocalContext.current
    val cfg = store.config ?: return
    val current = BuildConfig.VERSION_NAME
    val required = cfg.androidMin.isNotEmpty() && compareVersions(current, cfg.androidMin) < 0
    val available = cfg.androidLatest.isNotEmpty() && compareVersions(current, cfg.androidLatest) < 0
    val prefs = remember { context.getSharedPreferences("the-ending", Context.MODE_PRIVATE) }
    var hidden by remember { mutableStateOf(prefs.getLong("update-later-${cfg.androidLatest}", 0) > System.currentTimeMillis()) }
    if (!required && (!available || hidden)) return
    val open = {
        val id = context.packageName
        runCatching { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=$id"))) }
            .onFailure { context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=$id"))) }
        Unit
    }
    DialogCard(onDismiss = { if (!required) hidden = true }, dismissible = !required) {
        Image(painterResource(R.drawable.logo_mark), null, Modifier.size(48.dp, 67.dp))
        T(if (required) "Update required" else "A new version is ready", 20.sp, FontWeight.ExtraBold, align = TextAlign.Center)
        T(if (required) "This version of The Ending is no longer supported. Update to keep watching." else "Version ${cfg.androidLatest} brings fixes and improvements.", color = C.Text2, align = TextAlign.Center)
        Btn("Update now", open, Modifier.fillMaxWidth())
        if (!required) Btn("Later", {
            prefs.edit().putLong("update-later-${cfg.androidLatest}", System.currentTimeMillis() + 24 * 3600 * 1000L).apply()
            hidden = true
        }, Modifier.fillMaxWidth(), Kind.Ghost)
    }
}

@Composable
fun DialogCard(onDismiss: () -> Unit, dismissible: Boolean = true, content: @Composable () -> Unit) {
    Dialog(onDismiss, DialogProperties(dismissOnBackPress = dismissible, dismissOnClickOutside = dismissible)) {
        Column(Modifier.fillMaxWidth().clip(RoundedCornerShape(24.dp)).background(C.Surface).padding(start = 24.dp, end = 24.dp, top = 28.dp, bottom = 18.dp),
            horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(10.dp)) { content() }
    }
}
