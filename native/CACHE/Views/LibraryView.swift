import SwiftUI

struct LibraryView: View {
    let knowledge: LocalKnowledgeStore
    @State private var searchText = ""

    private var results: [KnowledgeEntry] {
        searchText.isEmpty ? knowledge.entries : knowledge.search(searchText, limit: 20)
    }

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: 20) {
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundStyle(.gray)
                    TextField("Search offline knowledge", text: $searchText)
                        .textInputAutocapitalization(.never)
                        .foregroundStyle(.white)
                }
                .padding(.horizontal, 18)
                .padding(.vertical, 14)
                .background(Color.white.opacity(0.05))
                .clipShape(RoundedRectangle(cornerRadius: 18))

                Text("BUNDLED REFERENCE")
                    .font(.system(size: 12, weight: .semibold))
                    .tracking(1.4)
                    .foregroundStyle(.gray)

                ForEach(results) { entry in
                    VStack(alignment: .leading, spacing: 7) {
                        HStack {
                            Text(entry.title)
                                .font(.system(size: 19, weight: .medium))
                            Spacer()
                            Text(entry.category.uppercased())
                                .font(.system(size: 10, weight: .semibold))
                                .tracking(1)
                                .foregroundStyle(.gray)
                        }
                        Text(entry.content)
                            .font(.system(size: 15))
                            .foregroundStyle(.white.opacity(0.68))
                            .lineLimit(4)
                    }
                    .foregroundStyle(.white)
                    .padding(.vertical, 8)
                }
            }
            .padding(.horizontal, 28)
            .padding(.top, 18)
            .padding(.bottom, 30)
        }
    }
}
