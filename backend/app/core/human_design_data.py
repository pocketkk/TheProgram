"""
Human Design Static Data

Contains all reference data for Human Design calculations:
- 64-gate wheel order (corrected)
- 9 Centers with gate assignments
- 36 Channels with endpoints
- Profile descriptions
- Type/Strategy/Authority descriptions
- Incarnation Cross data
"""

from typing import Dict, List, Tuple
from enum import Enum


# ==============================================================================
# GATE WHEEL - Correct 64-gate sequence around the mandala
# ==============================================================================

# Starting from 0° Aries and proceeding counter-clockwise
# Each gate occupies exactly 5.625 degrees (360 / 64)
GATE_WHEEL = [
    # 0° - 45° (Aries region)
    41, 19, 13, 49, 30, 55, 37, 63,
    # 45° - 90° (Taurus region)
    22, 36, 25, 17, 21, 51, 42, 3,
    # 90° - 135° (Gemini-Cancer region)
    27, 24, 2, 23, 8, 20, 16, 35,
    # 135° - 180° (Cancer-Leo region)
    45, 12, 15, 52, 39, 53, 62, 56,
    # 180° - 225° (Leo-Virgo region)
    31, 33, 7, 4, 29, 59, 40, 64,
    # 225° - 270° (Virgo-Libra region)
    47, 6, 46, 18, 48, 57, 32, 50,
    # 270° - 315° (Libra-Scorpio region)
    28, 44, 1, 43, 14, 34, 9, 5,
    # 315° - 360° (Scorpio-Sagittarius-Capricorn region)
    26, 11, 10, 58, 38, 54, 61, 60,
]

# Gate degree positions (start degree for each gate)
GATE_DEGREES = {gate: idx * 5.625 for idx, gate in enumerate(GATE_WHEEL)}


# ==============================================================================
# GATE NAMES (I Ching correlation)
# ==============================================================================

GATE_NAMES = {
    1: "The Creative",
    2: "The Receptive",
    3: "Difficulty at the Beginning",
    4: "Youthful Folly",
    5: "Waiting",
    6: "Conflict",
    7: "The Army",
    8: "Holding Together",
    9: "The Taming Power of the Small",
    10: "Treading",
    11: "Peace",
    12: "Standstill",
    13: "Fellowship",
    14: "Possession in Great Measure",
    15: "Modesty",
    16: "Enthusiasm",
    17: "Following",
    18: "Work on the Decayed",
    19: "Approach",
    20: "Contemplation",
    21: "Biting Through",
    22: "Grace",
    23: "Splitting Apart",
    24: "Return",
    25: "Innocence",
    26: "The Taming Power of the Great",
    27: "Nourishment",
    28: "Preponderance of the Great",
    29: "The Abysmal",
    30: "The Clinging",
    31: "Influence",
    32: "Duration",
    33: "Retreat",
    34: "The Power of the Great",
    35: "Progress",
    36: "Darkening of the Light",
    37: "The Family",
    38: "Opposition",
    39: "Obstruction",
    40: "Deliverance",
    41: "Decrease",
    42: "Increase",
    43: "Breakthrough",
    44: "Coming to Meet",
    45: "Gathering Together",
    46: "Pushing Upward",
    47: "Oppression",
    48: "The Well",
    49: "Revolution",
    50: "The Cauldron",
    51: "The Arousing",
    52: "Keeping Still",
    53: "Development",
    54: "The Marrying Maiden",
    55: "Abundance",
    56: "The Wanderer",
    57: "The Gentle",
    58: "The Joyous",
    59: "Dispersion",
    60: "Limitation",
    61: "Inner Truth",
    62: "Preponderance of the Small",
    63: "After Completion",
    64: "Before Completion",
}

# Short/keyword names for display
GATE_KEYWORDS = {
    1: "Expression",
    2: "Receptivity",
    3: "Ordering",
    4: "Answers",
    5: "Patience",
    6: "Friction",
    7: "The Role of the Self",
    8: "Contribution",
    9: "Focus",
    10: "Self-Love",
    11: "Ideas",
    12: "Caution",
    13: "The Listener",
    14: "Power Skills",
    15: "Extremes",
    16: "Skills",
    17: "Opinions",
    18: "Correction",
    19: "Wanting",
    20: "The Now",
    21: "The Hunter",
    22: "Openness",
    23: "Assimilation",
    24: "Rationalization",
    25: "The Spirit of the Self",
    26: "The Egoist",
    27: "Caring",
    28: "The Game Player",
    29: "Saying Yes",
    30: "Feelings",
    31: "Leading",
    32: "Continuity",
    33: "Privacy",
    34: "Power",
    35: "Change",
    36: "Crisis",
    37: "Friendship",
    38: "The Fighter",
    39: "Provocation",
    40: "Aloneness",
    41: "Contraction",
    42: "Growth",
    43: "Insight",
    44: "Alertness",
    45: "The Gatherer",
    46: "The Love of the Body",
    47: "Realization",
    48: "Depth",
    49: "Principles",
    50: "Values",
    51: "Shock",
    52: "Stillness",
    53: "Beginnings",
    54: "Ambition",
    55: "Spirit",
    56: "Stimulation",
    57: "Intuitive Clarity",
    58: "Vitality",
    59: "Sexuality",
    60: "Acceptance",
    61: "Mystery",
    62: "Details",
    63: "Doubt",
    64: "Confusion",
}


# ==============================================================================
# LINE DESCRIPTIONS
# ==============================================================================

LINE_ARCHETYPES = {
    1: ("Investigator", "Foundation, introspection, research"),
    2: ("Hermit", "Natural talent, projection field, being called out"),
    3: ("Martyr", "Trial and error, adaptation, bonds made and broken"),
    4: ("Opportunist", "Friendship, influence through network, fixed fate"),
    5: ("Heretic", "Universalization, projection, practical solutions"),
    6: ("Role Model", "Transition (3 phases), objectivity, trust"),
}


