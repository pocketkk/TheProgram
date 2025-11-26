"""
Canvas models for freeform chart exploration space

CanvasBoard and CanvasItem models for drag-drop exploration.
Part of Phase 2: Canvas Exploration.
"""
from sqlalchemy import Column, String, ForeignKey, Index, Text, Float, Integer
from sqlalchemy.orm import relationship

from app.models_sqlite.base import BaseModel
from app.core.json_helpers import JSONEncodedDict


class CanvasBoard(BaseModel):
    """
    Canvas board model for exploration spaces

    A canvas is a freeform space where users can drag and drop chart
    elements, patterns, insights, and notes to create visual explorations.

    Fields:
        id: UUID primary key (inherited)
        birth_data_id: Optional link to birth data
        chart_id: Optional link to source chart
        name: Board name
        description: Optional board description
        background_type: Background style (grid, dots, blank, cosmic)
        zoom_level: Current zoom level (0.1 - 3.0)
        pan_x: Current pan X position
        pan_y: Current pan Y position
        canvas_settings: JSON additional canvas settings
        ai_analysis: AI-generated analysis of canvas arrangement
        created_at: Creation timestamp (inherited)
        updated_at: Update timestamp (inherited)

    Relationships:
        birth_data: Optional linked birth data
        chart: Optional source chart
        items: Canvas items on this board

    Example:
        board = CanvasBoard(
            name="Saturn Return Exploration",
            description="Mapping Saturn themes across my chart",
            background_type="cosmic",
            zoom_level=1.0
        )
    """
    __tablename__ = 'canvas_boards'

    # Foreign keys (optional)
    birth_data_id = Column(
        String,
        ForeignKey('birth_data.id', ondelete='SET NULL'),
        nullable=True,
        index=True,
        comment="Optional link to birth data"
    )

    chart_id = Column(
        String,
        ForeignKey('charts.id', ondelete='SET NULL'),
        nullable=True,
        index=True,
        comment="Optional link to source chart"
    )

    # Board metadata
    name = Column(
        String(255),
        nullable=False,
        comment="Board name"
    )

    description = Column(
        Text,
        nullable=True,
        comment="Board description"
    )

    # Visual settings
    background_type = Column(
        String(50),
        nullable=False,
        default='grid',
        comment="Background: grid, dots, blank, cosmic"
    )

    zoom_level = Column(
        Float,
        nullable=False,
        default=1.0,
        comment="Zoom level (0.1 - 3.0)"
    )

    pan_x = Column(
        Float,
        nullable=False,
        default=0.0,
        comment="Pan X position"
    )

    pan_y = Column(
        Float,
        nullable=False,
        default=0.0,
        comment="Pan Y position"
    )

    canvas_settings = Column(
        JSONEncodedDict,
        nullable=True,
        comment="JSON additional canvas settings"
    )

    # AI integration
    ai_analysis = Column(
        Text,
        nullable=True,
        comment="AI-generated analysis of canvas arrangement"
    )

    # Relationships
    birth_data = relationship(
        'BirthData',
        foreign_keys=[birth_data_id],
        lazy='select'
    )

    chart = relationship(
        'Chart',
        foreign_keys=[chart_id],
        lazy='select'
    )

    items = relationship(
        'CanvasItem',
        back_populates='board',
        cascade='all, delete-orphan',
        lazy='select',
        order_by='CanvasItem.z_index'
    )

    # Table indexes
    __table_args__ = (
        Index('idx_canvas_board_birth_data', 'birth_data_id'),
        Index('idx_canvas_board_chart', 'chart_id'),
        Index('idx_canvas_board_created', 'created_at'),
    )

    def __repr__(self):
        """String representation"""
        return f"<CanvasBoard(id={self.id[:8]}..., name='{self.name}')>"

    @property
    def item_count(self) -> int:
        """
        Get number of items on board

        Returns:
            Count of canvas items
        """
        return len(self.items) if self.items else 0

    def to_dict(self):
        """
        Convert to dictionary with computed fields

        Returns:
            Dictionary representation
        """
        result = super().to_dict()
        result['item_count'] = self.item_count
        return result


