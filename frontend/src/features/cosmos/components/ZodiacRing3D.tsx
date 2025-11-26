import { useMemo, useRef } from 'react'
import { Text } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { ZODIAC_SIGNS } from '@/lib/astronomy/planetaryData'
import { CONSTELLATION_PATTERNS } from '@/lib/astronomy/constellations'
import { HUMAN_DESIGN_GATES } from '@/lib/astronomy/humanDesignGates'

interface ZodiacRing3DProps {
  zodiacBrightness?: number
  zodiacGlowRadius?: number
  stadiumOpacity?: number
  rotationOffset?: number // Rotation in radians to align with reference frame
  showBackground?: boolean // Toggle for zodiac background color bands
}

// Camera-aware text that flips to stay readable when viewed from different angles
function _UprightText({
  position,
  radialAngle,
  ...textProps
}: {
  position: [number, number, number]
  radialAngle: number
} & React.ComponentProps<typeof Text>) {
  const textRef = useRef<any>()
  const { camera } = useThree()

  useFrame(() => {
    if (!textRef.current) return

    // Get camera position in XZ plane
    const cameraDir = new THREE.Vector2(camera.position.x, camera.position.z).normalize()

    // Get text position direction from center
    const textDir = new THREE.Vector2(position[0], position[2]).normalize()

    // Calculate dot product to see if camera is on the "same side" as this text
    const dot = cameraDir.dot(textDir)

    // If camera is on the same side (dot > 0), flip the text 180° to make it readable
    const flipOffset = dot > 0 ? Math.PI : 0

    // Keep the original radial rotation, but flip if needed
    textRef.current.rotation.set(
      0, // Keep flat on ground
      -radialAngle - Math.PI / 2 + flipOffset, // Radial orientation + flip if upside down
      0
    )
  })

  return <Text ref={textRef} position={position} {...textProps} />
}

