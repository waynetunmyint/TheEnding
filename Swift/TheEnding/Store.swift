import Foundation
import Observation
import SwiftUI

/// Every place the app can go. The tab screens live at the root of the navigation stack.
enum Route: Hashable {
    case search, login, email, welcome, store, vip, wallet, inbox, settings, language, notifySettings, help, about, editProfile, deleteAccount, server, history
    case drama(String)
    case watch(String, Int?)
    case code(Challenge)
    case payment(String)
}

enum Tab: String, CaseIterable { case home = "Home", shorts = "Shorts", rewards = "Rewards", myList = "My List", me = "Me" }
enum HomeTab: String, CaseIterable { case forYou = "For You", rankings = "Rankings", new = "New", genres = "Genres" }

@MainActor
@Observable
final class AppStore {
    let api = Api()

    var me: Me?
    var bootError: String?
    var config: AppConfig?
    var dramas: [Drama]?
    /// Bumped after writes so screens that loaded lists (wallet, inbox, home) reload.
    var version = 0

    // Navigation
    var path: [Route] = []
    var tab: Tab = .home
    var homeTab: HomeTab = .forYou
    func go(_ r: Route) { path.append(r) }
    func back() { if !path.isEmpty { path.removeLast() } }
    func reset() { path = [] }
    func openTab(_ t: Tab) { reset(); tab = t }

    // Update prompt: "Later" hides a version for a day.
    var updateSnoozedUntil: [String: Double] = UserDefaults.standard.dictionary(forKey: "update-later") as? [String: Double] ?? [:]
    func snoozeUpdate(_ version: String, for seconds: Double = 86400) {
        updateSnoozedUntil[version] = Date().timeIntervalSince1970 + seconds
        UserDefaults.standard.set(updateSnoozedUntil, forKey: "update-later")
    }

    // Toast
    var toast: String?
    private var toastTask: Task<Void, Never>?
    func show(_ msg: String) {
        toast = msg
        toastTask?.cancel()
        toastTask = Task { try? await Task.sleep(for: .seconds(2.6)); if !Task.isCancelled { toast = nil } }
    }

    /// Runs a write; errors show as a toast.
    func act(_ work: @escaping @MainActor () async throws -> Void) {
        Task { @MainActor in
            do { try await work() } catch { show(error.localizedDescription) }
        }
    }

    func drama(_ id: String) -> Drama? { dramas?.first { $0.id == id } }
    func pick(_ ids: [String]) -> [Drama] { ids.compactMap { drama($0) } }
    var published: [Drama] { (dramas ?? []).filter(\.published) }

    // MARK: Boot

    func boot() async {
        bootError = nil
        do {
            do {
                me = try await api.get("/me")
            } catch let e as ApiError where e.status == 401 {
                me = try await api.send("POST", "/auth/guest")
            }
            config = try await api.get("/config")
            dramas = try await api.get("/dramas")
        } catch {
            bootError = error.localizedDescription
        }
    }

    func refreshCatalog() async throws {
        config = try await api.get("/config")
        dramas = try await api.get("/dramas")
        version += 1
    }

    @discardableResult
    private func run(_ method: String, _ path: String, _ body: [String: Any]? = nil) async throws -> Me {
        let m: Me = try await api.send(method, path, body)
        me = m
        version += 1
        return m
    }

    func refreshMe() async throws { try await run("GET", "/me") }

    // MARK: Account

    @discardableResult func signInWithGoogle() async throws -> Me { try await run("POST", "/auth/google", ["ref": 0]) }

    func startEmail(_ email: String) async throws -> Challenge {
        try await api.send("POST", "/auth/email/start", ["email": email])
    }

    @discardableResult func verifyEmail(_ id: String, _ code: String) async throws -> Me {
        try await run("POST", "/auth/email/verify", ["challengeId": id, "code": code, "ref": 0])
    }

