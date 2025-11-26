"""
Pydantic schemas for API request/response validation
"""
from app.schemas.user import (
    UserCreate,
    UserUpdate,
    UserResponse,
    UserLogin,
    UserWithToken,
    UserPreferencesCreate,
    UserPreferencesUpdate,
    UserPreferencesResponse,
)
from app.schemas.birth_data import (
    BirthDataCreate,
    BirthDataUpdate,
    BirthDataResponse,
    BirthDataWithLocation,
)
from app.schemas.chart import (
    ChartCreate,
    ChartUpdate,
    ChartResponse,
    ChartCalculationRequest,
    ChartCalculationResponse,
)
from app.schemas.chart_interpretation import (
    ChartInterpretationCreate,
    ChartInterpretationUpdate,
    ChartInterpretationResponse,
    GenerateInterpretationRequest,
    GenerateInterpretationResponse,
)
from app.schemas.common import (
    Token,
    TokenPayload,
    Message,
    PaginatedResponse,
    HealthResponse,
    ErrorResponse,
)

__all__ = [
    # User schemas
    "UserCreate",
    "UserUpdate",
    "UserResponse",
    "UserLogin",
    "UserWithToken",
    "UserPreferencesCreate",
    "UserPreferencesUpdate",
    "UserPreferencesResponse",
    # Birth data schemas
    "BirthDataCreate",
    "BirthDataUpdate",
    "BirthDataResponse",
    "BirthDataWithLocation",
    # Chart schemas
    "ChartCreate",
    "ChartUpdate",
    "ChartResponse",
    "ChartCalculationRequest",
    "ChartCalculationResponse",
    # Chart interpretation schemas
    "ChartInterpretationCreate",
    "ChartInterpretationUpdate",
    "ChartInterpretationResponse",
    "GenerateInterpretationRequest",
    "GenerateInterpretationResponse",
    # Common schemas
    "Token",
    "TokenPayload",
    "Message",
    "PaginatedResponse",
    "HealthResponse",
    "ErrorResponse",
]