# ==============================================================================
# CENTERS
# ==============================================================================

class CenterType(Enum):
    HEAD = "head"
    AJNA = "ajna"
    THROAT = "throat"
    G_CENTER = "g_center"
    HEART = "heart"
    SACRAL = "sacral"
    SOLAR_PLEXUS = "solar_plexus"
    SPLEEN = "spleen"
    ROOT = "root"


CENTERS = {
    CenterType.HEAD: {
        "name": "Head Center",
        "gates": [64, 61, 63],
        "biological": "Pineal gland",
        "theme": "Inspiration & Mental Pressure",
        "function": "Questions, doubt, confusion that inspire inquiry",
        "defined_theme": "Consistent way of being inspired",
        "undefined_theme": "Open to all kinds of inspiration",
        "not_self": "Trying to answer everyone else's questions",
        "is_motor": False,
        "is_pressure": True,
    },
    CenterType.AJNA: {
        "name": "Ajna Center",
        "gates": [47, 24, 4, 17, 43, 11],
        "biological": "Anterior & posterior pituitary",
        "theme": "Conceptualization & Mental Awareness",
        "function": "Processing, analyzing, researching",
        "defined_theme": "Fixed way of processing information",
        "undefined_theme": "Open-minded, can see all perspectives",
        "not_self": "Pretending to be certain about things",
        "is_motor": False,
        "is_pressure": False,
    },
    CenterType.THROAT: {
        "name": "Throat Center",
        "gates": [62, 23, 56, 35, 12, 45, 33, 8, 31, 20, 16],
        "biological": "Thyroid & parathyroid",
        "theme": "Communication & Manifestation",
        "function": "Expression, action, metabolization",
        "defined_theme": "Consistent voice and manner of expression",
        "undefined_theme": "Versatile communication, can speak in many voices",
        "not_self": "Trying to attract attention or talk too much",
        "is_motor": False,
        "is_pressure": False,
    },
    CenterType.G_CENTER: {
        "name": "G Center (Identity)",
        "gates": [7, 1, 13, 25, 46, 2, 15, 10],
        "biological": "Liver & blood",
        "theme": "Identity, Direction & Love",
        "function": "Self-identity, direction in life, love",
        "defined_theme": "Fixed sense of identity and direction",
        "undefined_theme": "Chameleon identity, seeking direction and love",
        "not_self": "Searching for identity and direction in wrong places",
        "is_motor": False,
        "is_pressure": False,
    },
    CenterType.HEART: {
        "name": "Heart/Ego Center",
        "gates": [21, 40, 26, 51],
        "biological": "Heart, stomach, thymus, gallbladder",
        "theme": "Willpower & Ego",
        "function": "Willpower, ego, value, worthiness",
        "defined_theme": "Access to willpower when needed",
        "undefined_theme": "Nothing to prove, no need for willpower",
        "not_self": "Proving self-worth, making promises can't keep",
        "is_motor": True,
        "is_pressure": False,
    },
    CenterType.SACRAL: {
        "name": "Sacral Center",
        "gates": [5, 14, 29, 59, 9, 3, 42, 27, 34],
        "biological": "Ovaries, testes",
        "theme": "Life Force & Sexuality",
        "function": "Life force energy, fertility, sexuality, persistence",
        "defined_theme": "Consistent access to life force energy",
        "undefined_theme": "No consistent energy, needs to know limits",
        "not_self": "Not knowing when enough is enough",
        "is_motor": True,
        "is_pressure": False,
    },
    CenterType.SOLAR_PLEXUS: {
        "name": "Solar Plexus Center",
        "gates": [6, 37, 22, 36, 30, 55, 49],
        "biological": "Kidneys, lungs, pancreas, nervous system",
        "theme": "Emotions & Spirit",
        "function": "Emotional awareness, passion, desire, moods",
        "defined_theme": "Emotional wave, no truth in the now",
        "undefined_theme": "Emotionally open, amplifies others' emotions",
        "not_self": "Avoiding confrontation and truth to avoid emotional upset",
        "is_motor": True,
        "is_pressure": False,
    },
    CenterType.SPLEEN: {
        "name": "Splenic Center",
        "gates": [48, 57, 44, 50, 32, 28, 18],
        "biological": "Spleen, lymphatic system, T-cells",
        "theme": "Intuition, Instinct & Health",
        "function": "Survival instinct, intuition, time, health",
        "defined_theme": "Reliable intuition in the moment",
        "undefined_theme": "Holding onto things too long, sensitive to health",
        "not_self": "Holding onto what is not good for you",
        "is_motor": False,
        "is_pressure": False,
    },
    CenterType.ROOT: {
        "name": "Root Center",
        "gates": [53, 60, 52, 19, 39, 41, 58, 38, 54],
        "biological": "Adrenal glands",
        "theme": "Adrenaline & Pressure",
        "function": "Drive, stress, kundalini, adrenaline",
        "defined_theme": "Consistent pressure to get things done",
        "undefined_theme": "Pressure amplified, can burn out chasing urgency",
        "not_self": "Rushing to be free of pressure",
        "is_motor": True,
        "is_pressure": True,
    },
}


# ==============================================================================
# CHANNELS (36 total)
# ==============================================================================

