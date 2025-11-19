# The Program - Professional Astrology Application

## Project Overview

**The Program** is a world-class professional astrology web application designed for professional astrologers, featuring three complete astrological systems:

1. **Western (Tropical) Astrology** - Complete chart calculations with multiple house systems
2. **Vedic (Sidereal/Jyotish) Astrology** - Full divisional chart support with dasha systems
3. **Human Design System** - Bodygraph calculations with gates, channels, and centers

## Target Audience

**Primary**: Professional astrologers requiring advanced calculation tools, client management, and detailed chart analysis capabilities.

**Requirements**: High-precision calculations, customizable preferences, comprehensive chart types, professional reporting, and batch processing capabilities.

---

## Technical Architecture

### Technology Stack

#### Backend
- **Language**: Python 3.10+
- **Framework**: FastAPI (high-performance async framework)
- **Calculation Engine**: Swiss Ephemeris (pyswisseph)
  - Precision: JPL DE431 ephemeris (sub-arcsecond accuracy)
  - Time Range: 13,201 BC to 17,191 AD
  - License: Dual (AGPL or Professional License)
- **Database**: PostgreSQL 14+
- **Cache**: Redis for frequently-accessed calculations
- **Authentication**: JWT tokens

#### Frontend
- **Framework**: React 18+ with TypeScript
- **State Management**: Redux Toolkit or Zustand
- **Chart Rendering**: D3.js + Custom SVG components
- **UI Library**: Material-UI or Tailwind CSS
- **Build Tool**: Vite
- **Testing**: Jest + React Testing Library

#### Infrastructure
- **Hosting**: Cloud-based (AWS/GCP/Azure or Vercel/Netlify)
- **CDN**: CloudFlare or similar
- **Database Hosting**: Managed PostgreSQL (AWS RDS/Supabase)
- **File Storage**: S3 or equivalent for generated reports
- **SSL/TLS**: Mandatory HTTPS

### Data Requirements

#### Geographic Database
- **GeoNames** database for worldwide location lookup
- **Timezone Database**: IANA tz database with historical data
- Latitude/Longitude precision to 0.01°
- Historical timezone change tracking (critical for accurate calculations)

#### Ephemeris Data
- Swiss Ephemeris data files (planets, asteroids, fixed stars)
- Approximate size: 100MB for full planetary data
- Update frequency: Annual (for new year data)

#### Atlas Integration
- City/location autocomplete with 3+ million locations
- Timezone resolution with DST handling
- Country/region boundary data

---

## Core Features Specification

### 1. WESTERN ASTROLOGY SYSTEM

#### Chart Types

**Birth/Natal Charts**
- Complete natal chart with all planetary positions
- Configurable number of displayed points
- Multiple viewing modes (wheel, list, aspect grid)

**Transit Charts**
- Current planetary positions overlaid on natal
- Date/time selection for historical or future transits
- Real-time transit mode (updates continuously)

**Progressed Charts**
- Secondary Progressions (day-for-a-year)
- Solar Arc Directions
- Tertiary Progressions
- Minor Progressions
- Customizable progression rate

**Return Charts**
- Solar Returns (annual)
- Lunar Returns (monthly)
- Planetary Returns (Mercury, Venus, Mars, Jupiter, Saturn)
- Return chart relocation option

**Relationship Charts**
- Synastry (bi-wheel comparison)
- Composite (midpoint chart)
- Davison Relationship Chart (space-time midpoint)
- Relationship aspects grid

**Specialized Charts**
- Horary (question-based, with strictures and considerations)
- Electional (timing selection with multiple criteria)
- Mundane (world events, ingress charts)
- Declination charts

**Relocation/Astrocartography**
- Relocated charts for different geographic locations
- Astrocartography maps with planetary lines
- Local Space charts
- Parans and crossing points

#### House Systems (Full Support)

**Quadrant Systems**:
- Placidus (default, most popular)
- Koch
- Regiomontanus
- Campanus
- Topocentric
- Alcabitius
- Porphyry

**Equal Systems**:
- Equal (from Ascendant)
- Equal (from Midheaven)
- Whole Sign Houses
- Vehlow Equal

**Other Systems**:
- Meridian
- Morinus (Rational)
- Horizontal
- Azimuthal
- Polich/Page (Page-Polich Topocentric)

**Configuration**:
- User-selectable default system
- Per-chart override option
- House cusp precision to 0.01°

#### Calculated Points

**Planets & Luminaries**:
- Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto
- True Node & Mean Node
- True Lilith (Osculating), Mean Lilith, Interpolated Lilith
- Chiron
- Part of Fortune (multiple calculation methods)
- Vertex & Anti-Vertex
- East Point

**Asteroids** (Optional, User-Selectable):
- Main Four: Ceres, Pallas, Juno, Vesta
- Extended: Eros, Psyche, Sappho, Amor, Cupido
- Centaurs: Pholus, Nessus, Chariklo
- TNOs: Eris, Sedna, Quaoar, Makemake, Haumea
- Custom asteroid support by number

**Fixed Stars** (50+ Major Stars):
- Regulus, Spica, Antares, Aldebaran, Algol, Sirius, etc.
- Magnitude and position data
- Conjunction orbs (typically 1-2°)

**Arabic Parts** (50+ Lots):
- Part of Fortune (day/night formula)
- Part of Spirit
- Part of Love, Marriage, Children, etc.
- Part of Sudden Advancement
- Part of Catastrophe
- Custom formula support

#### Aspects

**Major Aspects**:
- Conjunction (0°) - default orb 8-10°
- Opposition (180°) - default orb 8-10°
- Trine (120°) - default orb 8°
- Square (90°) - default orb 7°
- Sextile (60°) - default orb 6°

**Minor Aspects**:
- Semi-sextile (30°) - default orb 2-3°
- Semi-square (45°) - default orb 2-3°
- Sesqui-square (135°) - default orb 2-3°
- Quincunx/Inconjunct (150°) - default orb 3°
- Quintile (72°) - default orb 2°
- Bi-quintile (144°) - default orb 2°

**Harmonic Aspects** (Optional):
- Septile series (7th harmonic): 51.43°, 102.86°, 154.29°
- Novile series (9th harmonic): 40°, 80°, 160°
- Undecile series (11th harmonic)

**Aspect Configuration**:
- Customizable orbs per aspect type
- Separate orbs for planets vs. angles
- Applying vs. Separating detection
- Aspect strength calculation
- Ptolemaic vs. Modern aspect sets

