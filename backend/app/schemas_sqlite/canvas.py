"""
Canvas-related Pydantic schemas (single-user mode)

Schemas for canvas boards and items for freeform exploration.
Part of Phase 2: Canvas Exploration.
"""
from typing import Optional, List, Dict, Any, Tuple
from pydantic import BaseModel, Field, validator
from datetime import datetime
from uuid import UUID


# =============================================================================
# Canvas Board Schemas
# =============================================================================

class CanvasBoardBase(BaseModel):
    """Base canvas board schema with common fields"""
    name: str = Field(..., max_length=255, description="Board name")
    description: Optional[str] = Field(None, description="Board description")
    background_type: str = Field("grid", description="Background style")
    zoom_level: float = Field(1.0, ge=0.1, le=3.0, description="Zoom level")
    pan_x: float = Field(0.0, description="Pan X position")
    pan_y: float = Field(0.0, description="Pan Y position")
    canvas_settings: Optional[Dict[str, Any]] = Field(None, description="Additional settings")

    @validator("background_type")
    def validate_background(cls, v):
        """Validate background type"""
        valid_types = ["grid", "dots", "blank", "cosmic", "paper", "dark"]
        if v.lower() not in valid_types:
            raise ValueError(f"Background must be one of: {', '.join(valid_types)}")
        return v.lower()


class CanvasBoardCreate(CanvasBoardBase):
    """Schema for creating a new canvas board"""
    birth_data_id: Optional[UUID] = Field(None, description="Optional link to birth data")
    chart_id: Optional[UUID] = Field(None, description="Optional link to chart")


class CanvasBoardUpdate(BaseModel):
    """Schema for updating a canvas board"""
    name: Optional[str] = Field(None, max_length=255, description="Board name")
    description: Optional[str] = Field(None, description="Board description")
    background_type: Optional[str] = Field(None, description="Background style")
    zoom_level: Optional[float] = Field(None, ge=0.1, le=3.0, description="Zoom level")
    pan_x: Optional[float] = Field(None, description="Pan X position")
    pan_y: Optional[float] = Field(None, description="Pan Y position")
    canvas_settings: Optional[Dict[str, Any]] = Field(None, description="Additional settings")
    birth_data_id: Optional[UUID] = Field(None, description="Link to birth data")
    chart_id: Optional[UUID] = Field(None, description="Link to chart")


class CanvasBoardResponse(CanvasBoardBase):
    """Schema for canvas board response"""
    id: UUID = Field(..., description="Board ID")
    birth_data_id: Optional[UUID] = Field(None, description="Birth data ID")
    chart_id: Optional[UUID] = Field(None, description="Chart ID")
    ai_analysis: Optional[str] = Field(None, description="AI analysis of arrangement")
    item_count: int = Field(..., description="Number of items on board")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    class Config:
        from_attributes = True


class CanvasBoardWithItems(CanvasBoardResponse):
    """Canvas board with all items included"""
    items: List["CanvasItemResponse"] = Field(default_factory=list, description="Board items")


# =============================================================================
# Canvas Item Schemas
# =============================================================================

class CanvasItemBase(BaseModel):
    """Base canvas item schema with common fields"""
    item_type: str = Field(..., description="Item type")
    item_data: Dict[str, Any] = Field(..., description="Item-specific data")
    position_x: float = Field(0.0, description="X position")
    position_y: float = Field(0.0, description="Y position")
    width: Optional[float] = Field(None, description="Item width")
    height: Optional[float] = Field(None, description="Item height")
    rotation: float = Field(0.0, ge=-360, le=360, description="Rotation degrees")
    z_index: int = Field(0, description="Layer order")
    style: Optional[Dict[str, Any]] = Field(None, description="Style overrides")
    connections: Optional[List[str]] = Field(None, description="Connected item IDs")

    @validator("item_type")
    def validate_item_type(cls, v):
        """Validate item type"""
        valid_types = [
            "planet", "aspect", "pattern", "note", "insight",
            "house", "image", "connector", "text", "shape"
        ]
        if v.lower() not in valid_types:
            raise ValueError(f"Item type must be one of: {', '.join(valid_types)}")
        return v.lower()

    @validator("item_data")
    def validate_item_data(cls, v, values):
        """Validate item data based on type"""
        item_type = values.get("item_type", "").lower()

        # Basic validation based on type
        if item_type == "planet":
            if "planet" not in v:
                raise ValueError("Planet items must have 'planet' in item_data")
        elif item_type == "aspect":
            if "planet1" not in v or "planet2" not in v:
                raise ValueError("Aspect items must have 'planet1' and 'planet2' in item_data")
        elif item_type == "pattern":
            if "type" not in v:
                raise ValueError("Pattern items must have 'type' in item_data")
        elif item_type == "note":
            if "content" not in v:
                raise ValueError("Note items must have 'content' in item_data")
        elif item_type == "house":
            if "house_number" not in v:
                raise ValueError("House items must have 'house_number' in item_data")

        return v


