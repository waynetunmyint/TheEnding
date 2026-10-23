package com.mws.theending.ui

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material.icons.filled.ErrorOutline
import androidx.compose.material.icons.filled.WifiOff
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.TextUnit
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.mws.theending.Drama
import com.mws.theending.LocalStore
import com.mws.theending.Me
import com.mws.theending.fmtDate

object C {
    val Bg = Color(0xFF0F0C11)
    val Surface = Color(0xFF1B1720)
    val Surface2 = Color(0xFF262029)
    val Line = Color(0xFF221D26)
    val Text = Color(0xFFFFFFFF)
    val Text2 = Color(0xFFB0A8B4)
    val Text3 = Color(0xFF8E8794)
    val Primary = Color(0xFFE0245E)
    val Accent = Color(0xFFFF5C7A)
    val AccentSoft = Color(0xFF2E1520)
    val Gold = Color(0xFFF2C46D)
    val GoldBg = Color(0xFF2A2112)
    val Coin = Color(0xFFFFB020)
    val Good = Color(0xFF7FD4A0)
    val Warn = Color(0xFFFFC46B)
    val Bad = Color(0xFFFF8FA0)
    val Info = Color(0xFF9CC3FF)
    val InfoBg = Color(0xFF1E2533)
    val BadBg = Color(0xFF2B1A1E)
    val Red = Color(0xFFFF3D5E)
}

@Composable
fun TheEndingTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = darkColorScheme(
            primary = C.Primary, onPrimary = Color.White, background = C.Bg, onBackground = C.Text,
            surface = C.Surface, onSurface = C.Text, surfaceVariant = C.Surface2, onSurfaceVariant = C.Text2,
            surfaceContainerLow = C.Surface, surfaceContainer = C.Surface, surfaceContainerHigh = C.Surface2,
        ),
        content = content,
    )
}

// ---- Text helpers ----

@Composable
fun T(text: String, size: TextUnit = 15.sp, weight: FontWeight = FontWeight.Normal, color: Color = C.Text, modifier: Modifier = Modifier,
      lines: Int = Int.MAX_VALUE, align: TextAlign? = null, italic: Boolean = false, lineHeight: TextUnit = TextUnit.Unspecified) {
    Text(text, modifier = modifier, fontSize = size, fontWeight = weight, color = color, maxLines = lines, overflow = TextOverflow.Ellipsis,
        textAlign = align, fontStyle = if (italic) FontStyle.Italic else null, lineHeight = lineHeight)
}

@Composable
fun Title(text: String, size: TextUnit = 18.sp, modifier: Modifier = Modifier) = T(text, size, FontWeight.ExtraBold, modifier = modifier)

// ---- Icons drawn to match the web design ----

@Composable
fun CoinIcon(size: Dp = 18.dp) {
    Canvas(Modifier.size(size)) {
        drawCircle(C.Coin)
        drawCircle(Color(0xFFB26F00), radius = this.size.minDimension * 0.27f, style = Stroke(this.size.minDimension * 0.07f))
    }
}

@Composable
fun CrownIcon(size: Dp = 18.dp, color: Color = C.Gold) {
    Canvas(Modifier.size(size)) {
        val w = this.size.width; val h = this.size.height
        val p = Path().apply {
            moveTo(w * .125f, h * .33f); lineTo(w * .31f, h * .5f); lineTo(w * .5f, h * .21f); lineTo(w * .69f, h * .5f)
            lineTo(w * .875f, h * .33f); lineTo(w * .79f, h * .79f); lineTo(w * .21f, h * .79f); close()
        }
        drawPath(p, color)
    }
}

@Composable
fun PlayGlyph(size: Dp = 16.dp, color: Color = Color.White) {
    Canvas(Modifier.size(size)) {
        val w = this.size.width; val h = this.size.height
        drawPath(Path().apply { moveTo(w * .29f, h * .17f); lineTo(w * .29f, h * .83f); lineTo(w * .83f, h * .5f); close() }, color)
    }
}

// ---- Poster ----

private val badgeColors = mapOf("Hot" to (Color(0xFFE0245E) to Color.White), "New" to (Color(0xFF1D64D8) to Color.White), "Exclusive" to (Color(0xFFF2C46D) to Color(0xFF2A1A00)))

