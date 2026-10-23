import SwiftUI

struct HomeScreen: View {
    @Environment(AppStore.self) private var store
    var body: some View {
        VStack(spacing: 0) {
            HStack(alignment: .bottom) {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(alignment: .bottom, spacing: 18) {
                        ForEach(HomeTab.allCases, id: \.self) { t in
                            let on = store.homeTab == t
                            Button { store.homeTab = t } label: {
                                VStack(spacing: 4) {
                                    Text(t.rawValue).font(.system(size: on ? 20 : 16, weight: on ? .heavy : .semibold)).foregroundStyle(on ? C.text : C.text3)
                                    Capsule().fill(on ? C.red : .clear).frame(width: 16, height: 3)
                                }
                            }.buttonStyle(.plain).accessibilityAddTraits(on ? .isSelected : [])
                        }
                    }
                }
                Button { store.go(.search) } label: { Image(systemName: "magnifyingglass").font(.system(size: 20, weight: .semibold)).frame(width: 44, height: 44) }
                    .accessibilityLabel("Search")
            }
            .padding(.leading, 16).padding(.trailing, 4).padding(.vertical, 8)
            switch store.homeTab {
            case .forYou: ForYou()
            case .rankings: Rankings()
            case .new: NewReleases()
            case .genres: Genres()
            }
            Spacer(minLength: 0)
        }
    }
}

struct SectionHead: View {
    let title: String
    var link: String? = nil
    var flame = false
    var onLink: () -> Void = {}
    var body: some View {
        HStack(spacing: 4) {
            if flame { Image(systemName: "flame.fill").foregroundStyle(C.accent) }
            Text(title).font(.system(size: 18, weight: .heavy))
            Spacer()
            if let link { Button(link, action: onLink).font(.system(size: 13)).foregroundStyle(C.text3) }
        }.padding(.horizontal, 16).padding(.bottom, 12)
    }
}

private func loadHome(_ store: AppStore) async throws -> Home { try await store.api.get("/home") }

struct ForYou: View {
    @Environment(AppStore.self) private var store
    var body: some View {
        Loaded("home", fetch: { try await loadHome(store) }) { h, _ in
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 24) {
                    HeroBanner(items: store.pick(h.banner), hot: h.hot)
                    let cont = (store.me?.progress ?? [:]).sorted { $0.value.updated > $1.value.updated }
                        .compactMap { kv in store.drama(kv.key).flatMap { $0.published ? ($0, kv.value.ep) : nil } }
                    if !cont.isEmpty {
                        VStack(alignment: .leading, spacing: 0) {
                            SectionHead(title: "Continue watching", link: "See all") { store.go(.history) }
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(alignment: .top, spacing: 10) {
                                    ForEach(cont, id: \.0.id) { d, ep in
                                        PosterCard(d: d, sub: "EP \(ep) / \(d.episodes)", progress: Double(ep) / Double(max(1, d.episodes)), badge: false) { store.go(.watch(d.id, ep)) }.frame(width: 112)
                                    }
                                }.padding(.horizontal, 16)
                            }
                        }
                    }
                    let trending = store.pick(h.trending)
                    if !trending.isEmpty {
                        VStack(alignment: .leading, spacing: 0) {
                            SectionHead(title: "Trending now", link: "Rankings", flame: true) { store.homeTab = .rankings }
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(alignment: .top, spacing: 10) {
                                    ForEach(Array(trending.enumerated()), id: \.element.id) { i, d in
                                        PosterCard(d: d, rank: i + 1) { store.go(.drama(d.id)) }.frame(width: 112)
                                    }
                                }.padding(.horizontal, 16)
                            }
                        }
                    }
                    let picks = store.pick(h.picks)
                    if !picks.isEmpty {
                        VStack(alignment: .leading, spacing: 0) {
                            SectionHead(title: "Picked for you")
                            PosterGrid(items: picks) { store.go(.drama($0.id)) }
                        }
                    }
                }.padding(.bottom, 24)
            }
        }
    }
}

