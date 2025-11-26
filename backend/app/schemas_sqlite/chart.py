"""
Chart-related Pydantic schemas (single-user mode)

No user_id in responses - all charts belong to "the user"
"""
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, validator
from datetime import datetime
from uuid import UUID


class ChartBase(BaseModel):
    """Base chart schema with common fields"""
    chart_name: Optional[str] = Field(None, max_length=255, description="Custom chart name")
    chart_type: str = Field(..., max_length=50, description="Chart type (natal, transit, progressed, synastry, composite, etc.)")
    astro_system: str = Field(..., max_length=50, description="Astrological system (western, vedic, human_design)")
    house_system: Optional[str] = Field(None, max_length=50, description="House system (placidus, koch, whole_sign, etc.)")
    ayanamsa: Optional[str] = Field(None, max_length=50, description="Ayanamsa (for Vedic: lahiri, raman, krishnamurti, etc.)")
    zodiac_type: str = Field("tropical", max_length=50, description="Zodiac type (tropical or sidereal)")
    calculation_params: Optional[Dict[str, Any]] = Field(None, description="Additional calculation parameters as JSON")

    @validator("chart_type")
    def validate_chart_type(cls, v):
        """Validate chart type"""
        valid_types = [
            "natal", "transit", "progressed", "solar_return", "lunar_return",
            "synastry", "composite", "davison", "draconic", "harmonic"
        ]
        if v.lower() not in valid_types:
            raise ValueError(f"Chart type must be one of: {', '.join(valid_types)}")
        return v.lower()

    @validator("astro_system")
    def validate_astro_system(cls, v):
        """Validate astrological system"""
        valid_systems = ["western", "vedic", "human_design"]
        if v.lower() not in valid_systems:
            raise ValueError(f"Astro system must be one of: {', '.join(valid_systems)}")
        return v.lower()

    @validator("zodiac_type")
    def validate_zodiac_type(cls, v):
        """Validate zodiac type"""
        valid_types = ["tropical", "sidereal"]
        if v.lower() not in valid_types:
            raise ValueError(f"Zodiac type must be one of: {', '.join(valid_types)}")
        return v.lower()


class ChartCreate(ChartBase):
    """Schema for creating a new chart (with pre-calculated data)"""
    birth_data_id: UUID = Field(..., description="Birth data ID used for calculation")
    chart_data: Dict[str, Any] = Field(..., description="Calculated chart data as JSON")


class ChartUpdate(BaseModel):
    """Schema for updating chart metadata (not calculation data)"""
    chart_name: Optional[str] = Field(None, max_length=255, description="Custom chart name")
    chart_type: Optional[str] = Field(None, max_length=50, description="Chart type")
    astro_system: Optional[str] = Field(None, max_length=50, description="Astrological system")
    house_system: Optional[str] = Field(None, max_length=50, description="House system")
    ayanamsa: Optional[str] = Field(None, max_length=50, description="Ayanamsa")
    zodiac_type: Optional[str] = Field(None, max_length=50, description="Zodiac type")
    calculation_params: Optional[Dict[str, Any]] = Field(None, description="Calculation parameters")


class ChartResponse(ChartBase):
    """Schema for chart response"""
    id: UUID = Field(..., description="Chart ID")
    birth_data_id: UUID = Field(..., description="Birth data ID")
    chart_data: Dict[str, Any] = Field(..., description="Calculated chart data")
    last_viewed: Optional[datetime] = Field(None, description="Last time chart was viewed")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")

    class Config:
        from_attributes = True


class ChartWithRelations(ChartResponse):
    """Chart response with additional relations for display"""
    pass


# =============================================================================
# Chart Calculation Request Schema
# =============================================================================

class ChartCalculationRequest(BaseModel):
    """Schema for requesting a new chart calculation"""
    birth_data_id: UUID = Field(..., description="Birth data ID to use for calculation")
    chart_type: str = Field("natal", description="Chart type (natal, transit, progressed, etc.)")
    astro_system: str = Field("western", description="Astrological system (western, vedic, human_design)")
    house_system: Optional[str] = Field("placidus", description="House system")
    ayanamsa: Optional[str] = Field("lahiri", description="Ayanamsa (for Vedic)")
    zodiac_type: str = Field("tropical", description="Zodiac type (tropical or sidereal)")
    chart_name: Optional[str] = Field(None, description="Custom chart name")

    # Transit-specific fields
    transit_date: Optional[datetime] = Field(None, description="Date for transit calculation")

    # Progressed-specific fields
    progressed_date: Optional[datetime] = Field(None, description="Date for progressed chart")

    # Secondary chart for synastry/composite
    secondary_birth_data_id: Optional[UUID] = Field(None, description="Second birth data for synastry/composite")

    # Additional calculation options
    include_asteroids: bool = Field(False, description="Include asteroids in calculation")
    include_fixed_stars: bool = Field(False, description="Include fixed stars")
    include_arabic_parts: bool = Field(False, description="Include Arabic parts")
    custom_orbs: Optional[Dict[str, float]] = Field(None, description="Custom aspect orbs")

    # Hybrid chart options
    include_nakshatras: bool = Field(False, description="Include Vedic nakshatras in Western charts")
    include_western_aspects: bool = Field(False, description="Include Western-style aspects in Vedic charts")
    include_minor_aspects: bool = Field(False, description="Include minor aspects in calculations")

    @validator("chart_type")
    def validate_chart_type(cls, v):
        """Validate chart type"""
        valid_types = [
            "natal", "transit", "progressed", "solar_return", "lunar_return",
            "synastry", "composite", "davison", "draconic", "harmonic"
        ]
        if v.lower() not in valid_types:
            raise ValueError(f"Chart type must be one of: {', '.join(valid_types)}")
        return v.lower()

    @validator("astro_system")
    def validate_astro_system(cls, v):
        """Validate astrological system"""
        valid_systems = ["western", "vedic", "human_design"]
        if v.lower() not in valid_systems:
            raise ValueError(f"Astro system must be one of: {', '.join(valid_systems)}")
        return v.lower()


class ChartCalculationResponse(ChartResponse):
    """Response after calculating a chart (includes full chart data)"""
    calculation_time_ms: float = Field(..., description="Time taken to calculate chart in milliseconds")
