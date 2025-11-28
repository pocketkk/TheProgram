# The Program - User Guide

Welcome to The Program, your comprehensive desktop astrology application.

## Table of Contents

1. [Getting Started](#getting-started)
2. [First Launch](#first-launch)
3. [Features Overview](#features-overview)
4. [Western Astrology](#western-astrology)
5. [Vedic Astrology](#vedic-astrology)
6. [Human Design](#human-design)
7. [Transits](#transits)
8. [AI Interpretations](#ai-interpretations)
9. [Additional Tools](#additional-tools)
10. [Data Management](#data-management)
11. [Troubleshooting](#troubleshooting)

---

## Getting Started

### System Requirements

- **Operating System**: Linux (Ubuntu 20.04+, Debian 10+, or compatible)
- **RAM**: 4GB minimum, 8GB recommended
- **Disk Space**: 500MB for installation
- **Internet**: Required only for AI interpretation features

### Installation

**AppImage (Recommended):**
```bash
chmod +x "The Program-1.0.0.AppImage"
./The\ Program-1.0.0.AppImage --no-sandbox
```

**Debian Package:**
```bash
sudo dpkg -i theprogram_1.0.0_amd64.deb
```

---

## First Launch

### 1. Password Setup

On first launch, you'll be prompted to create an optional password:

- **Set a password**: Protects your data from casual access
- **Skip**: Access the app immediately without a password

You can change this later in Settings.

### 2. Birth Data Entry

Enter your birth information:

- **Name**: Your name or identifier
- **Date**: Birth date (use the date picker)
- **Time**: Birth time (as accurate as possible)
- **Location**: Start typing to search for your birthplace

The app will automatically detect:
- Latitude/Longitude
- Time zone
- Daylight saving time adjustments

### 3. Dashboard

After setup, you'll see your personalized dashboard with:
- Current transits to your natal chart
- Daily cosmic weather
- Quick access to all features

---

## Features Overview

### Navigation

Use the sidebar to navigate between sections:

| Icon | Section | Description |
|------|---------|-------------|
| Home | Dashboard | Overview and daily insights |
| Sun | Birth Chart | Western natal chart |
| Stars | Cosmic View | 3D solar system visualization |
| Calendar | Transits | Current planetary movements |
| Book | Journal | Personal astrology journal |
| Hexagram | I Ching | Oracle consultation |
| Cards | Tarot | Card readings |
| Numbers | Numerology | Number meanings |
| Body | Human Design | Your Human Design chart |
| Gear | Settings | App preferences |

---

## Western Astrology

### Natal Chart

View your complete birth chart with:

- **Planets**: Sun through Pluto, plus Chiron and North Node
- **Signs**: All 12 zodiac signs with exact degrees
- **Houses**: 12 houses showing life areas
- **Aspects**: Planetary relationships (conjunctions, trines, squares, etc.)

### House Systems

Choose from 15+ house systems:
- Placidus (default)
- Koch
- Whole Sign
- Equal House
- Porphyry
- Regiomontanus
- Campanus
- And more...

### Chart Wheel

The interactive chart wheel shows:
- Outer ring: Zodiac signs
- Inner ring: House cusps
- Center: Planetary positions
- Lines: Aspect connections

**Interactions:**
- Hover over planets for details
- Click aspects to see orb information
- Use the panel to toggle house systems

---

## Vedic Astrology

### Sidereal Zodiac

Vedic calculations use the sidereal zodiac (actual star positions) rather than tropical (seasonal).

### Ayanamsa Options

Choose your preferred ayanamsa:
- Lahiri (default, used in India)
- Raman
- Krishnamurti
- Fagan-Bradley

### Divisional Charts

View all 16 Varga charts:
- **D-1 (Rashi)**: Basic birth chart
- **D-9 (Navamsa)**: Marriage and dharma
- **D-10 (Dasamsa)**: Career
- **D-12 (Dwadasamsa)**: Parents
- And 12 more...

### Dasha Periods

See your Vimshottari Dasha timeline:
- Major period (Mahadasha)
- Sub-period (Antardasha)
- Current and upcoming periods
- Period start/end dates

### Planetary Strength

View Shadbala calculations:
- Directional strength
- Positional strength
- Temporal strength
- Overall strength scores

---

## Human Design

### Your Type

Human Design identifies 5 types:
- **Generator**: Responds to life
- **Manifesting Generator**: Multi-passionate responder
- **Projector**: Guides others
- **Manifestor**: Initiates action
- **Reflector**: Mirrors community

### Strategy & Authority

Your decision-making approach:
- **Strategy**: How to engage with life
- **Authority**: Your inner decision center

### The Bodygraph

The bodygraph shows:
- **9 Centers**: Energy hubs (defined or undefined)
- **64 Gates**: Specific energies from the I Ching
- **36 Channels**: Connections between centers

**Color Coding:**
- **Colored centers**: Defined (consistent energy)
- **White centers**: Undefined (receiving energy)
- **Red**: Design (unconscious)
- **Black**: Personality (conscious)

### Profile

Your profile (e.g., 3/5, 6/2) describes your life theme and role.

---

## Transits

### Current Transits

See where planets are now and how they aspect your natal chart:

- **Active Transits**: Current planetary positions
- **Aspects**: Connections to your birth chart
- **Orb Settings**: Adjust aspect sensitivity

### Transit Calendar

View upcoming significant transits:
- Exact dates
- Approaching/separating phases
- Duration of influence

---

## AI Interpretations

### How It Works

The Program integrates with Claude AI to provide personalized interpretations of your chart.

### Getting Interpretations

1. Navigate to any chart view
2. Click "Get AI Interpretation" or the sparkle icon
3. Wait for the streaming response
4. Interpretations are saved for future reference

### Interpretation Types

- **Planet in Sign**: What each placement means
- **Planet in House**: Life area focus
- **Aspects**: Relationship between planets
- **Patterns**: Grand trines, T-squares, etc.

### Requirements

- Internet connection
- Valid Anthropic API key (configured in Settings)

---

## Additional Tools

### Journal

Keep an astrology journal:
- Record daily observations
- Track transit experiences
- Note patterns and insights

### Timeline

View your astrological timeline:
- Past significant transits
- Upcoming cosmic events
- Life event correlations

### I Ching

Consult the ancient oracle:
- Generate hexagrams
- Read interpretations
- Track consultations

### Tarot

Digital tarot readings:
- Single card draws
- Multi-card spreads
- Card meanings

### Numerology

Explore number meanings:
- Life path number
- Expression number
- Personal year cycles

---

## Data Management

### Backup

Protect your data:

1. Go to **Settings > Data**
2. Click **Create Backup**
3. Choose save location
4. Keep backups in a safe place

### Restore

Restore from backup:

1. Go to **Settings > Data**
2. Click **Restore Backup**
3. Select your backup file
4. Confirm restoration

### Export

Export charts as:
- **PDF**: Professional reports
- **PNG**: Chart images
- **JSON**: Raw data

### Data Location

Your data is stored locally:
```
~/.config/theprogram/data/theprogram.db
```

---

## Troubleshooting

### App Won't Start

**Linux Sandbox Error:**
```bash
./The\ Program-1.0.0.AppImage --no-sandbox
```

**Missing Dependencies:**
```bash
sudo apt install libgtk-3-0 libnss3 libxss1
```

### Calculations Seem Wrong

1. Verify birth time is correct
2. Check timezone is properly detected
3. Ensure daylight saving time is accurate
4. Try a different house system

### AI Interpretations Not Working

1. Check internet connection
2. Verify API key in Settings
3. Ensure you haven't exceeded rate limits

### Slow Performance

1. Close other applications
2. Reduce animation settings
3. Clear cached data in Settings

### Data Recovery

If the database is corrupted:

1. Check for backup files
2. Copy `~/.config/theprogram/data/theprogram.db-wal` and `.db-shm`
3. Restore from last known good backup

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + 1-9` | Navigate to section |
| `Ctrl + S` | Save current work |
| `Ctrl + P` | Export to PDF |
| `Ctrl + ,` | Open Settings |
| `Esc` | Close modal/dialog |

---

## Getting Help

- **Documentation**: See `docs/` folder
- **Issues**: Report bugs on GitHub
- **Updates**: Check for new versions periodically

---

## Privacy

The Program respects your privacy:

- All data stored locally on your device
- No data transmitted except for AI features
- AI requests use your own API key
- No analytics or tracking

---

_Last updated: November 2024_
