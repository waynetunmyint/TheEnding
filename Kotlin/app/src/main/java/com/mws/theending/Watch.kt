package com.mws.theending

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.view.ViewGroup
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.imePadding
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Send
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.CardGiftcard
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.KeyboardArrowUp
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.MoreHoriz
import androidx.compose.material.icons.outlined.BookmarkBorder
import androidx.compose.material.icons.outlined.ChatBubbleOutline
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material.icons.outlined.GridView
import androidx.compose.material.icons.outlined.OndemandVideo
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import coil.compose.AsyncImage
import com.mws.theending.ui.Avatar
import com.mws.theending.ui.Banner
import com.mws.theending.ui.Btn
import com.mws.theending.ui.C
import com.mws.theending.ui.ChipBtn
import com.mws.theending.ui.CoinIcon
import com.mws.theending.ui.CrownIcon
import com.mws.theending.ui.Empty
import com.mws.theending.ui.Kind
import com.mws.theending.ui.LoadOr
import com.mws.theending.ui.PlayGlyph
import com.mws.theending.ui.Poster
import com.mws.theending.ui.T
import com.mws.theending.ui.Title
import com.mws.theending.ui.Toggle
import com.mws.theending.ui.TopBar
import com.mws.theending.ui.outlined
import kotlinx.coroutines.delay

private class DramaData(val drama: Drama, val episodes: List<Episode>)

private suspend fun loadDrama(store: AppStore, id: String): DramaData {
    val o = store.api.obj("GET", "/dramas/$id")
    return DramaData(Drama.from(o.getJSONObject("drama")), o.optJSONArray("episodes").objects(Episode::from))
}

/** Episode number grid split into tabs of 30. */
@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun EpisodeGrid(dramaId: String, episodes: List<Episode>, current: Int?, playing: Boolean, onPick: (Episode) -> Unit) {
    val me = LocalStore.current.me
    val ranges = episodes.chunked(30)
    var range by remember { mutableIntStateOf(((episodes.indexOfFirst { it.n == current }.coerceAtLeast(0)) / 30).coerceAtMost((ranges.size - 1).coerceAtLeast(0))) }
    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        if (ranges.size > 1) Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(18.dp)) {
            ranges.forEachIndexed { i, r ->
                Column(Modifier.clickable { range = i }, horizontalAlignment = Alignment.CenterHorizontally) {
                    T("${r.first().n}–${r.last().n}", 14.sp, FontWeight.Bold, if (i == range) C.Text else C.Text3, Modifier.padding(vertical = 8.dp))
                    Box(Modifier.size(24.dp, 2.dp).background(if (i == range) C.Red else Color.Transparent))
                }
            }
        }
        FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalArrangement = Arrangement.spacedBy(8.dp), maxItemsInEachRow = 6) {
            ranges.getOrNull(range).orEmpty().forEach { e ->
                val locked = me?.canWatch(dramaId, e) != true
                val isCurrent = e.n == current
                Box(Modifier.weight(1f).aspectRatio(1.2f).clip(RoundedCornerShape(10.dp))
                    .background(if (isCurrent) C.AccentSoft else C.Surface2).clickable { onPick(e) }, contentAlignment = Alignment.Center) {
                    T("${e.n}", 15.sp, FontWeight.Bold, if (isCurrent) C.Accent else if (current != null && e.n < current) C.Text3 else C.Text)
                    if (locked) Icon(Icons.Default.Lock, "locked", tint = C.Text3, modifier = Modifier.align(Alignment.TopEnd).padding(4.dp).size(11.dp))
                    if (isCurrent && playing) Box(Modifier.align(Alignment.BottomCenter).padding(bottom = 4.dp).size(12.dp, 2.dp).background(C.Accent))
                }
            }
            repeat((6 - ranges.getOrNull(range).orEmpty().size % 6) % 6) { Spacer(Modifier.weight(1f)) }
        }
    }
}

