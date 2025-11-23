# Frontend Architecture Plan - The Program

**Goal**: Create a visually stunning, modern UI for astrological chart calculations

---

## Technology Stack

### Core Framework
- **React 18.2+** - Modern UI library with hooks
- **TypeScript 5.0+** - Type safety and better DX
- **Vite 5.0+** - Lightning-fast dev server and build tool

### Styling & Design
- **Tailwind CSS 3.4+** - Utility-first CSS framework
- **Framer Motion 11+** - Smooth animations and transitions
- **Lucide React** - Beautiful, consistent icons
- **Radix UI** - Accessible, unstyled component primitives
- **CSS Variables** - Dynamic theming

### State Management & Data
- **Zustand** - Lightweight state management
- **TanStack Query (React Query)** - Server state management
- **TanStack Router** - Type-safe routing
- **Zod** - Schema validation
- **Axios** - HTTP client

### Chart Visualization
- **D3.js** - Advanced chart rendering
- **Canvas API** - High-performance chart drawing
- **SVG** - Scalable chart elements
- **Custom Chart Engine** - Astrological chart renderer

### Forms & Validation
- **React Hook Form** - Performant form handling
- **Zod** - Schema validation
- **Date-fns** - Date manipulation

### Development & Build
- **ESLint** - Code quality
- **Prettier** - Code formatting
- **Husky** - Git hooks
- **Docker** - Containerization

---

## Design System

### Visual Theme: "Cosmic Mysticism"

**Color Palette**:
```css
/* Primary - Deep cosmic purples and blues */
--cosmic-900: #0a0118    /* Deep space black */
--cosmic-800: #1a0b2e    /* Dark purple */
--cosmic-700: #2d1b4e    /* Medium purple */
--cosmic-600: #4a2c6d    /* Purple */
--cosmic-500: #6b4c9a    /* Light purple */

/* Accent - Celestial gold and cyan */
--celestial-gold: #f7b32b
--celestial-cyan: #00d9ff
--celestial-pink: #ff6ec7
--nebula-purple: #b794f6

/* Neutrals */
--gray-900: #0f0f0f
--gray-800: #1a1a1a
--gray-700: #2a2a2a
--gray-600: #3a3a3a
--gray-500: #5a5a5a
```

**Typography**:
- Headings: "Inter" or "Outfit" (modern, geometric)
- Body: "Inter" (clean, readable)
- Accent: "Cinzel" or "Cormorant" (elegant, mystical)
- Monospace: "JetBrains Mono" (charts, data)

**Visual Elements**:
- Glassmorphism effects (frosted glass cards)
- Gradient backgrounds (cosmic nebula themes)
- Glow effects on interactive elements
- Particle animations in backgrounds
- Smooth page transitions
- Micro-interactions on hover/click
- Animated constellation patterns
- Zodiac symbol animations

**Layout Principles**:
- Spacious, breathing layouts
- Card-based design
- Consistent 8px grid system
- Responsive breakpoints (sm, md, lg, xl, 2xl)
- Mobile-first approach
- Maximum content width: 1400px

---

## Application Structure

### Pages & Routes

```
/                          → Landing page (public)
/login                     → Login page (public)
/register                  → Registration page (public)

/dashboard                 → User dashboard (protected)
/clients                   → Client list (protected)
/clients/new               → Add new client (protected)
/clients/:id               → Client details (protected)
/clients/:id/edit          → Edit client (protected)

/charts                    → Chart list (protected)
/charts/new                → Create new chart (protected)
/charts/:id                → View chart (protected)

/birth-data                → Birth data management (protected)
/birth-data/new            → Add birth data (protected)
/birth-data/:id/edit       → Edit birth data (protected)

/settings                  → User settings (protected)
/settings/profile          → Profile settings (protected)
/settings/preferences      → Calculation preferences (protected)

/help                      → Help & documentation (protected)
```

### Component Architecture

```
src/
├── components/           # Reusable components
│   ├── ui/              # Base UI components (buttons, inputs, etc.)
│   ├── layout/          # Layout components (header, sidebar, etc.)
│   ├── charts/          # Chart-specific components
│   ├── forms/           # Form components
│   └── common/          # Shared components
│
├── features/            # Feature-based modules
│   ├── auth/           # Authentication
│   ├── dashboard/      # Dashboard
│   ├── clients/        # Client management
│   ├── charts/         # Chart calculation
│   └── settings/       # Settings
│
├── lib/                # Utilities & helpers
│   ├── api/           # API client
│   ├── hooks/         # Custom hooks
│   ├── utils/         # Utility functions
│   ├── validators/    # Validation schemas
│   └── constants/     # Constants
│
├── store/             # State management
│   ├── auth.ts        # Auth state
│   ├── charts.ts      # Charts state
│   └── ui.ts          # UI state
│
├── types/             # TypeScript types
│   ├── api.ts         # API types
│   ├── models.ts      # Data models
│   └── charts.ts      # Chart types
│
├── styles/            # Global styles
│   ├── globals.css    # Global CSS
│   └── themes.css     # Theme variables
│
├── assets/            # Static assets
│   ├── images/        # Images
│   ├── icons/         # Custom icons
│   └── fonts/         # Custom fonts
│
├── App.tsx            # Root component
├── main.tsx           # Entry point
└── router.tsx         # Route configuration
```

