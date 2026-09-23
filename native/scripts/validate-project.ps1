$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$required = @(
  'CACHE.xcodeproj/project.pbxproj',
  'CACHE/CACHEApp.swift',
  'CACHE/Views/ContentView.swift',
  'CACHE/Views/LibraryView.swift',
  'CACHE/Views/MenuView.swift',
  'CACHE/Views/NotificationsView.swift',
  'CACHE/Services/ChatStore.swift',
  'CACHE/Services/LocalKnowledgeStore.swift',
  'CACHE/Services/OfflineAIService.swift',
  'CACHE/Services/NotificationScheduler.swift',
  'CACHE/Resources/knowledge.json',
  'CACHE/Resources/cache-model-manifest.json',
  'Info.plist'
)

foreach ($path in $required) {
  if (-not (Test-Path (Join-Path $root $path))) { throw "Missing required file: $path" }
}

$knowledge = Get-Content (Join-Path $root 'CACHE/Resources/knowledge.json') -Raw | ConvertFrom-Json
if ($knowledge.Count -lt 8) { throw 'Knowledge bundle is unexpectedly small.' }

$content = Get-Content (Join-Path $root 'CACHE/Views/ContentView.swift') -Raw
foreach ($marker in @('Color.white', 'store.activeMessages', 'store.addMessage', 'suggestionsView', 'TextEditor', 'canSend', 'safeAreaInset')) {
  if ($content -notmatch [regex]::Escape($marker)) { throw "Interaction marker missing: $marker" }
}

$storeContent = Get-Content (Join-Path $root 'CACHE/Services/ChatStore.swift') -Raw
foreach ($marker in @('applicationSupportDirectory', 'conversations.json', 'JSONEncoder.cache', 'newConversation')) {
  if ($storeContent -notmatch [regex]::Escape($marker)) { throw "Persistence marker missing: $marker" }
}

$notificationContent = Get-Content (Join-Path $root 'CACHE/Services/NotificationScheduler.swift') -Raw
foreach ($marker in @('UNUserNotificationCenter', 'UNCalendarNotificationTrigger', 'removePendingNotificationRequests')) {
  if ($notificationContent -notmatch [regex]::Escape($marker)) { throw "Notification marker missing: $marker" }
}

$manifest = Get-Content (Join-Path $root 'CACHE/Resources/cache-model-manifest.json') -Raw | ConvertFrom-Json
if ($manifest.downloadPolicy -ne 'never') { throw 'Model download policy must remain never.' }

Write-Output "CACHE project validation passed: $($knowledge.Count) bundled knowledge entries; no model download path."
python (Join-Path $root 'scripts/verify_assets.py')
if ($LASTEXITCODE -ne 0) { throw 'Bundled asset verification failed.' }
