"""
Daily Insights Service

Provides proactive daily astrological insights by analyzing current transits
against the user's natal chart.
Part of Phase 3: AI Proactive Intelligence
"""
from typing import Dict, List, Optional, Any
from datetime import date, datetime, timedelta
from functools import lru_cache

from app.services.transit_calculator import get_transit_calculator
from app.services.ai_interpreter import get_ai_interpreter


class DailyInsightsService:
    """
    Service for generating proactive daily astrological insights.
    """

    # Planet importance weights for daily insights
    PLANET_WEIGHTS = {
        'moon': 10,  # Moon transits are most relevant daily
        'sun': 8,
        'mercury': 7,
        'venus': 6,
        'mars': 5,
        'jupiter': 4,
        'saturn': 3,
        'uranus': 2,
        'neptune': 1,
        'pluto': 1,
    }

    # Aspect significance for daily insights
    ASPECT_SIGNIFICANCE = {
        'conjunction': 10,
        'opposition': 8,
        'square': 7,
        'trine': 6,
        'sextile': 5,
        'quincunx': 3,
    }

    def __init__(self):
        self.transit_calc = get_transit_calculator()
        self.ai_interpreter = get_ai_interpreter()

    def generate_daily_insights(
        self,
        natal_chart: Dict[str, Any],
        birth_data: Dict[str, Any],
        target_date: Optional[date] = None
    ) -> Dict[str, Any]:
        """
        Generate comprehensive daily insights based on current transits.

        Args:
            natal_chart: The user's natal chart data
            birth_data: Birth information (name, date, etc.)
            target_date: Date to generate insights for (defaults to today)

        Returns:
            Dictionary containing daily insights, key transits, and recommendations
        """
        if target_date is None:
            target_date = date.today()

        target_datetime = datetime.combine(target_date, datetime.now().time())

        # Calculate current transits
        transit_data = self.transit_calc.calculate_transits(natal_chart, target_datetime)
        active_transits = transit_data.get('active_transits', [])

        # Score and prioritize transits
        scored_transits = self._score_transits(active_transits)
        key_transits = scored_transits[:5]  # Top 5 most significant

        # Determine overall day energy
        day_energy = self._calculate_day_energy(scored_transits)

        # Get moon phase info
        moon_phase = self._get_moon_phase(target_date)

        # Generate AI interpretation if available
        ai_insight = None
        if key_transits:
            ai_insight = self._generate_ai_insight(
                key_transits,
                day_energy,
                birth_data,
                target_date
            )

        # Generate specific recommendations
        recommendations = self._generate_recommendations(scored_transits, day_energy)

        return {
            "date": target_date.isoformat(),
            "name": birth_data.get('name', 'User'),
            "day_energy": day_energy,
            "moon_phase": moon_phase,
            "key_transits": key_transits,
            "all_transits_count": len(active_transits),
            "ai_insight": ai_insight,
            "recommendations": recommendations,
            "focus_areas": self._identify_focus_areas(scored_transits),
            "challenges": self._identify_challenges(scored_transits),
            "opportunities": self._identify_opportunities(scored_transits),
        }

    def _score_transits(self, transits: List[Dict]) -> List[Dict]:
        """Score transits by their daily significance."""
        scored = []

        for transit in transits:
            planet = transit.get('transiting_planet', '').lower()
            aspect = transit.get('aspect_name', '').lower()
            orb = transit.get('orb', 5)

            # Calculate significance score
            planet_weight = self.PLANET_WEIGHTS.get(planet, 1)
            aspect_weight = self.ASPECT_SIGNIFICANCE.get(aspect, 1)
            orb_factor = max(0.1, 1 - (orb / 10))  # Closer orbs = higher score

            score = planet_weight * aspect_weight * orb_factor

            scored.append({
                **transit,
                'significance_score': round(score, 2)
            })

        # Sort by significance
        scored.sort(key=lambda x: x['significance_score'], reverse=True)
        return scored

    def _calculate_day_energy(self, scored_transits: List[Dict]) -> Dict:
        """Calculate the overall energy of the day."""
        if not scored_transits:
            return {
                "level": "neutral",
                "score": 50,
                "description": "A balanced day with no major planetary influences."
            }

        # Categorize aspects
        harmonious = ['trine', 'sextile', 'conjunction']
        challenging = ['square', 'opposition', 'quincunx']

        positive_score = 0
        challenging_score = 0

        for transit in scored_transits[:10]:  # Top 10 transits
            aspect = transit.get('aspect_name', '').lower()
            weight = transit.get('significance_score', 1)

            if aspect in harmonious:
                positive_score += weight
            elif aspect in challenging:
                challenging_score += weight

        total = positive_score + challenging_score
        if total == 0:
            balance = 50
        else:
            balance = int((positive_score / total) * 100)

        if balance >= 70:
            level = "highly_positive"
            description = "An excellent day with strong supportive cosmic energies."
        elif balance >= 55:
            level = "positive"
            description = "A favorable day with more harmonious than challenging aspects."
        elif balance >= 45:
            level = "mixed"
            description = "A day of balance between opportunities and challenges."
        elif balance >= 30:
            level = "challenging"
            description = "A day requiring patience and careful navigation."
        else:
            level = "intense"
            description = "An intense day with significant growth opportunities through challenges."

        return {
            "level": level,
            "score": balance,
            "description": description,
            "positive_score": round(positive_score, 1),
            "challenging_score": round(challenging_score, 1)
        }

    def _get_moon_phase(self, target_date: date) -> Dict:
        """Get the current moon phase."""
        # Simple moon phase calculation
        # New moon reference: January 6, 2000
        reference = date(2000, 1, 6)
        days_since_new = (target_date - reference).days
        lunar_cycle = 29.53
        phase_day = days_since_new % lunar_cycle

        if phase_day < 1.85:
            phase = "New Moon"
            description = "Time for new beginnings and setting intentions."
        elif phase_day < 7.38:
            phase = "Waxing Crescent"
            description = "Building momentum, taking initial steps."
        elif phase_day < 9.23:
            phase = "First Quarter"
            description = "Time for action and overcoming obstacles."
        elif phase_day < 14.77:
            phase = "Waxing Gibbous"
            description = "Refining and adjusting your approach."
        elif phase_day < 16.61:
            phase = "Full Moon"
            description = "Culmination, clarity, and heightened emotions."
        elif phase_day < 22.15:
            phase = "Waning Gibbous"
            description = "Time for gratitude and sharing wisdom."
        elif phase_day < 24.00:
            phase = "Last Quarter"
            description = "Release, forgiveness, and letting go."
        else:
            phase = "Waning Crescent"
            description = "Rest, reflection, and preparation for new cycle."

        return {
            "phase": phase,
            "description": description,
            "day_of_cycle": round(phase_day, 1)
        }

    def _generate_ai_insight(
        self,
        key_transits: List[Dict],
        day_energy: Dict,
        birth_data: Dict,
        target_date: date
    ) -> Optional[str]:
        """Generate AI interpretation of daily transits."""
        try:
            # Format transit data for AI
            transit_summary = []
            for t in key_transits:
                transit_summary.append(
                    f"{t.get('transiting_planet', '')} {t.get('aspect_name', '')} "
                    f"natal {t.get('natal_planet', '')} (orb: {t.get('orb', 0):.1f}°)"
                )

            prompt = f"""Generate a brief, personalized daily astrological insight for {birth_data.get('name', 'the user')} on {target_date.strftime('%B %d, %Y')}.

Key Transits Today:
{chr(10).join(transit_summary)}

Day Energy: {day_energy.get('level', 'neutral')} ({day_energy.get('score', 50)}% positive)

Provide a warm, encouraging 2-3 sentence insight that:
1. Highlights the most important influence
2. Offers practical guidance
3. Maintains a positive, empowering tone"""

            result = self.ai_interpreter.generate_custom_interpretation(prompt)
            return result.get('interpretation', None)
        except Exception:
            return None

    def _generate_recommendations(
        self,
        scored_transits: List[Dict],
        day_energy: Dict
    ) -> Dict[str, List[str]]:
        """Generate specific recommendations based on transits."""
        recommendations = {
            "do": [],
            "avoid": [],
            "focus_on": []
        }

        # Analyze top transits for recommendations
        for transit in scored_transits[:7]:
            transiting = transit.get('transiting_planet', '').lower()
            natal = transit.get('natal_planet', '').lower()
            aspect = transit.get('aspect_name', '').lower()

            # Add planet-specific recommendations
            if transiting == 'moon':
                if aspect in ['trine', 'sextile']:
                    recommendations["focus_on"].append("emotional connections and self-care")
                elif aspect in ['square', 'opposition']:
                    recommendations["avoid"].append("emotional decisions without reflection")

            elif transiting == 'mercury':
                if aspect in ['trine', 'sextile', 'conjunction']:
                    recommendations["do"].append("important communications and negotiations")
                elif aspect in ['square', 'opposition']:
                    recommendations["avoid"].append("signing contracts without careful review")

            elif transiting == 'venus':
                if aspect in ['trine', 'sextile']:
                    recommendations["do"].append("social activities and creative pursuits")
                elif aspect in ['square', 'opposition']:
                    recommendations["avoid"].append("impulsive spending or romantic decisions")

            elif transiting == 'mars':
                if aspect in ['trine', 'sextile']:
                    recommendations["do"].append("physical activity and taking initiative")
                elif aspect in ['square', 'opposition']:
                    recommendations["avoid"].append("confrontations and rushed decisions")

        # Remove duplicates and limit
        for key in recommendations:
            recommendations[key] = list(set(recommendations[key]))[:3]

        return recommendations

    def _identify_focus_areas(self, scored_transits: List[Dict]) -> List[str]:
        """Identify key areas to focus on today."""
        areas = set()

        natal_planet_areas = {
            'sun': 'identity and self-expression',
            'moon': 'emotions and home life',
            'mercury': 'communication and learning',
            'venus': 'relationships and values',
            'mars': 'action and energy',
            'jupiter': 'growth and opportunities',
            'saturn': 'responsibilities and discipline',
        }

        for transit in scored_transits[:5]:
            natal = transit.get('natal_planet', '').lower()
            if natal in natal_planet_areas:
                areas.add(natal_planet_areas[natal])

        return list(areas)[:4]

    def _identify_challenges(self, scored_transits: List[Dict]) -> List[str]:
        """Identify potential challenges for the day."""
        challenges = []
        challenging_aspects = ['square', 'opposition', 'quincunx']

        for transit in scored_transits[:10]:
            aspect = transit.get('aspect_name', '').lower()
            if aspect in challenging_aspects:
                transiting = transit.get('transiting_planet', '').title()
                natal = transit.get('natal_planet', '').title()
                challenges.append(
                    f"Tension between transiting {transiting} and natal {natal}"
                )

        return challenges[:3]

    def _identify_opportunities(self, scored_transits: List[Dict]) -> List[str]:
        """Identify opportunities for the day."""
        opportunities = []
        harmonious_aspects = ['trine', 'sextile']

        for transit in scored_transits[:10]:
            aspect = transit.get('aspect_name', '').lower()
            if aspect in harmonious_aspects:
                transiting = transit.get('transiting_planet', '').title()
                natal = transit.get('natal_planet', '').title()
                opportunities.append(
                    f"Favorable flow between transiting {transiting} and natal {natal}"
                )

        return opportunities[:3]

    def get_week_preview(
        self,
        natal_chart: Dict[str, Any],
        birth_data: Dict[str, Any]
    ) -> List[Dict]:
        """Generate a preview for the coming week."""
        preview = []
        today = date.today()

        for i in range(7):
            target = today + timedelta(days=i)
            insights = self.generate_daily_insights(natal_chart, birth_data, target)

            preview.append({
                "date": target.isoformat(),
                "day_name": target.strftime("%A"),
                "energy_level": insights["day_energy"]["level"],
                "energy_score": insights["day_energy"]["score"],
                "key_transit_count": len(insights["key_transits"]),
                "moon_phase": insights["moon_phase"]["phase"],
            })

        return preview


# Singleton instance
_daily_insights_service = None


def get_daily_insights_service() -> DailyInsightsService:
    """Get the singleton DailyInsightsService instance."""
    global _daily_insights_service
    if _daily_insights_service is None:
        _daily_insights_service = DailyInsightsService()
    return _daily_insights_service