struct HeroBanner: View {
    @Environment(AppStore.self) private var store
    let items: [Drama]
    let hot: [String]
    @State private var page = 0

    var body: some View {
        if !items.isEmpty {
            VStack(spacing: 8) {
                TabView(selection: $page) {
                    ForEach(Array(items.enumerated()), id: \.element.id) { i, d in
                        slide(d).tag(i).padding(.horizontal, 16)
                    }
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
                .frame(height: 200)
                if items.count > 1 {
                    HStack(spacing: 6) {
                        ForEach(items.indices, id: \.self) { i in Capsule().fill(i == page ? C.red : C.surface2).frame(width: i == page ? 16 : 6, height: 6) }
                    }
                }
            }
            .task(id: items.count) {
                while items.count > 1 {
                    try? await Task.sleep(for: .seconds(5))
                    if Task.isCancelled { break }
                    withAnimation { page = (page + 1) % items.count }
                }
            }
        }
    }

    private func slide(_ d: Drama) -> some View {
        let rank = hot.firstIndex(of: d.id)
        let tag = d.status == "Scheduled" ? "Coming soon" : (rank.map { $0 < 10 ? "#\($0 + 1) trending this week" : "Featured" } ?? "Featured")
        return Button { store.go(.drama(d.id)) } label: {
            ZStack(alignment: .bottom) {
                Color(hex: d.color)
                if !d.banner.isEmpty, let u = store.api.url(d.banner) {
                    AsyncImage(url: u) { $0.resizable().scaledToFill() } placeholder: { Color.clear }
                } else {
                    GeometryReader { g in Circle().fill(Color(hex: d.color2)).frame(width: g.size.width * 0.8).offset(x: g.size.width * 0.45, y: -g.size.height * 0.5) }
                }
                HStack(alignment: .bottom, spacing: 12) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(tag).font(.system(size: 12, weight: .bold)).foregroundStyle(C.warn)
                        Text(d.title).font(.system(size: 20, weight: .heavy)).lineLimit(2).multilineTextAlignment(.leading)
                        Text((Array(d.genres.prefix(2)) + (d.episodes > 0 ? ["\(d.episodes) episodes"] : [])).joined(separator: " · ")).font(.system(size: 13)).foregroundStyle(Color(hex: "#D7D0DA")).lineLimit(1)
                    }.frame(maxWidth: .infinity, alignment: .leading)
                    Text(d.status == "Scheduled" ? "Details" : "▶ Play").font(.system(size: 13, weight: .bold)).padding(.horizontal, 14).frame(minHeight: 36).background(C.primary, in: Capsule())
                }
                .padding(16).background(Color(hex: "#0F0C11").opacity(0.55))
            }
            .foregroundStyle(.white)
            .clipShape(RoundedRectangle(cornerRadius: 16))
        }.buttonStyle(.plain)
    }
}

private let rankingTabs = ["Hot", "Rising", "Most saved", "Completed"]
private let medal = [Color(hex: "#F2C46D"), Color(hex: "#C9CED6"), Color(hex: "#D89A6A")]