**Aspect Patterns** (Auto-Detection):
- Grand Trine
- Grand Cross
- T-Square
- Yod (Finger of God)
- Kite
- Mystic Rectangle
- Grand Sextile
- Stellium (3+ planets in sign/house)

#### Advanced Calculations

**Dignities**:
- Essential Dignity (Rulership, Exaltation, Triplicity, Term, Face)
- Accidental Dignity (Angular, Succedent, Cadent placement)
- Peregrine planets detection
- Mutual Reception

**Midpoints**:
- All planetary midpoints
- Midpoint trees
- Solar Arc midpoint progressions
- 90° dial (cosmobiology)

**Harmonic Charts**:
- Any harmonic (H4, H5, H7, H9, etc.)
- Harmonic concordance analysis

**Other Advanced Features**:
- Planetary Hours calculation
- Moon Phases and Void-of-Course Moon
- Planetary Speeds (direct, retrograde, stationary)
- Out-of-Bounds planets (declination > 23°27')
- Pre-natal eclipse points
- Antiscia and Contra-antiscia

---

### 2. VEDIC (JYOTISH) ASTROLOGY SYSTEM

#### Ayanamsa Systems

**Pre-defined Ayanamsa Options**:
1. **Lahiri** (Chitrapaksha) - Most widely used, Indian government standard
2. **Raman** (B.V. Raman)
3. **Krishnamurti** (KP System)
4. **Yukteshwar**
5. **JN Bhasin**
6. **Fagan/Bradley** (Western sidereal)
7. **Djwhal Khul**
8. **True Chitrapaksha**
9. **True Revati**
10. **True Pushya**
11. **Sassanian**
12. **Galactic Center (Sidereal)**
13. **Custom Ayanamsa** (user-defined value)

**Ayanamsa Details**:
- Current value display (e.g., "24°08'09" for Lahiri in 2025)
- Precession rate display
- Option to save per-chart preference

#### Chart Types (Rasi & Divisional)

**Main Chart**:
- **D-1 (Rasi)** - Birth chart, foundation of all analysis

**Divisional Charts (Vargas)** - All 16 Standard Divisions:
1. **D-1** (Rasi) - General life, body
2. **D-2** (Hora) - Wealth
3. **D-3** (Drekkana) - Siblings, courage
4. **D-4** (Chaturthamsa) - Fortune, property
5. **D-7** (Saptamsa) - Children
6. **D-9** (Navamsa) - Marriage, dharma (most important divisional)
7. **D-10** (Dasamsa) - Career, profession
8. **D-12** (Dwadasamsa) - Parents
9. **D-16** (Shodasamsa) - Vehicles, comforts
10. **D-20** (Vimsamsa) - Spirituality
11. **D-24** (Chaturvimsamsa) - Education, learning
12. **D-27** (Bhamsa) - Strength, weakness
13. **D-30** (Trimsamsa) - Misfortunes, evils
14. **D-40** (Khavedamsa) - Auspicious/inauspicious effects
15. **D-45** (Akshavedamsa) - Character, conduct
16. **D-60** (Shashtiamsa) - All matters, past life karma

**Additional Charts**:
- **Bhava Chalit** - Actual house cusps (different from Rasi)
- **Chalit Kundali** - Moving/dynamic chart
- **Sudarshan Chakra** - Three-fold division (Lagna, Moon, Sun)

#### Chart Display Styles

**North Indian Style** (Diamond):
```
         [12]
    [11]      [1]
[10]              [2]
    [9]       [3]
         [4]
    [8]       [5]
         [6]
         [7]
```

**South Indian Style** (Square Grid):
```
[12][1] [2] [3]
[11][  X  ] [4]
[10][  X  ] [5]
[9] [8] [7] [6]
```

**East Indian Style** (Rectangular):
```
[11][10][9] [8]
[12][  X  ] [7]
[1] [  X  ] [6]
[2] [3] [4] [5]
```

**Western Style** - Optional circular wheel format

#### Dasha (Planetary Period) Systems

**Vimshottari Dasha** (120-year cycle - PRIMARY):
- **Maha Dasha** (Major period): 7-20 years per planet
  - Ketu (7 years)
  - Venus (20 years)
  - Sun (6 years)
  - Moon (10 years)
  - Mars (7 years)
  - Rahu (18 years)
  - Jupiter (16 years)
  - Saturn (19 years)
  - Mercury (17 years)
- **Antar Dasha** (Sub-period): Within each Maha Dasha
- **Pratyantar Dasha** (Sub-sub-period)
- **Sookshma Dasha** (Micro period)
- **Prana Dasha** (Nano period)

**Other Dasha Systems**:
- **Yogini Dasha** (36-year cycle, 8 goddesses)
- **Ashtottari Dasha** (108-year cycle, excludes Rahu/Ketu)
- **Kala Chakra Dasha**
- **Chara Dasha** (Jaimini system, sign-based)
- **Narayana Dasha**
- **Mandooka Dasha**

**Dasha Display Features**:
- Timeline view with current period highlighted
- Dasha tree (expandable periods/sub-periods)
- Bhukti (sub-period) start/end dates
- Balance of dasha at birth
- Dasha lordship and house placement
- Dasha ruler analysis

#### Nakshatras (Lunar Mansions)

**27 Nakshatras**:
1. Ashwini (Ketu)
2. Bharani (Venus)
3. Krittika (Sun)
4. Rohini (Moon)
5. Mrigashira (Mars)
6. Ardra (Rahu)
7. Punarvasu (Jupiter)
8. Pushya (Saturn)
9. Ashlesha (Mercury)
10. Magha (Ketu)
11. Purva Phalguni (Venus)
12. Uttara Phalguni (Sun)
13. Hasta (Moon)
14. Chitra (Mars)
15. Swati (Rahu)
16. Vishakha (Jupiter)
17. Anuradha (Saturn)
18. Jyeshtha (Mercury)
19. Mula (Ketu)
20. Purva Ashadha (Venus)
21. Uttara Ashadha (Sun)
22. Shravana (Moon)
23. Dhanishta (Mars)
24. Shatabhisha (Rahu)
25. Purva Bhadrapada (Jupiter)
26. Uttara Bhadrapada (Saturn)
27. Revati (Mercury)

**Nakshatra Details**:
- **Pada** (Quarter): Each nakshatra divided into 4 padas (3°20' each)
- **Nakshatra Lord**: Ruling planet
- **Rasi Lord**: Sign ruler where nakshatra resides
- **Qualities**: Deity, symbol, nature (Deva/Manushya/Rakshasa)
- **Gana**: Temperament (Deva, Manushya, Rakshasa)
- **Gender, Caste, Tatva** (element)

**Nakshatra Applications**:
- Janma Nakshatra (birth star)
- Nakshatra compatibility (Kuta matching)
- Tarabala (star strength for muhurta)
- Nakshatra transits

#### Planetary Strength (Bala) Calculations

**Shadbala** (Six-fold Strength):
1. **Sthana Bala** - Positional strength
   - Uchcha Bala (exaltation)
   - Saptavargaja Bala (divisional chart strength)
   - Ojhayugma Bala (odd/even signs)
   - Kendra Bala (angular strength)
   - Drekkana Bala
2. **Dig Bala** - Directional strength
3. **Kala Bala** - Temporal strength
   - Nathonnatha Bala (diurnal/nocturnal)
   - Paksha Bala (lunar fortnight)
   - Tribhaga Bala
   - Varsha-Masa-Dina-Hora Bala
   - Yuddha Bala (planetary war)
4. **Chesta Bala** - Motional strength (retrograde, combust, etc.)
5. **Naisargika Bala** - Natural strength (inherent planetary hierarchy)
6. **Drik Bala** - Aspectual strength

**Bhava Bala** (House Strength):
- Strength calculation for each of 12 houses
- Multiple contributing factors

**Ashtakavarga**:
- Sarvashtakavarga (collective bindus)
- Bhinnashtkavarga (individual planet contributions)
- 337-point system showing auspicious points in each sign
- Transit analysis using Ashtakavarga

#### Yogas (Planetary Combinations)

**Major Yoga Categories**:
- **Raja Yogas** - Combinations for power, authority, success
- **Dhana Yogas** - Wealth combinations
- **Mahapurusha Yogas** (5 yogas from benefics in kendras/own/exaltation)
  - Hamsa (Jupiter)
  - Malavya (Venus)
  - Sasa (Saturn)
  - Ruchaka (Mars)
  - Bhadra (Mercury)
- **Pancha Mahapurusha Yogas**
- **Nabhas Yogas** - Planetary patterns (Ashraya, Dala, Akriti Yogas)
- **Chandra Yogas** - Moon-based combinations
- **Surya Yogas** - Sun-based combinations
- **Nabhasa Yogas** - 32 yogas based on planetary distribution
- **Parivartana Yogas** - Mutual exchange of signs
- **Graha Malika Yogas** - Planetary garlands

**Doshas (Afflictions)**:
- **Kala Sarpa Yoga/Dosha** - All planets between Rahu-Ketu axis
- **Mangal Dosha (Kuja Dosha)** - Mars affliction for marriage
- **Shani Dosha** - Saturn afflictions
- **Graha Dosha** - General planetary afflictions

#### Special Vedic Features

**Combustion (Asta)**:
- Planets within specific degrees of Sun are combust
- Orbs vary by planet (Venus ~10°, Mars ~17°, etc.)
- Automatic detection and flagging

**Planetary War (Graha Yuddha)**:
- When two planets are within 1° longitude
- Winner/loser determination
- Impact on planetary strength

**Retrograde Motion (Vakri)**:
- Retrograde status for all planets
- Cheshtabala (motional strength) impact

**Panchanga (Daily Calendar)**:
- **Tithi** (Lunar day, 1-30)
- **Vara** (Weekday)
- **Nakshatra** (Lunar mansion)
- **Yoga** (27 yogas based on Sun-Moon longitude)
- **Karana** (Half-tithi, 11 karanas)

**Muhurta (Auspicious Timing)**:
- Electional astrology for Vedic rituals
- Choghadiya (day/night divisions)
- Hora (planetary hours)
- Auspicious/inauspicious timing selection

**Transit Analysis (Gochar)**:
- **Sade Sati** - Saturn's 7.5-year transit (before/over/after natal Moon)
- **Ashtama Shani** - Saturn in 8th from Moon
- **Rahu/Ketu Transits**
- Vedic transit rules (different from Western)
- Transit aspects (different aspect orbs and rules)

#### KP System (Krishnamurti Paddhati)

**Core Concepts**:
- **Sub-lords**: Each sign divided into 9 unequal parts
- **Cuspal positions**: House cusp significance
- **Ruling planets**: Planet, star lord, sub-lord hierarchy
- **Significators**: Planets signifying houses

**KP Features**:
- KP Ayanamsa (Krishnamurti)
- Cuspal sub-lord tables
- 249 sub divisions
- Ruling planet calculations
- Significator analysis for predictions

---

### 3. HUMAN DESIGN SYSTEM

#### Core Bodygraph Components

**9 Energy Centers** (Chakra-based):
1. **Head Center** (Crown) - Inspiration, mental pressure
2. **Ajna Center** (Third Eye) - Mental awareness, concepts
3. **Throat Center** - Communication, manifestation
4. **G-Center** (Self/Identity) - Direction, love, identity
5. **Heart/Ego Center** (Willpower) - Willpower, self-worth
6. **Spleen Center** - Intuition, survival, health
7. **Sacral Center** - Life force, sexuality, work energy
8. **Solar Plexus** (Emotional) - Emotions, feelings, sensitivity
9. **Root Center** - Stress, adrenaline, pressure

**Center States**:
- **Defined** (Colored) - Consistent, reliable energy
- **Undefined** (White) - Amplifies others' energy, potential for wisdom
- **Open** - No gates activated in the center

**64 Gates** (I-Ching Hexagrams):
- Each gate corresponds to one of 64 I-Ching hexagrams
- Located in specific centers
- Each gate divided into 6 **Lines** (substructure)
- Gates calculated from 13 celestial bodies' positions

**13 Celestial Bodies Used**:
- Sun, Earth, Moon (North & South Nodes), Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto

**36 Channels** (Connections):
- Each channel connects two gates between two centers
- Only **defined when both gates are activated**
- Channels carry specific themes/energies
- Create definition in connected centers

#### Dual Calculation System

**Personality (Conscious) - Black**:
- Calculated from **exact birth time**
- Represents conscious awareness
- "What you think you are"
- Displayed in **black** on bodygraph

**Design (Unconscious) - Red**:
- Calculated from **~88 days (88° of solar arc) before birth**
- Represents unconscious/genetic imprint
- "Your vehicle/body"
- Displayed in **red** on bodygraph

**Integration**:
- Gates can be activated in Personality only, Design only, or both
- **Channels require both gates** - can be from same or different activations
- Overall bodygraph shows integrated personality + design

#### Type, Strategy & Authority

**5 Energy Types**:
1. **Manifestor** (~9% of population)
   - Defined Throat to motor center (not Sacral)
   - Strategy: Inform before acting
   - Independent initiators

2. **Generator** (~37% of population)
   - Defined Sacral, not connected to Throat
   - Strategy: Wait to respond
   - Sustainable work energy

3. **Manifesting Generator** (~33% of population)
   - Defined Sacral connected to Throat
   - Strategy: Wait to respond, then inform
   - Multi-tasking, efficient energy

4. **Projector** (~20% of population)
   - No defined Sacral, no Throat-to-motor connection
   - Strategy: Wait for invitation
   - Guides and managers of energy

5. **Reflector** (~1% of population)
   - No centers defined
   - Strategy: Wait 29 days (lunar cycle)
   - Mirrors the community

**9 Authority Types** (Decision-Making):
1. **Emotional** (Solar Plexus defined) - Wait for emotional clarity
2. **Sacral** (Sacral defined, Solar Plexus undefined) - Gut response
3. **Splenic** (Spleen defined, no Emotional/Sacral) - In-the-moment intuition
4. **Ego/Heart** (Manifested or Projected) - Willpower authority
5. **Self-Projected** (G-Center to Throat, Projector) - Speaking truth
6. **Environmental** (Projector with no inner authority) - Place-based
7. **Lunar/None** (Reflector) - Wait 29 days, discuss with others
8. **Mental** (No inner authority, rare) - Discuss and mentally process

#### Profile (Life Theme)

**12 Profile Combinations** (from 6 lines):
- **1/3** - Investigator/Martyr
- **1/4** - Investigator/Opportunist
- **2/4** - Hermit/Opportunist
- **2/5** - Hermit/Heretic
- **3/5** - Martyr/Heretic
- **3/6** - Martyr/Role Model
- **4/6** - Opportunist/Role Model
- **4/1** - Opportunist/Investigator
- **5/1** - Heretic/Investigator
- **5/2** - Heretic/Hermit
- **6/2** - Role Model/Hermit
- **6/3** - Role Model/Martyr

**Line Meanings**:
- **Line 1** - Foundation, Investigation
- **Line 2** - Hermit, Natural
- **Line 3** - Martyr, Trial & Error
- **Line 4** - Opportunist, Network
- **Line 5** - Heretic, Universal
- **Line 6** - Role Model, Objectivity

**Profile Calculation**:
- First number: Conscious Sun line (Personality)
- Second number: Unconscious Sun line (Design)

#### Definition Types

**Split Definition Categories**:
- **Single Definition** - All defined centers connected in one group
- **Split Definition** - Two separate groups of definition
- **Triple Split** - Three separate groups
- **Quadruple Split** - Four separate groups (rare)

**Implications**:
- How person processes energy and makes decisions
- Bridging centers through others (undefined centers between defined groups)

#### Incarnation Cross

**Structure**:
- Composed of 4 gates from Sun and Earth positions
- **Conscious Sun/Earth** (Personality)
- **Unconscious Sun/Earth** (Design)

**192 Incarnation Crosses**:
- **Right Angle Crosses** (1-69°) - Personal destiny (~129 crosses)
- **Juxtaposition Crosses** (69-75°) - Fixed fate (~64 crosses)
- **Left Angle Crosses** (75-88°) - Transpersonal karma (~129 crosses)

**Naming Convention**:
Example: "Right Angle Cross of the Sphinx (1/2 | 7/13)"
- Angle type + Primary gate theme
- Four gates in parentheses (Conscious Sun/Earth | Unconscious Sun/Earth)

#### Advanced Human Design Features

**Variable** (Advanced Analysis):
- **Determination** - How to eat/digest (Design Sun)
- **Cognition** - How to think (Personality Sun)
- **Environment** - Where you thrive (Design Nodes)
- **Perspective** - How you see (Personality Nodes)

**PHS (Primary Health System)**:
- Dietary regimen based on Design Sun line color and tone
- 12 different digestion types

**Channels with Keywords**:
All 36 channels with names and themes, e.g.:
- Channel 10-20: Awakening - "The Now"
- Channel 34-57: Power - "Archetype of Power"
- Channel 1-8: Inspiration - "Creative Role Model"
- (Full list of 36 channels required)

**Gates with Meanings**:
All 64 gates with I-Ching hexagram names and themes, e.g.:
- Gate 1: Self-Expression - "The Creative"
- Gate 2: The Receptive - "Higher Knowledge"
- Gate 64: Confusion - "Before Completion"
- (Full list of 64 gates required)

#### Transit Charts

**Current Transit Bodygraph**:
- Real-time planetary positions creating temporary gates/channels
- Shows current collective energy

**Personal Transits**:
- How current transits interact with natal bodygraph
- Activation of temporary gates/channels
- Return charts (Saturn, Uranus, Chiron returns)

#### Composite Charts

**Partnerships**:
- Combined bodygraph showing relationship dynamic
- Electromagnetic connections
- Companionship vs. Compromise channels

**Penta** (Group of 5):
- Designed for small group dynamics (3-5 people)

#### Rave I'Ching Integration

- Traditional I-Ching wisdom applied to gates
- Line interpretations (6 lines per gate = 384 total line meanings)
- Color and tone analysis (advanced)

---

## User Interface Specifications

### Chart Display Requirements

#### Western Astrology Wheel
- **Circular design** with 360° zodiac
- **Outer ring**: Zodiac signs with degrees
- **Inner circles**: Houses (adjustable house system)
- **Planetary glyphs**: Positioned by exact degree
- **Aspect lines**: Color-coded, with optional orbs shown
- **Center**: Chart details (name, date, time, location)

**Multi-Wheel Capabilities**:
- **Bi-wheel**: Natal + Transits/Progressed/Synastry
- **Tri-wheel**: Natal + Transits + Progressed
- **Quad-wheel**: Four chart layers simultaneously

**Interactive Elements**:
- Hover over planet → Show exact position, dignity, aspects
- Click planet → Highlight all aspects, show detailed info panel
- Click aspect line → Show aspect details (orb, applying/separating)
- Zoom in/out for detailed examination
- Rotate wheel (for better aspect line visibility)

#### Vedic Chart Display
- **Support all 4 styles**: North Indian, South Indian, East Indian, Western
- **House numbers** clearly marked
- **Planetary glyphs** or Sanskrit symbols (option)
- **Rasi lords** displayed per house
- **Navamsa chart** side-by-side or separate tab
- **Divisional chart selector** - quick switch between D-1 through D-60
- **Bhava Chalit overlay** option

**Color Coding**:
- Benefics vs. Malefics (user-configurable colors)
- Exalted planets (highlighted)
- Debilitated planets (different highlight)
- Retrograde planets (marked with 'R' or specific color)

#### Human Design Bodygraph
- **9 Centers** - Geometric shapes representing each center
  - Defined centers: Colored/filled
  - Undefined centers: White/outlined
- **64 Gates** - Small numbered boxes on centers
  - Personality (conscious): Black
  - Design (unconscious): Red
  - Both: Black + Red split or dual-colored
- **36 Channels** - Lines connecting gates
  - Defined channels: Colored/bold
  - Undefined: Greyed out or invisible
- **Type, Strategy, Authority** - Text display alongside bodygraph
- **Profile** - Displayed prominently
- **Definition type** - Visual or text indicator

**Interactive Elements**:
- Hover over center → Show name, function, defined/undefined
- Hover over gate → Show gate number, name, I-Ching hexagram, activation source
- Hover over channel → Show channel name, theme, connected gates
- Click elements for detailed interpretations
- Toggle Personality/Design overlay (show only black, only red, or both)

### Data Entry Forms

#### Birth Data Input

**Required Fields**:
- **Name**: Full name (first, last, optional middle)
- **Date**: Calendar picker with manual entry fallback
  - Validation: Reasonable date range (1800-2100)
- **Time**: 24-hour or 12-hour format with AM/PM
  - Precision: Hours, minutes, optional seconds
  - "Unknown time" option (defaults to 12:00 noon)
- **Location**:
  - Autocomplete search (city, state/province, country)
  - Integration with GeoNames or similar database
  - Display: City, State/Province, Country
  - Auto-fill: Latitude, Longitude, Timezone

**Auto-Calculated Fields**:
- Latitude (decimal degrees, ±90°)
- Longitude (decimal degrees, ±180°)
- Timezone: IANA timezone name + UTC offset
- DST handling: Automatic based on historical data

**Optional Fields**:
- Gender (for interpretation customization)
- **Rodden Rating**: Data reliability (AA, A, B, C, DD, X)
  - AA: Accurate time from birth certificate
  - A: Quoted from birth certificate
  - B: Biography or autobiography
  - C: Caution, no source
  - DD: Dirty data, conflicting sources
  - X: Time unknown
- Notes/Comments

**Batch Import**:
- CSV upload with column mapping
- Required columns: Name, Date, Time, City/Lat/Long

#### Chart Options Panel

**Calculation Preferences**:
- **House System** (dropdown, 15+ options)
- **Zodiac** (Tropical / Sidereal)
- **Ayanamsa** (if Sidereal, 13+ options)
- **Node Type** (True / Mean)
- **Lilith Type** (Mean / True / Osculating)

**Display Options**:
- **Show/Hide Points**: Checkboxes for planets, asteroids, angles, parts
- **Aspect Set**: Major only / Major + Minor / All / Custom
- **Aspect Orbs**: Default / Custom (per-aspect adjustment)
- **Color Scheme**: Multiple preset themes + custom colors
- **Chart Style**: Multiple wheel designs, fonts, sizes

**Save Preferences**:
- User default settings (auto-load)
- Per-chart override option

### Analysis Tools Interface

#### Aspect Grid/Table
- **Matrix layout**: Planets on both axes
- **Color-coded cells**: Aspect type (conjunction, trine, etc.)
- **Orb display**: Degrees and minutes in each cell
- **Applying/Separating**: Arrows (→ applying, ← separating)
- **Sortable**: By planet, aspect type, or orb tightness

#### Transit Search Tool
- **Date Range Selector**: From/To dates
- **Transit Type**:
  - Transiting planet → Natal planet
  - Transiting planet → Natal angle
  - Progressed planet → Natal planet
- **Aspect Filter**: Select which aspects to search for
- **Planet Filter**: Which transiting/natal planets to include
- **Results Table**:
  - Date/Time of exact aspect
  - Transit description (e.g., "Transit Jupiter trine Natal Venus")
  - Orb at exactitude
  - Click to generate chart for that moment

#### Dasha Period Display (Vedic)
- **Timeline View**: Horizontal timeline with periods color-coded
- **Current Period**: Highlighted or marked with indicator
- **Dasha Tree**: Expandable/collapsible hierarchy
  - Maha Dasha (top level)
    - Antar Dasha (sub-level)
      - Pratyantar Dasha (sub-sub level)
- **Date Display**: Start and end dates for each period
- **Remaining Time**: Days/months/years remaining in current period
- **Ruler Info**: Planet ruling period, house placement, sign

#### Interpretation Panel
- **Tabbed Interface**:
  - Planetary Positions
  - Aspects
  - Houses
  - Special Points
  - Summary/Overview
- **Auto-Generated Text**: Based on selected points/aspects
- **Editable**: Allow user to modify interpretations
- **Save Custom Texts**: Store per-user or per-chart
- **Source Attribution**: Where interpretation came from (book, tradition, etc.)

### Client Management Interface

#### Client Database
- **List View**: All clients with quick search/filter
  - Name, Date of Birth, Last Modified
  - Quick action buttons (View Chart, Edit, Delete)
- **Client Detail Page**:
  - Personal info (name, contact details, notes)
  - Birth data with Rodden rating
  - Chart history (multiple charts per client)
  - Session notes (date-stamped entries)
  - File attachments (PDFs, images)

#### Chart History Per Client
- Multiple saved charts (natal, returns, progressions, etc.)
- Thumbnail previews
- Last viewed/modified timestamps
- Quick re-open

#### Privacy & Security
- **Encryption**: Birth data encrypted at rest
- **Access Control**: User authentication required
- **Data Export**: GDPR-compliant data export for clients
- **Data Deletion**: Secure deletion with confirmation

### Report Generation

#### Report Builder
- **Template Selection**:
  - Natal Report
  - Forecast/Transit Report
  - Relationship/Synastry Report
  - Custom templates
- **Content Selection**:
  - Which sections to include (planets, aspects, houses, etc.)
  - Interpretation depth (brief / moderate / detailed)
  - Chart images to include
- **Formatting Options**:
  - Header/footer with business logo
  - Font selection
  - Color scheme
- **Preview**: Live preview before export

#### Export Formats
- **PDF**: High-resolution, print-ready
- **DOCX**: Editable Microsoft Word format
- **HTML**: Web-compatible, shareable via link
- **Plain Text**: For copying into other applications

#### Chart Image Export
- **PNG/JPEG**: Raster formats, customizable DPI (72-300)
- **SVG**: Vector format, infinitely scalable
- **Resolution options**: Screen / Print / High-res
- **Transparent background** option

### Settings & Preferences

#### User Account Settings
- Profile information (name, email, business details)
- Password/authentication management
- Subscription/billing (if applicable)
- Usage statistics

#### Default Calculation Settings
- Preferred house system
- Preferred ayanamsa (for Vedic)
- Default aspect orbs
- Default points to display
- Timezone preference

#### Display Preferences
- Color themes (light/dark mode)
- Font sizes
- Default chart style
- Language/locale (if internationalized)

#### Data Management
- Atlas database updates
- Ephemeris file management
- Backup/restore client data
- Cache management

---

## Database Schema Design

### Core Tables

#### Users Table
```sql
CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    business_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    subscription_tier VARCHAR(50), -- free, pro, professional
    is_active BOOLEAN DEFAULT true
);
```

#### Clients Table
```sql
CREATE TABLE clients (
    client_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Birth Data Table
```sql
CREATE TABLE birth_data (
    birth_data_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(client_id) ON DELETE CASCADE,
    birth_date DATE NOT NULL,
    birth_time TIME, -- NULL if unknown
    time_unknown BOOLEAN DEFAULT false,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    timezone VARCHAR(100) NOT NULL, -- IANA timezone
    utc_offset INTEGER, -- in minutes
    city VARCHAR(255),
    state_province VARCHAR(255),
    country VARCHAR(100),
    rodden_rating VARCHAR(2), -- AA, A, B, C, DD, X
    gender VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Charts Table
```sql
CREATE TABLE charts (
    chart_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    birth_data_id UUID REFERENCES birth_data(birth_data_id) ON DELETE CASCADE,
    chart_name VARCHAR(255), -- "Natal Chart", "Solar Return 2025", etc.
    chart_type VARCHAR(50) NOT NULL, -- natal, transit, progressed, synastry, etc.
    astro_system VARCHAR(50) NOT NULL, -- western, vedic, human_design
    house_system VARCHAR(50), -- placidus, whole_sign, etc.
    ayanamsa VARCHAR(50), -- lahiri, raman, etc. (for Vedic)
    zodiac_type VARCHAR(50), -- tropical, sidereal
    calculation_params JSONB, -- additional parameters as JSON
    chart_data JSONB, -- calculated chart data (planets, houses, aspects)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_viewed TIMESTAMP
);
```

#### Interpretations Table
```sql
CREATE TABLE interpretations (
    interpretation_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interpretation_type VARCHAR(100) NOT NULL, -- planet_in_sign, aspect, house, etc.
    key_identifier VARCHAR(255) NOT NULL, -- e.g., "sun_in_aries", "sun_trine_moon"
    tradition VARCHAR(50), -- western, vedic, human_design
    text_content TEXT NOT NULL,
    source VARCHAR(255), -- Book title, author, or "custom"
    is_user_custom BOOLEAN DEFAULT false,
    user_id UUID REFERENCES users(user_id), -- NULL for default interpretations
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Session Notes Table
```sql
CREATE TABLE session_notes (
    note_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(client_id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    note_date DATE NOT NULL,
    note_content TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### User Preferences Table
```sql
CREATE TABLE user_preferences (
    preference_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE UNIQUE,
    default_house_system VARCHAR(50) DEFAULT 'placidus',
    default_ayanamsa VARCHAR(50) DEFAULT 'lahiri',
    default_zodiac VARCHAR(50) DEFAULT 'tropical',
    aspect_orbs JSONB, -- custom orbs per aspect type
    color_scheme VARCHAR(50) DEFAULT 'light',
    displayed_points JSONB, -- array of points to display by default
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Atlas/Location Cache Table
```sql
CREATE TABLE location_cache (
    location_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    city_name VARCHAR(255) NOT NULL,
    state_province VARCHAR(255),
    country VARCHAR(100) NOT NULL,
    latitude DECIMAL(10, 7) NOT NULL,
    longitude DECIMAL(10, 7) NOT NULL,
    timezone VARCHAR(100) NOT NULL,
    geonames_id INTEGER UNIQUE, -- if using GeoNames
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_city_country (city_name, country)
);
```

### Supporting Tables

#### Aspect Patterns Table (Auto-detected)
```sql
CREATE TABLE aspect_patterns (
    pattern_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chart_id UUID REFERENCES charts(chart_id) ON DELETE CASCADE,
    pattern_type VARCHAR(50), -- grand_trine, t_square, yod, etc.
    planets_involved JSONB, -- array of planet names
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### Transit Events Table (For Tracking)
```sql
CREATE TABLE transit_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chart_id UUID REFERENCES charts(chart_id) ON DELETE CASCADE,
    event_date TIMESTAMP NOT NULL,
    transiting_planet VARCHAR(50),
    natal_planet VARCHAR(50),
    aspect_type VARCHAR(50),
    orb DECIMAL(5, 2),
    is_applying BOOLEAN,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_chart_date (chart_id, event_date)
);
```

---

## API Endpoints Design

### Authentication Endpoints
```
POST   /api/auth/register          - Create new user account
POST   /api/auth/login             - Login and receive JWT token
POST   /api/auth/logout            - Logout (invalidate token)
POST   /api/auth/refresh-token     - Refresh JWT token
POST   /api/auth/reset-password    - Password reset request
```

### Client Management Endpoints
```
GET    /api/clients                - List all clients (paginated)
POST   /api/clients                - Create new client
GET    /api/clients/:id            - Get client details
PUT    /api/clients/:id            - Update client
DELETE /api/clients/:id            - Delete client
GET    /api/clients/:id/charts     - List all charts for client
GET    /api/clients/:id/notes      - Get session notes for client
POST   /api/clients/:id/notes      - Add session note
```

### Chart Calculation Endpoints
```
POST   /api/charts/calculate       - Calculate chart from birth data
GET    /api/charts/:id             - Get saved chart by ID
PUT    /api/charts/:id             - Update chart (name, notes, etc.)
DELETE /api/charts/:id             - Delete chart
GET    /api/charts/:id/export      - Export chart as PDF/image
```

### Chart-Specific Calculations
```
POST   /api/charts/natal           - Calculate natal chart
POST   /api/charts/transits        - Calculate transit chart
POST   /api/charts/progressions    - Calculate progressed chart
POST   /api/charts/synastry        - Calculate synastry (two birth data)
POST   /api/charts/composite       - Calculate composite chart
POST   /api/charts/return          - Calculate return chart (solar/lunar)
POST   /api/charts/human-design    - Calculate Human Design bodygraph
POST   /api/charts/vedic           - Calculate Vedic chart (all vargas)
```

### Transit & Analysis Endpoints
```
POST   /api/analysis/transits/search    - Search for transits in date range
POST   /api/analysis/aspects            - Get aspect list for chart
POST   /api/analysis/patterns           - Detect aspect patterns
POST   /api/analysis/dignities          - Calculate planetary dignities
POST   /api/analysis/strengths          - Calculate Shadbala/Bhava Bala
POST   /api/analysis/dashas             - Calculate Vimshottari Dasha periods
POST   /api/analysis/ashtakavarga       - Calculate Ashtakavarga
```

### Interpretation Endpoints
```
GET    /api/interpretations/:type/:key  - Get interpretation text
POST   /api/interpretations             - Add custom interpretation
PUT    /api/interpretations/:id         - Update custom interpretation
DELETE /api/interpretations/:id         - Delete custom interpretation
```

### Location/Atlas Endpoints
```
GET    /api/atlas/search?query=london   - Search for city (autocomplete)
GET    /api/atlas/timezone?lat=&lng=    - Get timezone for coordinates
GET    /api/atlas/details/:geonames_id  - Get full location details
```

### Report Generation Endpoints
```
POST   /api/reports/generate            - Generate PDF/DOCX report
GET    /api/reports/:id                 - Download generated report
POST   /api/reports/chart-image         - Generate chart image (PNG/SVG)
```

### User Preferences Endpoints
```
GET    /api/preferences                 - Get user preferences
PUT    /api/preferences                 - Update user preferences
```

### Ephemeris/Data Endpoints
```
GET    /api/ephemeris/current           - Current planetary positions
GET    /api/ephemeris/date/:date        - Positions for specific date
GET    /api/ephemeris/range             - Positions over date range
GET    /api/panchanga/:date             - Daily panchanga (Vedic)
```

---

## Development Phases

### Phase 1: Core Foundation (Months 1-3)
**Goal**: Establish calculation engine and basic chart display

**Backend**:
- Set up Python/FastAPI backend structure
- Integrate Swiss Ephemeris (pyswisseph)
- Implement natal chart calculations (Western)
- Implement basic Vedic chart calculations (D-1, D-9)
- Create database schema and models
- Build authentication system (JWT)
- Develop core API endpoints (auth, natal chart calculation)

**Frontend**:
- Set up React + TypeScript project
- Create basic chart wheel rendering (SVG)
- Build birth data input form with validation
- Implement atlas integration (GeoNames API)
- Create basic chart display page
- Build responsive layout framework

**Deliverables**:
- Working natal chart calculator (Western, Placidus)
- Basic Vedic chart (Rasi/Navamsa, Lahiri ayanamsa)
- Simple chart visualization
- User authentication
- Location search with timezone detection

---

### Phase 2: Advanced Charts & Calculations (Months 4-6)
**Goal**: Expand chart types and calculation accuracy

**Backend**:
- Implement multiple house systems (15+ systems)
- Add transit, progression, and return calculations
- Implement all 16 Vedic divisional charts
- Calculate aspects with customizable orbs
- Add Human Design bodygraph calculation
- Implement Vimshottari Dasha calculation
- Build Shadbala and Ashtakavarga calculations

**Frontend**:
- Build multi-wheel chart display (bi-wheel, tri-wheel)
- Create Vedic chart display (all 4 styles)
- Develop Human Design bodygraph renderer
- Build aspect grid/table component
- Create Dasha period timeline display
- Add chart customization panel (house systems, orbs, etc.)
- Implement chart type selector (natal/transit/progressed)

**Deliverables**:
- Complete Western chart system (all types)
- Full Vedic chart suite (all vargas + dashas)
- Human Design bodygraph visualization
- Interactive multi-wheel displays
- Aspect analysis tools

---

### Phase 3: Professional Tools & Client Management (Months 7-9)
**Goal**: Build professional astrologer workflow tools

**Backend**:
- Implement client database with CRUD operations
- Build transit search algorithm (date range queries)
- Create aspect pattern detection
- Develop batch chart calculation
- Implement report generation (PDF export)
- Build interpretation database system
- Add chart data export (JSON/XML)

**Frontend**:
- Create client management interface
  - Client list with search/filter
  - Client detail pages
  - Chart history per client
- Build transit search tool UI
- Develop report builder interface
- Create interpretation editor
- Build chart comparison view (synastry)
- Implement session notes functionality

**Deliverables**:
- Complete client management system
- Transit finder with date ranges
- PDF report generation
- Interpretation library (editable)
- Batch processing capabilities
- Professional workflow tools

---

### Phase 4: Polish, Optimization & Advanced Features (Months 10-12)
**Goal**: Refine UX, optimize performance, add advanced features

**Backend**:
- Implement Redis caching for frequent calculations
- Optimize database queries (indexing, query optimization)
- Add rate limiting and security hardening
- Implement automated backup system
- Build admin dashboard for user management
- Add API versioning
- Performance monitoring and logging

**Frontend**:
- Responsive design refinement (mobile/tablet)
- Accessibility improvements (ARIA labels, keyboard navigation)
- Advanced chart interactions (zoom, rotate, annotations)
- Keyboard shortcuts for power users
- Dark/light theme toggle
- Chart favorites and recent charts
- Offline capability (PWA)
- Performance optimization (code splitting, lazy loading)

**Advanced Features**:
- Astrocartography mapping
- Harmonic charts
- Midpoint analysis tools
- Arabic parts calculator
- Fixed stars display
- Asteroid selector (100+ asteroids)
- Custom aspect patterns
- Advanced Human Design variables
- Electional astrology tools
- Vedic Muhurta calculator

**Testing & Documentation**:
- Comprehensive unit tests (backend)
- Integration tests (API endpoints)
- End-to-end tests (critical user flows)
- User documentation/help system
- Video tutorials
- API documentation (Swagger/OpenAPI)

**Deliverables**:
- Fully polished, production-ready application
- Complete test coverage
- Comprehensive documentation
- Performance optimized
- Mobile-responsive
- Advanced professional features

---

## Success Metrics & KPIs

### Technical Metrics
- **Calculation accuracy**: ±0.001° for planetary positions
- **Performance**:
  - Chart calculation < 100ms
  - Page load < 2 seconds
  - API response time < 200ms (p95)
- **Uptime**: 99.9% availability
- **Test coverage**: >80% code coverage

### User Experience Metrics
- **User retention**: Track monthly active users
- **Chart calculations per user**: Average charts calculated/month
- **Feature adoption**: Usage rates for different chart types
- **Error rates**: <0.1% calculation errors
- **Support tickets**: Track common issues for UX improvements

### Business Metrics (if applicable)
- User signups (free vs. paid)
- Conversion rate (free to paid)
- Customer lifetime value (CLV)
- Churn rate
- Net Promoter Score (NPS)

---

## Security & Compliance

### Data Protection
- **Encryption**:
  - HTTPS/TLS for all connections
  - Database encryption at rest (birth data, personal info)
  - Password hashing (bcrypt/argon2)
- **Authentication**:
  - JWT tokens with expiration
  - Refresh token rotation
  - Multi-factor authentication (optional)
- **Authorization**:
  - Role-based access control (RBAC)
  - User can only access their own clients/charts

### GDPR Compliance
- **Data minimization**: Only collect necessary data
- **Right to access**: Users can export their data
- **Right to deletion**: Secure data deletion with confirmation
- **Data portability**: Export in standard formats (JSON, CSV)
- **Consent management**: Clear privacy policy and terms of service

### Backup & Disaster Recovery
- **Automated backups**: Daily database backups
- **Backup retention**: 30-day retention policy
- **Disaster recovery plan**: Documented recovery procedures
- **Data redundancy**: Multi-region database replication (if cloud-hosted)

---

## Recommended Libraries & Tools

### Backend (Python)
- **FastAPI**: Modern, fast web framework
- **pyswisseph**: Swiss Ephemeris Python bindings
- **SQLAlchemy**: ORM for database interactions
- **Alembic**: Database migrations
- **Pydantic**: Data validation
- **python-jose**: JWT token handling
- **passlib**: Password hashing
- **reportlab** or **WeasyPrint**: PDF generation
- **redis-py**: Redis client for caching
- **pytest**: Testing framework

### Frontend (React)
- **React 18+**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool
- **React Router**: Client-side routing
- **Axios**: HTTP client
- **D3.js**: Chart rendering
- **date-fns**: Date manipulation
- **Formik** + **Yup**: Form handling and validation
- **Material-UI** or **Tailwind CSS**: UI components
- **Redux Toolkit** or **Zustand**: State management
- **React Query**: Server state management

### DevOps & Tools
- **Docker**: Containerization
- **PostgreSQL**: Primary database
- **Redis**: Caching layer
- **Nginx**: Reverse proxy / load balancer
- **Git**: Version control
- **GitHub Actions** or **GitLab CI**: CI/CD
- **Sentry**: Error tracking
- **Prometheus** + **Grafana**: Monitoring

### Testing
- **pytest** (backend unit tests)
- **pytest-asyncio** (async tests)
- **Jest** (frontend unit tests)
- **React Testing Library** (component tests)
- **Cypress** or **Playwright** (E2E tests)
- **Postman** or **Insomnia** (API testing)

---

## Licensing Considerations

### Swiss Ephemeris License
- **Dual License**: AGPL 3.0 OR Professional License
- **AGPL**: Free, but requires source code disclosure if distributed
- **Professional License**: ~CHF 750 (one-time fee), allows proprietary use
- **Recommendation**: Start with AGPL for development, purchase Professional License before commercial launch

### Other Dependencies
- Most Python/JavaScript libraries: MIT or BSD (permissive)
- Ensure all dependencies are compatible with your license choice
- Keep LICENSE file updated with all attributions

---

## Future Enhancements (Post-Launch)

### Additional Features
- **Mobile apps**: Native iOS/Android apps
- **Collaboration**: Share charts with other users
- **Teaching tools**: Annotate charts for educational purposes
- **Astrology calendar**: Upcoming transits, eclipses, ingresses
- **Notification system**: Email/push alerts for important transits
- **AI-powered interpretations**: GPT-based interpretation generation
- **Chart comparison tools**: Compare multiple natal charts
- **Research database**: Statistical analysis across many charts
- **Integration APIs**: Allow third-party integrations
- **Marketplace**: User-contributed interpretations or chart templates

### Internationalization
- Multi-language support (Spanish, Hindi, French, German, etc.)
- Localized date/time formats
- Cultural variations in interpretation libraries

### Accessibility
- Screen reader optimization
- High-contrast mode
- Keyboard-only navigation
- Voice control integration

---

## Resources & References

### Astrology Calculation References
- **Swiss Ephemeris Documentation**: https://www.astro.com/swisseph/
- **NASA JPL Ephemerides**: https://ssd.jpl.nasa.gov/planets/eph_export.html
- **GeoNames Database**: https://www.geonames.org/
- **IANA Timezone Database**: https://www.iana.org/time-zones

### Astrology Books & Texts
- *The Only Way to Learn Astrology* by Marion March & Joan McEvers
- *Light on Life: An Introduction to the Astrology of India* by Hart de Fouw & Robert Svoboda
- *The Definitive Book of Human Design* by Lynda Bunnell & Ra Uru Hu
- *Hindu Predictive Astrology* by B.V. Raman
- *Brihat Parashara Hora Shastra* (BPHS) - Classical Vedic text

### Online Communities
- **Astrodienst Forum**: https://www.astro.com/forum/
- **Skyscript**: Traditional astrology forum
- **/r/astrology**: Reddit community
- **Human Design community forums**

### Professional Standards
- **ISAR** (International Society for Astrological Research)
- **NCGR** (National Council for Geocosmic Research)
- **AFA** (American Federation of Astrologers)

---

## Contact & Project Information

**Project Name**: The Program
**Type**: Professional Astrology Web Application
**Systems**: Western, Vedic, Human Design
**Target Users**: Professional Astrologers
**Platform**: Web (Progressive Web App)
**License**: TBD (AGPL or Professional License for Swiss Ephemeris)

---

**Document Version**: 1.0
**Last Updated**: 2025-10-19
**Status**: Planning Phase - Ready for Development

---

## Next Steps

1. **Review and approve** this project plan
2. **Choose tech stack** based on team expertise
3. **Set up development environment** (Python, Node.js, PostgreSQL)
4. **Acquire Swiss Ephemeris** and ephemeris data files
5. **Integrate GeoNames database** for location lookup
6. **Begin Phase 1 development** (Core Foundation)
7. **Establish coding standards** and Git workflow
8. **Set up CI/CD pipeline** for automated testing/deployment

---

*This document serves as the comprehensive blueprint for building The Program. All development should align with the specifications outlined above.*
