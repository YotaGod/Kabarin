# Security Policy & Guidelines (SECURITY) 🔒

This document outlines the security policies, access controls, encryption standards, and threat prevention measures implemented in **Kota Pintar**.

---

## 🛡️ Security Policy

We are committed to maintaining the confidentiality, integrity, and availability of our public data. If you discover a vulnerability, please report it immediately as outlined in the [Vulnerability Reporting](#-vulnerability-reporting) section below.

---

## 🔒 Authentication Security

### Hashing Strategy
- All user passwords are encrypted before storage using the `bcrypt` hashing algorithm with a salt cost factor of 12 rounds.
- Raw passwords are never stored in the database or exposed via API payloads.

### JSON Web Tokens (JWT)
- Authenticated client sessions rely on signed HS256 JWTs.
- Token claims are configured with short-lived expiration windows (default: 168 hours/7 days, configurable via `JWT_EXPIRY_HOURS`).
- Fallback JWT keys are restricted to development mode. In production, a secure cryptographic random key must be passed via `JWT_SECRET`.

---

## 🛡️ Authorization & Access Control (RBAC)

API routes are secured with layered dependency injections verifying user roles:

- **Citizen Level**: Access limited to creating new reports, updating their own reports, viewing the interactive city map, upvoting other reports, and commenting.
- **Officer Level**: Access restricted to operations inside their specific department context. Officers cannot alter administrative routing rules or modify other departments.
- **Admin Level**: Absolute control. Admins manage department structures, create new personnel accounts, adjust SLA configurations, and pull KPI logs.

---

## ⚙️ Environment Variable Security

To prevent sensitive information exposure:
1. Files containing credentials, secrets, or API tokens (e.g. `.env`, `credentials.json`, private keys) must **never** be committed to Git.
2. The root [.gitignore](./.gitignore) actively ignores all `.env` files and `credentials.json` formats.
3. Fallback secrets are strictly for developer convenience during local setup and will fail safe in production when correct variables are omitted.

---

## 🐳 Deployment & Network Security

- **Cross-Origin Resource Sharing (CORS)**: The FastAPI server limits API responses to allowed origins. In production, `allow_origins` must be changed from `*` to specific client domains.
- **Image Validation**: Uploaded media base64 strings are validated on the backend to prevent arbitrary file execution attacks. Only recognized media types (JPEG, PNG) are parsed and stored.
- **Input Sanitization**: Pydantic schemas validate all payload structures. SQL injection is mitigated because MongoDB queries are serialized object keys rather than raw query strings.

---

## 📞 Vulnerability Reporting

If you locate a security loophole or vulnerability:
1. **Do not** open a public issue on GitHub.
2. Send a detailed report describing the vulnerability and reproduction steps to **security@kotapintar.id**.
3. We aim to acknowledge reports within 48 hours and provide a resolution patch within 7 days.
