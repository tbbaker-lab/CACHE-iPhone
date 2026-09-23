import SwiftUI

struct NotificationsView: View {
    @StateObject private var scheduler = NotificationScheduler()
    @Environment(\.dismiss) private var dismiss
    @State private var message = "Check your go-bag"
    @State private var time = Date().addingTimeInterval(3600)
    @State private var repeatsDaily = true
    @State private var feedback: String?

    var body: some View {
        NavigationStack {
            ZStack {
                Color.black.ignoresSafeArea()

                ScrollView(showsIndicators: false) {
                    VStack(alignment: .leading, spacing: 22) {
                        Text("Set a local reminder. CACHE schedules it on this iPhone, so it does not need an account or server.")
                            .font(.system(size: 16))
                            .foregroundStyle(.white.opacity(0.68))
                            .lineSpacing(4)

                        VStack(alignment: .leading, spacing: 12) {
                            Text("MESSAGE")
                                .font(.system(size: 11, weight: .semibold))
                                .tracking(1.4)
                                .foregroundStyle(.gray)
                            TextField("Reminder", text: $message)
                                .textFieldStyle(.plain)
                                .font(.system(size: 18))
                                .foregroundStyle(.white)
                                .padding(16)
                                .background(Color.white.opacity(0.06))
                                .clipShape(RoundedRectangle(cornerRadius: 16))
                        }

                        DatePicker("Time", selection: $time, displayedComponents: .hourAndMinute)
                            .foregroundStyle(.white)
                            .tint(.white)

                        Toggle("Repeat every day", isOn: $repeatsDaily)
                            .foregroundStyle(.white)
                            .tint(.white)

                        Button {
                            Task {
                                guard !message.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
                                let granted = await scheduler.requestAndAdd(message: message, time: time, repeatsDaily: repeatsDaily)
                                feedback = granted ? "Reminder saved on this iPhone." : "Allow notifications in Settings to save a reminder."
                            }
                        } label: {
                            Text("Save reminder")
                                .font(.system(size: 17, weight: .semibold))
                                .foregroundStyle(.black)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 16)
                                .background(Color.white)
                                .clipShape(RoundedRectangle(cornerRadius: 18))
                        }
                        .buttonStyle(.plain)

                        if let feedback {
                            Text(feedback)
                                .font(.system(size: 14))
                                .foregroundStyle(.gray)
                        }

                        if !scheduler.reminders.isEmpty {
                            Text("SCHEDULED")
                                .font(.system(size: 11, weight: .semibold))
                                .tracking(1.4)
                                .foregroundStyle(.gray)
                                .padding(.top, 8)

                            ForEach(scheduler.reminders) { reminder in
                                HStack {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(reminder.message)
                                            .foregroundStyle(.white)
                                        Text("\(reminder.timeText) • \(reminder.repeatsDaily ? "Daily" : "Once")")
                                            .font(.system(size: 13))
                                            .foregroundStyle(.gray)
                                    }
                                    Spacer()
                                    Button(role: .destructive) {
                                        Task { await scheduler.remove(reminder) }
                                    } label: {
                                        Image(systemName: "trash")
                                            .foregroundStyle(.white.opacity(0.7))
                                    }
                                    .buttonStyle(.plain)
                                }
                                .padding(.vertical, 8)
                            }
                        }
                    }
                    .padding(24)
                }
            }
            .navigationTitle("Notifications")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                        .foregroundStyle(.white)
                }
            }
        }
        .preferredColorScheme(.dark)
    }
}

private extension NotificationScheduler {
    func requestAndAdd(message: String, time: Date, repeatsDaily: Bool) async -> Bool {
        await requestAuthorization()
        guard authorization == .authorized || authorization == .provisional else { return false }
        return await add(message: message, time: time, repeatsDaily: repeatsDaily)
    }
}
