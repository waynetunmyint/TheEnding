import Foundation

struct ApiError: LocalizedError {
    let status: Int
    let message: String
    var errorDescription: String? { message }
}

/// Client for the Go API (../Go). URLSession keeps the server's te_session cookie in the shared
/// cookie store and sends it back on every request.
final class Api: @unchecked Sendable {
    /// The Go server on the Mac running the Simulator. Change it in Settings › Server for a device.
    static let defaultURL = "http://127.0.0.1:8080"

    var baseURL: String {
        get { UserDefaults.standard.string(forKey: "server") ?? Api.defaultURL }
        set {
            var v = newValue.trimmingCharacters(in: .whitespaces)
            while v.hasSuffix("/") { v.removeLast() }
            UserDefaults.standard.set(v, forKey: "server")
        }
    }

    private let session: URLSession = {
        let c = URLSessionConfiguration.default
        c.httpCookieStorage = .shared
        c.httpShouldSetCookies = true
        c.timeoutIntervalForRequest = 15
        c.requestCachePolicy = .reloadIgnoringLocalCacheData
        return URLSession(configuration: c)
    }()

    /// Absolute URL for a server path such as /api/media/images/x.jpg.
    func url(_ path: String) -> URL? { URL(string: path.hasPrefix("http") ? path : baseURL + path) }

    /// Session cookies, for AVPlayer requests made outside URLSession.
    var cookies: [HTTPCookie] {
        guard let u = URL(string: baseURL) else { return [] }
        return HTTPCookieStorage.shared.cookies(for: u) ?? []
    }

    func clearSession() {
        cookies.forEach { HTTPCookieStorage.shared.deleteCookie($0) }
    }

    func send<T: Decodable>(_ method: String, _ path: String, _ body: [String: Any]? = nil, as type: T.Type = T.self) async throws -> T {
        let data = try await raw(method, path, body)
        do {
            return try JSONDecoder().decode(T.self, from: data)
        } catch {
            throw ApiError(status: -1, message: "The server sent something unexpected. Is it the same version as this app?")
        }
    }

    func get<T: Decodable>(_ path: String, as type: T.Type = T.self) async throws -> T { try await send("GET", path, as: T.self) }

    @discardableResult
    func raw(_ method: String, _ path: String, _ body: [String: Any]? = nil) async throws -> Data {
        guard let u = URL(string: baseURL + "/api" + path) else {
            throw ApiError(status: 0, message: "The server address \"\(baseURL)\" isn't valid. Fix it in Settings › Server.")
        }
        var req = URLRequest(url: u)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Accept")
        if let body {
            req.httpBody = try JSONSerialization.data(withJSONObject: body)
            req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }
        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: req)
        } catch {
            throw ApiError(status: 0, message: "Can't reach The Ending at \(baseURL). Check the server is running, or change it in Settings › Server.")
        }
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        if status >= 400 {
            let obj = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any]
            throw ApiError(status: status, message: obj?["error"] as? String ?? "Something went wrong (\(status))")
        }
        return data
    }
}
