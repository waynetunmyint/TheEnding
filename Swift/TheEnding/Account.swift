import SwiftUI
import UserNotifications

// MARK: Sign-in

struct LoginScreen: View {
    @Environment(AppStore.self) private var store
    @State private var busy = false
    var body: some View {
        VStack {
            HStack { Spacer(); Btn("Not now", kind: .ghost, small: true) { store.back() } }
            Spacer()
            VStack(spacing: 16) {
                Image("Logo").resizable().scaledToFit().frame(width: 80, height: 112).accessibilityLabel("The Ending logo")
                Text("The Endıng").font(.system(size: 30, weight: .black))
                Text("Sign in to save your progress, collect coins and continue on any device.").foregroundStyle(C.text2).multilineTextAlignment(.center)
            }
            Spacer()
            VStack(spacing: 12) {
                Btn("Continue with Google", kind: .light, full: true, enabled: !busy, icon: AnyView(Text("G").font(.system(size: 18, weight: .black)).foregroundStyle(Color(hex: "#4285F4")))) {
                    busy = true
                    store.act {
                        defer { busy = false }
                        let me = try await store.signInWithGoogle()
                        store.reset(); store.tab = .home
                        if !me.onboarded { store.go(.welcome) }
                    }
                }
                // Sign in with Apple appears here once the project has Apple sign-in configured.
                Btn("Continue with email", kind: .secondary, full: true, icon: AnyView(Image(systemName: "envelope"))) { store.go(.email) }
                Text("Demo sign-in: Google is simulated and makes a new account each time. Use email to come back to the same account. By continuing you agree to our Terms and Privacy Policy.")
                    .font(.system(size: 12)).foregroundStyle(C.text3).multilineTextAlignment(.center)
            }
        }.padding(.horizontal, 24).padding(.vertical, 16)
    }
}

struct EmailScreen: View {
    @Environment(AppStore.self) private var store
    @State private var email = ""
    @State private var busy = false
    @State private var error: String?
    var body: some View {
        let valid = email.trimmingCharacters(in: .whitespaces).range(of: #"^[^\s@]+@[^\s@]+\.[^\s@]+$"#, options: .regularExpression) != nil
        VStack(alignment: .leading, spacing: 8) {
            TopBar(onBack: { store.back() })
            Group {
                Text("Sign in with email").font(.system(size: 28, weight: .heavy))
                Text("We'll send a 6-digit code. No password needed.").foregroundStyle(C.text2).padding(.bottom, 24)
                FieldBox(label: "Email address", text: $email, placeholder: "you@example.com", keyboard: .emailAddress)
                if let error { Text(error).font(.system(size: 13)).foregroundStyle(C.bad) }
                Spacer()
                Btn("Send code", full: true, enabled: valid && !busy) {
                    busy = true; error = nil
                    Task { @MainActor in
                        defer { busy = false }
                        do { store.go(.code(try await store.startEmail(email.trimmingCharacters(in: .whitespaces)))) } catch { self.error = error.localizedDescription }
                    }
                }
                Text("Demo: no email is sent. The code is shown on the next screen and expires in 10 minutes.").font(.system(size: 12)).foregroundStyle(C.text3).frame(maxWidth: .infinity).multilineTextAlignment(.center)
            }.padding(.horizontal, 20)
        }.padding(.bottom, 16)
    }
}

struct CodeScreen: View {
    @Environment(AppStore.self) private var store
    @State var challenge: Challenge
    @State private var code = ""
    @State private var error: String?
    @State private var locked = false
    @State private var busy = false
    @State private var wait = 45