@Composable
fun DramaScreen(id: String) {
    val store = LocalStore.current
    val context = LocalContext.current
    val q = rememberLoad("drama", id) { loadDrama(store, id) }
    val data = q.data
    if (data == null) {
        Column(Modifier.fillMaxSize()) {
            TopBar(onBack = { store.back() })
            if (q.error?.contains("Not found") == true) Empty(null, "This drama isn't available", "It may have been removed or isn't out yet.")
            else LoadOr(q.error, q.reload)
        }
        return
    }
    val d = data.drama
    val eps = data.episodes
    val me = store.me
    val current = me?.progress?.get(d.id)?.ep
    val saved = me?.saved?.contains(d.id) == true
    val upcoming = !d.published
    val reminded = me?.reminders?.contains(d.id) == true
    val freeCount = eps.count { it.free }
    Box(Modifier.fillMaxSize()) {
        LazyColumn(contentPadding = PaddingValues(bottom = 120.dp)) {
            item {
                Box(Modifier.fillMaxWidth()) {
                    Box(Modifier.fillMaxWidth().height(300.dp).background(Color(d.color))) {
                        if (d.banner.isNotEmpty()) AsyncImage(store.api.url(d.banner), null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop, alpha = .6f)
                        else Canvas(Modifier.fillMaxSize()) { drawCircle(Color(d.color2), 180.dp.toPx(), Offset(size.width, 0f)) }
                        Box(Modifier.align(Alignment.BottomCenter).fillMaxWidth().height(140.dp).background(Brush.verticalGradient(listOf(Color.Transparent, C.Bg))))
                    }
                    Column {
                        TopBar(onBack = { store.back() }) { IconButton({ shareDrama(context, store, d) }) { Icon(Icons.Outlined.Share, "Share", tint = C.Text) } }
                        Row(Modifier.padding(horizontal = 16.dp).padding(top = 12.dp), verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                            Poster(d, Modifier.width(120.dp), showEps = false)
                            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                T(d.title, 22.sp, FontWeight.ExtraBold, lineHeight = 28.sp)
                                val total = if (d.totalEpisodes > 0) d.totalEpisodes else d.episodes
                                T(listOfNotNull(if (total > 0) "$total episodes" else null, if (d.completed) "Completed" else "Ongoing",
                                    if (upcoming && d.releaseAt > 0) "Premieres ${fmtStamp(d.releaseAt)}" else null).joinToString(" · "), 13.sp, color = Color(0xFFD7D0DA))
                                Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                    d.genres.forEach { T(it, 12.sp, modifier = Modifier.background(Color(0x1FFFFFFF), RoundedCornerShape(6.dp)).padding(horizontal = 8.dp, vertical = 3.dp)) }
                                }
                            }
                        }
                    }
                }
            }
            item {
                Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    if (d.synopsis.isNotEmpty()) T(d.synopsis, 15.sp, color = C.Text2, lineHeight = 23.sp)
                    if (freeCount > 0) Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Icon(Icons.Default.CardGiftcard, null, tint = C.Warn, modifier = Modifier.size(16.dp))
                        T(if (freeCount == eps.size) "Every episode is free" else "$freeCount free ${if (freeCount == 1) "episode" else "episodes"} · ${d.coinsPerEpisode} coins after · VIP watches all", 13.sp, FontWeight.SemiBold, C.Warn)
                    }
                    if (!upcoming && eps.isNotEmpty()) {
                        Title("Episodes", 17.sp)
                        EpisodeGrid(d.id, eps, current, false) { store.go(Route.Watch(d.id, it.n)) }
                    }
                    if (!upcoming && eps.isEmpty()) T("Episodes are on the way.", color = C.Text2)
                }
            }
        }
        Row(Modifier.align(Alignment.BottomCenter).fillMaxWidth().background(C.Bg).navigationBarsPadding().padding(16.dp, 10.dp, 16.dp, 16.dp),
            verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Box(Modifier.size(52.dp).clip(CircleShape).background(C.Surface).clickable {
                store.act { store.toggle("saved", d.id); store.show(if (saved) "Removed from My List" else "Saved to My List") }
            }, contentAlignment = Alignment.Center) {
                Icon(if (saved) Icons.Default.Bookmark else Icons.Outlined.BookmarkBorder, if (saved) "Remove from My List" else "Save to My List", tint = if (saved) C.Warn else C.Text)
            }
            when {
                upcoming -> Btn(if (reminded) "Reminder set" else "Remind me on premiere day", {
                    store.act { store.toggle("reminders", d.id); store.show(if (reminded) "Reminder removed" else "We'll remind you on premiere day") }
                }, Modifier.weight(1f), if (reminded) Kind.Secondary else Kind.Primary)
                eps.isNotEmpty() -> Btn(if (current != null) "Continue EP $current" else "Play EP ${eps.first().n}", { store.go(Route.Watch(d.id, current ?: eps.first().n)) },
                    Modifier.weight(1f), leading = { PlayGlyph() })
            }
        }
    }
}

// ---------------- Player ----------------

private enum class Sheet { Episodes, Unlock, TopUp, Comments, Share, Settings, Ad, AdDone, End }

