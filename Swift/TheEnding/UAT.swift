#if DEBUG
import Foundation

/// Debug-only acceptance run: launch with `-uat` and the app walks every screen against the live API,
/// performing the same store actions the buttons call and checking the server's answers. It writes
/// PASS/FAIL lines and SHOT markers (for an external screenshot script) to Documents/uat.log.
@MainActor
enum UAT {
    static var enabled: Bool { ProcessInfo.processInfo.arguments.contains("-uat") }

    private static let logURL = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent("uat.log")

    static func log(_ line: String) {
        let data = (line + "\n").data(using: .utf8)!
        if let h = try? FileHandle(forWritingTo: logURL) { h.seekToEndOfFile(); h.write(data); try? h.close() }
        else { try? data.write(to: logURL) }
    }

    struct Failure: Error, CustomStringConvertible { let description: String }
    static func expect(_ ok: Bool, _ msg: @autoclosure () -> String) throws { if !ok { throw Failure(description: msg()) } }

    static func run(_ store: AppStore) async {
        try? FileManager.default.removeItem(at: logURL)
        func pause(_ s: Double) async { try? await Task.sleep(for: .seconds(s)) }
        func shot(_ name: String) async { await pause(1.5); log("SHOT \(name)"); await pause(1.5) }
        func step(_ name: String, _ work: () async throws -> Void) async {
            do { try await work(); log("PASS | \(name)") } catch { log("FAIL | \(name) | \(error)") }
        }

        while store.me == nil || store.dramas == nil { await pause(0.3) }

        await step("Guest account with 100 welcome coins") {
            try expect(store.me?.user.signedIn == false && store.me?.coins == 100, "coins \(store.me?.coins ?? -1)")
        }
        await shot("01-update-dialog")
        await step("Update dialog: Later hides it") {
            let v = store.config?.versions.iosLatest ?? ""
            try expect(!v.isEmpty, "no iOS latest version in config")
            store.snoozeUpdate(v)
        }
        await shot("02-home")
        await step("Home sub-tabs") {
            for t in [HomeTab.rankings, .new, .genres] { store.homeTab = t; await shot("03-\(t.rawValue)") }
            store.homeTab = .forYou
        }
        await step("Search") { store.go(.search); await shot("04-search"); store.back() }
        await step("Drama page and save to My List") {
            store.go(.drama("alpha-king")); await shot("05-detail")
            try await store.toggle("saved", "alpha-king")
            try expect(store.me?.saved.contains("alpha-king") == true, "not saved")
        }
        await step("Locked episode shows the unlock sheet; unlock with coins (100 → 40)") {
            store.go(.watch("alpha-king", 13)); await shot("06-unlock-sheet")
            try await store.unlock("alpha-king", 13)
            try expect(store.me?.coins == 40, "coins \(store.me?.coins ?? -1)")
            await shot("07-unlocked-preview")
        }
        await step("Rewarded ad unlocks after 5 seconds") {
            let t = try await store.startAd("unlock", "alpha-king", 14)
            await pause(Double(t.seconds) + 0.5)
            try await store.completeAd(t.ticket)
            try expect(store.me?.unlocked["alpha-king"]?.contains(14) == true, "EP 14 not unlocked")
        }
        await step("Rewards check-in +10") {
            store.reset(); store.tab = .rewards; await shot("08-rewards")
            let (amount, _) = try await store.checkIn()
            try expect(amount == 10 && store.me?.coins == 50, "amount \(amount) coins \(store.me?.coins ?? -1)")
            await shot("09-checked-in")
        }
        await step("Email sign-in upgrades the guest and keeps the list") {
            store.go(.login); await shot("10-login")
            let c = try await store.startEmail("ios.\(Int(Date().timeIntervalSince1970))@example.org")
            store.go(.code(c)); await shot("11-code")
            let me = try await store.verifyEmail(c.challengeId, "123456")
            try expect(me.user.signedIn && me.coins == 80 && me.saved.contains("alpha-king"), "coins \(me.coins)")
            store.reset(); store.go(.welcome); await shot("12-welcome")
            try await store.updateMe(["onboarded": true, "genres": ["Romance", "CEO"]])
            store.reset(); await shot("13-notify-optin")
            try await store.updateMe(["notifyPrompted": true])
        }
        await step("Coin purchase in the simulated checkout") {
            store.tab = .me; await shot("14-me")
            store.go(.store); await shot("15-store")
            store.go(.payment("coins_500")); await shot("16-payment")
            let p = try await store.buy("coins_500", outcome: "success")
            try expect(p.status == "Paid" && store.me?.coins == 630, "status \(p.status) coins \(store.me?.coins ?? -1)")
        }
        await step("VIP pending shows in the subscription bar") {
            store.reset(); store.go(.vip); await shot("17-vip")
            _ = try await store.buy("vip_monthly", outcome: "pending")
            try expect(store.me?.subscription.state == "pending", "state \(store.me?.subscription.state ?? "")")
            store.reset(); store.tab = .home; await shot("18-subbar-pending")
        }
        await step("Account screens render") {
            for r in [Route.wallet, .inbox, .settings, .language, .notifySettings, .help, .about, .editProfile, .deleteAccount, .history] {
                store.reset(); store.go(r); await shot("19-\(String(describing: r))")
            }
            store.reset()
        }
        await step("Shorts and My List tabs") {
            store.tab = .shorts; await shot("20-shorts")
            store.tab = .myList; await shot("21-mylist")
        }
        await step("Uploaded episode plays to the end and autoplays on") {
            let before = store.me?.progress["contract-bride"]?.ep
            try await store.unlock("contract-bride", 11)
            store.reset(); store.go(.watch("contract-bride", 11))
            await pause(2.5); log("SHOT 22-real-video")
            await pause(9)
            try await store.refreshMe()
            let after = store.me?.progress["contract-bride"]?.ep
            try expect(after == 12, "progress \(String(describing: before)) → \(String(describing: after))")
            await shot("23-after-video")
        }
        log("DONE")
    }
}
#endif
