import SwiftUI

struct MenuView: View {
    @ObservedObject var store: ChatStore
    let offlineStatus: String
    let onNotifications: () -> Void
    let onClose: () -> Void

    var body: some View {
        NavigationStack {
            ZStack {
                Color.black.ignoresSafeArea()

                ScrollView(showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 20) {
                        Button {
                            store.newConversation()
                            onClose()
                        } label: {
                            Label("New conversation", systemImage: "plus")
                                .font(.system(size: 18, weight: .medium))
                                .foregroundStyle(.white)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(18)
                                .background(Color.white.opacity(0.08))
                                .clipShape(RoundedRectangle(cornerRadius: 18))
                        }
                        .buttonStyle(.plain)

                        Button(action: onNotifications) {
                            Label("Notifications", systemImage: "bell")
                                .font(.system(size: 18, weight: .medium))
                                .foregroundStyle(.white)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(18)
                                .background(Color.white.opacity(0.05))
                                .clipShape(RoundedRectangle(cornerRadius: 18))
                        }
                        .buttonStyle(.plain)

                        VStack(alignment: .leading, spacing: 8) {
                            Text("CACHE AI")
                                .font(.system(size: 12, weight: .semibold))
                                .tracking(1.5)
                                .foregroundStyle(.gray)
                            Text(offlineStatus)
                                .font(.system(size: 15))
                                .foregroundStyle(.white.opacity(0.78))
                            Text("No account • no API key • no first-launch download")
                                .font(.system(size: 13))
                                .foregroundStyle(.gray)
                        }
                        .padding(.horizontal, 4)

                        Text("RECENT CONVERSATIONS")
                            .font(.system(size: 12, weight: .semibold))
                            .tracking(1.5)
                            .foregroundStyle(.gray)
                            .padding(.top, 12)

                        ForEach(store.conversations) { conversation in
                            Button {
                                store.selectConversation(conversation)
                                onClose()
                            } label: {
                                VStack(alignment: .leading, spacing: 5) {
                                    Text(conversation.title)
                                        .font(.system(size: 16, weight: .medium))
                                        .foregroundStyle(.white)
                                        .lineLimit(1)
                                    Text(conversation.updatedAt.formatted(date: .abbreviated, time: .shortened))
                                        .font(.system(size: 12))
                                        .foregroundStyle(.gray)
                                }
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .padding(.vertical, 5)
                            }
                            .buttonStyle(.plain)
                            .contextMenu {
                                Button(role: .destructive) {
                                    store.deleteConversation(conversation)
                                } label: {
                                    Label("Delete", systemImage: "trash")
                                }
                            }
                        }
                    }
                    .padding(24)
                }
            }
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done", action: onClose)
                        .foregroundStyle(.white)
                }
            }
            .navigationTitle("CACHE")
            .navigationBarTitleDisplayMode(.inline)
        }
        .preferredColorScheme(.dark)
        .presentationDetents([.medium, .large])
    }
}
