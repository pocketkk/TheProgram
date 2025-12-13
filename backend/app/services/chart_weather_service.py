"""
Chart Weather Service

Generates "astrological weather" for any historical date -
showing what transits were happening relative to the user's
natal chart. This bridges personal chart data with historical
events, showing how cosmic patterns may have colored that day.
"""
from typing import Dict, Any, Optional, List
from datetime import datetime
from dataclasses import dataclass, field
from sqlalchemy.orm import Session

from app.models.birth_data import BirthData
from app.services.transit_calculator import TransitCalculator
from app.utils.ephemeris import EphemerisCalculator


@dataclass
class ChartWeather:
    """Astrological weather for a specific date"""
    date: str
    year: int
    month: int
    day: int

    # Major transits
    major_transits: List[Dict[str, Any]] = field(default_factory=list)
    significant_transits: List[Dict[str, Any]] = field(default_factory=list)
    moderate_transits: List[Dict[str, Any]] = field(default_factory=list)

    # Planetary positions
    current_positions: Dict[str, Dict[str, Any]] = field(default_factory=dict)

    # Summary
    overall_energy: str = "neutral"
    themes: List[str] = field(default_factory=list)
    advice: str = ""

    # Moon phase
    moon_phase: str = ""
    moon_sign: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "date": self.date,
            "year": self.year,
            "month": self.month,
            "day": self.day,
            "major_transits": self.major_transits,
            "significant_transits": self.significant_transits,
            "moderate_transits": self.moderate_transits,
            "current_positions": self.current_positions,
            "overall_energy": self.overall_energy,
            "themes": self.themes,
            "advice": self.advice,
            "moon_phase": self.moon_phase,
            "moon_sign": self.moon_sign,
            "transit_count": len(self.major_transits) + len(self.significant_transits) + len(self.moderate_transits)
        }


