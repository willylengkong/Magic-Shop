from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class BalanceResponse(BaseModel):
    balance_id: int
    current_balance: float
    last_updated: datetime

class BalanceUpdate(BaseModel):
    amount: float = Field(..., description="Jumlah saldo yang akan di-set")
    notes: Optional[str] = Field(None, max_length=255)

class RestockRequest(BaseModel):
    item_id: int = Field(..., gt=0)
    quantity: int = Field(..., gt=0)
    unit_price: float = Field(..., gt=0)
    notes: Optional[str] = Field(None, max_length=255)

class RestockResponse(BaseModel):
    message: str
    transaction_id: int
    item_id: int
    item_name: str
    quantity: int
    total_cost: float
    remaining_balance: float
