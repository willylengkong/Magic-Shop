# Magic Shop 🎮

Aplikasi toko item game berbasis web dengan dashboard admin dan member. Dibangun menggunakan **FastAPI** (backend) dan **HTML/CSS/Vanilla JS** (frontend) dengan database **MySQL**.

---

## Struktur Project

```
Magic-Shop/
├── backend/
│   ├── main.py                  # Entry point FastAPI
│   ├── database.py              # Koneksi MySQL & helper functions
│   ├── requirements.txt         # Python dependencies
│   ├── Dockerfile               # Docker config backend
│   ├── routers/
│   │   ├── auth.py              # Autentikasi (login, register, logout)
│   │   ├── admin.py             # Endpoint khusus admin
│   │   ├── member.py            # Endpoint khusus member
│   │   ├── orders.py            # Manajemen order
│   │   └── stocks.py            # Manajemen stok
│   ├── schemas/
│   │   ├── auth.py              # Pydantic model auth
│   │   ├── balance.py           # Pydantic model saldo
│   │   ├── items.py             # Pydantic model item
│   │   ├── orders.py            # Pydantic model order
│   │   └── stocks.py            # Pydantic model stok
│   └── utils/
│       └── password.py          # Bcrypt password hashing
└── frontend/
    ├── index.html               # Halaman login
    ├── register.html            # Halaman registrasi
    ├── home.html                # Dashboard member
    ├── admin.html               # Dashboard admin
    ├── css/
    │   ├── style.css            # Style global (login & register)
    │   ├── admin.css            # Style dashboard admin
    │   └── member.css           # Style dashboard member
    └── Js/
        ├── config.js            # Konfigurasi BASE_URL API
        ├── auth.js              # Logic login & registrasi
        ├── admin.js             # Logic dashboard admin
        └── member.js            # Logic dashboard member
```

---

## Fitur

### 👤 Member

- Login & registrasi akun
- Lihat daftar produk (horizontal card carousel)
- Tambah produk ke keranjang belanja
- Update quantity / hapus item dari keranjang
- Checkout dengan validasi saldo
- Top Up saldo (simulasi)
- Riwayat order

### 🔐 Admin

- Dashboard overview (saldo kas, total revenue, total stok, total member)
- History penjualan dengan filter tanggal
- Manajemen stok barang (search, restock beli, tambah manual)
- Data member (search nama/email)
- Set saldo kas toko

---

## Tech Stack

| Layer    | Teknologi                       |
| -------- | ------------------------------- |
| Backend  | FastAPI, Python 3.11+           |
| Database | MySQL (tanpa ORM)               |
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Password | Bcrypt (passlib)                |
| Server   | Uvicorn                         |

---

## Setup & Cara Menjalankan

### 1. Clone & masuk ke folder backend

```bash
git clone <repo-url>
cd Magic-Shop/backend
```

### 2. Buat virtual environment & install dependencies

```bash
python -m venv venv
venv\Scripts\activate        # Windows
# atau
source venv/bin/activate     # Linux/Mac

pip install -r requirements.txt
```

### 3. Setup Database MySQL

Buat database dan jalankan schema:

```sql
CREATE DATABASE game_store_db2;
```

Kemudian buat tabel berikut (jalankan di MySQL Workbench atau client lainnya):

```sql
-- Tambah kolom role_id (1=admin, 2=member)
ALTER TABLE users ADD COLUMN role_id INT NOT NULL DEFAULT 2;

-- Tambah kolom balance untuk saldo member
ALTER TABLE users ADD COLUMN balance DECIMAL(15,2) DEFAULT 0;

-- Set akun admin
UPDATE users SET role_id = 1 WHERE email = 'email_admin@example.com';
```

### 4. Konfigurasi koneksi database

Edit `backend/database.py`:

```python
DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "",        # sesuaikan password MySQL Anda
    "database": "game_store_db2",
    "port": 3306
}
```

### 5. Jalankan backend

```bash
cd backend
uvicorn main:app --reload --port 8000
```

### 6. Jalankan frontend

Buka folder `frontend/` dengan Live Server (VS Code) atau server statis lain di port **5500**.

