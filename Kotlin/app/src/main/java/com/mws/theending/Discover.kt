package com.mws.theending

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.VerticalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Bookmark
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.LocalFireDepartment
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.outlined.BookmarkBorder
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material.icons.outlined.GridView
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material.icons.outlined.SlowMotionVideo
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.Text
import androidx.compose.material3.TextField
import androidx.compose.material3.TextFieldDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.mws.theending.ui.Btn
import com.mws.theending.ui.C
import com.mws.theending.ui.ChipBtn
import com.mws.theending.ui.Empty
import com.mws.theending.ui.Kind
import com.mws.theending.ui.LoadOr
import com.mws.theending.ui.PlayGlyph
import com.mws.theending.ui.Poster
import com.mws.theending.ui.PosterCard
import com.mws.theending.ui.PosterGrid
import com.mws.theending.ui.T
import com.mws.theending.ui.Title
import kotlinx.coroutines.delay

@Composable
fun HomeScreen() {
    val store = LocalStore.current
    Column(Modifier.fillMaxSize()) {
        Row(Modifier.statusBarsPadding().fillMaxWidth().padding(start = 16.dp, end = 4.dp, top = 8.dp, bottom = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            Row(Modifier.weight(1f).horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(18.dp), verticalAlignment = Alignment.Bottom) {
                HomeTab.entries.forEach { t ->
                    val on = store.homeTab == t
                    Column(Modifier.clickable { store.homeTab = t }, horizontalAlignment = Alignment.CenterHorizontally) {
                        T(t.label, if (on) 20.sp else 16.sp, if (on) FontWeight.ExtraBold else FontWeight.SemiBold, if (on) C.Text else C.Text3)
                        Box(Modifier.padding(top = 4.dp).size(16.dp, 3.dp).background(if (on) C.Red else Color.Transparent, RoundedCornerShape(2.dp)))
                    }
                }
            }
            IconButton({ store.go(Route.Search) }) { Icon(Icons.Default.Search, "Search", tint = C.Text) }
        }
        when (store.homeTab) {
            HomeTab.ForYou -> ForYou()
            HomeTab.Rankings -> Rankings()
            HomeTab.New -> NewReleases()
            HomeTab.Genres -> Genres()
        }
    }
}

@Composable
private fun SectionHead(title: String, link: String? = null, flame: Boolean = false, onLink: () -> Unit = {}) {
    Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp).padding(bottom = 12.dp), verticalAlignment = Alignment.CenterVertically) {
        if (flame) Icon(Icons.Default.LocalFireDepartment, null, tint = C.Accent, modifier = Modifier.size(20.dp).padding(end = 2.dp))
        Title(title, modifier = Modifier.weight(1f))
        if (link != null) T(link, 13.sp, color = C.Text3, modifier = Modifier.clickable(onClick = onLink))
    }
}

private suspend fun loadHome(store: AppStore) = Home.from(store.api.obj("GET", "/home"))

@Composable
private fun ForYou() {
    val store = LocalStore.current
    val home = rememberLoad("home") { loadHome(store) }
    val h = home.data
    if (h == null || store.dramas == null) { LoadOr(home.error, home.reload); return }
    val me = store.me
    val cont = me?.progress.orEmpty().entries.sortedByDescending { it.value.updated }
        .mapNotNull { (id, p) -> store.drama(id)?.takeIf { it.published }?.let { it to p.ep } }
    LazyColumn(contentPadding = PaddingValues(bottom = 24.dp), verticalArrangement = Arrangement.spacedBy(24.dp)) {
        item { HeroBanner(store.pick(h.banner), h.hot) }
        if (cont.isNotEmpty()) item {
            Column {
                SectionHead("Continue watching", "See all") { store.go(Route.History) }
                LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(cont, key = { it.first.id }) { (d, ep) ->
                        PosterCard(d, { store.go(Route.Watch(d.id, ep)) }, Modifier.width(112.dp), "EP $ep / ${d.episodes}", progress = ep / d.episodes.coerceAtLeast(1).toFloat(), badge = false)
                    }
                }
            }
        }
        val trending = store.pick(h.trending)
        if (trending.isNotEmpty()) item {
            Column {
                SectionHead("Trending now", "Rankings", flame = true) { store.homeTab = HomeTab.Rankings }
                LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    itemsIndexed(trending, key = { _, d -> d.id }) { i, d -> PosterCard(d, { store.go(Route.Drama(d.id)) }, Modifier.width(112.dp), rank = i + 1) }
                }
            }
        }
        val picks = store.pick(h.picks)
        if (picks.isNotEmpty()) item {
            Column {
                SectionHead("Picked for you")
                PosterGrid(picks, { store.go(Route.Drama(it.id)) })
            }
        }
    }
}

