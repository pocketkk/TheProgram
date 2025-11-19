# The Program - Frontend

Beautiful, modern frontend for The Program astrological chart calculation application.

## 🌟 Features

- **Visually Stunning**: Cosmic-themed UI with gradients, glassmorphism, and animations
- **Modern Stack**: React 18 + TypeScript + Vite + Tailwind CSS
- **Smooth Animations**: Framer Motion for fluid transitions
- **Type-Safe**: Full TypeScript coverage
- **Responsive**: Mobile-first design
- **Fast**: Vite for lightning-fast development
- **Accessible**: WCAG 2.1 AA compliant

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm
- Backend API running on http://localhost:8000

### Installation

```bash
# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Start development server
npm run dev
```

The application will be available at http://localhost:3000

## 📦 Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
npm run type-check   # Check TypeScript types
```

## 🎨 Design System

### Color Palette

**Cosmic Theme**:
- cosmic-900 to cosmic-100: Deep purples and violets
- celestial-gold: Warm accent gold
- celestial-cyan: Cool accent cyan
- celestial-pink: Vibrant accent pink
- celestial-purple: Nebula purple

### Typography

- **Headings**: Outfit (modern, geometric)
- **Body**: Inter (clean, readable)
- **Accent**: Cinzel (elegant, mystical)
- **Monospace**: JetBrains Mono (charts, data)

### Visual Effects

- Glassmorphism cards
- Cosmic gradient backgrounds
- Glow effects on interactive elements
- Smooth page transitions
- Particle animations
- Starfield backgrounds

## 📁 Project Structure

```
src/
├── components/           # Reusable components
│   ├── ui/              # Base UI components
│   ├── layout/          # Layout components
│   ├── charts/          # Chart components
│   ├── forms/           # Form components
│   └── common/          # Shared components
├── features/            # Feature-based modules
│   ├── auth/           # Authentication
│   ├── dashboard/      # Dashboard
│   ├── clients/        # Client management
│   ├── charts/         # Chart calculation
│   └── settings/       # Settings
├── lib/                # Utilities & helpers
│   ├── api/           # API client
│   ├── hooks/         # Custom hooks
│   ├── utils/         # Utility functions
│   └── validators/    # Validation schemas
├── store/             # State management
├── types/             # TypeScript types
├── styles/            # Global styles
└── assets/            # Static assets
```

## 🔧 Technology Stack

### Core
- React 18.2
- TypeScript 5.3
- Vite 5.0

### Styling
- Tailwind CSS 3.4
- Framer Motion 11
- Radix UI
- Lucide React (icons)

### State & Data
- Zustand (state management)
- TanStack Query (server state)
- TanStack Router (routing)
- Zod (validation)
- Axios (HTTP client)

### Charts
- D3.js (data visualization)
- Canvas API (chart rendering)

## 🌐 Environment Variables

Create a `.env` file based on `.env.example`:

```env
VITE_API_URL=http://localhost:8000
VITE_APP_NAME=The Program
VITE_ENABLE_ANALYTICS=false
```

## 🐳 Docker Support

```bash
# Build production image
docker build -t theprogram-frontend .

# Run container
docker run -p 3000:80 theprogram-frontend
```

## 📱 Responsive Breakpoints

- `sm`: 640px (Mobile landscape)
- `md`: 768px (Tablet)
- `lg`: 1024px (Desktop)
- `xl`: 1280px (Large desktop)
- `2xl`: 1536px (Extra large)

## ♿ Accessibility

- Semantic HTML
- ARIA labels and roles
- Keyboard navigation
- Focus management
- Screen reader support
- WCAG 2.1 Level AA compliant

## 🧪 Testing

```bash
# Run tests (when implemented)
npm test

# Run tests with coverage
npm run test:coverage
```

## 📝 Code Quality

### ESLint

```bash
npm run lint
```

### Prettier

```bash
npm run format
```

### TypeScript

```bash
npm run type-check
```

## 🚢 Deployment

### Build for Production

```bash
npm run build
```

The build output will be in the `dist/` directory.

### Preview Production Build

```bash
npm run preview
```

## 🎯 Development Guidelines

### Component Structure

```tsx
import { FC } from 'react'
import { motion } from 'framer-motion'

interface MyComponentProps {
  title: string
  description?: string
}

export const MyComponent: FC<MyComponentProps> = ({ title, description }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="glass rounded-lg p-6"
    >
      <h2 className="font-heading text-2xl">{title}</h2>
      {description && <p className="text-gray-400">{description}</p>}
    </motion.div>
  )
}
```

### Custom Hooks

```tsx
import { useState, useEffect } from 'react'

export function useCustomHook() {
  const [state, setState] = useState()

  useEffect(() => {
    // Effect logic
  }, [])

  return { state, setState }
}
```

### API Integration

```tsx
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export function useCharts() {
  return useQuery({
    queryKey: ['charts'],
    queryFn: api.charts.list,
  })
}
```

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
npm run dev -- --port 3001
```

### Module Not Found

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Build Errors

```bash
# Clear Vite cache
rm -rf node_modules/.vite
npm run dev
```

## 📚 Resources

- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Framer Motion](https://www.framer.com/motion/)
- [TypeScript](https://www.typescriptlang.org/)

## 📄 License

Part of The Program project.

---

**Built with** ❤️ **and** ✨ **cosmic energy**
