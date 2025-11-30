"""
Timeline Historical Schemas

Pydantic schemas for Wikipedia events, AI-generated newspapers, and historical timeline features.
Supports single-user desktop application context.
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import date


# =============================================================================
# Wikipedia Event Schemas
# =============================================================================

class WikipediaEvent(BaseModel):
    """Single Wikipedia event (event, birth, or death)"""
    year: Optional[int] = Field(None, description="Year of the event (if known)")
    text: str = Field(..., description="Event description text")
    page_titles: Optional[List[str]] = Field(default_factory=list, description="Related Wikipedia page titles")
    page_url: Optional[str] = Field(None, description="URL to primary Wikipedia article")


class HistoricalEventsResponse(BaseModel):
    """Wikipedia 'On This Day' events for a specific month/day"""
    month: int = Field(..., description="Month (1-12)")
    day: int = Field(..., description="Day (1-31)")
    events: List[WikipediaEvent] = Field(default_factory=list, description="Historical events")
    births: List[WikipediaEvent] = Field(default_factory=list, description="Notable births")
    deaths: List[WikipediaEvent] = Field(default_factory=list, description="Notable deaths")
    holidays: List[Dict[str, Any]] = Field(default_factory=list, description="Holidays and observances")
    selected: Optional[List[WikipediaEvent]] = Field(default_factory=list, description="Curated highlights")
    cached: bool = Field(..., description="Whether data came from cache")
    cached_at: Optional[str] = Field(None, description="ISO timestamp of cache date")


# =============================================================================
# Newspaper Schemas
# =============================================================================

class NewspaperArticle(BaseModel):
    """Single newspaper article"""
    headline: str = Field(..., description="Article headline")
    content: str = Field(..., description="Article content (2-3 paragraphs)")
    year: int = Field(..., description="Year of the historical event")
    significance: Optional[str] = Field(None, description="Why this event mattered historically")
    source: Optional[str] = Field(None, description="Source attribution: guardian, nyt, wikipedia, or system")


class NewspaperSection(BaseModel):
    """Newspaper section with articles"""
    name: str = Field(..., description="Section name (e.g., 'WORLD EVENTS')")
    articles: List[NewspaperArticle] = Field(default_factory=list, description="Articles in this section")


class NewspaperResponse(BaseModel):
    """AI-generated newspaper for a specific date"""
    date_display: str = Field(..., description="Human-readable date (e.g., 'July 20, 1969')")
    headline: str = Field(..., description="Main headline for the entire day")
    sections: List[NewspaperSection] = Field(..., description="Newspaper sections")
    style: str = Field(..., description="Journalism style: 'victorian' or 'modern'")
    generated_at: str = Field(..., description="ISO timestamp of generation")
    cached: bool = Field(..., description="Whether newspaper came from cache")
    # Multi-source metadata (optional for backwards compatibility)
    year: Optional[int] = Field(None, description="Specific year of the newspaper (for year-specific mode)")
    is_year_specific: bool = Field(False, description="True if newspaper is for a specific year")
    sources_used: List[str] = Field(default_factory=list, description="News sources used: guardian, nyt, wikipedia")
    sources_failed: Dict[str, str] = Field(default_factory=dict, description="Failed sources and error messages")


# =============================================================================
# Complete Timeline Date Schemas
# =============================================================================

class TimelineDateResponse(BaseModel):
    """Complete data for a single timeline date combining all sources"""
    date: str = Field(..., description="Date in YYYY-MM-DD format")
    historical_events: Optional[HistoricalEventsResponse] = Field(None, description="Wikipedia events")
    newspaper: Optional[NewspaperResponse] = Field(None, description="AI-generated newspaper")
    transits: Optional[Dict[str, Any]] = Field(None, description="Astrological transits for this date")
    journal_entries: List[Dict[str, Any]] = Field(default_factory=list, description="User journal entries")
    user_events: List[Dict[str, Any]] = Field(default_factory=list, description="User-created events")


# =============================================================================
# Transit Calculation Schemas
# =============================================================================

class HistoricalTransitRequest(BaseModel):
    """Request historical transit calculation"""
    target_date: date = Field(..., description="Date for transit calculation")
    birth_data_id: str = Field(..., description="Birth data UUID for natal positions")
    include_aspects: bool = Field(True, description="Include aspect calculations")
    include_houses: bool = Field(True, description="Include house transits")


class HistoricalTransitResponse(BaseModel):
    """Historical transit calculation response"""
    target_date: str = Field(..., description="Date in YYYY-MM-DD format")
    birth_data_id: str = Field(..., description="Birth data UUID")
    transit_positions: Dict[str, Any] = Field(..., description="Transit planet positions")
    natal_positions: Dict[str, Any] = Field(..., description="Natal planet positions")
    aspects: List[Dict[str, Any]] = Field(default_factory=list, description="Transit-natal aspects")
    house_transits: Optional[Dict[str, Any]] = Field(None, description="Planets in houses")
    significant_transits: List[Dict[str, Any]] = Field(default_factory=list, description="Major transits")
