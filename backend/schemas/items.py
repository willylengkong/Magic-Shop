from pydantic import BaseModel, Field
from typing import Optional

class ItemCreate(BaseModel):
    item_name: str = Field(..., min_length=1)
    element_id: int
    type_id: int
    price: float = Field(..., gt=0)
    rarity: str
    quantity: int = Field(..., ge=0)

class ItemUpdate(BaseModel):
    item_name: Optional[str] = None
    element_id: Optional[int] = None
    type_id: Optional[int] = None
    price: Optional[float] = Field(None, gt=0)
    rarity: Optional[str] = None
    quantity: Optional[int] = Field(None, ge=0)

class ItemResponse(BaseModel):
    item_id: int
    item_name: str
    element_id: int
    element_name: str
    type_id: int
    type_name: str
    price: float
    rarity: str
    quantity: int
