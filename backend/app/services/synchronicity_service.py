"""
Synchronicity Service

Tracks and detects meaningful coincidences across dreams,
events, and news. Helps users notice when the inner and
outer world mirror each other in mysterious ways.
"""
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models.synchronicity import Synchronicity


class SynchronicityService:
    """
    Service for tracking and detecting synchronicities.

    Jung described synchronicity as "meaningful coincidence" -
    events connected not by causality but by meaning. This service:
    - Tracks user-identified patterns
    - Scans news content for matching themes
    - Connects dreams to outer events
    - Builds a personal mythology of meaningful coincidences
    """

    # Pattern types
    PATTERN_TYPES = [
        "recurring_symbol",   # A symbol that keeps appearing
        "number_pattern",     # Significant numbers recurring
        "name_pattern",       # Names appearing in meaningful ways
        "theme_pattern",      # Abstract themes recurring
        "dream_prophecy",     # Dream elements appearing in waking life
        "timing_pattern",     # Events clustering around specific times
    ]

    def __init__(self, db: Session):
        self.db = db

    def get_all_synchronicities(
        self,
        active_only: bool = False,
        limit: int = 50
    ) -> List[Synchronicity]:
        """Get all synchronicities"""
        query = self.db.query(Synchronicity)
        if active_only:
            query = query.filter_by(active=True)
        return query.order_by(desc(Synchronicity.last_occurrence)).limit(limit).all()

    def get_synchronicity(self, sync_id: str) -> Optional[Synchronicity]:
        """Get a specific synchronicity by ID"""
        return self.db.query(Synchronicity).filter_by(id=sync_id).first()

    def get_by_theme(self, theme: str) -> Optional[Synchronicity]:
        """Get synchronicity by theme name"""
        return self.db.query(Synchronicity).filter_by(theme=theme).first()

    def get_active_patterns(self) -> List[Synchronicity]:
        """Get all active, unresolved patterns"""
        return self.db.query(Synchronicity).filter_by(
            active=True,
            resolved=False
        ).order_by(desc(Synchronicity.significance)).all()

    def create_synchronicity(self, **kwargs) -> Synchronicity:
        """Create a new synchronicity pattern"""
        sync = Synchronicity(**kwargs)

        # Set first_noticed if not provided
        if not sync.first_noticed:
            sync.first_noticed = datetime.now().strftime('%Y-%m-%d')

        # Initialize occurrence count
        if sync.occurrences:
            sync.occurrence_count = len(sync.occurrences)
            if sync.occurrences:
                sync.last_occurrence = sync.occurrences[-1].get('date')

        self.db.add(sync)
        self.db.commit()
        self.db.refresh(sync)
        return sync

    def update_synchronicity(
        self,
        sync_id: str,
        **kwargs
    ) -> Optional[Synchronicity]:
        """Update a synchronicity"""
        sync = self.get_synchronicity(sync_id)
        if not sync:
            return None

        for key, value in kwargs.items():
            if hasattr(sync, key):
                setattr(sync, key, value)

        self.db.commit()
        self.db.refresh(sync)
        return sync

    def delete_synchronicity(self, sync_id: str) -> bool:
        """Delete a synchronicity"""
        sync = self.get_synchronicity(sync_id)
        if not sync:
            return False

        self.db.delete(sync)
        self.db.commit()
        return True

    def add_occurrence(
        self,
        sync_id: str,
        occurrence_type: str,
        note: str,
        date: str = None
    ) -> Optional[Synchronicity]:
        """Add a new occurrence to a pattern"""
        sync = self.get_synchronicity(sync_id)
        if not sync:
            return None

        sync.add_occurrence(occurrence_type, note, date)
        self.db.commit()
        self.db.refresh(sync)
        return sync

    def resolve_synchronicity(
        self,
        sync_id: str,
        resolution_note: str
    ) -> Optional[Synchronicity]:
        """Mark a synchronicity as resolved/understood"""
        sync = self.get_synchronicity(sync_id)
        if not sync:
            return None

        sync.resolved = True
        sync.active = False
        sync.resolution_note = resolution_note

        self.db.commit()
        self.db.refresh(sync)
        return sync

    def scan_content_for_patterns(
        self,
        content: str,
        source: str = "news"
    ) -> List[Dict[str, Any]]:
        """
        Scan content for active synchronicity patterns.

        Returns list of matched patterns with details.
        """
        active_patterns = self.get_active_patterns()
        matches = []

        for pattern in active_patterns:
            if pattern.matches_content(content):
                matches.append({
                    "sync_id": pattern.id,
                    "theme": pattern.theme,
                    "pattern_type": pattern.pattern_type,
                    "keywords_matched": [
                        kw for kw in (pattern.keywords or [])
                        if kw.lower() in content.lower()
                    ],
                    "occurrence_count": pattern.occurrence_count,
                    "significance": pattern.significance,
                    "source": source
                })

        return matches

    def scan_articles_for_patterns(
        self,
        articles: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Scan multiple articles for synchronicity matches.

        Returns list of article-pattern matches.
        """
        active_patterns = self.get_active_patterns()
        if not active_patterns:
            return []

        matches = []

        for article in articles:
            headline = article.get('headline', '')
            content = article.get('content', '') or article.get('summary', '')
            full_text = f"{headline} {content}"

            for pattern in active_patterns:
                if pattern.matches_content(full_text):
                    matched_keywords = [
                        kw for kw in (pattern.keywords or [pattern.theme])
                        if kw.lower() in full_text.lower()
                    ]

                    matches.append({
                        "article_headline": headline,
                        "article_date": article.get('date') or article.get('year'),
                        "article_source": article.get('source'),
                        "sync_id": pattern.id,
                        "sync_theme": pattern.theme,
                        "matched_keywords": matched_keywords,
                        "pattern_occurrence_count": pattern.occurrence_count,
                        "significance": pattern.significance
                    })

        # Sort by significance
        matches.sort(key=lambda x: x['significance'], reverse=True)
        return matches

    def auto_record_occurrence(
        self,
        sync_id: str,
        article: Dict[str, Any],
        matched_keywords: List[str]
    ) -> Optional[Synchronicity]:
        """Automatically record an occurrence when pattern is found"""
        sync = self.get_synchronicity(sync_id)
        if not sync:
            return None

        note = f"Found in {article.get('source', 'news')}: \"{article.get('headline', 'Unknown')}\""
        date = article.get('date') or datetime.now().strftime('%Y-%m-%d')

        # Add article reference
        if sync.article_references is None:
            sync.article_references = []

        sync.article_references.append({
            "date": date,
            "headline": article.get('headline'),
            "source": article.get('source'),
            "keywords": matched_keywords
        })

        sync.add_occurrence("news", note, date)
        self.db.commit()
        self.db.refresh(sync)
        return sync

    def get_pattern_statistics(self) -> Dict[str, Any]:
        """Get statistics about synchronicity patterns"""
        all_syncs = self.db.query(Synchronicity).all()

        stats = {
            "total_patterns": len(all_syncs),
            "active_patterns": len([s for s in all_syncs if s.active]),
            "resolved_patterns": len([s for s in all_syncs if s.resolved]),
            "total_occurrences": sum(s.occurrence_count for s in all_syncs),
            "patterns_by_type": {},
            "most_significant": [],
            "most_frequent": [],
            "dormant_patterns": []
        }

        # Group by type
        for sync in all_syncs:
            ptype = sync.pattern_type
            stats["patterns_by_type"][ptype] = stats["patterns_by_type"].get(ptype, 0) + 1

        # Top by significance
        by_significance = sorted(all_syncs, key=lambda x: x.significance or 0, reverse=True)
        stats["most_significant"] = [s.to_summary_dict() for s in by_significance[:5]]

        # Top by frequency
        by_frequency = sorted(all_syncs, key=lambda x: x.occurrence_count, reverse=True)
        stats["most_frequent"] = [s.to_summary_dict() for s in by_frequency[:5]]

        # Dormant patterns
        dormant = [s for s in all_syncs if s.is_dormant and s.active]
        stats["dormant_patterns"] = [s.to_summary_dict() for s in dormant[:5]]

        return stats

    def generate_newspaper_section(
        self,
        articles: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Generate the Synchronicity Watch section for the newspaper.

        This scans articles for pattern matches and creates
        a section highlighting meaningful coincidences.
        """
        # Get active patterns
        active = self.get_active_patterns()

        # Scan articles
        matches = self.scan_articles_for_patterns(articles) if articles else []

        # Get pattern stats
        stats = self.get_pattern_statistics()

        section = {
            "section_name": "SYNCHRONICITY WATCH",
            "section_type": "synchronicity",
            "active_patterns": [s.to_summary_dict() for s in active[:5]],
            "today_matches": matches[:5],
            "total_active": len(active),
            "pattern_stats": {
                "total_patterns": stats["total_patterns"],
                "total_occurrences": stats["total_occurrences"]
            },
            "has_content": bool(active or matches),
            "dormant_alerts": [
                {
                    "theme": s.theme,
                    "days_since": s.days_since_last,
                    "usual_frequency": s.avg_frequency_days
                }
                for s in active if s.is_dormant
            ][:3]
        }

        # Add questions from active patterns
        questions = []
        for pattern in active[:3]:
            if pattern.questions_raised:
                questions.extend(pattern.questions_raised[:2])
        section["questions_to_contemplate"] = questions[:5]

        return section


def get_synchronicity_service(db: Session) -> SynchronicityService:
    """Create a synchronicity service instance"""
    return SynchronicityService(db)
