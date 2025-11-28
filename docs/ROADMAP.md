# The Program - Roadmap

## Vision

A comprehensive desktop astrology application for practitioners and enthusiasts, combining accurate astronomical calculations with intuitive visualization and AI-powered insights.

**Target Audience:** Astrology practitioners, students, and enthusiasts who want professional-grade tools without subscription costs.

**Distribution Goal:** Shareable product (AppImage, .deb, potentially Windows/macOS).

---

## Guiding Principles

1. **Offline-first** - Core functionality works without internet
2. **Quality over velocity** - Well-tested, maintainable code
3. **Extensible architecture** - Easy to add new systems and features
4. **User data ownership** - All data stored locally, exportable

---

## Current Capabilities (v1.0)

### Western Astrology
- Natal chart calculation (all planets, points)
- 15+ house systems (Placidus, Koch, Whole Sign, etc.)
- Aspect detection with orbs
- Interactive chart wheel visualization

### Vedic Astrology
- Sidereal zodiac with multiple ayanamsas
- 16 divisional charts (D1-D60)
- Vimshottari Dasha periods
- Shadbala strength calculations
- Ashtakavarga tables

### Human Design
- 9 centers with definition status
- 64 gates with planetary activations
- 36 channels
- Type, Strategy, Authority
- Profile calculation

### Transits
- Current planetary positions
- Transit-to-natal aspects
- Date range selection

### AI Integration
- Claude-powered interpretations
- Planet, house, aspect delineations
- Streaming responses

### Infrastructure
- Electron desktop packaging
- SQLite local database
- PDF report export
- Data backup/restore

---

## Planned Capabilities

### Phase: Additional Astrology Systems

| Feature | Description | Priority |
|---------|-------------|----------|
| Solar Returns | Annual return charts | High |
| Lunar Returns | Monthly return charts | Medium |
| Progressions | Secondary progressions | High |
| Solar Arc | Directed charts | Medium |
| Synastry | Relationship comparison | High |
| Composite Charts | Relationship midpoint charts | Medium |
| Relocation Charts | Chart for different locations | Low |

### Phase: AI Enhancements

| Feature | Description | Priority |
|---------|-------------|----------|
| Agentic Workflows | AI guides through chart analysis | High |
| Pattern Recognition | Auto-detect significant configurations | Medium |
| Personalized Insights | Learn from user's chart patterns | Medium |
| Comparative Analysis | AI compares multiple charts | Low |
| Natural Language Queries | "What does my Jupiter mean?" | Medium |

### Phase: Data & Journaling

| Feature | Description | Priority |
|---------|-------------|----------|
| Transit Tracking | Log notable transits | High |
| Event Correlation | Link life events to transits | High |
| Journal Integration | Daily astrology journaling | Medium |
| Mood/Energy Tracking | Correlate with planetary cycles | Low |
| Pattern Analytics | Statistical transit impact analysis | Low |

### Phase: Visualization

| Feature | Description | Priority |
|---------|-------------|----------|
| Enhanced 3D | Improved cosmic visualizer | Medium |
| Animated Transits | Watch transits move over time | Medium |
| Multi-wheel Display | Natal + transits + progressions | High |
| Printable Charts | High-quality PDF/SVG export | Medium |
| Dark/Light Themes | User preference | Low |

---

## Technical Debt & Improvements

| Item | Description | Priority |
|------|-------------|----------|
| Test Coverage | Increase to 90%+ | Medium |
| Error Handling | Consistent error boundaries | Medium |
| Performance | Optimize large chart calculations | Low |
| Accessibility | Screen reader support | Low |
| Localization | Multi-language support | Low |

---

## Version History

### v1.0.0 (November 2024)
- Initial desktop release
- Western, Vedic, Human Design systems
- AI interpretations
- 3D cosmic visualizer
- PDF reports
- Backup/restore

---

## How to Update This Document

When completing features or adjusting priorities:

1. Move completed items from "Planned" to "Current Capabilities"
2. Add version entry with completion date
3. Adjust priorities based on user feedback
4. Add new ideas to appropriate phase

---

_Last updated: November 2024_