@Composable
fun Poster(d: Drama, modifier: Modifier = Modifier, rank: Int? = null, progress: Float? = null, showEps: Boolean = true, badge: Boolean = true) {
    val store = LocalStore.current
    Box(modifier.aspectRatio(3f / 4f).clip(RoundedCornerShape(10.dp)).background(Color(d.color))) {
        if (d.poster.isNotEmpty()) {
            AsyncImage(model = store.api.url(d.poster), contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.fillMaxSize())
        } else {
            Canvas(Modifier.fillMaxSize()) {
                drawCircle(Color(d.color2), radius = size.width * .55f, center = Offset(size.width * .75f, size.height * .25f))
            }
        }
        val colors = badgeColors[d.badge]
        if (badge && colors != null) {
            T(d.badge, 10.sp, FontWeight.ExtraBold, colors.second, Modifier.background(colors.first, RoundedCornerShape(bottomEnd = 8.dp)).padding(horizontal = 7.dp, vertical = 3.dp))
        }
        if (rank != null) {
            T("$rank", 44.sp, FontWeight.Black, Color.White, Modifier.align(Alignment.BottomStart).padding(start = 6.dp).offset(y = 8.dp), italic = true)
        }
        if (showEps && rank == null && progress == null && d.episodes > 0) {
            T("${d.episodes} EP", 10.sp, FontWeight.SemiBold, Color.White,
                Modifier.align(Alignment.BottomEnd).padding(6.dp).background(Color(0x990F0C11), RoundedCornerShape(6.dp)).padding(horizontal = 6.dp, vertical = 2.dp))
        }
        if (progress != null) {
            Box(Modifier.align(Alignment.BottomStart).fillMaxWidth().height(3.dp).background(Color(0x40FFFFFF))) {
                Box(Modifier.fillMaxWidth(progress.coerceIn(0f, 1f)).height(3.dp).background(C.Red))
            }
        }
    }
}

@Composable
fun PosterCard(d: Drama, onClick: () -> Unit, modifier: Modifier = Modifier, sub: String? = null, rank: Int? = null, progress: Float? = null, badge: Boolean = true) {
    Column(modifier.clickable(onClick = onClick), verticalArrangement = Arrangement.spacedBy(6.dp)) {
        Poster(d, rank = rank, progress = progress, badge = badge)
        T(d.title, 13.sp, FontWeight.SemiBold, lines = 2, lineHeight = 17.sp)
        if (!sub.isNullOrEmpty()) T(sub, 12.sp, color = C.Text3)
    }
}

/** Three-column poster grid built from rows (works inside a LazyColumn). */
@Composable
fun PosterGrid(items: List<Drama>, onClick: (Drama) -> Unit, sub: (Drama) -> String? = { null }, badge: Boolean = true) {
    Column(Modifier.padding(horizontal = 16.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        items.chunked(3).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                row.forEach { d -> PosterCard(d, { onClick(d) }, Modifier.weight(1f), sub(d), badge = badge) }
                repeat(3 - row.size) { Spacer(Modifier.weight(1f)) }
            }
        }
    }
}

// ---- Buttons and chips ----

enum class Kind { Primary, Secondary, Soft, Gold, Light, Ghost, Danger }

@Composable
fun Btn(text: String, onClick: () -> Unit, modifier: Modifier = Modifier, kind: Kind = Kind.Primary, enabled: Boolean = true, small: Boolean = false,
        leading: (@Composable () -> Unit)? = null) {
    val (bg, fg) = when (kind) {
        Kind.Primary -> C.Primary to Color.White
        Kind.Secondary -> C.Surface2 to C.Text
        Kind.Soft -> C.AccentSoft to C.Accent
        Kind.Gold -> C.Gold to Color(0xFF2A1A00)
        Kind.Light -> Color.White to Color(0xFF1A1A1A)
        Kind.Ghost -> Color.Transparent to C.Text2
        Kind.Danger -> C.BadBg to C.Bad
    }
    Row(
        modifier.heightIn(min = if (small) 36.dp else 50.dp).clip(RoundedCornerShape(50))
            .background(if (enabled) bg else C.Surface2).clickable(enabled = enabled, onClick = onClick)
            .padding(horizontal = if (small) 14.dp else 22.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally), verticalAlignment = Alignment.CenterVertically,
    ) {
        leading?.invoke()
        T(text, if (small) 13.sp else 16.sp, FontWeight.Bold, if (enabled) fg else Color(0xFF6E6874), lines = 1)
    }
}

