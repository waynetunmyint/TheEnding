import SwiftUI

enum C {
    static let bg = Color(hex: "#0F0C11")
    static let surface = Color(hex: "#1B1720")
    static let surface2 = Color(hex: "#262029")
    static let text = Color.white
    static let text2 = Color(hex: "#B0A8B4")
    static let text3 = Color(hex: "#8E8794")
    static let primary = Color(hex: "#E0245E")
    static let accent = Color(hex: "#FF5C7A")
    static let accentSoft = Color(hex: "#2E1520")
    static let gold = Color(hex: "#F2C46D")
    static let goldBg = Color(hex: "#2A2112")
    static let coin = Color(hex: "#FFB020")
    static let good = Color(hex: "#7FD4A0")
    static let warn = Color(hex: "#FFC46B")
    static let bad = Color(hex: "#FF8FA0")
    static let info = Color(hex: "#9CC3FF")
    static let infoBg = Color(hex: "#1E2533")
    static let badBg = Color(hex: "#2B1A1E")
    static let red = Color(hex: "#FF3D5E")
}

extension Color {
    init(hex: String) {
        var v: UInt64 = 0
        Scanner(string: hex.replacingOccurrences(of: "#", with: "")).scanHexInt64(&v)
        self.init(red: Double((v >> 16) & 0xFF) / 255, green: Double((v >> 8) & 0xFF) / 255, blue: Double(v & 0xFF) / 255)
    }
}

// MARK: Icons drawn to match the web design

struct CoinIcon: View {
    var size: CGFloat = 18
    var body: some View {
        ZStack {
            Circle().fill(C.coin)
            Circle().stroke(Color(hex: "#B26F00"), lineWidth: size * 0.07).padding(size * 0.23)
        }.frame(width: size, height: size).accessibilityHidden(true)
    }
}

struct CrownShape: Shape {
    func path(in r: CGRect) -> Path {
        var p = Path()
        let w = r.width, h = r.height
        p.move(to: CGPoint(x: w * 0.125, y: h * 0.33)); p.addLine(to: CGPoint(x: w * 0.31, y: h * 0.5))
        p.addLine(to: CGPoint(x: w * 0.5, y: h * 0.21)); p.addLine(to: CGPoint(x: w * 0.69, y: h * 0.5))
        p.addLine(to: CGPoint(x: w * 0.875, y: h * 0.33)); p.addLine(to: CGPoint(x: w * 0.79, y: h * 0.79))
        p.addLine(to: CGPoint(x: w * 0.21, y: h * 0.79)); p.closeSubpath()
        return p
    }
}

struct CrownIcon: View {
    var size: CGFloat = 18
    var color: Color = C.gold
    var body: some View { CrownShape().fill(color).frame(width: size, height: size).accessibilityHidden(true) }
}

// MARK: Poster

private let badgeColors: [String: (Color, Color)] = ["Hot": (Color(hex: "#E0245E"), .white), "New": (Color(hex: "#1D64D8"), .white), "Exclusive": (C.gold, Color(hex: "#2A1A00"))]

struct Poster: View {
    @Environment(AppStore.self) private var store
    let d: Drama
    var rank: Int? = nil
    var progress: Double? = nil
    var showEps = true
    var badge = true

