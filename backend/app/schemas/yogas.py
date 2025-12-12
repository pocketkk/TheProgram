"""
Yogas API Schemas

Pydantic schemas for Yogas detection endpoints.
"""

from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class YogaInfo(BaseModel):
    """Information about a detected yoga"""
    name: str
    sanskrit_name: str
    category: str  # 'raja', 'dhana', 'pancha_mahapurusha', 'chandra', 'surya', 'other', 'negative'
    planets_involved: List[str]
    houses_involved: List[int]
    strength: str  # 'strong', 'moderate', 'weak'
    description: str
    effects: str


class YogasSummary(BaseModel):
    """Summary of detected yogas"""
    raja_yoga_count: int
    dhana_yoga_count: int
    pancha_mahapurusha_count: int
    negative_yoga_count: int
    strongest_yogas: List[str]
    overall_assessment: str


class YogasCalculationInfo(BaseModel):
    """Information about the calculation"""
    ascendant_sign: str
    house_lords: Dict[int, str]


class YogasRequest(BaseModel):
    """Request to calculate yogas from birth data"""
    birth_data_id: str
    ayanamsa: str = Field(default='lahiri')
    include_weak: bool = Field(default=False)


class YogasFromChartRequest(BaseModel):
    """Request to calculate yogas from existing chart"""
    chart_id: str
    include_weak: bool = Field(default=False)


class YogasResponse(BaseModel):
    """Response containing detected yogas"""
    yogas: Dict[str, List[YogaInfo]]
    total_count: int
    summary: YogasSummary
    calculation_info: YogasCalculationInfo