    init(start: Challenge) { _challenge = State(initialValue: start) }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            TopBar(onBack: { store.back() })
            Group {
                Text("Enter the code").font(.system(size: 28, weight: .heavy))
                Text("Sent to \(challenge.email)").foregroundStyle(C.text2).padding(.bottom, 20)
                FieldBox(label: "6-digit code", text: $code, placeholder: "6-digit code", keyboard: .numberPad)
                    .onChange(of: code) { _, v in
                        let digits = String(v.filter(\.isNumber).prefix(6))
                        if digits != v { code = digits }
                        if !locked { error = nil }
                    }
                if let error { Label(error, systemImage: "exclamationmark.circle").font(.system(size: 13)).foregroundStyle(C.bad) }
                if wait > 0 { Text(String(format: "Resend code in 0:%02d", wait)).font(.system(size: 13)).foregroundStyle(C.text3) }
                else {
                    Button("Resend code") {
                        store.act { challenge = try await store.startEmail(challenge.email); wait = 45; locked = false; error = nil; code = "" }
                    }.font(.system(size: 13, weight: .bold)).foregroundStyle(C.accent)
                }
                Text("Demo: no email was sent. Your code is \(challenge.demoCode).").font(.system(size: 12)).foregroundStyle(C.text3)
                Spacer()
                Btn("Verify", full: true, enabled: code.count == 6 && !busy && !locked) {
                    busy = true
                    Task { @MainActor in
                        defer { busy = false }
                        do {
                            let me = try await store.verifyEmail(challenge.challengeId, code)
                            store.reset(); store.tab = .home
                            if !me.onboarded { store.go(.welcome) }
                        } catch let e as ApiError {
                            error = e.message
                            if e.status == 429 || e.status == 410 { locked = true }
                        } catch { self.error = error.localizedDescription }
                    }
                }
            }.padding(.horizontal, 20)
        }
        .padding(.bottom, 16)
        .task(id: wait) { if wait > 0 { try? await Task.sleep(for: .seconds(1)); wait -= 1 } }
    }
}

struct WelcomeScreen: View {
    @Environment(AppStore.self) private var store
    @State private var picked: [String] = ["Romance", "CEO", "Revenge"]
    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack { Spacer(); Btn("Skip", kind: .ghost, small: true) { finish([]) } }
            Text("What do you love to watch?").font(.system(size: 28, weight: .heavy)).padding(.top, 24).padding(.bottom, 8)
            Text("Pick a few. We'll fill your For You feed with stories like these.").foregroundStyle(C.text2).padding(.bottom, 28)
            FlowLayout(spacing: 10) {
                ForEach(store.config?.genres ?? [], id: \.self) { g in
                    let on = picked.contains(g)
                    Button { if on { picked.removeAll { $0 == g } } else { picked.append(g) } } label: {
                        Text(g).font(.system(size: 15, weight: .semibold)).foregroundStyle(on ? .white : Color(hex: "#E6E0E8"))
                            .padding(.horizontal, 18).frame(minHeight: 44).background(on ? C.primary : C.surface, in: Capsule())
                    }.buttonStyle(.plain).accessibilityAddTraits(on ? .isSelected : [])
                }
            }
            Spacer()
            Text("\(picked.count) selected").font(.system(size: 13)).foregroundStyle(C.text3).frame(maxWidth: .infinity).padding(.bottom, 12)
            Btn("Start watching", full: true) { finish(picked) }
        }.padding(20)
    }

    private func finish(_ genres: [String]) {
        store.act { try await store.updateMe(["onboarded": true, "genres": genres]); store.reset() }
    }
}

/// Wraps children onto new lines, like CSS flex-wrap.
struct FlowLayout: Layout {
    var spacing: CGFloat = 8
    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let width = proposal.width ?? .infinity
        var x: CGFloat = 0, y: CGFloat = 0, row: CGFloat = 0
        for s in subviews {
            let size = s.sizeThatFits(.unspecified)
            if x + size.width > width, x > 0 { x = 0; y += row + spacing; row = 0 }
            x += size.width + spacing; row = max(row, size.height)
        }
        return CGSize(width: width == .infinity ? x : width, height: y + row)
    }
    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        var x = bounds.minX, y = bounds.minY, row: CGFloat = 0
        for s in subviews {
            let size = s.sizeThatFits(.unspecified)
            if x + size.width > bounds.maxX, x > bounds.minX { x = bounds.minX; y += row + spacing; row = 0 }
            s.place(at: CGPoint(x: x, y: y), proposal: ProposedViewSize(size))
            x += size.width + spacing; row = max(row, size.height)
        }
    }
}

