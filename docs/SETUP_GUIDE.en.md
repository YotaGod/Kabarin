# Installation & Setup Guide (SETUP_GUIDE) ⚙️

This guide explains the step-by-step procedure to set up a local development environment for the **Kota Pintar** project.

---

## 📋 Prerequisites

Before starting, ensure you have the following installed on your machine:
- **Python**: Version 3.11 or higher
- **Node.js**: Version 18 or higher (along with `npm` or `yarn`)
- **MongoDB**: A local MongoDB Server running on the default port (`27017`) or an active MongoDB Atlas instance.
- **Git**: Installed for repository cloning.

---

## 🛠️ Step 1: Clone the Repository

Clone the project from GitHub and navigate to the project root directory:
```bash
git clone https://github.com/YotaGod/Kabarin.git
cd Kabarin
```

---

## 🐍 Step 2: Backend Setup (FastAPI)

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Create a Python virtual environment**:
   ```bash
   python -m venv venv
   ```

3. **Activate the virtual environment**:
   - **Windows (PowerShell)**:
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   - **Linux / macOS**:
     ```bash
     source venv/bin/activate
     ```

4. **Install all Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

5. **Create the environment file (.env)**:
   Create a `.env` file inside the `backend/` folder and populate it with:
   ```ini
   MONGO_URL=mongodb://localhost:27017/smartcity
   DB_NAME=smartcity
   JWT_SECRET=your-super-secret-jwt-key
   GEMINI_API_KEY=AIzaSyYourGeminiApiKeyHere
   EMERGENT_LLM_KEY=your-emergent-universal-key
   STORAGE_PATH=C:/All/VSC/Kabarin/backend/storage
   ```
   > [!NOTE]
   > Replace `GEMINI_API_KEY` with your actual Google AI Studio API key for the AI-based auto-classification to work. If left empty, the system automatically falls back to rule-based classification.

6. **Start the Backend Server**:
   ```bash
   python server.py
   ```
   By default, the FastAPI backend will run on port `8001` (`http://localhost:8001`). You can inspect the interactive Swagger API documentation at `http://localhost:8001/docs`.

---

## 💻 Step 3: Frontend Setup (React)

1. **Open a new terminal and navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install JavaScript dependencies**:
   ```bash
   npm install
   # or if using yarn:
   yarn install
   ```

3. **Create the environment file (.env)**:
   Create a `.env` file inside the `frontend/` folder with:
   ```ini
   REACT_APP_BACKEND_URL=http://localhost:8001
   REACT_APP_WS_URL=ws://localhost:8001/ws
   ```

4. **Start the React Development Server**:
   ```bash
   npm run start
   # or with yarn:
   yarn start
   ```
   The React application will launch in your browser at `http://localhost:3000`.

---

## 💾 Step 4: Seeding the Database (Initial Demo Data)

To populate the database with mock data (departments, routing rules, officers, and initial sample reports):

1. Ensure your backend server is running (`python server.py` on port `8001`).
2. Trigger the seeding HTTP POST request using cURL, Postman, or your browser:
   - **Using cURL**:
     ```bash
     curl -X POST http://localhost:8001/api/auth/seed
     ```
3. The seeding script will automatically insert:
   - Admin account: `admin@kotapintar.id` (Password: `Admin@12345`)
   - Citizen demo account: `warga@kotapintar.id` (Password: `Warga@123`)
   - 10 Department Officer accounts (e.g. Public Works, Health, Sanitation) with the default password `Petugas@123`.
   - 20 mock citizens.
   - Initial routing rules & default SLA hours.

---

## 🔍 Verification & Testing

To confirm everything works correctly:
- Open `http://localhost:3000` and login using the citizen account (`warga@kotapintar.id` / `Warga@123`).
- Submit a mock report. Verify that its status is set to "AI Classified" and it is correctly routed to the respective department (inspectable via the admin panel `admin@kotapintar.id`).
- Run the backend test suite:
  ```bash
  pytest tests/
  ```