export const ZodiacRing3D = ({
  zodiacBrightness = 1.0,
  zodiacGlowRadius = 1.0,
  stadiumOpacity: _stadiumOpacity = 0.5,
  rotationOffset = 0,
  showBackground = true
}: ZodiacRing3DProps) => {
  const maxRadius = 14 // Maximum radius at center (y=0)
  const minRadius = 12 // Minimum radius at top/bottom
  const cylinderHeight = 6 // Height of the ethereal cylinder/basket

  // Mathematical foundation: Curve function for bowl shape
  const _getRadiusAtHeight = (y: number): number => {
    const normalizedY = (2 * y) / cylinderHeight // -1 to 1
    const factor = 1 - normalizedY * normalizedY // Parabolic curve
    return minRadius + (maxRadius - minRadius) * factor
  }

  // Helper function: Generate curved beam points
  const _getCurvedBeamPoints = (angle: number, segments: number = 10): Float32Array => {
    const points: number[] = []
    for (let i = 0; i <= segments; i++) {
      const y = -cylinderHeight / 2 + (cylinderHeight * i / segments)
      const radius = _getRadiusAtHeight(y)
      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      points.push(x, y, z)
    }
    return new Float32Array(points)
  }

  // Constellation patterns painted on interior wall (traditional star patterns)
  const constellationPatterns = useMemo(() => {
    return ZODIAC_SIGNS.map((sign) => {
      const baseAngle = (sign.startDegree * Math.PI) / 180
      const centerAngle = baseAngle + (15 * Math.PI) / 180 // Center of 30° segment

      // Get the fixed constellation pattern for this sign
      const pattern = CONSTELLATION_PATTERNS[sign.name]
      if (!pattern) {
        console.warn(`No constellation pattern found for ${sign.name}`)
        return { sign, stars: [], lines: [], centerAngle }
      }

      // Transform normalized constellation coordinates to be painted on interior wall surface
      const stars: THREE.Vector3[] = pattern.stars.map((star) => {
        // Scale constellation to fit zodiac segment
        const spreadFactor = 2.2

        // Map x to angular position, y to vertical position on wall
        const localAngle = star.x * spreadFactor * 0.15 // Angular spread within 30° segment
        const localHeight = star.y * spreadFactor * 0.8 // Vertical position

        // Project onto cylindrical interior wall at fixed radius
        const wallRadius = 15.3
        const angle = centerAngle + localAngle
        const x = Math.cos(angle) * wallRadius
        const z = Math.sin(angle) * wallRadius
        const y = localHeight * (cylinderHeight * 0.4) // Height on wall

        return new THREE.Vector3(x, y, z)
      })

      // Create lines based on constellation connections
      const lines: [THREE.Vector3, THREE.Vector3][] = pattern.connections.map(
        ([startIdx, endIdx]) => [stars[startIdx], stars[endIdx]]
      )

      return {
        sign,
        stars,
        lines,
        centerAngle,
      }
    })
  }, [])

  // Create solid bowl exterior geometry
  const _bowlSegments = 64
  const _heightSegments = 32

  return (
    <group rotation-y={rotationOffset}>
      {/* Mystic bottom disc to block background stars */}
      <mesh rotation-x={Math.PI / 2} position={[0, -cylinderHeight / 2, 0]}>
        <circleGeometry args={[16, 64]} />
        <meshStandardMaterial
          color="#0a0a1a"
          transparent
          opacity={0.98}
          emissive="#1a1a3e"
          emissiveIntensity={0.4}
          roughness={0.7}
          metalness={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Central glow disc - multi-layered anchor point */}
      <group position={[0, -cylinderHeight / 2 + 0.02, 0]} rotation-x={Math.PI / 2}>
        {/* Innermost bright core */}
        <mesh>
          <circleGeometry args={[0.3, 32]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.5}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {/* Inner glow layer */}
        <mesh>
          <circleGeometry args={[0.6, 32]} />
          <meshBasicMaterial
            color="#8888ff"
            transparent
            opacity={0.2}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {/* Middle glow layer */}
        <mesh>
          <circleGeometry args={[1.0, 32]} />
          <meshBasicMaterial
            color="#6666dd"
            transparent
            opacity={0.12}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {/* Outer soft halo */}
        <mesh>
          <circleGeometry args={[1.6, 32]} />
          <meshBasicMaterial
            color="#4444aa"
            transparent
            opacity={0.06}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>

      {/* Subtle border ring around base plate for definition */}
      <mesh rotation-x={Math.PI / 2} position={[0, -cylinderHeight / 2 + 0.01, 0]}>
        <ringGeometry args={[15.85, 16, 64]} />
        <meshStandardMaterial
          color="#2a2a4e"
          transparent
          opacity={0.6}
          emissive="#3a3a6e"
          emissiveIntensity={0.4}
          roughness={0.6}
          metalness={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Subtle background bands for each zodiac sign - outer ring */}
      {showBackground && ZODIAC_SIGNS.map((sign, index) => {
        const startAngle = (sign.startDegree * Math.PI) / 180
        const endAngle = ((sign.startDegree + 30) * Math.PI) / 180 // Each zodiac is 30 degrees
        const bottomY = -cylinderHeight / 2 + 0.005 // Just above base disc

        return (
          <mesh
            key={`zodiac-band-outer-${index}`}
            rotation-x={Math.PI / 2}
            position={[0, bottomY, 0]}
          >
            <ringGeometry
              args={[
                5.45,   // Inner radius (updated to match degree ring)
                16,     // Outer radius (edge of base)
                64,     // Theta segments
                1,      // Phi segments
                startAngle,  // Start angle
                endAngle - startAngle  // Arc length
              ]}
            />
            <meshBasicMaterial
              color={sign.color}
              transparent
              opacity={0.08}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        )
      })}

      {/* Subtle background bands for each zodiac sign - inner ring */}
      {showBackground && ZODIAC_SIGNS.map((sign, index) => {
        const startAngle = (sign.startDegree * Math.PI) / 180
        const endAngle = ((sign.startDegree + 30) * Math.PI) / 180 // Each zodiac is 30 degrees
        const bottomY = -cylinderHeight / 2 + 0.006 // Slightly above outer bands

        return (
          <mesh
            key={`zodiac-band-inner-${index}`}
            rotation-x={Math.PI / 2}
            position={[0, bottomY, 0]}
          >
            <ringGeometry
              args={[
                1.8,    // Inner radius (center clearing)
                5.45,   // Outer radius (updated to match degree ring)
                64,     // Theta segments
                1,      // Phi segments
                startAngle,  // Start angle
                endAngle - startAngle  // Arc length
              ]}
            />
            <meshBasicMaterial
              color={sign.color}
              transparent
              opacity={0.12}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        )
      })}

      {/* Cylindrical wall backdrop - extends slightly above zodiac ring */}
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[16, 16, cylinderHeight + 1.5, 64, 1, true]} />
        <meshStandardMaterial
          color="#0a0a1a"
          transparent
          opacity={0.95}
          emissive="#1a1a3e"
          emissiveIntensity={0.4}
          roughness={0.7}
          metalness={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* GLOWING ZODIAC RING AT TOP OF WALL - Single continuous gradient */}
      {(() => {
        const topY = (cylinderHeight + 1.5) / 2 // Top edge of the wall
        const plateRadius = 16 // Match the wall radius

        // Create gradient shader for zodiac colors
        const gradientShader = {
          vertexShader: `
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            uniform float brightness;
            varying vec2 vUv;

            vec3 zodiacColors[12];

            void main() {
              // Initialize zodiac colors
              zodiacColors[0] = vec3(1.0, 0.42, 0.42);  // Aries - red
              zodiacColors[1] = vec3(0.545, 0.765, 0.290);  // Taurus - green
              zodiacColors[2] = vec3(1.0, 0.851, 0.239);  // Gemini - yellow
              zodiacColors[3] = vec3(0.788, 0.678, 0.655);  // Cancer - gray
              zodiacColors[4] = vec3(1.0, 0.647, 0.0);  // Leo - orange
              zodiacColors[5] = vec3(0.596, 0.847, 0.784);  // Virgo - teal
              zodiacColors[6] = vec3(1.0, 0.714, 0.851);  // Libra - pink
              zodiacColors[7] = vec3(0.545, 0.0, 0.0);  // Scorpio - dark red
              zodiacColors[8] = vec3(0.576, 0.439, 0.859);  // Sagittarius - purple
              zodiacColors[9] = vec3(0.373, 0.620, 0.627);  // Capricorn - blue-green
              zodiacColors[10] = vec3(0.0, 0.808, 0.820);  // Aquarius - cyan
              zodiacColors[11] = vec3(0.867, 0.627, 0.867);  // Pisces - violet

              // Calculate angle from UV coordinates (0-1 maps to 0-360°)
              float angle = vUv.x * 12.0;  // 0-12 for 12 zodiac signs

              // Get the two colors to blend between
              int index1 = int(floor(angle));
              int index2 = int(mod(float(index1 + 1), 12.0));

              // Blend factor
              float blend = fract(angle);

              // Interpolate between colors
              vec3 color = mix(zodiacColors[index1], zodiacColors[index2], blend);

              gl_FragColor = vec4(color * brightness, 0.9 * brightness);
            }
          `,
          uniforms: {
            brightness: { value: zodiacBrightness }
          }
        }

        return (
          <group>
            {/* Inner bright ring */}
            <mesh position={[0, topY, 0]} rotation-x={Math.PI / 2}>
              <torusGeometry args={[plateRadius, 0.15 * zodiacGlowRadius, 32, 128]} />
              <shaderMaterial
                vertexShader={gradientShader.vertexShader}
                fragmentShader={gradientShader.fragmentShader}
                uniforms={gradientShader.uniforms}
                transparent={true}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>

            {/* Outer glow ring */}
            <mesh position={[0, topY, 0]} rotation-x={Math.PI / 2}>
              <torusGeometry args={[plateRadius, 0.25 * zodiacGlowRadius, 32, 128]} />
              <shaderMaterial
                vertexShader={gradientShader.vertexShader}
                fragmentShader={gradientShader.fragmentShader}
                uniforms={{
                  brightness: { value: zodiacBrightness * 0.5 }
                }}
                transparent={true}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
          </group>
        )
      })()}

      {/* Degree markers around the cosmic ring at top */}
      {(() => {
        const topY = (cylinderHeight + 1.5) / 2
        const ringRadius = 16.4 // Moved outward for padding
        const degreeMarkers = []

        // Add markers every 10 degrees
        for (let degree = 0; degree < 360; degree += 10) {
          const angle = (degree * Math.PI) / 180
          const x = Math.cos(angle) * ringRadius
          const z = Math.sin(angle) * ringRadius

          // Find which zodiac sign this degree is in
          const zodiacIndex = Math.floor(degree / 30)
          const zodiacColor = ZODIAC_SIGNS[zodiacIndex].color

          // Major zodiac boundaries (every 30°) are larger and bolder
          const isMajor = degree % 30 === 0
          const fontSize = isMajor ? 0.35 : 0.25
          const outlineWidth = isMajor ? 0.025 : 0.015

          degreeMarkers.push(
            <Text
              key={`degree-top-${degree}`}
              position={[x, topY, z]}
              rotation={[-Math.PI / 2, 0, -angle - Math.PI / 2]}
              fontSize={fontSize}
              color={zodiacColor}
              anchorX="center"
              anchorY="middle"
              outlineWidth={outlineWidth}
              outlineColor="#000000"
            >
              {degree}°
            </Text>
          )
        }

        return <group>{degreeMarkers}</group>
      })()}

      {/* Border ring between degrees and HD gates - top */}
      {(() => {
        const topY = (cylinderHeight + 1.5) / 2
        const borderRadius = 16.075 // Centered between degree ring (16.4) and HD gates (15.75)

        const borderGradientShader = {
          vertexShader: `
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            varying vec2 vUv;
            uniform float brightness;

            vec3 zodiacColors[12];

            void main() {
              // Initialize zodiac colors
              zodiacColors[0] = vec3(1.0, 0.42, 0.42);  // Aries
              zodiacColors[1] = vec3(0.545, 0.765, 0.290);  // Taurus
              zodiacColors[2] = vec3(1.0, 0.851, 0.239);  // Gemini
              zodiacColors[3] = vec3(0.788, 0.678, 0.655);  // Cancer
              zodiacColors[4] = vec3(1.0, 0.647, 0.0);  // Leo
              zodiacColors[5] = vec3(0.596, 0.847, 0.784);  // Virgo
              zodiacColors[6] = vec3(1.0, 0.714, 0.851);  // Libra
              zodiacColors[7] = vec3(0.545, 0.0, 0.0);  // Scorpio
              zodiacColors[8] = vec3(0.576, 0.439, 0.859);  // Sagittarius
              zodiacColors[9] = vec3(0.373, 0.620, 0.627);  // Capricorn
              zodiacColors[10] = vec3(0.0, 0.808, 0.820);  // Aquarius
              zodiacColors[11] = vec3(0.867, 0.627, 0.867);  // Pisces

              // Calculate angle from UV coordinates (0-1 maps to 0-360°)
              float angle = vUv.x * 12.0;  // 0-12 for 12 zodiac signs

              // Get the two colors to blend between
              int index1 = int(floor(angle));
              int index2 = int(mod(float(index1 + 1), 12.0));

              // Blend factor
              float blend = fract(angle);

              // Interpolate between colors
              vec3 color = mix(zodiacColors[index1], zodiacColors[index2], blend);

              gl_FragColor = vec4(color * brightness, 0.6);
            }
          `,
          uniforms: {
            brightness: { value: 1.2 }
          }
        }

        return (
          <group>
            {/* Core border ring */}
            <mesh position={[0, topY, 0]} rotation-x={Math.PI / 2}>
              <torusGeometry args={[borderRadius, 0.06, 16, 128]} />
              <shaderMaterial
                vertexShader={borderGradientShader.vertexShader}
                fragmentShader={borderGradientShader.fragmentShader}
                uniforms={borderGradientShader.uniforms}
                transparent={true}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>

            {/* Subtle glow halo */}
            <mesh position={[0, topY, 0]} rotation-x={Math.PI / 2}>
              <torusGeometry args={[borderRadius, 0.12, 16, 128]} />
              <shaderMaterial
                vertexShader={borderGradientShader.vertexShader}
                fragmentShader={borderGradientShader.fragmentShader}
                uniforms={{
                  brightness: { value: 0.6 }
                }}
                transparent={true}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
          </group>
        )
      })()}

      {/* Human Design Gates ring - inside vertical wall */}
      {(() => {
        const topY = (cylinderHeight + 1.5) / 2
        const wallRadius = 15.75 // Pushed inward for padding
        const labelHeight = topY - 0.6 // Lower on the wall for visibility
        const gateElements: JSX.Element[] = []

        // Add tick marks and labels for each gate
        HUMAN_DESIGN_GATES.forEach((gate, index) => {
          // Calculate center position of gate
          const centerDegree = (gate.startDegree + gate.endDegree) / 2
          const angle = (centerDegree * Math.PI) / 180

          // Find which zodiac sign this gate is in
          const zodiacIndex = Math.floor(centerDegree / 30)
          const zodiacColor = ZODIAC_SIGNS[zodiacIndex].color

          // Major tick mark extending downward from top rim (for gate)
          const xTop = Math.cos(angle) * 15.5
          const zTop = Math.sin(angle) * 15.5
          const tickStartY = topY
          const tickEndY = topY - 0.35 // Shortened to add padding before gate numbers

          gateElements.push(
            <line key={`gate-tick-${index}`}>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  args={[
                    new Float32Array([
                      xTop, tickStartY, zTop,  // Top point at rim
                      xTop, tickEndY, zTop     // Bottom point (extends downward)
                    ]),
                    3
                  ]}
                />
              </bufferGeometry>
              <lineBasicMaterial
                color={zodiacColor}
                transparent
                opacity={0.7}
                linewidth={2}
              />
            </line>
          )

          // Add 5 minor tick marks for the 6 lines within each gate
          // Each gate is 5.625 degrees, divided into 6 lines = 0.9375 degrees per line
          for (let line = 1; line < 6; line++) {
            const lineDegree = gate.startDegree + (line * 0.9375)
            const lineAngle = (lineDegree * Math.PI) / 180
            const xLine = Math.cos(lineAngle) * 15.5
            const zLine = Math.sin(lineAngle) * 15.5
            const lineTickEndY = topY - 0.18 // Shorter tick for lines with padding

            gateElements.push(
              <line key={`gate-line-tick-${index}-${line}`}>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    args={[
                      new Float32Array([
                        xLine, tickStartY, zLine,      // Top point at rim
                        xLine, lineTickEndY, zLine     // Bottom point (shorter)
                      ]),
                      3
                    ]}
                  />
                </bufferGeometry>
                <lineBasicMaterial
                  color={zodiacColor}
                  transparent
                  opacity={0.3}
                  linewidth={1}
                />
              </line>
            )
          }

          // Gate number label on inside vertical wall
          const xWall = Math.cos(angle) * wallRadius
          const zWall = Math.sin(angle) * wallRadius

          gateElements.push(
            <Text
              key={`gate-label-${index}`}
              position={[xWall, labelHeight, zWall]}
              rotation={[0, -angle - Math.PI / 2, 0]} // Face inward toward center
              fontSize={0.32}
              color="white"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.025}
              outlineColor={zodiacColor}
            >
              {gate.number}
            </Text>
          )

          // Gate name label - positioned between this gate and the next gate
          const nextGate = HUMAN_DESIGN_GATES[(index + 1) % HUMAN_DESIGN_GATES.length]
          const nextCenterDegree = (nextGate.startDegree + nextGate.endDegree) / 2
          // Calculate midpoint between current and next gate
          let midpointDegree = (centerDegree + nextCenterDegree) / 2
          // Handle wraparound at 360/0 degrees
          if (nextCenterDegree < centerDegree) {
            midpointDegree = ((centerDegree + nextCenterDegree + 360) / 2) % 360
          }
          const nameAngle = (midpointDegree * Math.PI) / 180
          const xNameWall = Math.cos(nameAngle) * wallRadius
          const zNameWall = Math.sin(nameAngle) * wallRadius

          gateElements.push(
            <Text
              key={`gate-name-${index}`}
              position={[xNameWall, labelHeight, zNameWall]}
              rotation={[0, -nameAngle - Math.PI / 2, 0]} // Face inward toward center
              fontSize={0.16}
              color="white"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.012}
              outlineColor={zodiacColor}
              fillOpacity={0.95}
            >
              {gate.name}
            </Text>
          )
        })

        return <group>{gateElements}</group>
      })()}

      {/* Border ring below vertical HD gates ring */}
      {(() => {
        const ringY = (cylinderHeight + 1.5) / 2 - 0.85 // Below the gate labels
        const borderRadius = 15.75 // Match HD gates wall position

        const borderGradientShader = {
          vertexShader: `
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            varying vec2 vUv;
            uniform float brightness;

            vec3 zodiacColors[12];

            void main() {
              // Initialize zodiac colors
              zodiacColors[0] = vec3(1.0, 0.42, 0.42);  // Aries
              zodiacColors[1] = vec3(0.545, 0.765, 0.290);  // Taurus
              zodiacColors[2] = vec3(1.0, 0.851, 0.239);  // Gemini
              zodiacColors[3] = vec3(0.788, 0.678, 0.655);  // Cancer
              zodiacColors[4] = vec3(1.0, 0.647, 0.0);  // Leo
              zodiacColors[5] = vec3(0.596, 0.847, 0.784);  // Virgo
              zodiacColors[6] = vec3(1.0, 0.714, 0.851);  // Libra
              zodiacColors[7] = vec3(0.545, 0.0, 0.0);  // Scorpio
              zodiacColors[8] = vec3(0.576, 0.439, 0.859);  // Sagittarius
              zodiacColors[9] = vec3(0.373, 0.620, 0.627);  // Capricorn
              zodiacColors[10] = vec3(0.0, 0.808, 0.820);  // Aquarius
              zodiacColors[11] = vec3(0.867, 0.627, 0.867);  // Pisces

              // Calculate angle from UV coordinates (0-1 maps to 0-360°)
              float angle = vUv.x * 12.0;  // 0-12 for 12 zodiac signs

              // Get the two colors to blend between
              int index1 = int(floor(angle));
              int index2 = int(mod(float(index1 + 1), 12.0));

              // Blend factor
              float blend = fract(angle);

              // Interpolate between colors
              vec3 color = mix(zodiacColors[index1], zodiacColors[index2], blend);

              gl_FragColor = vec4(color * brightness, 0.6);
            }
          `,
          uniforms: {
            brightness: { value: 1.2 }
          }
        }

        return (
          <group>
            {/* Core border ring */}
            <mesh position={[0, ringY, 0]} rotation-x={Math.PI / 2}>
              <torusGeometry args={[borderRadius, 0.015, 16, 128]} />
              <shaderMaterial
                vertexShader={borderGradientShader.vertexShader}
                fragmentShader={borderGradientShader.fragmentShader}
                uniforms={borderGradientShader.uniforms}
                transparent={true}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>

            {/* Subtle glow halo */}
            <mesh position={[0, ringY, 0]} rotation-x={Math.PI / 2}>
              <torusGeometry args={[borderRadius, 0.03, 16, 128]} />
              <shaderMaterial
                vertexShader={borderGradientShader.vertexShader}
                fragmentShader={borderGradientShader.fragmentShader}
                uniforms={{
                  brightness: { value: 0.6 }
                }}
                transparent={true}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
          </group>
        )
      })()}

      {/* Human Design Gates ring - base of bowl */}
      {(() => {
        const bottomY = -cylinderHeight / 2 + 0.02
        const baseRadius = 15.15 // Pushed inward for padding
        const gateElements: JSX.Element[] = []

        // Add tick marks and labels for each gate
        HUMAN_DESIGN_GATES.forEach((gate, index) => {
          // Calculate center position of gate
          const centerDegree = (gate.startDegree + gate.endDegree) / 2
          const angle = (centerDegree * Math.PI) / 180

          // Find which zodiac sign this gate is in
          const zodiacIndex = Math.floor(centerDegree / 30)
          const zodiacColor = ZODIAC_SIGNS[zodiacIndex].color

          // Major tick mark extending radially outward on base plate (for gate)
          const tickLength = 0.35
          const xBaseInner = Math.cos(angle) * (baseRadius - tickLength)
          const zBaseInner = Math.sin(angle) * (baseRadius - tickLength)
          const xBaseOuter = Math.cos(angle) * baseRadius
          const zBaseOuter = Math.sin(angle) * baseRadius

          gateElements.push(
            <line key={`gate-tick-base-${index}`}>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  args={[
                    new Float32Array([
                      xBaseInner, bottomY, zBaseInner,  // Inner point (closer to center)
                      xBaseOuter, bottomY, zBaseOuter   // Outer point (extends radially outward)
                    ]),
                    3
                  ]}
                />
              </bufferGeometry>
              <lineBasicMaterial
                color={zodiacColor}
                transparent
                opacity={0.7}
                linewidth={2}
              />
            </line>
          )

          // Add 5 minor tick marks for the 6 lines within each gate
          for (let line = 1; line < 6; line++) {
            const lineDegree = gate.startDegree + (line * 0.9375)
            const lineAngle = (lineDegree * Math.PI) / 180
            const lineTickLength = 0.18
            const xLineInner = Math.cos(lineAngle) * (baseRadius - lineTickLength)
            const zLineInner = Math.sin(lineAngle) * (baseRadius - lineTickLength)
            const xLineOuter = Math.cos(lineAngle) * baseRadius
            const zLineOuter = Math.sin(lineAngle) * baseRadius

            gateElements.push(
              <line key={`gate-line-tick-base-${index}-${line}`}>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    args={[
                      new Float32Array([
                        xLineInner, bottomY, zLineInner,  // Inner point (closer to center)
                        xLineOuter, bottomY, zLineOuter   // Outer point (extends radially outward)
                      ]),
                      3
                    ]}
                  />
                </bufferGeometry>
                <lineBasicMaterial
                  color={zodiacColor}
                  transparent
                  opacity={0.3}
                  linewidth={1}
                />
              </line>
            )
          }

          // Gate number label on base plate - positioned at inner radius (closer to center)
          gateElements.push(
            <Text
              key={`gate-label-base-${index}`}
              position={[xBaseInner, bottomY, zBaseInner]}
              rotation={[-Math.PI / 2, 0, -angle - Math.PI / 2]} // Flat on ground, facing inward
              fontSize={0.32}
              color="white"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.025}
              outlineColor={zodiacColor}
            >
              {gate.number}
            </Text>
          )

          // Gate name label - positioned between this gate and the next gate at inner radius
          const nextGate = HUMAN_DESIGN_GATES[(index + 1) % HUMAN_DESIGN_GATES.length]
          const nextCenterDegree = (nextGate.startDegree + nextGate.endDegree) / 2
          let midpointDegree = (centerDegree + nextCenterDegree) / 2
          if (nextCenterDegree < centerDegree) {
            midpointDegree = ((centerDegree + nextCenterDegree + 360) / 2) % 360
          }
          const nameAngle = (midpointDegree * Math.PI) / 180
          const nameRadius = baseRadius - tickLength // Position at inner radius with numbers
          const xNameBase = Math.cos(nameAngle) * nameRadius
          const zNameBase = Math.sin(nameAngle) * nameRadius

          gateElements.push(
            <Text
              key={`gate-name-base-${index}`}
              position={[xNameBase, bottomY, zNameBase]}
              rotation={[-Math.PI / 2, 0, -nameAngle - Math.PI / 2]} // Flat on ground, facing inward
              fontSize={0.16}
              color="white"
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.012}
              outlineColor={zodiacColor}
              fillOpacity={0.95}
            >
              {gate.name}
            </Text>
          )
        })

        return <group>{gateElements}</group>
      })()}

      {/* Border ring between degrees and HD gates - base */}
      {(() => {
        const bottomY = -cylinderHeight / 2 + 0.02
        const borderRadius = 15.4 // Centered between degree ring (15.65) and HD gates (15.15)

        const borderGradientShader = {
          vertexShader: `
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            varying vec2 vUv;
            uniform float brightness;

            vec3 zodiacColors[12];

            void main() {
              // Initialize zodiac colors
              zodiacColors[0] = vec3(1.0, 0.42, 0.42);  // Aries
              zodiacColors[1] = vec3(0.545, 0.765, 0.290);  // Taurus
              zodiacColors[2] = vec3(1.0, 0.851, 0.239);  // Gemini
              zodiacColors[3] = vec3(0.788, 0.678, 0.655);  // Cancer
              zodiacColors[4] = vec3(1.0, 0.647, 0.0);  // Leo
              zodiacColors[5] = vec3(0.596, 0.847, 0.784);  // Virgo
              zodiacColors[6] = vec3(1.0, 0.714, 0.851);  // Libra
              zodiacColors[7] = vec3(0.545, 0.0, 0.0);  // Scorpio
              zodiacColors[8] = vec3(0.576, 0.439, 0.859);  // Sagittarius
              zodiacColors[9] = vec3(0.373, 0.620, 0.627);  // Capricorn
              zodiacColors[10] = vec3(0.0, 0.808, 0.820);  // Aquarius
              zodiacColors[11] = vec3(0.867, 0.627, 0.867);  // Pisces

              // Calculate angle from UV coordinates (0-1 maps to 0-360°)
              float angle = vUv.x * 12.0;  // 0-12 for 12 zodiac signs

              // Get the two colors to blend between
              int index1 = int(floor(angle));
              int index2 = int(mod(float(index1 + 1), 12.0));

              // Blend factor
              float blend = fract(angle);

              // Interpolate between colors
              vec3 color = mix(zodiacColors[index1], zodiacColors[index2], blend);

              gl_FragColor = vec4(color * brightness, 0.6);
            }
          `,
          uniforms: {
            brightness: { value: 1.2 }
          }
        }

        return (
          <group>
            {/* Core border ring */}
            <mesh position={[0, bottomY, 0]} rotation-x={Math.PI / 2}>
              <torusGeometry args={[borderRadius, 0.015, 16, 128]} />
              <shaderMaterial
                vertexShader={borderGradientShader.vertexShader}
                fragmentShader={borderGradientShader.fragmentShader}
                uniforms={borderGradientShader.uniforms}
                transparent={true}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>

            {/* Subtle glow halo */}
            <mesh position={[0, bottomY, 0]} rotation-x={Math.PI / 2}>
              <torusGeometry args={[borderRadius, 0.03, 16, 128]} />
              <shaderMaterial
                vertexShader={borderGradientShader.vertexShader}
                fragmentShader={borderGradientShader.fragmentShader}
                uniforms={{
                  brightness: { value: 0.6 }
                }}
                transparent={true}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
          </group>
        )
      })()}

      {/* Degree markers around the base edge - outer */}
      {(() => {
        const bottomY = -cylinderHeight / 2 + 0.02 // Slightly above base to avoid z-fighting
        const baseRadiusOuter = 16.4 // Moved outward for padding
        const degreeMarkers = []

        // Add markers every 10 degrees
        for (let degree = 0; degree < 360; degree += 10) {
          const angle = (degree * Math.PI) / 180
          const x = Math.cos(angle) * baseRadiusOuter
          const z = Math.sin(angle) * baseRadiusOuter

          // Find which zodiac sign this degree is in
          const zodiacIndex = Math.floor(degree / 30)
          const zodiacColor = ZODIAC_SIGNS[zodiacIndex].color

          // Major zodiac boundaries (every 30°) are larger and bolder
          const isMajor = degree % 30 === 0
          const fontSize = isMajor ? 0.35 : 0.25
          const outlineWidth = isMajor ? 0.025 : 0.015

          degreeMarkers.push(
            <Text
              key={`degree-bottom-outer-${degree}`}
              position={[x, bottomY, z]}
              rotation={[-Math.PI / 2, 0, -angle - Math.PI / 2]}
              fontSize={fontSize}
              color={zodiacColor}
              anchorX="center"
              anchorY="middle"
              outlineWidth={outlineWidth}
              outlineColor="#000000"
            >
              {degree}°
            </Text>
          )
        }

        return <group>{degreeMarkers}</group>
      })()}

      {/* Degree markers around the base edge - inner */}
      {(() => {
        const bottomY = -cylinderHeight / 2 + 0.02 // Slightly above base to avoid z-fighting
        const baseRadiusInner = 15.65 // Moved outward for padding
        const degreeMarkers = []

        // Add markers every 10 degrees
        for (let degree = 0; degree < 360; degree += 10) {
          const angle = (degree * Math.PI) / 180
          const x = Math.cos(angle) * baseRadiusInner
          const z = Math.sin(angle) * baseRadiusInner

          // Find which zodiac sign this degree is in
          const zodiacIndex = Math.floor(degree / 30)
          const zodiacColor = ZODIAC_SIGNS[zodiacIndex].color

          // Major zodiac boundaries (every 30°) are larger and bolder
          const isMajor = degree % 30 === 0
          const fontSize = isMajor ? 0.35 : 0.25
          const outlineWidth = isMajor ? 0.025 : 0.015

          degreeMarkers.push(
            <Text
              key={`degree-bottom-inner-${degree}`}
              position={[x, bottomY, z]}
              rotation={[-Math.PI / 2, 0, -angle - Math.PI / 2]}
              fontSize={fontSize}
              color={zodiacColor}
              anchorX="center"
              anchorY="middle"
              outlineWidth={outlineWidth}
              outlineColor="#000000"
            >
              {degree}°
            </Text>
          )
        }

        return <group>{degreeMarkers}</group>
      })()}

      {/* Tick marks around the base edge - outer */}
      {(() => {
        const bottomY = -cylinderHeight / 2 + 0.01
        const baseRadius = 16
        const tickMarks = []

        // Add tick marks every degree
        for (let degree = 0; degree < 360; degree += 1) {
          const angle = (degree * Math.PI) / 180

          // Find which zodiac sign this degree is in
          const zodiacIndex = Math.floor(degree / 30)
          const zodiacColor = ZODIAC_SIGNS[zodiacIndex].color

          // Visual hierarchy: zodiac boundaries (30°) > major (10°) > medium (5°) > minor (1°)
          let tickLength = 0.08 // Minor tick - reduced
          let tickOpacity = 0.2 // Reduced from 0.3
          let linewidth = 1

          if (degree % 30 === 0) {
            tickLength = 0.45 // Zodiac boundary - longest and thickest
            tickOpacity = 0.7
            linewidth = 3
          } else if (degree % 10 === 0) {
            tickLength = 0.3 // Major tick
            tickOpacity = 0.5
            linewidth = 2
          } else if (degree % 5 === 0) {
            tickLength = 0.18 // Medium tick
            tickOpacity = 0.35
            linewidth = 1
          }

          const innerX = Math.cos(angle) * baseRadius
          const innerZ = Math.sin(angle) * baseRadius
          const outerX = Math.cos(angle) * (baseRadius + tickLength)
          const outerZ = Math.sin(angle) * (baseRadius + tickLength)

          tickMarks.push(
            <line key={`tick-outer-${degree}`}>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  args={[
                    new Float32Array([
                      innerX, bottomY, innerZ,  // Inner point
                      outerX, bottomY, outerZ   // Outer point (tick extends outward)
                    ]),
                    3
                  ]}
                />
              </bufferGeometry>
              <lineBasicMaterial
                color={zodiacColor}
                transparent
                opacity={tickOpacity}
                linewidth={linewidth}
              />
            </line>
          )
        }

        return <group>{tickMarks}</group>
      })()}

      {/* Tick marks around the base edge - inner */}
      {(() => {
        const bottomY = -cylinderHeight / 2 + 0.01
        const baseRadius = 15.65 // Moved outward for padding
        const tickMarks = []

        // Add tick marks every degree
        for (let degree = 0; degree < 360; degree += 1) {
          const angle = (degree * Math.PI) / 180

          // Find which zodiac sign this degree is in
          const zodiacIndex = Math.floor(degree / 30)
          const zodiacColor = ZODIAC_SIGNS[zodiacIndex].color

          // Visual hierarchy: zodiac boundaries (30°) > major (10°) > medium (5°) > minor (1°)
          let tickLength = 0.08 // Minor tick - reduced
          let tickOpacity = 0.2 // Reduced from 0.3
          let linewidth = 1

          if (degree % 30 === 0) {
            tickLength = 0.45 // Zodiac boundary - longest and thickest
            tickOpacity = 0.7
            linewidth = 3
          } else if (degree % 10 === 0) {
            tickLength = 0.3 // Major tick
            tickOpacity = 0.5
            linewidth = 2
          } else if (degree % 5 === 0) {
            tickLength = 0.18 // Medium tick
            tickOpacity = 0.35
            linewidth = 1
          }

          const outerX = Math.cos(angle) * baseRadius
          const outerZ = Math.sin(angle) * baseRadius
          const innerX = Math.cos(angle) * (baseRadius - tickLength)
          const innerZ = Math.sin(angle) * (baseRadius - tickLength)

          tickMarks.push(
            <line key={`tick-inner-${degree}`}>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  args={[
                    new Float32Array([
                      outerX, bottomY, outerZ,  // Outer point (on the circle)
                      innerX, bottomY, innerZ   // Inner point (tick extends inward)
                    ]),
                    3
                  ]}
                />
              </bufferGeometry>
              <lineBasicMaterial
                color={zodiacColor}
                transparent
                opacity={tickOpacity}
                linewidth={linewidth}
              />
            </line>
          )
        }

        return <group>{tickMarks}</group>
      })()}

      {/* Vertical lines connecting base to cosmic ring at degree points - inner and outer */}
      {(() => {
        const topY = (cylinderHeight + 1.5) / 2
        const bottomY = -cylinderHeight / 2
        const outerRadius = 16 // Outer wall radius
        const innerRadius = 15.8 // Inner wall radius (slightly inside for visibility)
        const verticalLines = []

        // Add vertical lines every 30 degrees (at zodiac boundaries)
        for (let degree = 0; degree < 360; degree += 30) {
          const angle = (degree * Math.PI) / 180

          // Find which zodiac sign this degree is in
          const zodiacIndex = Math.floor(degree / 30)
          const zodiacColor = ZODIAC_SIGNS[zodiacIndex].color

          // Outer lines (visible from outside)
          const xOuter = Math.cos(angle) * outerRadius
          const zOuter = Math.sin(angle) * outerRadius

          verticalLines.push(
            <group key={`vertical-outer-group-${degree}`}>
              {/* Main vertical line */}
              <line>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    args={[
                      new Float32Array([
                        xOuter, bottomY, zOuter,  // Bottom point
                        xOuter, topY, zOuter      // Top point
                      ]),
                      3
                    ]}
                  />
                </bufferGeometry>
                <lineBasicMaterial
                  color={zodiacColor}
                  transparent
                  opacity={0.5}
                  linewidth={2}
                  depthTest={true}
                />
              </line>

              {/* Subtle glow */}
              <line>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    args={[
                      new Float32Array([
                        xOuter, bottomY, zOuter,  // Bottom point
                        xOuter, topY, zOuter      // Top point
                      ]),
                      3
                    ]}
                  />
                </bufferGeometry>
                <lineBasicMaterial
                  color={zodiacColor}
                  transparent
                  opacity={0.1}
                  linewidth={4}
                  blending={THREE.AdditiveBlending}
                  depthTest={true}
                />
              </line>
            </group>
          )

          // Inner lines (visible from inside)
          const xInner = Math.cos(angle) * innerRadius
          const zInner = Math.sin(angle) * innerRadius

          verticalLines.push(
            <group key={`vertical-inner-group-${degree}`}>
              {/* Main vertical line */}
              <line>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    args={[
                      new Float32Array([
                        xInner, bottomY, zInner,  // Bottom point
                        xInner, topY, zInner      // Top point
                      ]),
                      3
                    ]}
                  />
                </bufferGeometry>
                <lineBasicMaterial
                  color={zodiacColor}
                  transparent
                  opacity={0.5}
                  linewidth={2}
                  depthTest={true}
                />
              </line>

              {/* Subtle glow */}
              <line>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    args={[
                      new Float32Array([
                        xInner, bottomY, zInner,  // Bottom point
                        xInner, topY, zInner      // Top point
                      ]),
                      3
                    ]}
                  />
                </bufferGeometry>
                <lineBasicMaterial
                  color={zodiacColor}
                  transparent
                  opacity={0.1}
                  linewidth={4}
                  blending={THREE.AdditiveBlending}
                  depthTest={true}
                />
              </line>
            </group>
          )
        }

        return <group>{verticalLines}</group>
      })()}

      {/* Border ring around inner degree ring */}
      {(() => {
        const bottomY = -cylinderHeight / 2 + 0.02
        const borderRadius = 5.2 // Just inside the inner degree ring

        const borderGradientShader = {
          vertexShader: `
            varying vec2 vUv;
            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            varying vec2 vUv;
            uniform float brightness;

            vec3 zodiacColors[12];

            void main() {
              // Initialize zodiac colors
              zodiacColors[0] = vec3(1.0, 0.42, 0.42);  // Aries
              zodiacColors[1] = vec3(0.545, 0.765, 0.290);  // Taurus
              zodiacColors[2] = vec3(1.0, 0.851, 0.239);  // Gemini
              zodiacColors[3] = vec3(0.788, 0.678, 0.655);  // Cancer
              zodiacColors[4] = vec3(1.0, 0.647, 0.0);  // Leo
              zodiacColors[5] = vec3(0.596, 0.847, 0.784);  // Virgo
              zodiacColors[6] = vec3(1.0, 0.714, 0.851);  // Libra
              zodiacColors[7] = vec3(0.545, 0.0, 0.0);  // Scorpio
              zodiacColors[8] = vec3(0.576, 0.439, 0.859);  // Sagittarius
              zodiacColors[9] = vec3(0.373, 0.620, 0.627);  // Capricorn
              zodiacColors[10] = vec3(0.0, 0.808, 0.820);  // Aquarius
              zodiacColors[11] = vec3(0.867, 0.627, 0.867);  // Pisces

              // Calculate angle from UV coordinates (0-1 maps to 0-360°)
              float angle = vUv.x * 12.0;  // 0-12 for 12 zodiac signs

              // Get the two colors to blend between
              int index1 = int(floor(angle));
              int index2 = int(mod(float(index1 + 1), 12.0));

              // Blend factor
              float blend = fract(angle);

              // Interpolate between colors
              vec3 color = mix(zodiacColors[index1], zodiacColors[index2], blend);

              gl_FragColor = vec4(color * brightness, 0.6);
            }
          `,
          uniforms: {
            brightness: { value: 1.2 }
          }
        }

        return (
          <group>
            {/* Core border ring - sharper, less glow */}
            <mesh position={[0, bottomY, 0]} rotation-x={Math.PI / 2}>
              <torusGeometry args={[borderRadius, 0.025, 16, 128]} />
              <shaderMaterial
                vertexShader={borderGradientShader.vertexShader}
                fragmentShader={borderGradientShader.fragmentShader}
                uniforms={borderGradientShader.uniforms}
                transparent={true}
              />
            </mesh>

            {/* Very subtle glow halo - reduced */}
            <mesh position={[0, bottomY, 0]} rotation-x={Math.PI / 2}>
              <torusGeometry args={[borderRadius, 0.05, 16, 128]} />
              <shaderMaterial
                vertexShader={borderGradientShader.vertexShader}
                fragmentShader={borderGradientShader.fragmentShader}
                uniforms={{
                  brightness: { value: 0.2 }
                }}
                transparent={true}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
          </group>
        )
      })()}

      {/* Inner degree ring markers at 1/3 radius */}
      {(() => {
        const bottomY = -cylinderHeight / 2 + 0.02
        const innerRingRadius = 5.45 // Moved outward for padding
        const degreeMarkers = []

        // Add markers every 10 degrees
        for (let degree = 0; degree < 360; degree += 10) {
          const angle = (degree * Math.PI) / 180
          const x = Math.cos(angle) * innerRingRadius
          const z = Math.sin(angle) * innerRingRadius

          // Find which zodiac sign this degree is in
          const zodiacIndex = Math.floor(degree / 30)
          const zodiacColor = ZODIAC_SIGNS[zodiacIndex].color

          // Major zodiac boundaries (every 30°) are larger and bolder
          const isMajor = degree % 30 === 0
          const fontSize = isMajor ? 0.28 : 0.2
          const outlineWidth = isMajor ? 0.015 : 0.01 // Reduced for readability

          degreeMarkers.push(
            <Text
              key={`degree-inner-ring-${degree}`}
              position={[x, bottomY, z]}
              rotation={[-Math.PI / 2, 0, -angle - Math.PI / 2]}
              fontSize={fontSize}
              color="white" // Bright white core
              anchorX="center"
              anchorY="middle"
              outlineWidth={outlineWidth}
              outlineColor={zodiacColor} // Subtle colored outline
            >
              {degree}°
            </Text>
          )
        }

        return <group>{degreeMarkers}</group>
      })()}

      {/* Tick marks around the inner degree ring */}
      {(() => {
        const bottomY = -cylinderHeight / 2 + 0.01
        const ringRadius = 5.45 // Moved outward for padding
        const tickMarks = []

        // Add tick marks every degree
        for (let degree = 0; degree < 360; degree += 1) {
          const angle = (degree * Math.PI) / 180

          // Find which zodiac sign this degree is in
          const zodiacIndex = Math.floor(degree / 30)
          const zodiacColor = ZODIAC_SIGNS[zodiacIndex].color

          // Visual hierarchy: zodiac boundaries (30°) > major (10°) > medium (5°) > minor (1°)
          let tickLength = 0.06 // Minor tick - reduced
          let tickOpacity = 0.2 // Reduced from 0.3
          let linewidth = 1

          if (degree % 30 === 0) {
            tickLength = 0.35 // Zodiac boundary - longest and thickest
            tickOpacity = 0.7
            linewidth = 3
          } else if (degree % 10 === 0) {
            tickLength = 0.25 // Major tick
            tickOpacity = 0.5
            linewidth = 2
          } else if (degree % 5 === 0) {
            tickLength = 0.15 // Medium tick
            tickOpacity = 0.35
            linewidth = 1
          }

          // Ticks point inward toward center
          const outerX = Math.cos(angle) * ringRadius
          const outerZ = Math.sin(angle) * ringRadius
          const innerX = Math.cos(angle) * (ringRadius - tickLength)
          const innerZ = Math.sin(angle) * (ringRadius - tickLength)

          tickMarks.push(
            <line key={`tick-inner-ring-${degree}`}>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  args={[
                    new Float32Array([
                      outerX, bottomY, outerZ,  // Outer point (on the circle)
                      innerX, bottomY, innerZ   // Inner point (tick extends inward)
                    ]),
                    3
                  ]}
                />
              </bufferGeometry>
              <lineBasicMaterial
                color={zodiacColor}
                transparent
                opacity={tickOpacity}
                linewidth={linewidth}
              />
            </line>
          )
        }

        return <group>{tickMarks}</group>
      })()}

      {/* Human Design Gates ring - inner circle */}
      {(() => {
        const bottomY = -cylinderHeight / 2 + 0.02
        const gateRadius = 4.95 // Pushed inward for padding
        const gateElements: JSX.Element[] = []

        // Add tick marks and labels for each gate
        HUMAN_DESIGN_GATES.forEach((gate, gateIndex) => {
          // Calculate center position of gate
          const centerDegree = (gate.startDegree + gate.endDegree) / 2
          const angle = (centerDegree * Math.PI) / 180

          // Find which zodiac sign this gate is in
          const zodiacIndex = Math.floor(centerDegree / 30)
          const zodiacColor = ZODIAC_SIGNS[zodiacIndex].color

          // Major tick mark extending radially inward
          const tickLength = 0.25
          const xInner = Math.cos(angle) * (gateRadius - tickLength)
          const zInner = Math.sin(angle) * (gateRadius - tickLength)
          const xOuter = Math.cos(angle) * gateRadius
          const zOuter = Math.sin(angle) * gateRadius

          gateElements.push(
            <line key={`gate-tick-inner-${gateIndex}`}>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  args={[
                    new Float32Array([
                      xOuter, bottomY, zOuter,   // Outer point
                      xInner, bottomY, zInner    // Inner point (extends inward)
                    ]),
                    3
                  ]}
                />
              </bufferGeometry>
              <lineBasicMaterial
                color={zodiacColor}
                transparent
                opacity={0.6}
                linewidth={2}
              />
            </line>
          )

          // Add 5 minor tick marks for the 6 lines within each gate
          for (let line = 1; line < 6; line++) {
            const lineDegree = gate.startDegree + (line * 0.9375)
            const lineAngle = (lineDegree * Math.PI) / 180
            const lineTickLength = 0.12
            const xLineOuter = Math.cos(lineAngle) * gateRadius
            const zLineOuter = Math.sin(lineAngle) * gateRadius
            const xLineInner = Math.cos(lineAngle) * (gateRadius - lineTickLength)
            const zLineInner = Math.sin(lineAngle) * (gateRadius - lineTickLength)

            gateElements.push(
              <line key={`gate-line-tick-inner-${gateIndex}-${line}`}>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    args={[
                      new Float32Array([
                        xLineOuter, bottomY, zLineOuter,   // Outer point
                        xLineInner, bottomY, zLineInner    // Inner point (shorter)
                      ]),
                      3
                    ]}
                  />
                </bufferGeometry>
                <lineBasicMaterial
                  color={zodiacColor}
                  transparent
                  opacity={0.25}
                  linewidth={1}
                />
              </line>
            )
          }

          // Gate number label - positioned at inner radius
          gateElements.push(
            <Text
              key={`gate-label-inner-${gateIndex}`}
              position={[xInner, bottomY, zInner]}
              rotation={[-Math.PI / 2, 0, -angle - Math.PI / 2]}
              fontSize={0.22}
              color="white" // Bright white core
              anchorX="center"
              anchorY="middle"
              outlineWidth={0.015} // Reduced for readability
              outlineColor={zodiacColor} // Subtle colored outline
            >
              {gate.number}
            </Text>
          )

          // Gate name label - starting with padding from gate number, radiating inward toward center
          const namePadding = 0.15 // Space between number and name - reduced for tighter spacing
          const nameStartRadius = gateRadius - tickLength - namePadding
          const xNameStart = Math.cos(angle) * nameStartRadius
          const zNameStart = Math.sin(angle) * nameStartRadius

          gateElements.push(
            <Text
              key={`gate-name-inner-${gateIndex}`}
              position={[xNameStart, bottomY, zNameStart]}
              rotation={[-Math.PI / 2, 0, -angle + Math.PI]} // Rotated to radiate inward
              fontSize={0.13}
              color="white" // Bright white core
              anchorX="left"
              anchorY="middle"
              outlineWidth={0.01} // Reduced for readability
              outlineColor={zodiacColor} // Subtle colored outline
              fillOpacity={1.0}
            >
              {gate.name}
            </Text>
          )
        })

        return <group>{gateElements}</group>
      })()}

      {/* Connecting lines between inner and outer degree rings - every 30 degrees */}
      {(() => {
        const bottomY = -cylinderHeight / 2 + 0.01
        const innerRadius = 5.45 // Updated to match inner degree ring
        const outerRadius = 16
        const connectingLines = []

        // Add connecting lines every 30 degrees (at zodiac boundaries)
        for (let degree = 0; degree < 360; degree += 30) {
          const angle = (degree * Math.PI) / 180

          // Find which zodiac sign this degree is in
          const zodiacIndex = Math.floor(degree / 30)
          const zodiacColor = ZODIAC_SIGNS[zodiacIndex].color

          const innerX = Math.cos(angle) * innerRadius
          const innerZ = Math.sin(angle) * innerRadius
          const outerX = Math.cos(angle) * outerRadius
          const outerZ = Math.sin(angle) * outerRadius

          connectingLines.push(
            <group key={`connect-group-${degree}`}>
              {/* Main connecting line */}
              <line>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    args={[
                      new Float32Array([
                        innerX, bottomY, innerZ,  // Inner ring point
                        outerX, bottomY, outerZ   // Outer ring point
                      ]),
                      3
                    ]}
                  />
                </bufferGeometry>
                <lineBasicMaterial
                  color={zodiacColor}
                  transparent
                  opacity={0.55}
                  linewidth={2}
                />
              </line>

              {/* Glow layer for connecting line */}
              <line>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    args={[
                      new Float32Array([
                        innerX, bottomY, innerZ,  // Inner ring point
                        outerX, bottomY, outerZ   // Outer ring point
                      ]),
                      3
                    ]}
                  />
                </bufferGeometry>
                <lineBasicMaterial
                  color={zodiacColor}
                  transparent
                  opacity={0.1}
                  linewidth={4}
                  blending={THREE.AdditiveBlending}
                />
              </line>
            </group>
          )
        }

        return <group>{connectingLines}</group>
      })()}

      {/* Radial zodiac division lines - flat pie slices on bottom surface */}
      {ZODIAC_SIGNS.map((sign, index) => {
        const startAngle = (sign.startDegree * Math.PI) / 180
        const bottomY = -cylinderHeight / 2 + 0.015 // Slightly above surface
        const maxRadius = 16 // Edge of bottom plate
        const minRadius = 5.45 // Updated to match inner degree ring
        const centerRadius = 0 // Inner end point - extend to center
        const numSegments = 20

        // Generate points going from 1/3 radius to edge on flat bottom surface (outward)
        const pointsOutward: number[] = []
        const startX = Math.cos(startAngle) * minRadius
        const startZ = Math.sin(startAngle) * minRadius
        pointsOutward.push(startX, bottomY, startZ)

        // Radiate outward to edge
        for (let i = 1; i <= numSegments; i++) {
          const radius = minRadius + ((maxRadius - minRadius) * i) / numSegments
          const x = Math.cos(startAngle) * radius
          const z = Math.sin(startAngle) * radius
          pointsOutward.push(x, bottomY, z)
        }

        // Generate points going from 1/3 radius inward toward center with gradient
        const pointsInward: number[] = []
        const numInwardSegments = 15
        for (let i = 0; i <= numInwardSegments; i++) {
          const radius = minRadius - ((minRadius - centerRadius) * i) / numInwardSegments
          const x = Math.cos(startAngle) * radius
          const z = Math.sin(startAngle) * radius
          pointsInward.push(x, bottomY, z)
        }

        return (
          <group key={`radial-group-${index}`}>
            {/* Outward radial guide line */}
            <line>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  args={[new Float32Array(pointsOutward), 3]}
                />
              </bufferGeometry>
              <lineBasicMaterial
                color={sign.color}
                transparent
                opacity={0.6}
                linewidth={3}
              />
            </line>

            {/* Outward subtle glow layer */}
            <line>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  args={[new Float32Array(pointsOutward), 3]}
                />
              </bufferGeometry>
              <lineBasicMaterial
                color={sign.color}
                transparent
                opacity={0.12}
                linewidth={5}
                blending={THREE.AdditiveBlending}
              />
            </line>

            {/* Inward radial guide line with gradient fade */}
            <line>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  args={[new Float32Array(pointsInward), 3]}
                />
              </bufferGeometry>
              <lineBasicMaterial
                color={sign.color}
                transparent
                opacity={0.45}
                linewidth={2}
              />
            </line>

            {/* Inward subtle glow with fade */}
            <line>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  args={[new Float32Array(pointsInward), 3]}
                />
              </bufferGeometry>
              <lineBasicMaterial
                color={sign.color}
                transparent
                opacity={0.08}
                linewidth={4}
                blending={THREE.AdditiveBlending}
              />
            </line>
          </group>
        )
      })}

      {/* Constellation patterns for each zodiac */}
      {constellationPatterns.map((pattern, index) => (
        <group key={`constellation-${index}`}>
          {/* Connect-the-dots star constellation lines - white core with colored glow */}
          {pattern.lines.map((line, lineIndex) => (
            <group key={`line-group-${index}-${lineIndex}`}>
              {/* White core line */}
              <line>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    args={[
                      new Float32Array([
                        line[0].x, line[0].y, line[0].z,
                        line[1].x, line[1].y, line[1].z,
                      ]),
                      3,
                    ]}
                  />
                </bufferGeometry>
                <lineBasicMaterial
                  color="white"
                  transparent
                  opacity={0.4}
                  linewidth={1}
                />
              </line>

              {/* Colored glow layer */}
              <line>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    args={[
                      new Float32Array([
                        line[0].x, line[0].y, line[0].z,
                        line[1].x, line[1].y, line[1].z,
                      ]),
                      3,
                    ]}
                  />
                </bufferGeometry>
                <lineBasicMaterial
                  color={pattern.sign.color}
                  transparent
                  opacity={0.2}
                  linewidth={2}
                  blending={THREE.AdditiveBlending}
                />
              </line>
            </group>
          ))}

          {/* Individual stars in the constellation - enhanced glow */}
          {pattern.stars.map((star, starIndex) => (
            <group key={`star-${index}-${starIndex}`} position={star}>
              {/* Core bright point - brighter white */}
              <mesh>
                <sphereGeometry args={[0.04, 8, 8]} />
                <meshBasicMaterial
                  color="white"
                  transparent
                  opacity={0.9}
                />
              </mesh>

              {/* Inner colored glow */}
              <mesh>
                <sphereGeometry args={[0.1, 8, 8]} />
                <meshBasicMaterial
                  color={pattern.sign.color}
                  transparent
                  opacity={0.4}
                  blending={THREE.AdditiveBlending}
                />
              </mesh>

              {/* Outer soft halo */}
              <mesh>
                <sphereGeometry args={[0.18, 8, 8]} />
                <meshBasicMaterial
                  color={pattern.sign.color}
                  transparent
                  opacity={0.15}
                  blending={THREE.AdditiveBlending}
                />
              </mesh>
            </group>
          ))}

          {/* Zodiac name painted on interior wall */}
          <Text
            position={[
              Math.cos(pattern.centerAngle) * 15.3,
              1.5,
              Math.sin(pattern.centerAngle) * 15.3,
            ]}
            rotation={[0, -pattern.centerAngle - Math.PI / 2, 0]}
            fontSize={1.2}
            color="white"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.04}
            outlineColor={pattern.sign.color}
            fillOpacity={0.9}
          >
            {pattern.sign.name}
          </Text>

          {/* Zodiac keywords band - positioned at bottom of window */}
          <group>
            {pattern.sign.keywords.map((keyword, keywordIndex) => {
              // Spread keywords horizontally within the zodiac segment
              const segmentWidth = 30 // degrees
              const keywordSpacing = segmentWidth / (pattern.sign.keywords.length + 1)
              const keywordOffset = (keywordIndex + 1 - (pattern.sign.keywords.length + 1) / 2) * keywordSpacing
              const keywordAngle = pattern.centerAngle + (keywordOffset * Math.PI) / 180

              return (
                <Text
                  key={`keyword-${pattern.sign.name}-${keywordIndex}`}
                  position={[
                    Math.cos(keywordAngle) * 15.3,
                    -2.3,
                    Math.sin(keywordAngle) * 15.3,
                  ]}
                  rotation={[0, -keywordAngle - Math.PI / 2, 0]}
                  fontSize={0.22}
                  color="white"
                  anchorX="center"
                  anchorY="middle"
                  outlineWidth={0.012}
                  outlineColor={pattern.sign.color}
                  fillOpacity={0.85}
                >
                  {keyword}
                </Text>
              )
            })}
          </group>
        </group>
      ))}

      {/* 3D "Bird's Nest" Stadium Effect - DISABLED to see cleaner view */}
      {/* Commented out to reduce visual clutter - can be re-enabled if desired */}

      {/* TASK-002: Primary vertical structural beams - curved to follow bowl shape */}
      {/* {ZODIAC_SIGNS.map((sign, index) => {
        const angle = (sign.startDegree * Math.PI) / 180
        const curvedPoints = getCurvedBeamPoints(angle, 10)

        return (
          <line key={`vertical-beam-${index}`}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[curvedPoints, 3]}
              />
            </bufferGeometry>
            <lineBasicMaterial
              color="#6366f1"
              transparent
              opacity={0.3 * stadiumOpacity}
              linewidth={1}
            />
          </line>
        )
      })} */}

      {/* Horizontal hoops - multiple levels for stadium effect */}
      {/* {[-cylinderHeight / 2, -1.8, -0.9, 0, 0.9, 1.8, cylinderHeight / 2].map((height, hIndex) => {
        const radiusAtThisHeight = getRadiusAtHeight(height)
        // Vary opacity based on height - slightly more visible at center
        const baseOpacity = height === 0 ? 0.24 : 0.16
        return (
          <mesh key={`hoop-${hIndex}`} rotation-x={Math.PI / 2} position={[0, height, 0]}>
            <ringGeometry args={[radiusAtThisHeight - 0.08, radiusAtThisHeight + 0.08, 64]} />
            <meshBasicMaterial
              color="#6366f1"
              transparent
              opacity={baseOpacity * stadiumOpacity}
              side={THREE.DoubleSide}
            />
          </mesh>
        )
      })} */}

      {/* TASK-004: Diagonal cross-braces - curved to follow bowl surface */}
      {/* {ZODIAC_SIGNS.map((sign, index) => {
        const angle1 = (sign.startDegree * Math.PI) / 180
        const angle2 = (ZODIAC_SIGNS[(index + 1) % 12].startDegree * Math.PI) / 180

        // Bottom point
        const y1Bottom = -cylinderHeight / 2
        const radius1Bottom = getRadiusAtHeight(y1Bottom)
        const x1Bottom = Math.cos(angle1) * radius1Bottom
        const z1Bottom = Math.sin(angle1) * radius1Bottom

        // Top point
        const y1Top = cylinderHeight / 2
        const radius1Top = getRadiusAtHeight(y1Top)
        const x1Top = Math.cos(angle1) * radius1Top
        const z1Top = Math.sin(angle1) * radius1Top

        // Bottom point for angle2
        const radius2Bottom = getRadiusAtHeight(y1Bottom)
        const x2Bottom = Math.cos(angle2) * radius2Bottom
        const z2Bottom = Math.sin(angle2) * radius2Bottom

        // Top point for angle2
        const radius2Top = getRadiusAtHeight(y1Top)
        const x2Top = Math.cos(angle2) * radius2Top
        const z2Top = Math.sin(angle2) * radius2Top

        // Mid-level points
        const yMidBottom = -cylinderHeight / 4
        const yMidTop = cylinderHeight / 4
        const radius1MidBottom = getRadiusAtHeight(yMidBottom)
        const radius2MidTop = getRadiusAtHeight(yMidTop)
        const x1MidBottom = Math.cos(angle1) * radius1MidBottom
        const z1MidBottom = Math.sin(angle1) * radius1MidBottom
        const x2MidTop = Math.cos(angle2) * radius2MidTop
        const z2MidTop = Math.sin(angle2) * radius2MidTop

        return (
          <group key={`cross-braces-${index}`}>
            <line>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  args={[
                    new Float32Array([
                      x1Bottom, y1Bottom, z1Bottom,
                      x2Top, y1Top, z2Top,
                    ]),
                    3,
                  ]}
                />
              </bufferGeometry>
              <lineBasicMaterial
                color="#a78bfa"
                transparent
                opacity={0.16 * stadiumOpacity}
              />
            </line>

            <line>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  args={[
                    new Float32Array([
                      x1Top, y1Top, z1Top,
                      x2Bottom, y1Bottom, z2Bottom,
                    ]),
                    3,
                  ]}
                />
              </bufferGeometry>
              <lineBasicMaterial
                color="#a78bfa"
                transparent
                opacity={0.16 * stadiumOpacity}
              />
            </line>
          </group>
        )
      })} */}

      {/* TASK-005: Additional interwoven curves - skip-one pattern, curved to follow bowl surface */}
      {/* {ZODIAC_SIGNS.map((sign, index) => {
        if (index % 2 !== 0) return null // Only every other one

        const angle1 = (sign.startDegree * Math.PI) / 180
        const angle2 = (ZODIAC_SIGNS[(index + 2) % 12].startDegree * Math.PI) / 180

        // Point 1 at upper third
        const y1 = cylinderHeight / 3
        const radius1 = getRadiusAtHeight(y1)
        const x1 = Math.cos(angle1) * radius1
        const z1 = Math.sin(angle1) * radius1

        // Point 2 at lower third
        const y2 = -cylinderHeight / 3
        const radius2 = getRadiusAtHeight(y2)
        const x2 = Math.cos(angle2) * radius2
        const z2 = Math.sin(angle2) * radius2

        return (
          <line key={`curve-${index}`}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[
                  new Float32Array([
                    x1, y1, z1,
                    x2, y2, z2,
                  ]),
                  3,
                ]}
              />
            </bufferGeometry>
            <lineBasicMaterial
              color="#ddd6fe"
              transparent
              opacity={0.1 * stadiumOpacity}
            />
          </line>
        )
      })} */}
    </group>
  )
}
