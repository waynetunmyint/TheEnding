import SwiftUI
import UserNotifications

// MARK: Rewards

struct RewardsScreen: View {
    @Environment(AppStore.self) private var store
    @State private var reward: (Int, Int)?
    @State private var ad: AdTicket?
    @State private var adLeft = 0
    @State private var busy = false
    @State private var notifGranted = false

    var body: some View {
        if let me = store.me {
            let amounts = store.config?.checkin ?? []
            let pos = amounts.isEmpty ? 0 : me.checkin.streak % amounts.count
            let cycleDone = me.checkin.streak > 0 && pos == 0 && !me.checkin.canCheckIn
            ZStack {
                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        HStack {
                            Text("Rewards").font(.system(size: 28, weight: .heavy))
                            Spacer()
                            Button { store.go(.wallet) } label: {
                                HStack(spacing: 6) { CoinIcon(); Text("\(me.coins)").font(.system(size: 15, weight: .heavy)) }.padding(.horizontal, 14).frame(minHeight: 34).background(C.surface, in: Capsule())
                            }.buttonStyle(.plain)
                        }
                        VStack(alignment: .leading, spacing: 12) {
                            HStack { Text("Daily check-in").font(.system(size: 18, weight: .heavy)); Spacer(); Text("\(me.checkin.streak)-day streak").font(.system(size: 13, weight: .semibold)).foregroundStyle(C.warn) }
                            HStack(spacing: 6) {
                                ForEach(Array(amounts.enumerated()), id: \.offset) { i, amt in
                                    let claimed = cycleDone || i < pos
                                    let today = me.checkin.canCheckIn && i == pos
                                    VStack(spacing: 4) {
                                        if claimed { Image(systemName: "checkmark").font(.system(size: 16, weight: .bold)).foregroundStyle(C.text3) } else { CoinIcon(size: 20) }
                                        Text("+\(amt)").font(.system(size: 12, weight: .heavy)).foregroundStyle(claimed ? C.text3 : i == amounts.count - 1 ? C.warn : C.text)
                                        Text(today ? "Today" : "Day \(i + 1)").font(.system(size: 10)).foregroundStyle(C.text3)
                                    }
                                    .frame(maxWidth: .infinity, minHeight: 76)
                                    .background(today ? C.accentSoft : C.surface, in: RoundedRectangle(cornerRadius: 12))
                                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(today ? C.accent : .clear, lineWidth: 1.5))
                                    .accessibilityElement(children: .combine)
                                    .accessibilityLabel("Day \(i + 1), \(amt) coins\(claimed ? ", claimed" : "")")
                                }
                            }
                            Btn(me.checkin.canCheckIn ? "Check in · +\(me.checkin.nextAmount) coins" : "Checked in today · come back tomorrow", full: true, enabled: me.checkin.canCheckIn && !busy) {
                                run { reward = try await store.checkIn() }
                            }
                            if me.vip, let bonus = store.config?.vipBonus, bonus > 0 { Text("VIP adds +\(bonus) coins to every check-in.").font(.system(size: 13)).foregroundStyle(C.gold) }
                        }
                        VStack(alignment: .leading, spacing: 0) {
                            Text("Tasks").font(.system(size: 18, weight: .heavy)).padding(.bottom, 4)
                            ForEach(me.tasks) { t in
                                HStack {
                                    VStack(alignment: .leading, spacing: 3) {
                                        Text(t.name).font(.system(size: 15, weight: .semibold))
                                        Text("+\(t.amount) coins" + (t.note.isEmpty ? "" : " · \(t.note)")).font(.system(size: 13, weight: .semibold)).foregroundStyle(C.warn)
                                    }.frame(maxWidth: .infinity, alignment: .leading)
                                    taskButton(t, me)
                                }.padding(.vertical, 12)
                                Divider().overlay(C.surface)
                            }
                        }
                    }.padding(16)
                }
                if ad != nil {
                    ZStack {
                        Color.black.ignoresSafeArea()
                        VStack(spacing: 12) {
                            Text("Sponsored · demo ad").font(.system(size: 12)).foregroundStyle(C.text3)
                            Text("Your ad here").font(.system(size: 15, weight: .bold)).foregroundStyle(C.info).frame(width: 220, height: 391).background(C.infoBg, in: RoundedRectangle(cornerRadius: 16))
                            Text("Reward in \(adLeft)s").font(.system(size: 15, weight: .bold))
                        }
                    }
                }
                if let (amount, bonus) = reward {
                    DialogCard(dismiss: { reward = nil }) {
                        CoinIcon(size: 72)
                        Text("+\(amount + bonus) coins").font(.system(size: 28, weight: .black)).foregroundStyle(C.warn)
                        Text((bonus > 0 ? "Includes your +\(bonus) VIP bonus. " : "") + "Come back tomorrow for +\(me.checkin.nextAmount).").foregroundStyle(C.text2)
                        Btn("Collect", full: true) { reward = nil }
                    }
                }
            }
            .task(id: ad?.ticket) {
                guard let a = ad else { return }
                adLeft = a.seconds
                while adLeft > 0 { try? await Task.sleep(for: .seconds(1)); if Task.isCancelled { return }; adLeft -= 1 }
                do { try await store.completeAd(a.ticket); store.show("+\(store.config?.tasks["ad"] ?? 20) coins") } catch { store.show(error.localizedDescription) }
                ad = nil
            }
            .task { notifGranted = await UNUserNotificationCenter.current().notificationSettings().authorizationStatus == .authorized }
        }
    }

    private func run(_ work: @escaping @MainActor () async throws -> Void) {
        busy = true
        store.act { defer { busy = false }; try await work() }
    }

    @ViewBuilder private func taskButton(_ t: RewardTask, _ me: Me) -> some View {
        if t.done {
            Btn("Done", kind: .secondary, small: true, enabled: false) {}
        } else {
            switch t.key {
            case "ad": Btn("Watch", small: true, enabled: !busy) { run { ad = try await store.startAd("reward") } }
            case "watch":
                if t.claimable { Btn("Claim", small: true) { run { try await store.claimTask("watch"); store.show("+\(t.amount) coins") } } }
                else { Btn("Go", small: true) { store.tab = .home } }
            case "notify":
                if notifGranted { Btn("Claim", small: true) { run { try await store.claimTask("notify"); store.show("+\(t.amount) coins") } } }
                else { Btn("Open", small: true) { store.go(.notifySettings) } }
            case "invite":
                if me.user.signedIn, let u = URL(string: "\(store.api.baseURL)/?ref=\(me.user.id)") {
                    ShareLink(item: u, message: Text("Join me on The Ending. We both get free coins.")) {
                        Text("Invite").font(.system(size: 13, weight: .bold)).foregroundStyle(.white).padding(.horizontal, 14).frame(minHeight: 36).background(C.primary, in: Capsule())
                    }
                } else { Btn("Sign in", small: true) { store.go(.login) } }
            default: Btn("Sign in", small: true) { store.go(.login) }
            }
        }
    }
}