    var body: some View {
        Color(hex: d.color)
            .aspectRatio(3 / 4, contentMode: .fit)
            .overlay {
                GeometryReader { g in
                    if !d.poster.isEmpty, let u = store.api.url(d.poster) {
                        AsyncImage(url: u) { img in img.resizable().scaledToFill() } placeholder: { Color.clear }
                            .frame(width: g.size.width, height: g.size.height).clipped()
                    } else {
                        Circle().fill(Color(hex: d.color2)).frame(width: g.size.width * 1.1).offset(x: g.size.width * 0.2, y: -g.size.height * 0.18)
                    }
                }
            }
            .overlay(alignment: .topLeading) {
                if badge, let c = badgeColors[d.badge] {
                    Text(d.badge).font(.system(size: 10, weight: .heavy)).foregroundStyle(c.1).padding(.horizontal, 7).padding(.vertical, 3)
                        .background(c.0, in: UnevenRoundedRectangle(bottomTrailingRadius: 8))
                }
            }
            .overlay(alignment: .bottomLeading) {
                if let rank { Text("\(rank)").font(.system(size: 44, weight: .black)).italic().foregroundStyle(.white).padding(.leading, 6).offset(y: 10) }
            }
            .overlay(alignment: .bottomTrailing) {
                if showEps, rank == nil, progress == nil, d.episodes > 0 {
                    Text("\(d.episodes) EP").font(.system(size: 10, weight: .semibold)).foregroundStyle(.white).padding(.horizontal, 6).padding(.vertical, 2)
                        .background(Color.black.opacity(0.6), in: RoundedRectangle(cornerRadius: 6)).padding(6)
                }
            }
            .overlay(alignment: .bottom) {
                if let progress {
                    GeometryReader { g in
                        ZStack(alignment: .leading) {
                            Rectangle().fill(.white.opacity(0.25))
                            Rectangle().fill(C.red).frame(width: g.size.width * min(1, max(0, progress)))
                        }
                    }.frame(height: 3)
                }
            }
            .clipShape(RoundedRectangle(cornerRadius: 10))
    }
}

struct PosterCard: View {
    let d: Drama
    var sub: String? = nil
    var rank: Int? = nil
    var progress: Double? = nil
    var badge = true
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 6) {
                Poster(d: d, rank: rank, progress: progress, badge: badge)
                Text(d.title).font(.system(size: 13, weight: .semibold)).lineLimit(2).multilineTextAlignment(.leading).foregroundStyle(C.text)
                if let sub, !sub.isEmpty { Text(sub).font(.system(size: 12)).foregroundStyle(C.text3) }
            }
        }.buttonStyle(.plain)
    }
}

struct PosterGrid: View {
    let items: [Drama]
    var sub: (Drama) -> String? = { _ in nil }
    var badge = true
    let open: (Drama) -> Void
    var body: some View {
        LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 10, alignment: .top), count: 3), spacing: 16) {
            ForEach(items) { d in PosterCard(d: d, sub: sub(d), badge: badge) { open(d) } }
        }.padding(.horizontal, 16)
    }
}

// MARK: Buttons and chips

enum Kind { case primary, secondary, soft, gold, light, ghost, danger }

struct Btn: View {
    let title: String
    var kind: Kind = .primary
    var small = false
    var full = false
    var enabled = true
    var icon: AnyView? = nil
    let action: () -> Void

    init(_ title: String, kind: Kind = .primary, small: Bool = false, full: Bool = false, enabled: Bool = true, icon: AnyView? = nil, action: @escaping () -> Void) {
        self.title = title; self.kind = kind; self.small = small; self.full = full; self.enabled = enabled; self.icon = icon; self.action = action
    }

    var body: some View {
        let (bg, fg): (Color, Color) = {
            switch kind {
            case .primary: return (C.primary, .white)
            case .secondary: return (C.surface2, C.text)
            case .soft: return (C.accentSoft, C.accent)
            case .gold: return (C.gold, Color(hex: "#2A1A00"))
            case .light: return (.white, Color(hex: "#1A1A1A"))
            case .ghost: return (.clear, C.text2)
            case .danger: return (C.badBg, C.bad)
            }
        }()
        Button(action: action) {
            HStack(spacing: 8) {
                if let icon { icon }
                Text(title).font(.system(size: small ? 13 : 16, weight: .bold)).lineLimit(1)
            }
            .foregroundStyle(enabled ? fg : Color(hex: "#6E6874"))
            .padding(.horizontal, small ? 14 : 22)
            .frame(maxWidth: full ? .infinity : nil, minHeight: small ? 36 : 50)
            .background(enabled ? bg : C.surface2, in: Capsule())
            .contentShape(Capsule())
        }
        .buttonStyle(.plain)
        .disabled(!enabled)
    }
}

