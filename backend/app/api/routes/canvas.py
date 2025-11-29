"""
Canvas exploration endpoints (single-user mode)

Canvas boards and items for freeform chart exploration.
Part of Phase 2: Canvas Exploration.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from uuid import UUID
import math

from app.core.database_sqlite import get_db
from app.models import CanvasBoard, CanvasItem, BirthData, Chart
from app.schemas.canvas import (
    CanvasBoardCreate,
    CanvasBoardUpdate,
    CanvasBoardResponse,
    CanvasBoardWithItems,
    CanvasItemCreate,
    CanvasItemUpdate,
    CanvasItemResponse,
    CanvasItemBatchUpdate,
    CanvasItemBatchResponse,
    AddChartElementsRequest,
    AddChartElementsResponse,
    ArrangeItemsRequest,
    ArrangeItemsResponse,
)
from app.schemas.common import Message

router = APIRouter()


# =============================================================================
# Canvas Board Endpoints
# =============================================================================

@router.post("/boards", response_model=CanvasBoardResponse, status_code=status.HTTP_201_CREATED)
async def create_canvas_board(
    board_in: CanvasBoardCreate,
    db: Session = Depends(get_db)
):
    """
    Create new canvas board

    Creates a new exploration canvas.

    Args:
        board_in: Board creation data
        db: Database session

    Returns:
        Created canvas board

    Raises:
        HTTPException 404: If linked birth_data or chart not found
    """
    # Validate birth_data_id if provided
    if board_in.birth_data_id:
        birth_data = db.query(BirthData).filter(BirthData.id == str(board_in.birth_data_id)).first()
        if not birth_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Birth data not found"
            )

    # Validate chart_id if provided
    if board_in.chart_id:
        chart = db.query(Chart).filter(Chart.id == str(board_in.chart_id)).first()
        if not chart:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Chart not found"
            )

    # Create board
    board = CanvasBoard(
        birth_data_id=str(board_in.birth_data_id) if board_in.birth_data_id else None,
        chart_id=str(board_in.chart_id) if board_in.chart_id else None,
        name=board_in.name,
        description=board_in.description,
        background_type=board_in.background_type,
        zoom_level=board_in.zoom_level,
        pan_x=board_in.pan_x,
        pan_y=board_in.pan_y,
        canvas_settings=board_in.canvas_settings,
    )

    db.add(board)
    db.commit()
    db.refresh(board)

    return board


@router.get("/boards", response_model=List[CanvasBoardResponse])
async def list_canvas_boards(
    birth_data_id: Optional[UUID] = Query(None, description="Filter by birth data"),
    chart_id: Optional[UUID] = Query(None, description="Filter by chart"),
    limit: int = Query(50, ge=1, le=200, description="Maximum results"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    db: Session = Depends(get_db)
):
    """
    List canvas boards with optional filters

    Returns canvas boards matching the specified filters.

    Args:
        birth_data_id: Optional birth data filter
        chart_id: Optional chart filter
        limit: Maximum results
        offset: Pagination offset
        db: Database session

    Returns:
        List of canvas boards
    """
    query = db.query(CanvasBoard)

    # Apply filters
    if birth_data_id:
        query = query.filter(CanvasBoard.birth_data_id == str(birth_data_id))
    if chart_id:
        query = query.filter(CanvasBoard.chart_id == str(chart_id))

    # Order by updated_at descending
    query = query.order_by(CanvasBoard.updated_at.desc())

    # Apply pagination
    boards = query.offset(offset).limit(limit).all()

    return boards


@router.get("/boards/{board_id}", response_model=CanvasBoardWithItems)
async def get_canvas_board(
    board_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Get canvas board by ID

    Returns a specific canvas board with all items.

    Args:
        board_id: Board ID
        db: Database session

    Returns:
        Canvas board with items

    Raises:
        HTTPException 404: If board not found
    """
    board = db.query(CanvasBoard).filter(CanvasBoard.id == str(board_id)).first()
    if not board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Canvas board not found"
        )

    # Get items
    items = db.query(CanvasItem).filter(
        CanvasItem.board_id == str(board_id)
    ).order_by(CanvasItem.z_index).all()

    response = board.to_dict()
    response['items'] = [item.to_dict() for item in items]

    return response