// MARK: Me

struct MeScreen: View {
    @Environment(AppStore.self) private var store
    var body: some View {
        if let me = store.me {
            let lang = languages.first { $0.code == me.settings.language }?.english ?? "English"
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    if me.user.signedIn {
                        Button { store.go(.editProfile) } label: {
                            HStack(spacing: 14) {
                                Avatar(initial: me.user.initial, color: me.user.color, size: 64)
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(me.user.name).font(.system(size: 20, weight: .bold))
                                    Text("ID \(me.user.id) · \(me.user.via)").font(.system(size: 13)).foregroundStyle(C.text3)
                                }.frame(maxWidth: .infinity, alignment: .leading)
                                Image(systemName: "chevron.right").foregroundStyle(C.text3)
                            }
                        }.buttonStyle(.plain)
                    } else {
                        HStack(spacing: 14) {
                            Image(systemName: "person").font(.system(size: 28)).foregroundStyle(C.text3).frame(width: 64, height: 64).background(C.surface, in: Circle())
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Guest").font(.system(size: 20, weight: .bold))
                                Text("Progress is saved to this device's guest account").font(.system(size: 13)).foregroundStyle(C.text3)
                            }
                        }
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Sign in to keep your coins safe").font(.system(size: 17, weight: .bold))
                            Text("Sync your list and progress across phone and web, and get \(store.config?.tasks["signin"] ?? 30) bonus coins.").font(.system(size: 13)).foregroundStyle(Color(hex: "#D7C3CB"))
                            Btn("Sign in", full: true) { store.go(.login) }
                        }.padding(18).background(C.accentSoft, in: RoundedRectangle(cornerRadius: 16))
                    }
                    HStack(spacing: 10) {
                        Button { store.go(.wallet) } label: {
                            VStack(alignment: .leading, spacing: 6) {
                                Text("Coins").font(.system(size: 13)).foregroundStyle(C.text2)
                                HStack(spacing: 6) { CoinIcon(size: 20); Text("\(me.coins)").font(.system(size: 22, weight: .black)) }
                                Text("Top up ›").font(.system(size: 13, weight: .bold)).foregroundStyle(C.accent)
                            }.padding(14).frame(maxWidth: .infinity, alignment: .leading).background(C.surface, in: RoundedRectangle(cornerRadius: 16))
                        }.buttonStyle(.plain)
                        Button { store.go(.vip) } label: {
                            VStack(alignment: .leading, spacing: 6) {
                                Text("Membership").font(.system(size: 13)).foregroundStyle(Color(hex: "#D9B571"))
                                HStack(spacing: 6) { CrownIcon(size: 20); Text(me.vip ? "VIP" : "Free").font(.system(size: 22, weight: .black)).foregroundStyle(C.gold) }
                                Text(me.vip ? "Until \(fmtDate(me.subscription.until))" : "Join VIP ›").font(.system(size: 13)).foregroundStyle(Color(hex: "#D9B571"))
                            }.padding(14).frame(maxWidth: .infinity, alignment: .leading).background(C.goldBg, in: RoundedRectangle(cornerRadius: 16))
                        }.buttonStyle(.plain)
                    }
                    VStack(spacing: 0) {
                        if me.user.signedIn { ListRow("Notifications", badge: me.unread) { store.go(.inbox) } }
                        ListRow("Coin store") { store.go(.store) }
                        ListRow("Watch history") { store.go(.history) }
                        ListRow("Invite friends", value: "+\(store.config?.tasks["invite"] ?? 50) coins") { store.tab = .rewards }
                        ListRow("Language", value: lang) { store.go(.language) }
                        ListRow("Settings") { store.go(.settings) }
                        ListRow("Help & feedback") { store.go(.help) }
                        ListRow("About") { store.go(.about) }
                    }
                    Text("The admin panel opens on the web at \(store.api.baseURL)/admin/").font(.system(size: 12)).foregroundStyle(C.text3)
                }.padding(16).padding(.top, 8)
            }
        }
    }
}

