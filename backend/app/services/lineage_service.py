"""
Lineage Service

Manages family lineage data and calculates family context
for any historical date. Creates a "who was alive and how old"
snapshot that connects us to our ancestors across time.
"""
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from sqlalchemy.orm import Session

from app.models.lineage_member import LineageMember


@dataclass
class LineageSnapshot:
    """Snapshot of family for a specific date"""
    date: str
    year: int
    month: int
    day: int
    living_members: List[Dict[str, Any]]
    deceased_members: List[Dict[str, Any]]
    not_yet_born: List[Dict[str, Any]]
    nearby_events: List[Dict[str, Any]]
    generation_summary: Dict[str, int]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "date": self.date,
            "year": self.year,
            "month": self.month,
            "day": self.day,
            "living_members": self.living_members,
            "deceased_members": self.deceased_members,
            "not_yet_born": self.not_yet_born,
            "nearby_events": self.nearby_events,
            "generation_summary": self.generation_summary,
            "total_living": len(self.living_members),
            "total_tracked": len(self.living_members) + len(self.deceased_members) + len(self.not_yet_born)
        }


class LineageService:
    """
    Service for managing lineage data and generating family context.

    The lineage service creates a bridge across time by tracking
    family members' ages, life events, and presence at any historical
    date. It answers: "Who in my family was alive when X happened?"
    """

    def __init__(self, db: Session):
        self.db = db

    def get_all_members(self) -> List[LineageMember]:
        """Get all lineage members"""
        return self.db.query(LineageMember).order_by(
            LineageMember.generation,
            LineageMember.birth_year
        ).all()

    def get_member(self, member_id: str) -> Optional[LineageMember]:
        """Get a specific member by ID"""
        return self.db.query(LineageMember).filter_by(id=member_id).first()

    def get_members_by_relationship(self, relationship: str) -> List[LineageMember]:
        """Get members by relationship type"""
        return self.db.query(LineageMember).filter(
            LineageMember.relationship.ilike(f"%{relationship}%")
        ).all()

    def get_ancestors(self) -> List[LineageMember]:
        """Get all members marked as ancestors (for ancestor weather)"""
        return self.db.query(LineageMember).filter_by(
            is_ancestor=True
        ).filter(
            LineageMember.latitude.isnot(None),
            LineageMember.longitude.isnot(None)
        ).all()

    def create_member(self, **kwargs) -> LineageMember:
        """Create a new lineage member"""
        member = LineageMember(**kwargs)

        # Calculate is_living based on death_date
        if member.death_date or member.death_year:
            member.is_living = False

        self.db.add(member)
        self.db.commit()
        self.db.refresh(member)
        return member

    def update_member(self, member_id: str, **kwargs) -> Optional[LineageMember]:
        """Update a lineage member"""
        member = self.get_member(member_id)
        if not member:
            return None

        for key, value in kwargs.items():
            if hasattr(member, key):
                setattr(member, key, value)

        # Update is_living if death info changed
        if 'death_date' in kwargs or 'death_year' in kwargs:
            member.is_living = not (member.death_date or member.death_year)

        self.db.commit()
        self.db.refresh(member)
        return member

    def delete_member(self, member_id: str) -> bool:
        """Delete a lineage member"""
        member = self.get_member(member_id)
        if not member:
            return False

        self.db.delete(member)
        self.db.commit()
        return True

    def add_life_event(
        self,
        member_id: str,
        date: str,
        event: str,
        age: Optional[int] = None
    ) -> Optional[LineageMember]:
        """Add a life event to a member"""
        member = self.get_member(member_id)
        if not member:
            return None

        if member.life_events is None:
            member.life_events = []

        # Calculate age if not provided
        if age is None and member.birth_year:
            try:
                event_year = int(date.split('-')[0])
                age = event_year - member.birth_year
            except (ValueError, IndexError):
                pass

        event_entry = {
            "date": date,
            "event": event
        }
        if age is not None:
            event_entry["age"] = age

        member.life_events.append(event_entry)

        # Sort events by date
        member.life_events.sort(key=lambda x: x.get('date', ''))

        self.db.commit()
        self.db.refresh(member)
        return member

    def get_lineage_snapshot(
        self,
        year: int,
        month: int = 1,
        day: int = 1
    ) -> LineageSnapshot:
        """
        Generate a snapshot of the family at a specific historical date.

        This is the core function for Lineage Mode - showing who was
        alive, their ages, and any life events near that date.
        """
        members = self.get_all_members()
        date_str = f"{year:04d}-{month:02d}-{day:02d}"

        living = []
        deceased = []
        not_born = []
        nearby_events = []
        generation_counts = {}

        for member in members:
            was_alive = member.was_alive_at(year, month, day)
            age = member.get_age_at_date(year, month, day)

            # Track generation counts
            gen = member.generation or 0
            gen_label = self._generation_label(gen)
            generation_counts[gen_label] = generation_counts.get(gen_label, 0) + 1

            member_data = {
                "id": member.id,
                "name": member.name,
                "relationship": member.relationship,
                "age": age,
                "generation": gen,
                "generation_label": gen_label,
                "birth_year": member.birth_year,
                "death_year": member.death_year,
                "notes": member.notes
            }

            # Get any life events near this date
            events = member.get_life_events_near_date(year, month, day)
            if events:
                member_data["nearby_events"] = events
                for evt in events:
                    nearby_events.append({
                        "member": member.name,
                        "relationship": member.relationship,
                        **evt
                    })

            if was_alive is True:
                living.append(member_data)
            elif was_alive is False:
                if age is not None and age < 0:
                    not_born.append(member_data)
                else:
                    deceased.append(member_data)
            else:
                # Unknown - treat as potentially alive
                living.append(member_data)

        # Sort by age
        living.sort(key=lambda x: x.get('age') or 0, reverse=True)
        deceased.sort(key=lambda x: x.get('death_year') or 0, reverse=True)
        not_born.sort(key=lambda x: x.get('birth_year') or 9999)

        return LineageSnapshot(
            date=date_str,
            year=year,
            month=month,
            day=day,
            living_members=living,
            deceased_members=deceased,
            not_yet_born=not_born,
            nearby_events=nearby_events,
            generation_summary=generation_counts
        )

    def _generation_label(self, generation: int) -> str:
        """Convert generation number to label"""
        labels = {
            -4: "Great-great-grandparents",
            -3: "Great-grandparents",
            -2: "Grandparents",
            -1: "Parents",
            0: "Self/Siblings",
            1: "Children",
            2: "Grandchildren",
            3: "Great-grandchildren"
        }
        return labels.get(generation, f"Generation {generation:+d}")

    def generate_newspaper_section(
        self,
        year: int,
        month: int,
        day: int
    ) -> Dict[str, Any]:
        """
        Generate the Family Chronicle section for the newspaper.

        Creates a personalized section showing family context
        for the historical date being viewed.
        """
        snapshot = self.get_lineage_snapshot(year, month, day)

        # Build narrative elements
        narratives = []

        # Living family members narrative
        if snapshot.living_members:
            oldest = snapshot.living_members[0]
            youngest = snapshot.living_members[-1] if len(snapshot.living_members) > 1 else None

            if oldest.get('age'):
                narratives.append(
                    f"Your {oldest['relationship']} {oldest['name']} "
                    f"would have been {oldest['age']} years old."
                )

            if youngest and youngest.get('age') and youngest['age'] > 0:
                narratives.append(
                    f"Your {youngest['relationship']} {youngest['name']} "
                    f"was {youngest['age']}."
                )

        # Life events happening around this time
        for event in snapshot.nearby_events:
            if event.get('event'):
                narratives.append(
                    f"Around this date, your {event['relationship']} "
                    f"{event['member']}: {event['event']}"
                )

        # Those not yet born
        soon_to_be_born = [m for m in snapshot.not_yet_born
                          if m.get('birth_year') and m['birth_year'] - year <= 5]
        for member in soon_to_be_born[:2]:
            years_until = member['birth_year'] - year
            narratives.append(
                f"Your {member['relationship']} {member['name']} "
                f"would be born in {years_until} year{'s' if years_until != 1 else ''}."
            )

        return {
            "section_name": "FAMILY CHRONICLE",
            "section_type": "lineage",
            "date": snapshot.date,
            "narratives": narratives,
            "living_count": len(snapshot.living_members),
            "members": snapshot.living_members[:5],  # Top 5 for display
            "nearby_events": snapshot.nearby_events,
            "generation_summary": snapshot.generation_summary
        }


def get_lineage_service(db: Session) -> LineageService:
    """Create a lineage service instance"""
    return LineageService(db)