@router.put("/boards/{board_id}", response_model=CanvasBoardResponse)
async def update_canvas_board(
    board_id: UUID,
    board_in: CanvasBoardUpdate,
    db: Session = Depends(get_db)
):
    """
    Update canvas board

    Updates an existing canvas board.

    Args:
        board_id: Board ID
        board_in: Update data
        db: Database session

    Returns:
        Updated canvas board

    Raises:
        HTTPException 404: If board not found
    """
    board = db.query(CanvasBoard).filter(CanvasBoard.id == str(board_id)).first()
    if not board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Canvas board not found"
        )

    # Update fields
    update_data = board_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field in ('birth_data_id', 'chart_id') and value:
            value = str(value)
        setattr(board, field, value)

    db.commit()
    db.refresh(board)

    return board


@router.delete("/boards/{board_id}", response_model=Message)
async def delete_canvas_board(
    board_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Delete canvas board

    Permanently deletes a canvas board and all its items.

    Args:
        board_id: Board ID
        db: Database session

    Returns:
        Success message

    Raises:
        HTTPException 404: If board not found
    """
    board = db.query(CanvasBoard).filter(CanvasBoard.id == str(board_id)).first()
    if not board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Canvas board not found"
        )

    db.delete(board)
    db.commit()

    return Message(message="Canvas board deleted successfully")


# =============================================================================
# Canvas Item Endpoints
# =============================================================================

@router.post("/items", response_model=CanvasItemResponse, status_code=status.HTTP_201_CREATED)
async def create_canvas_item(
    item_in: CanvasItemCreate,
    db: Session = Depends(get_db)
):
    """
    Create new canvas item

    Creates a new item on a canvas board.

    Args:
        item_in: Item creation data
        db: Database session

    Returns:
        Created canvas item

    Raises:
        HTTPException 404: If board not found
    """
    # Validate board_id
    board = db.query(CanvasBoard).filter(CanvasBoard.id == str(item_in.board_id)).first()
    if not board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Canvas board not found"
        )

    # Create item
    item = CanvasItem(
        board_id=str(item_in.board_id),
        item_type=item_in.item_type,
        item_data=item_in.item_data,
        position_x=item_in.position_x,
        position_y=item_in.position_y,
        width=item_in.width,
        height=item_in.height,
        rotation=item_in.rotation,
        z_index=item_in.z_index,
        style=item_in.style,
        connections=item_in.connections,
    )

    db.add(item)
    db.commit()
    db.refresh(item)

    return item


@router.get("/items/{item_id}", response_model=CanvasItemResponse)
async def get_canvas_item(
    item_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Get canvas item by ID

    Returns a specific canvas item.

    Args:
        item_id: Item ID
        db: Database session

    Returns:
        Canvas item

    Raises:
        HTTPException 404: If item not found
    """
    item = db.query(CanvasItem).filter(CanvasItem.id == str(item_id)).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Canvas item not found"
        )

    return item


@router.put("/items/{item_id}", response_model=CanvasItemResponse)
async def update_canvas_item(
    item_id: UUID,
    item_in: CanvasItemUpdate,
    db: Session = Depends(get_db)
):
    """
    Update canvas item

    Updates an existing canvas item.

    Args:
        item_id: Item ID
        item_in: Update data
        db: Database session

    Returns:
        Updated canvas item

    Raises:
        HTTPException 404: If item not found
    """
    item = db.query(CanvasItem).filter(CanvasItem.id == str(item_id)).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Canvas item not found"
        )

    # Update fields
    update_data = item_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(item, field, value)

    db.commit()
    db.refresh(item)

    return item


