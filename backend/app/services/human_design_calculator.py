"""
Human Design Calculator Service

Core calculation engine for Human Design charts including:
- Design datetime calculation (88° solar arc)
- Gate/Line activations for all planets
- Channel and Center definitions
- Type, Strategy, Authority determination
- Profile and Incarnation Cross
- Variables (Color, Tone, Base)
- Dual sidereal method support
"""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Set
from app.utils.ephemeris import EphemerisCalculator
from app.core.human_design_data import (
    # Gate/Line helpers
    get_gate_at_degree,
    get_line_at_degree,
    get_color_at_degree,
    get_tone_at_degree,
    get_base_at_degree,
    get_center_for_gate,
    get_channel_for_gates,
    get_quarter_for_gate,
    get_cross_type_from_profile,
    get_incarnation_cross_name,
    get_cross_variation,
    CROSS_VARIATIONS,
    # Data
    GATE_WHEEL,
    GATE_NAMES,
    GATE_KEYWORDS,
    GATE_DESCRIPTIONS,
    INCARNATION_CROSS_NAMES,
    CENTERS,
    CHANNELS,
    GATE_TO_CHANNELS,
    TYPES,
    AUTHORITIES,
    PROFILES,
    DEFINITIONS,
    PLANET_THEMES,
    HD_PLANETS,
    LINE_ARCHETYPES,
    # Enums
    CenterType,
    HumanDesignType,
    Authority,
    Definition,
    CrossType,
)