struct Rankings: View {
    @Environment(AppStore.self) private var store
    @State private var tab = "Hot"
    var body: some View {
        VStack(spacing: 0) {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) { ForEach(rankingTabs, id: \.self) { t in ChipBtn(title: t, selected: tab == t) { tab = t } } }.padding(.horizontal, 16).padding(.vertical, 6)
            }
            Loaded("rankings", fetch: { try await store.api.get("/rankings", as: [String: [String]].self) }) { rk, _ in
                let rows = store.pick(rk[tab] ?? [])
                if rows.isEmpty { EmptyState(title: "Nothing ranked yet", message: "Rankings fill up as people watch.") }
                ScrollView {
                    LazyVStack(spacing: 0) {
                        ForEach(Array(rows.enumerated()), id: \.element.id) { i, d in
                            HStack(spacing: 12) {
                                Text("\(i + 1)").font(.system(size: 22, weight: .black)).italic().foregroundStyle(i < 3 ? medal[i] : Color(hex: "#6E6874")).frame(width: 26)
                                Poster(d: d, showEps: false, badge: false).frame(width: 66)
                                VStack(alignment: .leading, spacing: 6) {
                                    Text(d.title).font(.system(size: 15, weight: .bold)).lineLimit(2)
                                    Text((Array(d.genres.prefix(2)) + ["\(d.episodes) EP"]).joined(separator: " · ")).font(.system(size: 12)).foregroundStyle(C.text3)
                                    if !d.badge.isEmpty { Text(d.badge).font(.system(size: 12, weight: .semibold)).foregroundStyle(C.warn) }
                                }.frame(maxWidth: .infinity, alignment: .leading)
                                Button { store.go(.watch(d.id, nil)) } label: { Image(systemName: "play.fill").foregroundStyle(C.accent).frame(width: 44, height: 44).background(C.accentSoft, in: Circle()) }
                                    .accessibilityLabel("Play \(d.title)")
                            }
                            .padding(.vertical, 10).contentShape(Rectangle()).onTapGesture { store.go(.drama(d.id)) }
                            Divider().overlay(C.surface)
                        }
                    }.padding(.horizontal, 16)
                }
            }
        }
    }
}

struct NewReleases: View {
    @Environment(AppStore.self) private var store
    var body: some View {
        Loaded("home", fetch: { try await loadHome(store) }) { h, _ in
            let soon = store.pick(h.soon).filter { $0.status == "Scheduled" }
            let recent = Array(store.published.sorted { $0.releaseAt > $1.releaseAt }.prefix(9))
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    if !soon.isEmpty {
                        VStack(alignment: .leading, spacing: 0) {
                            SectionHead(title: "Coming soon")
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(alignment: .top, spacing: 12) {
                                    ForEach(soon) { d in
                                        let on = store.me?.reminders.contains(d.id) ?? false
                                        HStack(alignment: .top, spacing: 12) {
                                            Poster(d: d, showEps: false, badge: false).frame(width: 84).onTapGesture { store.go(.drama(d.id)) }
                                            VStack(alignment: .leading, spacing: 6) {
                                                Text("Out \(fmtStamp(d.releaseAt))").font(.system(size: 12, weight: .bold)).foregroundStyle(C.warn)
                                                Text(d.title).font(.system(size: 15, weight: .bold)).lineLimit(3)
                                                Btn(on ? "Reminder set" : "Remind me", kind: on ? .secondary : .primary, small: true) {
                                                    store.act { try await store.toggle("reminders", d.id); store.show(on ? "Reminder removed" : "We'll remind you on premiere day") }
                                                }
                                            }
                                        }.frame(width: 260, alignment: .leading)
                                    }
                                }.padding(.horizontal, 16)
                            }
                        }
                    }
                    VStack(alignment: .leading, spacing: 0) {
                        SectionHead(title: "Out recently")
                        PosterGrid(items: recent.map { var x = $0; x.badge = "New"; return x }, sub: { fmtDate($0.releaseAt) }) { store.go(.drama($0.id)) }
                    }
                }.padding(.bottom, 24)
            }
        }
    }
}

struct Genres: View {
    @Environment(AppStore.self) private var store
    @State private var genre = "All"
    @State private var status = "All"
    @State private var sort = "Popular"
    @State private var hot: [String] = []

