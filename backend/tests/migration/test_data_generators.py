"""
Synthetic test data generators for migration testing.

This module provides factories for generating realistic test data
at various scales for performance and stress testing.
"""
import random
import string
from datetime import datetime, timedelta
from typing import Any, Dict, List
from uuid import uuid4


class SyntheticDataGenerator:
    """Generate synthetic test data for migration testing."""

    def __init__(self, seed: int = 42):
        """
        Initialize generator with optional seed for reproducibility.

        Args:
            seed: Random seed for deterministic generation
        """
        random.seed(seed)
        self.user_id = str(uuid4())
        self.cities = [
            ("New York", "NY", "USA", 40.7128, -74.0060, "America/New_York"),
            ("Los Angeles", "CA", "USA", 34.0522, -118.2437, "America/Los_Angeles"),
            ("Chicago", "IL", "USA", 41.8781, -87.6298, "America/Chicago"),
            ("Houston", "TX", "USA", 29.7604, -95.3698, "America/Chicago"),
            ("Phoenix", "AZ", "USA", 33.4484, -112.0740, "America/Phoenix"),
            ("London", "England", "UK", 51.5074, -0.1278, "Europe/London"),
            ("Paris", "Île-de-France", "France", 48.8566, 2.3522, "Europe/Paris"),
            ("Tokyo", "Tokyo", "Japan", 35.6762, 139.6503, "Asia/Tokyo"),
            ("Sydney", "NSW", "Australia", -33.8688, 151.2093, "Australia/Sydney"),
            ("Mumbai", "Maharashtra", "India", 19.0760, 72.8777, "Asia/Kolkata"),
        ]
        self.first_names = [
            "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael",
            "Linda", "William", "Elizabeth", "David", "Barbara", "Richard", "Susan",
            "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen"
        ]
        self.last_names = [
            "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
            "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez",
            "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"
        ]
        self.chart_types = ["natal", "transit", "synastry", "composite", "progressed"]
        self.house_systems = ["placidus", "koch", "equal", "whole_sign", "campanus"]
        self.zodiac_types = ["tropical", "sidereal"]
        self.rodden_ratings = ["AA", "A", "B", "C", "DD", "X"]

    def generate_user_data(self, email: str = None) -> Dict[str, Any]:
        """
        Generate user and preferences data.

        Args:
            email: Optional email, generates random if not provided

        Returns:
            Dictionary with user and preferences data
        """
        if email is None:
            email = f"user{random.randint(1000, 9999)}@example.com"

        user_id = self.user_id
        now = datetime.utcnow().isoformat()

        return {
            "user": {
                "id": user_id,
                "email": email,
                "full_name": f"{random.choice(self.first_names)} {random.choice(self.last_names)}",
                "password_hash": "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyGPEZBrZB/.",
                "created_at": now,
                "updated_at": now,
            },
            "preferences": {
                "id": str(uuid4()),
                "user_id": user_id,
                "default_house_system": random.choice(self.house_systems),
                "default_ayanamsa": random.choice(["lahiri", "krishnamurti", "raman"]),
                "default_zodiac": random.choice(self.zodiac_types),
                "aspect_orbs": {
                    "conjunction": random.randint(8, 12),
                    "opposition": random.randint(8, 12),
                    "trine": random.randint(6, 10),
                    "square": random.randint(6, 10),
                    "sextile": random.randint(4, 8),
                },
                "color_scheme": random.choice(["light", "dark", "auto"]),
                "displayed_points": ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"],
                "created_at": now,
                "updated_at": now,
            },
        }

    def generate_client(self, client_id: str = None) -> Dict[str, Any]:
        """
        Generate a single client record.

        Args:
            client_id: Optional client ID, generates random if not provided

        Returns:
            Client dictionary
        """
        if client_id is None:
            client_id = str(uuid4())

        first_name = random.choice(self.first_names)
        last_name = random.choice(self.last_names)
        created = datetime.utcnow() - timedelta(days=random.randint(1, 365))

        return {
            "id": client_id,
            "user_id": self.user_id,
            "first_name": first_name,
            "last_name": last_name,
            "email": f"{first_name.lower()}.{last_name.lower()}@example.com",
            "phone": f"+1-555-{random.randint(1000, 9999)}",
            "notes": self._generate_notes(),
            "created_at": created.isoformat(),
            "updated_at": created.isoformat(),
        }

    def generate_clients(self, count: int) -> List[Dict[str, Any]]:
        """
        Generate multiple client records.

        Args:
            count: Number of clients to generate

        Returns:
            List of client dictionaries
        """
        return [self.generate_client() for _ in range(count)]

    def generate_birth_data(self, client_id: str) -> Dict[str, Any]:
        """
        Generate birth data for a client.

        Args:
            client_id: Client ID to associate with

        Returns:
            Birth data dictionary
        """
        city, state, country, lat, lon, tz = random.choice(self.cities)
        time_unknown = random.random() < 0.2  # 20% chance of unknown time

        birth_date = datetime(
            year=random.randint(1940, 2020),
            month=random.randint(1, 12),
            day=random.randint(1, 28)
        )

        birth_time = None if time_unknown else f"{random.randint(0, 23):02d}:{random.randint(0, 59):02d}:00"

        return {
            "id": str(uuid4()),
            "client_id": client_id,
            "birth_date": birth_date.strftime("%Y-%m-%d"),
            "birth_time": birth_time,
            "time_unknown": time_unknown,
            "latitude": lat,
            "longitude": lon,
            "timezone": tz,
            "utc_offset": random.choice([-480, -420, -360, -300, -240, 0, 60, 120, 330, 540]),
            "city": city,
            "state_province": state,
            "country": country,
            "rodden_rating": random.choice(self.rodden_ratings),
            "gender": random.choice(["male", "female", "other", None]),
            "created_at": birth_date.isoformat(),
            "updated_at": birth_date.isoformat(),
        }

    def generate_chart(self, client_id: str, birth_data_id: str) -> Dict[str, Any]:
        """
        Generate a chart record.

        Args:
            client_id: Client ID to associate with
            birth_data_id: Birth data ID to use

        Returns:
            Chart dictionary
        """
        chart_type = random.choice(self.chart_types)
        created = datetime.utcnow() - timedelta(days=random.randint(1, 180))

        return {
            "id": str(uuid4()),
            "user_id": self.user_id,
            "client_id": client_id,
            "birth_data_id": birth_data_id,
            "chart_name": f"{chart_type.title()} Chart",
            "chart_type": chart_type,
            "astro_system": random.choice(["western", "vedic"]),
            "house_system": random.choice(self.house_systems),
            "ayanamsa": random.choice([None, "lahiri", "krishnamurti"]),
            "zodiac_type": random.choice(self.zodiac_types),
            "calculation_params": self._generate_calculation_params(),
            "chart_data": self._generate_chart_data(),
            "last_viewed": created.isoformat(),
            "created_at": created.isoformat(),
            "updated_at": created.isoformat(),
        }

    def generate_interpretation(self, custom: bool = False) -> Dict[str, Any]:
        """
        Generate an interpretation record.

        Args:
            custom: Whether this is a user custom interpretation

        Returns:
            Interpretation dictionary
        """
        interp_types = ["planet_in_sign", "planet_in_house", "aspect", "house_cusp"]
        interp_type = random.choice(interp_types)

        return {
            "id": str(uuid4()),
            "user_id": self.user_id if custom else None,
            "interpretation_type": interp_type,
            "key_identifier": self._generate_key_identifier(interp_type),
            "tradition": random.choice(["western", "vedic", "hellenistic"]),
            "text_content": self._generate_interpretation_text(),
            "source": "custom" if custom else random.choice(["Classical Astrology", "Modern Astrology", "Vedic Texts"]),
            "is_user_custom": custom,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }

    def generate_chart_interpretation(self, chart_id: str, interpretation_id: str) -> Dict[str, Any]:
        """
        Generate a chart interpretation link.

        Args:
            chart_id: Chart ID
            interpretation_id: Interpretation ID

        Returns:
            Chart interpretation dictionary
        """
        return {
            "id": str(uuid4()),
            "chart_id": chart_id,
            "interpretation_id": interpretation_id,
            "ai_enhanced_text": self._generate_interpretation_text() if random.random() < 0.3 else None,
            "relevance_score": round(random.uniform(0.5, 1.0), 2),
            "created_at": datetime.utcnow().isoformat(),
        }

    def generate_aspect_pattern(self, chart_id: str) -> Dict[str, Any]:
        """
        Generate an aspect pattern.

        Args:
            chart_id: Chart ID to associate with

        Returns:
            Aspect pattern dictionary
        """
        patterns = ["grand_trine", "grand_cross", "t_square", "yod", "kite", "stellium"]

        return {
            "id": str(uuid4()),
            "chart_id": chart_id,
            "pattern_type": random.choice(patterns),
            "planets_involved": random.sample(
                ["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"],
                k=random.randint(3, 5)
            ),
            "orb_quality": round(random.uniform(0.5, 1.0), 2),
            "interpretation_text": self._generate_interpretation_text(),
            "created_at": datetime.utcnow().isoformat(),
        }

    def generate_transit_event(self, chart_id: str) -> Dict[str, Any]:
        """
        Generate a transit event.

        Args:
            chart_id: Chart ID to associate with

        Returns:
            Transit event dictionary
        """
        event_date = datetime.utcnow() + timedelta(days=random.randint(-30, 365))

        return {
            "id": str(uuid4()),
            "chart_id": chart_id,
            "transiting_planet": random.choice(["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"]),
            "natal_planet": random.choice(["sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"]),
            "aspect_type": random.choice(["conjunction", "opposition", "trine", "square", "sextile"]),
            "exact_date": event_date.isoformat(),
            "orb": round(random.uniform(0.0, 2.0), 2),
            "influence_start": (event_date - timedelta(days=7)).isoformat(),
            "influence_end": (event_date + timedelta(days=7)).isoformat(),
            "interpretation_text": self._generate_interpretation_text(),
            "created_at": datetime.utcnow().isoformat(),
        }

    def generate_session_note(self, client_id: str) -> Dict[str, Any]:
        """
        Generate a session note.

        Args:
            client_id: Client ID to associate with

        Returns:
            Session note dictionary
        """
        session_date = datetime.utcnow() - timedelta(days=random.randint(1, 90))

        return {
            "id": str(uuid4()),
            "client_id": client_id,
            "session_date": session_date.isoformat(),
            "notes": self._generate_notes(long=True),
            "tags": random.sample(["consultation", "follow-up", "urgent", "regular"], k=random.randint(1, 3)),
            "created_at": session_date.isoformat(),
            "updated_at": session_date.isoformat(),
        }

    def generate_location_cache(self) -> Dict[str, Any]:
        """
        Generate a location cache entry.

        Returns:
            Location cache dictionary
        """
        city, state, country, lat, lon, tz = random.choice(self.cities)

        return {
            "id": str(uuid4()),
            "city_name": city,
            "state_province": state,
            "country": country,
            "latitude": lat,
            "longitude": lon,
            "timezone": tz,
            "geonames_id": random.randint(1000000, 9999999),
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat(),
        }

    def generate_complete_dataset(
        self,
        num_clients: int = 10,
        charts_per_client: int = 2,
        interpretations: int = 5,
        session_notes_per_client: int = 1
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        Generate a complete dataset with related records.

        Args:
            num_clients: Number of clients to generate
            charts_per_client: Average charts per client
            interpretations: Number of base interpretations
            session_notes_per_client: Average session notes per client

        Returns:
            Dictionary with all table data
        """
        dataset = {
            "user_data": self.generate_user_data(),
            "clients": [],
            "birth_data": [],
            "charts": [],
            "interpretations": [],
            "chart_interpretations": [],
            "aspect_patterns": [],
            "transit_events": [],
            "session_notes": [],
            "location_cache": [],
        }

        # Generate interpretations first
        for i in range(interpretations):
            dataset["interpretations"].append(self.generate_interpretation(custom=(i % 3 == 0)))

        # Generate clients and related data
        for _ in range(num_clients):
            client = self.generate_client()
            dataset["clients"].append(client)

            # Birth data
            birth_data = self.generate_birth_data(client["id"])
            dataset["birth_data"].append(birth_data)

            # Charts
            num_charts = random.randint(1, charts_per_client + 1)
            for _ in range(num_charts):
                chart = self.generate_chart(client["id"], birth_data["id"])
                dataset["charts"].append(chart)

                # Chart interpretations
                if random.random() < 0.7:  # 70% of charts get interpretations
                    interp = random.choice(dataset["interpretations"])
                    dataset["chart_interpretations"].append(
                        self.generate_chart_interpretation(chart["id"], interp["id"])
                    )

                # Aspect patterns
                if random.random() < 0.4:  # 40% of charts have patterns
                    dataset["aspect_patterns"].append(self.generate_aspect_pattern(chart["id"]))

                # Transit events
                if random.random() < 0.5:  # 50% of charts have transits
                    num_transits = random.randint(1, 3)
                    for _ in range(num_transits):
                        dataset["transit_events"].append(self.generate_transit_event(chart["id"]))

            # Session notes
            num_notes = random.randint(0, session_notes_per_client + 1)
            for _ in range(num_notes):
                dataset["session_notes"].append(self.generate_session_note(client["id"]))

        # Generate some location cache entries
        for _ in range(len(self.cities)):
            dataset["location_cache"].append(self.generate_location_cache())

        return dataset

    # Private helper methods

    def _generate_notes(self, long: bool = False) -> str:
        """Generate random notes text."""
        sentences = [
            "Client is very interested in career development.",
            "Discussed upcoming Saturn return.",
            "Noted strong focus on relationships.",
            "Client experiencing major life transition.",
            "Follow-up scheduled for next month.",
            "Very receptive to interpretation.",
            "Questions about timing of events.",
            "Interested in synastry reading.",
        ]

        if long:
            return " ".join(random.sample(sentences, k=random.randint(3, 6)))
        else:
            return random.choice(sentences)

    def _generate_calculation_params(self) -> Dict[str, Any]:
        """Generate random calculation parameters."""
        return {
            "node_type": random.choice(["true", "mean"]),
            "house_system": random.choice(self.house_systems),
            "include_chiron": random.choice([True, False]),
        }

    def _generate_chart_data(self) -> Dict[str, Any]:
        """Generate random chart data."""
        planets = {}
        for planet in ["sun", "moon", "mercury", "venus", "mars"]:
            planets[planet] = {
                "longitude": round(random.uniform(0, 360), 4),
                "sign": random.randint(0, 11),
                "house": random.randint(1, 12),
                "retrograde": random.choice([True, False]),
            }

        return {
            "planets": planets,
            "houses": {
                "cusps": [round(random.uniform(0, 360), 2) for _ in range(12)]
            },
            "aspects": [
                {
                    "planet1": "sun",
                    "planet2": "moon",
                    "type": "trine",
                    "orb": round(random.uniform(0, 8), 2),
                }
            ],
        }

    def _generate_interpretation_text(self) -> str:
        """Generate random interpretation text."""
        templates = [
            "This placement indicates {quality} in {area}.",
            "The native may experience {quality} when dealing with {area}.",
            "Strong focus on {area} with {quality} energy.",
            "This aspect suggests {quality} approach to {area}.",
        ]

        qualities = ["dynamic", "stable", "transformative", "challenging", "harmonious", "intense"]
        areas = ["career", "relationships", "personal growth", "communication", "resources", "spirituality"]

        template = random.choice(templates)
        return template.format(
            quality=random.choice(qualities),
            area=random.choice(areas)
        )

    def _generate_key_identifier(self, interp_type: str) -> str:
        """Generate a key identifier for interpretation."""
        if interp_type == "planet_in_sign":
            planet = random.choice(["sun", "moon", "mercury", "venus", "mars"])
            sign = random.choice(["aries", "taurus", "gemini", "cancer", "leo", "virgo"])
            return f"{planet}_in_{sign}"
        elif interp_type == "planet_in_house":
            planet = random.choice(["sun", "moon", "mercury", "venus", "mars"])
            house = random.randint(1, 12)
            return f"{planet}_in_house_{house}"
        elif interp_type == "aspect":
            p1 = random.choice(["sun", "moon", "mercury"])
            p2 = random.choice(["venus", "mars", "jupiter"])
            aspect = random.choice(["conjunction", "trine", "square"])
            return f"{p1}_{aspect}_{p2}"
        else:
            house = random.randint(1, 12)
            sign = random.choice(["aries", "taurus", "gemini"])
            return f"house_{house}_in_{sign}"


# Test the generator
def test_generate_user_data():
    """Test user data generation."""
    gen = SyntheticDataGenerator(seed=42)
    data = gen.generate_user_data("test@example.com")

    assert "user" in data
    assert "preferences" in data
    assert data["user"]["email"] == "test@example.com"
    assert "password_hash" in data["user"]
    assert "aspect_orbs" in data["preferences"]


def test_generate_client():
    """Test client generation."""
    gen = SyntheticDataGenerator(seed=42)
    client = gen.generate_client()

    assert "id" in client
    assert "first_name" in client
    assert "last_name" in client
    assert "email" in client
    assert "@example.com" in client["email"]


def test_generate_birth_data():
    """Test birth data generation."""
    gen = SyntheticDataGenerator(seed=42)
    client_id = "test-client-id"
    birth_data = gen.generate_birth_data(client_id)

    assert birth_data["client_id"] == client_id
    assert "birth_date" in birth_data
    assert "latitude" in birth_data
    assert "longitude" in birth_data
    assert -90 <= birth_data["latitude"] <= 90
    assert -180 <= birth_data["longitude"] <= 180


def test_generate_chart():
    """Test chart generation."""
    gen = SyntheticDataGenerator(seed=42)
    client_id = "test-client-id"
    birth_data_id = "test-birth-data-id"
    chart = gen.generate_chart(client_id, birth_data_id)

    assert chart["client_id"] == client_id
    assert chart["birth_data_id"] == birth_data_id
    assert "chart_data" in chart
    assert isinstance(chart["chart_data"], dict)


def test_generate_complete_dataset():
    """Test complete dataset generation."""
    gen = SyntheticDataGenerator(seed=42)
    dataset = gen.generate_complete_dataset(
        num_clients=5,
        charts_per_client=2,
        interpretations=3
    )

    assert len(dataset["clients"]) == 5
    assert len(dataset["birth_data"]) == 5
    assert len(dataset["charts"]) >= 5  # At least 1 per client
    assert len(dataset["interpretations"]) == 3
    assert "user_data" in dataset


def test_generate_large_dataset():
    """Test generation of large dataset for performance testing."""
    gen = SyntheticDataGenerator(seed=123)
    dataset = gen.generate_complete_dataset(
        num_clients=100,
        charts_per_client=3,
        interpretations=20,
        session_notes_per_client=2
    )

    assert len(dataset["clients"]) == 100
    assert len(dataset["charts"]) >= 100
    assert len(dataset["interpretations"]) == 20

    # Verify all required fields are present
    for client in dataset["clients"]:
        assert "id" in client
        assert "email" in client

    for chart in dataset["charts"]:
        assert "id" in chart
        assert "chart_data" in chart
        assert isinstance(chart["chart_data"], dict)


def test_reproducible_generation():
    """Test that same seed produces same data."""
    gen1 = SyntheticDataGenerator(seed=42)
    gen2 = SyntheticDataGenerator(seed=42)

    client1 = gen1.generate_client()
    client2 = gen2.generate_client()

    assert client1["first_name"] == client2["first_name"]
    assert client1["last_name"] == client2["last_name"]
