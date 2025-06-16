# SmartFlash - Platform Pembelajaran Flashcard Berbasis AI

## Deskripsi Singkat

SmartFlash adalah platform pembelajaran flashcard yang menggabungkan teknik spaced repetition tradisional dengan kemampuan AI modern untuk menciptakan lingkungan pembelajaran yang cerdas dan sosial.   Platform ini memungkinkan pengguna untuk membuat, mempelajari, dan berbagi deck flashcard dengan peningkatan AI, menggunakan algoritma spaced repetition untuk optimasi pembelajaran. 

## Fitur Utama Aplikasi

### 🔐 Sistem Autentikasi
- Login/Register dengan email dan password 
- Integrasi Google OAuth untuk login cepat 
- Manajemen JWT token untuk keamanan session

### 📚 Manajemen Deck Flashcard
- Buat, edit, dan hapus deck flashcard 
- Copy dan pindahkan flashcard antar deck layaknya menggunakan flashcard fisik

### 🔭 Eksplorasi Deck Publik
- Akses deck publik dari komunitas 
- Sistem upvote dan komentar untuk deck 
- Copy deck dari pengguna lain ke koleksi pribadi
- Memberi feedback atau komentar pada deck

### 🤖 Fitur AI dan Pembelajaran Cerdas
- Quiz mode dengan multiple choice yang dihasilkan AI 
- Algoritma spaced repetition (SM-2) untuk optimasi pembelajaran
- Analitik pembelajaran berdasarkan riwayat kuis

### 📊 Tracking dan Analitik
- Statistik pembelajaran personal 
- Progress mingguan dan riwayat pembelajaran 
- Rekomendasi pembelajaran yang dipersonalisasi


## Struktur Folder Proyek

```
BackendForSmartflash/
├── bin/
│   └── www                          # Entry point server
├── controllers/
│   ├── authController/
│   │   └── auth.js                  # Controller autentikasi
│   ├── deckController/
│   │   └── deck.js                  # Controller manajemen deck
│   └── flashcardController/
│       └── flashcard.js             # Controller flashcard & AI
├── middlewares/
│   └── auth.middleware.js           # Middleware JWT verification
├── routes/
│   ├── auth/
│   │   └── authRoutes.js           # Routes autentikasi
│   ├── deckRoutes.js               # Routes manajemen deck
│   └── flashcardRoutes.js          # Routes flashcard & quiz
├── prisma/
│   ├── schema.prisma               # Database schema
│   └── seed.js                     # Database seeder
├── package.json                    # Dependencies & scripts
└── README.md                       # Dokumentasi proyek
```

## Cara Instalasi & Menjalankan Aplikasi

### Prasyarat
- Node.js (versi 16 atau lebih baru)
- PostgreSQL database
- Git

### Langkah Instalasi

1. **Clone Repository**
   ```bash
   git clone https://github.com/cikinodapz/BackendForSmartflash.git
   cd BackendForSmartflash
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Setup Environment Variables**
   ```bash
   cp .env.example .env
   # Edit .env dengan konfigurasi database dan API keys
   ```

4. **Setup Database**
   ```bash
   npx prisma migrate dev
   ```

5. **Jalankan Database Seeder**
   ```bash
   npx prisma db seed
   ```

6. **Jalankan Development Server**
   ```bash
   npm run dev
   ```

7. **Jalankan Production Server**
   ```bash
   npm start
   ```

## Database Seeding

Proyek ini sudah dilengkapi dengan database seeder untuk membuat data awal pengembangan.

Seeder akan membuat 2 akun test:
- **Email**: `mugiwara@gmail.com`, **Password**: `password123`, **Nama**: "Daffa Gans"
- **Email**: `user2@example.com`, **Password**: `password123`, **Nama**: "123"

## Teknologi yang Digunakan

### Core Framework & Runtime
- **Express.js** (~4.16.1): Web application framework
- **Node.js**: JavaScript runtime environment
- **Prisma** (^6.8.2): Type-safe database ORM

### Database
- **PostgreSQL**: Primary database
- **@prisma/client** (^6.8.2): Database client

### Authentication & Security
- **jsonwebtoken** (^9.0.2): JWT token management
- **bcrypt** (^5.1.1): Password hashing
- **google-auth-library** (^9.15.1): Google OAuth integration

### AI Integration
- **@huggingface/inference** (^3.6.2): AI content generation
- **openai** (^5.0.1): Advanced AI features

### Utilities & Middleware
- **cors** (^2.8.5): Cross-origin resource sharing
- **multer** (^1.4.5): File upload handling
- **axios** (^1.8.4): HTTP client untuk external APIs

### Development Tools
- **nodemon** (^3.1.9): Development server dengan hot reload
- **morgan** (~1.9.1): HTTP request logger

## Frontend Aplikasi
- Akses source kode nya di repo berikut https://github.com/cikinodapz/FrontendForSmartflash.git 


