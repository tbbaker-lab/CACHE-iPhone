import Foundation

enum CACHESection: String, CaseIterable, Identifiable {
    case chat = "Chat"
    case library = "Library"

    var id: String { rawValue }
}

struct ChatMessage: Identifiable, Codable, Equatable {
    enum Role: String, Codable {
        case user
        case assistant
    }

    let id: UUID
    let role: Role
    var text: String
    let createdAt: Date

    init(id: UUID = UUID(), role: Role, text: String, createdAt: Date = .now) {
        self.id = id
        self.role = role
        self.text = text
        self.createdAt = createdAt
    }
}

struct Conversation: Identifiable, Codable, Equatable {
    let id: UUID
    var title: String
    var messages: [ChatMessage]
    var updatedAt: Date

    init(id: UUID = UUID(), title: String = "New conversation", messages: [ChatMessage] = [], updatedAt: Date = .now) {
        self.id = id
        self.title = title
        self.messages = messages
        self.updatedAt = updatedAt
    }
}

struct KnowledgeEntry: Identifiable, Codable, Hashable {
    let id: String
    let title: String
    let category: String
    let keywords: [String]
    let content: String
}

struct Reminder: Identifiable, Codable, Equatable {
    let id: UUID
    var message: String
    var hour: Int
    var minute: Int
    var repeatsDaily: Bool
    var createdAt: Date

    var timeText: String {
        var components = DateComponents()
        components.hour = hour
        components.minute = minute
        let date = Calendar.current.date(from: components) ?? .now
        return date.formatted(date: .omitted, time: .shortened)
    }

    init(id: UUID = UUID(), message: String, hour: Int, minute: Int, repeatsDaily: Bool, createdAt: Date = .now) {
        self.id = id
        self.message = message
        self.hour = hour
        self.minute = minute
        self.repeatsDaily = repeatsDaily
        self.createdAt = createdAt
    }
}