class CanvasItemCreate(CanvasItemBase):
    """Schema for creating a new canvas item"""
    board_id: UUID = Field(..., description="Parent board ID")


class CanvasItemUpdate(BaseModel):
    """Schema for updating a canvas item"""
    item_data: Optional[Dict[str, Any]] = Field(None, description="Item data")
    position_x: Optional[float] = Field(None, description="X position")
    position_y: Optional[float] = Field(None, description="Y position")
    width: Optional[float] = Field(None, description="Item width")
    height: Optional[float] = Field(None, description="Item height")
    rotation: Optional[float] = Field(None, ge=-360, le=360, description="Rotation")
    z_index: Optional[int] = Field(None, description="Layer order")
    style: Optional[Dict[str, Any]] = Field(None, description="Style overrides")
    connections: Optional[List[str]] = Field(None, description="Connected item IDs")


class CanvasItemResponse(CanvasItemBase):
    """Schema for canvas item response"""
    id: UUID = Field(..., description="Item ID")
    board_id: UUID = Field(..., description="Parent board ID")
    position: Tuple[float, float] = Field(..., description="Position tuple")
    size: Tuple[Optional[float], Optional[float]] = Field(..., description="Size tuple")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    class Config:
        from_attributes = True


class CanvasItemBatchUpdate(BaseModel):
    """Schema for batch updating multiple items"""
    updates: List[Dict[str, Any]] = Field(..., description="List of {id, ...fields} updates")


class CanvasItemBatchResponse(BaseModel):
    """Response for batch operations"""
    updated_count: int = Field(..., description="Number of items updated")
    items: List[CanvasItemResponse] = Field(..., description="Updated items")


# =============================================================================
# Canvas Operations Schemas
# =============================================================================

class AddChartElementsRequest(BaseModel):
    """Schema for adding chart elements to canvas"""
    board_id: UUID = Field(..., description="Target board ID")
    chart_id: UUID = Field(..., description="Source chart ID")
    elements: List[str] = Field(..., description="Elements to add: 'planets', 'aspects', 'houses', 'patterns'")
    layout: str = Field("circular", description="Initial layout: circular, grid, free")
    center_x: float = Field(400, description="Center X position for layout")
    center_y: float = Field(300, description="Center Y position for layout")
    radius: float = Field(200, description="Radius for circular layout")


class AddChartElementsResponse(BaseModel):
    """Response for adding chart elements"""
    items_created: int = Field(..., description="Number of items created")
    items: List[CanvasItemResponse] = Field(..., description="Created items")


class ArrangeItemsRequest(BaseModel):
    """Schema for auto-arranging items"""
    board_id: UUID = Field(..., description="Board ID")
    item_ids: Optional[List[UUID]] = Field(None, description="Specific items to arrange (None = all)")
    arrangement: str = Field("circular", description="Arrangement: circular, grid, force, hierarchical")
    center_x: float = Field(400, description="Center X")
    center_y: float = Field(300, description="Center Y")
    spacing: float = Field(100, description="Spacing between items")


class ArrangeItemsResponse(BaseModel):
    """Response for arrangement"""
    items_arranged: int = Field(..., description="Number of items arranged")
    items: List[CanvasItemResponse] = Field(..., description="Rearranged items")


# =============================================================================
# AI Integration Schemas
# =============================================================================

class AnalyzeCanvasRequest(BaseModel):
    """Schema for requesting AI analysis of canvas arrangement"""
    board_id: UUID = Field(..., description="Board to analyze")
    focus_aspects: Optional[List[str]] = Field(None, description="Aspects to focus on")


class AnalyzeCanvasResponse(BaseModel):
    """Response for canvas analysis"""
    board_id: UUID = Field(..., description="Board ID")
    analysis: str = Field(..., description="AI analysis of the arrangement")
    patterns_identified: List[Dict[str, Any]] = Field(..., description="Visual patterns found")
    suggested_connections: List[Dict[str, Any]] = Field(..., description="Suggested item connections")
    themes: List[str] = Field(..., description="Identified themes")


class SuggestArrangementRequest(BaseModel):
    """Schema for AI arrangement suggestions"""
    board_id: UUID = Field(..., description="Board ID")
    goal: Optional[str] = Field(None, description="What the user wants to explore")
    style: str = Field("balanced", description="Style: balanced, clustered, radial, narrative")


class SuggestArrangementResponse(BaseModel):
    """Response for arrangement suggestions"""
    board_id: UUID = Field(..., description="Board ID")
    suggested_positions: List[Dict[str, Any]] = Field(..., description="Suggested item positions")
    explanation: str = Field(..., description="Why this arrangement")
    alternative_arrangements: List[Dict[str, Any]] = Field(..., description="Alternative layouts")


# Update forward references
CanvasBoardWithItems.model_rebuild()
