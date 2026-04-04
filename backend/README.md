# Game Store API

REST API untuk Game Store menggunakan FastAPI dengan MySQL (tanpa ORM dan tanpa JWT).

## Struktur Project

```
backend/
├── main.py              # Entry point FastAPI
├── database.py          # Koneksi MySQL & helper functions
├── requirements.txt     # Dependencies
├── init_database.sql    # Schema & sample data
├── routers/
│   ├── auth.py          # Authentication endpoints
│   ├── admin.py         # Admin endpoints
│   ├── member.py        # Member endpoints
│   ├── orders.py        # Order & checkout endpoints
│   └── stocks.py        # Stock management endpoints
├── schemas/
│   ├── auth.py          # Auth Pydantic models
│   ├── items.py         # Item Pydantic models
│   ├── orders.py        # Order Pydantic models
│   └── stocks.py        # Stock Pydantic models
└── utils/
    └── password.py      # Password hashing utilities
```

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Setup Database

Jalankan file SQL di MySQL:

```bash
mysql -u root -p < init_database.sql
```

Atau copy-paste isi `init_database.sql` ke MySQL client.

### 3. Konfigurasi Database

Edit `database.py` sesuai konfigurasi MySQL Anda:

```python
DB_CONFIG = {
    "host": "localhost",
    "user": "root",
    "password": "",  # Ganti dengan password MySQL Anda
    "database": "game_store_db",
    "port": 3306
}
```

### 4. Jalankan Server

```bash
uvicorn main:app --reload --port 8000
```

## API Documentation

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Endpoints

### Authentication

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/auth/register` | Register user baru |
| POST | `/auth/login` | Login user |
| GET | `/auth/user/{user_id}` | Get user by ID |
| POST | `/auth/logout/{user_id}` | Logout user |

### Admin

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/admin/dashboard` | Dashboard statistics (termasuk saldo) |
| GET | `/admin/balance` | Get saldo kas saat ini |
| POST | `/admin/balance` | Update/set saldo kas |
| POST | `/admin/restock` | Restock item (kurangi saldo, tambah stok) |
| GET | `/admin/orders` | List semua orders (filter tanggal) |
| GET | `/admin/items` | List semua items |
| POST | `/admin/items` | Tambah item baru |
| PUT | `/admin/items/{id}` | Update item |
| DELETE | `/admin/items/{id}` | Hapus item |
| GET | `/admin/members` | List members (search nama/email) |
| GET | `/admin/histories` | Login histories |
| GET | `/admin/elements` | List elements |
| GET | `/admin/types` | List types |

### Member

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/member/items` | List items yang tersedia |
| GET | `/member/orders/{user_id}` | Orders milik member |

### Orders

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| POST | `/orders` | Buat order baru |
| POST | `/orders/{order_id}/details` | Tambah item ke order |
| GET | `/orders/{order_id}` | Detail order |
| POST | `/orders/checkout/{order_id}` | Checkout & bayar |
| DELETE | `/orders/{order_id}/details/{detail_id}` | Hapus item dari order |

### Stocks

| Method | Endpoint | Deskripsi |
|--------|----------|-----------|
| GET | `/stocks` | List semua stocks |
| GET | `/stocks/{item_id}` | Stock by item |
| PUT | `/stocks/{item_id}` | Update quantity |

## Contoh Request & Response

### Register

```bash
POST /auth/register
Content-Type: application/json

{
    "name": "New User",
    "email": "newuser@example.com",
    "password": "password123"
}
```

Response:
```json
{
    "message": "Registrasi berhasil",
    "user_id": 11,
    "name": "New User",
    "email": "newuser@example.com"
}
```

### Login

```bash
POST /auth/login
Content-Type: application/json

{
    "email": "john@example.com",
    "password": "password123"
}
```

Response:
```json
{
    "message": "Login berhasil",
    "user_id": 2,
    "name": "John Doe",
    "email": "john@example.com"
}
```

### Create Order

```bash
POST /orders
Content-Type: application/json

{
    "user_id": 2
}
```

Response:
```json
{
    "message": "Order berhasil dibuat",
    "order_id": 11
}
```

### Add Item to Order

```bash
POST /orders/11/details
Content-Type: application/json

{
    "item_id": 1,
    "quantity": 2
}
```

Response:
```json
{
    "message": "Item berhasil ditambahkan ke order",
    "detail_id": 25,
    "subtotal": 30000.0
}
```

### Checkout

```bash
POST /orders/checkout/11
```

Response:
```json
{
    "message": "Checkout berhasil",
    "payment_id": 8,
    "order_id": 11,
    "total_amount": 30000.0,
    "payment_time": "2024-01-20T10:30:00"
}
```

### Dashboard

```bash
GET /admin/dashboard
```

Response:
```json
{
    "total_revenue": 652500.0,
    "current_balance": 10000000.0,
    "total_stock": 2305,
    "total_members": 10,
    "total_orders": 10,
    "total_items": 50
}
```

### Get Balance

```bash
GET /admin/balance
```

Response:
```json
{
    "balance_id": 1,
    "current_balance": 10000000.0,
    "last_updated": "2024-01-20T10:00:00"
}
```

### Restock Item

```bash
POST /admin/restock
Content-Type: application/json

{
    "item_id": 1,
    "quantity": 50,
    "unit_price": 10000.0,
    "notes": "Restock Flame Sword"
}
```

Response:
```json
{
    "message": "Restock berhasil",
    "transaction_id": 1,
    "item_id": 1,
    "item_name": "Flame Sword",
    "quantity": 50,
    "total_cost": 500000.0,
    "remaining_balance": 9500000.0
}
```

### Filter Orders by Date

```bash
GET /admin/orders?start_date=2024-01-15&end_date=2024-01-17
```

### Search Members

```bash
GET /admin/members?search=john
```

Response (search by name or email):
```json
[
    {
        "user_id": 2,
        "name": "John Doe",
        "email": "john@example.com"
    }
]
```

## Test Credentials

Semua user memiliki password: `password123`

| Email |
|-------|
| admin@gamestore.com |
| john@example.com |
| jane@example.com |
| bob@example.com |
| alice@example.com |

## Features

- ✅ Query SQL manual (tanpa ORM)
- ✅ Prepared statements (parameterized query)
- ✅ Transaction untuk checkout (COMMIT/ROLLBACK)
- ✅ Password hashing dengan bcrypt
- ✅ Validasi input dengan Pydantic
- ✅ Error handling dengan HTTPException
- ✅ Swagger Docs otomatis
- ✅ CORS enabled