---

## Key Features

### 1. Landing Page
**Visual Impact**: Stunning hero section with animated cosmic background
- Gradient animated background
- Floating zodiac symbols
- Particle effects
- Smooth scroll animations
- Feature highlights with icons
- Beautiful call-to-action

### 2. Authentication
**Design**: Minimal, elegant forms with cosmic theme
- Clean, centered layout
- Glassmorphism card design
- Smooth transitions between login/register
- Form validation with helpful errors
- Social login buttons (future)
- Animated loading states

### 3. Dashboard
**Layout**: Card-based overview with stats and quick actions
- Welcome section with user info
- Statistics cards with animations
- Recent charts list
- Quick action buttons
- Chart calculation widget
- Activity timeline

### 4. Client Management
**Interface**: Table/grid view with search and filters
- Beautiful data table with sorting
- Grid/list view toggle
- Advanced search and filters
- Smooth add/edit modals
- Bulk actions
- Client avatars with initials

### 5. Chart Calculation Interface
**Experience**: Multi-step wizard with beautiful forms
- Step-by-step wizard
- Date/time/location picker with maps
- Chart type selection with visuals
- House system selector
- Real-time validation
- Progress indicator
- Beautiful calculation animation

### 6. Chart Visualization
**Centerpiece**: Interactive, beautiful astrological chart
- SVG-based chart wheel
- Animated planet positions
- Interactive aspects lines
- Hover tooltips with details
- Zoom and pan controls
- Print-ready export
- Multiple chart styles
- Dark/light theme support

### 7. User Settings
**Interface**: Tabbed settings panel
- Profile management
- Calculation preferences
- Default house system
- Theme customization
- Notification preferences
- Account security

---

## Component Specifications

### UI Component Library (src/components/ui/)

**Base Components**:
```typescript
// Button variations
<Button variant="primary" | "secondary" | "outline" | "ghost" | "danger" />
<Button size="sm" | "md" | "lg" />
<IconButton icon={Icon} />

// Inputs
<Input type="text" | "email" | "password" />
<TextArea rows={4} />
<Select options={[]} />
<DatePicker />
<TimePicker />
<LocationPicker />

// Feedback
<Alert variant="info" | "success" | "warning" | "error" />
<Toast />
<Modal />
<Dialog />
<Popover />
<Tooltip />

// Display
<Card />
<Badge />
<Avatar />
<Skeleton />
<Spinner />
<Progress />

// Navigation
<Tabs />
<Breadcrumb />
<Pagination />
```

### Layout Components (src/components/layout/)

```typescript
<AppLayout>         // Main app wrapper
<Header>            // Top navigation
<Sidebar>           // Side navigation
<Footer>            // Footer
<PageHeader>        // Page title and actions
<ContentArea>       // Main content wrapper
<Container>         // Content container
```

### Chart Components (src/components/charts/)

```typescript
<ChartWheel>        // Main chart visualization
<PlanetList>        // List of planets with positions
<AspectTable>       // Aspect grid
<HouseTable>        // House cusps
<ChartLegend>       // Chart legend
<ChartControls>     // Zoom, pan, export controls
<ZodiacWheel>       // Zodiac circle
<PlanetGlyph>       // Planet symbol
<AspectLine>        // Aspect line renderer
```

---

## Animation Specifications

### Page Transitions
```typescript
// Fade in/out
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
}

// Slide transitions
const slideVariants = {
  initial: { x: -100, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  exit: { x: 100, opacity: 0 }
}
```

### Component Animations
- Card entrance: Stagger fade + slide up
- Button hover: Subtle scale + glow
- Input focus: Border glow + scale
- Modal: Backdrop fade + content scale
- Toast: Slide in from top-right
- Loading: Pulse + rotate
- Chart: Animated drawing of elements

### Micro-interactions
- Button click: Ripple effect
- Card hover: Lift + shadow increase
- Icon hover: Rotate or bounce
- Toggle: Smooth slide
- Checkbox: Check animation
- Radio: Fill animation

---

## State Management Strategy

### Zustand Stores

**Auth Store** (`store/auth.ts`):
```typescript
interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (credentials) => Promise<void>
  logout: () => void
  register: (data) => Promise<void>
}
```

**Charts Store** (`store/charts.ts`):
```typescript
interface ChartsState {
  charts: Chart[]
  currentChart: Chart | null
  setCurrentChart: (chart) => void
  addChart: (chart) => void
  updateChart: (id, data) => void
  deleteChart: (id) => void
}
```

**UI Store** (`store/ui.ts`):
```typescript
interface UIState {
  sidebarOpen: boolean
  theme: 'light' | 'dark'
  toggleSidebar: () => void
  setTheme: (theme) => void
}
```

### React Query Usage
- API calls for all backend data
- Automatic caching and refetching
- Optimistic updates
- Background refetch
- Error handling

---

## Responsive Design

