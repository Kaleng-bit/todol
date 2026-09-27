# Personal OS — Production Architecture & Setup Guide

Personal OS adalah web workspace produktivitas pribadi yang bersih dan minimalis dengan arsitektur cloud serverless, autentikasi Google Firebase, database Cloud Firestore terisolasi per akun, dan Google Gemini AI.

---

## 🏛️ Arsitektur Sistem

```text
Google Account
      ↓
Firebase Authentication (Google OAuth)
      ↓
Firebase User UID (Primary Identifier)
      ↓
Cloud Firestore (users/{uid})
      ├── /workspaces/{workspaceId}
      ├── /tasks/{taskId}
      ├── /notes/{noteId}
      ├── /calendarEvents/{eventId}
      ├── /reminders/{reminderId}
      └── /documents/eraserCanvas
      ↓
Personal OS Dashboard (macOS Clean Theme)
      ↓
Vercel Serverless Function (/api/gemini)
      ↓
Google Gemini 3.8 Flash (Context-Aware)
```

---

## 🚀 Langkah Konfigurasi (Manual Steps Required)

### 1. Firebase Console Setup
1. Kunjungi [Firebase Console](https://console.firebase.google.com/) dan buat project baru (atau gunakan project yang sudah ada).
2. **Aktifkan Google Authentication**:
   - Masuk ke menu **Build** > **Authentication** > **Sign-in method**.
   - Pilih **Google**, klik **Enable**, pilih email support project, lalu klik **Save**.
3. **Tambahkan Authorized Domains**:
   - Masuk ke **Authentication** > **Settings** > **Authorized domains**.
   - Pastikan domain production Anda sudah ditambahkan:
     - `todol-weld.vercel.app`
     - `localhost` (untuk pengetesan lokal)
4. **Buat Cloud Firestore Database**:
   - Masuk ke menu **Build** > **Firestore Database** > **Create database**.
   - Pilih mode **Production mode**, pilih lokasi terdekat (contoh: `asia-southeast2` Jakarta).
5. **Terapkan Firestore Security Rules**:
   - Buka tab **Rules** di Firestore Database.
   - Salin isi dari file `firestore.rules` yang ada di repository ini:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
         match /{allSubcollections=**} {
           allow read, write: if request.auth != null && request.auth.uid == userId;
         }
       }
       match /{document=**} {
         allow read, write: if false;
       }
     }
   }
   ```
   - Klik **Publish**.

6. **Dapatkan Firebase Web App Config**:
   - Buka **Project Settings** (ikon gerigi) > tab **General**.
   - Di bagian *Your apps*, pilih **Web app** (`</>`).
   - Salin nilai-nilai konfigurasi: `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`.

---

### 2. Google AI Studio (Gemini API Key)
1. Buka [Google AI Studio](https://aistudio.google.com/apikey).
2. Login dengan akun Google Anda dan klik **"Create API key"**.
3. Salin API key tersebut untuk digunakan di Vercel atau menu Settings.

---

### 3. Vercel Environment Variables
Buka dashboard project Anda di Vercel (`https://vercel.com`), pilih project **todol-weld**, buka **Settings** > **Environment Variables**, dan tambahkan variabel berikut (berlaku untuk Production, Preview, Development):

| Nama Variable | Deskripsi / Nilai Contoh |
|---|---|
| `FIREBASE_API_KEY` | `AIzaSy...` (dari Firebase Web App config) |
| `FIREBASE_AUTH_DOMAIN` | `project-id.firebaseapp.com` |
| `FIREBASE_PROJECT_ID` | `project-id` |
| `FIREBASE_STORAGE_BUCKET` | `project-id.appspot.com` |
| `FIREBASE_MESSAGING_SENDER_ID` | `123456789012` |
| `FIREBASE_APP_ID` | `1:123456789012:web:abcdef...` |
| `GEMINI_API_KEY` | `AIzaSy...` (dari Google AI Studio) |

Setelah menambahkan environment variable di Vercel, lakukan **Redeploy** di menu Deployments > Redeploy.

---

## 🛠️ Opsi Konfigurasi Cepat Langsung di UI Web
Aplikasi ini juga dilengkapi dengan **Setup Modal Pintar**:
- Jika Anda membuka website sebelum sempat mengatur Vercel Environment Variables, klik **Continue with Google** dan popup konfigurasi Firebase akan otomatis muncul.
- Anda dapat menempelkan konfigurasi Firebase langsung ke popup tersebut dan mengklik **Simpan & Aktifkan Firebase**. Konfigurasi akan tersimpan di browser Anda dan Google Login akan langsung aktif seketika!
- Di halaman **Settings**, Anda juga bisa memasukkan custom Gemini API Key kapan saja untuk pengetesan.

---

## 📋 Fitur Utama yang Telah Berfungsi
1. **Real Google Sign-In**: Menggunakan Google OAuth popup via Firebase Auth.
2. **User Profile**: Menyimpan profile di `users/{uid}` dengan nama Google, foto profil, dan email asli.
3. **Multi-Workspace**: Menambahkan, mengedit, menghapus, dan memilih workspace (Work, Personal, Freelance, dll.).
4. **Persistent Tasks (2-Kolom Kanban + Bank Data Vault)**: Status *Pending*, *On Progress*, dan *Done*. Task selesai otomatis diarsipkan ke Bank Data Vault dan dapat dipulihkan kapan saja.
5. **Persistent Calendar & Agenda**: Jadwal acara kalender dengan checklist centang selesai yang tersimpan di cloud.
6. **Persistent Reminders**: Pengingat personal tersimpan di cloud Firestore.
7. **Notes & Audio Transcripts**: Catatan yang dapat diedit kembali dan integrasi rekaman audio.
8. **Eraser AI Studio**: Live Markdown/Mermaid canvas dengan auto-save realtime ke Firestore.
9. **Context-Aware Gemini AI Assistant**: Membaca task, event, reminder, dan workspace pengguna yang terautentikasi untuk menjawab pertanyaan secara personal dan akurat.
10. **AI Daily Briefing**: Ringkasan harian cerdas menggunakan Gemini 3.8 Flash dengan fallback berbasis data Firestore jika AI offline.