# Format: (gate1, gate2): (name, center1, center2, circuit, description)
CHANNELS = {
    # HEAD TO AJNA (3 channels)
    (64, 47): ("Abstraction", CenterType.HEAD, CenterType.AJNA, "Collective Sensing",
               "Mental activity and pressure; processing abstract thought"),
    (61, 24): ("Awareness", CenterType.HEAD, CenterType.AJNA, "Individual Knowing",
               "Thinking; the thinker; mystery to rationalization"),
    (63, 4): ("Logic", CenterType.HEAD, CenterType.AJNA, "Collective Logic",
              "Logical thinking; doubt to formulization"),

    # AJNA TO THROAT (3 channels)
    (17, 62): ("Acceptance", CenterType.AJNA, CenterType.THROAT, "Collective Logic",
               "Organizational; opinions and details"),
    (43, 23): ("Structuring", CenterType.AJNA, CenterType.THROAT, "Individual Knowing",
               "Individual expression; insight to assimilation"),
    (11, 56): ("Curiosity", CenterType.AJNA, CenterType.THROAT, "Collective Sensing",
               "Searching; ideas to stimulation"),

    # THROAT CONNECTIONS (various)
    (8, 1): ("Inspiration", CenterType.THROAT, CenterType.G_CENTER, "Individual Knowing",
             "Creative role model; contribution to expression"),
    (31, 7): ("The Alpha", CenterType.THROAT, CenterType.G_CENTER, "Collective Logic",
              "Leadership; influence to the role of the self"),
    (33, 13): ("The Prodigal", CenterType.THROAT, CenterType.G_CENTER, "Collective Sensing",
               "Witness; privacy to the listener"),
    (20, 10): ("Awakening", CenterType.THROAT, CenterType.G_CENTER, "Integration",
               "Awakening; contemplation to self-love"),
    (45, 21): ("Money", CenterType.THROAT, CenterType.HEART, "Tribal Ego",
               "The materialist; gathering to control"),
    (12, 22): ("Openness", CenterType.THROAT, CenterType.SOLAR_PLEXUS, "Individual Knowing",
               "Social being; caution to openness"),
    (35, 36): ("Transitoriness", CenterType.THROAT, CenterType.SOLAR_PLEXUS, "Collective Sensing",
               "Jack of all trades; change to crisis"),
    (16, 48): ("Wavelength", CenterType.THROAT, CenterType.SPLEEN, "Collective Logic",
               "Talent; skills to depth"),
    (20, 57): ("The Brain Wave", CenterType.THROAT, CenterType.SPLEEN, "Integration",
               "Penetrating awareness; now and intuitive clarity"),
    (34, 20): ("Charisma", CenterType.THROAT, CenterType.SACRAL, "Integration",
               "Manifesting; power to the now"),

    # G CENTER CONNECTIONS
    (25, 51): ("Initiation", CenterType.G_CENTER, CenterType.HEART, "Individual Centering",
               "Needing to be first; innocence to shock"),
    (15, 5): ("Rhythm", CenterType.G_CENTER, CenterType.SACRAL, "Collective Logic",
              "Being in flow; extremes to fixed rhythms"),
    (2, 14): ("The Beat", CenterType.G_CENTER, CenterType.SACRAL, "Individual Knowing",
              "The keeper of keys; direction to power skills"),
    (46, 29): ("Discovery", CenterType.G_CENTER, CenterType.SACRAL, "Collective Sensing",
               "Succeeding where others fail; body to commitment"),
    (10, 57): ("Perfected Form", CenterType.G_CENTER, CenterType.SPLEEN, "Integration",
               "Survival; behavior and intuition"),

    # HEART CONNECTIONS
    (26, 44): ("Surrender", CenterType.HEART, CenterType.SPLEEN, "Tribal Ego",
               "Transmitter; the egoist to alertness"),
    (40, 37): ("Community", CenterType.HEART, CenterType.SOLAR_PLEXUS, "Tribal Ego",
               "Family; aloneness to friendship"),

    # SACRAL CONNECTIONS
    (59, 6): ("Mating", CenterType.SACRAL, CenterType.SOLAR_PLEXUS, "Tribal Defense",
              "Intimacy; sexuality to friction"),
    (34, 57): ("Power", CenterType.SACRAL, CenterType.SPLEEN, "Integration",
               "Archetype; power to intuitive clarity"),
    (27, 50): ("Preservation", CenterType.SACRAL, CenterType.SPLEEN, "Tribal Defense",
               "Custodian; caring to values"),
    (9, 52): ("Concentration", CenterType.SACRAL, CenterType.ROOT, "Collective Logic",
              "Determination; focus to stillness"),
    (3, 60): ("Mutation", CenterType.SACRAL, CenterType.ROOT, "Individual Knowing",
              "Energy to begin; ordering to acceptance"),
    (42, 53): ("Maturation", CenterType.SACRAL, CenterType.ROOT, "Collective Sensing",
               "Balanced development; growth to beginnings"),

    # SOLAR PLEXUS CONNECTIONS
    (30, 41): ("Recognition", CenterType.SOLAR_PLEXUS, CenterType.ROOT, "Collective Sensing",
               "Focused energy; feelings to fantasy"),
    (55, 39): ("Emoting", CenterType.SOLAR_PLEXUS, CenterType.ROOT, "Individual Knowing",
               "Moodiness; spirit to provocation"),
    (49, 19): ("Synthesis", CenterType.SOLAR_PLEXUS, CenterType.ROOT, "Tribal Defense",
               "Sensitivity; principles to wanting"),

    # SPLEEN TO ROOT
    (28, 38): ("Struggle", CenterType.SPLEEN, CenterType.ROOT, "Individual Knowing",
               "Stubbornness; the game player to the fighter"),
    (18, 58): ("Judgment", CenterType.SPLEEN, CenterType.ROOT, "Collective Logic",
               "Insatiability; correction to vitality"),
    (32, 54): ("Transformation", CenterType.SPLEEN, CenterType.ROOT, "Tribal Ego",
               "Being driven; continuity to ambition"),
}

# Create reverse lookup for channels by gate
GATE_TO_CHANNELS: Dict[int, List[Tuple[int, int]]] = {}
for (g1, g2) in CHANNELS.keys():
    if g1 not in GATE_TO_CHANNELS:
        GATE_TO_CHANNELS[g1] = []
    if g2 not in GATE_TO_CHANNELS:
        GATE_TO_CHANNELS[g2] = []
    GATE_TO_CHANNELS[g1].append((g1, g2))
    GATE_TO_CHANNELS[g2].append((g1, g2))


# ==============================================================================
# TYPES
# ==============================================================================

