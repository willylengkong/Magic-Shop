from fastapi import APIRouter, HTTPException
from database import fetch_one, fetch_all, execute, transaction
from schemas.orders import OrderCreate, OrderDetailCreate, OrderResponse, CheckoutResponse
from datetime import datetime

router = APIRouter(prefix="/orders", tags=["Orders"])

@router.post("", response_model=dict)
def create_order(order: OrderCreate):
    user_check = "SELECT user_id FROM users WHERE user_id = %s"
    if not fetch_one(user_check, (order.user_id,)):
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    
    query = "INSERT INTO orders (user_id, order_time) VALUES (%s, %s)"
    order_id = execute(query, (order.user_id, datetime.now()))
    
    return {
        "message": "Order berhasil dibuat",
        "order_id": order_id
    }

@router.post("/{order_id}/details", response_model=dict)
def add_order_detail(order_id: int, detail: OrderDetailCreate):
    order_check = "SELECT order_id FROM orders WHERE order_id = %s"
    if not fetch_one(order_check, (order_id,)):
        raise HTTPException(status_code=404, detail="Order tidak ditemukan")
    
    payment_check = "SELECT payment_id FROM payments WHERE order_id = %s"
    if fetch_one(payment_check, (order_id,)):
        raise HTTPException(status_code=400, detail="Order sudah dibayar, tidak bisa ditambah item")
    
    item_query = "SELECT item_id, price FROM items WHERE item_id = %s"
    item = fetch_one(item_query, (detail.item_id,))
    if not item:
        raise HTTPException(status_code=404, detail="Item tidak ditemukan")
    
    subtotal = float(item["price"]) * detail.quantity
    
    insert_query = """
        INSERT INTO order_details (order_id, item_id, quantity, subtotal) 
        VALUES (%s, %s, %s, %s)
    """
    detail_id = execute(insert_query, (order_id, detail.item_id, detail.quantity, subtotal))
    
    return {
        "message": "Item berhasil ditambahkan ke order",
        "detail_id": detail_id,
        "subtotal": subtotal
    }

@router.get("/{order_id}")
def get_order_details(order_id: int):
    order_query = """
        SELECT o.order_id, o.user_id, u.email, o.order_time
        FROM orders o
        JOIN users u ON o.user_id = u.user_id
        WHERE o.order_id = %s
    """
    order = fetch_one(order_query, (order_id,))
    if not order:
        raise HTTPException(status_code=404, detail="Order tidak ditemukan")
    
    details_query = """
        SELECT od.detail_id, od.item_id, i.item_name, od.quantity, od.subtotal
        FROM order_details od
        JOIN items i ON od.item_id = i.item_id
        WHERE od.order_id = %s
    """
    details = fetch_all(details_query, (order_id,))
    
    payment_query = "SELECT payment_id, amount, payment_time FROM payments WHERE order_id = %s"
    payment = fetch_one(payment_query, (order_id,))
    
    total = sum(float(d["subtotal"]) for d in details)
    
    return {
        "order": order,
        "details": details,
        "total": total,
        "payment": payment,
        "status": "paid" if payment else "pending"
    }

@router.post("/checkout/{order_id}", response_model=CheckoutResponse)
def checkout(order_id: int):
    order_check = "SELECT order_id FROM orders WHERE order_id = %s"
    if not fetch_one(order_check, (order_id,)):
        raise HTTPException(status_code=404, detail="Order tidak ditemukan")
    
    payment_check = "SELECT payment_id FROM payments WHERE order_id = %s"
    if fetch_one(payment_check, (order_id,)):
        raise HTTPException(status_code=400, detail="Order sudah dibayar")
    
    with transaction() as (cursor, conn):
        cursor.execute("""
            SELECT od.detail_id, od.item_id, od.quantity, od.subtotal, i.item_name
            FROM order_details od
            JOIN items i ON od.item_id = i.item_id
            WHERE od.order_id = %s
        """, (order_id,))
        order_details = cursor.fetchall()
        
        if not order_details:
            raise HTTPException(status_code=400, detail="Order tidak memiliki item")
        
        total_amount = 0.0
        for detail in order_details:
            cursor.execute(
                "SELECT quantity FROM stocks WHERE item_id = %s FOR UPDATE",
                (detail["item_id"],)
            )
            stock = cursor.fetchone()
            
            if not stock:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Stock untuk item '{detail['item_name']}' tidak ditemukan"
                )
            
            if stock["quantity"] < detail["quantity"]:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Stok tidak cukup untuk '{detail['item_name']}'. Tersedia: {stock['quantity']}, Diminta: {detail['quantity']}"
                )
            
            total_amount += float(detail["subtotal"])
        
        for detail in order_details:
            cursor.execute(
                "UPDATE stocks SET quantity = quantity - %s WHERE item_id = %s",
                (detail["quantity"], detail["item_id"])
            )
        
        payment_time = datetime.now()
        cursor.execute(
            "INSERT INTO payments (order_id, amount, payment_time) VALUES (%s, %s, %s)",
            (order_id, total_amount, payment_time)
        )
        payment_id = cursor.lastrowid
    
    return CheckoutResponse(
        message="Checkout berhasil",
        payment_id=payment_id,
        order_id=order_id,
        total_amount=total_amount,
        payment_time=payment_time
    )

@router.delete("/{order_id}/details/{detail_id}")
def remove_order_detail(order_id: int, detail_id: int):
    payment_check = "SELECT payment_id FROM payments WHERE order_id = %s"
    if fetch_one(payment_check, (order_id,)):
        raise HTTPException(status_code=400, detail="Order sudah dibayar, tidak bisa dihapus")
    
    detail_check = "SELECT detail_id FROM order_details WHERE detail_id = %s AND order_id = %s"
    if not fetch_one(detail_check, (detail_id, order_id)):
        raise HTTPException(status_code=404, detail="Detail order tidak ditemukan")
    
    execute("DELETE FROM order_details WHERE detail_id = %s", (detail_id,))
    
    return {"message": "Item berhasil dihapus dari order"}
