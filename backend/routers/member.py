from fastapi import APIRouter, HTTPException
from database import fetch_one, fetch_all, execute, transaction
from pydantic import BaseModel, Field
from typing import List
from datetime import datetime

router = APIRouter(prefix="/member", tags=["Member"])


# ─── SCHEMAS ──────────────────────────────────────────────────────────────────

class CartItemRequest(BaseModel):
    item_id: int
    quantity: int = Field(..., gt=0)


class MemberCheckoutRequest(BaseModel):
    user_id: int
    items: List[CartItemRequest]


class TopUpRequest(BaseModel):
    amount: float = Field(..., gt=0)


# ─── HELPERS ──────────────────────────────────────────────────────────────────

def _has_balance_column() -> bool:
    """Check if the users table has a balance column."""
    query = """
        SELECT COUNT(*) AS cnt
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'users'
          AND COLUMN_NAME = 'balance'
    """
    try:
        result = fetch_one(query)
        return bool(result and result.get("cnt", 0) > 0)
    except Exception:
        return False

@router.get("/items")
def get_items():
    query = """
        SELECT i.item_id, i.item_name, e.element_name, t.type_name, 
               i.price, i.rarity, s.quantity
        FROM items i
        JOIN elements e ON i.element_id = e.element_id
        JOIN types t ON i.type_id = t.type_id
        JOIN stocks s ON i.item_id = s.item_id
        WHERE s.quantity > 0
        ORDER BY i.item_name
    """
    return fetch_all(query)

@router.get("/orders/{user_id}")
def get_member_orders(user_id: int):
    query = """
        SELECT o.order_id, o.order_time, 
               od.detail_id, od.item_id, i.item_name, od.quantity, od.subtotal,
               COALESCE(p.amount, 0) as total_paid,
               CASE WHEN p.payment_id IS NOT NULL THEN 'paid' ELSE 'pending' END as status
        FROM orders o
        LEFT JOIN order_details od ON o.order_id = od.order_id
        LEFT JOIN items i ON od.item_id = i.item_id
        LEFT JOIN payments p ON o.order_id = p.order_id
        WHERE o.user_id = %s
        ORDER BY o.order_time DESC
    """
    results = fetch_all(query, (user_id,))
    
    orders_dict = {}
    for row in results:
        order_id = row["order_id"]
        if order_id not in orders_dict:
            orders_dict[order_id] = {
                "order_id": order_id,
                "order_time": row["order_time"],
                "status": row["status"],
                "total_paid": float(row["total_paid"]),
                "items": []
            }
        if row["detail_id"]:
            orders_dict[order_id]["items"].append({
                "detail_id": row["detail_id"],
                "item_id": row["item_id"],
                "item_name": row["item_name"],
                "quantity": row["quantity"],
                "subtotal": float(row["subtotal"])
            })
    
    return list(orders_dict.values())


# ─── BALANCE ──────────────────────────────────────────────────────────────────

@router.get("/balance/{user_id}")
def get_user_balance(user_id: int):
    user_check = fetch_one("SELECT user_id FROM users WHERE user_id = %s", (user_id,))
    if not user_check:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")

    if not _has_balance_column():
        return {"balance": 0.0, "configured": False}

    result = fetch_one(
        "SELECT COALESCE(balance, 0) AS balance FROM users WHERE user_id = %s",
        (user_id,),
    )
    return {"balance": float(result["balance"] or 0), "configured": True}


@router.post("/topup/{user_id}")
def topup_balance(user_id: int, body: TopUpRequest):
    user_check = fetch_one("SELECT user_id FROM users WHERE user_id = %s", (user_id,))
    if not user_check:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")

    if not _has_balance_column():
        raise HTTPException(
            status_code=400,
            detail="Kolom 'balance' belum ada di tabel users. "
                   "Jalankan: ALTER TABLE users ADD COLUMN balance DECIMAL(15,2) DEFAULT 0;",
        )

    execute(
        "UPDATE users SET balance = COALESCE(balance, 0) + %s WHERE user_id = %s",
        (body.amount, user_id),
    )
    result = fetch_one(
        "SELECT COALESCE(balance, 0) AS balance FROM users WHERE user_id = %s",
        (user_id,),
    )
    return {"message": "Top Up berhasil", "new_balance": float(result["balance"] or 0)}