class ChartWeatherService:
    """
    Service for generating astrological weather overlays.

    For any historical date, this service calculates what transits
    were happening relative to the user's natal chart, creating
    a personal astrological context for historical events.

    This answers: "What was the cosmic weather for ME on that day?"
    """

    # Energy interpretations by transit type
    ENERGY_KEYWORDS = {
        ("Saturn", "Sun"): ["challenge", "discipline", "responsibility", "maturation"],
        ("Saturn", "Moon"): ["emotional gravity", "seriousness", "isolation"],
        ("Saturn", "Mercury"): ["focused thinking", "mental discipline", "restrictions"],
        ("Pluto", "Sun"): ["transformation", "power", "rebirth", "intensity"],
        ("Pluto", "Moon"): ["deep emotions", "psychological change", "endings"],
        ("Uranus", "Sun"): ["awakening", "rebellion", "freedom", "sudden change"],
        ("Uranus", "Moon"): ["emotional volatility", "breakthroughs", "liberation"],
        ("Neptune", "Sun"): ["spirituality", "confusion", "dreams", "dissolution"],
        ("Neptune", "Moon"): ["sensitivity", "intuition", "illusion", "compassion"],
        ("Jupiter", "Sun"): ["expansion", "opportunity", "optimism", "growth"],
        ("Jupiter", "Moon"): ["emotional warmth", "generosity", "abundance"],
    }

    # Moon phases
    MOON_PHASES = [
        (0, 45, "New Moon"),
        (45, 90, "Waxing Crescent"),
        (90, 135, "First Quarter"),
        (135, 180, "Waxing Gibbous"),
        (180, 225, "Full Moon"),
        (225, 270, "Waning Gibbous"),
        (270, 315, "Last Quarter"),
        (315, 360, "Waning Crescent"),
    ]

    def __init__(self, db: Session):
        self.db = db
        self._primary_birth_data: Optional[BirthData] = None

    def _get_primary_birth_data(self) -> Optional[BirthData]:
        """Get the user's primary birth data (first one)"""
        if self._primary_birth_data is None:
            self._primary_birth_data = self.db.query(BirthData).first()
        return self._primary_birth_data

    def _calculate_moon_phase(self, sun_lon: float, moon_lon: float) -> str:
        """Calculate moon phase from sun and moon longitudes"""
        # Calculate the angle between sun and moon
        phase_angle = (moon_lon - sun_lon) % 360

        for min_angle, max_angle, phase_name in self.MOON_PHASES:
            if min_angle <= phase_angle < max_angle:
                return phase_name

        return "New Moon"

    def get_chart_weather(
        self,
        year: int,
        month: int,
        day: int,
        birth_data_id: Optional[str] = None
    ) -> Optional[ChartWeather]:
        """
        Calculate chart weather for a specific date.

        Args:
            year: Target year
            month: Target month
            day: Target day
            birth_data_id: Specific birth data to use (or primary)

        Returns:
            ChartWeather object or None if no birth data available
        """
        # Get birth data
        if birth_data_id:
            birth_data = self.db.query(BirthData).filter_by(id=birth_data_id).first()
        else:
            birth_data = self._get_primary_birth_data()

        if not birth_data:
            return None

        date_str = f"{year:04d}-{month:02d}-{day:02d}"

        # Create transit datetime (noon UTC for the target date)
        transit_dt = datetime(year, month, day, 12, 0, 0)

        # Get natal chart positions
        natal_jd = EphemerisCalculator.datetime_to_julian_day(
            datetime.strptime(f"{birth_data.birth_date} {birth_data.birth_time or '12:00:00'}",
                            "%Y-%m-%d %H:%M:%S"),
            birth_data.utc_offset or 0
        )
        natal_planets = EphemerisCalculator.calculate_all_planets(natal_jd)

        # Calculate transits
        transit_result = TransitCalculator.calculate_current_transits(
            natal_planets=natal_planets,
            transit_datetime=transit_dt,
            zodiac='tropical'
        )

        # Get current planetary positions
        transit_jd = EphemerisCalculator.datetime_to_julian_day(transit_dt, 0)
        current_positions = EphemerisCalculator.calculate_all_planets(transit_jd)

        # Calculate moon phase
        sun_lon = current_positions.get('Sun', {}).get('longitude', 0)
        moon_lon = current_positions.get('Moon', {}).get('longitude', 0)
        moon_phase = self._calculate_moon_phase(sun_lon, moon_lon)
        moon_sign = current_positions.get('Moon', {}).get('sign', 'Unknown')

        # Categorize transits by significance
        major = []
        significant = []
        moderate = []

        transits = transit_result.get('transits', [])
        for transit in transits:
            sig = transit.get('significance', 'minor')
            transit_info = {
                "transit_planet": transit.get('transit_planet'),
                "natal_planet": transit.get('natal_planet'),
                "aspect": transit.get('aspect'),
                "orb": transit.get('orb'),
                "applying": transit.get('applying'),
                "interpretation": self._get_transit_interpretation(
                    transit.get('transit_planet'),
                    transit.get('natal_planet'),
                    transit.get('aspect')
                )
            }

            if sig == 'major':
                major.append(transit_info)
            elif sig == 'significant':
                significant.append(transit_info)
            else:
                moderate.append(transit_info)

        # Determine overall energy
        themes = self._extract_themes(major + significant)
        overall_energy = self._determine_overall_energy(major, significant)
        advice = self._generate_advice(overall_energy, themes, moon_phase)

        return ChartWeather(
            date=date_str,
            year=year,
            month=month,
            day=day,
            major_transits=major,
            significant_transits=significant,
            moderate_transits=moderate[:5],  # Limit moderate
            current_positions={
                planet: {
                    "sign": data.get('sign'),
                    "degree": data.get('longitude'),
                    "retrograde": data.get('retrograde', False)
                }
                for planet, data in current_positions.items()
                if data is not None
            },
            overall_energy=overall_energy,
            themes=themes,
            advice=advice,
            moon_phase=moon_phase,
            moon_sign=moon_sign
        )

    def _get_transit_interpretation(
        self,
        transit_planet: str,
        natal_planet: str,
        aspect: str
    ) -> str:
        """Generate interpretation for a specific transit"""
        key = (transit_planet, natal_planet)
        keywords = self.ENERGY_KEYWORDS.get(key, [])

        if keywords:
            return f"{transit_planet} {aspect} natal {natal_planet}: {', '.join(keywords)}"

        # Generic interpretation
        aspect_meanings = {
            "conjunction": "intensification",
            "opposition": "awareness through tension",
            "trine": "harmonious flow",
            "square": "dynamic tension",
            "sextile": "opportunity"
        }

        meaning = aspect_meanings.get(aspect, "influence")
        return f"{transit_planet} {aspect} natal {natal_planet}: {meaning}"

    def _extract_themes(self, transits: List[Dict]) -> List[str]:
        """Extract themes from transits"""
        themes = set()

        for transit in transits:
            tp = transit.get('transit_planet')
            np = transit.get('natal_planet')
            key = (tp, np)

            if key in self.ENERGY_KEYWORDS:
                themes.update(self.ENERGY_KEYWORDS[key][:2])

        return list(themes)[:5]

    def _determine_overall_energy(
        self,
        major: List,
        significant: List
    ) -> str:
        """Determine overall energy level"""
        if not major and not significant:
            return "calm"

        # Count challenging vs harmonious aspects
        challenging = 0
        harmonious = 0

        for transit in major + significant:
            aspect = transit.get('aspect', '')
            if aspect in ['square', 'opposition']:
                challenging += 1
            elif aspect in ['trine', 'sextile']:
                harmonious += 1
            else:  # conjunction
                challenging += 0.5
                harmonious += 0.5

        if challenging > harmonious + 1:
            return "intense"
        elif harmonious > challenging + 1:
            return "supportive"
        elif major:
            return "significant"
        else:
            return "active"

    def _generate_advice(
        self,
        energy: str,
        themes: List[str],
        moon_phase: str
    ) -> str:
        """Generate brief advice based on chart weather"""
        advice_templates = {
            "intense": "This was a day for meeting challenges directly and allowing transformation.",
            "supportive": "The cosmic currents were favorable for growth and expansion.",
            "significant": "Major themes were at play - a day that likely left its mark.",
            "active": "Multiple influences were at work, creating a dynamic day.",
            "calm": "A relatively quiet day astrologically, allowing for integration."
        }

        base = advice_templates.get(energy, "An ordinary day in cosmic terms.")

        if themes:
            base += f" Key themes: {', '.join(themes[:3])}."

        if "Full Moon" in moon_phase:
            base += " The Full Moon brought culmination and clarity."
        elif "New Moon" in moon_phase:
            base += " The New Moon invited new beginnings."

        return base

    def generate_newspaper_section(
        self,
        year: int,
        month: int,
        day: int,
        birth_data_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate the Chart Weather section for the newspaper.

        Creates an astrological weather overlay showing personal
        transits for the historical date.
        """
        weather = self.get_chart_weather(year, month, day, birth_data_id)

        if not weather:
            return {
                "section_name": "YOUR CHART WEATHER",
                "section_type": "chart_weather",
                "has_content": False,
                "message": "Add your birth data to see personal transits for any date."
            }

        # Format for newspaper display
        transit_narratives = []

        for transit in weather.major_transits[:3]:
            transit_narratives.append({
                "type": "major",
                "text": transit["interpretation"],
                "aspect": transit["aspect"]
            })

        for transit in weather.significant_transits[:2]:
            transit_narratives.append({
                "type": "significant",
                "text": transit["interpretation"],
                "aspect": transit["aspect"]
            })

        return {
            "section_name": "YOUR CHART WEATHER",
            "section_type": "chart_weather",
            "date": weather.date,
            "overall_energy": weather.overall_energy,
            "themes": weather.themes,
            "advice": weather.advice,
            "moon_phase": weather.moon_phase,
            "moon_sign": weather.moon_sign,
            "transit_narratives": transit_narratives,
            "major_count": len(weather.major_transits),
            "significant_count": len(weather.significant_transits),
            "has_content": True
        }


def get_chart_weather_service(db: Session) -> ChartWeatherService:
    """Create a chart weather service instance"""
    return ChartWeatherService(db)
