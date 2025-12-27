import { Html } from '@react-three/drei'
import { AstroSymbol } from '../AstroSymbol'

export interface BodyLabelProps {
  name: string
  radius: number
  isRetrograde?: boolean
  position?: [number, number, number]
}

export const BodyLabel: React.FC<BodyLabelProps> = ({
  name,
  radius,
  isRetrograde = false,
  position,
}) => {
  // Compact label positioning - closer to the body
  const labelPosition: [number, number, number] = position || [0, radius * 4, 0]

  return (
    <Html
      position={labelPosition}
      center
      style={{
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          whiteSpace: 'nowrap',
          padding: '3px 6px',
          border: '1px solid rgba(74, 29, 111, 0.6)',
          borderRadius: '4px',
          backgroundColor: 'rgba(20, 10, 30, 0.75)',
          opacity: 0.9,
        }}
      >
        <AstroSymbol
          planet={name.toLowerCase()}
          size={14}
          color={isRetrograde ? '#FF6B6B' : 'rgba(255, 255, 255, 0.9)'}
        />
        <span
          style={{
            color: isRetrograde ? '#FF6B6B' : 'rgba(255, 255, 255, 0.9)',
            fontSize: '12px',
            fontWeight: '500',
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.8)',
            letterSpacing: '0.3px',
          }}
        >
          {name}{isRetrograde ? ' ℞' : ''}
        </span>
      </div>
    </Html>
  )
}