# ─── CHECKOUT ─────────────────────────────────────────────────────────────────

@router.post("/checkout")
def member_checkout(data: MemberCheckoutRequest):
    if not data.items:
        raise HTTPException(status_code=400, detail="Keranjang kosong")

    has_balance = _has_balance_column()

    with transaction() as (cursor, conn):
        # 1. Get user (and balance if column exists)
        if has_balance:
            cursor.execute(
                "SELECT user_id, COALESCE(balance, 0) AS balance FROM users WHERE user_id = %s",
                (data.user_id,),
            )
        else:
            cursor.execute("SELECT user_id FROM users WHERE user_id = %s", (data.user_id,))
        user = cursor.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User tidak ditemukan")

        user_balance = float(user.get("balance") or 0) if has_balance else None

        # 2. Validate items and calculate total
        total = 0.0
        items_detail = []
        for cart_item in data.items:
            cursor.execute(
                "SELECT item_id, item_name, price FROM items WHERE item_id = %s",
                (cart_item.item_id,),
            )
            item = cursor.fetchone()
            if not item:
                raise HTTPException(
                    status_code=404,
                    detail=f"Item ID {cart_item.item_id} tidak ditemukan",
                )

            cursor.execute(
                "SELECT quantity FROM stocks WHERE item_id = %s FOR UPDATE",
                (cart_item.item_id,),
            )
            stock = cursor.fetchone()
            available = stock["quantity"] if stock else 0
            if available < cart_item.quantity:
                raise HTTPException(
                    status_code=400,
                    detail=f"Stok '{item['item_name']}' tidak cukup. "
                           f"Tersedia: {available}, diminta: {cart_item.quantity}",
                )

            subtotal = float(item["price"]) * cart_item.quantity
            total += subtotal
            items_detail.append(
                {
                    "item_id": cart_item.item_id,
                    "quantity": cart_item.quantity,
                    "subtotal": subtotal,
                }
            )

        # 3. Check balance if column available
        if has_balance and user_balance < total:
            raise HTTPException(
                status_code=400,
                detail=f"Saldo tidak cukup. "
                       f"Saldo: Rp{user_balance:,.0f}, Total: Rp{total:,.0f}",
            )

        # 4. Create order
        cursor.execute(
            "INSERT INTO orders (user_id, order_time) VALUES (%s, %s)",
            (data.user_id, datetime.now()),
        )
        order_id = cursor.lastrowid

        # 5. Add order details and deduct stock
        for item in items_detail:
            cursor.execute(
                "INSERT INTO order_details (order_id, item_id, quantity, subtotal) "
                "VALUES (%s, %s, %s, %s)",
                (order_id, item["item_id"], item["quantity"], item["subtotal"]),
            )
            cursor.execute(
                "UPDATE stocks SET quantity = quantity - %s WHERE item_id = %s",
                (item["quantity"], item["item_id"]),
            )

        # 6. Create payment record
        payment_time = datetime.now()
        cursor.execute(
            "INSERT INTO payments (order_id, amount, payment_time) VALUES (%s, %s, %s)",
            (order_id, total, payment_time),
        )
        payment_id = cursor.lastrowid

        # 7. Deduct user balance
        if has_balance:
            cursor.execute(
                "UPDATE users SET balance = balance - %s WHERE user_id = %s",
                (total, data.user_id),
            )

    return {
        "message": "Checkout berhasil",
        "order_id": order_id,
        "payment_id": payment_id,
        "total": total,
    }
