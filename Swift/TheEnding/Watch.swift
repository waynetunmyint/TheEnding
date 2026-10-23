import AVFoundation
import SwiftUI

/// Episode number grid split into tabs of 30.
struct EpisodeGrid: View {
    @Environment(AppStore.self) private var store
    let dramaId: String
    let episodes: [Episode]
    let current: Int?
    let pick: (Episode) -> Void
    @State private var range: Int?

    var body: some View {
        let ranges = stride(from: 0, to: episodes.count, by: 30).map { Array(episodes[$0..<min($0 + 30, episodes.count)]) }
        let start = (episodes.firstIndex { $0.n == current } ?? 0) / 30
        let r = min(range ?? start, max(0, ranges.count - 1))
        VStack(alignment: .leading, spacing: 12) {
            if ranges.count > 1 {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 18) {
                        ForEach(ranges.indices, id: \.self) { i in
                            Button { range = i } label: {
                                VStack(spacing: 6) {
                                    Text("\(ranges[i].first!.n)–\(ranges[i].last!.n)").font(.system(size: 14, weight: .bold)).foregroundStyle(i == r ? C.text : C.text3)
                                    Rectangle().fill(i == r ? C.red : .clear).frame(width: 24, height: 2)
                                }.padding(.vertical, 4)
                            }.buttonStyle(.plain)
                        }
                    }
                }
            }
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 6), spacing: 8) {
                ForEach(ranges.isEmpty ? [] : ranges[r]) { e in
                    let locked = !(store.me?.canWatch(dramaId, e) ?? false)
                    let isCurrent = e.n == current
                    Button { pick(e) } label: {
                        Text("\(e.n)").font(.system(size: 15, weight: .bold))
                            .foregroundStyle(isCurrent ? C.accent : (current.map { e.n < $0 } ?? false) ? C.text3 : C.text)
                            .frame(maxWidth: .infinity, minHeight: 46)
                            .background(isCurrent ? C.accentSoft : C.surface2, in: RoundedRectangle(cornerRadius: 10))
                            .overlay(alignment: .topTrailing) { if locked { Image(systemName: "lock.fill").font(.system(size: 9)).foregroundStyle(C.text3).padding(5) } }
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Episode \(e.n)\(locked ? ", locked" : "")")
                }
            }
        }
    }
}

struct DramaScreen: View {
    @Environment(AppStore.self) private var store
    let id: String
    var body: some View {
        Loaded("drama:\(id)", fetch: { try await store.api.get("/dramas/\(id)", as: DramaDetail.self) }) { data, _ in
            DramaBody(d: data.drama, eps: data.episodes)
        }
        .overlay(alignment: .top) { EmptyView() }
    }
}

private struct DramaBody: View {
    @Environment(AppStore.self) private var store
    let d: Drama
    let eps: [Episode]

