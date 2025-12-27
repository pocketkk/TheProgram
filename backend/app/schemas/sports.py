"""
Sports Pydantic schemas

Schemas for sports scores, headlines, and favorites.
Part of Cosmic Chronicle - privacy-first personal news hub.
"""
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime
from uuid import UUID


# =============================================================================
# Sports Favorite Schemas
# =============================================================================

class SportsFavoriteBase(BaseModel):
    """Base sports favorite schema"""
    entity_type: str = Field(..., max_length=20, description="Type: team, league, sport")
    entity_id: str = Field(..., max_length=100, description="External ID")
    name: str = Field(..., max_length=255, description="Display name")
    sport: str = Field(..., max_length=50, description="Sport type")
    league: Optional[str] = Field(None, max_length=50, description="League name")
    logo_url: Optional[str] = Field(None, description="Logo URL")


class SportsFavoriteCreate(SportsFavoriteBase):
    """Schema for creating a sports favorite"""
    pass


class SportsFavoriteResponse(SportsFavoriteBase):
    """Schema for sports favorite response"""
    id: UUID = Field(..., description="Favorite ID")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    class Config:
        from_attributes = True


class SportsFavoriteListResponse(BaseModel):
    """Schema for list of favorites"""
    favorites: List[SportsFavoriteResponse] = Field(..., description="List of favorites")
    total: int = Field(..., description="Total count")


# =============================================================================
# Scores Schemas
# =============================================================================

class SportScore(BaseModel):
    """Schema for a game score"""
    game_id: str = Field(..., description="Game ID")
    sport: str = Field(..., description="Sport type")
    league: str = Field(..., description="League name")
    status: str = Field(..., description="Game status: scheduled, in_progress, final")
    home_team: str = Field(..., description="Home team name")
    home_team_abbr: str = Field(..., description="Home team abbreviation")
    home_score: Optional[int] = Field(None, description="Home team score")
    home_logo: Optional[str] = Field(None, description="Home team logo URL")
    away_team: str = Field(..., description="Away team name")
    away_team_abbr: str = Field(..., description="Away team abbreviation")
    away_score: Optional[int] = Field(None, description="Away team score")
    away_logo: Optional[str] = Field(None, description="Away team logo URL")
    start_time: datetime = Field(..., description="Game start time")
    venue: Optional[str] = Field(None, description="Venue name")
    broadcast: Optional[str] = Field(None, description="Broadcast network")
    period: Optional[str] = Field(None, description="Current period/quarter")
    time_remaining: Optional[str] = Field(None, description="Time remaining in period")


# =============================================================================
# Headlines Schemas
# =============================================================================

class SportsHeadline(BaseModel):
    """Schema for a sports headline"""
    id: str = Field(..., description="Headline ID")
    title: str = Field(..., description="Headline title")
    description: str = Field(..., description="Short description")
    url: str = Field(..., description="Article URL")
    image_url: Optional[str] = Field(None, description="Image URL")
    published_at: datetime = Field(..., description="Publication time")
    sport: str = Field(..., description="Sport type")
    league: Optional[str] = Field(None, description="League name")
    source: str = Field("ESPN", description="News source")


# =============================================================================
# Sports Data Response
# =============================================================================

class SportsDataResponse(BaseModel):
    """Schema for sports data response"""
    scores: List[SportScore] = Field(..., description="Game scores")
    headlines: List[SportsHeadline] = Field(..., description="News headlines")
    fetched_at: datetime = Field(..., description="When data was fetched")


class SupportedLeague(BaseModel):
    """Schema for a supported league"""
    key: str = Field(..., description="League key")
    sport: str = Field(..., description="Sport type")
    league_id: str = Field(..., description="League ID")
    display_name: str = Field(..., description="Display name")


class SupportedLeaguesResponse(BaseModel):
    """Schema for supported leagues response"""
    leagues: List[SupportedLeague] = Field(..., description="List of supported leagues")
