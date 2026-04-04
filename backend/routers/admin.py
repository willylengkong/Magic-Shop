from fastapi import APIRouter, HTTPException, Query
from database import fetch_one, fetch_all, execute
from schemas.items import ItemCreate, ItemUpdate, ItemResponse
from typing import Optional

router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/dashboard")
def dashboard():
    total_revenue_query = "SELECT COALESCE(SUM(amount), 0) as total FROM payments"
    total_revenue = fetch_one(total_revenue_query)
    
    total_stock_query = "SELECT COALESCE(SUM(quantity), 0) as total FROM stocks"
    total_stock = fetch_one(total_stock_query)
    
    member_role_query = "SELECT role_id FROM roles WHERE role_name = 'member'"
    member_role = fetch_one(member_role_query)
    member_role_id = member_role["role_id"] if member_role else 2
    
    total_member_query = "SELECT COUNT(*) as total FROM users WHERE role_id = %s"
    total_member = fetch_one(total_member_query, (member_role_id,))
    
    total_orders_query = "SELECT COUNT(*) as total FROM orders"
    total_orders = fetch_one(total_orders_query)
    
    total_items_query = "SELECT COUNT(*) as total FROM items"
    total_items = fetch_one(total_items_query)
    
    return {
        "total_revenue": float(total_revenue["total"]),
        "total_stock": int(total_stock["total"]),
        "total_members": int(total_member["total"]),
        "total_orders": int(total_orders["total"]),
        "total_items": int(total_items["total"])
    }

@router.get("/orders")
def get_orders(start_date: Optional[str] = Query(None), end_date: Optional[str] = Query(None)):
    if start_date and end_date:
        query = """
            SELECT o.order_id, o.user_id, u.email, o.order_time,
                   COALESCE(p.amount, 0) as total_paid,
                   CASE WHEN p.payment_id IS NOT NULL THEN 'paid' ELSE 'pending' END as status
            FROM orders o
            JOIN users u ON o.user_id = u.user_id
            LEFT JOIN payments p ON o.order_id = p.order_id
            WHERE DATE(o.order_time) BETWEEN %s AND %s
            ORDER BY o.order_time DESC
        """
        return fetch_all(query, (start_date, end_date))
    else:
        query = """
            SELECT o.order_id, o.user_id, u.email, o.order_time,
                   COALESCE(p.amount, 0) as total_paid,
                   CASE WHEN p.payment_id IS NOT NULL THEN 'paid' ELSE 'pending' END as status
            FROM orders o
            JOIN users u ON o.user_id = u.user_id
            LEFT JOIN payments p ON o.order_id = p.order_id
            ORDER BY o.order_time DESC
        """
        return fetch_all(query)

@router.get("/items", response_model=list[ItemResponse])
def get_items():
    query = """
        SELECT i.item_id, i.item_name, i.element_id, e.element_name,
               i.type_id, t.type_name, i.price, i.rarity, s.quantity
        FROM items i
        JOIN elements e ON i.element_id = e.element_id
        JOIN types t ON i.type_id = t.type_id
        JOIN stocks s ON i.item_id = s.item_id
        ORDER BY i.item_id
    """
    return fetch_all(query)

@router.post("/items", response_model=dict)
def create_item(item: ItemCreate):
    element_check = "SELECT element_id FROM elements WHERE element_id = %s"
    if not fetch_one(element_check, (item.element_id,)):
        raise HTTPException(status_code=400, detail="Element tidak ditemukan")
    
    type_check = "SELECT type_id FROM types WHERE type_id = %s"
    if not fetch_one(type_check, (item.type_id,)):
        raise HTTPException(status_code=400, detail="Type tidak ditemukan")
    
    item_query = """
        INSERT INTO items (item_name, element_id, type_id, price, rarity) 
        VALUES (%s, %s, %s, %s, %s)
    """
    item_id = execute(item_query, (item.item_name, item.element_id, item.type_id, item.price, item.rarity))
    
    stock_query = "INSERT INTO stocks (item_id, quantity) VALUES (%s, %s)"
    execute(stock_query, (item_id, item.quantity))
    
    return {
        "message": "Item berhasil ditambahkan",
        "item_id": item_id
    }

@router.put("/items/{item_id}", response_model=dict)
def update_item(item_id: int, item: ItemUpdate):
    check_query = "SELECT item_id FROM items WHERE item_id = %s"
    if not fetch_one(check_query, (item_id,)):
        raise HTTPException(status_code=404, detail="Item tidak ditemukan")
    
    updates = []
    params = []
    
    if item.item_name is not None:
        updates.append("item_name = %s")
        params.append(item.item_name)
    if item.element_id is not None:
        updates.append("element_id = %s")
        params.append(item.element_id)
    if item.type_id is not None:
        updates.append("type_id = %s")
        params.append(item.type_id)
    if item.price is not None:
        updates.append("price = %s")
        params.append(item.price)
    if item.rarity is not None:
        updates.append("rarity = %s")
        params.append(item.rarity)
    
    if updates:
        params.append(item_id)
        item_query = f"UPDATE items SET {', '.join(updates)} WHERE item_id = %s"
        execute(item_query, tuple(params))
    
    if item.quantity is not None:
        stock_query = "UPDATE stocks SET quantity = %s WHERE item_id = %s"
        execute(stock_query, (item.quantity, item_id))
    
    return {"message": "Item berhasil diupdate"}

@router.delete("/items/{item_id}", response_model=dict)
def delete_item(item_id: int):
    check_query = "SELECT item_id FROM items WHERE item_id = %s"
    if not fetch_one(check_query, (item_id,)):
        raise HTTPException(status_code=404, detail="Item tidak ditemukan")
    
    execute("DELETE FROM stocks WHERE item_id = %s", (item_id,))
    execute("DELETE FROM order_details WHERE item_id = %s", (item_id,))
    execute("DELETE FROM items WHERE item_id = %s", (item_id,))
    
    return {"message": "Item berhasil dihapus"}

@router.get("/members")
def get_members(search: Optional[str] = Query(None)):
    member_role_query = "SELECT role_id FROM roles WHERE role_name = 'member'"
    member_role = fetch_one(member_role_query)
    member_role_id = member_role["role_id"] if member_role else 2
    
    if search:
        query = """
            SELECT u.user_id, u.email, u.role_id, r.role_name
            FROM users u
            JOIN roles r ON u.role_id = r.role_id
            WHERE u.role_id = %s AND u.email LIKE %s
        """
        return fetch_all(query, (member_role_id, f"%{search}%"))
    else:
        query = """
            SELECT u.user_id, u.email, u.role_id, r.role_name
            FROM users u
            JOIN roles r ON u.role_id = r.role_id
            WHERE u.role_id = %s
        """
        return fetch_all(query, (member_role_id,))

@router.get("/histories")
def get_login_histories():
    query = """
        SELECT h.history_id, h.user_id, u.email, h.login_time, h.logout_time
        FROM histories h
        JOIN users u ON h.user_id = u.user_id
        ORDER BY h.login_time DESC
    """
    return fetch_all(query)

@router.get("/elements")
def get_elements():
    return fetch_all("SELECT * FROM elements ORDER BY element_id")

@router.get("/types")
def get_types():
    return fetch_all("SELECT * FROM types ORDER BY type_id")