@Composable
fun ChipBtn(text: String, selected: Boolean, onClick: () -> Unit, soft: Boolean = false) {
    val bg = when {
        selected && soft -> C.AccentSoft
        selected -> Color.White
        soft -> Color.Transparent
        else -> C.Surface
    }
    val fg = when { selected && soft -> C.Accent; selected -> C.Bg; else -> C.Text2 }
    Box(Modifier.heightIn(min = 34.dp).clip(RoundedCornerShape(17.dp)).background(bg).clickable(onClick = onClick).padding(horizontal = 14.dp),
        contentAlignment = Alignment.Center) {
        T(text, 14.sp, FontWeight.SemiBold, fg, lines = 1)
    }
}

@Composable
fun Toggle(checked: Boolean, onChange: (Boolean) -> Unit, enabled: Boolean = true) {
    Switch(checked, onChange, enabled = enabled, colors = SwitchDefaults.colors(
        checkedTrackColor = C.Primary, checkedThumbColor = Color.White, uncheckedTrackColor = Color(0xFF3A3340), uncheckedThumbColor = Color.White,
        uncheckedBorderColor = Color.Transparent,
    ))
}

// ---- Layout pieces ----

@Composable
fun TopBar(title: String = "", onBack: (() -> Unit)?, actions: @Composable RowScope.() -> Unit = {}) {
    Row(Modifier.fillMaxWidth().statusBarsPadding().heightIn(min = 56.dp).padding(horizontal = 4.dp), verticalAlignment = Alignment.CenterVertically) {
        if (onBack != null) {
            IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Filled.ArrowBack, "Back", tint = C.Text) }
        } else {
            Spacer(Modifier.width(48.dp))
        }
        T(title, 17.sp, FontWeight.ExtraBold, modifier = Modifier.weight(1f), align = TextAlign.Center, lines = 1)
        Row(Modifier.widthIn(min = 48.dp), horizontalArrangement = Arrangement.End, verticalAlignment = Alignment.CenterVertically, content = actions)
    }
}


@Composable
fun ListRow(label: String, onClick: (() -> Unit)? = null, value: String? = null, badge: Int = 0, color: Color = C.Text, trailing: (@Composable () -> Unit)? = null) {
    Row(
        Modifier.fillMaxWidth().then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier).heightIn(min = 54.dp),
        verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        T(label, 15.sp, color = color, modifier = Modifier.weight(1f))
        if (badge > 0) T("$badge", 12.sp, FontWeight.ExtraBold, Color.White, Modifier.background(C.Primary, RoundedCornerShape(10.dp)).padding(horizontal = 7.dp, vertical = 2.dp))
        if (!value.isNullOrEmpty()) T(value, 13.sp, color = C.Text3)
        if (trailing != null) trailing() else if (onClick != null) Icon(Icons.Default.ChevronRight, null, tint = C.Text3, modifier = Modifier.size(18.dp))
    }
    Box(Modifier.fillMaxWidth().height(1.dp).background(C.Surface))
}

@Composable
fun GroupTitle(text: String) = T(text, 13.sp, FontWeight.SemiBold, C.Text3, Modifier.padding(top = 22.dp, bottom = 2.dp))

@Composable
fun Loading(modifier: Modifier = Modifier) {
    Box(modifier.fillMaxWidth().padding(64.dp), contentAlignment = Alignment.Center) { CircularProgressIndicator(color = C.Accent, strokeWidth = 3.dp) }
}

@Composable
fun ErrorState(message: String, onRetry: (() -> Unit)?) {
    val offline = message.startsWith("Can't reach")
    Empty(if (offline) Icons.Default.WifiOff else Icons.Default.ErrorOutline, if (offline) "You're offline" else "Something went wrong", message,
        action = onRetry?.let { { Btn("Try again", it) } }, muted = true)
}

/** Loading spinner or error with retry, for data that hasn't arrived yet. */
@Composable
fun LoadOr(error: String?, onRetry: () -> Unit) = if (error != null) ErrorState(error, onRetry) else Loading()