@Composable
private fun HeroBanner(items: List<Drama>, hot: List<String>) {
    if (items.isEmpty()) return
    val store = LocalStore.current
    val pager = rememberPagerState { items.size }
    LaunchedEffect(items.size) {
        while (items.size > 1) {
            delay(5000)
            pager.animateScrollToPage((pager.currentPage + 1) % items.size)
        }
    }
    Column {
        HorizontalPager(pager, contentPadding = PaddingValues(horizontal = 16.dp), pageSpacing = 10.dp) { page ->
            val d = items[page]
            val rank = hot.indexOf(d.id)
            val tag = when { d.status == "Scheduled" -> "Coming soon"; rank in 0..9 -> "#${rank + 1} trending this week"; else -> "Featured" }
            Box(Modifier.fillMaxWidth().height(200.dp).clip(RoundedCornerShape(16.dp)).background(Color(d.color)).clickable { store.go(Route.Drama(d.id)) }) {
                if (d.banner.isNotEmpty()) AsyncImage(store.api.url(d.banner), null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
                else Canvas(Modifier.fillMaxSize()) { drawCircle(Color(d.color2), size.width * .4f, Offset(size.width * .85f, size.height * .1f)) }
                Row(Modifier.align(Alignment.BottomStart).fillMaxWidth().background(Color(0x8C0F0C11)).padding(16.dp), verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                        T(tag, 12.sp, FontWeight.Bold, C.Warn)
                        T(d.title, 20.sp, FontWeight.ExtraBold, lines = 2)
                        T(listOfNotNull(*d.genres.take(2).toTypedArray(), if (d.episodes > 0) "${d.episodes} episodes" else null).joinToString(" · "), 13.sp, color = Color(0xFFD7D0DA), lines = 1)
                    }
                    Btn(if (d.status == "Scheduled") "Details" else "Play", { store.go(Route.Drama(d.id)) }, small = true,
                        leading = if (d.status == "Scheduled") null else ({ PlayGlyph(14.dp) }))
                }
            }
        }
        if (items.size > 1) Row(Modifier.fillMaxWidth().padding(top = 8.dp), horizontalArrangement = Arrangement.spacedBy(6.dp, Alignment.CenterHorizontally)) {
            items.indices.forEach { i ->
                Box(Modifier.size(if (i == pager.currentPage) 16.dp else 6.dp, 6.dp).clip(RoundedCornerShape(3.dp)).background(if (i == pager.currentPage) C.Red else C.Surface2))
            }
        }
    }
}

private val TABS = listOf("Hot", "Rising", "Most saved", "Completed")
private val MEDAL = listOf(Color(0xFFF2C46D), Color(0xFFC9CED6), Color(0xFFD89A6A))