### Breakpoints
```css
sm: 640px   /* Mobile landscape */
md: 768px   /* Tablet */
lg: 1024px  /* Desktop */
xl: 1280px  /* Large desktop */
2xl: 1536px /* Extra large */
```

### Mobile-First Approach
- Design for mobile first
- Progressive enhancement for larger screens
- Touch-friendly targets (min 44px)
- Responsive navigation (hamburger menu)
- Responsive charts (adapt to screen size)
- Swipe gestures for mobile

---

## Performance Optimizations

### Code Splitting
- Route-based code splitting
- Lazy loading for heavy components
- Dynamic imports for charts

### Asset Optimization
- Image lazy loading
- WebP format for images
- SVG for icons
- Font subsetting

### Runtime Optimization
- React.memo for expensive components
- useMemo for heavy computations
- useCallback for event handlers
- Virtual scrolling for long lists
- Debounce for search inputs

---

## Accessibility

### WCAG 2.1 Level AA Compliance
- Semantic HTML
- ARIA labels and roles
- Keyboard navigation
- Focus management
- Color contrast ratios (4.5:1 minimum)
- Screen reader support
- Skip links
- Form labels and errors

---

## Development Workflow

### Setup
```bash
# Create Vite project
npm create vite@latest frontend -- --template react-ts

# Install dependencies
npm install

# Start dev server
npm run dev
```

### Scripts
```json
{
  "dev": "vite",
  "build": "tsc && vite build",
  "preview": "vite preview",
  "lint": "eslint . --ext ts,tsx",
  "format": "prettier --write \"src/**/*.{ts,tsx,css}\"",
  "type-check": "tsc --noEmit"
}
```

### Docker Integration
- Development: Hot-reload with volume mounts
- Production: Nginx serving static files
- Multi-stage build for optimization

---

## API Integration

### Axios Setup
```typescript
// lib/api/client.ts
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Add auth token to requests
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
```

### API Endpoints
```typescript
// lib/api/endpoints.ts
export const auth = {
  login: (data) => apiClient.post('/api/auth/login', data),
  register: (data) => apiClient.post('/api/auth/register', data),
  me: () => apiClient.get('/api/auth/me')
}

export const clients = {
  list: () => apiClient.get('/api/clients'),
  get: (id) => apiClient.get(`/api/clients/${id}`),
  create: (data) => apiClient.post('/api/clients', data),
  update: (id, data) => apiClient.patch(`/api/clients/${id}`, data),
  delete: (id) => apiClient.delete(`/api/clients/${id}`)
}

export const charts = {
  calculate: (data) => apiClient.post('/api/charts/calculate', data),
  list: () => apiClient.get('/api/charts'),
  get: (id) => apiClient.get(`/api/charts/${id}`)
}
```

---

## Chart Rendering Engine

### Technologies
- **Canvas API** for performance
- **D3.js** for calculations and scales
- **SVG** for interactive elements

### Features
- Circular chart wheel
- 12 house divisions
- Planet glyphs positioned by longitude
- Aspect lines between planets
- Degree markers
- Zodiac signs
- Customizable colors and styles
- Responsive sizing
- Export to PNG/SVG
- Print optimization

### Implementation Approach
```typescript
class ChartRenderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private width: number
  private height: number
  private center: { x: number, y: number }

  constructor(canvas: HTMLCanvasElement, chartData: ChartData) {
    // Initialize
  }

  render() {
    this.drawBackground()
    this.drawZodiacWheel()
    this.drawHouses()
    this.drawPlanets()
    this.drawAspects()
    this.drawLabels()
  }

  drawZodiacWheel() {
    // Draw 12 zodiac signs in outer circle
  }

  drawHouses() {
    // Draw house divisions
  }

  drawPlanets() {
    // Position and draw planets
  }

  drawAspects() {
    // Draw aspect lines
  }
}
```

---

## Testing Strategy

### Unit Tests
- Component rendering
- Utility functions
- State management
- Form validation

### Integration Tests
- User workflows
- API integration
- Authentication flow

### E2E Tests (Future)
- Complete user journeys
- Chart calculation flow
- Client management

---

## Deployment

### Docker Setup
```dockerfile
# Multi-stage build
FROM node:20-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### Environment Variables
```env
VITE_API_URL=http://localhost:8000
VITE_APP_NAME=The Program
VITE_ENABLE_ANALYTICS=false
```

---

## Timeline Estimate

**Phase 1: Setup & Foundation** (Current)
- Project setup
- Design system
- Base components
- Authentication UI

**Phase 2: Core Features**
- Dashboard
- Client management
- Chart calculation UI

**Phase 3: Chart Visualization**
- Chart renderer
- Interactive charts
- Export functionality

**Phase 4: Polish**
- Animations
- Responsive design
- Performance optimization
- Testing

**Phase 5: Deployment**
- Docker setup
- Documentation
- Production build

---

## Success Criteria

✅ Visually stunning design with cosmic theme
✅ Smooth, polished animations
✅ Responsive on all devices
✅ Fast performance (< 3s initial load)
✅ Accessible (WCAG AA)
✅ Type-safe codebase
✅ Clean, maintainable code
✅ Comprehensive documentation

---

**Let's build something beautiful!** 🌟
