# API Documentation (API_DOCUMENTATION) 📡

This document describes all REST API endpoints and WebSocket channels exposed by the **Kota Pintar** backend.

---

## 🌐 Base URL & Protocol

- **REST API Base URL**: `http://localhost:8001/api`
- **WebSocket Protocol URL**: `ws://localhost:8001/ws/{user_id}`
- **API Specification (Swagger UI)**: Available at `http://localhost:8001/docs` during local execution.

---

## 🔒 Authentication

Most endpoints require a JSON Web Token (JWT) sent via HTTP Header:
```http
Authorization: Bearer <jwt_token_here>
```

---

## 📋 Endpoint List

### 1. Authentication (`/auth`)

#### `POST /auth/register`
Creates a new user profile.
- **Request Body**:
  ```json
  {
    "name": "John Doe",
    "email": "john@email.com",
    "password": "Password123",
    "phone": "08123456789",
    "role": "citizen"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "id": "user-uuid-string",
    "name": "John Doe",
    "email": "john@email.com",
    "role": "citizen"
  }
  ```

#### `POST /auth/login`
Verifies credentials and returns a JWT token.
- **Request Body**:
  ```json
  {
    "email": "john@email.com",
    "password": "Password123"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer",
    "user": {
      "id": "user-uuid-string",
      "name": "John Doe",
      "role": "citizen",
      "email": "john@email.com"
    }
  }
  ```

---

### 2. Reports (`/reports`)

#### `POST /reports/create`
Submits a public issue report. Citizens can provide coordinates and optionally an image encoded in base64.
- **Headers**: JWT token required.
- **Request Body**:
  ```json
  {
    "title": "Lubang Besar di Jalan Sudirman",
    "description": "Ada lubang sedalam 15cm membahayakan pengendara motor di depan gedung X.",
    "latitude": -6.2201,
    "longitude": 106.8123,
    "address": "Jl. Jenderal Sudirman Kav. 21",
    "image_base64": "data:image/png;base64,iVBORw0KGgoAAA..."
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "id": "report-uuid",
    "title": "Lubang Besar di Jalan Sudirman",
    "category": "Kerusakan Jalan",
    "urgency": "Tinggi",
    "sentiment": "Keluhan",
    "priority_score": 82.5,
    "status": "AI Classified",
    "sla_deadline": "2026-06-16T21:41:54Z"
  }
  ```

#### `GET /reports/all`
Fetches a list of all reports across the system. Supports optional query parameters.
- **Query Params**: `status`, `category`, `department_id`, `urgency`
- **Response (200 OK)**: Array of report objects.

#### `PUT /reports/{id}/status`
Updates the status of a report. Requires `officer` or `admin` authorization.
- **Request Body**:
  ```json
  {
    "status": "In Progress",
    "note": "Tim perbaikan jalan sedang dikerahkan ke lokasi."
  }
  ```

---

### 3. Departments & Officers (`/departments`, `/officers`)

#### `POST /departments/create`
Creates a new government division. (Admin Only).
- **Request Body**:
  ```json
  {
    "name": "Dinas Kebersihan",
    "categories": ["Sampah", "Masalah Lingkungan"],
    "contact": "021-123456"
  }
  ```

#### `POST /officers/create`
Registers a new officer and assigns them to a department. (Admin Only).
- **Request Body**:
  ```json
  {
    "name": "Ahmad Officer",
    "email": "officer@kotapintar.id",
    "password": "Petugas@123",
    "phone": "081223344",
    "department_id": "dept-uuid-here"
  }
  ```

---

### 4. WebSockets (`/ws/{user_id}`)

Enables real-time push events to client dashboards.
- **Connection Handshake**: `ws://localhost:8001/ws/{user_id}`
- **Outbound Server Event Payload**:
  ```json
  {
    "type": "status_update",
    "report_id": "report-uuid",
    "new_status": "Resolved",
    "message": "Laporan 'Lubang Besar' Anda telah ditandai selesai."
  }
  ```

---

## ⚠️ Error Handling

Errors follow the FastAPI standard response format:
```json
{
  "detail": "Error explanation string"
}
```
Common status codes:
- `400 Bad Request`: Validation failure or bad input format.
- `401 Unauthorized`: Invalid or expired JWT token.
- `403 Forbidden`: User does not possess the correct RBAC role.
- `444 Not Found`: Entity (e.g., report ID) does not exist in the database.
