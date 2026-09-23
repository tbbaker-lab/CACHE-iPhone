import Foundation

struct LocalKnowledgeStore {
    let entries: [KnowledgeEntry]

    init(bundle: Bundle = .main) {
        guard let url = bundle.url(forResource: "knowledge", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let loaded = try? JSONDecoder().decode([KnowledgeEntry].self, from: data) else {
            entries = []
            return
        }
        entries = loaded
    }

    func search(_ query: String, limit: Int = 3) -> [KnowledgeEntry] {
        let tokens = tokenize(query)
        guard !tokens.isEmpty else { return Array(entries.prefix(limit)) }

        let ranked = entries.map { entry -> (KnowledgeEntry, Int) in
            let haystack = ([entry.title, entry.category] + entry.keywords + [entry.content])
                .joined(separator: " ")
                .lowercased()
            var score = 0
            for token in tokens {
                if entry.title.lowercased().contains(token) { score += 5 }
                if entry.category.lowercased().contains(token) { score += 3 }
                if entry.keywords.contains(where: { $0.lowercased().contains(token) }) { score += 4 }
                if haystack.contains(token) { score += 1 }
            }
            return (entry, score)
        }

        return ranked
            .filter { $0.1 > 0 }
            .sorted { $0.1 > $1.1 }
            .prefix(limit)
            .map(\.0)
    }

    private func tokenize(_ text: String) -> [String] {
        text.lowercased()
            .split { !$0.isLetter && !$0.isNumber }
            .map(String.init)
            .filter { $0.count > 2 }
    }
}
