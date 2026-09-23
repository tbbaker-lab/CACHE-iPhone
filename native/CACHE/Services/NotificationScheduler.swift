import Foundation
import Combine
import UserNotifications

@MainActor
final class NotificationScheduler: ObservableObject {
    @Published private(set) var reminders: [Reminder] = []
    @Published private(set) var authorization: UNAuthorizationStatus = .notDetermined

    private let storageKey = "cache.reminders"

    init() {
        load()
        Task { await refreshAuthorization() }
    }

    func requestAuthorization() async {
        _ = try? await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge])
        await refreshAuthorization()
    }

    func refreshAuthorization() async {
        let settings = await UNUserNotificationCenter.current().notificationSettings()
        authorization = settings.authorizationStatus
    }

    func add(message: String, time: Date, repeatsDaily: Bool) async -> Bool {
        let components = Calendar.current.dateComponents([.hour, .minute], from: time)
        guard let hour = components.hour, let minute = components.minute else { return false }

        let reminder = Reminder(message: message, hour: hour, minute: minute, repeatsDaily: repeatsDaily)
        let content = UNMutableNotificationContent()
        content.title = "CACHE"
        content.body = message
        content.sound = .default

        var triggerComponents = DateComponents()
        triggerComponents.hour = hour
        triggerComponents.minute = minute

        if !repeatsDaily {
            let now = Date()
            let today = Calendar.current.date(bySettingHour: hour, minute: minute, second: 0, of: now) ?? now
            let next = today > now ? today : Calendar.current.date(byAdding: .day, value: 1, to: today) ?? today
            triggerComponents = Calendar.current.dateComponents([.year, .month, .day, .hour, .minute], from: next)
        }

        let trigger = UNCalendarNotificationTrigger(dateMatching: triggerComponents, repeats: repeatsDaily)
        let request = UNNotificationRequest(identifier: reminder.id.uuidString, content: content, trigger: trigger)

        do {
            try await UNUserNotificationCenter.current().add(request)
            reminders.insert(reminder, at: 0)
            save()
            return true
        } catch {
            return false
        }
    }

    func remove(_ reminder: Reminder) async {
        UNUserNotificationCenter.current().removePendingNotificationRequests(withIdentifiers: [reminder.id.uuidString])
        reminders.removeAll { $0.id == reminder.id }
        save()
    }

    private func load() {
        guard let data = UserDefaults.standard.data(forKey: storageKey),
              let decoded = try? JSONDecoder().decode([Reminder].self, from: data) else { return }
        reminders = decoded
    }

    private func save() {
        guard let data = try? JSONEncoder().encode(reminders) else { return }
        UserDefaults.standard.set(data, forKey: storageKey)
    }
}
