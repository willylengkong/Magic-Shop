from fastapi import APIRouter, HTTPException
from database import fetch_one, fetch_all, execute
from schemas.stocks import StockUpdate, StockResponse

router = APIRouter(prefix="/stocks", tags=["Stocks"])

@router.get("", response_model=list[StockResponse])
def get_stocks():
    query = """
        SELECT s.stock_id, s.item_id, i.item_name, s.quantity
        FROM stocks s
        JOIN items i ON s.item_id = i.item_id
        ORDER BY i.item_name
    """
    return fetch_all(query)

@router.get("/{item_id}", response_model=StockResponse)
def get_stock_by_item(item_id: int):
    query = """
        SELECT s.stock_id, s.item_id, i.item_name, s.quantity
        FROM stocks s
        JOIN items i ON s.item_id = i.item_id
        WHERE s.item_id = %s
    """
    result = fetch_one(query, (item_id,))
    if not result:
        raise HTTPException(status_code=404, detail="Stock tidak ditemukan")
    return result

@router.put("/{item_id}", response_model=dict)
def update_stock(item_id: int, stock: StockUpdate):
    check_query = "SELECT stock_id FROM stocks WHERE item_id = %s"
    if not fetch_one(check_query, (item_id,)):
        raise HTTPException(status_code=404, detail="Stock tidak ditemukan")
    
    query = "UPDATE stocks SET quantity = %s WHERE item_id = %s"
    execute(query, (stock.quantity, item_id))
    
    return {
        "message": "Stock berhasil diupdate",
        "item_id": item_id,
        "quantity": stock.quantity
    }