// MARK: My List and History

struct MyListScreen: View {
    @Environment(AppStore.self) private var store
    let history: Bool
    var standalone = false
    @State private var showHistory: Bool?
    @State private var editing = false

    var body: some View {
        if let me = store.me {
            let h = showHistory ?? history
            VStack(alignment: .leading, spacing: 0) {
                if standalone { TopBar(title: "Watch history", onBack: { store.back() }) }
                if !standalone {
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Text("My List").font(.system(size: 28, weight: .heavy))
                            Spacer()
                            if !h && !me.saved.isEmpty { Btn(editing ? "Done" : "Edit", kind: .ghost, small: true) { editing.toggle() } }
                            if h && !me.progress.isEmpty { Btn("Clear", kind: .ghost, small: true) { store.act { try await store.clearHistory() } } }
                        }
                        HStack(spacing: 22) {
                            ForEach([(false, "Saved"), (true, "History")], id: \.1) { v, label in
                                Button { showHistory = v } label: {
                                    VStack(alignment: .leading, spacing: 6) {
                                        Text(label).font(.system(size: 16, weight: h == v ? .heavy : .semibold)).foregroundStyle(h == v ? C.text : C.text3)
                                        Rectangle().fill(h == v ? C.red : .clear).frame(width: 40, height: 3)
                                    }
                                }.buttonStyle(.plain)
                            }
                        }
                    }.padding(.horizontal, 16).padding(.vertical, 12)
                }
                if store.dramas == nil { LoadingView() }
                else if h { historyList(me) }
                else { savedGrid(me) }
                Spacer(minLength: 0)
            }
        }
    }

    @ViewBuilder private func historyList(_ me: Me) -> some View {
        let rows = me.progress.sorted { $0.value.updated > $1.value.updated }.compactMap { kv in store.drama(kv.key).map { ($0, kv.value.ep) } }
        if rows.isEmpty {
            EmptyState(icon: "play.rectangle", title: "No history yet", message: "Dramas you start watching show up here so you can jump back in.", actionTitle: "Start watching") { store.openTab(.home) }
        } else {
            ScrollView {
                LazyVStack(spacing: 0) {
                    ForEach(rows, id: \.0.id) { d, ep in
                        let done = ep >= d.episodes && d.completed
                        HStack(spacing: 12) {
                            Poster(d: d, showEps: false, badge: false).frame(width: 60).onTapGesture { store.go(.drama(d.id)) }
                            VStack(alignment: .leading, spacing: 6) {
                                Text(d.title).font(.system(size: 15, weight: .bold)).lineLimit(1)
                                Text("EP \(ep) of \(d.episodes)").font(.system(size: 13)).foregroundStyle(C.text3)
                                ProgressView(value: min(1, Double(ep) / Double(max(1, d.episodes)))).tint(C.red).frame(width: 120)
                            }.frame(maxWidth: .infinity, alignment: .leading)
                            Btn(done ? "Rewatch" : "Continue", kind: .soft, small: true) { store.go(.watch(d.id, done ? 1 : ep)) }
                        }.padding(.vertical, 10)
                        Divider().overlay(C.surface)
                    }
                }.padding(.horizontal, 16)
            }
        }
    }

    @ViewBuilder private func savedGrid(_ me: Me) -> some View {
        let items = store.pick(me.saved)
        if items.isEmpty {
            EmptyState(icon: "bookmark", title: "Nothing saved yet", message: "Tap Save on any drama and it lands here, with a note when new episodes drop.", actionTitle: "Find something to watch") { store.openTab(.home) }
        } else {
            ScrollView {
                LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 10, alignment: .top), count: 3), spacing: 16) {
                    ForEach(items) { d in
                        let at = me.progress[d.id]?.ep ?? 0
                        PosterCard(d: d, sub: !d.published ? "Coming soon" : at > 0 ? "EP \(at) / \(d.episodes)" : "Not started", progress: Double(at) / Double(max(1, d.episodes)), badge: false) {
                            store.go(at > 0 && d.published ? .watch(d.id, at) : .drama(d.id))
                        }
                        .overlay(alignment: .topTrailing) {
                            if editing {
                                Button { store.act { try await store.toggle("saved", d.id) } } label: {
                                    Image(systemName: "xmark").font(.system(size: 13, weight: .bold)).frame(width: 36, height: 36).background(Color(hex: "#0F0C11").opacity(0.8), in: Circle())
                                }.padding(4).accessibilityLabel("Remove \(d.title)")
                            }
                        }
                    }
                }.padding(16)
            }
        }
    }
}