struct EditProfileScreen: View {
    @Environment(AppStore.self) private var store
    @State private var name = ""
    @State private var confirmOut = false
    var body: some View {
        if let me = store.me {
            let trimmed = name.trimmingCharacters(in: .whitespaces)
            ZStack {
                VStack(spacing: 0) {
                    TopBar(title: "Edit profile", onBack: { store.back() }) {
                        Btn("Save", kind: .ghost, small: true, enabled: !trimmed.isEmpty && trimmed != me.user.name) {
                            store.act { try await store.updateMe(["name": trimmed]); store.show("Profile saved") }
                        }
                    }
                    ScrollView {
                        VStack(alignment: .leading, spacing: 24) {
                            Avatar(initial: trimmed.isEmpty ? me.user.initial : String(trimmed.prefix(1)).uppercased(), color: me.user.color, size: 88).frame(maxWidth: .infinity)
                            VStack(alignment: .leading, spacing: 6) {
                                FieldBox(label: "Display name", text: $name).onChange(of: name) { _, v in if v.count > 30 { name = String(v.prefix(30)) } }
                                Text("Shown on your comments.").font(.system(size: 12)).foregroundStyle(C.text3)
                            }
                            if !me.user.email.isEmpty { FieldBox(label: "Email", text: .constant(me.user.email), disabled: true) }
                            VStack(spacing: 0) {
                                GroupTitle("Sign-in method")
                                ListRow(me.user.via, value: "Connected")
                            }
                            VStack(spacing: 0) {
                                ListRow("Sign out") { confirmOut = true }
                                ListRow("Delete account", color: C.bad) { store.go(.deleteAccount) }
                            }
                        }.padding(16)
                    }
                }
                if confirmOut {
                    DialogCard(dismiss: { confirmOut = false }) {
                        Text("Sign out?").font(.system(size: 20, weight: .heavy))
                        Text("Your coins, VIP and list stay safe in your account. Sign in again any time to get them back.").foregroundStyle(C.text2)
                        Btn("Sign out", kind: .danger, full: true) { confirmOut = false; store.act { try await store.signOut(); store.reset(); store.tab = .me } }
                        Btn("Cancel", kind: .ghost, full: true) { confirmOut = false }
                    }
                }
            }
            .onAppear { if name.isEmpty { name = me.user.name } }
        }
    }
}

struct DeleteAccountScreen: View {
    @Environment(AppStore.self) private var store
    @State private var typed = ""
    @State private var busy = false
    var body: some View {
        if let me = store.me {
            let ok = typed.trimmingCharacters(in: .whitespaces).uppercased() == "DELETE"
            VStack(spacing: 0) {
                TopBar(title: "Delete account", onBack: { store.back() })
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        Text("This permanently deletes your account").font(.system(size: 22, weight: .heavy))
                        ForEach(["Your profile, comments, list and watch history", "\(me.coins) coins and every episode you unlocked",
                                 "Sign-in with \(me.user.via == "Google" ? "Google" : "email") for this account"], id: \.self) { Text("•  \($0)").foregroundStyle(Color(hex: "#D7D0DA")) }
                        if me.vip { BannerRow("VIP is billed by the App Store", subtitle: "Cancel it there first, or it keeps renewing.", bg: C.goldBg, fg: C.gold) }
                        FieldBox(label: "Type DELETE to confirm", text: $typed, placeholder: "DELETE")
                        Btn("Delete my account", kind: .danger, full: true, enabled: ok && !busy) {
                            busy = true
                            store.act { defer { busy = false }; try await store.deleteAccount(); store.reset(); store.tab = .home; store.show("Account deleted") }
                        }
                        Btn("Keep my account", kind: .ghost, full: true) { store.back() }
                        Text("Purchase records are kept for bookkeeping without your name or email.").font(.system(size: 12)).foregroundStyle(C.text3).frame(maxWidth: .infinity).multilineTextAlignment(.center)
                    }.padding(16)
                }
            }
        }
    }
}

