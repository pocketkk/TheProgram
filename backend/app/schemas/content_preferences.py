"""
Pydantic schemas for Content Preferences API

Handles request/response validation for personalized Cosmic Paper settings.
"""
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field, field_validator


# =============================================================================
# Location Schemas
# =============================================================================

class LocationUpdate(BaseModel):
    """Update user location for weather"""
    name: Optional[str] = Field(None, description="Human-readable location name")
    latitude: float = Field(..., ge=-90, le=90, description="Latitude")
    longitude: float = Field(..., ge=-180, le=180, description="Longitude")
    timezone: Optional[str] = Field(None, description="Timezone identifier")


class LocationResponse(BaseModel):
    """Location configuration response"""
    name: Optional[str]
    latitude: Optional[float]
    longitude: Optional[float]
    timezone: Optional[str]
    configured: bool


# =============================================================================
# Interest Schemas
# =============================================================================

class InterestItem(BaseModel):
    """Single topic interest"""
    topic: str = Field(..., min_length=1, description="Topic name")
    weight: float = Field(1.0, ge=0.0, le=1.0, description="Interest weight (0-1)")


class InterestsUpdate(BaseModel):
    """Update user interests"""
    interests: List[InterestItem] = Field(..., description="List of topic interests")

    @field_validator("interests")
    @classmethod
    def validate_interests(cls, v: List[InterestItem]) -> List[InterestItem]:
        """Ensure unique topics"""
        topics = [i.topic.lower() for i in v]
        if len(topics) != len(set(topics)):
            raise ValueError("Duplicate topics not allowed")
        return v


# =============================================================================
# Sports Schemas
# =============================================================================

class TeamItem(BaseModel):
    """Sports team to follow"""
    name: str = Field(..., min_length=1, description="Team name")
    league: str = Field(..., min_length=1, description="League name")
    sport: str = Field(..., min_length=1, description="Sport type")
    city: Optional[str] = Field(None, description="Team city")
    aliases: List[str] = Field(default_factory=list, description="Alternative names")


class SportsUpdate(BaseModel):
    """Update sports preferences"""
    teams: List[TeamItem] = Field(default_factory=list, description="Teams to follow")
    leagues: List[str] = Field(default_factory=list, description="Leagues to follow")


class SportsResponse(BaseModel):
    """Sports preferences response"""
    teams: List[Dict[str, Any]]
    leagues: List[str]
    show_sports: bool


# =============================================================================
# Filtering Schemas
# =============================================================================

class FilteringUpdate(BaseModel):
    """Update content filtering settings"""
    blocked_sources: List[str] = Field(default_factory=list, description="Sources to block")
    blocked_keywords: List[str] = Field(default_factory=list, description="Keywords to filter")
    prioritized_topics: List[str] = Field(default_factory=list, description="Topics to boost")


class FilteringResponse(BaseModel):
    """Filtering settings response"""
    blocked_sources: List[str]
    blocked_keywords: List[str]
    prioritized_topics: List[str]


# =============================================================================
# Truth Algorithm Schemas
# =============================================================================

class TruthAlgorithmUpdate(BaseModel):
    """Update truth/spirituality algorithm settings"""
    enabled: bool = Field(..., description="Enable truth-focused filtering")
    focus_topics: List[str] = Field(
        default_factory=list,
        description="Topics aligned with spiritual journey"
    )
    source_trust_levels: Dict[str, float] = Field(
        default_factory=dict,
        description="Trust levels for sources (0-1)"
    )

    @field_validator("source_trust_levels")
    @classmethod
    def validate_trust_levels(cls, v: Dict[str, float]) -> Dict[str, float]:
        """Ensure trust levels are valid"""
        for source, level in v.items():
            if not 0.0 <= level <= 1.0:
                raise ValueError(f"Trust level for {source} must be between 0 and 1")
        return v


class TruthAlgorithmResponse(BaseModel):
    """Truth algorithm settings response"""
    enabled: bool
    focus_topics: List[str]
    source_trust_levels: Dict[str, float]


# =============================================================================
# Custom Section Schemas
# =============================================================================

