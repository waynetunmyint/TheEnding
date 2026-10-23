import Foundation

// Shapes returned by the Go API. Times are JavaScript milliseconds.

struct Drama: Codable, Hashable, Identifiable {
    let id: String
    let title: String
    let synopsis: String
    let genres: [String]
    let episodes: Int
    let totalEpisodes: Int
    let freeEpisodes: Int
    let coinsPerEpisode: Int
    let status: String
    let completed: Bool
    let color: String
    let color2: String
    var badge: String
    let releaseAt: Int64
    let poster: String
    let banner: String

    var published: Bool { status == "Published" }
}

struct Episode: Codable, Hashable, Identifiable {
    let n: Int
    let title: String
    let length: Int
    let free: Bool
    let hasVideo: Bool
    var id: Int { n }
}

struct DramaDetail: Codable { let drama: Drama; let episodes: [Episode] }

struct Subscription: Codable, Hashable { let state: String; let plan: String; let until: Int64 }
struct Progress: Codable, Hashable { let ep: Int; let updated: Int64 }
struct RewardTask: Codable, Hashable, Identifiable {
    let key: String; let name: String; let amount: Int; let note: String; let done: Bool; let claimable: Bool
    var id: String { key }
}
struct UserSettings: Codable, Hashable {
    var autoplay: Bool; var autoUnlock: Bool; var cellular: Bool; var language: String
    var json: [String: Any] { ["autoplay": autoplay, "autoUnlock": autoUnlock, "cellular": cellular, "language": language] }
}
struct NotifyPrefs: Codable, Hashable {
    var episodes: Bool; var premieres: Bool; var replies: Bool; var offers: Bool; var checkin: Bool
    var json: [String: Any] { ["episodes": episodes, "premieres": premieres, "replies": replies, "offers": offers, "checkin": checkin] }
}

struct Me: Codable {
    struct User: Codable { let id: Int; var name: String; let initial: String; let email: String; let via: String; let color: String; let role: String; let signedIn: Bool }
    struct Checkin: Codable { let streak: Int; let canCheckIn: Bool; let nextAmount: Int }
    struct Ads: Codable { let left: Int; let limit: Int }

    var user: User
    let coins: Int
    let subscription: Subscription
    var saved: [String]
    var liked: [String]
    var reminders: [String]
    let unlocked: [String: [Int]]
    let progress: [String: Progress]
    let checkin: Checkin
    let ads: Ads
    let tasks: [RewardTask]
    var settings: UserSettings
    var notify: NotifyPrefs
    let notifyPrompted: Bool
    let onboarded: Bool
    let genres: [String]
    let unread: Int
    let muted: Bool

    var vip: Bool { subscription.state == "active" }

    func canWatch(_ dramaId: String, _ ep: Episode?) -> Bool {
        guard let ep else { return false }
        return ep.free || vip || (unlocked[dramaId]?.contains(ep.n) ?? false)
    }
}

struct CoinPack: Codable, Hashable { let id: String; let coins: Int; let bonus: Int; let priceCents: Int; let tag: String }
struct VipPlan: Codable, Hashable { let id: String; let name: String; let priceCents: Int; let days: Int; let note: String; let tag: String }
struct Versions: Codable { let androidMin: String; let androidLatest: String; let iosMin: String; let iosLatest: String }

struct AppConfig: Codable {
    let coinPacks: [CoinPack]
    let vipPlans: [VipPlan]
    let checkin: [Int]
    let adsPerDay: Int
    let tasks: [String: Int]
    let vipBonus: Int
    let coinsPerEpisode: Int
    let supportEmail: String
    let maintenance: Bool
    let versions: Versions
    let genres: [String]
}

struct Home: Codable { let banner: [String]; let trending: [String]; let soon: [String]; let picks: [String]; let hot: [String] }

struct Comment: Codable, Identifiable { let id: Int; let name: String; let initial: String; let color: String; let text: String; let at: Int64; let mine: Bool }
struct InboxItem: Codable, Identifiable { let id: Int; let kind: String; let title: String; let body: String; let href: String; let read: Bool; let at: Int64 }
struct WalletEntry: Codable, Hashable { let what: String; let amount: Int; let at: Int64 }
struct Payment: Codable, Identifiable { let order: String; let item: String; let amountCents: Int; let status: String; let at: Int64; var id: String { order } }
struct PaymentResult: Codable { let payment: Payment; let me: Me }
struct CheckinResult: Codable { let amount: Int; let vipBonus: Int; let me: Me }
struct AdTicket: Codable { let ticket: String; let seconds: Int }
struct Challenge: Codable, Hashable { let challengeId: String; let email: String; let demoCode: String }
struct SearchResult: Codable { let results: [String] }
struct Ok: Codable {}

/// Semantic version compare: negative when a < b.
func compareVersions(_ a: String, _ b: String) -> Int {
    let pa = a.split(separator: ".").map { Int($0) ?? 0 }
    let pb = b.split(separator: ".").map { Int($0) ?? 0 }
    for i in 0..<max(pa.count, pb.count) {
        let d = (i < pa.count ? pa[i] : 0) - (i < pb.count ? pb[i] : 0)
        if d != 0 { return d }
    }
    return 0
}

// MARK: Display formats: dd/MM/yyyy and a 12-hour clock

private func formatter(_ f: String) -> DateFormatter {
    let d = DateFormatter()
    d.locale = Locale(identifier: "en_US_POSIX")
    d.dateFormat = f
    return d
}
private let dateFmt = formatter("dd/MM/yyyy")
private let stampFmt = formatter("dd/MM/yyyy · h:mm a")

func fmtDate(_ ms: Int64) -> String { ms <= 0 ? "" : dateFmt.string(from: Date(timeIntervalSince1970: Double(ms) / 1000)) }
func fmtStamp(_ ms: Int64) -> String { ms <= 0 ? "" : stampFmt.string(from: Date(timeIntervalSince1970: Double(ms) / 1000)) }
func price(_ cents: Int) -> String { String(format: "$%.2f", Double(cents) / 100) }
func duration(_ seconds: Double) -> String { let s = max(0, Int(seconds)); return String(format: "%d:%02d", s / 60, s % 60) }

let languages: [(code: String, name: String, english: String)] = [
    ("en", "English", "English"), ("my", "မြန်မာ", "Burmese"), ("th", "ไทย", "Thai"), ("vi", "Tiếng Việt", "Vietnamese"),
    ("id", "Bahasa Indonesia", "Indonesian"), ("zh", "中文", "Chinese"), ("es", "Español", "Spanish"), ("pt", "Português", "Portuguese"),
]