class HumanDesignType(Enum):
    MANIFESTOR = "Manifestor"
    GENERATOR = "Generator"
    MANIFESTING_GENERATOR = "Manifesting Generator"
    PROJECTOR = "Projector"
    REFLECTOR = "Reflector"


TYPES = {
    HumanDesignType.MANIFESTOR: {
        "name": "Manifestor",
        "strategy": "To Inform",
        "signature": "Peace",
        "not_self": "Anger",
        "aura": "Closed and repelling",
        "percentage": "~9%",
        "description": "Manifestors are here to initiate and impact others. They have a closed, "
                       "repelling aura that allows them to move through life without waiting. "
                       "Their strategy is to inform those who will be impacted before they act.",
    },
    HumanDesignType.GENERATOR: {
        "name": "Generator",
        "strategy": "To Respond",
        "signature": "Satisfaction",
        "not_self": "Frustration",
        "aura": "Open and enveloping",
        "percentage": "~37%",
        "description": "Generators are the life force of the planet. They have sustainable energy "
                       "for work they love. Their strategy is to wait to respond to life rather than "
                       "initiate. When doing what they love, they experience deep satisfaction.",
    },
    HumanDesignType.MANIFESTING_GENERATOR: {
        "name": "Manifesting Generator",
        "strategy": "To Respond, then Inform",
        "signature": "Satisfaction and Peace",
        "not_self": "Frustration and Anger",
        "aura": "Open and enveloping",
        "percentage": "~33%",
        "description": "Manifesting Generators are multi-passionate beings with the power to "
                       "respond AND manifest. They must wait to respond, but once clarity comes, "
                       "they can move quickly. Informing those affected reduces resistance.",
    },
    HumanDesignType.PROJECTOR: {
        "name": "Projector",
        "strategy": "Wait for the Invitation",
        "signature": "Success",
        "not_self": "Bitterness",
        "aura": "Focused and absorbing",
        "percentage": "~20%",
        "description": "Projectors are here to guide and manage others. Their focused aura allows "
                       "them to see deeply into others. They must wait for recognition and invitation "
                       "for the big things in life: love, career, relationships, place to live.",
    },
    HumanDesignType.REFLECTOR: {
        "name": "Reflector",
        "strategy": "Wait a Lunar Cycle",
        "signature": "Surprise",
        "not_self": "Disappointment",
        "aura": "Resistant and sampling",
        "percentage": "~1%",
        "description": "Reflectors are completely open beings who sample and reflect the world "
                       "around them. With no defined centers, they are deeply conditioned by their "
                       "environment. Major decisions benefit from waiting a full lunar cycle (~28 days).",
    },
}


# ==============================================================================
# AUTHORITY
# ==============================================================================

class Authority(Enum):
    EMOTIONAL = "Emotional"
    SACRAL = "Sacral"
    SPLENIC = "Splenic"
    EGO_MANIFESTED = "Ego Manifested"
    EGO_PROJECTED = "Ego Projected"
    SELF_PROJECTED = "Self-Projected"
    MENTAL = "Mental/Environment"
    LUNAR = "Lunar"
    NONE = "None"


AUTHORITIES = {
    Authority.EMOTIONAL: {
        "name": "Emotional Authority",
        "center": CenterType.SOLAR_PLEXUS,
        "description": "There is no truth in the now. Clarity comes over time as you ride your "
                       "emotional wave. Never make decisions in emotional highs or lows. Wait for "
                       "a sense of calm clarity.",
        "guidance": "Sleep on big decisions. Ride the wave. Ask yourself the same question over time.",
    },
    Authority.SACRAL: {
        "name": "Sacral Authority",
        "center": CenterType.SACRAL,
        "description": "Your gut response is your guide. Listen for the sounds of 'uh-huh' (yes) or "
                       "'unh-unh' (no). The Sacral speaks in response to yes/no questions.",
        "guidance": "Ask yes/no questions. Trust your gut sounds. Don't think - respond.",
    },
    Authority.SPLENIC: {
        "name": "Splenic Authority",
        "center": CenterType.SPLEEN,
        "description": "Instantaneous knowing in the moment. Your intuition speaks once, quietly. "
                       "Trust the spontaneous hit of knowing. Health and survival instincts guide you.",
        "guidance": "Trust the first hit. Don't second-guess. Act in the moment when clarity comes.",
    },
    Authority.EGO_MANIFESTED: {
        "name": "Ego Manifested Authority",
        "center": CenterType.HEART,
        "description": "For Manifestors with a defined Heart to Throat. What do you want? "
                       "The ego's desires guide the way when expressed through the voice.",
        "guidance": "Ask: What do I want? Speak your desires aloud. Trust your willpower.",
    },
    Authority.EGO_PROJECTED: {
        "name": "Ego Projected Authority",
        "center": CenterType.HEART,
        "description": "For Projectors with a defined Heart to G Center. What's in it for me? "
                       "The ego's sense of worth and value guides decisions.",
        "guidance": "Ask: Is this worth my energy? Does this serve my heart? Wait for invitation.",
    },
    Authority.SELF_PROJECTED: {
        "name": "Self-Projected Authority",
        "center": CenterType.G_CENTER,
        "description": "For Projectors with G Center connected to Throat but no other authority. "
                       "Talk it out. Hear yourself speak. Your identity speaks through your voice.",
        "guidance": "Talk to trusted others. Listen to what you say. Your truth comes through speaking.",
    },
    Authority.MENTAL: {
        "name": "Mental/Environment Authority",
        "center": None,
        "description": "For Projectors with no inner authority. You need to bounce ideas off "
                       "trusted others and sense whether an environment is right for you.",
        "guidance": "Discuss with trusted sounding boards. Consider the environment. Take your time.",
    },
    Authority.LUNAR: {
        "name": "Lunar Authority",
        "center": None,
        "description": "For Reflectors only. Wait a full lunar cycle (~28 days) for major decisions. "
                       "Talk about it with different people throughout the month.",
        "guidance": "Wait a lunar cycle. Sample different perspectives. Trust the moon.",
    },
    Authority.NONE: {
        "name": "No Authority",
        "center": None,
        "description": "Follow your Strategy and type. Outer authority through environment and others.",
        "guidance": "Follow your Strategy. Listen to your environment.",
    },
}