// MARK: Inbox

struct InboxScreen: View {
    @Environment(AppStore.self) private var store
    var body: some View {
        VStack(spacing: 0) {
            if store.me?.user.signedIn != true {
                TopBar(title: "Notifications", onBack: { store.back() })
                EmptyState(icon: "person", title: "Sign in to continue", message: "Keep your coins, list and progress safe across phone and web.", actionTitle: "Sign in") { store.go(.login) }
                Spacer()
            } else {
                Loaded("inbox", fetch: { try await store.api.get("/inbox", as: [InboxItem].self) }) { items, _ in
                    TopBar(title: "Notifications", onBack: { store.back() }) {
                        if items.contains(where: { !$0.read }) {
                            Btn("Read all", kind: .ghost, small: true) { store.act { try await store.api.raw("POST", "/inbox/read", ["id": 0]); try await store.refreshMe() } }
                        }
                    }
                    if items.isEmpty {
                        EmptyState(icon: "bell", title: "All caught up", message: "New episodes and rewards will show up here.", muted: true)
                        Spacer()
                    } else {
                        ScrollView {
                            LazyVStack(spacing: 0) {
                                ForEach(items) { n in
                                    Button {
                                        if !n.read { store.act { try await store.api.raw("POST", "/inbox/read", ["id": n.id]); try await store.refreshMe() } }
                                        openHref(store, n.href)
                                    } label: {
                                        HStack(alignment: .top, spacing: 12) {
                                            Group {
                                                switch n.kind {
                                                case "coin": CoinIcon(size: 20)
                                                case "vip": CrownIcon(size: 20)
                                                case "ep": Image(systemName: "play.rectangle").foregroundStyle(C.accent)
                                                default: Image(systemName: "bell").foregroundStyle(C.text2)
                                                }
                                            }.frame(width: 40, height: 40).background(n.kind == "ep" ? C.accentSoft : n.kind == "sys" ? C.surface : C.goldBg, in: Circle())
                                            VStack(alignment: .leading, spacing: 3) {
                                                Text(n.title).font(.system(size: 15, weight: n.read ? .medium : .bold))
                                                if !n.body.isEmpty { Text(n.body).font(.system(size: 13)).foregroundStyle(C.text2) }
                                                Text(fmtStamp(n.at)).font(.system(size: 12)).foregroundStyle(C.text3)
                                            }.frame(maxWidth: .infinity, alignment: .leading)
                                            if !n.read { Circle().fill(C.red).frame(width: 8, height: 8).padding(.top, 6).accessibilityLabel("Unread") }
                                        }.padding(.vertical, 14).multilineTextAlignment(.leading)
                                    }.buttonStyle(.plain)
                                    Divider().overlay(C.surface)
                                }
                                Btn("Clear all", kind: .ghost, full: true) { store.act { try await store.api.raw("DELETE", "/inbox"); try await store.refreshMe() } }.padding(.top, 8)
                            }.padding(.horizontal, 16)
                        }
                    }
                }
            }
        }
    }
}