    var body: some View {
        let me = store.me
        let current = me?.progress[d.id]?.ep
        let saved = me?.saved.contains(d.id) ?? false
        let upcoming = !d.published
        let reminded = me?.reminders.contains(d.id) ?? false
        let freeCount = eps.filter(\.free).count
        GeometryReader { geo in
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                ZStack(alignment: .top) {
                    ZStack {
                        Color(hex: d.color)
                        if !d.banner.isEmpty, let u = store.api.url(d.banner) {
                            AsyncImage(url: u) { $0.resizable().scaledToFill().opacity(0.6) } placeholder: { Color.clear }
                        } else {
                            GeometryReader { g in Circle().fill(Color(hex: d.color2)).frame(width: 360).offset(x: g.size.width - 240, y: -120) }
                        }
                        LinearGradient(colors: [.clear, C.bg], startPoint: .center, endPoint: .bottom)
                    }.frame(height: 300).clipped()
                    VStack(spacing: 0) {
                        // The hero runs under the status bar; the bar's buttons stay below it.
                        Color.clear.frame(height: geo.safeAreaInsets.top)
                        TopBar(onBack: { store.back() }) {
                            ShareLink(item: shareURL(store, d)) { Image(systemName: "square.and.arrow.up").font(.system(size: 18, weight: .semibold)).frame(width: 44, height: 44) }
                                .accessibilityLabel("Share")
                        }
                        HStack(alignment: .bottom, spacing: 14) {
                            Poster(d: d, showEps: false).frame(width: 120)
                            VStack(alignment: .leading, spacing: 8) {
                                Text(d.title).font(.system(size: 22, weight: .heavy))
                                let total = d.totalEpisodes > 0 ? d.totalEpisodes : d.episodes
                                Text([total > 0 ? "\(total) episodes" : nil, d.completed ? "Completed" : "Ongoing", upcoming && d.releaseAt > 0 ? "Premieres \(fmtStamp(d.releaseAt))" : nil].compactMap { $0 }.joined(separator: " · "))
                                    .font(.system(size: 13)).foregroundStyle(Color(hex: "#D7D0DA"))
                                ScrollView(.horizontal, showsIndicators: false) {
                                    HStack(spacing: 6) { ForEach(d.genres, id: \.self) { Text($0).font(.system(size: 12)).padding(.horizontal, 8).padding(.vertical, 3).background(.white.opacity(0.12), in: RoundedRectangle(cornerRadius: 6)) } }
                                }
                            }
                        }.padding(.horizontal, 16).padding(.top, 12)
                    }
                }
                VStack(alignment: .leading, spacing: 16) {
                    if !d.synopsis.isEmpty { Text(d.synopsis).font(.system(size: 15)).foregroundStyle(C.text2).lineSpacing(4) }
                    if freeCount > 0 {
                        Label(freeCount == eps.count ? "Every episode is free" : "\(freeCount) free \(freeCount == 1 ? "episode" : "episodes") · \(d.coinsPerEpisode) coins after · VIP watches all", systemImage: "gift")
                            .font(.system(size: 13, weight: .semibold)).foregroundStyle(C.warn)
                    }
                    if !upcoming && !eps.isEmpty {
                        Text("Episodes").font(.system(size: 17, weight: .heavy))
                        EpisodeGrid(dramaId: d.id, episodes: eps, current: current) { store.go(.watch(d.id, $0.n)) }
                    }
                    if !upcoming && eps.isEmpty { Text("Episodes are on the way.").foregroundStyle(C.text2) }
                }.padding(16).padding(.bottom, 100)
            }
        }
        .ignoresSafeArea(edges: .top)
        }
        .safeAreaInset(edge: .bottom) {
            HStack(spacing: 12) {
                Button {
                    store.act { try await store.toggle("saved", d.id); store.show(saved ? "Removed from My List" : "Saved to My List") }
                } label: {
                    Image(systemName: saved ? "bookmark.fill" : "bookmark").font(.system(size: 20)).foregroundStyle(saved ? C.warn : C.text).frame(width: 52, height: 52).background(C.surface, in: Circle())
                }.accessibilityLabel(saved ? "Remove from My List" : "Save to My List")
                if upcoming {
                    Btn(reminded ? "Reminder set" : "Remind me on premiere day", kind: reminded ? .secondary : .primary, full: true) {
                        store.act { try await store.toggle("reminders", d.id); store.show(reminded ? "Reminder removed" : "We'll remind you on premiere day") }
                    }
                } else if let first = eps.first {
                    Btn(current != nil ? "Continue EP \(current!)" : "Play EP \(first.n)", full: true, icon: AnyView(Image(systemName: "play.fill"))) { store.go(.watch(d.id, current ?? first.n)) }
                }
            }
            .padding(.horizontal, 16).padding(.vertical, 10).background(C.bg)
        }
    }
}

// MARK: Player

@MainActor
@Observable
final class VideoModel {
    let player = AVPlayer()
    var ready = false
    var failed = false
    var endedCount = 0
    var time: Double = 0
    var duration: Double = 0
    private var statusObservation: NSKeyValueObservation?
    private var endObserver: NSObjectProtocol?
    private var timeObserver: Any?

    init() {
        timeObserver = player.addPeriodicTimeObserver(forInterval: CMTime(seconds: 0.25, preferredTimescale: 600), queue: .main) { [weak self] t in
            MainActor.assumeIsolated { self?.time = t.seconds }
        }
    }

    func load(_ url: URL, cookies: [HTTPCookie]) {
        ready = false; failed = false; time = 0; duration = 0
        let item = AVPlayerItem(asset: AVURLAsset(url: url, options: [AVURLAssetHTTPCookiesKey: cookies]))
        statusObservation = item.observe(\.status) { [weak self] item, _ in
            let status = item.status
            let d = item.duration.seconds
            Task { @MainActor in
                guard let self else { return }
                if status == .readyToPlay { self.ready = true; if d.isFinite { self.duration = d } }
                if status == .failed { self.failed = true }
            }
        }
        if let endObserver { NotificationCenter.default.removeObserver(endObserver) }
        endObserver = NotificationCenter.default.addObserver(forName: AVPlayerItem.didPlayToEndTimeNotification, object: item, queue: .main) { [weak self] _ in
            MainActor.assumeIsolated { self?.endedCount += 1 }
        }
        player.replaceCurrentItem(with: item)
    }

