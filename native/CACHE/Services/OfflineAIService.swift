import Foundation
import Combine

@MainActor
final class OfflineAIService: ObservableObject {
    @Published private(set) var statusText = "AI included • offline"
    @Published private(set) var isWorking = false
    let knowledge = LocalKnowledgeStore()
    private let engine = BundledModelEngine()

    func answer(history: [ChatMessage], onUpdate: @escaping @MainActor (String) -> Void) async -> String {
        isWorking = true
        statusText = "Thinking on this iPhone…"
        defer { isWorking = false }
        let query = history.last(where: { $0.role == .user })?.text ?? ""
        let references = knowledge.search(query, limit: 2)
        do {
            guard let url = Bundle.main.url(forResource: "cache-model", withExtension: "gguf") else {
                throw ModelError.missingAsset
            }
            let result = try await engine.generate(modelURL: url, history: history, references: references) { text in
                await onUpdate(text)
            }
            statusText = "AI included • offline"
            return result
        } catch is CancellationError {
            statusText = "Stopped • offline"
            return ""
        } catch {
            statusText = "AI unavailable • reference library available"
            let content = references.map { "\($0.title)\n\($0.content)" }.joined(separator: "\n\n")
            return "The included AI could not run: \(error.localizedDescription)\n\n" +
                (content.isEmpty ? "You can still browse Library offline." : "From the offline reference library:\n\n" + content)
        }
    }
}