/// Opens a web path from a notification inside the app when it maps to a screen.
@MainActor
func openHref(_ store: AppStore, _ href: String) {
    let parts = href.split(separator: "?")[0].split(separator: "/").map(String.init)
    let ep = href.range(of: #"ep=(\d+)"#, options: .regularExpression).flatMap { Int(href[$0].dropFirst(3)) }
    switch parts.first {
    case "drama" where parts.count > 1: store.go(.drama(parts[1]))
    case "watch" where parts.count > 1: store.go(.watch(parts[1], ep))
    case "wallet": store.go(.wallet)
    case "vip": store.go(.vip)
    case "rewards": store.openTab(.rewards)
    case "settings": store.go(.settings)
    case "new": store.openTab(.home); store.homeTab = .new
    default: store.openTab(.home)
    }
}

// MARK: Settings

struct SettingsScreen: View {
    @Environment(AppStore.self) private var store
    var body: some View {
        if let me = store.me {
            let s = me.settings
            VStack(spacing: 0) {
                TopBar(title: "Settings", onBack: { store.back() })
                ScrollView {
                    VStack(spacing: 0) {
                        GroupTitle("Playback")
                        Toggle2(label: "Autoplay next episode", isOn: s.autoplay) { v in var x = s; x.autoplay = v; store.act { try await store.setSettings(x) } }
                        Toggle2(label: "Auto-unlock with coins", isOn: s.autoUnlock) { v in var x = s; x.autoUnlock = v; store.act { try await store.setSettings(x) } }
                        Toggle2(label: "Play on mobile data", isOn: s.cellular) { v in var x = s; x.cellular = v; store.act { try await store.setSettings(x) } }
                        GroupTitle("App")
                        ListRow("Language", value: languages.first { $0.code == s.language }?.english) { store.go(.language) }
                        ListRow("Notifications") { store.go(.notifySettings) }
                        ListRow("Server", value: store.api.baseURL.replacingOccurrences(of: "http://", with: "")) { store.go(.server) }
                        ListRow("Clear cache") { URLCache.shared.removeAllCachedResponses(); store.act { try await store.refreshCatalog(); store.show("Cache cleared") } }
                        if me.user.signedIn {
                            GroupTitle("Account")
                            ListRow("Edit profile and sign out") { store.go(.editProfile) }
                            ListRow("Delete account", color: C.bad) { store.go(.deleteAccount) }
                        }
                        GroupTitle("About")
                        ListRow("Terms & privacy") { store.go(.about) }
                        ListRow("Version", value: Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String)
                    }.padding(.horizontal, 16).padding(.bottom, 24)
                }
            }
        }
    }
}

struct LanguageScreen: View {
    @Environment(AppStore.self) private var store
    var body: some View {
        if let me = store.me {
            VStack(spacing: 0) {
                TopBar(title: "Language", onBack: { store.back() })
                ScrollView {
                    VStack(alignment: .leading, spacing: 0) {
                        ForEach(languages, id: \.code) { l in
                            Button { var s = me.settings; s.language = l.code; store.act { try await store.setSettings(s) } } label: {
                                HStack {
                                    VStack(alignment: .leading, spacing: 2) { Text(l.name).font(.system(size: 15, weight: .semibold)); Text(l.english).font(.system(size: 13)).foregroundStyle(C.text3) }
                                    Spacer()
                                    if me.settings.language == l.code { Image(systemName: "checkmark").font(.system(size: 17, weight: .bold)).foregroundStyle(C.accent) }
                                }.frame(minHeight: 60).contentShape(Rectangle())
                            }.buttonStyle(.plain).accessibilityAddTraits(me.settings.language == l.code ? .isSelected : [])
                            Divider().overlay(C.surface)
                        }
                        Text("Subtitles follow this language when the drama offers it. The app interface is in English for now.").font(.system(size: 13)).foregroundStyle(C.text3).padding(.top, 16)
                    }.padding(.horizontal, 16)
                }
            }
        }
    }
}

struct NotifySettingsScreen: View {
    @Environment(AppStore.self) private var store
    @Environment(\.openURL) private var openURL
    @State private var status: UNAuthorizationStatus = .notDetermined

    var body: some View {
        if let me = store.me {
            let n = me.notify
            VStack(spacing: 0) {
                TopBar(title: "Notifications", onBack: { store.back() })
                ScrollView {
                    VStack(alignment: .leading, spacing: 0) {
                        if status == .denied {
                            BannerRow("Notifications are off for The Ending", subtitle: "Allow them in iOS Settings to hear about new episodes. Your in-app inbox keeps working either way.", bg: C.badBg, fg: Color(hex: "#D7C3CB"), action: {
                                if let u = URL(string: UIApplication.openSettingsURLString) { openURL(u) }
                            }).padding(.vertical, 8)
                        } else if status == .notDetermined {
                            Btn("Turn on notifications", full: true) {
                                Task { @MainActor in
                                    let ok = (try? await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound])) ?? false
                                    await refresh()
                                    if ok, me.tasks.contains(where: { $0.key == "notify" && $0.claimable }) { store.act { try await store.claimTask("notify"); store.show("Notifications on · bonus coins added") } }
                                }
                            }.padding(.vertical, 8)
                        }
                        GroupTitle("Notify me about")
                        Toggle2(label: "New episodes", hint: "Dramas in My List", isOn: n.episodes) { v in var x = n; x.episodes = v; save(x) }
                        Toggle2(label: "Premiere reminders", hint: "Dramas you asked to be reminded about", isOn: n.premieres) { v in var x = n; x.premieres = v; save(x) }
                        Toggle2(label: "Replies to my comments", isOn: n.replies) { v in var x = n; x.replies = v; save(x) }
                        Toggle2(label: "Rewards and offers", hint: "Bonus coins and VIP deals", isOn: n.offers) { v in var x = n; x.offers = v; save(x) }
                        GroupTitle("On this device")
                        Toggle2(label: "Daily check-in reminder", hint: "A reminder at 8:00 PM", isOn: n.checkin) { v in var x = n; x.checkin = v; save(x) }
                        Text("Notifications arrive in your inbox under Me › Notifications.").font(.system(size: 13)).foregroundStyle(C.text3).padding(.top, 16)
                    }.padding(.horizontal, 16).padding(.bottom, 24)
                }
            }
            .task { await refresh() }
        }
    }

    private func save(_ n: NotifyPrefs) { store.act { try await store.setNotify(n) } }
    private func refresh() async { status = await UNUserNotificationCenter.current().notificationSettings().authorizationStatus }
}