// MARK: Store, VIP, payment, wallet

struct StoreScreen: View {
    @Environment(AppStore.self) private var store
    @State private var pick = 1
    var body: some View {
        if let me = store.me {
            let packs = store.config?.coinPacks ?? []
            VStack(spacing: 0) {
                TopBar(title: "Coin Store", onBack: { store.back() }) { Btn("Records", kind: .ghost, small: true) { store.go(.wallet) } }
                ScrollView {
                    VStack(alignment: .leading, spacing: 16) {
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Your balance").font(.system(size: 13)).foregroundStyle(C.text2)
                            HStack(spacing: 8) { CoinIcon(size: 30); Text("\(me.coins)").font(.system(size: 34, weight: .black)) }
                            Text("Most episodes cost \(store.config?.coinsPerEpisode ?? 60) coins.").font(.system(size: 13)).foregroundStyle(C.text3)
                        }
                        BannerRow(title: "VIP watches everything", subtitle: "Cheaper than coins if you binge", bg: C.goldBg, fg: C.gold, action: { store.go(.vip) }) { CrownIcon(size: 26) }
                        LazyVGrid(columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)], spacing: 10) {
                            ForEach(Array(packs.enumerated()), id: \.element.id) { i, p in
                                Button { pick = i } label: {
                                    VStack(alignment: .leading, spacing: 4) {
                                        if !p.tag.isEmpty { Text(p.tag).font(.system(size: 10, weight: .heavy)).foregroundStyle(C.accent) }
                                        HStack(spacing: 6) { CoinIcon(); Text("\(p.coins)").font(.system(size: 20, weight: .heavy)); if p.bonus > 0 { Text("+\(p.bonus)").font(.system(size: 13, weight: .bold)).foregroundStyle(C.warn) } }
                                        Text(price(p.priceCents)).font(.system(size: 14, weight: .semibold)).foregroundStyle(C.text2)
                                    }
                                    .padding(14).frame(maxWidth: .infinity, minHeight: 92, alignment: .leading)
                                    .background(pick == i ? C.accentSoft : C.surface, in: RoundedRectangle(cornerRadius: 16))
                                    .overlay(RoundedRectangle(cornerRadius: 16).stroke(pick == i ? C.accent : .clear, lineWidth: 2))
                                }.buttonStyle(.plain)
                            }
                        }
                        if packs.indices.contains(pick) {
                            let p = packs[pick]
                            if me.user.signedIn { Btn("Pay \(price(p.priceCents)) · get \(p.coins + p.bonus) coins", full: true) { store.go(.payment(p.id)) } }
                            else { Btn("Sign in to buy coins", full: true) { store.go(.login) } }
                        }
                        Text("Demo checkout: no real payment is made. The store build pays through the App Store.").font(.system(size: 12)).foregroundStyle(C.text3).multilineTextAlignment(.center).frame(maxWidth: .infinity)
                    }.padding(16)
                }
            }
        }
    }
}