    func signOut() async throws {
        try await api.raw("POST", "/auth/logout")
        me = nil
        await boot()
        version += 1
    }

    func deleteAccount() async throws {
        try await api.raw("DELETE", "/me", ["confirm": "DELETE"])
        me = nil
        await boot()
        version += 1
    }

    @discardableResult func updateMe(_ body: [String: Any]) async throws -> Me { try await run("PATCH", "/me", body) }

    func setSettings(_ s: UserSettings) async throws {
        me?.settings = s // instant switch; the server's answer replaces it
        try await updateMe(["settings": s.json])
    }

    func setNotify(_ n: NotifyPrefs) async throws {
        me?.notify = n
        try await updateMe(["notify": n.json])
    }

    func changeServer(_ url: String) {
        api.clearSession()
        api.baseURL = url
        me = nil; config = nil; dramas = nil
        reset()
        Task { await boot() }
    }

    // MARK: Lists, progress, coins

    func toggle(_ kind: String, _ dramaId: String) async throws {
        guard let m = me else { return }
        let list = kind == "saved" ? m.saved : kind == "liked" ? m.liked : m.reminders
        try await run(list.contains(dramaId) ? "DELETE" : "PUT", "/me/\(kind)/\(dramaId)")
    }

    func setProgress(_ dramaId: String, _ ep: Int) async throws { try await run("POST", "/me/progress", ["dramaId": dramaId, "ep": ep]) }
    func reportWatch(_ seconds: Int) async throws { try await api.raw("POST", "/me/watch", ["seconds": seconds]) }
    func clearHistory() async throws { try await run("DELETE", "/me/history") }
    func unlock(_ dramaId: String, _ ep: Int) async throws { try await run("POST", "/unlock", ["dramaId": dramaId, "ep": ep]) }
    func startAd(_ purpose: String, _ dramaId: String = "", _ ep: Int = 0) async throws -> AdTicket {
        try await api.send("POST", "/ads/start", ["purpose": purpose, "dramaId": dramaId, "ep": ep])
    }
    func completeAd(_ ticket: String) async throws { try await run("POST", "/ads/complete", ["ticket": ticket]) }

    func checkIn() async throws -> (Int, Int) {
        let r: CheckinResult = try await api.send("POST", "/checkin")
        me = r.me
        version += 1
        return (r.amount, r.vipBonus)
    }

    func claimTask(_ key: String) async throws { try await run("POST", "/tasks/\(key)/claim") }
    func cancelVip() async throws { try await run("POST", "/me/vip/cancel") }

    func buy(_ productId: String, outcome: String) async throws -> Payment {
        struct Order: Codable { let order: String }
        let o: Order = try await api.send("POST", "/payments", ["productId": productId])
        let r: PaymentResult = try await api.send("POST", "/payments/\(o.order)/complete", ["outcome": outcome])
        me = r.me
        version += 1
        return r.payment
    }
}

/// Loads data for a screen when it appears and whenever the store's version changes;
/// keeps showing old data while reloading.
struct Loaded<T, Content: View>: View {
    let key: String
    let fetch: () async throws -> T
    @ViewBuilder let content: (T, @escaping () -> Void) -> Content
    @Environment(AppStore.self) private var store
    @State private var data: T?
    @State private var error: String?
    @State private var attempt = 0

    init(_ key: String, fetch: @escaping () async throws -> T, @ViewBuilder content: @escaping (T, @escaping () -> Void) -> Content) {
        self.key = key
        self.fetch = fetch
        self.content = content
    }

    var body: some View {
        Group {
            if let data { content(data, reload) }
            else if let error { ErrorState(message: error, retry: reload) }
            else { LoadingView() }
        }
        .task(id: "\(key)|\(store.version)|\(attempt)") {
            do {
                data = try await fetch()
                error = nil
            } catch is CancellationError {
            } catch {
                if data == nil { self.error = error.localizedDescription }
            }
        }
    }

    private func reload() { error = nil; attempt += 1 }
}