    func stop() {
        player.pause()
        player.replaceCurrentItem(with: nil)
    }
}

private final class PlayerUIView: UIView {
    override class var layerClass: AnyClass { AVPlayerLayer.self }
    var playerLayer: AVPlayerLayer { layer as! AVPlayerLayer }
}

private struct VideoSurface: UIViewRepresentable {
    let player: AVPlayer
    func makeUIView(context: Context) -> PlayerUIView {
        let v = PlayerUIView()
        v.playerLayer.player = player
        v.playerLayer.videoGravity = .resizeAspect
        v.backgroundColor = .black
        return v
    }
    func updateUIView(_ v: PlayerUIView, context: Context) { v.playerLayer.player = player }
}

struct PlayerScreen: View {
    @Environment(AppStore.self) private var store
    let id: String
    let requested: Int?
    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            Loaded("drama:\(id)", fetch: { try await store.api.get("/dramas/\(id)", as: DramaDetail.self) }) { data, _ in
                if !data.drama.published || data.episodes.isEmpty {
                    VStack {
                        TopBar(onBack: { store.back() })
                        EmptyState(title: "Not out yet", message: "\(data.drama.title) has no episodes to watch yet.")
                        Spacer()
                    }
                } else {
                    PlayerBody(d: data.drama, episodes: data.episodes, requested: requested)
                }
            }
        }
    }
}

private enum Sheet { case episodes, unlock, topUp, comments, share, settings, ad, adDone, end }

private struct PlayerBody: View {
    @Environment(AppStore.self) private var store
    let d: Drama
    let episodes: [Episode]
    let requested: Int?

    @State private var ep = 0
    @State private var t: Double = 0
    @State private var playing = true
    @State private var speed: Float = 1
    @State private var quality = "Auto"
    @State private var sheet: Sheet?
    @State private var loading = true
    @State private var dismissedLock = 0
    @State private var ad: AdTicket?
    @State private var adLeft = 0
    @State private var busy = false
    @State private var watched: Double = 0
    @State private var video = VideoModel()

    private var episode: Episode { episodes.first { $0.n == ep } ?? episodes[0] }
    private var next: Episode? { episodes.firstIndex { $0.n == ep }.flatMap { $0 + 1 < episodes.count ? episodes[$0 + 1] : nil } }
    private var unlocked: Bool { store.me?.canWatch(d.id, episode) ?? false }
    private var realVideo: Bool { episode.hasVideo && unlocked }
    private var len: Double { realVideo && video.duration > 0 ? video.duration : Double(episode.length > 0 ? episode.length : 90) }
    private var openSheet: Sheet? { sheet ?? ((!loading && !unlocked && dismissedLock != ep) ? .unlock : nil) }
    private var active: Bool { playing && unlocked && !loading && !video.failed && openSheet == nil }

    var body: some View {
        ZStack {
            videoLayer
            controls
            sheets
        }
        .foregroundStyle(.white)
        .onAppear {
            let start = [requested, store.me?.progress[d.id]?.ep].compactMap { $0 }.first { n in episodes.contains { $0.n == n } }
            ep = start ?? episodes[0].n
        }
        .onDisappear { video.stop() }
        // New episode: save progress and play count, then auto-unlock with coins if the viewer opted in.
        .task(id: ep) {
            guard ep != 0 else { return }
            store.act { try await store.setProgress(d.id, ep) }
            loadVideo()
            try? await Task.sleep(for: .milliseconds(600))
            guard let m = store.me else { return }
            if !episode.hasVideo || !m.canWatch(d.id, episode) { loading = false }
            if !m.canWatch(d.id, episode) && m.settings.autoUnlock && m.coins >= d.coinsPerEpisode {
                store.act { try await store.unlock(d.id, ep); store.show("EP \(ep) unlocked · −\(d.coinsPerEpisode) coins") }
            }
        }
        .onChange(of: realVideo) { _, _ in loadVideo() }
        .onChange(of: video.ready) { _, r in if r && realVideo { loading = false } }
        .onChange(of: video.endedCount) { _, _ in finished() }
        .onChange(of: active) { _, a in syncPlayback(a) }
        .onChange(of: speed) { _, _ in syncPlayback(active) }
        // Timed preview for episodes without an uploaded video, plus watch time for the 30-minute task.
        .task(id: active) {
            while active && !Task.isCancelled {
                try? await Task.sleep(for: .milliseconds(250))
                guard active else { break }
                watched += 0.25
                if watched >= 30 { watched -= 30; store.act { try await store.reportWatch(30) } }
                if !realVideo {
                    t = min(len, t + 0.25 * Double(speed))
                    if t >= len { finished(); break }
                } else {
                    t = video.time
                }
            }
        }
        // Rewarded ad countdown, then the server checks the ticket and unlocks.
        .task(id: ad?.ticket) {
            guard let a = ad else { return }
            adLeft = a.seconds
            while adLeft > 0 {
                try? await Task.sleep(for: .seconds(1))
                if Task.isCancelled { return }
                adLeft -= 1
            }
            do { try await store.completeAd(a.ticket); sheet = .adDone } catch { store.show(error.localizedDescription); sheet = .unlock }
            ad = nil
        }
    }

