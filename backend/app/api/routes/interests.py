"""
Interest tracking endpoints for Cosmic Chronicle

Reading history, interest profiles, and relevance scoring.
Part of Cosmic Chronicle - privacy-first personal news hub.
"""
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from uuid import UUID

from app.core.database_sqlite import get_db
from app.models.reading_history import ReadingHistory
from app.models.interest_profile import InterestProfile
from app.schemas.interests import (
    ReadingEventCreate,
    ReadingHistoryResponse,
    ReadingHistoryListResponse,
    FeedbackUpdate,
    InterestProfileResponse,
    InterestProfileListResponse,
    ReadingStatsResponse,
    ForYouRequest,
    ForYouResponse,
    ScoredArticle,
    ScoreExplanation,
    ArticleForScoring,
)
from app.schemas.common import Message
from app.schemas.insights import (
    InterestAnalysisResponse,
    FeedRecommendationsResponse,
    DiscoveryRequest,
    DiscoverySuggestionsResponse,
    PrivacyInfoResponse,
)
from app.services.interest_tracker import get_interest_tracker
from app.services.relevance_scorer import get_relevance_scorer
from app.services.insights_analyzer import get_insights_analyzer

router = APIRouter()


# =============================================================================
# Reading History
# =============================================================================

@router.post("/reading", response_model=ReadingHistoryResponse, status_code=status.HTTP_201_CREATED)
async def record_reading(
    reading: ReadingEventCreate,
    db: Session = Depends(get_db)
):
    """
    Record an article reading event.

    Tracks reading behavior and updates interest profiles.
    All data is stored locally.

    Args:
        reading: Reading event data
        db: Database session

    Returns:
        Created reading history record
    """
    tracker = get_interest_tracker()

    history = tracker.record_reading(
        db=db,
        article_id=reading.article_id,
        source_type=reading.source_type,
        title=reading.title,
        url=reading.url,
        source_id=reading.source_id,
        content=reading.content,
        time_spent_seconds=reading.time_spent_seconds,
        scroll_depth_pct=reading.scroll_depth_pct,
        clicked_links=reading.clicked_links,
        starred=reading.starred,
        feedback=reading.feedback
    )

    return _reading_to_response(history)


