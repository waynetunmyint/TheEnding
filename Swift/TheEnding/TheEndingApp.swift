import SwiftUI
import UserNotifications

@main
struct TheEndingApp: App {
    @State private var store = AppStore()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environment(store)
                .preferredColorScheme(.dark)
                .tint(C.accent)
        }
    }
}

struct RootView: View {
    @Environment(AppStore.self) private var store
    @Environment(\.scenePhase) private var phase

    var body: some View {
        @Bindable var store = store
        ZStack {
            C.bg.ignoresSafeArea()
            if let me = store.me {
                if store.config?.maintenance == true && me.user.role.isEmpty {
                    Maintenance()
                } else {
                    NavigationStack(path: $store.path) {
                        Tabs()
                            .toolbar(.hidden, for: .navigationBar)
                            .navigationDestination(for: Route.self) { route in
                                screen(route).toolbar(.hidden, for: .navigationBar).background(C.bg.ignoresSafeArea())
                            }
                    }
                    NotifyOptIn()
                    UpdateDialog()
                }
            } else if let error = store.bootError {
                BootError(message: error)
            } else {
                Splash()
            }
            if let t = store.toast {
                VStack {
                    Spacer()
                    Text(t).font(.system(size: 14, weight: .bold)).foregroundStyle(C.bg).multilineTextAlignment(.center)
                        .padding(.horizontal, 18).padding(.vertical, 10).background(.white, in: Capsule()).padding(.horizontal, 24).padding(.bottom, 120)
                }.allowsHitTesting(false).transition(.opacity)
            }
        }
        .foregroundStyle(C.text)
        .task {
            await store.boot()
            #if DEBUG
            if UAT.enabled { await UAT.run(store) }
            #endif
        }
        // Subscription state and coins refresh whenever the app comes back to the foreground.
        .onChange(of: phase) { _, p in if p == .active, store.me != nil { store.act { try await store.refreshMe() } } }
    }

    @ViewBuilder
    private func screen(_ route: Route) -> some View {
        switch route {
        case .search: SearchScreen()
        case .drama(let id): DramaScreen(id: id)
        case .watch(let id, let ep): PlayerScreen(id: id, requested: ep)
        case .login: LoginScreen()
        case .email: EmailScreen()
        case .code(let c): CodeScreen(start: c)
        case .welcome: WelcomeScreen()
        case .store: StoreScreen()
        case .vip: VipScreen()
        case .payment(let id): PaymentScreen(productId: id)
        case .wallet: WalletScreen()
        case .inbox: InboxScreen()
        case .settings: SettingsScreen()
        case .language: LanguageScreen()
        case .notifySettings: NotifySettingsScreen()
        case .help: HelpScreen()
        case .about: AboutScreen()
        case .editProfile: EditProfileScreen()
        case .deleteAccount: DeleteAccountScreen()
        case .server: ServerScreen()
        case .history: MyListScreen(history: true, standalone: true)
        }
    }
}