@Composable
private fun Rankings() {
    val store = LocalStore.current
    var tab by remember { mutableStateOf("Hot") }
    val rk = rememberLoad("rankings") { store.api.obj("GET", "/rankings") }
    Column {
        Row(Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp, vertical = 6.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            TABS.forEach { ChipBtn(it, tab == it, { tab = it }) }
        }
        val data = rk.data
        if (data == null || store.dramas == null) { LoadOr(rk.error, rk.reload); return }
        val rows = store.pick(data.optJSONArray(tab).strings())
        if (rows.isEmpty()) { Empty(null, "Nothing ranked yet", "Rankings fill up as people watch."); return }
        LazyColumn(contentPadding = PaddingValues(16.dp, 4.dp, 16.dp, 24.dp)) {
            itemsIndexed(rows, key = { _, d -> d.id }) { i, d ->
                Row(Modifier.fillMaxWidth().clickable { store.go(Route.Drama(d.id)) }.padding(vertical = 10.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    T("${i + 1}", 22.sp, FontWeight.Black, MEDAL.getOrElse(i) { Color(0xFF6E6874) }, Modifier.width(26.dp), italic = true)
                    Poster(d, Modifier.width(66.dp), showEps = false, badge = false)
                    Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        T(d.title, 15.sp, FontWeight.Bold, lines = 2)
                        T((d.genres.take(2) + "${d.episodes} EP").joinToString(" · "), 12.sp, color = C.Text3)
                        if (d.badge.isNotEmpty()) T(d.badge, 12.sp, FontWeight.SemiBold, C.Warn)
                    }
                    Box(Modifier.size(44.dp).clip(CircleShape).background(C.AccentSoft).clickable { store.go(Route.Watch(d.id)) }, contentAlignment = Alignment.Center) { PlayGlyph(16.dp, C.Accent) }
                }
                Box(Modifier.fillMaxWidth().height(1.dp).background(C.Surface))
            }
        }
    }
}

