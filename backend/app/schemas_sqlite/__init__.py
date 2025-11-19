"""
Pydantic schemas for SQLite single-user mode

These schemas are identical to the multi-user schemas except:
- No user_id fields (single user implicit)
- Simpler validation (no user ownership checks)
"""
from app.schemas_sqlite.common import Message
from app.schemas_sqlite.client import (
    ClientCreate,
    ClientUpdate,
    ClientResponse,
    ClientWithStats
)
from app.schemas_sqlite.birth_data import (
    BirthDataCreate,
    BirthDataUpdate,
    BirthDataResponse,
    BirthDataWithLocation
)
from app.schemas_sqlite.chart import (
    ChartCreate,
    ChartUpdate,
    ChartResponse,
    ChartWithRelations,
    ChartCalculationRequest,
    ChartCalculationResponse
)
from app.schemas_sqlite.chart_interpretation import (
    ChartInterpretationCreate,
    ChartInterpretationUpdate,
    ChartInterpretationResponse,
    InterpretationSection,
    GenerateInterpretationRequest,
    GenerateInterpretationResponse
)

__all__ = [
    # Common
    'Message',

    # Client
    'ClientCreate',
    'ClientUpdate',
    'ClientResponse',
    'ClientWithStats',

    # Birth Data
    'BirthDataCreate',
    'BirthDataUpdate',
    'BirthDataResponse',
    'BirthDataWithLocation',

    # Chart
    'ChartCreate',
    'ChartUpdate',
    'ChartResponse',
    'ChartWithRelations',
    'ChartCalculationRequest',
    'ChartCalculationResponse',

    # Chart Interpretation
    'ChartInterpretationCreate',
    'ChartInterpretationUpdate',
    'ChartInterpretationResponse',
    'InterpretationSection',
    'GenerateInterpretationRequest',
    'GenerateInterpretationResponse',
]