struct VipScreen: View {
    @Environment(AppStore.self) private var store
    @State private var pick = 1
    var body: some View {
        if let me = store.me {
            let plans = store.config?.vipPlans ?? []
            let sub = me.subscription
            let perks = ["All episodes unlocked", "No ads", "1080p and 4K", "New dramas first", "+\(store.config?.vipBonus ?? 20) coins on check-in", "Watch on web too"]
            VStack(spacing: 0) {
                TopBar(onBack: { store.back() })
                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        VStack(spacing: 8) {
                            CrownIcon(size: 48)
                            Text("The Ending VIP").font(.system(size: 26, weight: .black)).foregroundStyle(C.gold)
                            Text("Every episode, every drama. No waiting, no ads.").foregroundStyle(Color(hex: "#D9CFC0")).multilineTextAlignment(.center)
                        }.frame(maxWidth: .infinity)
                        switch sub.state {
                        case "active":
                            VStack(alignment: .leading, spacing: 6) {
                                Text("You're VIP · \(sub.plan)").font(.system(size: 15, weight: .bold)).foregroundStyle(C.gold)
                                Text("Active until \(fmtDate(sub.until)). In the store build you manage or cancel VIP in the App Store.").font(.system(size: 13)).foregroundStyle(Color(hex: "#D9B571"))
                                Btn("End VIP now (demo)", kind: .secondary, small: true) { store.act { try await store.cancelVip(); store.show("VIP ended") } }
                            }.padding(16).frame(maxWidth: .infinity, alignment: .leading).background(C.goldBg, in: RoundedRectangle(cornerRadius: 16))
                        case "pending": BannerRow("Payment pending", subtitle: "Your VIP \(sub.plan) payment is being confirmed. You don't need to pay again.", bg: C.infoBg, fg: C.info)
                        case "failed": BannerRow("Payment didn't go through", subtitle: "You weren't charged; pick a plan to try again.", bg: C.badBg, fg: C.bad)
                        case "expired": BannerRow("VIP ended on \(fmtDate(sub.until))", subtitle: "Renew to keep watching everything.", bg: C.badBg, fg: C.bad)
                        default: EmptyView()
                        }
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], alignment: .leading, spacing: 12) {
                            ForEach(perks, id: \.self) { p in Label(p, systemImage: "checkmark").font(.system(size: 14)).foregroundStyle(Color(hex: "#F5EDE0")).labelStyle(GoldCheck()) }
                        }
                        ForEach(Array(plans.enumerated()), id: \.element.id) { i, p in
                            Button { pick = i } label: {
                                HStack {
                                    VStack(alignment: .leading, spacing: 3) {
                                        Text(p.name).font(.system(size: 16, weight: .bold))
                                        if !p.note.isEmpty { Text(p.note).font(.system(size: 13)).foregroundStyle(Color(hex: "#B8AC98")) }
                                    }
                                    Spacer()
                                    Text(price(p.priceCents)).font(.system(size: 18, weight: .bold))
                                }
                                .padding(.horizontal, 16).frame(minHeight: 68)
                                .background(pick == i ? C.goldBg : Color(hex: "#1E1914"), in: RoundedRectangle(cornerRadius: 16))
                                .overlay(RoundedRectangle(cornerRadius: 16).stroke(pick == i ? C.gold : .clear, lineWidth: 2))
                                .overlay(alignment: .topLeading) {
                                    if !p.tag.isEmpty { Text(p.tag).font(.system(size: 11, weight: .heavy)).foregroundStyle(Color(hex: "#2A1A00")).padding(.horizontal, 8).padding(.vertical, 2).background(C.gold, in: Capsule()).offset(x: 14, y: -10) }
                                }
                            }.buttonStyle(.plain)
                        }
                        if plans.indices.contains(pick) {
                            let p = plans[pick]
                            VStack(spacing: 8) {
                                if me.user.signedIn { Btn("\(sub.state == "active" ? "Add" : "Start") \(p.name) VIP · \(price(p.priceCents))", kind: .gold, full: true) { store.go(.payment(p.id)) } }
                                else { Btn("Sign in to join VIP", kind: .gold, full: true) { store.go(.login) } }
                                Text("\(p.name) plan renews automatically at \(price(p.priceCents)). Cancel anytime in App Store settings. Demo checkout: no real payment.")
                                    .font(.system(size: 12)).foregroundStyle(Color(hex: "#9A9080")).multilineTextAlignment(.center)
                            }
                        }
                    }.padding(16).padding(.bottom, 16)
                }
            }
            .background(Color(hex: "#120F0B").ignoresSafeArea())
        }
    }
}

