from fastapi import APIRouter, HTTPException
from database import fetch_all

router = APIRouter(prefix="/member", tags=["Member"])

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