@router.get("/reading", response_model=ReadingHistoryListResponse)
async def list_readings(
    source_type: Optional[str] = Query(None, description="Filter by source type"),
    limit: int = Query(50, ge=1, le=200, description="Maximum results"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    db: Session = Depends(get_db)
):
    """
    List reading history.

    Returns recent reading events with optional filtering.

    Args:
        source_type: Optional source filter
        limit: Maximum results
        offset: Pagination offset
        db: Database session

    Returns:
        List of reading history records
    """
    query = db.query(ReadingHistory)

    if source_type:
        query = query.filter(ReadingHistory.source_type == source_type)

    total = query.count()
    readings = query.order_by(desc(ReadingHistory.created_at)).offset(offset).limit(limit).all()

    return ReadingHistoryListResponse(
        readings=[_reading_to_response(r) for r in readings],
        total=total
    )


@router.get("/reading/{reading_id}", response_model=ReadingHistoryResponse)
async def get_reading(
    reading_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Get reading history record by ID.

    Args:
        reading_id: Reading ID
        db: Database session

    Returns:
        Reading history record

    Raises:
        HTTPException 404: If not found
    """
    reading = db.query(ReadingHistory).filter(
        ReadingHistory.id == str(reading_id)
    ).first()

    if not reading:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reading record not found"
        )

    return _reading_to_response(reading)


@router.put("/reading/{reading_id}/feedback", response_model=ReadingHistoryResponse)
async def update_reading_feedback(
    reading_id: UUID,
    feedback: FeedbackUpdate,
    db: Session = Depends(get_db)
):
    """
    Update feedback on a reading.

    Allows user to provide "more like this" or "less like this" feedback.

    Args:
        reading_id: Reading ID
        feedback: Feedback data
        db: Database session

    Returns:
        Updated reading record

    Raises:
        HTTPException 404: If not found
        HTTPException 400: If invalid feedback
    """
    if feedback.feedback not in ('more', 'less'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Feedback must be 'more' or 'less'"
        )

    tracker = get_interest_tracker()
    updated = tracker.update_feedback(db, str(reading_id), feedback.feedback)

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reading record not found"
        )

    return _reading_to_response(updated)


@router.delete("/reading/{reading_id}", response_model=Message)
async def delete_reading(
    reading_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Delete a reading history record.

    Args:
        reading_id: Reading ID
        db: Database session

    Returns:
        Success message

    Raises:
        HTTPException 404: If not found
    """
    reading = db.query(ReadingHistory).filter(
        ReadingHistory.id == str(reading_id)
    ).first()

    if not reading:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reading record not found"
        )

    db.delete(reading)
    db.commit()

    return Message(message="Reading record deleted")


# =============================================================================
# Interest Profiles
# =============================================================================

@router.get("/interests", response_model=InterestProfileListResponse)
async def list_interests(
    category: Optional[str] = Query(None, description="Filter by category"),
    min_articles: int = Query(1, ge=1, description="Minimum articles read"),
    limit: int = Query(50, ge=1, le=200, description="Maximum results"),
    db: Session = Depends(get_db)
):
    """
    List interest profiles.

    Returns topics the user has shown interest in, sorted by score.

    Args:
        category: Optional category filter
        min_articles: Minimum articles to include topic
        limit: Maximum results
        db: Database session

    Returns:
        List of interest profiles
    """
    tracker = get_interest_tracker()
    profiles = tracker.get_top_interests(
        db=db,
        limit=limit,
        category=category,
        min_articles=min_articles
    )

    return InterestProfileListResponse(
        interests=[_interest_to_response(p) for p in profiles],
        total=len(profiles)
    )


@router.get("/interests/{interest_id}", response_model=InterestProfileResponse)
async def get_interest(
    interest_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Get interest profile by ID.

    Args:
        interest_id: Interest ID
        db: Database session

    Returns:
        Interest profile

    Raises:
        HTTPException 404: If not found
    """
    profile = db.query(InterestProfile).filter(
        InterestProfile.id == str(interest_id)
    ).first()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interest profile not found"
        )

    return _interest_to_response(profile)


@router.delete("/interests/{interest_id}", response_model=Message)
async def delete_interest(
    interest_id: UUID,
    db: Session = Depends(get_db)
):
    """
    Delete an interest profile.

    Removes tracking for a specific topic.

    Args:
        interest_id: Interest ID
        db: Database session

    Returns:
        Success message

    Raises:
        HTTPException 404: If not found
    """
    profile = db.query(InterestProfile).filter(
        InterestProfile.id == str(interest_id)
    ).first()

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Interest profile not found"
        )

    db.delete(profile)
    db.commit()

    return Message(message="Interest profile deleted")


# =============================================================================
# Statistics
# =============================================================================

@router.get("/stats", response_model=ReadingStatsResponse)
async def get_reading_stats(db: Session = Depends(get_db)):
    """
    Get reading statistics.

    Returns summary of reading behavior and interests.

    Args:
        db: Database session

    Returns:
        Reading statistics
    """
    tracker = get_interest_tracker()
    stats = tracker.get_reading_stats(db)
    return ReadingStatsResponse(**stats)


# =============================================================================
# For You / Relevance Scoring
# =============================================================================

@router.post("/for-you", response_model=ForYouResponse)
async def get_for_you_articles(
    request: ForYouRequest,
    db: Session = Depends(get_db)
):
    """
    Get personalized "For You" articles.

    Scores provided articles based on user interests.

    Args:
        request: Articles to score
        db: Database session

    Returns:
        Scored articles sorted by relevance
    """
    scorer = get_relevance_scorer()

    # Convert to dicts for scoring
    articles = [
        {
            'id': a.id,
            'title': a.title,
            'content': a.content,
            'source': a.source
        }
        for a in request.articles
    ]

    scored = scorer.get_for_you(
        db=db,
        articles=articles,
        limit=request.limit,
        min_score=request.min_score
    )

    return ForYouResponse(
        articles=[
            ScoredArticle(
                id=a['id'],
                title=a['title'],
                relevance_score=a['relevance_score'],
                matched_topics=a.get('matched_topics', [])
            )
            for a in scored
        ],
        total_scored=len(request.articles)
    )


@router.post("/explain-score", response_model=ScoreExplanation)
async def explain_article_score(
    article: ArticleForScoring,
    db: Session = Depends(get_db)
):
    """
    Explain relevance score for an article.

    Shows why an article received its score.

    Args:
        article: Article to explain
        db: Database session

    Returns:
        Score explanation with breakdown
    """
    scorer = get_relevance_scorer()

    article_dict = {
        'id': article.id,
        'title': article.title,
        'content': article.content,
        'source': article.source
    }

    explanation = scorer.explain_score(db, article_dict)

    return ScoreExplanation(**explanation)


# =============================================================================
# Data Management
# =============================================================================

@router.delete("/clear-history", response_model=Message)
async def clear_reading_history(
    keep_interests: bool = Query(False, description="Keep interest profiles"),
    db: Session = Depends(get_db)
):
    """
    Clear all reading history.

    Optionally preserves interest profiles.

    Args:
        keep_interests: Whether to keep interest profiles
        db: Database session

    Returns:
        Success message
    """
    tracker = get_interest_tracker()
    tracker.clear_history(db, keep_interests=keep_interests)

    message = "Reading history cleared"
    if not keep_interests:
        message += " and interest profiles reset"

    return Message(message=message)


# =============================================================================
# Helper Functions
# =============================================================================

def _reading_to_response(reading: ReadingHistory) -> ReadingHistoryResponse:
    """Convert ReadingHistory model to response schema"""
    import json

    topics = []
    if reading.topics:
        try:
            topics = json.loads(reading.topics)
        except (json.JSONDecodeError, TypeError):
            topics = []

    return ReadingHistoryResponse(
        id=reading.id,
        article_id=reading.article_id,
        source_type=reading.source_type,
        source_id=reading.source_id,
        title=reading.title,
        url=reading.url,
        topics=topics,
        time_spent_seconds=reading.time_spent_seconds,
        scroll_depth_pct=reading.scroll_depth_pct,
        clicked_links=reading.clicked_links,
        starred=reading.starred,
        feedback=reading.feedback,
        engagement_score=reading.engagement_score,
        created_at=reading.created_at
    )


def _interest_to_response(profile: InterestProfile) -> InterestProfileResponse:
    """Convert InterestProfile model to response schema"""
    return InterestProfileResponse(
        id=profile.id,
        topic=profile.topic,
        category=profile.category,
        score=profile.score,
        decayed_score=profile.get_decayed_score(),
        article_count=profile.article_count,
        total_time_seconds=profile.total_time_seconds,
        positive_feedback=profile.positive_feedback,
        negative_feedback=profile.negative_feedback,
        last_seen=profile.last_seen,
        created_at=profile.created_at
    )


# =============================================================================
# AI Insights
# =============================================================================

@router.get("/ai/analyze", response_model=InterestAnalysisResponse)
async def analyze_reading_patterns(db: Session = Depends(get_db)):
    """
    Analyze reading patterns and interests using AI.

    Uses Claude to provide personalized insights about:
    - Reading patterns and trends
    - Interest evolution
    - Content suggestions

    Privacy: Only sends anonymized topic scores to AI,
    never article content or personal information.
    """
    try:
        analyzer = get_insights_analyzer()
        result = analyzer.analyze_interests(db)
        return InterestAnalysisResponse(**result)
    except ValueError as e:
        # API key not configured
        raise HTTPException(
            status_code=503,
            detail=f"AI service unavailable: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Analysis failed: {str(e)}"
        )


@router.get("/ai/feed-recommendations", response_model=FeedRecommendationsResponse)
async def get_feed_recommendations(db: Session = Depends(get_db)):
    """
    Get AI-powered RSS feed recommendations.

    Based on reading interests, suggests:
    - Specific RSS feeds to subscribe to
    - Topics to explore
    - Ways to diversify reading

    Privacy: Only sends topic names and scores to AI.
    """
    try:
        analyzer = get_insights_analyzer()
        result = analyzer.get_feed_recommendations(db)
        return FeedRecommendationsResponse(**result)
    except ValueError as e:
        raise HTTPException(
            status_code=503,
            detail=f"AI service unavailable: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Recommendations failed: {str(e)}"
        )


@router.post("/ai/discover", response_model=DiscoverySuggestionsResponse)
async def get_discovery_suggestions(
    request: DiscoveryRequest,
    db: Session = Depends(get_db)
):
    """
    Get content discovery suggestions for current article.

    Based on the topics of an article you're reading,
    suggests related content to explore.

    Privacy: Only sends topic keywords to AI.
    """
    try:
        analyzer = get_insights_analyzer()
        result = analyzer.get_discovery_suggestions(db, request.topics)
        return DiscoverySuggestionsResponse(**result)
    except ValueError as e:
        raise HTTPException(
            status_code=503,
            detail=f"AI service unavailable: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Discovery failed: {str(e)}"
        )


@router.get("/ai/privacy-info", response_model=PrivacyInfoResponse)
async def get_ai_privacy_info():
    """
    Get information about what data is sent for AI analysis.

    Transparency endpoint explaining privacy practices.
    """
    return PrivacyInfoResponse(
        data_sent=[
            "Topic names (e.g., 'technology', 'sports')",
            "Topic scores (0-1 scale)",
            "Article counts per topic",
            "Feedback balance (positive - negative)",
            "Reading time totals (aggregated)",
            "Source type distribution (e.g., 'rss': 10, 'guardian': 5)"
        ],
        data_not_sent=[
            "Article titles or content",
            "URLs you've visited",
            "Specific article text",
            "Personal information",
            "Reading timestamps",
            "IP address or location",
            "Any identifiable information"
        ],
        explanation=(
            "Cosmic Chronicle uses a privacy-first approach to AI analysis. "
            "When you request AI insights, we only send anonymized aggregate data: "
            "topic names with their scores and article counts. We never send article "
            "content, URLs, or any personal information. All your reading history "
            "stays on your local device. The AI only sees patterns like "
            "'interested in technology (score: 0.8, 15 articles)' - never the actual "
            "articles you've read."
        )
    )