    private func loadVideo() {
        if realVideo, let u = store.api.url("/api/episodes/\(d.id)/\(ep)/video") {
            video.load(u, cookies: store.api.cookies)
        } else {
            video.stop()
        }
    }

    private func syncPlayback(_ a: Bool) {
        guard realVideo else { return }
        if a { video.player.playImmediately(atRate: speed) } else { video.player.pause() }
    }

    private func goEp(_ n: Int) { t = 0; loading = true; sheet = nil; playing = true; ep = n }

    private func finished() {
        if let next {
            if store.me?.settings.autoplay ?? true { goEp(next.n) } else { playing = false }
        } else {
            sheet = .end
        }
    }

    private func payCoins() {
        guard let m = store.me else { return }
        if m.coins < d.coinsPerEpisode { sheet = .topUp; return }
        busy = true
        store.act {
            defer { busy = false }
            try await store.unlock(d.id, ep)
            sheet = nil; playing = true
            store.show("EP \(ep) unlocked · −\(d.coinsPerEpisode) coins")
        }
    }

    private func watchAd() {
        busy = true
        store.act {
            defer { busy = false }
            ad = try await store.startAd("unlock", d.id, ep)
            sheet = .ad
        }
    }

    // MARK: Layers

    @ViewBuilder private var videoLayer: some View {
        if realVideo {
            VideoSurface(player: video.player).ignoresSafeArea()
        } else {
            ZStack {
                Color(hex: d.color)
                GeometryReader { g in
                    Circle().fill(Color(hex: d.color2)).frame(width: g.size.width * 1.2).offset(x: -g.size.width * 0.2, y: g.size.height * 0.2)
                    Circle().fill(Color(hex: d.color2).opacity(0.7)).frame(width: g.size.width * 0.6).offset(x: g.size.width * 0.6, y: g.size.height * 0.02)
                }
                if !episode.hasVideo { Text("Preview · no video uploaded for this episode yet").font(.system(size: 12)).foregroundStyle(.white.opacity(0.6)).offset(y: 60) }
            }.ignoresSafeArea()
        }
        LinearGradient(stops: [.init(color: .black.opacity(0.55), location: 0), .init(color: .clear, location: 0.2), .init(color: .clear, location: 0.6), .init(color: .black.opacity(0.7), location: 1)],
                       startPoint: .top, endPoint: .bottom).ignoresSafeArea().allowsHitTesting(false)
        Color.clear.contentShape(Rectangle()).onTapGesture { if unlocked { playing.toggle() } else { sheet = .unlock } }
    }