# ==============================================================================
# PROFILES (12 combinations)
# ==============================================================================

PROFILES = {
    (1, 3): {
        "name": "1/3 Investigator/Martyr",
        "angle": "Right Angle",
        "description": "The foundation builder through trial and error. Needs to research and "
                       "investigate before acting, then learns through direct experience and bonds "
                       "made and broken. Personal destiny.",
        "personality": "Investigator - needs solid foundation, insecure without knowledge",
        "design": "Martyr - learns through trial and error, resilient, adaptable",
    },
    (1, 4): {
        "name": "1/4 Investigator/Opportunist",
        "angle": "Right Angle",
        "description": "The foundation builder within networks. Researches deeply and shares "
                       "knowledge through their network. Fixed fate that unfolds through friendships.",
        "personality": "Investigator - needs to research and understand foundations",
        "design": "Opportunist - influences through their network, needs community",
    },
    (2, 4): {
        "name": "2/4 Hermit/Opportunist",
        "angle": "Right Angle",
        "description": "The natural talent called out by their network. Has gifts that others "
                       "recognize. Needs alone time but is social through their network.",
        "personality": "Hermit - natural talents, needs to be called out",
        "design": "Opportunist - opportunities come through network",
    },
    (2, 5): {
        "name": "2/5 Hermit/Heretic",
        "angle": "Right Angle",
        "description": "The natural talent projected upon by others. Has innate gifts and is "
                       "projected upon as having practical solutions. Must live up to projections.",
        "personality": "Hermit - natural gifts needing to be called out",
        "design": "Heretic - universalizing, projected upon, practical solutions",
    },
    (3, 5): {
        "name": "3/5 Martyr/Heretic",
        "angle": "Right Angle",
        "description": "The resilient experimenter with universal appeal. Learns through trial "
                       "and error and is projected upon as having practical solutions for all.",
        "personality": "Martyr - trial and error, resilient, bonds made and broken",
        "design": "Heretic - universalizing projection field, practical solutions",
    },
    (3, 6): {
        "name": "3/6 Martyr/Role Model",
        "angle": "Right Angle",
        "description": "The experimental role model. First 30 years of experimentation, then "
                       "withdrawal to observe, then returning as a role model. Transitions through life.",
        "personality": "Martyr - learns through experimentation and bumping into life",
        "design": "Role Model - three phases: experiment, observe, embody",
    },
    (4, 6): {
        "name": "4/6 Opportunist/Role Model",
        "angle": "Right Angle",
        "description": "The influential role model within networks. Three life phases while "
                       "maintaining network. Becomes a trusted authority figure.",
        "personality": "Opportunist - influence through network, fixed fate",
        "design": "Role Model - three phases leading to trusted leadership",
    },
    (4, 1): {
        "name": "4/1 Opportunist/Investigator",
        "angle": "Juxtaposition",
        "description": "The fixed network influencer with deep foundations. Rare juxtaposition "
                       "profile. Influences network through well-researched foundation.",
        "personality": "Opportunist - fixed fate through network",
        "design": "Investigator - secure foundation, authoritative",
    },
    (5, 1): {
        "name": "5/1 Heretic/Investigator",
        "angle": "Left Angle",
        "description": "The practical universalizer with authoritative foundation. Strong "
                       "projection field met with deep research. Transpersonal karma.",
        "personality": "Heretic - universalizing, projection field, practical solutions",
        "design": "Investigator - solid foundation, authoritative knowledge",
    },
    (5, 2): {
        "name": "5/2 Heretic/Hermit",
        "angle": "Left Angle",
        "description": "The projected natural talent. Strong universal projection field with "
                       "innate gifts. Others see solutions and talents. Transpersonal karma.",
        "personality": "Heretic - projected upon as having solutions",
        "design": "Hermit - natural talent that needs calling out",
    },
    (6, 2): {
        "name": "6/2 Role Model/Hermit",
        "angle": "Left Angle",
        "description": "The natural role model. Goes through three life phases while maintaining "
                       "natural gifts. Eventually becomes trusted authority. Transpersonal karma.",
        "personality": "Role Model - three phases of development",
        "design": "Hermit - natural gifts, needs alone time",
    },
    (6, 3): {
        "name": "6/3 Role Model/Martyr",
        "angle": "Left Angle",
        "description": "The experimental role model with double trial and error. Most "
                       "experimental profile. Long learning curve leading to wisdom. Transpersonal karma.",
        "personality": "Role Model - optimistic, eventually objective",
        "design": "Martyr - learning through bumping into life",
    },
}


# ==============================================================================
# INCARNATION CROSS TYPES
# ==============================================================================

class CrossType(Enum):
    RIGHT_ANGLE = "Right Angle"
    JUXTAPOSITION = "Juxtaposition"
    LEFT_ANGLE = "Left Angle"


# Incarnation Cross is determined by the Profile's angle type
def get_cross_type_from_profile(personality_line: int, design_line: int) -> CrossType:
    """Determine cross type from profile lines."""
    if (personality_line, design_line) == (4, 1):
        return CrossType.JUXTAPOSITION
    elif personality_line >= 5:
        return CrossType.LEFT_ANGLE
    else:
        return CrossType.RIGHT_ANGLE


# ==============================================================================
# DEFINITION TYPES
# ==============================================================================

class Definition(Enum):
    NONE = "No Definition"
    SINGLE = "Single Definition"
    SPLIT = "Split Definition"
    TRIPLE_SPLIT = "Triple Split"
    QUADRUPLE_SPLIT = "Quadruple Split"


