"""
Pydantic schemas for SQLite single-user mode

These schemas are identical to the multi-user schemas except:
- No user_id fields (single user implicit)
- Simpler validation (no user ownership checks)
"""
from app.schemas.common import Message
from app.schemas.birth_data import (
    BirthDataCreate,
    BirthDataUpdate,
    BirthDataResponse,
    BirthDataWithLocation
)
from app.schemas.chart import (
    ChartCreate,
    ChartUpdate,
    ChartResponse,
    ChartWithRelations,
    ChartCalculationRequest,
    ChartCalculationResponse
)
from app.schemas.chart_interpretation import (
    ChartInterpretationCreate,
    ChartInterpretationUpdate,
    ChartInterpretationResponse,
    InterpretationSection,
    GenerateInterpretationRequest,
    GenerateInterpretationResponse
)

# Phase 2: Journal System
from app.schemas.journal import (
    JournalEntryCreate,
    JournalEntryUpdate,
    JournalEntryResponse,
    JournalEntryWithContext,
    JournalSearchRequest,
    JournalSearchResponse,
    GenerateJournalSummaryRequest,
    GenerateJournalSummaryResponse,
    JournalInsightsRequest,
    JournalInsightsResponse
)

# Phase 2: Transit Timeline
from app.schemas.timeline import (
    UserEventCreate,
    UserEventUpdate,
    UserEventResponse,
    UserEventWithTransits,
    TransitContextCreate,
    TransitContextUpdate,
    TransitContextResponse,
    TimelineRangeRequest,
    TimelineRangeResponse,
    TimelineDataPoint,
    GenerateTransitContextRequest,
    GenerateTransitContextResponse,
    TimelineSummaryRequest,
    TimelineSummaryResponse
)

# Phase 5: Image Generation
from app.schemas.image import (
    ImageGenerateRequest,
    ImageGenerateResponse,
    ImageRefineRequest,
    ImageInfo,
    ImageListResponse,
    CollectionCreate,
    CollectionUpdate,
    CollectionInfo,
    CollectionWithImages,
    CollectionListResponse,
    BatchGenerateItem,
    BatchGenerateRequest,
    BatchProgressUpdate,
    StorageStats,
)

__all__ = [
    # Common
    'Message',

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

    # Phase 2: Journal System
    'JournalEntryCreate',
    'JournalEntryUpdate',
    'JournalEntryResponse',
    'JournalEntryWithContext',
    'JournalSearchRequest',
    'JournalSearchResponse',
    'GenerateJournalSummaryRequest',
    'GenerateJournalSummaryResponse',
    'JournalInsightsRequest',
    'JournalInsightsResponse',

    # Phase 2: Transit Timeline
    'UserEventCreate',
    'UserEventUpdate',
    'UserEventResponse',
    'UserEventWithTransits',
    'TransitContextCreate',
    'TransitContextUpdate',
    'TransitContextResponse',
    'TimelineRangeRequest',
    'TimelineRangeResponse',
    'TimelineDataPoint',
    'GenerateTransitContextRequest',
    'GenerateTransitContextResponse',
    'TimelineSummaryRequest',
    'TimelineSummaryResponse',

    # Phase 3: Human Design
    'HDCalculationRequest',
    'HDChartResponse',
    'HDInterpretationRequest',
    'GateActivation',
    'ChannelDefinition',
    'CenterDefinition',
    'ProfileInfo',
    'IncarnationCross',
    'Variables',
    'HDGateInfo',
    'HDChannelInfo',
    'HDCenterInfo',
    'HDTypeInfo',
    'HDGatesListResponse',
    'HDChannelsListResponse',
    'HDCentersListResponse',
    'HDTypesListResponse',
    'HDTypeInterpretationResponse',
    'HDProfileInterpretationResponse',
    'HDChannelInterpretationResponse',
    'HDGateInterpretationResponse',
    'HDFullReadingResponse',

    # Phase 5: Image Generation
    'ImageGenerateRequest',
    'ImageGenerateResponse',
    'ImageRefineRequest',
    'ImageInfo',
    'ImageListResponse',
    'CollectionCreate',
    'CollectionUpdate',
    'CollectionInfo',
    'CollectionWithImages',
    'CollectionListResponse',
    'BatchGenerateItem',
    'BatchGenerateRequest',
    'BatchProgressUpdate',
    'StorageStats',
]