    var body: some View {
        let used = Set(store.published.flatMap(\.genres))
        let genres = ["All"] + (store.config?.genres ?? []).filter { used.contains($0) }
        let items = store.published
            .filter { genre == "All" || $0.genres.contains(genre) }
            .filter { status == "All" || (status == "Completed") == $0.completed }
            .sorted { a, b in
                switch sort {
                case "Newest": return a.releaseAt > b.releaseAt
                case "Most episodes": return a.episodes > b.episodes
                default: return (hot.firstIndex(of: a.id) ?? .max) < (hot.firstIndex(of: b.id) ?? .max)
                }
            }
        ScrollView {
            VStack(alignment: .leading, spacing: 8) {
                chips(genres, $genre)
                chips(["All", "Completed", "Ongoing"], $status)
                chips(["Popular", "Newest", "Most episodes"], $sort)
            }.padding(.top, 6).padding(.bottom, 16)
            if items.isEmpty { EmptyState(title: "Nothing here yet", message: "No dramas match these filters. Try another one.") }
            else { PosterGrid(items: items, badge: false) { store.go(.drama($0.id)) }.padding(.bottom, 24) }
        }
        .task { hot = (try? await store.api.get("/rankings", as: [String: [String]].self))?["Hot"] ?? [] }
    }

    private func chips(_ opts: [String], _ value: Binding<String>) -> some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) { ForEach(opts, id: \.self) { o in ChipBtn(title: o, selected: value.wrappedValue == o, soft: true) { value.wrappedValue = o } } }.padding(.horizontal, 16)
        }
    }
}

// MARK: Search

struct SearchScreen: View {
    @Environment(AppStore.self) private var store
    @State private var text = ""
    @State private var query = ""
    @State private var recent: [String] = UserDefaults.standard.stringArray(forKey: "recent-searches") ?? []
    @FocusState private var focused: Bool

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: 4) {
                Button { store.back() } label: { Image(systemName: "chevron.left").font(.system(size: 20, weight: .semibold)).frame(width: 44, height: 44) }.accessibilityLabel("Back")
                HStack(spacing: 8) {
                    Image(systemName: "magnifyingglass").foregroundStyle(C.text3)
                    TextField("Search dramas, genres", text: $text).focused($focused).submitLabel(.search).onSubmit { run(text) }
                        .onChange(of: text) { _, v in if v.isEmpty { query = "" } }
                }.padding(.horizontal, 14).frame(minHeight: 44).background(C.surface, in: Capsule())
                Btn("Search", kind: .ghost, small: true) { run(text) }
            }.padding(.horizontal, 4).padding(.vertical, 6)

            if query.isEmpty {
                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        if !recent.isEmpty {
                            VStack(alignment: .leading, spacing: 8) {
                                HStack {
                                    Text("Recent").font(.system(size: 16, weight: .heavy))
                                    Spacer()
                                    Button { recent = []; UserDefaults.standard.removeObject(forKey: "recent-searches") } label: { Image(systemName: "trash").foregroundStyle(C.text3) }
                                        .accessibilityLabel("Clear recent searches")
                                }
                                ScrollView(.horizontal, showsIndicators: false) { HStack(spacing: 8) { ForEach(recent, id: \.self) { r in ChipBtn(title: r, selected: false) { run(r) } } } }
                            }
                        }
                        Loaded("trending", fetch: { try await store.api.get("/search/trending", as: [String].self) }) { t, _ in
                            if !t.isEmpty {
                                VStack(alignment: .leading, spacing: 6) {
                                    Label("Trending searches", systemImage: "flame.fill").font(.system(size: 16, weight: .heavy)).labelStyle(TintedLabel())
                                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], alignment: .leading, spacing: 0) {
                                        ForEach(Array(t.enumerated()), id: \.offset) { i, q in
                                            Button { run(q) } label: {
                                                HStack(spacing: 8) {
                                                    Text("\(i + 1)").font(.system(size: 14, weight: .black)).italic().foregroundStyle(i < 3 ? [C.accent, Color(hex: "#FF8A5C"), C.warn][i] : C.text3)
                                                    Text(q).font(.system(size: 14)).lineLimit(1)
                                                }.frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                                            }.buttonStyle(.plain)
                                        }
                                    }
                                }
                            }
                        }
                    }.padding(16)
                }
            } else {
                Loaded("search:\(query)", fetch: { try await store.api.get("/search?q=" + (query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""), as: SearchResult.self) }) { r, _ in
                    let list = store.pick(r.results)
                    ScrollView {
                        if list.isEmpty {
                            EmptyState(icon: "magnifyingglass", title: "No dramas found", message: "Try a shorter title or a genre like Romance.", muted: true)
                        } else {
                            LazyVStack(alignment: .leading, spacing: 0) {
                                Text("\(list.count) \(list.count == 1 ? "drama" : "dramas")").font(.system(size: 13)).foregroundStyle(C.text3)
                                ForEach(list) { d in
                                    HStack(alignment: .top, spacing: 12) {
                                        Poster(d: d, showEps: false, badge: false).frame(width: 84)
                                        VStack(alignment: .leading, spacing: 6) {
                                            Text(d.title).font(.system(size: 15, weight: .bold)).lineLimit(2)
                                            Text((Array(d.genres.prefix(2)) + ["\(d.episodes) EP"]).joined(separator: " · ")).font(.system(size: 12)).foregroundStyle(C.text3)
                                            if !d.synopsis.isEmpty { Text(d.synopsis).font(.system(size: 13)).foregroundStyle(C.text2).lineLimit(2) }
                                        }.frame(maxWidth: .infinity, alignment: .leading)
                                        Btn("Watch", small: true) { store.go(.watch(d.id, nil)) }.frame(maxHeight: .infinity)
                                    }
                                    .padding(.vertical, 12).contentShape(Rectangle()).onTapGesture { store.go(.drama(d.id)) }
                                    Divider().overlay(C.surface)
                                }
                            }.padding(16)
                        }
                    }
                }
            }
        }
        .onAppear { focused = true }
    }

    private func run(_ q: String) {
        let v = q.trimmingCharacters(in: .whitespaces)
        text = v; query = v
        focused = false
        guard !v.isEmpty else { return }
        recent = Array(([v] + recent.filter { $0.lowercased() != v.lowercased() }).prefix(8))
        UserDefaults.standard.set(recent, forKey: "recent-searches")
    }
}