@Composable
private fun NewReleases() {
    val store = LocalStore.current
    val home = rememberLoad("home") { loadHome(store) }
    val h = home.data
    if (h == null || store.dramas == null) { LoadOr(home.error, home.reload); return }
    val soon = store.pick(h.soon).filter { it.status == "Scheduled" }
    val recent = store.published.sortedByDescending { it.releaseAt }.take(9)
    LazyColumn(contentPadding = PaddingValues(bottom = 24.dp), verticalArrangement = Arrangement.spacedBy(24.dp)) {
        if (soon.isNotEmpty()) item {
            Column {
                SectionHead("Coming soon")
                LazyRow(contentPadding = PaddingValues(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    items(soon, key = { it.id }) { d ->
                        val on = store.me?.reminders?.contains(d.id) == true
                        Row(Modifier.width(260.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Poster(d, Modifier.width(84.dp).clickable { store.go(Route.Drama(d.id)) }, showEps = false, badge = false)
                            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                T("Out ${fmtStamp(d.releaseAt)}", 12.sp, FontWeight.Bold, C.Warn)
                                T(d.title, 15.sp, FontWeight.Bold, lines = 3)
                                Btn(if (on) "Reminder set" else "Remind me", {
                                    store.act { store.toggle("reminders", d.id); store.show(if (on) "Reminder removed" else "We'll remind you on premiere day") }
                                }, kind = if (on) Kind.Secondary else Kind.Primary, small = true)
                            }
                        }
                    }
                }
            }
        }
        item {
            Column {
                SectionHead("Out recently")
                PosterGrid(recent.map { it.copy(badge = "New") }, { store.go(Route.Drama(it.id)) }, { fmtDate(it.releaseAt) })
            }
        }
    }
}

@Composable
private fun Genres() {
    val store = LocalStore.current
    var genre by remember { mutableStateOf("All") }
    var status by remember { mutableStateOf("All") }
    var sort by remember { mutableStateOf("Popular") }
    val rk = rememberLoad("rankings") { store.api.obj("GET", "/rankings") }
    val hot = rk.data?.optJSONArray("Hot").strings()
    val used = store.published.flatMap { it.genres }.toSet()
    val genres = listOf("All") + store.config?.genres.orEmpty().filter { it in used }
    val items = store.published
        .filter { genre == "All" || genre in it.genres }
        .filter { status == "All" || (status == "Completed") == it.completed }
        .let { list ->
            when (sort) {
                "Newest" -> list.sortedByDescending { it.releaseAt }
                "Most episodes" -> list.sortedByDescending { it.episodes }
                else -> list.sortedBy { hot.indexOf(it.id).let { i -> if (i < 0) Int.MAX_VALUE else i } }
            }
        }
    @Composable
    fun group(opts: List<String>, value: String, set: (String) -> Unit) {
        Row(Modifier.horizontalScroll(rememberScrollState()).padding(horizontal = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            opts.forEach { ChipBtn(it, value == it, { set(it) }, soft = true) }
        }
    }
    LazyColumn(contentPadding = PaddingValues(bottom = 24.dp)) {
        item {
            Column(Modifier.padding(top = 6.dp, bottom = 16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                group(genres, genre) { genre = it }
                group(listOf("All", "Completed", "Ongoing"), status) { status = it }
                group(listOf("Popular", "Newest", "Most episodes"), sort) { sort = it }
            }
        }
        item {
            if (store.dramas == null) LoadOr(null) {}
            else if (items.isEmpty()) Empty(null, "Nothing here yet", "No dramas match these filters. Try another one.")
            else PosterGrid(items, { store.go(Route.Drama(it.id)) }, badge = false)
        }
    }
}

// ---- Search ----

@Composable
fun SearchScreen() {
    val store = LocalStore.current
    val context = LocalContext.current
    val prefs = remember { context.getSharedPreferences("the-ending", 0) }
    var text by remember { mutableStateOf("") }
    var query by remember { mutableStateOf("") }
    var recent by remember { mutableStateOf(prefs.getString("recent-searches", "").orEmpty().split('\n').filter { it.isNotBlank() }) }
    val trending = rememberLoad("trending") { store.api.arr("/search/trending").strings() }
    val results = rememberLoad("search", query) { if (query.isEmpty()) null else store.api.obj("GET", "/search?q=" + java.net.URLEncoder.encode(query, "UTF-8")).optJSONArray("results").strings() }
    val home = rememberLoad("home") { loadHome(store) }
    val run = { q: String ->
        val v = q.trim()
        text = v; query = v
        if (v.isNotEmpty()) {
            recent = (listOf(v) + recent.filterNot { it.equals(v, true) }).take(8)
            prefs.edit().putString("recent-searches", recent.joinToString("\n")).apply()
        }
    }
    Column(Modifier.fillMaxSize().statusBarsPadding()) {
        Row(Modifier.padding(start = 4.dp, end = 8.dp, top = 6.dp, bottom = 6.dp), verticalAlignment = Alignment.CenterVertically) {
            IconButton({ store.back() }) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back", tint = C.Text) }
            TextField(text, { text = it; if (it.isEmpty()) query = "" }, Modifier.weight(1f).heightIn(min = 48.dp), singleLine = true,
                placeholder = { Text("Search dramas, genres", color = C.Text3) }, leadingIcon = { Icon(Icons.Default.Search, null, tint = C.Text3) },
                shape = RoundedCornerShape(24.dp), keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search), keyboardActions = KeyboardActions(onSearch = { run(text) }),
                colors = TextFieldDefaults.colors(focusedContainerColor = C.Surface, unfocusedContainerColor = C.Surface, focusedIndicatorColor = Color.Transparent, unfocusedIndicatorColor = Color.Transparent, cursorColor = C.Accent))
            Btn("Search", { run(text) }, kind = Kind.Ghost, small = true)
        }
        if (query.isEmpty()) {
            LazyColumn(contentPadding = PaddingValues(16.dp), verticalArrangement = Arrangement.spacedBy(24.dp)) {
                if (recent.isNotEmpty()) item {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Title("Recent", 16.sp, Modifier.weight(1f))
                            IconButton({ recent = emptyList(); prefs.edit().remove("recent-searches").apply() }) { Icon(Icons.Outlined.Delete, "Clear recent searches", tint = C.Text3) }
                        }
                        Row(Modifier.horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) { recent.forEach { ChipBtn(it, false, { run(it) }) } }
                    }
                }
                val t = trending.data.orEmpty()
                if (t.isNotEmpty()) item {
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Default.LocalFireDepartment, null, tint = C.Accent, modifier = Modifier.size(18.dp)); Title("Trending searches", 16.sp) }
                        t.chunked(2).forEachIndexed { r, pair ->
                            Row {
                                pair.forEachIndexed { c, q ->
                                    val i = r * 2 + c
                                    Row(Modifier.weight(1f).clickable { run(q) }.heightIn(min = 44.dp), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        T("${i + 1}", 14.sp, FontWeight.Black, listOf(C.Accent, Color(0xFFFF8A5C), C.Warn).getOrElse(i) { C.Text3 }, italic = true)
                                        T(q, 14.sp, lines = 1)
                                    }
                                }
                                if (pair.size == 1) Spacer(Modifier.weight(1f))
                            }
                        }
                    }
                }
            }
        } else {
            val ids = results.data
            if (ids == null) { LoadOr(results.error, results.reload); return@Column }
            val list = store.pick(ids)
            if (list.isEmpty()) {
                LazyColumn {
                    item { Empty(Icons.Default.Search, "No dramas found", "Try a shorter title or a genre like Romance.", muted = true) }
                    home.data?.let { h -> item { Column { SectionHead("You might like"); PosterGrid(store.pick(h.hot.take(3)), { store.go(Route.Drama(it.id)) }) } } }
                }
            } else {
                LazyColumn(contentPadding = PaddingValues(16.dp)) {
                    item { T("${list.size} ${if (list.size == 1) "drama" else "dramas"}", 13.sp, color = C.Text3) }
                    items(list, key = { it.id }) { d ->
                        Row(Modifier.fillMaxWidth().clickable { store.go(Route.Drama(d.id)) }.padding(vertical = 12.dp), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            Poster(d, Modifier.width(84.dp), showEps = false, badge = false)
                            Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                T(d.title, 15.sp, FontWeight.Bold, lines = 2)
                                T((d.genres.take(2) + "${d.episodes} EP").joinToString(" · "), 12.sp, color = C.Text3)
                                if (d.synopsis.isNotEmpty()) T(d.synopsis, 13.sp, color = C.Text2, lines = 2)
                            }
                            Btn("Watch", { store.go(Route.Watch(d.id)) }, Modifier.align(Alignment.CenterVertically), small = true)
                        }
                        Box(Modifier.fillMaxWidth().height(1.dp).background(C.Surface))
                    }
                }
            }
        }
    }
}