@router.delete("/items/{item_id}", response_model=Message)
async def delete_canvas_item(
    item_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Delete canvas item

    Permanently deletes a canvas item.

    Args:
        item_id: Item ID
        db: Database session

    Returns:
        Success message

    Raises:
        HTTPException 404: If item not found
    """
    item = db.query(CanvasItem).filter(CanvasItem.id == str(item_id)).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Canvas item not found"
        )

    db.delete(item)
    db.commit()

    return Message(message="Canvas item deleted successfully")


@router.post("/items/batch", response_model=CanvasItemBatchResponse)
async def batch_update_items(
    batch: CanvasItemBatchUpdate,
    db: Session = Depends(get_db)
):
    """
    Batch update multiple canvas items

    Updates multiple items in a single transaction.

    Args:
        batch: Batch update data
        db: Database session

    Returns:
        Updated items
    """
    updated_items = []

    for update in batch.updates:
        item_id = update.get('id')
        if not item_id:
            continue

        item = db.query(CanvasItem).filter(CanvasItem.id == str(item_id)).first()
        if not item:
            continue

        # Update fields
        for field, value in update.items():
            if field == 'id':
                continue
            if hasattr(item, field):
                setattr(item, field, value)

        updated_items.append(item)

    db.commit()

    # Refresh all items
    for item in updated_items:
        db.refresh(item)

    return CanvasItemBatchResponse(
        updated_count=len(updated_items),
        items=updated_items
    )


# =============================================================================
# Chart Element Operations
# =============================================================================

@router.post("/boards/{board_id}/add-chart-elements", response_model=AddChartElementsResponse)
async def add_chart_elements(
    board_id: UUID,
    request: AddChartElementsRequest,
    db: Session = Depends(get_db)
):
    """
    Add chart elements to canvas

    Adds planets, aspects, houses, or patterns from a chart to the canvas.

    Args:
        board_id: Target board ID
        request: Elements to add
        db: Database session

    Returns:
        Created items

    Raises:
        HTTPException 404: If board or chart not found
    """
    # Validate board
    board = db.query(CanvasBoard).filter(CanvasBoard.id == str(board_id)).first()
    if not board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Canvas board not found"
        )

    # Validate chart
    chart = db.query(Chart).filter(Chart.id == str(request.chart_id)).first()
    if not chart:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chart not found"
        )

    created_items = []
    chart_data = chart.chart_data or {}

    # Get max z_index
    max_z = db.query(CanvasItem.z_index).filter(
        CanvasItem.board_id == str(board_id)
    ).order_by(CanvasItem.z_index.desc()).first()
    current_z = (max_z[0] if max_z else 0) + 1

    # Add planets
    if 'planets' in request.elements and 'planets' in chart_data:
        planets = chart_data['planets']
        planet_count = len(planets)

        for i, (planet_name, planet_data) in enumerate(planets.items()):
            # Calculate position based on layout
            if request.layout == 'circular':
                angle = (2 * math.pi * i) / planet_count
                x = request.center_x + request.radius * math.cos(angle)
                y = request.center_y + request.radius * math.sin(angle)
            else:  # grid
                cols = math.ceil(math.sqrt(planet_count))
                x = request.center_x + (i % cols) * 100 - (cols * 50)
                y = request.center_y + (i // cols) * 100 - (cols * 50)

            item = CanvasItem(
                board_id=str(board_id),
                item_type='planet',
                item_data={
                    'planet': planet_name,
                    **planet_data
                },
                position_x=x,
                position_y=y,
                width=60,
                height=60,
                z_index=current_z
            )
            db.add(item)
            created_items.append(item)
            current_z += 1

    # Add aspects
    if 'aspects' in request.elements and 'aspects' in chart_data:
        aspects = chart_data['aspects']
        for aspect in aspects:
            item = CanvasItem(
                board_id=str(board_id),
                item_type='aspect',
                item_data=aspect,
                position_x=request.center_x,
                position_y=request.center_y + 50,
                width=120,
                height=40,
                z_index=current_z
            )
            db.add(item)
            created_items.append(item)
            current_z += 1

    # Add houses
    if 'houses' in request.elements and 'houses' in chart_data:
        houses = chart_data['houses']
        cusps = houses.get('cusps', [])
        for i, cusp in enumerate(cusps):
            angle = (2 * math.pi * i) / 12
            x = request.center_x + (request.radius + 50) * math.cos(angle)
            y = request.center_y + (request.radius + 50) * math.sin(angle)

            item = CanvasItem(
                board_id=str(board_id),
                item_type='house',
                item_data={
                    'house_number': i + 1,
                    'cusp': cusp
                },
                position_x=x,
                position_y=y,
                width=50,
                height=50,
                z_index=current_z
            )
            db.add(item)
            created_items.append(item)
            current_z += 1

    # Add patterns
    if 'patterns' in request.elements and 'patterns' in chart_data:
        patterns = chart_data.get('patterns', [])
        for i, pattern in enumerate(patterns):
            item = CanvasItem(
                board_id=str(board_id),
                item_type='pattern',
                item_data=pattern,
                position_x=request.center_x + 200,
                position_y=request.center_y + i * 80,
                width=150,
                height=60,
                z_index=current_z
            )
            db.add(item)
            created_items.append(item)
            current_z += 1

    db.commit()

    # Refresh all items
    for item in created_items:
        db.refresh(item)

    return AddChartElementsResponse(
        items_created=len(created_items),
        items=created_items
    )


@router.post("/boards/{board_id}/arrange", response_model=ArrangeItemsResponse)
async def arrange_items(
    board_id: UUID,
    request: ArrangeItemsRequest,
    db: Session = Depends(get_db)
):
    """
    Auto-arrange canvas items

    Arranges items in specified layout pattern.

    Args:
        board_id: Board ID
        request: Arrangement parameters
        db: Database session

    Returns:
        Rearranged items

    Raises:
        HTTPException 404: If board not found
    """
    # Validate board
    board = db.query(CanvasBoard).filter(CanvasBoard.id == str(board_id)).first()
    if not board:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Canvas board not found"
        )

    # Get items to arrange
    query = db.query(CanvasItem).filter(CanvasItem.board_id == str(board_id))
    if request.item_ids:
        query = query.filter(CanvasItem.id.in_([str(id) for id in request.item_ids]))
    items = query.all()

    if not items:
        return ArrangeItemsResponse(items_arranged=0, items=[])

    # Arrange based on pattern
    item_count = len(items)
    for i, item in enumerate(items):
        if request.arrangement == 'circular':
            angle = (2 * math.pi * i) / item_count
            item.position_x = request.center_x + request.spacing * 2 * math.cos(angle)
            item.position_y = request.center_y + request.spacing * 2 * math.sin(angle)
        elif request.arrangement == 'grid':
            cols = math.ceil(math.sqrt(item_count))
            item.position_x = request.center_x + (i % cols) * request.spacing - (cols * request.spacing / 2)
            item.position_y = request.center_y + (i // cols) * request.spacing - (cols * request.spacing / 2)
        elif request.arrangement == 'hierarchical':
            # Simple hierarchical layout by item type
            type_order = {'planet': 0, 'house': 1, 'aspect': 2, 'pattern': 3, 'note': 4, 'insight': 5}
            level = type_order.get(item.item_type, 6)
            item.position_x = request.center_x + (i % 4) * request.spacing - (2 * request.spacing)
            item.position_y = request.center_y + level * request.spacing - (3 * request.spacing)
        else:  # force-directed (simplified)
            angle = (2 * math.pi * i) / item_count + (i * 0.1)
            radius = request.spacing * (1 + (i % 3) * 0.5)
            item.position_x = request.center_x + radius * math.cos(angle)
            item.position_y = request.center_y + radius * math.sin(angle)

    db.commit()

    # Refresh items
    for item in items:
        db.refresh(item)

    return ArrangeItemsResponse(
        items_arranged=len(items),
        items=items
    )


@router.get("/item-types", response_model=List[str])
async def get_item_types():
    """
    Get valid canvas item types

    Returns the list of valid item types.

    Returns:
        List of item types
    """
    return ["planet", "aspect", "pattern", "note", "insight", "house", "image", "connector", "text", "shape"]


@router.get("/background-types", response_model=List[str])
async def get_background_types():
    """
    Get valid background types

    Returns the list of valid background types.

    Returns:
        List of background types
    """
    return ["grid", "dots", "blank", "cosmic", "paper", "dark"]
