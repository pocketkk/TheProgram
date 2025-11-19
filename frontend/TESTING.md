# Testing Guide for Cosmic Visualizer

This document outlines the testing strategy and practices for the Ultimate Cosmic Visualizer project.

## Testing Stack

- **Test Runner**: [Vitest](https://vitest.dev/) - Fast, Vite-native unit test framework
- **Component Testing**: [@testing-library/react](https://testing-library.com/react) - Testing utilities for React components
- **DOM Testing**: jsdom - Simulates browser environment for testing
- **Assertions**: [Vitest Matchers](https://vitest.dev/api/expect.html) + [@testing-library/jest-dom](https://github.com/testing-library/jest-dom)

## Running Tests

```bash
# Run tests in watch mode (for development)
npm test

# Run tests once (for CI/CD)
npm run test:run

# Run tests with UI (visual test viewer)
npm run test:ui

# Run tests with coverage report
npm run test:coverage
```

## Test Structure

### Unit Tests

#### Astronomy Calculations (`src/lib/astronomy/__tests__/`)

**`planetaryData.test.ts`** - Tests for core astronomical calculations:
- ✅ Julian Day conversion (date/time to astronomical time)
- ✅ **Planet position calculations (astronomy-engine VSOP87)** - ±1 arcminute accuracy
- ✅ Zodiac sign identification (12 signs, elements, symbols)
- ✅ Aspect detection (conjunction, sextile, square, trine, opposition)
- ✅ **Velocity-based retrograde detection** - accurate geocentric motion
- ✅ Constants validation (PLANETS, ZODIAC_SIGNS, ASPECTS)
- ✅ **Ephemeris accuracy tests** - validated against astronomical data

**`aspectPatterns.test.ts`** - Tests for astrological pattern detection:
- ✅ Grand Trine detection (3 planets in 120° triangles)
- ✅ T-Square detection (2 oppositions + 2 squares)
- ✅ Grand Cross detection (4 planets, 2 oppositions, 4 squares)
- ✅ Yod/Finger of God detection (2 planets sextile, both quincunx third)
- ✅ Kite detection (Grand Trine + opposition)
- ✅ Stellium detection (3+ planets within 10°)
- ✅ Pattern strength calculations (orb-based scoring)

### Test Coverage

Current test coverage:
- **41 tests** total (planetaryData.test.ts)
- **100% passing** rate
- **Core astronomy functions**: Full coverage with high-precision ephemeris
- **Aspect pattern detection**: Full coverage
- **Ephemeris accuracy**: Validated against JPL Horizons data

#### Covered Functionality:

1. **Date/Time Conversion**
   - Julian Day calculations
   - J2000.0 epoch handling
   - Leap year support
   - Timezone handling

2. **Planetary Calculations** (astronomy-engine powered)
   - High-precision position calculations for all planets + Pluto
   - Heliocentric and geocentric coordinate systems
   - Accurate orbital motion tracking over time
   - Elliptical orbit support (perihelion/aphelion distances)
   - Ecliptic longitude calculations (0-360°)
   - Validated against JPL Horizons ephemeris data

3. **Astrological Analysis**
   - 12 zodiac signs with elements
   - 5 major aspects (conjunction, sextile, square, trine, opposition)
   - Orb-based aspect strength
   - 360° wrap-around handling

4. **Advanced Patterns**
   - Grand Trine (harmonious triangle)
   - T-Square (tension triangle)
   - Grand Cross (cardinal cross)
   - Yod (finger of fate)
   - Kite (uplifted trine)
   - Stellium (planet clusters)

5. **Retrograde Detection** (velocity-based)
   - Accurate geocentric motion analysis
   - Angular velocity calculations
   - All planet support (Mercury through Pluto)
   - Batch status tracking for all planets
   - Earth correctly reports as never retrograde

## Testing Best Practices

### Writing Tests

1. **Descriptive Test Names**: Use clear, descriptive names that explain what's being tested
   ```typescript
   it('should detect conjunction within orb')
   it('should handle 360° wrap-around')
   ```

2. **AAA Pattern**: Arrange, Act, Assert
   ```typescript
   // Arrange
   const planets = [/* test data */]

   // Act
   const patterns = detectGrandTrines(planets)

   // Assert
   expect(patterns).toHaveLength(1)
   ```

3. **Test Edge Cases**:
   - Boundary conditions (0°, 360°)
   - Negative values
   - Empty inputs
   - Invalid data

4. **Use Realistic Test Data**:
   - Actual astronomical values when possible
   - Valid planet positions
   - Correct orbital parameters

### Test Organization

```
src/
├── lib/
│   └── astronomy/
│       ├── __tests__/           # Tests for astronomy lib
│       │   ├── planetaryData.test.ts
│       │   └── aspectPatterns.test.ts
│       ├── planetaryData.ts
│       └── aspectPatterns.ts
└── test/
    └── setup.ts                 # Global test configuration
```

## Common Testing Patterns

### Testing Astronomical Calculations

```typescript
describe('calculatePlanetPosition', () => {
  it('should calculate position within orbital radius', () => {
    const pos = calculatePlanetPosition(PLANETS.earth, julianDay)
    const distance = Math.sqrt(pos.x ** 2 + pos.y ** 2 + pos.z ** 2)

    expect(distance).toBeCloseTo(PLANETS.earth.orbitRadius, 1)
  })
})
```

### Testing Aspect Detection

```typescript
describe('calculateAspect', () => {
  it('should detect conjunction', () => {
    const aspect = calculateAspect(0, 5) // 5° apart

    expect(aspect).toBeDefined()
    expect(aspect?.name).toBe('Conjunction')
    expect(aspect?.angle).toBe(0)
  })
})
```

### Testing Pattern Detection

```typescript
describe('detectGrandTrines', () => {
  it('should detect perfect grand trine', () => {
    const planets: PlanetPosition[] = [
      { name: 'sun', angle: 0, x: 1, y: 0, z: 0 },
      { name: 'moon', angle: 120, x: -0.5, y: 0, z: 0.866 },
      { name: 'mars', angle: 240, x: -0.5, y: 0, z: -0.866 },
    ]

    const patterns = detectGrandTrines(planets)

    expect(patterns).toHaveLength(1)
    expect(patterns[0].type).toBe('grand-trine')
    expect(patterns[0].strength).toBeGreaterThan(0.9)
  })
})
```

## Continuous Integration

Tests run automatically on:
- Pre-commit (via git hooks, if configured)
- Pull requests
- Main branch pushes

## Debugging Tests

### Using Vitest UI

```bash
npm run test:ui
```

This opens a browser-based UI where you can:
- See test results visually
- Filter and search tests
- View code coverage
- Debug failing tests

### Debugging in VS Code

1. Add to `.vscode/launch.json`:
```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Tests",
  "runtimeExecutable": "npm",
  "runtimeArgs": ["test"],
  "console": "integratedTerminal"
}
```

2. Set breakpoints in test files
3. Press F5 to debug

## Future Testing Goals

### Planned Test Additions

1. **Component Tests** for React Three Fiber components:
   - Planet rendering
   - Aspect line drawing
   - House system display

2. **Integration Tests**:
   - Full scene rendering
   - User interactions
   - State management

3. **Visual Regression Tests**:
   - Screenshot comparison
   - 3D scene snapshots

4. **Performance Tests**:
   - Rendering benchmarks
   - Calculation speed
   - Memory usage

### Testing Roadmap

- [ ] Increase coverage to 90%+
- [ ] Add E2E tests with Playwright
- [ ] Set up visual regression testing
- [ ] Add performance benchmarks
- [ ] Create mock data generators
- [ ] Add mutation testing

## Troubleshooting

### Common Issues

**Tests fail with "Cannot find module"**
- Run `npm install` to ensure all dependencies are installed
- Check that `vitest.config.ts` has correct path aliases

**Tests timeout**
- Increase timeout in test file: `it('test', () => {...}, 10000)`
- Check for infinite loops or blocking operations

**Flaky tests**
- Ensure tests don't depend on external state
- Use fixed test data instead of randomization
- Mock time-dependent functions

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Docs](https://testing-library.com/)
- [Astronomical Algorithms](https://en.wikipedia.org/wiki/Astronomical_Algorithms) - Reference for calculations
- [astronomy-engine](https://github.com/cosinekitty/astronomy) - **INTEGRATED (Oct 2025)**: High-precision ephemeris library
  - Accuracy: ±1 arcminute
  - Based on VSOP87 and NOVAS C 3.1
  - Rigorously tested against JPL Horizons
  - Provides accurate planetary positions, retrograde detection, and coordinate transforms

## Contributing

When adding new features:

1. Write tests FIRST (TDD approach)
2. Ensure tests pass before committing
3. Maintain or improve coverage
4. Document complex test scenarios
5. Add examples for future developers

---

*Last Updated: 2025-10-25*
*Test Suite Version: 2.0*
*Total Tests: 41 (planetaryData)*
*Ephemeris: astronomy-engine (VSOP87 + NOVAS C 3.1)*
*Accuracy: ±1 arcminute*