@Composable
fun PlayerScreen(id: String, requested: Int?) {
    val store = LocalStore.current
    val q = rememberLoad("drama", id) { loadDrama(store, id) }
    val data = q.data
    Box(Modifier.fillMaxSize().background(Color.Black)) {
        when {
            data == null -> Column(Modifier.statusBarsPadding()) {
                TopBar(onBack = { store.back() })
                if (q.error?.contains("Not found") == true) Empty(null, "This drama isn't available", "It may have been removed or isn't out yet.") else LoadOr(q.error, q.reload)
            }
            !data.drama.published || data.episodes.isEmpty() -> Column(Modifier.statusBarsPadding()) {
                TopBar(onBack = { store.back() })
                Empty(null, "Not out yet", "${data.drama.title} has no episodes to watch yet.", action = { Btn("See details", { store.back(); store.go(Route.Drama(id)) }) })
            }
            else -> PlayerBody(data.drama, data.episodes, requested)
        }
    }
}

@Composable
private fun PlayerBody(d: Drama, episodes: List<Episode>, requested: Int?) {
    val store = LocalStore.current
    val context = LocalContext.current
    val me = store.me
    val start = listOfNotNull(requested, me?.progress?.get(d.id)?.ep).firstOrNull { n -> episodes.any { it.n == n } } ?: episodes.first().n
    var ep by remember { mutableIntStateOf(start) }
    var t by remember { mutableFloatStateOf(0f) }
    var playing by remember { mutableStateOf(true) }
    var speed by remember { mutableFloatStateOf(1f) }
    var quality by remember { mutableStateOf("Auto") }
    var sheet by remember { mutableStateOf<Sheet?>(null) }
    var loading by remember { mutableStateOf(true) }
    var videoError by remember { mutableStateOf(false) }
    var dismissedLock by remember { mutableIntStateOf(0) }
    var ad by remember { mutableStateOf<Pair<String, Int>?>(null) }
    var busy by remember { mutableStateOf(false) }
    var measured by remember { mutableStateOf<Pair<Int, Float>?>(null) }
    var watched by remember { mutableFloatStateOf(0f) }

    val idx = episodes.indexOfFirst { it.n == ep }.coerceAtLeast(0)
    val episode = episodes[idx]
    val next = episodes.getOrNull(idx + 1)
    val unlocked = me?.canWatch(d.id, episode) == true
    val realVideo = episode.hasVideo && unlocked
    val len = measured?.takeIf { it.first == ep }?.second ?: (if (episode.length > 0) episode.length.toFloat() else 90f)
    val lockPrompt = !loading && !unlocked && sheet == null && dismissedLock != ep
    val open = sheet ?: if (lockPrompt) Sheet.Unlock else null
    val active = playing && unlocked && !loading && !videoError && open == null

    fun goEp(n: Int) { t = 0f; loading = true; videoError = false; sheet = null; playing = true; ep = n }
    val finished by rememberUpdatedState {
        when {
            next == null -> sheet = Sheet.End
            me?.settings?.autoplay == true -> goEp(next.n)
            else -> playing = false
        }
    }

    // New episode: save progress and play count, then auto-unlock with coins if the viewer opted in.
    LaunchedEffect(ep) {
        store.act { store.setProgress(d.id, ep) }
        delay(600)
        val m = store.me
        if (!episode.hasVideo || m?.canWatch(d.id, episode) != true) loading = false
        if (m != null && !m.canWatch(d.id, episode) && m.settings.autoUnlock && m.coins >= d.coinsPerEpisode) {
            store.act { store.unlock(d.id, ep); store.show("EP $ep unlocked · −${d.coinsPerEpisode} coins") }
        }
    }

    // Watch time for the "watch 30 minutes" task.
    LaunchedEffect(active) {
        while (active) {
            delay(1000)
            watched += 1f
            if (watched >= 30f) { watched -= 30f; store.act { store.reportWatch(30) } }
        }
    }

    // Episodes without an uploaded video play a timed preview.
    LaunchedEffect(active, realVideo, speed, ep) {
        if (realVideo) return@LaunchedEffect
        while (active) {
            delay(250)
            t = (t + .25f * speed).coerceAtMost(len)
            if (t >= len) { finished(); break }
        }
    }

    // Real video through ExoPlayer, sending the session cookie so locked episodes stream once unlocked.
    val player = remember {
        val http = DefaultHttpDataSource.Factory().setDefaultRequestProperties(store.api.cookie?.let { mapOf("Cookie" to it) } ?: emptyMap())
        ExoPlayer.Builder(context).setMediaSourceFactory(DefaultMediaSourceFactory(http)).build()
    }
    DisposableEffect(Unit) {
        val listener = object : Player.Listener {
            override fun onPlaybackStateChanged(state: Int) {
                when (state) {
                    Player.STATE_READY -> { loading = false; if (player.duration > 0) measured = ep to player.duration / 1000f }
                    Player.STATE_BUFFERING -> loading = true
                    Player.STATE_ENDED -> finished()
                }
            }
            override fun onPlayerError(error: PlaybackException) { loading = false; videoError = true }
        }
        player.addListener(listener)
        onDispose { player.removeListener(listener); player.release() }
    }
    LaunchedEffect(ep, realVideo) {
        if (realVideo) {
            player.setMediaItem(MediaItem.fromUri(store.api.url("/api/episodes/${d.id}/$ep/video")))
            player.prepare()
        } else player.stop()
    }
    LaunchedEffect(active, speed, realVideo) {
        if (!realVideo) return@LaunchedEffect
        player.setPlaybackSpeed(speed)
        player.playWhenReady = active
        while (active) { t = player.currentPosition / 1000f; delay(250) }
    }

    // Rewarded ad countdown, then the server checks the ticket and unlocks.
    LaunchedEffect(ad) {
        val a = ad ?: return@LaunchedEffect
        if (a.second > 1) { delay(1000); ad = a.first to a.second - 1; return@LaunchedEffect }
        delay(1000)
        try { store.completeAd(a.first); sheet = Sheet.AdDone } catch (e: ApiException) { store.show(e.message ?: ""); sheet = Sheet.Unlock }
        ad = null
    }

    val payCoins: () -> Unit = {
        if ((me?.coins ?: 0) < d.coinsPerEpisode) sheet = Sheet.TopUp
        else store.act {
            busy = true
            try { store.unlock(d.id, ep); sheet = null; playing = true; store.show("EP $ep unlocked · −${d.coinsPerEpisode} coins") } finally { busy = false }
        }
    }
    val watchAd: () -> Unit = {
        store.act {
            busy = true
            try { ad = store.startAd("unlock", d.id, ep); sheet = Sheet.Ad } finally { busy = false }
        }
    }

    Box(Modifier.fillMaxSize()) {
        // Video layer
        if (realVideo) {
            AndroidView({ c -> PlayerView(c).apply {
                useController = false
                resizeMode = AspectRatioFrameLayout.RESIZE_MODE_FIT
                layoutParams = ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
                this.player = player
            } }, Modifier.fillMaxSize())
        } else {
            Canvas(Modifier.fillMaxSize().background(Color(d.color))) {
                drawCircle(Color(d.color2), size.width * .6f, Offset(size.width * .4f, size.height * .45f))
                drawCircle(Color(d.color2).copy(alpha = .7f), size.width * .3f, Offset(size.width * .9f, size.height * .15f))
            }
            if (!episode.hasVideo) T("Preview · no video uploaded for this episode yet", 12.sp, color = Color(0x99FFFFFF), modifier = Modifier.align(Alignment.Center).padding(top = 120.dp))
        }
        Box(Modifier.fillMaxSize().background(Brush.verticalGradient(0f to Color(0x8C000000), .2f to Color.Transparent, .6f to Color.Transparent, 1f to Color(0xB3000000))))
        Box(Modifier.fillMaxSize().clickable(remember { MutableInteractionSource() }, null) { if (unlocked) playing = !playing else sheet = Sheet.Unlock })

        if (unlocked && (loading || videoError)) {
            Column(Modifier.fillMaxSize().background(if (videoError) Color(0xFF120E14) else Color.Transparent).padding(40.dp),
                horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp, Alignment.CenterVertically)) {
                if (videoError) {
                    Icon(Icons.Default.ErrorOutline, null, tint = C.Text2, modifier = Modifier.size(40.dp))
                    T("Can't play this episode", 20.sp, FontWeight.ExtraBold)
                    T("Check your connection and try again. Your coins and progress are safe.", color = C.Text2, align = TextAlign.Center)
                    Btn("Try again", { videoError = false; loading = true; player.prepare() })
                    Btn("Report a problem", { store.go(Route.Help) }, kind = Kind.Ghost)
                } else {
                    CircularProgressIndicator(color = C.Accent)
                    T("Loading EP $ep…", weight = FontWeight.SemiBold)
                }
            }
        }
        if (!playing && unlocked && !loading && !videoError) {
            Box(Modifier.align(Alignment.Center).size(72.dp).clip(CircleShape).background(Color(0x66000000)).clickable { playing = true }, contentAlignment = Alignment.Center) { PlayGlyph(30.dp) }
        }
        if (!unlocked && open == null) {
            Column(Modifier.align(Alignment.Center).clickable { sheet = Sheet.Unlock }, horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(8.dp)) {
                Box(Modifier.size(56.dp).clip(CircleShape).background(Color(0x1FFFFFFF)), contentAlignment = Alignment.Center) { Icon(Icons.Default.Lock, null, tint = Color.White) }
                T("Episode $ep is locked · tap to unlock", weight = FontWeight.Bold)
            }
        }

        // Top bar
        Row(Modifier.statusBarsPadding().fillMaxWidth().padding(horizontal = 4.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton({ store.back() }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back", tint = Color.White) }
            T(d.title, 15.sp, FontWeight.Bold, modifier = Modifier.weight(1f), lines = 1)
            IconButton({ sheet = Sheet.Settings }) { Icon(Icons.Default.MoreHoriz, "Playback settings", tint = Color.White) }
        }

        // Right rail
        val liked = me?.liked?.contains(d.id) == true
        val saved = me?.saved?.contains(d.id) == true
        Column(Modifier.align(Alignment.BottomEnd).navigationBarsPadding().padding(end = 8.dp, bottom = 150.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(16.dp)) {
            RailButton(if (liked) Icons.Default.Favorite else Icons.Outlined.FavoriteBorder, if (liked) "Liked" else "Like", if (liked) C.Red else Color.White) { store.act { store.toggle("liked", d.id) } }
            RailButton(if (saved) Icons.Default.Bookmark else Icons.Outlined.BookmarkBorder, if (saved) "Saved" else "Save", if (saved) C.Warn else Color.White) {
                store.act { store.toggle("saved", d.id); store.show(if (saved) "Removed from My List" else "Saved to My List") }
            }
            RailButton(Icons.Outlined.ChatBubbleOutline, "Comments") { sheet = Sheet.Comments }
            RailButton(Icons.Outlined.Share, "Share") { sheet = Sheet.Share }
        }

        // Bottom info, seek bar and episode bar
        Column(Modifier.align(Alignment.BottomCenter).fillMaxWidth().navigationBarsPadding().padding(horizontal = 16.dp).padding(bottom = 8.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Column(Modifier.padding(end = 72.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                T("EP $ep${if (episode.title.isNotEmpty()) " · ${episode.title}" else ""}", 16.sp, FontWeight.ExtraBold)
                if (d.synopsis.isNotEmpty()) T(d.synopsis, 14.sp, color = Color(0xFFE6E0E8), lines = 2, lineHeight = 20.sp)
            }
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                T(duration(t.toInt()), 12.sp)
                Slider(t.coerceIn(0f, len), { v -> t = v; if (realVideo) player.seekTo((v * 1000).toLong()) }, Modifier.weight(1f), enabled = unlocked, valueRange = 0f..len.coerceAtLeast(1f),
                    colors = SliderDefaults.colors(thumbColor = Color.White, activeTrackColor = C.Accent, inactiveTrackColor = Color(0x40FFFFFF)))
                T(duration(len.toInt()), 12.sp)
            }
            Row(Modifier.fillMaxWidth().heightIn(min = 44.dp), verticalAlignment = Alignment.CenterVertically) {
                Row(Modifier.weight(1f).clickable { sheet = Sheet.Episodes }, verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Icon(Icons.Outlined.GridView, null, tint = Color.White, modifier = Modifier.size(20.dp))
                    T("EP $ep of ${episodes.size} · ${if (d.completed) "Completed" else "Ongoing"}", 14.sp, FontWeight.SemiBold, modifier = Modifier.weight(1f))
                    Icon(Icons.Default.KeyboardArrowUp, null, tint = Color.White)
                }
                T("${fmtSpeed(speed)}x", 13.sp, FontWeight.Bold, modifier = Modifier.padding(start = 8.dp).clip(RoundedCornerShape(16.dp)).background(Color(0x1FFFFFFF)).clickable { sheet = Sheet.Settings }.padding(horizontal = 12.dp, vertical = 6.dp))
            }
        }

        // Sheets
        when (open) {
            Sheet.Episodes -> PlayerSheet(d.title, { sheet = null }) {
                T("${episodes.size} episodes · ${if (d.completed) "Completed" else "Ongoing"}", 13.sp, color = C.Text3)
                EpisodeGrid(d.id, episodes, ep, true) { goEp(it.n) }
            }
            Sheet.Unlock -> PlayerSheet("Unlock EP $ep", { dismissedLock = ep; sheet = null; playing = false }) {
                Row(Modifier.clickable { store.go(Route.Wallet) }, verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) { CoinIcon(); T("Balance", 13.sp); T("${me?.coins ?: 0}", 13.sp, FontWeight.Bold) }
                Btn(if ((me?.coins ?: 0) >= d.coinsPerEpisode) "Unlock for ${d.coinsPerEpisode} coins" else "Top up to unlock · ${d.coinsPerEpisode} coins", payCoins, Modifier.fillMaxWidth(), enabled = !busy, leading = { CoinIcon() })
                val left = me?.adsLeft ?: 0
                Btn(if (left > 0) "Watch a short ad · free ($left left today)" else "No free ad unlocks left today", watchAd, Modifier.fillMaxWidth(), Kind.Secondary, enabled = left > 0 && !busy,
                    leading = { Icon(Icons.Outlined.OndemandVideo, null, tint = C.Text, modifier = Modifier.size(20.dp)) })
                Banner("Join VIP · watch everything", "All episodes unlocked, no ads, 1080p", C.GoldBg, C.Gold, onClick = { store.go(Route.Vip) }, icon = { CrownIcon(26.dp) })
                Row(verticalAlignment = Alignment.CenterVertically) {
                    T("Auto-unlock next episodes with coins", 13.sp, color = C.Text2, modifier = Modifier.weight(1f))
                    Toggle(me?.settings?.autoUnlock == true, { v -> me?.let { store.act { store.setSettings(it.settings.copy(autoUnlock = v)) } } })
                }
            }
            Sheet.TopUp -> TopUpSheet(d, ep, onClose = { sheet = Sheet.Unlock }, onAd = watchAd)
            Sheet.Comments -> PlayerSheet("Comments on EP $ep", { sheet = null }) { CommentsPanel(d.id, ep) }
            Sheet.Share -> PlayerSheet("Share EP $ep", { sheet = null }) {
                Banner("Invite a friend, both get ${store.config?.tasks?.get("invite") ?: 50} coins",
                    if (me?.user?.signedIn == true) "Your share link carries your invite" else "Sign in so your link carries your invite", C.AccentSoft, C.Text,
                    icon = { Icon(Icons.Default.CardGiftcard, null, tint = C.Accent, modifier = Modifier.size(26.dp)) })
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Btn("Share…", { shareDrama(context, store, d) }, Modifier.weight(1f))
                    Btn("Copy link", {
                        val cm = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
                        val ref = if (me?.user?.signedIn == true) "?ref=${me.user.id}" else ""
                        cm.setPrimaryClip(ClipData.newPlainText("The Ending", "${store.api.baseUrl}/drama/${d.id}/$ref"))
                        store.show("Link copied")
                    }, Modifier.weight(1f), Kind.Secondary)
                }
            }
            Sheet.Settings -> PlayerSheet("Playback", { sheet = null }) {
                T("Speed", 13.sp, FontWeight.SemiBold, C.Text2)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(.75f, 1f, 1.25f, 1.5f, 2f).forEach { s -> SegButton("${fmtSpeed(s)}x", speed == s, Modifier.weight(1f)) { speed = s } }
                }
                T("Quality", 13.sp, FontWeight.SemiBold, C.Text2)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("Auto", "480p", "720p", "1080p", "4K").forEach { qv ->
                        val vipOnly = qv == "1080p" || qv == "4K"
                        SegButton(if (vipOnly) "$qv ★" else qv, quality == qv, Modifier.weight(1f)) {
                            if (vipOnly && me?.vip != true) store.show("1080p and 4K are for VIP") else quality = qv
                        }
                    }
                }
                T("Uploaded videos play at their original quality; Auto picks the best your connection allows.", 12.sp, color = C.Text3)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) { T("Autoplay next episode", weight = FontWeight.SemiBold); T("A locked episode asks before playing", 13.sp, color = C.Text3) }
                    Toggle(me?.settings?.autoplay != false, { v -> me?.let { store.act { store.setSettings(it.settings.copy(autoplay = v)) } } })
                }
                Btn("Report a playback problem", { store.go(Route.Help) }, Modifier.fillMaxWidth(), Kind.Secondary)
            }
            Sheet.Ad -> Box(Modifier.fillMaxSize().background(Color.Black).clickable(remember { MutableInteractionSource() }, null) {}, contentAlignment = Alignment.Center) {
                Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    T("Sponsored · demo ad", 12.sp, color = C.Text3)
                    Box(Modifier.width(220.dp).aspectRatio(9f / 16f).clip(RoundedCornerShape(16.dp)).background(C.InfoBg), contentAlignment = Alignment.Center) { T("Your ad here", weight = FontWeight.Bold, color = C.Info) }
                    T("Reward in ${ad?.second ?: 0}s", weight = FontWeight.Bold)
                }
            }
            Sheet.AdDone -> DialogCard({ sheet = null; playing = true }) {
                Box(Modifier.size(64.dp).clip(CircleShape).background(C.AccentSoft), contentAlignment = Alignment.Center) { Icon(Icons.Default.Check, null, tint = C.Accent, modifier = Modifier.size(30.dp)) }
                T("EP $ep unlocked", 20.sp, FontWeight.ExtraBold)
                val left = me?.adsLeft ?: 0
                T("Thanks for watching. You have $left free ad ${if (left == 1) "unlock" else "unlocks"} left today.", color = C.Text2, align = TextAlign.Center)
                Btn("Play EP $ep", { sheet = null; playing = true }, Modifier.fillMaxWidth())
            }
            Sheet.End -> SeriesEnd(d, episodes.size)
            null -> {}
        }
    }
}

