"""
API Routes for The Program (Single-User Desktop App)

Clean, simple API structure after migration from multi-user PostgreSQL.
"""
from fastapi import APIRouter
from . import (
    auth_simple,
    birth_data,
    charts,
    chart_interpretations,
    dasha,
    agent_ws,
    voice_ws,
    hybrid_voice_ws,
    # Phase 2: New features
    journal,
    timeline,
    timeline_historical,
    # Cosmic Chronicle: RSS feeds, weather, sports, interests
    feeds,
    weather,
    sports,
    interests,
    # Phase 3: Advanced features
    transits,
    tarot,
    iching,
    numerology,
    gematria,
    reports,
    insights,
    # Phase 4: Human Design
    human_design,
    # Phase 5: Image Generation
    images,
    image_ws,
    # Vedic Advanced Features
    yogas,
    ashtakavarga,
    # Phase 6: Coloring Book / Art Therapy
    coloring_book,
)

# Create main API router
router = APIRouter()

# Include all route modules
router.include_router(auth_simple.router)
router.include_router(birth_data.router, prefix="/birth-data", tags=["Birth Data"])
router.include_router(charts.router, prefix="/charts", tags=["Charts"])
router.include_router(chart_interpretations.router, prefix="/charts", tags=["Interpretations"])
router.include_router(dasha.router, prefix="/dasha", tags=["Dasha"])
router.include_router(agent_ws.router, tags=["AI Agent"])
router.include_router(voice_ws.router, tags=["Voice Chat"])
router.include_router(hybrid_voice_ws.router, tags=["Hybrid Voice"])

# Phase 2: Journal and Timeline
router.include_router(journal.router, prefix="/journal", tags=["Journal"])
router.include_router(timeline.router, prefix="/timeline", tags=["Timeline"])
router.include_router(timeline_historical.router, prefix="/timeline-historical", tags=["Timeline Historical"])

# Cosmic Chronicle: RSS feeds, weather, sports, interests
router.include_router(feeds.router, prefix="/chronicle", tags=["Cosmic Chronicle"])
router.include_router(weather.router, prefix="/chronicle", tags=["Cosmic Chronicle"])
router.include_router(sports.router, prefix="/chronicle", tags=["Cosmic Chronicle"])
router.include_router(interests.router, prefix="/chronicle", tags=["Cosmic Chronicle"])

# Phase 3: Advanced Transit Analysis
router.include_router(transits.router, prefix="/transits", tags=["Transits"])

# Phase 3: Multi-Paradigm Integration
router.include_router(tarot.router, prefix="/tarot", tags=["Tarot"])
router.include_router(iching.router, prefix="/iching", tags=["I-Ching"])
router.include_router(numerology.router, prefix="/numerology", tags=["Numerology"])
router.include_router(gematria.router, prefix="/gematria", tags=["Gematria"])

# Phase 3: Reports & Sharing
router.include_router(reports.router, prefix="/reports", tags=["Reports"])

# Phase 3: AI Proactive Intelligence
router.include_router(insights.router, prefix="/insights", tags=["Insights"])

# Phase 4: Human Design
router.include_router(human_design.router, prefix="/human-design", tags=["Human Design"])

# Phase 5: Image Generation
router.include_router(images.router, tags=["Images"])
router.include_router(image_ws.router, tags=["Images"])

# Vedic Advanced Features
router.include_router(yogas.router, prefix="/yogas", tags=["Yogas"])
router.include_router(ashtakavarga.router, prefix="/ashtakavarga", tags=["Ashtakavarga"])

# Phase 6: Coloring Book / Art Therapy
router.include_router(coloring_book.router, tags=["Coloring Book"])

__all__ = ["router"]
