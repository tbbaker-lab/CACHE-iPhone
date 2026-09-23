import Foundation
import Combine

@MainActor
final class ChatStore: ObservableObject {
    @Published private(set) var conversations: [Conversation] = []
    @Published private(set) var activeConversationID: UUID?

    private let fileURL: URL

    init(directory: URL? = nil) {
        let appSupport = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask).first!
        let cacheFolder = directory ?? appSupport.appendingPathComponent("CACHE", isDirectory: true)
        try? FileManager.default.createDirectory(at: cacheFolder, withIntermediateDirectories: true)
        fileURL = cacheFolder.appendingPathComponent("conversations.json")
        load()
    }

    var activeConversation: Conversation? {
        guard let activeConversationID else { return nil }
        return conversations.first(where: { $0.id == activeConversationID })
    }

    var activeMessages: [ChatMessage] {
        activeConversation?.messages ?? []
    }

    func load() {
        guard let data = try? Data(contentsOf: fileURL),
              let decoded = try? JSONDecoder.cache.decode([Conversation].self, from: data),
              !decoded.isEmpty else {
            let conversation = Conversation()
            conversations = [conversation]
            activeConversationID = conversation.id
            save()
            return
        }

        conversations = decoded.sorted { $0.updatedAt > $1.updatedAt }
        activeConversationID = conversations.first?.id
    }

    func newConversation() {
        let conversation = Conversation()
        conversations.insert(conversation, at: 0)
        activeConversationID = conversation.id
        save()
    }

    func selectConversation(_ conversation: Conversation) {
        activeConversationID = conversation.id
    }

    @discardableResult
    func addMessage(role: ChatMessage.Role, text: String, conversationID: UUID? = nil) -> UUID? {
        guard let targetID = conversationID ?? activeConversationID,
              let index = conversations.firstIndex(where: { $0.id == targetID }) else { return nil }

        let message = ChatMessage(role: role, text: text)
        conversations[index].messages.append(message)
        conversations[index].updatedAt = .now

        if role == .user && conversations[index].title == "New conversation" {
            let trimmed = text.trimmingCharacters(in: .whitespacesAndNewlines)
            conversations[index].title = String(trimmed.prefix(42))
        }

        conversations.sort { $0.updatedAt > $1.updatedAt }
        save()
        return message.id
    }

    func updateMessage(_ id: UUID, in conversationID: UUID, text: String, persist: Bool = false) {
        guard let c = conversations.firstIndex(where: { $0.id == conversationID }),
              let m = conversations[c].messages.firstIndex(where: { $0.id == id }) else { return }
        conversations[c].messages[m].text = text
        if persist { save() }
    }

    func messageText(_ id: UUID, in conversationID: UUID) -> String {
        conversations.first(where: { $0.id == conversationID })?.messages.first(where: { $0.id == id })?.text ?? ""
    }

    func deleteConversation(_ conversation: Conversation) {
        conversations.removeAll { $0.id == conversation.id }
        if conversations.isEmpty {
            newConversation()
        } else if activeConversationID == conversation.id {
            activeConversationID = conversations[0].id
            save()
        } else {
            save()
        }
    }

    private func save() {
        guard let data = try? JSONEncoder.cache.encode(conversations) else { return }
        try? data.write(to: fileURL, options: .atomic)
    }
}

private extension JSONEncoder {
    static var cache: JSONEncoder {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = [.sortedKeys]
        return encoder
    }
}

private extension JSONDecoder {
    static var cache: JSONDecoder {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return decoder
    }
}