private fun fmtSpeed(s: Float) = if (s % 1f == 0f) s.toInt().toString() else s.toString()

@Composable
private fun SegButton(text: String, on: Boolean, modifier: Modifier, onClick: () -> Unit) {
    Box(modifier.heightIn(min = 40.dp).clip(RoundedCornerShape(12.dp)).background(if (on) C.Primary else C.Surface2).clickable(onClick = onClick), contentAlignment = Alignment.Center) {
        T(text, 13.sp, FontWeight.Bold, lines = 1)
    }
}

@Composable
fun PlayerSheet(title: String, onClose: () -> Unit, content: @Composable ColumnScope.() -> Unit) {
    Box(Modifier.fillMaxSize().background(Color(0xB8050306)).clickable(remember { MutableInteractionSource() }, null, onClick = onClose), contentAlignment = Alignment.BottomCenter) {
        Column(Modifier.fillMaxWidth().widthIn(max = 560.dp).clip(RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp)).background(C.Surface)
            .clickable(remember { MutableInteractionSource() }, null) {}.imePadding().navigationBarsPadding()
            .heightIn(max = 640.dp).verticalScroll(rememberScrollState()).padding(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Box(Modifier.align(Alignment.CenterHorizontally).size(36.dp, 4.dp).clip(RoundedCornerShape(2.dp)).background(Color(0xFF3A3340)))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Title(title, modifier = Modifier.weight(1f))
                IconButton(onClose) { Icon(Icons.Default.Close, "Close", tint = C.Text2) }
            }
            content()
        }
    }
}