struct ServerScreen: View {
    @Environment(AppStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @State private var url = ""
    var body: some View {
        let valid = url.hasPrefix("http://") || url.hasPrefix("https://")
        VStack(alignment: .leading, spacing: 16) {
            TopBar(title: "Server", onBack: { store.back(); dismiss() })
            Group {
                FieldBox(label: "The Ending server address", text: $url, placeholder: "http://192.168.1.10:8080", keyboard: .URL)
                Text("The Simulator reaches your Mac at http://127.0.0.1:8080. On an iPhone, use your Mac's Wi-Fi address and start the server with ADDR=0.0.0.0:8080.").font(.system(size: 13)).foregroundStyle(C.text2)
                Btn("Save and reconnect", full: true, enabled: valid) { store.changeServer(url); dismiss() }
                Btn("Use the Simulator default", kind: .ghost, full: true) { url = Api.defaultURL }
                Spacer()
            }.padding(.horizontal, 16)
        }
        .onAppear { if url.isEmpty { url = store.api.baseURL } }
    }
}

// MARK: Help and About

private let faqs = [
    ("How do coins work?", "Most episodes cost 60 coins to unlock, forever. Earn free coins from check-ins, tasks and short ads, or buy them in the Coin Store."),
    ("I paid but didn't get coins", "Open Wallet. If the payment shows as pending, coins arrive when your store confirms it. Still missing? Send us the order number below."),
    ("How do I cancel VIP?", "VIP renews through Google Play or the App Store. Cancel there any time; you keep VIP until the end of the paid period."),
    ("A video won't play", "Try a lower quality in the player menu, check your connection, then restart the app."),
    ("Can I watch on the web?", "Yes. Sign in with the same Google or email account and your list, coins and VIP follow you."),
]
private let topics = ["Payment or coins", "Playback problem", "Account and sign-in", "Something else"]

struct HelpScreen: View {
    @Environment(AppStore.self) private var store
    @State private var open = 0
    @State private var topic = topics[0]
    @State private var msg = ""
    @State private var sent = false
    @State private var busy = false
    var body: some View {
        VStack(spacing: 0) {
            TopBar(title: "Help & feedback", onBack: { store.back() })
            ScrollView {
                VStack(alignment: .leading, spacing: 8) {
                    GroupTitle("Common questions")
                    ForEach(faqs.indices, id: \.self) { i in
                        VStack(alignment: .leading, spacing: 0) {
                            Button { open = open == i ? -1 : i } label: {
                                HStack { Text(faqs[i].0).font(.system(size: 15)); Spacer(); Image(systemName: open == i ? "chevron.up" : "chevron.down").foregroundStyle(C.text3) }.frame(minHeight: 52).contentShape(Rectangle())
                            }.buttonStyle(.plain)
                            if open == i { Text(faqs[i].1).font(.system(size: 13)).foregroundStyle(C.text2).padding(.bottom, 14) }
                            Divider().overlay(C.surface)
                        }
                    }
                    GroupTitle("Still stuck? Write to us")
                    if sent {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Message sent").font(.system(size: 15, weight: .bold))
                            Text("Our support team sees it in the admin panel" + ((store.config?.supportEmail).map { $0.isEmpty ? "" : " and replies from \($0)" } ?? "") + ".").font(.system(size: 13)).foregroundStyle(C.text2)
                            Btn("Write another", kind: .secondary, small: true) { sent = false; msg = "" }
                        }.padding(16).frame(maxWidth: .infinity, alignment: .leading).background(C.surface, in: RoundedRectangle(cornerRadius: 16))
                    } else {
                        FlowLayout(spacing: 8) { ForEach(topics, id: \.self) { t in ChipBtn(title: t, selected: topic == t, soft: true) { topic = t } } }
                        FieldBox(label: "Message", text: $msg, placeholder: "Tell us what happened. Include the drama and episode if it's about playback.", multiline: true)
                            .onChange(of: msg) { _, v in if v.count > 2000 { msg = String(v.prefix(2000)) } }
                        Btn("Send", full: true, enabled: !msg.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !busy) {
                            busy = true
                            store.act { defer { busy = false }; try await store.api.raw("POST", "/help", ["topic": topic, "message": msg.trimmingCharacters(in: .whitespacesAndNewlines)]); sent = true }
                        }
                    }
                }.padding(.horizontal, 16).padding(.bottom, 24)
            }
        }
    }
}

