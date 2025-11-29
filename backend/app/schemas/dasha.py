"""
Dasha API Schemas

Pydantic models for Vimsottari Dasha calculation requests and responses.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class DashaPeriodResponse(BaseModel):
    """Single Dasha period (Mahadasha, Antardasha, or Pratyantardasha)"""
    planet: str = Field(..., description="Planet ID (e.g., 'venus', 'mars')")
    planet_name: str = Field(..., description="Display name (e.g., 'Venus', 'Mars')")
    symbol: str = Field(..., description="Astrological symbol")
    color: str = Field(..., description="UI color hex code")
    start_date: datetime = Field(..., description="Period start date")
    end_date: datetime = Field(..., description="Period end date")
    duration_years: float = Field(..., description="Duration in years")
    level: str = Field(..., description="Period level: mahadasha, antardasha, pratyantardasha")
    parent_planet: Optional[str] = Field(None, description="Parent period planet (for sub-periods)")

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class MahadashaResponse(DashaPeriodResponse):
    """Mahadasha period with optional sub-periods"""
    period_number: int = Field(..., description="Sequential period number (1-based)")
    antardashas: Optional[List[DashaPeriodResponse]] = Field(
        None, description="Sub-periods (antardashas)"
    )


class NakshatraInfo(BaseModel):
    """Information about the Moon's nakshatra at birth"""
    number: int = Field(..., description="Nakshatra number (1-27)")
    name: str = Field(..., description="Nakshatra name")
    lord: str = Field(..., description="Ruling planet ID")
    pada: int = Field(..., description="Pada/quarter (1-4)")
    degrees_in_nakshatra: float = Field(..., description="Moon's position within nakshatra")


class DashaCalculationInfo(BaseModel):
    """Metadata about the Dasha calculation"""
    moon_longitude: float = Field(..., description="Moon's sidereal longitude")
    nakshatra: NakshatraInfo = Field(..., description="Moon's nakshatra details")
    starting_planet: str = Field(..., description="First Dasha lord")
    elapsed_first_dasha_years: float = Field(..., description="Years elapsed in first Dasha at birth")
    remaining_first_dasha_years: float = Field(..., description="Years remaining in first Dasha at birth")
    birth_datetime: str = Field(..., description="Birth datetime ISO string")


class DashaSummary(BaseModel):
    """Summary of current Dasha periods"""
    current_period_string: str = Field(..., description="Formatted period string (e.g., 'Venus-Mars-Jupiter')")
    current_mahadasha: Optional[str] = Field(None, description="Current Mahadasha planet name")
    current_antardasha: Optional[str] = Field(None, description="Current Antardasha planet name")
    time_remaining_in_mahadasha: Optional[Dict[str, float]] = Field(
        None, description="Time remaining: {years, days}"
    )


class DashaResponse(BaseModel):
    """Full Dasha calculation response"""
    mahadashas: List[MahadashaResponse] = Field(..., description="All Mahadasha periods")
    current_mahadasha: Optional[DashaPeriodResponse] = Field(None, description="Currently active Mahadasha")
    current_antardasha: Optional[DashaPeriodResponse] = Field(None, description="Currently active Antardasha")
    current_pratyantardasha: Optional[DashaPeriodResponse] = Field(
        None, description="Currently active Pratyantardasha"
    )
    calculation_info: DashaCalculationInfo = Field(..., description="Calculation metadata")
    summary: Optional[DashaSummary] = Field(None, description="Summary of current periods")


class DashaRequest(BaseModel):
    """Request to calculate Dasha for a birth data record"""
    birth_data_id: str = Field(..., description="ID of the birth data record")
    include_antardashas: bool = Field(True, description="Include sub-periods (antardashas)")
    include_pratyantardashas: bool = Field(False, description="Include sub-sub-periods")
    calculate_years: int = Field(120, description="Years to calculate from birth", ge=1, le=120)
    ayanamsa: str = Field('lahiri', description="Ayanamsa system for Moon calculation")


class DashaFromChartRequest(BaseModel):
    """Request to calculate Dasha from an existing chart"""
    chart_id: str = Field(..., description="ID of an existing chart")
    include_antardashas: bool = Field(True, description="Include sub-periods")
    include_pratyantardashas: bool = Field(False, description="Include sub-sub-periods")


class DashaFromPositionRequest(BaseModel):
    """Direct Dasha calculation from Moon position"""
    moon_longitude: float = Field(..., description="Moon's sidereal longitude (0-360)", ge=0, lt=360)
    birth_datetime: datetime = Field(..., description="Birth date and time")
    include_antardashas: bool = Field(True, description="Include sub-periods")
    include_pratyantardashas: bool = Field(False, description="Include sub-sub-periods")
    calculate_years: int = Field(120, description="Years to calculate from birth", ge=1, le=120)
