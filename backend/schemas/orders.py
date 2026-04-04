from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class OrderCreate(BaseModel):
    user_id: int

class OrderDetailCreate(BaseModel):
    item_id: int
    quantity: int = Field(..., gt=0)

class OrderResponse(BaseModel):
    order_id: int
    user_id: int
    order_time: datetime

class OrderDetailResponse(BaseModel):
    detail_id: int
    order_id: int
    item_id: int
    item_name: str
    quantity: int
    subtotal: float

class CheckoutResponse(BaseModel):
    message: str
    payment_id: int
    order_id: int
    total_amount: float
    payment_time: datetime