DEFINITIONS = {
    Definition.NONE: {
        "name": "No Definition",
        "description": "Reflector - completely open design. Deeply influenced by environment "
                       "and lunar cycle. No consistent energy definition.",
    },
    Definition.SINGLE: {
        "name": "Single Definition",
        "description": "All defined centers are connected. Self-contained, consistent, "
                       "independent energy. Does not need others to feel complete.",
    },
    Definition.SPLIT: {
        "name": "Split Definition",
        "description": "Two separate areas of definition. May seek others to 'bridge' the split. "
                       "The bridging gates create attraction to certain people.",
    },
    Definition.TRIPLE_SPLIT: {
        "name": "Triple Split Definition",
        "description": "Three separate areas of definition. Needs variety of people and "
                       "environments to bridge. Processing time important.",
    },
    Definition.QUADRUPLE_SPLIT: {
        "name": "Quadruple Split Definition",
        "description": "Four separate areas of definition (rare). Needs aura connection with "
                       "many people. Very fixed in their energy, needs patience and process.",
    },
}


# ==============================================================================
# PLANETS USED IN HUMAN DESIGN
# ==============================================================================

HD_PLANETS = [
    "Sun",
    "Earth",  # Always opposite Sun
    "Moon",
    "North_Node",
    "South_Node",  # Always opposite North Node
    "Mercury",
    "Venus",
    "Mars",
    "Jupiter",
    "Saturn",
    "Uranus",
    "Neptune",
    "Pluto",
]

# Planet meanings in Human Design context
PLANET_THEMES = {
    "Sun": "Life force, core identity (70% of who you are)",
    "Earth": "Grounding, physical body, balance to Sun",
    "Moon": "Driving force, what moves you",
    "North_Node": "Environment and people to move toward",
    "South_Node": "Environment and people to move away from",
    "Mercury": "Communication style",
    "Venus": "Values, morality",
    "Mars": "Immature energy, what needs maturing",
    "Jupiter": "Law, higher truth",
    "Saturn": "Discipline, life's work",
    "Uranus": "Unusual quality, uniqueness",
    "Neptune": "Spiritual, illusion/delusion",
    "Pluto": "Truth, transformation",
}


# ==============================================================================
# QUARTERS (for Incarnation Cross)
# ==============================================================================

QUARTERS = {
    "Initiation": {
        "gates": [13, 49, 30, 55, 37, 63, 22, 36, 25, 17, 21, 51, 42, 3, 27, 24],
        "theme": "The Quarter of Initiation - Mind - Purpose through Mind",
    },
    "Civilization": {
        "gates": [2, 23, 8, 20, 16, 35, 45, 12, 15, 52, 39, 53, 62, 56, 31, 33],
        "theme": "The Quarter of Civilization - Form - Purpose through Form",
    },
    "Duality": {
        "gates": [7, 4, 29, 59, 40, 64, 47, 6, 46, 18, 48, 57, 32, 50, 28, 44],
        "theme": "The Quarter of Duality - Bonding - Purpose through Bonds",
    },
    "Mutation": {
        "gates": [1, 43, 14, 34, 9, 5, 26, 11, 10, 58, 38, 54, 61, 60, 41, 19],
        "theme": "The Quarter of Mutation - Transformation - Purpose through Transformation",
    },
}


def get_quarter_for_gate(gate: int) -> str:
    """Get the quarter a gate belongs to."""
    for quarter_name, data in QUARTERS.items():
        if gate in data["gates"]:
            return quarter_name
    return "Unknown"


# ==============================================================================
# INCARNATION CROSS NAMES BY ANGLE TYPE
# ==============================================================================

# The 192 Incarnation Crosses organized by angle type:
# - Right Angle: Personal karma (profiles 1/3, 1/4, 2/4, 2/5, 3/5, 3/6, 4/6)
# - Left Angle: Transpersonal karma (profiles 5/1, 5/2, 6/2, 6/3)
# - Juxtaposition: Fixed fate (profile 4/1 only)
#
# Each gate as Personality Sun produces a different cross name based on angle.
# Data sourced from authoritative Human Design references.

# Right Angle Cross Names (Personal Destiny)
RIGHT_ANGLE_CROSS_NAMES = {
    1: "The Sphinx",
    2: "The Sphinx",
    3: "Laws",
    4: "Explanation",
    5: "Consciousness",
    6: "Eden",
    7: "The Sphinx",
    8: "Contagion",
    9: "Planning",
    10: "The Vessel of Love",
    11: "Eden",
    12: "Eden",
    13: "The Sphinx",
    14: "The Vessel of Love",
    15: "The Vessel of Love",
    16: "Planning",
    17: "Service",
    18: "Service",
    19: "The Four Ways",
    20: "The Sleeping Phoenix",
    21: "Tension",
    22: "Rulership",
    23: "Explanation",
    24: "Incarnation",
    25: "The Vessel of Love",
    26: "The Trickster",
    27: "The Unexpected",
    28: "The Game Player",
    29: "Contagion",
    30: "Contagion",
    31: "The Unexpected",
    32: "Maya",
    33: "The Four Ways",
    34: "The Sleeping Phoenix",
    35: "Consciousness",
    36: "Eden",
    37: "Planning",
    38: "Tension",
    39: "Tension",
    40: "Planning",
    41: "The Unexpected",
    42: "Maya",
    43: "Insight",
    44: "The Four Ways",
    45: "Rulership",
    46: "The Vessel of Love",
    47: "Rulership",
    48: "Tension",
    49: "Explanation",
    50: "Laws",
    51: "Penetration",
    52: "Service",
    53: "Penetration",
    54: "Penetration",
    55: "The Sleeping Phoenix",
    56: "Laws",
    57: "Penetration",
    58: "Service",
    59: "The Sleeping Phoenix",
    60: "Laws",
    61: "Maya",
    62: "Maya",
    63: "Consciousness",
    64: "Consciousness",
}