    @ViewBuilder private var controls: some View {
        if unlocked && (loading || video.failed) {
            VStack(spacing: 12) {
                if video.failed {
                    Image(systemName: "exclamationmark.circle").font(.system(size: 36)).foregroundStyle(C.text2)
                    Text("Can't play this episode").font(.system(size: 20, weight: .heavy))
                    Text("Check your connection and try again. Your coins and progress are safe.").foregroundStyle(C.text2).multilineTextAlignment(.center)
                    Btn("Try again") { loading = true; loadVideo() }
                    Btn("Report a problem", kind: .ghost) { store.go(.help) }
                } else {
                    ProgressView().tint(C.accent).controlSize(.large)
                    Text("Loading EP \(ep)…").font(.system(size: 15, weight: .semibold))
                }
            }.padding(40).frame(maxWidth: .infinity, maxHeight: .infinity).background(video.failed ? Color(hex: "#120E14") : .clear)
        }
        if !playing && unlocked && !loading && !video.failed {
            Button { playing = true } label: { Image(systemName: "play.fill").font(.system(size: 30)).frame(width: 72, height: 72).background(.black.opacity(0.4), in: Circle()) }
                .accessibilityLabel("Play")
        }
        if !unlocked && openSheet == nil {
            Button { sheet = .unlock } label: {
                VStack(spacing: 8) {
                    Image(systemName: "lock.fill").font(.system(size: 24)).frame(width: 56, height: 56).background(.white.opacity(0.12), in: Circle())
                    Text("Episode \(ep) is locked · tap to unlock").font(.system(size: 15, weight: .bold))
                }
            }.buttonStyle(.plain)
        }
        VStack(spacing: 0) {
            HStack {
                Button { store.back() } label: { Image(systemName: "chevron.left").font(.system(size: 20, weight: .semibold)).frame(width: 44, height: 44) }.accessibilityLabel("Back")
                Text(d.title).font(.system(size: 15, weight: .bold)).lineLimit(1).frame(maxWidth: .infinity, alignment: .leading)
                Button { sheet = .settings } label: { Image(systemName: "ellipsis").font(.system(size: 20, weight: .bold)).frame(width: 44, height: 44) }.accessibilityLabel("Playback settings")
            }.padding(.horizontal, 4)
            Spacer()
            HStack(alignment: .bottom) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("EP \(ep)\(episode.title.isEmpty ? "" : " · \(episode.title)")").font(.system(size: 16, weight: .heavy))
                    if !d.synopsis.isEmpty { Text(d.synopsis).font(.system(size: 14)).foregroundStyle(Color(hex: "#E6E0E8")).lineLimit(2) }
                }.frame(maxWidth: .infinity, alignment: .leading)
                rail
            }.padding(.horizontal, 16)
            HStack(spacing: 8) {
                Text(duration(t)).font(.system(size: 12)).monospacedDigit()
                Slider(value: Binding(get: { min(t, len) }, set: { v in t = v; if realVideo { video.player.seek(to: CMTime(seconds: v, preferredTimescale: 600)) } }), in: 0...max(1, len))
                    .tint(C.accent).disabled(!unlocked).accessibilityLabel("Playback position")
                Text(duration(len)).font(.system(size: 12)).monospacedDigit()
            }.padding(.horizontal, 16)
            HStack {
                Button { sheet = .episodes } label: {
                    HStack(spacing: 10) {
                        Image(systemName: "square.grid.2x2")
                        Text("EP \(ep) of \(episodes.count) · \(d.completed ? "Completed" : "Ongoing")").font(.system(size: 14, weight: .semibold))
                        Spacer()
                        Image(systemName: "chevron.up")
                    }.frame(minHeight: 44)
                }.buttonStyle(.plain)
                Button { sheet = .settings } label: { Text("\(speedLabel(speed))x").font(.system(size: 13, weight: .bold)).padding(.horizontal, 12).padding(.vertical, 6).background(.white.opacity(0.12), in: Capsule()) }
                    .buttonStyle(.plain)
            }.padding(.horizontal, 16).padding(.bottom, 4)
        }
    }

    private var rail: some View {
        let liked = store.me?.liked.contains(d.id) ?? false
        let saved = store.me?.saved.contains(d.id) ?? false
        return VStack(spacing: 16) {
            RailButton(icon: liked ? "heart.fill" : "heart", label: liked ? "Liked" : "Like", tint: liked ? C.red : .white) { store.act { try await store.toggle("liked", d.id) } }
            RailButton(icon: saved ? "bookmark.fill" : "bookmark", label: saved ? "Saved" : "Save", tint: saved ? C.warn : .white) {
                store.act { try await store.toggle("saved", d.id); store.show(saved ? "Removed from My List" : "Saved to My List") }
            }
            RailButton(icon: "bubble.right", label: "Comments") { sheet = .comments }
            RailButton(icon: "square.and.arrow.up", label: "Share") { sheet = .share }
        }
    }

    @ViewBuilder private var sheets: some View {
        let me = store.me
        switch openSheet {
        case .episodes:
            SheetOverlay(title: d.title, close: { sheet = nil }) {
                Text("\(episodes.count) episodes · \(d.completed ? "Completed" : "Ongoing")").font(.system(size: 13)).foregroundStyle(C.text3)
                EpisodeGrid(dramaId: d.id, episodes: episodes, current: ep) { goEp($0.n) }
            }
        case .unlock:
            SheetOverlay(title: "Unlock EP \(ep)", close: { dismissedLock = ep; sheet = nil; playing = false }) {
                Button { store.go(.wallet) } label: { HStack(spacing: 8) { CoinIcon(); Text("Balance").font(.system(size: 13)); Text("\(me?.coins ?? 0)").font(.system(size: 13, weight: .bold)) } }.buttonStyle(.plain)
                Btn((me?.coins ?? 0) >= d.coinsPerEpisode ? "Unlock for \(d.coinsPerEpisode) coins" : "Top up to unlock · \(d.coinsPerEpisode) coins", full: true, enabled: !busy, icon: AnyView(CoinIcon())) { payCoins() }
                let left = me?.ads.left ?? 0
                Btn(left > 0 ? "Watch a short ad · free (\(left) left today)" : "No free ad unlocks left today", kind: .secondary, full: true, enabled: left > 0 && !busy,
                    icon: AnyView(Image(systemName: "play.rectangle"))) { watchAd() }
                BannerRow(title: "Join VIP · watch everything", subtitle: "All episodes unlocked, no ads, 1080p", bg: C.goldBg, fg: C.gold, action: { store.go(.vip) }) { CrownIcon(size: 26) }
                Toggle2(label: "Auto-unlock next episodes with coins", isOn: me?.settings.autoUnlock ?? false) { v in
                    if var s = store.me?.settings { s.autoUnlock = v; store.act { try await store.setSettings(s) } }
                }
            }
        case .topUp:
            TopUpSheet(d: d, ep: ep, close: { sheet = .unlock }, watchAd: watchAd)
        case .comments:
            SheetOverlay(title: "Comments on EP \(ep)", close: { sheet = nil }) { CommentsPanel(dramaId: d.id, ep: ep) }
        case .share:
            SheetOverlay(title: "Share EP \(ep)", close: { sheet = nil }) {
                BannerRow(title: "Invite a friend, both get \(store.config?.tasks["invite"] ?? 50) coins",
                          subtitle: me?.user.signedIn == true ? "Your share link carries your invite" : "Sign in so your link carries your invite", bg: C.accentSoft, fg: C.text) {
                    Image(systemName: "gift.fill").foregroundStyle(C.accent).font(.system(size: 22))
                }
                HStack(spacing: 10) {
                    ShareLink(item: shareURL(store, d), message: Text("Watch \(d.title) on The Ending")) {
                        Label("Share…", systemImage: "square.and.arrow.up").font(.system(size: 16, weight: .bold)).frame(maxWidth: .infinity, minHeight: 50).background(C.primary, in: Capsule())
                    }
                    Btn("Copy link", kind: .secondary, full: true) { UIPasteboard.general.string = shareURL(store, d).absoluteString; store.show("Link copied") }
                }
            }
        case .settings:
            SheetOverlay(title: "Playback", close: { sheet = nil }) {
                Text("Speed").font(.system(size: 13, weight: .semibold)).foregroundStyle(C.text2)
                HStack(spacing: 8) { ForEach([Float(0.75), 1, 1.25, 1.5, 2], id: \.self) { s in seg("\(speedLabel(s))x", speed == s) { speed = s } } }
                Text("Quality").font(.system(size: 13, weight: .semibold)).foregroundStyle(C.text2)
                HStack(spacing: 8) {
                    ForEach(["Auto", "480p", "720p", "1080p", "4K"], id: \.self) { q in
                        let vipOnly = q == "1080p" || q == "4K"
                        seg(vipOnly ? "\(q) ★" : q, quality == q) { if vipOnly && !(me?.vip ?? false) { store.show("1080p and 4K are for VIP") } else { quality = q } }
                    }
                }
                Text("Uploaded videos play at their original quality; Auto picks the best your connection allows.").font(.system(size: 12)).foregroundStyle(C.text3)
                Toggle2(label: "Autoplay next episode", hint: "A locked episode asks before playing", isOn: me?.settings.autoplay ?? true) { v in
                    if var s = store.me?.settings { s.autoplay = v; store.act { try await store.setSettings(s) } }
                }
                Btn("Report a playback problem", kind: .secondary, full: true) { store.go(.help) }
            }
        case .ad:
            ZStack {
                Color.black.ignoresSafeArea()
                VStack(spacing: 12) {
                    Text("Sponsored · demo ad").font(.system(size: 12)).foregroundStyle(C.text3)
                    Text("Your ad here").font(.system(size: 15, weight: .bold)).foregroundStyle(C.info).frame(width: 220, height: 391).background(C.infoBg, in: RoundedRectangle(cornerRadius: 16))
                    Text("Reward in \(adLeft)s").font(.system(size: 15, weight: .bold))
                }
            }
        case .adDone:
            DialogCard(dismiss: { sheet = nil; playing = true }) {
                Image(systemName: "checkmark").font(.system(size: 28, weight: .bold)).foregroundStyle(C.accent).frame(width: 64, height: 64).background(C.accentSoft, in: Circle())
                Text("EP \(ep) unlocked").font(.system(size: 20, weight: .heavy))
                let left = me?.ads.left ?? 0
                Text("Thanks for watching. You have \(left) free ad \(left == 1 ? "unlock" : "unlocks") left today.").foregroundStyle(C.text2)
                Btn("Play EP \(ep)", full: true) { sheet = nil; playing = true }
            }
        case .end:
            SeriesEnd(d: d, count: episodes.count)
        case nil:
            EmptyView()
        }
    }

    private func seg(_ title: String, _ on: Bool, _ action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title).font(.system(size: 13, weight: .bold)).lineLimit(1).minimumScaleFactor(0.8).frame(maxWidth: .infinity, minHeight: 40)
                .background(on ? C.primary : C.surface2, in: RoundedRectangle(cornerRadius: 12))
        }.buttonStyle(.plain)
    }

    private func speedLabel(_ s: Float) -> String { s == s.rounded() ? String(Int(s)) : String(s) }
}

