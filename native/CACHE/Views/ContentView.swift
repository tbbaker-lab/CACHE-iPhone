import SwiftUI

struct ContentView: View {
    @StateObject private var store = ChatStore()
    @StateObject private var ai = OfflineAIService()
    @State private var section: CACHESection = .chat
    @State private var draft = ""
    @State private var showMenu = false
    @State private var showNotifications = false
    @State private var openNotificationsAfterMenu = false
    @State private var generationTask: Task<Void, Never>?
    @Environment(\.scenePhase) private var scenePhase
    @FocusState private var composerFocused: Bool

    private let suggestions = [
        Suggestion(icon: "cross.case", title: "Emergency first aid guidance", prompt: "What are the first priorities for emergency first aid?"),
        Suggestion(icon: "drop", title: "Purify water safely", prompt: "How do I purify water safely in the wilderness?"),
        Suggestion(icon: "thermometer.medium", title: "Stay warm with limited supplies", prompt: "How do I stay warm with limited supplies outdoors?")
    ]

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()

            VStack(spacing: 0) {
                HeaderView(section: $section, onMenu: { showMenu = true }, onAdd: startNewConversation)

                if section == .chat {
                    chatBody
                } else {
                    LibraryView(knowledge: ai.knowledge)
                }
            }
        }
        .safeAreaInset(edge: .bottom, spacing: 0) {
            if section == .chat {
                VStack(spacing: 6) {
                    Text(ai.statusText).font(.caption2).foregroundStyle(.gray)
                    ComposerView(text: $draft, isWorking: generationTask != nil, focused: $composerFocused,
                                 onSend: send, onStop: { generationTask?.cancel() },
                                 onLibrary: { section = .library })
                }
                    .padding(.horizontal, 24)
                    .padding(.top, 8)
                    .padding(.bottom, 6)
                    .background(Color.black)
            }
        }
        .sheet(isPresented: $showMenu, onDismiss: {
            if openNotificationsAfterMenu {
                openNotificationsAfterMenu = false
                showNotifications = true
            }
        }) {
            MenuView(store: store, offlineStatus: ai.statusText, onNotifications: {
                showMenu = false
                openNotificationsAfterMenu = true
            }, onClose: { showMenu = false; section = .chat; composerFocused = true })
        }
        .sheet(isPresented: $showNotifications) {
            NotificationsView()
        }
        .onChange(of: scenePhase) { _, phase in
            if phase != .active { generationTask?.cancel() }
        }
    }

    private var chatBody: some View {
        GeometryReader { geometry in
        ScrollViewReader { proxy in
            ScrollView(showsIndicators: false) {
                VStack(spacing: 0) {
                    if store.activeMessages.isEmpty {
                        suggestionsView
                            .frame(maxWidth: .infinity, alignment: .bottom)
                    } else {
                        messageList
                            .padding(.top, 20)
                    }

                    if ai.isWorking {
                        HStack(spacing: 10) {
                            ProgressView().tint(.white)
                            Text("CACHE is thinking offline…")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundStyle(.gray)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 28)
                        .padding(.vertical, 16)
                    }
                }
                .frame(maxWidth: .infinity)
                .frame(minHeight: geometry.size.height, alignment: store.activeMessages.isEmpty ? .bottom : .top)
            }
            .contentShape(Rectangle())
            .onTapGesture { composerFocused = true }
            .onChange(of: store.activeMessages.last?.text) { _, _ in
                if let last = store.activeMessages.last {
                    withAnimation(.easeOut(duration: 0.25)) {
                        proxy.scrollTo(last.id, anchor: .bottom)
                    }
                }
            }
        }
        }
    }

    private var suggestionsView: some View {
        VStack(alignment: .leading, spacing: 20) {
            ForEach(suggestions) { suggestion in
                Button {
                    draft = suggestion.prompt
                    send()
                } label: {
                    HStack(spacing: 18) {
                        Image(systemName: suggestion.icon)
                            .font(.system(size: 23, weight: .regular))
                            .frame(width: 40)

                        Text(suggestion.title)
                            .font(.system(size: 19, weight: .regular))
                            .multilineTextAlignment(.leading)

                        Spacer(minLength: 0)
                    }
                    .foregroundStyle(.white.opacity(0.92))
                }
                .buttonStyle(.plain)
                .accessibilityIdentifier("starter-\(suggestion.icon)")
                .disabled(generationTask != nil)
            }
        }
        .padding(.horizontal, 42)
        .padding(.vertical, 22)
    }

    private var messageList: some View {
        LazyVStack(spacing: 14) {
            ForEach(store.activeMessages) { message in
                MessageBubble(message: message)
                    .id(message.id)
            }
        }
        .padding(.horizontal, 24)
        .padding(.bottom, 18)
    }

    private func send() {
        let text = draft.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !text.isEmpty, generationTask == nil,
              let conversationID = store.activeConversationID else { return }

        draft = ""
        composerFocused = true
        store.addMessage(role: .user, text: text)

        let history = store.activeMessages
        guard let replyID = store.addMessage(role: .assistant, text: "", conversationID: conversationID) else { return }
        generationTask = Task {
            let response = await ai.answer(history: history) { text in
                store.updateMessage(replyID, in: conversationID, text: text)
            }
            let final = response.isEmpty ? store.messageText(replyID, in: conversationID) : response
            store.updateMessage(replyID, in: conversationID, text: final.isEmpty ? "Response stopped." : final, persist: true)
            generationTask = nil
        }
    }

    private func startNewConversation() {
        store.newConversation()
        section = .chat
        draft = ""
        composerFocused = true
    }
}