# Left Angle Cross Names (Transpersonal Karma)
# Different names for the same gates when in Left Angle profiles
LEFT_ANGLE_CROSS_NAMES = {
    1: "Defiance",
    2: "Defiance",
    3: "Wishes",
    4: "Revolution",
    5: "Separation",
    6: "The Plane",
    7: "Masks",
    8: "Uncertainty",
    9: "Dedication",
    10: "Prevention",
    11: "Education",
    12: "Education",
    13: "Masks",
    14: "Uncertainty",
    15: "Prevention",
    16: "Identification",
    17: "Upheaval",
    18: "Upheaval",
    19: "Revolution",
    20: "Duality",
    21: "Endeavor",
    22: "Informing",
    23: "Dedication",
    24: "Incarnation",
    25: "Healing",
    26: "Confrontation",
    27: "Alignment",
    28: "Alignment",
    29: "Industry",
    30: "The Fates",
    31: "Alpha",
    32: "Limitation",
    33: "Refinement",
    34: "Duality",
    35: "Separation",
    36: "The Plane",
    37: "Migration",
    38: "Individualism",
    39: "Individualism",
    40: "Migration",
    41: "Alpha",
    42: "The Plane",
    43: "Dedication",
    44: "Incarnation",
    45: "Confrontation",
    46: "Healing",
    47: "Informing",
    48: "Endeavor",
    49: "Revolution",
    50: "Wishes",
    51: "The Clarion",
    52: "Demands",
    53: "Cycles",
    54: "Cycles",
    55: "The Spirit",
    56: "Distraction",
    57: "The Clarion",
    58: "Demands",
    59: "The Spirit",
    60: "Distraction",
    61: "Obscuration",
    62: "Obscuration",
    63: "Dominion",
    64: "Dominion",
}

# Juxtaposition Cross Names (Fixed Fate - Profile 4/1 only)
JUXTAPOSITION_CROSS_NAMES = {
    1: "Self-Expression",
    2: "The Driver",
    3: "Mutation",
    4: "Formulization",
    5: "Habits",
    6: "Conflict",
    7: "Interaction",
    8: "Contribution",
    9: "Focus",
    10: "Behavior",
    11: "Ideas",
    12: "Articulation",
    13: "Listening",
    14: "Power Skills",
    15: "Extremes",
    16: "Experimentation",
    17: "Opinions",
    18: "Correction",
    19: "Need",
    20: "The Now",
    21: "Control",
    22: "Grace",
    23: "Assimilation",
    24: "Rationalization",
    25: "Innocence",
    26: "The Trickster",
    27: "Caring",
    28: "Risks",
    29: "Commitment",
    30: "Fates",
    31: "Influence",
    32: "Conservation",
    33: "Retreat",
    34: "Power",
    35: "Experience",
    36: "Crisis",
    37: "Bargains",
    38: "Opposition",
    39: "Provocation",
    40: "Denial",
    41: "Fantasy",
    42: "Completion",
    43: "Insight",
    44: "Alertness",
    45: "Possession",
    46: "Serendipity",
    47: "Oppression",
    48: "Depth",
    49: "Principles",
    50: "Values",
    51: "Shock",
    52: "Stillness",
    53: "Beginnings",
    54: "Ambition",
    55: "Moods",
    56: "Stimulation",
    57: "Intuition",
    58: "Vitality",
    59: "Strategy",
    60: "Limitation",
    61: "Thinking",
    62: "Detail",
    63: "Doubts",
    64: "Confusion",
}

# Legacy fallback - uses Right Angle names as default
INCARNATION_CROSS_NAMES = RIGHT_ANGLE_CROSS_NAMES


# Cross variation lookup: maps Personality Sun gate to its variation number (1-4)
# Each cross group has 4 gates that rotate through quarters
# The variation number indicates which quarter the cross appears in
CROSS_VARIATIONS = {
    # Cross of Eden: gates 6, 11, 12, 36
    36: 1,  # Eden 1 (36/6 | 11/12)
    12: 2,  # Eden 2 (12/11 | 36/6)
    6: 3,   # Eden 3 (6/36 | 12/11)
    11: 4,  # Eden 4 (11/12 | 6/36)
    # Cross of the Sphinx: gates 1, 2, 7, 13
    1: 1, 7: 2, 13: 3, 2: 4,
    # Cross of Consciousness: gates 5, 35, 63, 64
    64: 1, 63: 2, 5: 3, 35: 4,
    # Cross of Laws: gates 3, 50, 56, 60
    56: 1, 60: 2, 3: 3, 50: 4,
    # Cross of Explanation: gates 4, 23, 49
    4: 1, 49: 2, 23: 3, 43: 4,
    # Cross of Contagion: gates 8, 29, 30
    30: 1, 29: 2, 8: 3, 14: 4,
    # Cross of Planning: gates 9, 16, 37, 40
    40: 1, 37: 2, 9: 3, 16: 4,
    # Cross of the Vessel of Love: gates 10, 15, 25, 46
    25: 1, 46: 2, 15: 3, 10: 4,
    # Cross of Service: gates 17, 18, 52, 58
    17: 1, 18: 2, 58: 3, 52: 4,
    # Cross of the Four Ways: gates 19, 33, 44
    33: 1, 19: 2, 44: 3, 24: 4,
    # Cross of the Sleeping Phoenix: gates 20, 34, 55, 59
    59: 1, 55: 2, 20: 3, 34: 4,
    # Cross of Tension: gates 21, 38, 39, 48
    48: 1, 21: 2, 38: 3, 39: 4,
    # Cross of Rulership: gates 22, 45, 47
    45: 1, 22: 2, 47: 3, 26: 4,
    # Cross of Incarnation: gates 24 (included in Four Ways)
    # Cross of the Unexpected: gates 27, 28, 31, 41
    27: 1, 28: 2, 41: 3, 31: 4,
    # Cross of the Maya: gates 32, 42, 61, 62
    42: 1, 32: 2, 61: 3, 62: 4,
    # Cross of Penetration: gates 51, 53, 54, 57
    51: 1, 57: 2, 53: 3, 54: 4,
}