private struct TopUpSheet: View {
    @Environment(AppStore.self) private var store
    let d: Drama
    let ep: Int
    let close: () -> Void
    let watchAd: () -> Void
    @State private var pick = 1

    var body: some View {
        let me = store.me
        let packs = store.config?.coinPacks ?? []
        SheetOverlay(title: "Not enough coins", close: close) {
            Text("EP \(ep) needs \(d.coinsPerEpisode) coins. You have \(me?.coins ?? 0).").foregroundStyle(C.text2)
            if me?.user.signedIn != true { Text("Sign in first so your coins stay with your account.").font(.system(size: 13)).foregroundStyle(C.warn) }
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 8), count: 3), spacing: 8) {
                ForEach(Array(packs.enumerated()), id: \.element.id) { i, p in
                    Button { pick = i } label: {
                        VStack(spacing: 4) {
                            if !p.tag.isEmpty { Text(p.tag).font(.system(size: 9, weight: .heavy)).foregroundStyle(C.accent).lineLimit(1) }
                            HStack(spacing: 5) { CoinIcon(size: 16); Text("\(p.coins)").font(.system(size: 18, weight: .heavy)) }
                            if p.bonus > 0 { Text("+\(p.bonus) bonus").font(.system(size: 12, weight: .bold)).foregroundStyle(C.warn) }
                            Text(price(p.priceCents)).font(.system(size: 13)).foregroundStyle(C.text2)
                        }
                        .frame(maxWidth: .infinity, minHeight: 96)
                        .background(pick == i ? C.accentSoft : C.surface2, in: RoundedRectangle(cornerRadius: 14))
                        .overlay(RoundedRectangle(cornerRadius: 14).stroke(pick == i ? C.accent : .clear, lineWidth: 2))
                    }.buttonStyle(.plain)
                }
            }
            if packs.indices.contains(pick) {
                let p = packs[pick]
                Btn(me?.user.signedIn == true ? "Buy \(p.coins + p.bonus) coins · \(price(p.priceCents))" : "Sign in to buy coins", full: true) {
                    store.go(me?.user.signedIn == true ? .payment(p.id) : .login)
                }
            }
            HStack {
                Spacer()
                Btn("Watch an ad instead", kind: .ghost, small: true, enabled: (me?.ads.left ?? 0) > 0, action: watchAd)
                Btn("Get VIP", kind: .ghost, small: true) { store.go(.vip) }
                Spacer()
            }
            Text("Demo checkout: no real payment is made. The store build pays through the App Store.").font(.system(size: 12)).foregroundStyle(C.text3).frame(maxWidth: .infinity)
        }
    }
}

