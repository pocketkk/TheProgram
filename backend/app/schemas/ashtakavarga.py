"""
Ashtakavarga API Schemas

Pydantic schemas for Ashtakavarga calculation endpoints.
"""

from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class BhinnaAshtakavarga(BaseModel):
    """Individual planet's Ashtakavarga"""
    planet: str
    planet_name: str
    bindus_by_sign: List[int]  # 12 values, 0-8 each
    total_bindus: int
    strongest_signs: List[str]
    weakest_signs: List[str]


class SarvaAshtakavarga(BaseModel):
    """Combined Ashtakavarga totals"""
    bindus_by_sign: List[int]  # 12 values, 0-48 each
    total_bindus: int
    average_bindus: float
    strongest_signs: List[str]
    weakest_signs: List[str]


class HouseStrength(BaseModel):
    """Strength analysis for a house"""
    sign: str
    bindus: int
    strength: str  # 'excellent', 'good', 'average', 'challenging'


class AshtakavargaSummary(BaseModel):
    """Summary analysis"""
    strongest_planet: str
    strongest_planet_bindus: int
    weakest_planet: str
    weakest_planet_bindus: int
    strongest_sign: str
    strongest_sign_bindus: int
    weakest_sign: str
    weakest_sign_bindus: int
    transit_favorable_signs: List[str]
    house_strength: Dict[int, HouseStrength]


class AshtakavargaCalculationInfo(BaseModel):
    """Calculation information"""
    ascendant_sign: str
    planet_positions: Dict[str, str]


class AshtakavargaRequest(BaseModel):
    """Request to calculate Ashtakavarga from birth data"""
    birth_data_id: str
    ayanamsa: str = Field(default='lahiri')


class AshtakavargaFromChartRequest(BaseModel):
    """Request to calculate Ashtakavarga from existing chart"""
    chart_id: str


class AshtakavargaResponse(BaseModel):
    """Response containing Ashtakavarga data"""
    bhinnashtakavarga: Dict[str, BhinnaAshtakavarga]
    sarvashtakavarga: SarvaAshtakavarga
    calculation_info: AshtakavargaCalculationInfo
    summary: AshtakavargaSummary


class TransitScoreRequest(BaseModel):
    """Request to get transit score for a sign"""
    birth_data_id: str
    transit_sign: int  # 0-11
    ayanamsa: str = Field(default='lahiri')


class TransitScoreResponse(BaseModel):
    """Transit score response"""
    sign: str
    bindus: int
    quality: str
    description: str