struct ChipBtn: View {
    let title: String
    let selected: Bool
    var soft = false
    let action: () -> Void
    var body: some View {
        Button(action: action) {
            Text(title).font(.system(size: 14, weight: .semibold)).lineLimit(1)
                .foregroundStyle(selected ? (soft ? C.accent : C.bg) : C.text2)
                .padding(.horizontal, 14).frame(minHeight: 34)
                .background(selected ? (soft ? C.accentSoft : .white) : (soft ? .clear : C.surface), in: Capsule())
        }.buttonStyle(.plain).accessibilityAddTraits(selected ? .isSelected : [])
    }
}

// MARK: Layout pieces

struct TopBar<Trailing: View>: View {
    var title = ""
    var onBack: (() -> Void)?
    @ViewBuilder var trailing: () -> Trailing
    var body: some View {
        HStack(spacing: 4) {
            if let onBack {
                Button(action: onBack) { Image(systemName: "chevron.left").font(.system(size: 20, weight: .semibold)).frame(width: 44, height: 44) }
                    .foregroundStyle(C.text).accessibilityLabel("Back")
            } else { Color.clear.frame(width: 44, height: 44) }
            Text(title).font(.system(size: 17, weight: .heavy)).lineLimit(1).frame(maxWidth: .infinity)
            HStack { trailing() }.frame(minWidth: 44, alignment: .trailing)
        }
        .padding(.horizontal, 4).frame(minHeight: 52)
    }
}

extension TopBar where Trailing == EmptyView {
    init(title: String = "", onBack: (() -> Void)?) { self.title = title; self.onBack = onBack; self.trailing = { EmptyView() } }
}

struct ListRow<Trailing: View>: View {
    let label: String
    var value: String? = nil
    var badge = 0
    var color: Color = C.text
    var action: (() -> Void)? = nil
    @ViewBuilder var trailing: () -> Trailing

    var body: some View {
        let row = HStack(spacing: 12) {
            Text(label).font(.system(size: 15)).foregroundStyle(color).frame(maxWidth: .infinity, alignment: .leading)
            if badge > 0 { Text("\(badge)").font(.system(size: 12, weight: .heavy)).foregroundStyle(.white).padding(.horizontal, 7).padding(.vertical, 2).background(C.primary, in: Capsule()) }
            if let value, !value.isEmpty { Text(value).font(.system(size: 13)).foregroundStyle(C.text3) }
            trailing()
            if action != nil, Trailing.self == EmptyView.self { Image(systemName: "chevron.right").font(.system(size: 13, weight: .semibold)).foregroundStyle(C.text3) }
        }
        .frame(minHeight: 54)
        .contentShape(Rectangle())
        VStack(spacing: 0) {
            if let action { Button(action: action) { row }.buttonStyle(.plain) } else { row }
            Divider().overlay(C.surface)
        }
    }
}

extension ListRow where Trailing == EmptyView {
    init(_ label: String, value: String? = nil, badge: Int = 0, color: Color = C.text, action: (() -> Void)? = nil) {
        self.label = label; self.value = value; self.badge = badge; self.color = color; self.action = action; self.trailing = { EmptyView() }
    }
}

struct GroupTitle: View {
    let text: String
    init(_ text: String) { self.text = text }
    var body: some View { Text(text).font(.system(size: 13, weight: .semibold)).foregroundStyle(C.text3).frame(maxWidth: .infinity, alignment: .leading).padding(.top, 22).padding(.bottom, 2) }
}

struct LoadingView: View {
    var body: some View { ProgressView().tint(C.accent).controlSize(.large).frame(maxWidth: .infinity).padding(64) }
}

