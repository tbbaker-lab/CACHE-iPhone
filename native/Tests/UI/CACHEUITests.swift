import XCTest

final class CACHEUITests: XCTestCase {
    @MainActor
    func testComposerSuggestionsLibraryAndHistory() throws {
        let app = XCUIApplication()
        app.launch()
        let newChat = app.buttons["New conversation"]
        XCTAssertTrue(newChat.waitForExistence(timeout: 15))
        newChat.tap()
        let editor = app.textViews["composer"]
        XCTAssertTrue(editor.waitForExistence(timeout: 5))
        let send = app.buttons["send"]
        XCTAssertFalse(send.isEnabled)
        editor.tap()
        editor.typeText("Hello CACHE")
        XCTAssertTrue(send.isEnabled)
        XCTAssertEqual(send.value as? String, "white")
        send.tap()
        XCTAssertFalse(app.buttons["starter-drop"].exists)
        if app.buttons["Stop response"].waitForExistence(timeout: 5) { app.buttons["Stop response"].tap() }
        app.buttons["Open menu"].tap()
        XCTAssertTrue(app.buttons["Notifications"].waitForExistence(timeout: 5))
        app.buttons["Notifications"].tap()
        XCTAssertTrue(app.buttons["Save reminder"].waitForExistence(timeout: 5))
        app.buttons["Done"].tap()
        app.buttons["Library"].tap()
        XCTAssertTrue(app.textFields["Search offline knowledge"].waitForExistence(timeout: 5))
        let shot = XCTAttachment(screenshot: app.screenshot())
        shot.name = "CACHE Library"
        shot.lifetime = .keepAlways
        add(shot)
    }
}