struct TintedLabel: LabelStyle {
    func makeBody(configuration: Configuration) -> some View {
        HStack(spacing: 4) { configuration.icon.foregroundStyle(C.accent); configuration.title }
    }
}

// MARK: Shorts

struct ShortsScreen: View {
    @Environment(AppStore.self) private var store
    var body: some View {
        Loaded("home", fetch: { try await loadHome(store) }) { h, _ in
            let ids = h.hot + store.published.map(\.id)
            var seen = Set<String>()
            let items = store.pick(ids.filter { seen.insert($0).inserted }).filter { $0.published && $0.episodes > 0 }
            GeometryReader { g in
                ScrollView(.vertical) {
                    LazyVStack(spacing: 0) {
                        ForEach(items) { d in Clip(d: d).frame(width: g.size.width, height: g.size.height) }
                    }.scrollTargetLayout()
                }
                .scrollTargetBehavior(.paging)
                .scrollIndicators(.hidden)
            }
            .ignoresSafeArea(edges: .top)
        }
    }
}

private struct Clip: View {
    @Environment(AppStore.self) private var store
    let d: Drama
    var body: some View {
        let liked = store.me?.liked.contains(d.id) ?? false
        let saved = store.me?.saved.contains(d.id) ?? false
        ZStack(alignment: .bottom) {
            Color(hex: d.color)
            let art = d.poster.isEmpty ? d.banner : d.poster
            if !art.isEmpty, let u = store.api.url(art) {
                AsyncImage(url: u) { $0.resizable().scaledToFill() } placeholder: { Color.clear }
            } else {
                GeometryReader { g in
                    Circle().fill(Color(hex: d.color2)).frame(width: g.size.width * 1.1).offset(x: -g.size.width * 0.15, y: g.size.height * 0.25)
                    Circle().fill(Color(hex: d.color2).opacity(0.7)).frame(width: g.size.width * 0.56).offset(x: g.size.width * 0.55, y: g.size.height * 0.05)
                }
            }
            LinearGradient(colors: [.clear, .black.opacity(0.55)], startPoint: .center, endPoint: .bottom)
            HStack(alignment: .bottom) {
                VStack(alignment: .leading, spacing: 6) {
                    Text(d.title).font(.system(size: 17, weight: .heavy))
                    if !d.synopsis.isEmpty { Text(d.synopsis).font(.system(size: 14)).foregroundStyle(Color(hex: "#E6E0E8")).lineLimit(2) }
                    HStack(spacing: 6) { ForEach(d.genres.prefix(2), id: \.self) { Text($0).font(.system(size: 12)).padding(.horizontal, 8).padding(.vertical, 3).background(.white.opacity(0.16), in: RoundedRectangle(cornerRadius: 6)) } }
                }.frame(maxWidth: .infinity, alignment: .leading)
                VStack(spacing: 16) {
                    Poster(d: d, showEps: false, badge: false).frame(width: 46).overlay(RoundedRectangle(cornerRadius: 10).stroke(.white, lineWidth: 2)).onTapGesture { store.go(.drama(d.id)) }
                    RailButton(icon: liked ? "heart.fill" : "heart", label: liked ? "Liked" : "Like", tint: liked ? C.red : .white) { store.act { try await store.toggle("liked", d.id) } }
                    RailButton(icon: saved ? "bookmark.fill" : "bookmark", label: saved ? "Saved" : "Save", tint: saved ? C.warn : .white) {
                        store.act { try await store.toggle("saved", d.id); store.show(saved ? "Removed from My List" : "Saved to My List") }
                    }
                    RailButton(icon: "square.grid.2x2", label: "Episodes") { store.go(.drama(d.id)) }
                    ShareLink(item: shareURL(store, d), message: Text("Watch \(d.title) on The Ending")) {
                        VStack(spacing: 2) { Image(systemName: "square.and.arrow.up").font(.system(size: 26)); Text("Share").font(.system(size: 12, weight: .semibold)) }.foregroundStyle(.white)
                    }
                }
            }
            .padding(.horizontal, 16).padding(.bottom, 64)
            Button { store.go(.watch(d.id, 1)) } label: {
                HStack(spacing: 8) {
                    Image(systemName: "play.rectangle").font(.system(size: 14))
                    Text("Watch full series · \(d.episodes) episodes").font(.system(size: 13, weight: .semibold)).frame(maxWidth: .infinity, alignment: .leading)
                    Text("EP 1 ›").font(.system(size: 13, weight: .bold)).foregroundStyle(C.accent)
                }.padding(.horizontal, 16).frame(minHeight: 48).background(Color(hex: "#0F0C11").opacity(0.92))
            }.buttonStyle(.plain)
        }
        .foregroundStyle(.white)
        .clipped()
    }
}

struct RailButton: View {
    let icon: String
    let label: String
    var tint: Color = .white
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            VStack(spacing: 2) {
                Image(systemName: icon).font(.system(size: 26)).foregroundStyle(tint)
                Text(label).font(.system(size: 12, weight: .semibold)).foregroundStyle(.white)
            }
        }.buttonStyle(.plain)
    }
}

/// Link to the web drama page; signed-in viewers' links carry their invite.
@MainActor
func shareURL(_ store: AppStore, _ d: Drama) -> URL {
    let ref = store.me?.user.signedIn == true ? "?ref=\(store.me!.user.id)" : ""
    return URL(string: "\(store.api.baseURL)/drama/\(d.id)/\(ref)") ?? URL(string: "https://github.com/waynetunmyint/TheEnding")!
}