struct AboutScreen: View {
    @Environment(AppStore.self) private var store
    private let sections = [
        ("Terms of Service", "This build of The Ending is a demo. Sign-in, payments and ads are simulated, and the sample dramas, coins and VIP have no real value. Publish your own terms before launch."),
        ("Privacy Policy", "Your account, list, coins, comments and watch history are stored by the server running this copy of The Ending, in its own SQLite database. Nothing is shared with third parties. Delete your account any time from Settings to remove your personal data."),
        ("Coin and VIP terms", "In the store build, unlocked episodes stay unlocked forever, coins do not expire, and VIP renews through Google Play or the App Store until you cancel there."),
        ("Content guidelines", "Comments must be respectful. Spam, spoilers without warning and harassment are hidden by moderators."),
    ]
    var body: some View {
        VStack(spacing: 0) {
            TopBar(title: "About", onBack: { store.back() })
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    VStack(spacing: 12) {
                        Image("Logo").resizable().scaledToFit().frame(width: 72, height: 101).accessibilityLabel("The Ending logo")
                        Text("The Endıng").font(.system(size: 24, weight: .black))
                        Text("iOS \(Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "")").font(.system(size: 13)).foregroundStyle(C.text3)
                    }.frame(maxWidth: .infinity)
                    ForEach(sections, id: \.0) { title, body in
                        VStack(alignment: .leading, spacing: 6) { Text(title).font(.system(size: 16, weight: .heavy)); Text(body).foregroundStyle(C.text2) }
                    }
                    Link("Open source under the MIT License · github.com/waynetunmyint/TheEnding", destination: URL(string: "https://github.com/waynetunmyint/TheEnding")!)
                        .font(.system(size: 13)).foregroundStyle(C.accent).frame(maxWidth: .infinity).multilineTextAlignment(.center)
                }.padding(16)
            }
        }
    }
}