@Composable
private fun TopUpSheet(d: Drama, ep: Int, onClose: () -> Unit, onAd: () -> Unit) {
    val store = LocalStore.current
    val me = store.me
    val packs = store.config?.coinPacks.orEmpty()
    var pick by remember { mutableIntStateOf(1.coerceAtMost((packs.size - 1).coerceAtLeast(0))) }
    PlayerSheet("Not enough coins", onClose) {
        T("EP $ep needs ${d.coinsPerEpisode} coins. You have ${me?.coins ?: 0}.", color = C.Text2)
        if (me?.user?.signedIn != true) T("Sign in first so your coins stay with your account.", 13.sp, color = C.Warn)
        packs.chunked(3).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                row.forEach { p ->
                    val i = packs.indexOf(p)
                    Column(Modifier.weight(1f).heightIn(min = 96.dp).clip(RoundedCornerShape(14.dp)).background(if (pick == i) C.AccentSoft else C.Surface2).outlined(pick == i).clickable { pick = i }.padding(6.dp),
                        horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(4.dp, Alignment.CenterVertically)) {
                        if (p.tag.isNotEmpty()) T(p.tag, 9.sp, FontWeight.ExtraBold, C.Accent, lines = 1)
                        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)) { CoinIcon(16.dp); T("${p.coins}", 18.sp, FontWeight.ExtraBold) }
                        if (p.bonus > 0) T("+${p.bonus} bonus", 12.sp, FontWeight.Bold, C.Warn)
                        T(price(p.priceCents), 13.sp, color = C.Text2)
                    }
                }
                repeat(3 - row.size) { Spacer(Modifier.weight(1f)) }
            }
        }
        packs.getOrNull(pick)?.let { p ->
            Btn(if (me?.user?.signedIn == true) "Buy ${p.coins + p.bonus} coins · ${price(p.priceCents)}" else "Sign in to buy coins",
                { store.go(if (me?.user?.signedIn == true) Route.Payment(p.id) else Route.Login) }, Modifier.fillMaxWidth())
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center) {
            Btn("Watch an ad instead", onAd, kind = Kind.Ghost, small = true, enabled = (me?.adsLeft ?: 0) > 0)
            Btn("Get VIP", { store.go(Route.Vip) }, kind = Kind.Ghost, small = true)
        }
        T("Demo checkout: no real payment is made. In the store build this goes through Google Play.", 12.sp, color = C.Text3, align = TextAlign.Center, modifier = Modifier.fillMaxWidth())
    }
}