def get_incarnation_cross_name(personality_sun_gate: int, cross_type: CrossType) -> str:
    """
    Get the proper incarnation cross name based on angle type.

    The 192 Incarnation Crosses are determined by:
    1. The Personality Sun gate (which of the 64 gates)
    2. The cross type/angle (Right Angle, Left Angle, or Juxtaposition)

    Different angle types produce different cross names for the same gate.
    For example:
    - Gate 17 + Right Angle → "Service"
    - Gate 17 + Left Angle → "Upheaval"
    - Gate 17 + Juxtaposition → "Opinions"

    Args:
        personality_sun_gate: The gate number of the Personality Sun
        cross_type: The cross type (Right Angle, Left Angle, or Juxtaposition)

    Returns:
        The full cross name (e.g., "The Left Angle Cross of Upheaval")
    """
    # Select the appropriate dictionary based on cross type
    if cross_type == CrossType.LEFT_ANGLE:
        cross_names = LEFT_ANGLE_CROSS_NAMES
    elif cross_type == CrossType.JUXTAPOSITION:
        cross_names = JUXTAPOSITION_CROSS_NAMES
    else:  # RIGHT_ANGLE is the default
        cross_names = RIGHT_ANGLE_CROSS_NAMES

    base_name = cross_names.get(personality_sun_gate, "Unknown")
    variation = CROSS_VARIATIONS.get(personality_sun_gate, None)

    if variation and variation > 1:
        return f"The {cross_type.value} Cross of {base_name} {variation}"
    return f"The {cross_type.value} Cross of {base_name}"


def get_cross_variation(personality_sun_gate: int) -> int:
    """Get the variation number (1-4) for an incarnation cross."""
    return CROSS_VARIATIONS.get(personality_sun_gate, 1)


# ==============================================================================
# HELPER FUNCTIONS
# ==============================================================================

def get_gate_at_degree(longitude: float) -> int:
    """
    Get the gate number at a given ecliptic longitude.

    The Human Design mandala starts Gate 41 at 2°00' Aquarius (302°).
    We need to offset the longitude to account for this wheel position.
    """
    # HD wheel offset: Gate 41 starts at 302° (2° Aquarius)
    HD_WHEEL_START = 302.0

    # Offset the longitude to align with the wheel
    offset_longitude = (longitude - HD_WHEEL_START) % 360

    # Calculate gate index
    index = int(offset_longitude / 5.625)
    return GATE_WHEEL[index % 64]


def get_line_at_degree(longitude: float) -> int:
    """
    Get the line (1-6) at a given ecliptic longitude.

    Lines are calculated based on position within the current gate,
    accounting for the HD wheel offset (Gate 41 starts at 302°).
    Each line spans 0.9375° (5.625° / 6 lines).
    """
    # HD wheel offset: Gate 41 starts at 302° (2° Aquarius)
    HD_WHEEL_START = 302.0

    # Offset the longitude to align with the HD wheel
    offset_longitude = (longitude - HD_WHEEL_START) % 360

    # Calculate position within the current gate
    position_in_gate = offset_longitude % 5.625

    # Calculate line (1-6)
    line = int(position_in_gate / 0.9375) + 1
    return min(line, 6)  # Ensure max is 6


def get_color_at_degree(longitude: float) -> int:
    """
    Get the color (1-6) at a given ecliptic longitude.

    Colors subdivide each line into 6 parts.
    Each line spans 0.9375°, so each color spans 0.15625° (0.9375/6).
    Accounts for HD wheel offset (Gate 41 starts at 302°).
    """
    HD_WHEEL_START = 302.0
    offset_longitude = (longitude - HD_WHEEL_START) % 360
    position_in_gate = offset_longitude % 5.625
    position_in_line = position_in_gate % 0.9375
    color = int(position_in_line / 0.15625) + 1
    return min(color, 6)


def get_tone_at_degree(longitude: float) -> int:
    """
    Get the tone (1-6) at a given ecliptic longitude.

    Tones subdivide each color into 6 parts.
    Each color spans 0.15625°, so each tone spans ~0.026042° (0.15625/6).
    Accounts for HD wheel offset (Gate 41 starts at 302°).
    """
    HD_WHEEL_START = 302.0
    offset_longitude = (longitude - HD_WHEEL_START) % 360
    position_in_gate = offset_longitude % 5.625
    position_in_line = position_in_gate % 0.9375
    position_in_color = position_in_line % 0.15625
    tone = int(position_in_color / 0.026041667) + 1
    return min(tone, 6)


def get_base_at_degree(longitude: float) -> int:
    """
    Get the base (1-5) at a given ecliptic longitude.

    Bases subdivide each tone into 5 parts.
    Each tone spans ~0.026042°, so each base spans ~0.005208° (0.026042/5).
    Accounts for HD wheel offset (Gate 41 starts at 302°).
    """
    HD_WHEEL_START = 302.0
    offset_longitude = (longitude - HD_WHEEL_START) % 360
    position_in_gate = offset_longitude % 5.625
    position_in_line = position_in_gate % 0.9375
    position_in_color = position_in_line % 0.15625
    position_in_tone = position_in_color % 0.026041667
    base = int(position_in_tone / 0.005208333) + 1
    return min(base, 5)


def get_channel_for_gates(gate1: int, gate2: int) -> Tuple[int, int] | None:
    """Check if two gates form a channel, return the channel tuple or None."""
    key1 = (gate1, gate2)
    key2 = (gate2, gate1)
    if key1 in CHANNELS:
        return key1
    if key2 in CHANNELS:
        return key2
    return None


def get_center_for_gate(gate: int) -> CenterType | None:
    """Get the center that contains a given gate."""
    for center_type, data in CENTERS.items():
        if gate in data["gates"]:
            return center_type
    return None