struct GoldCheck: LabelStyle {
    func makeBody(configuration: Configuration) -> some View {
        HStack(spacing: 8) { configuration.icon.foregroundStyle(C.gold).font(.system(size: 14, weight: .bold)); configuration.title }
    }
}

struct PaymentScreen: View {
    @Environment(AppStore.self) private var store
    let productId: String
    @State private var result: Payment?
    @State private var busy = false
    @State private var error: String?

    var body: some View {
        let pack = store.config?.coinPacks.first { $0.id == productId }
        let plan = store.config?.vipPlans.first { $0.id == productId }
        let item = pack.map { "\($0.coins + $0.bonus) coins" + ($0.bonus > 0 ? " (\($0.coins) + \($0.bonus) bonus)" : "") } ?? plan.map { "VIP \($0.name)" } ?? ""
        let amount = price(pack?.priceCents ?? plan?.priceCents ?? 0)
        VStack(spacing: 0) {
            TopBar(title: "Payment", onBack: { store.back() })
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    if item.isEmpty {
                        EmptyState(title: "This product isn't available", message: "Pick a coin pack or VIP plan again.")
                    } else if let r = result {
                        resultView(r, item: item, amount: amount, pack: pack, plan: plan)
                    } else {
                        Text("Confirm purchase").font(.system(size: 24, weight: .heavy))
                        VStack(spacing: 0) {
                            HStack { Text("Item").foregroundStyle(C.text3); Spacer(); Text(item).font(.system(size: 15, weight: .semibold)) }.frame(minHeight: 48)
                            Divider().overlay(C.surface2)
                            HStack { Text("Price").foregroundStyle(C.text3); Spacer(); Text(amount).font(.system(size: 15, weight: .bold)) }.frame(minHeight: 48)
                        }.padding(.horizontal, 16).background(C.surface, in: RoundedRectangle(cornerRadius: 16))
                        Text("Demo checkout: nothing is charged. In the store build this is the App Store payment sheet. The order is recorded either way; pick how the store answers.")
                            .font(.system(size: 13)).foregroundStyle(C.text2)
                        if let error { Text(error).font(.system(size: 13)).foregroundStyle(C.bad) }
                        Btn("Pay \(amount)", full: true, enabled: !busy) { pay("success") }
                        HStack(spacing: 10) {
                            Btn("Store says pending", kind: .secondary, small: true, full: true, enabled: !busy) { pay("pending") }
                            Btn("Store declines", kind: .secondary, small: true, full: true, enabled: !busy) { pay("failed") }
                        }
                    }
                }.padding(16)
            }
        }
    }

    private func pay(_ outcome: String) {
        busy = true; error = nil
        Task { @MainActor in
            defer { busy = false }
            do { result = try await store.buy(productId, outcome: outcome) } catch { self.error = error.localizedDescription }
        }
    }

    @ViewBuilder private func resultView(_ r: Payment, item: String, amount: String, pack: CoinPack?, plan: VipPlan?) -> some View {
        let (title, body, tint, icon): (String, String, Color, String) = {
            switch r.status {
            case "Paid": return (pack.map { "\($0.coins + $0.bonus) coins added" } ?? "Welcome to VIP \(plan?.name ?? "")", plan != nil ? "Every episode is unlocked. Enjoy." : "Your balance is updated. Enjoy the next episode.", C.accent, "checkmark")
            case "Pending": return ("Payment pending", "Your store is still confirming this payment. It's added the moment it clears. You don't need to pay again.", C.info, "ellipsis")
            default: return ("Payment didn't go through", "You were not charged. Check your payment method and try again.", C.bad, "xmark")
            }
        }()
        VStack(spacing: 12) {
            Image(systemName: icon).font(.system(size: 34, weight: .bold)).foregroundStyle(tint).frame(width: 80, height: 80).background(tint.opacity(0.15), in: Circle())
            Text(title).font(.system(size: 24, weight: .heavy)).multilineTextAlignment(.center)
            Text(body).foregroundStyle(C.text2).multilineTextAlignment(.center)
        }.frame(maxWidth: .infinity)
        VStack(spacing: 0) {
            ForEach([("Item", item), ("Amount", amount), ("Date", fmtStamp(r.at)), ("Order", r.order)], id: \.0) { k, v in
                HStack { Text(k).font(.system(size: 14)).foregroundStyle(C.text3); Spacer(); Text(v).font(.system(size: 14, weight: .semibold)) }.frame(minHeight: 46)
                Divider().overlay(C.surface)
            }
        }
        if r.status == "Failed" {
            Btn("Try again", full: true) { result = nil }
            Btn("Get help", kind: .ghost, full: true) { store.go(.help) }
        } else {
            Btn("Back to watching", full: true) { store.back(); store.back() }
            Btn(r.status == "Pending" ? "Check status in Wallet" : "View coin records", kind: .ghost, full: true) { store.go(.wallet) }
        }
    }
}