class CanvasItem(BaseModel):
    """
    Canvas item model for elements on a canvas board

    Individual items that can be placed and arranged on a canvas:
    planets, aspects, patterns, notes, insights, images, etc.

    Fields:
        id: UUID primary key (inherited)
        board_id: Parent canvas board
        item_type: Type of item (planet, aspect, pattern, note, insight, image)
        item_data: JSON item-specific data
        position_x: X position on canvas
        position_y: Y position on canvas
        width: Item width
        height: Item height
        rotation: Rotation in degrees
        z_index: Layer ordering
        style: JSON style overrides (color, opacity, etc.)
        connections: JSON list of connected item IDs
        created_at: Creation timestamp (inherited)
        updated_at: Update timestamp (inherited)

    Relationships:
        board: Parent canvas board

    Item Types:
        - planet: Chart planet element
            item_data: {"planet": "sun", "longitude": 123.45, "sign": "Leo"}
        - aspect: Chart aspect element
            item_data: {"planet1": "sun", "planet2": "moon", "type": "trine"}
        - pattern: Aspect pattern element
            item_data: {"type": "grand_trine", "planets": ["sun", "moon", "jupiter"]}
        - note: Text note
            item_data: {"title": "Note", "content": "My thoughts..."}
        - insight: AI-generated insight
            item_data: {"content": "...", "source": "ai_companion"}
        - house: House area/cusp
            item_data: {"house_number": 10, "sign": "Capricorn"}
        - image: Uploaded or generated image
            item_data: {"url": "...", "alt": "..."}
        - connector: Visual connector line
            item_data: {"from_id": "...", "to_id": "...", "style": "dashed"}

    Example:
        item = CanvasItem(
            board_id=board.id,
            item_type="planet",
            item_data={"planet": "saturn", "longitude": 340.5, "sign": "Pisces"},
            position_x=200,
            position_y=150,
            width=80,
            height=80
        )
    """
    __tablename__ = 'canvas_items'

    # Foreign keys
    board_id = Column(
        String,
        ForeignKey('canvas_boards.id', ondelete='CASCADE'),
        nullable=False,
        index=True,
        comment="Parent canvas board"
    )

    # Item type and data
    item_type = Column(
        String(50),
        nullable=False,
        index=True,
        comment="Item type: planet, aspect, pattern, note, insight, house, image, connector"
    )

    item_data = Column(
        JSONEncodedDict,
        nullable=False,
        comment="JSON item-specific data"
    )

    # Position and size
    position_x = Column(
        Float,
        nullable=False,
        default=0.0,
        comment="X position on canvas"
    )

    position_y = Column(
        Float,
        nullable=False,
        default=0.0,
        comment="Y position on canvas"
    )

    width = Column(
        Float,
        nullable=True,
        comment="Item width (null for auto)"
    )

    height = Column(
        Float,
        nullable=True,
        comment="Item height (null for auto)"
    )

    rotation = Column(
        Float,
        nullable=False,
        default=0.0,
        comment="Rotation in degrees"
    )

    z_index = Column(
        Integer,
        nullable=False,
        default=0,
        comment="Layer ordering (higher = on top)"
    )

    # Styling
    style = Column(
        JSONEncodedDict,
        nullable=True,
        comment="JSON style overrides: color, opacity, border, etc."
    )

    # Connections to other items
    connections = Column(
        JSONEncodedDict,
        nullable=True,
        comment="JSON list of connected item IDs"
    )

    # Relationships
    board = relationship(
        'CanvasBoard',
        back_populates='items',
        foreign_keys=[board_id]
    )

    # Table indexes
    __table_args__ = (
        Index('idx_canvas_item_board', 'board_id'),
        Index('idx_canvas_item_type', 'item_type'),
        Index('idx_canvas_item_z_index', 'z_index'),
    )

    def __repr__(self):
        """String representation"""
        return f"<CanvasItem(id={self.id[:8]}..., type='{self.item_type}', pos=({self.position_x}, {self.position_y}))>"

    @property
    def position(self) -> tuple:
        """
        Get position as tuple

        Returns:
            (x, y) position tuple
        """
        return (self.position_x, self.position_y)

    @property
    def size(self) -> tuple:
        """
        Get size as tuple

        Returns:
            (width, height) tuple, with None for auto-size
        """
        return (self.width, self.height)

    @property
    def connection_list(self) -> list:
        """
        Get connections as Python list

        Returns:
            List of connected item IDs
        """
        if isinstance(self.connections, list):
            return self.connections
        return []

    def to_dict(self):
        """
        Convert to dictionary with computed fields

        Returns:
            Dictionary representation
        """
        result = super().to_dict()
        result['position'] = self.position
        result['size'] = self.size
        result['connection_list'] = self.connection_list
        return result