private struct Suggestion: Identifiable {
    let id = UUID()
    let icon: String
    let title: String
    let prompt: String
}

private struct HeaderView: View {
    @Binding var section: CACHESection
    let onMenu: () -> Void
    let onAdd: () -> Void

    var body: some View {
        HStack(spacing: 16) {
            RoundButton(icon: "line.3.horizontal", action: onMenu)

            Picker("Section", selection: $section) {
                ForEach(CACHESection.allCases) { section in
                    Text(section.rawValue).tag(section)
                }
            }
            .pickerStyle(.segmented)
            .frame(maxWidth: .infinity)

            RoundButton(icon: "plus", action: onAdd)
        }
        .padding(.horizontal, 20)
        .frame(maxWidth: 520)
        .padding(.top, 10)
        .padding(.bottom, 18)
    }
}

private struct RoundButton: View {
    let icon: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 24, weight: .regular))
                .foregroundStyle(.white)
                .frame(width: 50, height: 50)
                .background(Color.white.opacity(0.045))
                .overlay(Circle().stroke(Color.white.opacity(0.18), lineWidth: 1.5))
                .clipShape(Circle())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(icon == "plus" ? "New conversation" : "Open menu")
    }
}

private struct MessageBubble: View {
    let message: ChatMessage

    var body: some View {
        HStack {
            if message.role == .user { Spacer(minLength: 34) }

            Text(message.text.isEmpty ? "…" : message.text.replacingOccurrences(of: "**", with: ""))
                .textSelection(.enabled)
                .font(.system(size: 18, weight: .regular))
                .foregroundStyle(.white)
                .lineSpacing(5)
                .padding(.horizontal, 22)
                .padding(.vertical, 17)
                .background(message.role == .user ? Color.white.opacity(0.16) : Color.white.opacity(0.045))
                .overlay(
                    RoundedRectangle(cornerRadius: 24)
                        .stroke(Color.white.opacity(message.role == .user ? 0 : 0.16), lineWidth: 1)
                )
                .clipShape(RoundedRectangle(cornerRadius: 24))

            if message.role == .assistant { Spacer(minLength: 34) }
        }
    }
}

private struct ComposerView: View {
    @Binding var text: String
    let isWorking: Bool
    var focused: FocusState<Bool>.Binding
    let onSend: () -> Void
    let onStop: () -> Void
    let onLibrary: () -> Void

    private var hasText: Bool { !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty }

    private var canSend: Bool {
        !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !isWorking
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            TextEditor(text: $text)
                .accessibilityIdentifier("composer")
                .focused(focused)
                .scrollContentBackground(.hidden)
                .foregroundStyle(.white)
                .font(.system(size: 19))
                .frame(height: 64)
                .overlay(alignment: .topLeading) {
                    if text.isEmpty {
                        Text("Ask CACHE")
                            .font(.system(size: 25, weight: .regular))
                            .foregroundStyle(.gray)
                            .padding(.top, 8)
                            .allowsHitTesting(false)
                    }
                }

            HStack {
                Button(action: onLibrary) {
                    Image(systemName: "plus")
                        .font(.system(size: 26, weight: .regular))
                }
                .buttonStyle(.plain)
                .foregroundStyle(.white)
                .accessibilityLabel("Open offline library")

                Image("CacheMark").resizable().scaledToFit().frame(width: 28, height: 28)

                Spacer()

                Button(action: isWorking ? onStop : onSend) {
                    Image(systemName: isWorking ? "stop.fill" : "arrow.up")
                        .font(.system(size: 24, weight: .semibold))
                        .foregroundStyle(hasText || isWorking ? .black : .black.opacity(0.55))
                        .frame(width: 60, height: 60)
                        .background(hasText || isWorking ? Color.white : Color.white.opacity(0.38))
                        .clipShape(Circle())
                }
                .buttonStyle(.plain)
                .disabled(!canSend && !isWorking)
                .accessibilityLabel(isWorking ? "Stop response" : "Send message")
                .accessibilityIdentifier("send")
                .accessibilityValue(hasText || isWorking ? "white" : "grey")
            }
        }
        .padding(.horizontal, 24)
        .padding(.top, 20)
        .padding(.bottom, 16)
        .background(Color.white.opacity(0.025))
        .overlay(RoundedRectangle(cornerRadius: 38).stroke(Color.white.opacity(0.2), lineWidth: 1.5))
        .clipShape(RoundedRectangle(cornerRadius: 38))
    }
}
