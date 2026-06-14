[🇮🇩 Bahasa Indonesia](./README.md) | 🇺🇸 English

# Kota Pintar (Smart City) 🏙️

![Smart City Banner](./Preview/banner.png)

[![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=flat&logo=mongodb)](https://www.mongodb.com/)
[![Gemini](https://img.shields.io/badge/Gemini_AI-8E75C2?style=flat&logo=google-gemini)](https://deepmind.google/technologies/gemini/)

**Kota Pintar** is an integrated public issue reporting platform designed to bridge communication between citizens and city government agencies. Leveraging artificial intelligence (Gemini AI), the system automatically classifies reports and dynamically routes (smart routing) them to the relevant department in real-time.

---

## 🚀 Key Features

- **AI-Powered Reporting**: Citizens can submit reports with photos and GPS locations. Gemini AI analyzes both text and images to automatically determine report categories, urgency levels, sentiments, and summaries.
- **Smart Routing & SLA**: Reports are automatically dispatched to the matching department (e.g., Department of Public Works for road damages) with dynamically calculated service level agreement (SLA) resolution deadlines.
- **Interactive City Map**: Real-time report visualization across the city utilizing Leaflet Map with color-coded markers based on urgency levels.
- **Multi-Role Dashboard**:
  - **Citizens**: Submit reports, track resolution progress, upvote common issues, and engage in threaded comment discussions.
  - **Officers**: Manage assigned tasks, update work progress, and post resolution updates.
  - **Admins**: Manage departments, officers, automatic routing rules, and view city KPI analytics.
- **Real-Time Notifications**: Instant two-way communication using the WebSocket protocol for real-time status updates and comments.

---

## 📸 Application Screenshots

Here are the 4 primary interfaces of the **Kota Pintar** application:

| Landing Page | Citizen Dashboard |
|---|---|
| ![Landing Page](./Preview/Landing%20Page.jpeg) | ![Citizen Dashboard](./Preview/Dashboard%20Citizen.jpeg) |
| **Interactive Map (Leaflet)** | **Report Queue (Admin)** |
| ![Interactive Map](./Preview/Page%20Interactive%20Map.jpeg) | ![Report Queue](./Preview/Page%20Queue%20Report.jpeg) |

---

## 🛠️ Tech Stack

### Frontend
- **React 18** (Single Page Application)
- **Tailwind CSS** (Modern responsive design)
- **Leaflet & React-Leaflet** (Interactive map engine)
- **Axios & WebSocket API** (Data synchronization)

### Backend
- **FastAPI** (Python async framework)
- **Pydantic** (Data validation schemas)
- **Motor** (Async MongoDB Driver)
- **Google Gemini AI** (LLM-based classification & computer vision)

### Database & OS
- **MongoDB** (NoSQL Document Store)
- **Supervisor** (Process control manager)
- **Docker & Kubernetes** (Production-ready orchestration)

---

## 📁 Project Structure

```
/
├── backend/                  # FastAPI Application
│   ├── server.py             # Entrypoint & REST/WS API
│   ├── auth.py               # JWT & bcrypt Authentication
│   ├── ai_service.py         # Gemini AI Integration
│   ├── storage_client.py     # Local Media Storage
│   ├── models.py             # Pydantic Schemas
│   └── tests/                # Unit & Integration Tests
│
├── frontend/                 # React SPA Application
│   ├── public/               # Static HTML Assets
│   ├── src/                  # React Source Code
│   │   ├── components/       # Reusable UI Components
│   │   ├── pages/            # View Pages & Dashboards
│   │   ├── lib/              # API, Auth & WS Helpers
│   │   └── hooks/            # Custom Hooks
│   └── package.json          # Package Dependencies
│
└── tests/                    # Global Test Configuration
```

---

## 🔧 Quick Start Guide

For detailed environmental setups and configurations, please refer to [SETUP_GUIDE.md](./docs/SETUP_GUIDE.md).

### Prerequisites
- Python 3.11+
- Node.js 18+
- Active MongoDB Server

### Execution Steps

1. **Clone the repository and navigate to the project directory**:
   ```bash
   git clone https://github.com/YotaGod/Kabarin.git
   cd Kabarin
   ```

2. **Run the Backend**:
   ```bash
   cd backend
   pip install -r requirements.txt
   # Set up your .env file
   python server.py
   ```

3. **Run the Frontend**:
   ```bash
   cd ../frontend
   npm install
   # Set up your .env file
   npm run start
   ```

---

## 📚 Related Documentation

For an in-depth understanding of the architecture, deployment, and APIs, refer to the following documents:

- [SETUP_GUIDE.md](./docs/SETUP_GUIDE.md) - Setup, installation, and database seeding guide (ID).
- [SETUP_GUIDE.en.md](./docs/SETUP_GUIDE.en.md) - Setup, installation, and database seeding guide (EN).
- [ARCHITECTURE.md](./docs/ARCHITECTURE.md) - System design details, database, and Mermaid diagrams.
- [API_DOCUMENTATION.md](./docs/API_DOCUMENTATION.md) - Full specification of REST & WebSocket endpoints.
- [SECURITY.md](./docs/SECURITY.md) - Security policies, encryption, and RBAC guidelines.
- [TESTING_GUIDE.md](./docs/TESTING_GUIDE.md) - Test execution protocols with Pytest.
- [MAINTENANCE_GUIDE.md](./docs/MAINTENANCE_GUIDE.md) - Operational guidelines, backup schedules, and logging.
- [ROADMAP.md](./docs/ROADMAP.md) - Future development phases and ideas.