class HumanDesignCalculator:
    """
    Complete Human Design chart calculation service.

    Supports both tropical (Western) and sidereal HD calculations with
    two sidereal methods:
    - shift_positions: Apply ayanamsa to planetary longitudes
    - shift_wheel: Keep tropical positions, rotate gate wheel
    """

    # The HD planets in calculation order
    PLANETS = [
        'sun', 'moon', 'mercury', 'venus', 'mars',
        'jupiter', 'saturn', 'uranus', 'neptune', 'pluto',
        'north_node'
    ]

    # 88° solar arc for Design calculation
    DESIGN_SOLAR_ARC = 88.0

    @staticmethod
    def calculate_chart(
        birth_datetime: datetime,
        latitude: float,
        longitude: float,
        timezone_offset_minutes: int = 0,
        zodiac_type: str = 'tropical',
        sidereal_method: str = 'shift_positions',
        ayanamsa: str = 'lahiri',
        include_variables: bool = True
    ) -> Dict:
        """
        Calculate complete Human Design chart.

        Args:
            birth_datetime: Birth date and time
            latitude: Birth location latitude
            longitude: Birth location longitude
            timezone_offset_minutes: Timezone offset from UTC in minutes
            zodiac_type: 'tropical' or 'sidereal'
            sidereal_method: 'shift_positions' or 'shift_wheel' (for sidereal only)
            ayanamsa: Ayanamsa system for sidereal calculations
            include_variables: Whether to calculate Variables (arrows)

        Returns:
            Complete HD chart data dictionary
        """
        # Convert birth datetime to Julian Day
        personality_jd = EphemerisCalculator.datetime_to_julian_day(
            birth_datetime, timezone_offset_minutes
        )

        # Find Design datetime (when Sun was 88° behind)
        design_jd, design_datetime, days_before = HumanDesignCalculator._find_design_datetime(
            personality_jd, zodiac_type, ayanamsa
        )

        # Get ayanamsa value if sidereal
        ayanamsa_value = 0.0
        if zodiac_type == 'sidereal':
            ayanamsa_value = EphemerisCalculator.calculate_ayanamsa(personality_jd, ayanamsa)

        # Calculate planetary positions for Personality (birth time)
        personality_planets = HumanDesignCalculator._calculate_all_positions(
            personality_jd, zodiac_type, sidereal_method, ayanamsa, ayanamsa_value
        )

        # Calculate planetary positions for Design (~88 days before)
        design_planets = HumanDesignCalculator._calculate_all_positions(
            design_jd, zodiac_type, sidereal_method, ayanamsa, ayanamsa_value
        )

        # Calculate gate activations for both
        personality_activations = HumanDesignCalculator._calculate_activations(
            personality_planets, 'Personality', include_variables
        )
        design_activations = HumanDesignCalculator._calculate_activations(
            design_planets, 'Design', include_variables
        )

        # Collect all activated gates
        all_gates = set()
        personality_gates = set()
        design_gates = set()

        for planet, activation in personality_activations.items():
            all_gates.add(activation['gate'])
            personality_gates.add(activation['gate'])

        for planet, activation in design_activations.items():
            all_gates.add(activation['gate'])
            design_gates.add(activation['gate'])

        # Calculate defined channels
        channels = HumanDesignCalculator._calculate_channels(
            personality_activations, design_activations
        )

        # Calculate center definitions
        centers = HumanDesignCalculator._calculate_centers(channels, all_gates)
        defined_centers = [c for c, data in centers.items() if data['defined']]
        undefined_centers = [c for c, data in centers.items() if not data['defined']]

        # Determine Type
        hd_type, strategy = HumanDesignCalculator._determine_type(centers, channels)

        # Determine Authority
        authority, authority_desc = HumanDesignCalculator._determine_authority(
            centers, hd_type
        )

        # Calculate Profile
        profile = HumanDesignCalculator._calculate_profile(
            personality_activations, design_activations
        )

        # Calculate Definition type
        definition, definition_desc = HumanDesignCalculator._calculate_definition(
            centers, channels
        )

        # Calculate Incarnation Cross
        incarnation_cross = HumanDesignCalculator._calculate_incarnation_cross(
            personality_activations, design_activations, profile
        )

        # Calculate Variables if requested
        variables = None
        if include_variables:
            variables = HumanDesignCalculator._calculate_variables(
                personality_activations, design_activations
            )

        # Get type data
        type_data = TYPES.get(hd_type, {})

        # Build response
        return {
            # Core HD elements
            'hd_type': hd_type.value,
            'strategy': strategy,
            'authority': authority.value,
            'authority_description': authority_desc,
            'signature': type_data.get('signature', ''),
            'not_self': type_data.get('not_self', ''),

            # Profile
            'profile': profile,

            # Definition
            'definition': definition.value,
            'definition_description': definition_desc,

            # Planetary activations
            'personality_activations': {
                planet: HumanDesignCalculator._format_activation(act)
                for planet, act in personality_activations.items()
            },
            'design_activations': {
                planet: HumanDesignCalculator._format_activation(act)
                for planet, act in design_activations.items()
            },

            # Centers
            'centers': {
                center: HumanDesignCalculator._format_center(data)
                for center, data in centers.items()
            },
            'defined_centers': [c.value for c in defined_centers],
            'undefined_centers': [c.value for c in undefined_centers],

            # Channels
            'channels': channels,

            # Gates
            'all_activated_gates': sorted(list(all_gates)),
            'personality_gates': sorted(list(personality_gates)),
            'design_gates': sorted(list(design_gates)),

            # Incarnation Cross
            'incarnation_cross': incarnation_cross,

            # Variables
            'variables': variables,

            # Timing
            'personality_datetime': birth_datetime.isoformat(),
            'design_datetime': design_datetime.isoformat(),
            'design_days_before': days_before,

            # Calculation metadata
            'calculation_info': {
                'zodiac_type': zodiac_type,
                'sidereal_method': sidereal_method if zodiac_type == 'sidereal' else None,
                'ayanamsa': ayanamsa if zodiac_type == 'sidereal' else None,
                'ayanamsa_value': ayanamsa_value if zodiac_type == 'sidereal' else None,
                'personality_jd': personality_jd,
                'design_jd': design_jd,
            }
        }

    @staticmethod
    def _find_design_datetime(
        personality_jd: float,
        zodiac_type: str,
        ayanamsa: str
    ) -> Tuple[float, datetime, float]:
        """
        Find the Design datetime when Sun was 88° behind birth Sun position.
        Uses binary search for precision (Sun speed varies throughout year).

        Returns:
            Tuple of (design_jd, design_datetime, days_before)
        """
        # Get birth Sun position
        birth_sun = EphemerisCalculator.calculate_planet_position(
            'sun', personality_jd,
            zodiac=zodiac_type,
            ayanamsa=ayanamsa
        )
        birth_sun_long = birth_sun['longitude']

        # Target position is 88° behind (earlier in zodiac)
        target_long = (birth_sun_long - HumanDesignCalculator.DESIGN_SOLAR_ARC) % 360

        # Initial estimate: ~88 days before (Sun moves ~1° per day)
        # But we need to search because Sun speed varies
        estimate_days = 89.0  # Slightly more than 88 due to average Sun speed

        # Binary search window
        low_jd = personality_jd - estimate_days - 5
        high_jd = personality_jd - estimate_days + 5

        # Binary search for exact position
        tolerance = 0.0001  # ~0.4 seconds of arc
        max_iterations = 50

        for _ in range(max_iterations):
            mid_jd = (low_jd + high_jd) / 2
            mid_sun = EphemerisCalculator.calculate_planet_position(
                'sun', mid_jd,
                zodiac=zodiac_type,
                ayanamsa=ayanamsa
            )
            mid_long = mid_sun['longitude']

            # Calculate difference from target
            diff = HumanDesignCalculator._angle_difference(mid_long, target_long)

            if abs(diff) < tolerance:
                break

            # Adjust search window
            if diff > 0:
                # Sun is ahead of target, need earlier time
                high_jd = mid_jd
            else:
                # Sun is behind target, need later time
                low_jd = mid_jd

        design_jd = mid_jd
        design_datetime = EphemerisCalculator.julian_day_to_datetime(design_jd)
        days_before = personality_jd - design_jd

        return design_jd, design_datetime, days_before

    @staticmethod
    def _angle_difference(angle1: float, angle2: float) -> float:
        """Calculate shortest signed difference between two angles."""
        diff = (angle1 - angle2) % 360
        if diff > 180:
            diff -= 360
        return diff

    @staticmethod
    def _calculate_all_positions(
        jd: float,
        zodiac_type: str,
        sidereal_method: str,
        ayanamsa: str,
        ayanamsa_value: float
    ) -> Dict[str, Dict]:
        """
        Calculate planetary positions for all HD planets.

        Handles sidereal methods:
        - shift_positions: Swiss Ephemeris handles sidereal natively
        - shift_wheel: Use tropical positions (gate wheel will be shifted)
        """
        use_zodiac = zodiac_type
        if zodiac_type == 'sidereal' and sidereal_method == 'shift_wheel':
            # For shift_wheel method, get tropical positions
            # The ayanamsa will be applied when mapping to gates
            use_zodiac = 'tropical'

        positions = {}

        for planet in HumanDesignCalculator.PLANETS:
            try:
                pos = EphemerisCalculator.calculate_planet_position(
                    planet, jd, zodiac=use_zodiac, ayanamsa=ayanamsa
                )
                positions[planet] = pos

                # Calculate Earth (opposite Sun) and South Node (opposite North Node)
                if planet == 'sun':
                    earth_long = (pos['longitude'] + 180) % 360
                    positions['earth'] = {
                        'longitude': earth_long,
                        'sign': int(earth_long / 30),
                        'degree_in_sign': earth_long % 30,
                        'sign_name': EphemerisCalculator.get_sign_name(int(earth_long / 30)),
                        'retrograde': False,
                        'latitude': 0,
                        'speed_longitude': pos['speed_longitude'],
                    }
                elif planet == 'north_node':
                    south_long = (pos['longitude'] + 180) % 360
                    positions['south_node'] = {
                        'longitude': south_long,
                        'sign': int(south_long / 30),
                        'degree_in_sign': south_long % 30,
                        'sign_name': EphemerisCalculator.get_sign_name(int(south_long / 30)),
                        'retrograde': pos.get('retrograde', True),
                        'latitude': 0,
                        'speed_longitude': pos.get('speed_longitude', 0),
                    }
            except Exception as e:
                print(f"Error calculating {planet}: {e}")
                positions[planet] = None

        return positions

    @staticmethod
    def _calculate_activations(
        positions: Dict[str, Dict],
        activation_type: str,
        include_variables: bool
    ) -> Dict[str, Dict]:
        """
        Calculate gate/line activations for all planets.

        Args:
            positions: Planet position data
            activation_type: 'Personality' or 'Design'
            include_variables: Whether to include Color, Tone, Base
        """
        activations = {}

        for planet, pos in positions.items():
            if pos is None:
                continue

            longitude = pos['longitude']

            # Calculate gate and line
            gate = get_gate_at_degree(longitude)
            line = get_line_at_degree(longitude)

            activation = {
                'gate': gate,
                'line': line,
                'planet': planet.replace('_', ' ').title(),
                'longitude': longitude,
                'sign': pos.get('sign_name', ''),
                'degree_in_sign': pos.get('degree_in_sign', 0),
                'retrograde': pos.get('retrograde', False),
                'gate_name': GATE_NAMES.get(gate, ''),
                'gate_keyword': GATE_KEYWORDS.get(gate, ''),
                'activation_type': activation_type,
            }

            # Add Variables data if requested
            if include_variables:
                activation['color'] = get_color_at_degree(longitude)
                activation['tone'] = get_tone_at_degree(longitude)
                activation['base'] = get_base_at_degree(longitude)

            activations[planet] = activation

        return activations

    @staticmethod
    def _calculate_channels(
        personality_activations: Dict[str, Dict],
        design_activations: Dict[str, Dict]
    ) -> List[Dict]:
        """
        Calculate defined channels.
        A channel is defined when both endpoint gates are activated
        (can be from Personality, Design, or both).
        """
        # Collect all activated gates with their sources
        gate_sources: Dict[int, Dict] = {}  # gate -> {personality: [planets], design: [planets]}

        for planet, act in personality_activations.items():
            gate = act['gate']
            if gate not in gate_sources:
                gate_sources[gate] = {'personality': [], 'design': []}
            gate_sources[gate]['personality'].append(act['planet'])

        for planet, act in design_activations.items():
            gate = act['gate']
            if gate not in gate_sources:
                gate_sources[gate] = {'personality': [], 'design': []}
            gate_sources[gate]['design'].append(act['planet'])

        # Check each channel definition
        defined_channels = []

        for (gate1, gate2), channel_data in CHANNELS.items():
            name, center1, center2, circuit, description = channel_data

            # Check if both gates are activated
            if gate1 in gate_sources and gate2 in gate_sources:
                source1 = gate_sources[gate1]
                source2 = gate_sources[gate2]

                # Determine activation type
                g1_pers = len(source1['personality']) > 0
                g1_des = len(source1['design']) > 0
                g2_pers = len(source2['personality']) > 0
                g2_des = len(source2['design']) > 0

                # Channel activation type
                if (g1_pers or g2_pers) and (g1_des or g2_des):
                    activation_type = 'both'
                elif g1_pers and g2_pers:
                    activation_type = 'personality'
                elif g1_des and g2_des:
                    activation_type = 'design'
                else:
                    # Mixed: one gate from personality, one from design
                    activation_type = 'both'

                defined_channels.append({
                    'gate1': gate1,
                    'gate2': gate2,
                    'name': name,
                    'center1': center1.value,
                    'center2': center2.value,
                    'circuit': circuit,
                    'description': description,
                    'gate1_activations': source1['personality'] + source1['design'],
                    'gate2_activations': source2['personality'] + source2['design'],
                    'activation_type': activation_type,
                })

        return defined_channels

    @staticmethod
    def _calculate_centers(
        channels: List[Dict],
        all_gates: Set[int]
    ) -> Dict[CenterType, Dict]:
        """
        Calculate center definition status.
        A center is defined when it has at least one complete channel.
        """
        centers = {}

        # Track which channels define each center
        center_channels: Dict[CenterType, List[str]] = {ct: [] for ct in CenterType}

        for channel in channels:
            c1 = CenterType(channel['center1'])
            c2 = CenterType(channel['center2'])
            center_channels[c1].append(channel['name'])
            center_channels[c2].append(channel['name'])

        # Build center data
        for center_type, center_data in CENTERS.items():
            # Find activated gates in this center
            activated_gates = [g for g in center_data['gates'] if g in all_gates]

            # Center is defined if it has any defining channels
            defining_channels = center_channels[center_type]
            is_defined = len(defining_channels) > 0

            centers[center_type] = {
                'name': center_data['name'],
                'defined': is_defined,
                'activated_gates': activated_gates,
                'defining_channels': defining_channels,
                'theme': center_data['theme'],
                'biological_correlation': center_data['biological'],
                'not_self_theme': center_data['not_self'],
                'is_motor': center_data['is_motor'],
                'is_pressure': center_data['is_pressure'],
            }

        return centers

    @staticmethod
    def _determine_type(
        centers: Dict[CenterType, Dict],
        channels: List[Dict]
    ) -> Tuple[HumanDesignType, str]:
        """
        Determine Human Design Type based on center definitions.

        Type hierarchy:
        1. Reflector: No defined centers
        2. Manifestor: Motor to Throat, Sacral NOT defined
        3. Manifesting Generator: Sacral defined, Sacral to Throat connected
        4. Generator: Sacral defined, no Throat connection
        5. Projector: Everything else
        """
        sacral_defined = centers[CenterType.SACRAL]['defined']
        throat_defined = centers[CenterType.THROAT]['defined']

        # Count defined centers
        defined_count = sum(1 for c in centers.values() if c['defined'])

        # 1. Reflector - no defined centers
        if defined_count == 0:
            return (HumanDesignType.REFLECTOR,
                    TYPES[HumanDesignType.REFLECTOR]['strategy'])

        # Check motor to throat connections
        motor_centers = [CenterType.SACRAL, CenterType.SOLAR_PLEXUS,
                        CenterType.HEART, CenterType.ROOT]

        # Build connectivity graph to check paths
        motor_to_throat = HumanDesignCalculator._has_motor_to_throat_path(
            centers, channels
        )
        sacral_to_throat = HumanDesignCalculator._has_path_between(
            CenterType.SACRAL, CenterType.THROAT, centers, channels
        )

        # 2 & 3. Check Generator types (Sacral defined)
        if sacral_defined:
            if sacral_to_throat:
                return (HumanDesignType.MANIFESTING_GENERATOR,
                        TYPES[HumanDesignType.MANIFESTING_GENERATOR]['strategy'])
            else:
                return (HumanDesignType.GENERATOR,
                        TYPES[HumanDesignType.GENERATOR]['strategy'])

        # 4. Manifestor - motor to throat, no Sacral
        if motor_to_throat:
            return (HumanDesignType.MANIFESTOR,
                    TYPES[HumanDesignType.MANIFESTOR]['strategy'])

        # 5. Projector - everything else
        return (HumanDesignType.PROJECTOR,
                TYPES[HumanDesignType.PROJECTOR]['strategy'])

    @staticmethod
    def _has_motor_to_throat_path(
        centers: Dict[CenterType, Dict],
        channels: List[Dict]
    ) -> bool:
        """Check if any motor center has a path to the Throat."""
        motor_centers = [CenterType.SOLAR_PLEXUS, CenterType.HEART, CenterType.ROOT]
        # Note: Sacral is handled separately for Generator distinction

        for motor in motor_centers:
            if centers[motor]['defined']:
                if HumanDesignCalculator._has_path_between(
                    motor, CenterType.THROAT, centers, channels
                ):
                    return True
        return False

    @staticmethod
    def _has_path_between(
        start: CenterType,
        end: CenterType,
        centers: Dict[CenterType, Dict],
        channels: List[Dict]
    ) -> bool:
        """BFS to check if there's a path between two centers via defined channels."""
        if not centers[start]['defined'] or not centers[end]['defined']:
            return False

        if start == end:
            return True

        # Build adjacency from channels
        adjacency: Dict[str, Set[str]] = {}
        for channel in channels:
            c1 = channel['center1']
            c2 = channel['center2']
            if c1 not in adjacency:
                adjacency[c1] = set()
            if c2 not in adjacency:
                adjacency[c2] = set()
            adjacency[c1].add(c2)
            adjacency[c2].add(c1)

        # BFS
        visited = {start.value}
        queue = [start.value]

        while queue:
            current = queue.pop(0)
            if current == end.value:
                return True

            for neighbor in adjacency.get(current, []):
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append(neighbor)

        return False

    @staticmethod
    def _determine_authority(
        centers: Dict[CenterType, Dict],
        hd_type: HumanDesignType
    ) -> Tuple[Authority, str]:
        """
        Determine Inner Authority based on defined centers.

        Authority hierarchy:
        1. Emotional (Solar Plexus defined)
        2. Sacral (for Generators/MGs)
        3. Splenic
        4. Ego Manifested (Heart to Throat for Manifestors)
        5. Ego Projected (Heart to G for Projectors)
        6. Self-Projected (G to Throat for Projectors)
        7. Mental/Environment (for Projectors with no inner authority)
        8. Lunar (for Reflectors)
        """
        # Reflector has Lunar authority
        if hd_type == HumanDesignType.REFLECTOR:
            auth = Authority.LUNAR
            return auth, AUTHORITIES[auth]['description']

        # 1. Emotional Authority (Solar Plexus defined)
        if centers[CenterType.SOLAR_PLEXUS]['defined']:
            auth = Authority.EMOTIONAL
            return auth, AUTHORITIES[auth]['description']

        # 2. Sacral Authority (for Generators/MGs)
        if centers[CenterType.SACRAL]['defined']:
            auth = Authority.SACRAL
            return auth, AUTHORITIES[auth]['description']

        # 3. Splenic Authority
        if centers[CenterType.SPLEEN]['defined']:
            auth = Authority.SPLENIC
            return auth, AUTHORITIES[auth]['description']

        # 4/5. Ego Authority (Heart defined)
        if centers[CenterType.HEART]['defined']:
            # Check if Heart is connected to Throat (Manifested) or G (Projected)
            heart_channels = centers[CenterType.HEART]['defining_channels']

            # Look for Heart-Throat connection
            throat_connection = any(
                'Throat' in c or 'Money' in c
                for c in heart_channels
            )

            if throat_connection and hd_type == HumanDesignType.MANIFESTOR:
                auth = Authority.EGO_MANIFESTED
                return auth, AUTHORITIES[auth]['description']
            else:
                auth = Authority.EGO_PROJECTED
                return auth, AUTHORITIES[auth]['description']

        # 6. Self-Projected Authority (G to Throat for Projectors)
        if centers[CenterType.G_CENTER]['defined'] and centers[CenterType.THROAT]['defined']:
            auth = Authority.SELF_PROJECTED
            return auth, AUTHORITIES[auth]['description']

        # 7. Mental/Environment Authority (no inner authority)
        if hd_type == HumanDesignType.PROJECTOR:
            auth = Authority.MENTAL
            return auth, AUTHORITIES[auth]['description']

        # Fallback
        auth = Authority.NONE
        return auth, AUTHORITIES[auth]['description']

    @staticmethod
    def _calculate_profile(
        personality_activations: Dict[str, Dict],
        design_activations: Dict[str, Dict]
    ) -> Dict:
        """
        Calculate Profile from Personality Sun line and Design Sun line.
        """
        personality_sun = personality_activations.get('sun', {})
        design_sun = design_activations.get('sun', {})

        p_line = personality_sun.get('line', 1)
        d_line = design_sun.get('line', 1)

        # Get profile data
        profile_key = (p_line, d_line)
        profile_data = PROFILES.get(profile_key, {
            'name': f'{p_line}/{d_line}',
            'angle': 'Unknown',
            'description': '',
            'personality': LINE_ARCHETYPES.get(p_line, ('', ''))[0],
            'design': LINE_ARCHETYPES.get(d_line, ('', ''))[0],
        })

        # Determine cross type
        cross_type = get_cross_type_from_profile(p_line, d_line)

        return {
            'personality_line': p_line,
            'design_line': d_line,
            'name': profile_data['name'],
            'angle': profile_data.get('angle', cross_type.value),
            'description': profile_data.get('description', ''),
            'personality_description': profile_data.get('personality', ''),
            'design_description': profile_data.get('design', ''),
        }

    @staticmethod
    def _calculate_definition(
        centers: Dict[CenterType, Dict],
        channels: List[Dict]
    ) -> Tuple[Definition, str]:
        """
        Calculate Definition type (how defined centers are connected).
        """
        defined_centers = [ct for ct, data in centers.items() if data['defined']]

        if len(defined_centers) == 0:
            return Definition.NONE, DEFINITIONS[Definition.NONE]['description']

        # Build connectivity graph
        adjacency: Dict[CenterType, Set[CenterType]] = {ct: set() for ct in defined_centers}

        for channel in channels:
            c1 = CenterType(channel['center1'])
            c2 = CenterType(channel['center2'])
            if c1 in adjacency and c2 in adjacency:
                adjacency[c1].add(c2)
                adjacency[c2].add(c1)

        # Find connected components using BFS
        visited = set()
        components = 0

        for center in defined_centers:
            if center not in visited:
                components += 1
                queue = [center]
                while queue:
                    current = queue.pop(0)
                    if current in visited:
                        continue
                    visited.add(current)
                    for neighbor in adjacency[current]:
                        if neighbor not in visited:
                            queue.append(neighbor)

        # Map component count to definition type
        if components == 1:
            definition = Definition.SINGLE
        elif components == 2:
            definition = Definition.SPLIT
        elif components == 3:
            definition = Definition.TRIPLE_SPLIT
        else:
            definition = Definition.QUADRUPLE_SPLIT

        return definition, DEFINITIONS[definition]['description']

    @staticmethod
    def _calculate_incarnation_cross(
        personality_activations: Dict[str, Dict],
        design_activations: Dict[str, Dict],
        profile: Dict
    ) -> Dict:
        """
        Calculate Incarnation Cross from Sun and Earth gates.

        The cross is formed by:
        - Personality Sun gate
        - Personality Earth gate
        - Design Sun gate
        - Design Earth gate
        """
        p_sun = personality_activations.get('sun', {})
        p_earth = personality_activations.get('earth', {})
        d_sun = design_activations.get('sun', {})
        d_earth = design_activations.get('earth', {})

        p_sun_gate = p_sun.get('gate', 0)
        p_earth_gate = p_earth.get('gate', 0)
        d_sun_gate = d_sun.get('gate', 0)
        d_earth_gate = d_earth.get('gate', 0)

        # Determine cross type from profile
        cross_type = get_cross_type_from_profile(
            profile['personality_line'],
            profile['design_line']
        )

        # Get quarter from personality sun gate
        quarter = get_quarter_for_gate(p_sun_gate)

        # Get proper traditional cross name with variation
        cross_name = get_incarnation_cross_name(p_sun_gate, cross_type)
        gate_name = GATE_NAMES.get(p_sun_gate, 'Unknown')
        base_cross_theme = INCARNATION_CROSS_NAMES.get(p_sun_gate, 'Unknown')
        variation = get_cross_variation(p_sun_gate)

        return {
            'name': cross_name,
            'cross_type': cross_type.value,
            'variation': variation,
            'quarter': quarter,
            'personality_sun_gate': p_sun_gate,
            'personality_earth_gate': p_earth_gate,
            'design_sun_gate': d_sun_gate,
            'design_earth_gate': d_earth_gate,
            'personality_sun_name': GATE_NAMES.get(p_sun_gate, ''),
            'personality_earth_name': GATE_NAMES.get(p_earth_gate, ''),
            'design_sun_name': GATE_NAMES.get(d_sun_gate, ''),
            'design_earth_name': GATE_NAMES.get(d_earth_gate, ''),
            'description': f"Your life purpose is expressed through {base_cross_theme} ({gate_name}).",
        }

    @staticmethod
    def _calculate_variables(
        personality_activations: Dict[str, Dict],
        design_activations: Dict[str, Dict]
    ) -> Dict:
        """
        Calculate Variables (the 4 arrows/transformations).

        Variables are determined by:
        - Design Sun: Digestion (left arrow 1)
        - Design Earth: Environment (left arrow 2)
        - Personality Sun: Cognition (right arrow 1)
        - Personality Earth: Perspective (right arrow 2)

        Arrow direction based on Color (1-3 = left, 4-6 = right)
        """
        d_sun = design_activations.get('sun', {})
        d_earth = design_activations.get('earth', {})
        p_sun = personality_activations.get('sun', {})
        p_earth = personality_activations.get('earth', {})

        # Get Colors and Tones
        d_sun_color = d_sun.get('color', 1)
        d_sun_tone = d_sun.get('tone', 1)
        d_earth_color = d_earth.get('color', 1) if d_earth else 1
        d_earth_tone = d_earth.get('tone', 1) if d_earth else 1
        p_sun_color = p_sun.get('color', 1)
        p_sun_tone = p_sun.get('tone', 1)
        p_earth_color = p_earth.get('color', 1) if p_earth else 1
        p_earth_tone = p_earth.get('tone', 1) if p_earth else 1

        # Arrow directions (1-3 = left, 4-6 = right)
        def arrow_direction(color: int) -> str:
            return 'left' if color <= 3 else 'right'

        # Digestion/PHS (Design Sun)
        digestion_types = {
            1: "Appetite (Consecutive)", 2: "Taste (Alternating)",
            3: "Thirst (Open)", 4: "Touch (Calm)",
            5: "Sound (High)", 6: "Light (Indirect)"
        }

        # Environment (Design Earth)
        environment_types = {
            1: "Caves", 2: "Markets", 3: "Kitchens",
            4: "Mountains", 5: "Valleys", 6: "Shores"
        }

        # Cognition (Personality Sun)
        cognition_types = {
            1: "Smell", 2: "Taste", 3: "Outer Vision",
            4: "Inner Vision", 5: "Feeling", 6: "Touch"
        }

        # Perspective (Personality Earth)
        perspective_types = {
            1: "Survival", 2: "Possibility", 3: "Power",
            4: "Wanting", 5: "Probability", 6: "Personal"
        }

        return {
            # Design Sun - Digestion
            'design_sun_color': d_sun_color,
            'design_sun_tone': d_sun_tone,
            'digestion': digestion_types.get(d_sun_color, 'Unknown'),

            # Design Earth - Environment (North Node proxy)
            'design_node_color': d_earth_color,
            'design_node_tone': d_earth_tone,
            'environment': environment_types.get(d_earth_color, 'Unknown'),

            # Personality Sun - Cognition
            'personality_sun_color': p_sun_color,
            'personality_sun_tone': p_sun_tone,
            'cognition': cognition_types.get(p_sun_color, 'Unknown'),

            # Personality Earth - Perspective (North Node proxy)
            'personality_node_color': p_earth_color,
            'personality_node_tone': p_earth_tone,
            'perspective': perspective_types.get(p_earth_color, 'Unknown'),

            # Arrow directions
            'left_arrow_1': arrow_direction(d_sun_color),
            'left_arrow_2': arrow_direction(d_earth_color),
            'right_arrow_1': arrow_direction(p_sun_color),
            'right_arrow_2': arrow_direction(p_earth_color),
        }

    @staticmethod
    def _format_activation(activation: Dict) -> Dict:
        """Format a gate activation for API response."""
        return {
            'gate': activation['gate'],
            'line': activation['line'],
            'color': activation.get('color', 1),
            'tone': activation.get('tone', 1),
            'base': activation.get('base', 1),
            'planet': activation['planet'],
            'longitude': activation['longitude'],
            'sign': activation['sign'],
            'degree_in_sign': activation['degree_in_sign'],
            'gate_name': activation['gate_name'],
            'gate_keyword': activation['gate_keyword'],
        }

    @staticmethod
    def _format_center(center_data: Dict) -> Dict:
        """Format center data for API response."""
        return {
            'name': center_data['name'],
            'defined': center_data['defined'],
            'activated_gates': center_data['activated_gates'],
            'defining_channels': center_data['defining_channels'],
            'theme': center_data['theme'],
            'biological_correlation': center_data['biological_correlation'],
            'not_self_theme': center_data['not_self_theme'],
        }

    # =========================================================================
    # REFERENCE DATA METHODS
    # =========================================================================

    @staticmethod
    def get_all_gates() -> List[Dict]:
        """Get information about all 64 gates."""
        gates = []
        for gate_num in range(1, 65):
            center = get_center_for_gate(gate_num)

            # Find channel partner
            channel_partner = None
            channel_name = None
            if gate_num in GATE_TO_CHANNELS:
                for g1, g2 in GATE_TO_CHANNELS[gate_num]:
                    partner = g2 if g1 == gate_num else g1
                    channel_partner = partner
                    channel_data = CHANNELS.get((g1, g2)) or CHANNELS.get((g2, g1))
                    if channel_data:
                        channel_name = channel_data[0]
                    break

            gates.append({
                'number': gate_num,
                'name': GATE_NAMES.get(gate_num, ''),
                'keyword': GATE_KEYWORDS.get(gate_num, ''),
                'description': GATE_DESCRIPTIONS.get(gate_num, ''),
                'i_ching_name': GATE_NAMES.get(gate_num, ''),
                'center': center.value if center else 'Unknown',
                'channel_partner': channel_partner,
                'channel_name': channel_name,
            })
        return gates

    @staticmethod
    def get_all_channels() -> List[Dict]:
        """Get information about all 36 channels."""
        channels = []
        for (g1, g2), data in CHANNELS.items():
            name, c1, c2, circuit, desc = data
            channels.append({
                'gate1': g1,
                'gate2': g2,
                'name': name,
                'center1': c1.value,
                'center2': c2.value,
                'circuit': circuit,
                'description': desc,
            })
        return channels

    @staticmethod
    def get_all_centers() -> List[Dict]:
        """Get information about all 9 centers."""
        centers = []
        for center_type, data in CENTERS.items():
            centers.append({
                'name': data['name'],
                'biological': data['biological'],
                'theme': data['theme'],
                'function': data['function'],
                'defined_theme': data['defined_theme'],
                'undefined_theme': data['undefined_theme'],
                'not_self': data['not_self'],
                'gates': data['gates'],
                'is_motor': data['is_motor'],
                'is_pressure': data['is_pressure'],
            })
        return centers

    @staticmethod
    def get_all_types() -> List[Dict]:
        """Get information about all 5 HD types."""
        types = []
        for hd_type, data in TYPES.items():
            types.append({
                'name': data['name'],
                'strategy': data['strategy'],
                'signature': data['signature'],
                'not_self': data['not_self'],
                'aura': data['aura'],
                'percentage': data['percentage'],
                'description': data['description'],
            })
        return types