struct EmptyState: View {
    var icon: String? = nil
    let title: String
    let message: String
    var muted = false
    var actionTitle: String? = nil
    var action: (() -> Void)? = nil
    var body: some View {
        VStack(spacing: 10) {
            if let icon {
                Image(systemName: icon).font(.system(size: 28)).foregroundStyle(muted ? C.text2 : C.accent)
                    .frame(width: 64, height: 64).background(muted ? C.surface : C.accentSoft, in: Circle())
            }
            Text(title).font(.system(size: 20, weight: .heavy)).multilineTextAlignment(.center)
            Text(message).font(.system(size: 15)).foregroundStyle(C.text2).multilineTextAlignment(.center)
            if let actionTitle, let action { Btn(actionTitle, action: action).padding(.top, 8) }
        }
        .padding(.horizontal, 32).padding(.vertical, 56).frame(maxWidth: .infinity)
    }
}

struct ErrorState: View {
    let message: String
    var retry: (() -> Void)?
    var body: some View {
        let offline = message.hasPrefix("Can't reach")
        EmptyState(icon: offline ? "wifi.slash" : "exclamationmark.circle", title: offline ? "You're offline" : "Something went wrong",
                   message: message, muted: true, actionTitle: retry == nil ? nil : "Try again", action: retry)
    }
}

struct Avatar: View {
    let initial: String
    let color: String
    var size: CGFloat = 36
    var body: some View {
        Text(initial.isEmpty ? "?" : initial).font(.system(size: size * 0.4, weight: .heavy)).foregroundStyle(.white)
            .frame(width: size, height: size).background(Color(hex: color), in: Circle()).accessibilityHidden(true)
    }
}

struct BannerRow<Icon: View>: View {
    let title: String
    var subtitle: String? = nil
    let bg: Color
    let fg: Color
    var action: (() -> Void)? = nil
    @ViewBuilder var icon: () -> Icon
    var body: some View {
        let content = HStack(spacing: 12) {
            icon()
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(.system(size: 15, weight: .bold)).foregroundStyle(fg)
                if let subtitle, !subtitle.isEmpty { Text(subtitle).font(.system(size: 13)).foregroundStyle(fg.opacity(0.8)) }
            }.frame(maxWidth: .infinity, alignment: .leading)
            if action != nil { Image(systemName: "chevron.right").font(.system(size: 13, weight: .semibold)).foregroundStyle(fg) }
        }
        .padding(.horizontal, 16).padding(.vertical, 14)
        .background(bg, in: RoundedRectangle(cornerRadius: 16))
        if let action { Button(action: action) { content }.buttonStyle(.plain) } else { content }
    }
}

extension BannerRow where Icon == EmptyView {
    init(_ title: String, subtitle: String? = nil, bg: Color, fg: Color, action: (() -> Void)? = nil) {
        self.title = title; self.subtitle = subtitle; self.bg = bg; self.fg = fg; self.action = action; self.icon = { EmptyView() }
    }
}

/// Subscription status bar pinned on top of the tab bar; hidden until the backend state is known.
struct SubBar: View {
    @Environment(AppStore.self) private var store
    var body: some View {
        if let me = store.me {
            let s = me.subscription
            let (bg, fg): (Color, Color) = s.state == "pending" ? (C.infoBg, C.info) : (s.state == "expired" || s.state == "failed") ? (C.badBg, C.bad) : (C.goldBg, C.gold)
            let (label, detail, action): (String, String, String) = {
                switch s.state {
                case "active": return ("VIP active", "\(s.plan) · until \(fmtDate(s.until))", "Manage")
                case "pending": return ("Payment pending", "VIP \(s.plan) is being confirmed", "View")
                case "expired": return ("VIP expired", "Ended \(fmtDate(s.until)) · renew to keep watching", "Renew")
                case "failed": return ("Payment didn't go through", "VIP \(s.plan) · you weren't charged", "Retry")
                default: return ("VIP", "Unlock every episode, no ads", "Join")
                }
            }()
            Button { store.go(s.state == "pending" ? .wallet : .vip) } label: {
                HStack(spacing: 8) {
                    CrownIcon(size: 16, color: fg)
                    Text(label).font(.system(size: 13, weight: .bold))
                    Text(detail).font(.system(size: 13)).opacity(0.85).lineLimit(1).frame(maxWidth: .infinity, alignment: .leading)
                    Text(action).font(.system(size: 13, weight: .bold))
                    Image(systemName: "chevron.right").font(.system(size: 11, weight: .bold))
                }
                .foregroundStyle(fg).padding(.horizontal, 16).frame(minHeight: 44).background(bg)
            }.buttonStyle(.plain)
        }
    }
}