@Composable
private fun CommentsPanel(dramaId: String, ep: Int) {
    val store = LocalStore.current
    val me = store.me
    var draft by remember { mutableStateOf("") }
    var reporting by remember { mutableStateOf(0L) }
    var refresh by remember { mutableIntStateOf(0) }
    val q = rememberLoad("comments", dramaId, ep, refresh) { store.api.arr("/comments?drama=$dramaId&ep=$ep").objects(Comment::from) }
    val list = q.data
    if (list == null) LoadOr(q.error, q.reload)
    else if (list.isEmpty()) T("No comments yet. Say something about EP $ep.", color = C.Text2)
    else list.forEach { c ->
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            Avatar(c.initial, Color(c.color))
            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                T(c.name, 13.sp, FontWeight.SemiBold, C.Text2)
                T(c.text, lineHeight = 21.sp)
                Row(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                    T(fmtDate(c.at), 12.sp, color = C.Text3)
                    if (c.mine) T("Delete", 12.sp, FontWeight.SemiBold, C.Text2, Modifier.clickable { store.act { store.api.delete("/comments/${c.id}"); refresh++ } })
                    else T("Report", 12.sp, FontWeight.SemiBold, C.Text2, Modifier.clickable { reporting = if (reporting == c.id) 0 else c.id })
                }
                if (reporting == c.id) Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("spam" to "Spam", "spoiler" to "Spoiler", "harassment" to "Harassment", "other" to "Something else").forEach { (k, l) ->
                        ChipBtn(l, false, { reporting = 0; store.act { store.api.post("/comments/${c.id}/report", json("reason" to k)); store.show("Thanks. A moderator will take a look.") } })
                    }
                }
            }
        }
    }
    when {
        me?.user?.signedIn != true -> Btn("Sign in to comment", { store.go(Route.Login) }, Modifier.fillMaxWidth(), Kind.Secondary)
        me.muted -> T("You can't comment for now. A moderator muted your account.", 13.sp, color = C.Text2)
        else -> Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            TextField(draft, { if (it.length <= 500) draft = it }, Modifier.weight(1f), placeholder = { Text("Add a comment…", color = C.Text3) }, maxLines = 5,
                shape = RoundedCornerShape(22.dp), colors = TextFieldDefaults.colors(focusedContainerColor = C.Surface2, unfocusedContainerColor = C.Surface2,
                    focusedIndicatorColor = Color.Transparent, unfocusedIndicatorColor = Color.Transparent, cursorColor = C.Accent))
            IconButton({
                val text = draft.trim()
                if (text.isNotEmpty()) store.act { store.api.post("/comments", json("dramaId" to dramaId, "ep" to ep, "text" to text)); draft = ""; refresh++ }
            }, enabled = draft.isNotBlank()) { Icon(Icons.AutoMirrored.Filled.Send, "Send", tint = if (draft.isNotBlank()) C.Accent else Color(0xFF4A4350)) }
        }
    }
}