// ---- Shorts ----

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun ShortsScreen() {
    val store = LocalStore.current
    val home = rememberLoad("home") { loadHome(store) }
    val h = home.data
    if (h == null || store.dramas == null) { Box(Modifier.statusBarsPadding()) { LoadOr(home.error, home.reload) }; return }
    val items = store.pick((h.hot + store.published.map { it.id }).distinct()).filter { it.published && it.episodes > 0 }
    val pager = rememberPagerState { items.size }
    VerticalPager(pager, Modifier.fillMaxSize()) { page -> Clip(items[page]) }
}

@Composable
private fun Clip(d: Drama) {
    val store = LocalStore.current
    val context = LocalContext.current
    val me = store.me
    val liked = me?.liked?.contains(d.id) == true
    val saved = me?.saved?.contains(d.id) == true
    Box(Modifier.fillMaxSize().background(Color(d.color))) {
        val art = d.poster.ifEmpty { d.banner }
        if (art.isNotEmpty()) AsyncImage(store.api.url(art), null, Modifier.fillMaxSize(), contentScale = ContentScale.Crop)
        else Canvas(Modifier.fillMaxSize()) {
            drawCircle(Color(d.color2), size.width * .55f, Offset(size.width * .4f, size.height * .55f))
            drawCircle(Color(d.color2).copy(alpha = .7f), size.width * .28f, Offset(size.width * .85f, size.height * .2f))
        }
        Box(Modifier.align(Alignment.BottomCenter).fillMaxWidth().fillMaxHeight(.45f).background(Color(0x73000000)))
        Column(Modifier.align(Alignment.BottomEnd).padding(end = 8.dp, bottom = 120.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Box(Modifier.size(46.dp, 62.dp).clip(RoundedCornerShape(8.dp)).border(2.dp, Color.White, RoundedCornerShape(8.dp)).clickable { store.go(Route.Drama(d.id)) }) { Poster(d, showEps = false, badge = false) }
            RailButton(if (liked) Icons.Default.Favorite else Icons.Outlined.FavoriteBorder, if (liked) "Liked" else "Like", if (liked) C.Red else Color.White) { store.act { store.toggle("liked", d.id) } }
            RailButton(if (saved) Icons.Default.Bookmark else Icons.Outlined.BookmarkBorder, if (saved) "Saved" else "Save", if (saved) C.Warn else Color.White) {
                store.act { store.toggle("saved", d.id); store.show(if (saved) "Removed from My List" else "Saved to My List") }
            }
            RailButton(Icons.Outlined.GridView, "Episodes") { store.go(Route.Drama(d.id)) }
            RailButton(Icons.Outlined.Share, "Share") { shareDrama(context, store, d) }
        }
        Column(Modifier.align(Alignment.BottomStart).padding(start = 16.dp, end = 84.dp, bottom = 68.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            T(d.title, 17.sp, FontWeight.ExtraBold)
            if (d.synopsis.isNotEmpty()) T(d.synopsis, 14.sp, color = Color(0xFFE6E0E8), lines = 2, lineHeight = 20.sp)
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) { d.genres.take(2).forEach { T(it, 12.sp, modifier = Modifier.background(Color(0x29FFFFFF), RoundedCornerShape(6.dp)).padding(horizontal = 8.dp, vertical = 3.dp)) } }
        }
        Row(Modifier.align(Alignment.BottomCenter).fillMaxWidth().heightIn(min = 48.dp).background(Color(0xEB0F0C11)).clickable { store.go(Route.Watch(d.id, 1)) }.padding(horizontal = 16.dp),
            verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            Icon(Icons.Outlined.SlowMotionVideo, null, tint = Color.White, modifier = Modifier.size(16.dp))
            T("Watch full series · ${d.episodes} episodes", 13.sp, FontWeight.SemiBold, modifier = Modifier.weight(1f))
            T("EP 1 ›", 13.sp, FontWeight.Bold, C.Accent)
        }
    }
}

@Composable
fun RailButton(icon: androidx.compose.ui.graphics.vector.ImageVector, label: String, tint: Color = Color.White, onClick: () -> Unit) {
    Column(Modifier.clickable(onClick = onClick), horizontalAlignment = Alignment.CenterHorizontally) {
        Icon(icon, label, tint = tint, modifier = Modifier.size(30.dp))
        T(label, 12.sp, FontWeight.SemiBold)
    }
}

/** Share sheet with a link to the web drama page; signed-in viewers' links carry their invite. */
fun shareDrama(context: android.content.Context, store: AppStore, d: Drama) {
    val me = store.me
    val ref = if (me?.user?.signedIn == true) "?ref=${me.user.id}" else ""
    val url = "${store.api.baseUrl}/drama/${d.id}/$ref"
    val intent = android.content.Intent(android.content.Intent.ACTION_SEND).apply {
        type = "text/plain"
        putExtra(android.content.Intent.EXTRA_TEXT, "Watch ${d.title} on The Ending $url")
    }
    context.startActivity(android.content.Intent.createChooser(intent, "Share ${d.title}"))
}