struct DialogCard<Content: View>: View {
    var dismiss: (() -> Void)?
    @ViewBuilder let content: () -> Content
    var body: some View {
        ZStack {
            Color.black.opacity(0.72).ignoresSafeArea().onTapGesture { dismiss?() }
            VStack(spacing: 10) { content() }
                .multilineTextAlignment(.center)
                .padding(.horizontal, 24).padding(.top, 28).padding(.bottom, 18)
                .frame(maxWidth: 360)
                .background(C.surface, in: RoundedRectangle(cornerRadius: 24))
                .padding(.horizontal, 28)
        }
    }
}

/// Bottom sheet used by the player and other screens.
struct SheetOverlay<Content: View>: View {
    let title: String
    let close: () -> Void
    @ViewBuilder let content: () -> Content
    var body: some View {
        ZStack(alignment: .bottom) {
            Color.black.opacity(0.72).ignoresSafeArea().onTapGesture(perform: close)
            VStack(alignment: .leading, spacing: 14) {
                Capsule().fill(Color(hex: "#3A3340")).frame(width: 36, height: 4).frame(maxWidth: .infinity)
                HStack {
                    Text(title).font(.system(size: 18, weight: .heavy))
                    Spacer()
                    Button(action: close) { Image(systemName: "xmark").font(.system(size: 16, weight: .semibold)).foregroundStyle(C.text2).frame(width: 44, height: 44) }
                        .accessibilityLabel("Close")
                }
                ScrollView { VStack(alignment: .leading, spacing: 14) { content() }.frame(maxWidth: .infinity, alignment: .leading) }
                    .scrollBounceBehavior(.basedOnSize)
                    .frame(maxHeight: 560)
            }
            .padding(.horizontal, 16).padding(.top, 8).padding(.bottom, 12)
            .frame(maxWidth: 560)
            .background(C.surface, in: UnevenRoundedRectangle(topLeadingRadius: 20, topTrailingRadius: 20))
        }
    }
}

struct FieldBox: View {
    let label: String
    @Binding var text: String
    var placeholder = ""
    var keyboard: UIKeyboardType = .default
    var disabled = false
    var multiline = false
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(label).font(.system(size: 13, weight: .semibold)).foregroundStyle(C.text2)
            Group {
                if multiline { TextField(placeholder, text: $text, axis: .vertical).lineLimit(4...8) }
                else { TextField(placeholder, text: $text) }
            }
            .keyboardType(keyboard)
            .textInputAutocapitalization(keyboard == .emailAddress || keyboard == .URL ? .never : .sentences)
            .autocorrectionDisabled(keyboard == .emailAddress || keyboard == .URL)
            .disabled(disabled)
            .foregroundStyle(disabled ? C.text2 : C.text)
            .padding(14).frame(minHeight: 50)
            .background(disabled ? Color(hex: "#15121A") : C.surface, in: RoundedRectangle(cornerRadius: 14))
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color(hex: "#3A3340"), lineWidth: 1.5))
        }
    }
}

struct Toggle2: View {
    let label: String
    var hint = ""
    let isOn: Bool
    var enabled = true
    let set: (Bool) -> Void
    var body: some View {
        VStack(spacing: 0) {
            Toggle(isOn: Binding(get: { isOn }, set: set)) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(label).font(.system(size: 15))
                    if !hint.isEmpty { Text(hint).font(.system(size: 13)).foregroundStyle(C.text3) }
                }
            }
            .tint(C.primary).disabled(!enabled).frame(minHeight: 58)
            Divider().overlay(C.surface)
        }
    }
}