@Composable
fun Empty(icon: ImageVector?, title: String, body: String, action: (@Composable () -> Unit)? = null, muted: Boolean = false) {
    Column(Modifier.fillMaxWidth().padding(horizontal = 32.dp, vertical = 56.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(10.dp)) {
        if (icon != null) {
            Box(Modifier.size(64.dp).clip(CircleShape).background(if (muted) C.Surface else C.AccentSoft), contentAlignment = Alignment.Center) {
                Icon(icon, null, tint = if (muted) C.Text2 else C.Accent, modifier = Modifier.size(30.dp))
            }
        }
        T(title, 20.sp, FontWeight.ExtraBold, align = TextAlign.Center)
        T(body, 15.sp, color = C.Text2, align = TextAlign.Center, lineHeight = 22.sp)
        if (action != null) { Spacer(Modifier.height(8.dp)); action() }
    }
}

@Composable
fun Avatar(initial: String, color: Color, size: Dp = 36.dp) {
    Box(Modifier.size(size).clip(CircleShape).background(color), contentAlignment = Alignment.Center) {
        T(initial.ifEmpty { "?" }, (size.value * .4f).sp, FontWeight.ExtraBold)
    }
}

@Composable
fun Banner(text: String, sub: String? = null, bg: Color, fg: Color, modifier: Modifier = Modifier, onClick: (() -> Unit)? = null, icon: (@Composable () -> Unit)? = null) {
    Row(modifier.fillMaxWidth().clip(RoundedCornerShape(16.dp)).background(bg).then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier).padding(horizontal = 16.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        icon?.invoke()
        Column(Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            T(text, 15.sp, FontWeight.Bold, fg)
            if (!sub.isNullOrEmpty()) T(sub, 13.sp, color = fg.copy(alpha = .8f), lineHeight = 18.sp)
        }
        if (onClick != null) Icon(Icons.Default.ChevronRight, null, tint = fg, modifier = Modifier.size(18.dp))
    }
}

/** Subscription status bar pinned on top of the tab bar; hidden until the backend state is known. */
@Composable
fun SubBar(me: Me?, onClick: () -> Unit) {
    if (me == null) return
    val s = me.subscription
    val (bg, fg) = when (s.state) {
        "pending" -> C.InfoBg to C.Info
        "expired", "failed" -> C.BadBg to C.Bad
        else -> C.GoldBg to C.Gold
    }
    val (label, detail, action) = when (s.state) {
        "active" -> Triple("VIP active", "${s.plan} · until ${fmtDate(s.until)}", "Manage")
        "pending" -> Triple("Payment pending", "VIP ${s.plan} is being confirmed", "View")
        "expired" -> Triple("VIP expired", "Ended ${fmtDate(s.until)} · renew to keep watching", "Renew")
        "failed" -> Triple("Payment didn't go through", "VIP ${s.plan} · you weren't charged", "Retry")
        else -> Triple("VIP", "Unlock every episode, no ads", "Join")
    }
    Row(Modifier.fillMaxWidth().heightIn(min = 44.dp).background(bg).clickable(onClick = onClick).padding(horizontal = 16.dp),
        verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        CrownIcon(16.dp, fg)
        T(label, 13.sp, FontWeight.Bold, fg, lines = 1)
        T(detail, 13.sp, color = fg.copy(alpha = .85f), modifier = Modifier.weight(1f), lines = 1)
        T(action, 13.sp, FontWeight.Bold, fg)
        Icon(Icons.Default.ChevronRight, null, tint = fg, modifier = Modifier.size(14.dp))
    }
}

@Composable
fun Toast(text: String?, modifier: Modifier = Modifier) {
    if (text == null) return
    Box(modifier.fillMaxWidth().padding(PaddingValues(horizontal = 24.dp)), contentAlignment = Alignment.Center) {
        T(text, 14.sp, FontWeight.Bold, C.Bg, Modifier.background(Color.White, RoundedCornerShape(20.dp)).padding(horizontal = 18.dp, vertical = 10.dp), align = TextAlign.Center)
    }
}

@Composable
fun Field(label: String, content: @Composable () -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        T(label, 13.sp, FontWeight.SemiBold, C.Text2)
        content()
    }
}

fun Modifier.outlined(selected: Boolean, color: Color = C.Accent): Modifier =
    this.border(2.dp, if (selected) color else Color.Transparent, RoundedCornerShape(16.dp))