private struct CommentsPanel: View {
    @Environment(AppStore.self) private var store
    let dramaId: String
    let ep: Int
    @State private var draft = ""
    @State private var reporting = 0
    @State private var refresh = 0

    var body: some View {
        let me = store.me
        Loaded("comments:\(dramaId):\(ep):\(refresh)", fetch: { try await store.api.get("/comments?drama=\(dramaId)&ep=\(ep)", as: [Comment].self) }) { list, _ in
            if list.isEmpty { Text("No comments yet. Say something about EP \(ep).").foregroundStyle(C.text2) }
            ForEach(list) { c in
                HStack(alignment: .top, spacing: 12) {
                    Avatar(initial: c.initial, color: c.color)
                    VStack(alignment: .leading, spacing: 4) {
                        Text(c.name).font(.system(size: 13, weight: .semibold)).foregroundStyle(C.text2)
                        Text(c.text).font(.system(size: 15))
                        HStack(spacing: 14) {
                            Text(fmtDate(c.at)).font(.system(size: 12)).foregroundStyle(C.text3)
                            if c.mine {
                                Button("Delete") { store.act { try await store.api.raw("DELETE", "/comments/\(c.id)"); refresh += 1 } }.font(.system(size: 12, weight: .semibold)).foregroundStyle(C.text2)
                            } else {
                                Button("Report") { reporting = reporting == c.id ? 0 : c.id }.font(.system(size: 12, weight: .semibold)).foregroundStyle(C.text2)
                            }
                        }
                        if reporting == c.id {
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 8) {
                                    ForEach([("spam", "Spam"), ("spoiler", "Spoiler"), ("harassment", "Harassment"), ("other", "Something else")], id: \.0) { k, l in
                                        ChipBtn(title: l, selected: false) {
                                            reporting = 0
                                            store.act { try await store.api.raw("POST", "/comments/\(c.id)/report", ["reason": k]); store.show("Thanks. A moderator will take a look.") }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        if me?.user.signedIn != true {
            Btn("Sign in to comment", kind: .secondary, full: true) { store.go(.login) }
        } else if me?.muted == true {
            Text("You can't comment for now. A moderator muted your account.").font(.system(size: 13)).foregroundStyle(C.text2)
        } else {
            HStack(alignment: .bottom, spacing: 8) {
                TextField("Add a comment…", text: $draft, axis: .vertical).lineLimit(1...5)
                    .padding(.horizontal, 16).padding(.vertical, 11).background(C.surface2, in: RoundedRectangle(cornerRadius: 21))
                    .onChange(of: draft) { _, v in if v.count > 500 { draft = String(v.prefix(500)) } }
                Button {
                    let text = draft.trimmingCharacters(in: .whitespacesAndNewlines)
                    guard !text.isEmpty else { return }
                    store.act { try await store.api.raw("POST", "/comments", ["dramaId": dramaId, "ep": ep, "text": text]); draft = ""; refresh += 1 }
                } label: { Image(systemName: "paperplane.fill").font(.system(size: 20)).foregroundStyle(draft.trimmingCharacters(in: .whitespaces).isEmpty ? Color(hex: "#4A4350") : C.accent).frame(width: 44, height: 44) }
                    .disabled(draft.trimmingCharacters(in: .whitespaces).isEmpty).accessibilityLabel("Send")
            }
        }
    }
}

private struct SeriesEnd: View {
    @Environment(AppStore.self) private var store
    let d: Drama
    let count: Int
    var body: some View {
        let others = store.published.filter { $0.id != d.id && $0.episodes > 0 }
        let more = Array(others.filter { o in o.genres.contains { d.genres.contains($0) } }.prefix(3))
        let upNext = more.first ?? others.first
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                Button { store.back() } label: { Image(systemName: "xmark").font(.system(size: 20, weight: .semibold)).frame(width: 44, height: 44) }.accessibilityLabel("Close")
                VStack(alignment: .leading, spacing: 6) {
                    Text(d.completed ? "The End · \(count) of \(count) watched" : "You're caught up · \(count) episodes so far").font(.system(size: 13, weight: .bold)).foregroundStyle(C.accent)
                    Text(d.completed ? "You finished \(d.title)" : "More of \(d.title) is coming").font(.system(size: 24, weight: .heavy))
                }
                HStack(spacing: 8) {
                    Text("Did you enjoy it?").foregroundStyle(C.text2).frame(maxWidth: .infinity, alignment: .leading)
                    Btn("Loved it", small: true) { rate(1, "Thanks for rating") }
                    Btn("Not for me", kind: .secondary, small: true) { rate(-1, "Thanks, we'll tune your picks") }
                }
                if let upNext {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Up next").font(.system(size: 17, weight: .heavy))
                        Button { store.back(); store.go(.watch(upNext.id, 1)) } label: {
                            HStack(alignment: .top, spacing: 14) {
                                Poster(d: upNext, showEps: false).frame(width: 120)
                                VStack(alignment: .leading, spacing: 6) {
                                    Text(upNext.title).font(.system(size: 17, weight: .bold))
                                    Text((Array(upNext.genres.prefix(2)) + ["\(upNext.episodes) EP"]).joined(separator: " · ")).font(.system(size: 13)).foregroundStyle(C.text3)
                                    Text("Play EP 1 ›").font(.system(size: 13, weight: .bold)).foregroundStyle(C.accent)
                                }
                            }
                        }.buttonStyle(.plain)
                    }
                }
                if more.count > 1 {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("More like this").font(.system(size: 17, weight: .heavy))
                        HStack(alignment: .top, spacing: 10) { ForEach(more) { m in PosterCard(d: m, badge: false) { store.back(); store.go(.drama(m.id)) } } }
                    }
                }
            }.padding(20)
        }
        .background(C.bg.ignoresSafeArea())
    }

    private func rate(_ v: Int, _ msg: String) { store.act { try await store.api.raw("POST", "/ratings", ["dramaId": d.id, "value": v]); store.show(msg) } }
}
