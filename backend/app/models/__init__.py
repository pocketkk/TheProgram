"""
SQLite models package

All SQLAlchemy ORM models for SQLite database.
Exports all models for easy imports.
"""
from app.models.base import Base, BaseModel, SingletonModel

# Singleton tables
from app.models.app_config import AppConfig
from app.models.user_preferences import UserPreferences

# Core data tables
# from app.models.client import Client  # Removed for single-user mode
from app.models.birth_data import BirthData
from app.models.chart import Chart

# Interpretation tables
from app.models.chart_interpretation import ChartInterpretation
from app.models.interpretation import Interpretation

# Pattern and event tables
from app.models.aspect_pattern import AspectPattern
from app.models.transit_event import TransitEvent
# from app.models.session_note import SessionNote  # Removed for single-user mode

# Cache table
from app.models.location_cache import LocationCache

# Phase 2: Journal System
from app.models.journal_entry import JournalEntry

# Phase 2: Transit Timeline
from app.models.user_event import UserEvent
from app.models.transit_context import TransitContext

# Phase 2: Canvas Exploration
from app.models.canvas_board import CanvasBoard, CanvasItem

__all__ = [
    # Base classes
    'Base',
    'BaseModel',
    'SingletonModel',

    # Singleton tables
    'AppConfig',
    'UserPreferences',

    # Core data tables
    # 'Client',  # Removed for single-user mode
    'BirthData',
    'Chart',

    # Interpretation tables
    'ChartInterpretation',
    'Interpretation',

    # Pattern and event tables
    'AspectPattern',
    'TransitEvent',
    # 'SessionNote',  # Removed for single-user mode

    # Cache
    'LocationCache',

    # Phase 2: Journal System
    'JournalEntry',

    # Phase 2: Transit Timeline
    'UserEvent',
    'TransitContext',

    # Phase 2: Canvas Exploration
    'CanvasBoard',
    'CanvasItem',
]