class CustomSectionItem(BaseModel):
    """Custom newspaper section configuration"""
    name: str = Field(..., min_length=1, max_length=50, description="Section name")
    topics: List[str] = Field(..., min_items=1, description="Topics for this section")


class CustomSectionsUpdate(BaseModel):
    """Update custom sections"""
    sections: List[CustomSectionItem] = Field(
        default_factory=list,
        max_length=10,
        description="Custom newspaper sections"
    )


# =============================================================================
# Display Preferences Schemas
# =============================================================================

class DisplayPreferencesUpdate(BaseModel):
    """Update display preferences"""
    show_weather: Optional[bool] = Field(None, description="Show weather in newspaper")
    show_sports: Optional[bool] = Field(None, description="Show sports section")
    show_horoscope_context: Optional[bool] = Field(None, description="Show astrological context")
    show_rss_content: Optional[bool] = Field(None, description="Show RSS feed content")


class DisplayPreferencesResponse(BaseModel):
    """Display preferences response"""
    show_weather: bool
    show_sports: bool
    show_horoscope_context: bool
    show_rss_content: bool


# =============================================================================
# RSS Feed Schemas
# =============================================================================

class RssFeedCreate(BaseModel):
    """Create RSS feed subscription"""
    url: str = Field(..., min_length=5, description="RSS feed URL")
    name: str = Field(..., min_length=1, max_length=100, description="Feed name")
    category: str = Field("news", description="Feed category")
    description: Optional[str] = Field(None, description="Feed description")
    topics: List[str] = Field(default_factory=list, description="Topic tags")
    trust_level: float = Field(0.5, ge=0.0, le=1.0, description="Trust level")
    supports_historical: bool = Field(False, description="Has historical archives")
    historical_url_template: Optional[str] = Field(None, description="Historical URL template")


class RssFeedUpdate(BaseModel):
    """Update RSS feed"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    category: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None
    topics: Optional[List[str]] = None
    trust_level: Optional[float] = Field(None, ge=0.0, le=1.0)
    supports_historical: Optional[bool] = None
    historical_url_template: Optional[str] = None


class RssFeedResponse(BaseModel):
    """RSS feed response"""
    id: str
    url: str
    name: str
    category: str
    description: Optional[str]
    is_active: bool
    topics: List[str]
    trust_level: float
    supports_historical: bool
    historical_url_template: Optional[str]
    last_fetched_at: Optional[str]
    last_error: Optional[str]
    entry_count: int
    created_at: str
    updated_at: str


class RssFeedListResponse(BaseModel):
    """List of RSS feeds"""
    feeds: List[RssFeedResponse]
    total: int


class RssFeedTestResponse(BaseModel):
    """Response from testing an RSS feed"""
    success: bool
    feed_name: Optional[str]
    entry_count: int
    error: Optional[str]
    sample_entries: List[Dict[str, Any]]


# =============================================================================
# RSS Categories Schemas
# =============================================================================

class RssCategoriesUpdate(BaseModel):
    """Update RSS feed categories"""
    categories: List[str] = Field(..., min_items=1, description="Category names")


# =============================================================================
# Full Content Preferences Schemas
# =============================================================================

class ContentPreferencesResponse(BaseModel):
    """Full content preferences response"""
    location: LocationResponse
    interests: List[Dict[str, Any]]
    sports: SportsResponse
    rss: Dict[str, Any]
    filtering: FilteringResponse
    truth_algorithm: TruthAlgorithmResponse
    display: DisplayPreferencesResponse
    custom_sections: List[Dict[str, Any]]


class ContentPreferencesFullUpdate(BaseModel):
    """Full update of all content preferences"""
    location: Optional[LocationUpdate] = None
    interests: Optional[List[InterestItem]] = None
    sports: Optional[SportsUpdate] = None
    filtering: Optional[FilteringUpdate] = None
    truth_algorithm: Optional[TruthAlgorithmUpdate] = None
    display: Optional[DisplayPreferencesUpdate] = None
    custom_sections: Optional[List[CustomSectionItem]] = None
    rss_categories: Optional[List[str]] = None