struct Tabs: View {
    @Environment(AppStore.self) private var store
    var body: some View {
        Group {
            switch store.tab {
            case .home: HomeScreen()
            case .shorts: ShortsScreen()
            case .rewards: RewardsScreen()
            case .myList: MyListScreen(history: false)
            case .me: MeScreen()
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        // The subscription bar rides on top of the tab bar and never scrolls with the content.
        .safeAreaInset(edge: .bottom, spacing: 0) {
            VStack(spacing: 0) {
                SubBar()
                HStack(spacing: 0) {
                    ForEach(Tab.allCases, id: \.self) { t in
                        let on = store.tab == t
                        Button { store.tab = t } label: {
                            VStack(spacing: 3) {
                                Image(systemName: icon(t, on)).font(.system(size: 21))
                                Text(t.rawValue).font(.system(size: 11, weight: .semibold))
                            }
                            .foregroundStyle(on ? C.text : C.text3).frame(maxWidth: .infinity, minHeight: 54).contentShape(Rectangle())
                        }.buttonStyle(.plain).accessibilityAddTraits(on ? .isSelected : [])
                    }
                }
                .background(C.bg)
            }
        }
    }

    private func icon(_ t: Tab, _ on: Bool) -> String {
        switch t {
        case .home: return on ? "house.fill" : "house"
        case .shorts: return on ? "play.rectangle.fill" : "play.rectangle"
        case .rewards: return on ? "gift.fill" : "gift"
        case .myList: return on ? "bookmark.fill" : "bookmark"
        case .me: return on ? "person.fill" : "person"
        }
    }
}

private struct Splash: View {
    var body: some View {
        VStack(spacing: 16) {
            Image("Logo").resizable().scaledToFit().frame(width: 80, height: 112)
            Text("The Endıng").font(.system(size: 30, weight: .black))
            LoadingView()
        }
    }
}

private struct BootError: View {
    @Environment(AppStore.self) private var store
    let message: String
    @State private var editing = false
    var body: some View {
        VStack {
            ErrorState(message: message) { Task { await store.boot() } }
            Btn("Server settings", kind: .ghost) { editing = true }
        }
        .sheet(isPresented: $editing) { ServerScreen().environment(store).presentationBackground(C.bg) }
    }
}

private struct Maintenance: View {
    @Environment(AppStore.self) private var store
    var body: some View {
        VStack(spacing: 10) {
            Image("Logo").resizable().scaledToFit().frame(width: 56, height: 78)
            Text("Back soon").font(.system(size: 24, weight: .heavy))
            Text("The Ending is getting an update. Your coins, list and progress are safe.").foregroundStyle(C.text2).multilineTextAlignment(.center)
            Btn("Try again") { store.act { try await store.refreshCatalog() } }
        }.padding(32)
    }
}

/// Shown once after sign-in, back on the main screens. The system prompt only appears after "Allow".
private struct NotifyOptIn: View {
    @Environment(AppStore.self) private var store
    var body: some View {
        if let me = store.me, me.user.signedIn, !me.notifyPrompted, store.path.isEmpty {
            DialogCard(dismiss: { finish(false) }) {
                Image(systemName: "bell.fill").font(.system(size: 28)).foregroundStyle(C.accent).frame(width: 64, height: 64).background(C.accentSoft, in: Circle())
                Text("Never miss the next episode").font(.system(size: 20, weight: .heavy))
                Text("We'll tell you when new episodes of dramas you follow drop, and when your daily coins are ready.").foregroundStyle(C.text2)
                Btn("Allow", full: true) {
                    Task {
                        let granted = (try? await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound])) ?? false
                        finish(granted)
                    }
                }
                Btn("Not now", kind: .ghost, full: true) { finish(false) }
            }
        }
    }

    private func finish(_ granted: Bool) {
        store.act {
            if granted, store.me?.tasks.contains(where: { $0.key == "notify" && $0.claimable }) == true { try await store.claimTask("notify") }
            try await store.updateMe(["notifyPrompted": true])
        }
    }
}

/// Update prompt driven by the admin panel's iOS versions: below the minimum it can't be
/// dismissed; below the latest, "Later" hides it for this version for a day.
private struct UpdateDialog: View {
    @Environment(AppStore.self) private var store
    @Environment(\.openURL) private var openURL

    var body: some View {
        if let cfg = store.config {
            let current = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "1.0.0"
            let required = !cfg.versions.iosMin.isEmpty && compareVersions(current, cfg.versions.iosMin) < 0
            let available = !cfg.versions.iosLatest.isEmpty && compareVersions(current, cfg.versions.iosLatest) < 0
            let snoozed = (store.updateSnoozedUntil[cfg.versions.iosLatest] ?? 0) > Date().timeIntervalSince1970
            if required || (available && !snoozed) {
                DialogCard(dismiss: nil) {
                    Image("Logo").resizable().scaledToFit().frame(width: 48, height: 67)
                    Text(required ? "Update required" : "A new version is ready").font(.system(size: 20, weight: .heavy))
                    Text(required ? "This version of The Ending is no longer supported. Update to keep watching." : "Version \(cfg.versions.iosLatest) brings fixes and improvements.").foregroundStyle(C.text2)
                    Btn("Update now", full: true) { if let u = URL(string: "https://apps.apple.com/") { openURL(u) } }
                    if !required {
                        Btn("Later", kind: .ghost, full: true) { store.snoozeUpdate(cfg.versions.iosLatest) }
                    }
                }
            }
        }
    }
}
