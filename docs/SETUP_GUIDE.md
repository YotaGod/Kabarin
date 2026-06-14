# Panduan Instalasi & Setup (SETUP_GUIDE) ⚙️

Panduan ini menjelaskan langkah-langkah untuk menyiapkan lingkungan pengembangan (development environment) untuk proyek **Kota Pintar** di komputer lokal Anda.

---

## 📋 Prasyarat Sistem

Sebelum memulai, pastikan perangkat Anda telah terpasang aplikasi berikut:
- **Python**: Versi 3.11 atau lebih tinggi
- **Node.js**: Versi 18 atau lebih tinggi (disertai `npm` atau `yarn`)
- **MongoDB**: MongoDB Server lokal berjalan pada port default (`27017`) atau instance MongoDB Atlas.
- **Git**: Untuk clone repositori.

---

## 🛠️ Langkah 1: Persiapan Awal

Clone repositori dari GitHub dan masuk ke direktori root proyek:
```bash
git clone https://github.com/YotaGod/Kabarin.git
cd Kabarin
```

---

## 🐍 Langkah 2: Setup Backend (FastAPI)

1. **Masuk ke direktori backend**:
   ```bash
   cd backend
   ```

2. **Buat virtual environment Python**:
   ```bash
   python -m venv venv
   ```

3. **Aktifkan virtual environment**:
   - **Windows (PowerShell)**:
     ```powershell
     .\venv\Scripts\Activate.ps1
     ```
   - **Linux / macOS**:
     ```bash
     source venv/bin/activate
     ```

4. **Instal seluruh dependensi Python**:
   ```bash
   pip install -r requirements.txt
   ```

5. **Buat file konfigurasi lingkungan (.env)**:
   Buat file `.env` di dalam folder `backend/` dan sesuaikan nilainya:
   ```ini
   MONGO_URL=mongodb://localhost:27017/smartcity
   DB_NAME=smartcity
   JWT_SECRET=your-super-secret-jwt-key
   GEMINI_API_KEY=AIzaSyYourGeminiApiKeyHere
   EMERGENT_LLM_KEY=your-emergent-universal-key
   STORAGE_PATH=C:/All/VSC/Kabarin/backend/storage
   ```
   > [!NOTE]
   > Gantilah `GEMINI_API_KEY` dengan API key Google AI Studio Anda yang valid agar klasifikasi AI dapat berfungsi. Jika kosong, sistem akan menggunakan modul fallback berbasis aturan (rule-based).

6. **Jalankan Backend Server**:
   ```bash
   python server.py
   ```
   Server backend secara default akan berjalan di port `8001` (URL: `http://localhost:8001`). Anda dapat melihat dokumentasi API interaktif Swagger di `http://localhost:8001/docs`.

---

## 💻 Langkah 3: Setup Frontend (React)

1. **Buka terminal baru, masuk ke direktori frontend**:
   ```bash
   cd frontend
   ```

2. **Instal dependensi JavaScript**:
   ```bash
   npm install
   # atau jika menggunakan yarn:
   yarn install
   ```

3. **Buat file konfigurasi lingkungan (.env)**:
   Buat file `.env` di dalam folder `frontend/` dan isi dengan konfigurasi berikut:
   ```ini
   REACT_APP_BACKEND_URL=http://localhost:8001
   REACT_APP_WS_URL=ws://localhost:8001/ws
   ```

4. **Jalankan Development Server**:
   ```bash
   npm run start
   # atau dengan yarn:
   yarn start
   ```
   Aplikasi frontend React akan berjalan di browser pada alamat `http://localhost:3000`.

---

## 💾 Langkah 4: Seeding Database (Inisialisasi Data Demo)

Agar sistem memiliki data simulasi (seperti daftar kategori dinas, akun petugas, dan data laporan contoh), Anda harus melakukan *seeding database*:

1. Pastikan server backend Anda sedang berjalan (`python server.py` di port `8001`).
2. Kirim request HTTP POST ke endpoint seeding menggunakan tools seperti cURL, Postman, atau browser Anda:
   - **Menggunakan cURL**:
     ```bash
     curl -X POST http://localhost:8001/api/auth/seed
     ```
3. Endpoint ini secara otomatis akan membuat:
   - Akun Admin: `admin@kotapintar.id` (Password: `Admin@12345`)
   - Akun Warga Demo: `warga@kotapintar.id` (Password: `Warga@123`)
   - 10 Akun Petugas Dinas (Dinas Pekerjaan Umum, Dinas Kebersihan, dll.) dengan password default `Petugas@123`.
   - 20 akun warga simulasi.
   - Aturan perutean (routing rules) dinas & SLA awal.

---

## 🔍 Verifikasi & Pengujian

Untuk memastikan instalasi berhasil:
- Buka `http://localhost:3000` di browser dan coba masuk menggunakan akun demo warga (`warga@kotapintar.id` / `Warga@123`).
- Cobalah membuat satu laporan baru di menu pelaporan. Pastikan status laporan berubah menjadi "AI Classified" dan ter-assign ke dinas yang sesuai (Anda bisa melihatnya di dashboard admin `admin@kotapintar.id`).
- Untuk memastikan fungsi testing berjalan dengan baik, Anda dapat menjalankan perintah berikut di folder root backend:
  ```bash
  pytest tests/
  ```
