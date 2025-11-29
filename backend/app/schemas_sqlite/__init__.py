"""
Pydantic schemas for SQLite single-user mode

These schemas are identical to the multi-user schemas except:
- No user_id fields (single user implicit)
- Simpler validation (no user ownership checks)
"""
from app.schemas_sqlite.common import Message
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

# Phase 2: Journal System
from app.schemas_sqlite.journal import (
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
from app.schemas_sqlite.timeline import (
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

# Phase 2: Canvas Exploration
from app.schemas_sqlite.canvas import (
    CanvasBoardCreate,
    CanvasBoardUpdate,
    CanvasBoardResponse,
    CanvasBoardWithItems,
    CanvasItemCreate,
    CanvasItemUpdate,
    CanvasItemResponse,
    CanvasItemBatchUpdate,
    CanvasItemBatchResponse,
    AddChartElementsRequest,
    AddChartElementsResponse,
    ArrangeItemsRequest,
    ArrangeItemsResponse,
    AnalyzeCanvasRequest,
    AnalyzeCanvasResponse,
    SuggestArrangementRequest,
    SuggestArrangementResponse
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

    # Phase 2: Canvas Exploration
    'CanvasBoardCreate',
    'CanvasBoardUpdate',
    'CanvasBoardResponse',
    'CanvasBoardWithItems',
    'CanvasItemCreate',
    'CanvasItemUpdate',
    'CanvasItemResponse',
    'CanvasItemBatchUpdate',
    'CanvasItemBatchResponse',
    'AddChartElementsRequest',
    'AddChartElementsResponse',
    'ArrangeItemsRequest',
    'ArrangeItemsResponse',
    'AnalyzeCanvasRequest',
    'AnalyzeCanvasResponse',
    'SuggestArrangementRequest',
    'SuggestArrangementResponse',

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
]
