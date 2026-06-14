# Testing Guide (TESTING_GUIDE) 🧪

This guide outlines the testing structure, practices, and commands for the **Kota Pintar** application.

---

## 🏗️ Testing Architecture

We utilize automated testing to verify the backend logic and ensure the API behaves as expected:

1. **Unit Testing**: Tests individual business functions in isolation (e.g. priority scoring calculations, SLA determination, password hashing).
2. **Integration Testing**: Exercises HTTP routing, request parsing, database state mutations, and mock external API integrations (such as Gemini AI).
3. **Verification Suites**: Focuses on core endpoints like authentication, report submissions, commenting, voting, and WebSocket events.

---

## 🛠️ Testing Tools

- **pytest**: The primary test framework for running and asserting test cases.
- **requests**: Handled inside testing components to run HTTP requests against local running instances.
- **Mocking**: Used to intercept external Gemini AI API responses to prevent unnecessary charges and guarantee test stability.

---

## 🏃 Running Tests

### 1. Backend API Tests

Ensure the backend app dependencies are installed and the virtual environment is active before running tests.

To run the complete test suite:
```bash
cd backend
pytest tests/
```

To run a specific test file:
```bash
pytest tests/test_smartcity.py
```

To run tests with detailed output (verbose):
```bash
pytest -v tests/
```

---

## 📋 Coverage Areas

The following areas are covered by the test suite under [test_smartcity.py](file:///c:/All/VSC/Kabarin/backend/tests/test_smartcity.py):

- **Auth Pipeline**: Validates account registration, login verification, token generation, and role authorization limits.
- **Report Lifecycle**: Verifies report creation, priority score assignment, SLA timestamp generation, and transition between statuses (e.g. `Submitted` ➔ `Assigned` ➔ `In Progress` ➔ `Resolved`).
- **AI Classification Fallbacks**: Simulates failures of the Gemini API to verify that the backend successfully falls back to rule-based classification.
- **Interactions**: Asserts that upvoting/downvoting mechanics function properly (e.g. preventing self-upvoting) and comments are correctly appended to report records.
- **Notifications**: Verifies that database notifications are written to the collection during key report events.

---

## 🌐 Frontend Verification

For frontend visual verification:
- Components are equipped with `data-testid` attributes (see [testIds/index.js](file:///c:/All/VSC/Kabarin/frontend/src/constants/testIds/index.js)) to support end-to-end automation with testing frameworks like **Playwright** or **Selenium**.