Pastikan `frontend/Js/config.js` mengarah ke backend:

```js
const CONFIG = {
  BASE_URL: "http://localhost:8000",
};
```

---

## API Endpoints

### Authentication

| Method | Endpoint                 | Deskripsi                                 |
| ------ | ------------------------ | ----------------------------------------- |
| POST   | `/auth/register`         | Registrasi user baru (role_id = 2)        |
| POST   | `/auth/login`            | Login → kembalikan role_id untuk redirect |
| GET    | `/auth/user/{user_id}`   | Get info user                             |
| POST   | `/auth/logout/{user_id}` | Logout & catat waktu                      |

### Admin

| Method | Endpoint            | Deskripsi                                 |
| ------ | ------------------- | ----------------------------------------- |
| GET    | `/admin/dashboard`  | Statistik overview                        |
| GET    | `/admin/balance`    | Get saldo kas toko                        |
| POST   | `/admin/balance`    | Set saldo kas toko                        |
| POST   | `/admin/restock`    | Restock item (kurangi saldo, tambah stok) |
| GET    | `/admin/orders`     | List semua order (filter tanggal)         |
| GET    | `/admin/items`      | List semua item + stok                    |
| POST   | `/admin/items`      | Tambah item baru                          |
| PUT    | `/admin/items/{id}` | Update item                               |
| DELETE | `/admin/items/{id}` | Hapus item                                |
| GET    | `/admin/members`    | List member (search nama/email)           |
| GET    | `/admin/histories`  | Login histories                           |
| GET    | `/admin/elements`   | List elemen                               |
| GET    | `/admin/types`      | List tipe                                 |

### Member

| Method | Endpoint                    | Deskripsi                     |
| ------ | --------------------------- | ----------------------------- |
| GET    | `/member/items`             | List item tersedia (stok > 0) |
| GET    | `/member/orders/{user_id}`  | Riwayat order member          |
| GET    | `/member/balance/{user_id}` | Get saldo member              |
| POST   | `/member/topup/{user_id}`   | Top Up saldo member           |
| POST   | `/member/checkout`          | Checkout dari keranjang       |

### Stocks

| Method | Endpoint            | Deskripsi            |
| ------ | ------------------- | -------------------- |
| GET    | `/stocks`           | List semua stok      |
| GET    | `/stocks/{item_id}` | Stok per item        |
| PUT    | `/stocks/{item_id}` | Update quantity stok |

---

## Alur Pengguna

```
Registrasi (register.html)
    └── role_id = 2 (member) otomatis

Login (index.html)
    ├── role_id = 1  →  admin.html  (Dashboard Admin)
    └── role_id = 2  →  home.html   (Dashboard Member)
```

### Flow Member

1. Login → masuk `home.html`
2. Lihat saldo di topbar
3. Scroll produk secara horizontal (carousel)
4. Klik **Add to Cart** → item masuk keranjang
5. Klik area cart bar (pojok bawah) → lihat isi keranjang
6. Klik **Checkout Sekarang** → saldo dikurangi, stok berkurang

### Flow Admin

1. Login → masuk `admin.html`
2. Overview: lihat saldo kas, revenue, stok, jumlah member
3. History Penjualan: filter berdasarkan tanggal
4. Stok Barang: search, restock (beli), tambah manual
5. Member: search berdasarkan nama/email

---

## Dokumentasi API (Swagger)

Setelah server berjalan:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

---

## Catatan Database

Tabel utama yang digunakan:

| Tabel                  | Keterangan                       |
| ---------------------- | -------------------------------- |
| `users`                | Data pengguna (role_id, balance) |
| `items`                | Katalog item game                |
| `elements`             | Elemen item (fire, water, dll)   |
| `types`                | Tipe item (weapon, armor, dll)   |
| `stocks`               | Stok per item                    |
| `orders`               | Header order                     |
| `order_details`        | Detail item per order            |
| `payments`             | Pembayaran order                 |
| `balance`              | Saldo kas toko (admin)           |
| `restock_transactions` | Riwayat restock                  |
| `histories`            | Login/logout history             |
