from pydantic import BaseModel, Field

class StockUpdate(BaseModel):
    quantity: int = Field(..., ge=0)

class StockResponse(BaseModel):
    stock_id: int
    item_id: int
    item_name: str
    quantity: int
