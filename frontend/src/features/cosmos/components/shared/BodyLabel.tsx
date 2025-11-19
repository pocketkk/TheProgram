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
  const labelPosition: [number, number, number] = position || [0, radius * 7, 0]

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
          gap: '8px',
          whiteSpace: 'nowrap',
          padding: '6px 12px',
          border: '2px solid #4a1d6f',
          borderRadius: '8px',
          backgroundColor: 'rgba(20, 10, 30, 0.8)',
        }}
      >
        <AstroSymbol
          planet={name.toLowerCase()}
          size={28}
          color={isRetrograde ? '#FF6B6B' : 'white'}
        />
        <span
          style={{
            color: isRetrograde ? '#FF6B6B' : 'white',
            fontSize: '26px',
            fontWeight: '600',
            textShadow: '0 0 8px rgba(0, 0, 0, 0.9), 0 2px 4px rgba(0, 0, 0, 0.9)',
            letterSpacing: '0.5px',
          }}
        >
          {name}{isRetrograde ? ' ℞' : ''}
        </span>
      </div>
    </Html>
  )
}