struct WalletScreen: View {
    @Environment(AppStore.self) private var store
    @State private var tab = "All"
    var body: some View {
        if let me = store.me {
            let tabs = ["All", "Earned", "Spent"] + (me.user.signedIn ? ["Purchases"] : [])
            VStack(spacing: 0) {
                TopBar(title: "Wallet", onBack: { store.back() })
                ScrollView {
                    VStack(alignment: .leading, spacing: 0) {
                        HStack {
                            VStack(alignment: .leading, spacing: 6) {
                                Text("Coins").font(.system(size: 13)).foregroundStyle(C.text2)
                                HStack(spacing: 8) { CoinIcon(size: 28); Text("\(me.coins)").font(.system(size: 32, weight: .black)) }
                            }
                            Spacer()
                            Btn("Top up", small: true) { store.go(.store) }
                        }.padding(.top, 8).padding(.bottom, 18)
                        if me.user.signedIn {
                            Loaded("payments", fetch: { try await store.api.get("/payments", as: [Payment].self) }) { list, _ in
                                let pending = list.filter { $0.status == "Pending" }
                                if !pending.isEmpty && tab != "Purchases" {
                                    BannerRow(pending.count == 1 ? "1 payment is pending" : "\(pending.count) payments are pending",
                                              subtitle: "Coins or VIP are added the moment the store confirms. Order \(pending[0].order).", bg: C.infoBg, fg: C.info, action: { tab = "Purchases" })
                                        .padding(.bottom, 14)
                                }
                            }
                        }
                        HStack(spacing: 22) {
                            ForEach(tabs, id: \.self) { t in
                                Button { tab = t } label: {
                                    VStack(alignment: .leading, spacing: 8) {
                                        Text(t).font(.system(size: 15, weight: .bold)).foregroundStyle(tab == t ? C.text : C.text3)
                                        Rectangle().fill(tab == t ? C.red : .clear).frame(width: 24, height: 2)
                                    }.padding(.top, 8)
                                }.buttonStyle(.plain).accessibilityAddTraits(tab == t ? .isSelected : [])
                            }
                        }
                        if tab == "Purchases" {
                            Loaded("payments", fetch: { try await store.api.get("/payments", as: [Payment].self) }) { list, _ in
                                if list.isEmpty { EmptyState(title: "No purchases yet", message: "Coin packs and VIP you buy show up here.") }
                                ForEach(list) { p in
                                    HStack {
                                        VStack(alignment: .leading, spacing: 3) { Text(p.item).font(.system(size: 15, weight: .semibold)); Text("\(fmtStamp(p.at)) · \(p.order)").font(.system(size: 12)).foregroundStyle(C.text3) }
                                        Spacer()
                                        VStack(alignment: .trailing, spacing: 3) {
                                            Text(price(p.amountCents)).font(.system(size: 15, weight: .bold))
                                            Text(p.status).font(.system(size: 12, weight: .semibold)).foregroundStyle(p.status == "Paid" ? C.good : p.status == "Pending" ? C.warn : p.status == "Refunded" ? C.info : C.bad)
                                        }
                                    }.padding(.vertical, 12)
                                    Divider().overlay(C.surface)
                                }
                            }
                        } else {
                            Loaded("wallet", fetch: { try await store.api.get("/wallet", as: [WalletEntry].self) }) { all, _ in
                                let rows = all.filter { tab == "All" || (tab == "Earned") == ($0.amount > 0) }
                                if rows.isEmpty { EmptyState(title: "No records yet", message: "Coins you earn and spend show up here.") }
                                ForEach(Array(rows.enumerated()), id: \.offset) { _, r in
                                    HStack {
                                        VStack(alignment: .leading, spacing: 3) { Text(r.what).font(.system(size: 15, weight: .semibold)).lineLimit(1); Text(fmtStamp(r.at)).font(.system(size: 12)).foregroundStyle(C.text3) }
                                        Spacer()
                                        Text((r.amount > 0 ? "+" : "−") + "\(abs(r.amount))").font(.system(size: 16, weight: .heavy)).foregroundStyle(r.amount > 0 ? C.warn : C.text2)
                                    }.padding(.vertical, 12)
                                    Divider().overlay(C.surface)
                                }
                            }
                        }
                    }.padding(.horizontal, 16).padding(.bottom, 24)
                }
            }
        }
    }
}