@Composable
private fun SeriesEnd(d: Drama, count: Int) {
    val store = LocalStore.current
    val others = store.published.filter { it.id != d.id && it.episodes > 0 }
    val more = others.filter { o -> o.genres.any { it in d.genres } }.take(3)
    val upNext = more.firstOrNull() ?: others.firstOrNull()
    val rate = { v: Int, msg: String -> store.act { store.api.post("/ratings", json("dramaId" to d.id, "value" to v)); store.show(msg) } }
    LazyColumn(Modifier.fillMaxSize().background(C.Bg).statusBarsPadding(), contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(24.dp)) {
        item { IconButton({ store.back() }) { Icon(Icons.Default.Close, "Close", tint = C.Text) } }
        item {
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                T(if (d.completed) "The End · $count of $count watched" else "You're caught up · $count episodes so far", 13.sp, FontWeight.Bold, C.Accent)
                T(if (d.completed) "You finished ${d.title}" else "More of ${d.title} is coming", 24.sp, FontWeight.ExtraBold, lineHeight = 30.sp)
            }
        }
        item {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                T("Did you enjoy it?", color = C.Text2, modifier = Modifier.weight(1f))
                Btn("Loved it", { rate(1, "Thanks for rating") }, small = true)
                Btn("Not for me", { rate(-1, "Thanks, we'll tune your picks") }, kind = Kind.Secondary, small = true)
            }
        }
        if (upNext != null) item {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Title("Up next", 17.sp)
                Row(Modifier.clickable { store.back(); store.go(Route.Watch(upNext.id, 1)) }, horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                    Poster(upNext, Modifier.width(120.dp), showEps = false)
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        T(upNext.title, 17.sp, FontWeight.Bold)
                        T((upNext.genres.take(2) + "${upNext.episodes} EP").joinToString(" · "), 13.sp, color = C.Text3)
                        T("Play EP 1 ›", 13.sp, FontWeight.Bold, C.Accent)
                    }
                }
            }
        }
        if (more.size > 1) item {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Title("More like this", 17.sp)
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    more.forEach { m -> com.mws.theending.ui.PosterCard(m, { store.back(); store.go(Route.Drama(m.id)) }, Modifier.weight(1f), badge = false) }
                    repeat(3 - more.size) { Spacer(Modifier.weight(1f)) }
                }
            }
        }
    }
}
