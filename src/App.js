import * as THREE from 'three'
import { useRef, useReducer, useMemo, useState, useCallback } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Lightformer } from '@react-three/drei'
import { BallCollider, Physics, RigidBody } from '@react-three/rapier'
import { easing } from 'maath'
import { Effects } from './Effects'

const BALL_COUNT = 250
const randSize = () => 0.15 + Math.pow(Math.random(), 2) * 1.85

const buildConnectors = (colors, accentIndex) => {
  const { dark, light } = colors
  const accent = colors.accents[accentIndex]
  const baseConfigs = [
    { color: dark, roughness: 0.6, metalness: 0.05 },
    { color: dark, roughness: 0.6, metalness: 0.05 },
    { color: dark, roughness: 0.6, metalness: 0.05 },
    { color: light, roughness: 0.1, metalness: 0.1 },
    { color: light, roughness: 0.1, metalness: 0.1 },
    { color: light, roughness: 0.1, metalness: 0.1 },
    { color: accent, roughness: 0.1, accent: true },
    { color: accent, roughness: 0.1, accent: true },
    { color: accent, roughness: 0.1, accent: true },
    { color: dark, roughness: 0.75, metalness: 0.05 },
    { color: dark, roughness: 0.75, metalness: 0.05 },
    { color: dark, roughness: 0.6, metalness: 0.05 },
    { color: light, roughness: 0.1 },
    { color: light, roughness: 0.2 },
    { color: light, roughness: 0.1 },
    { color: accent, roughness: 0.1, accent: true, transparent: true, opacity: 0.5 },
    { color: accent, roughness: 0.3, accent: true },
    { color: accent, roughness: 0.1, accent: true }
  ]
  return Array.from({ length: BALL_COUNT }, (_, i) => ({
    ...baseConfigs[i % baseConfigs.length],
    scale: randSize(),
  }))
}

// ─── CSS Bokeh Background ────────────────────────────────────────
const BOKEH_LAYOUT = (() => {
  const result = []
  for (let i = 0; i < 150; i++) {
    result.push({
      size: 10 + Math.pow(Math.random(), 3) * 120,
      x: Math.random() * 100,
      y: Math.random() * 100,
      opacity: 0.06 + Math.random() * 0.18,
      delay: Math.random() * 20,
      duration: 15 + Math.random() * 25,
      paletteIndex: Math.floor(Math.random() * 3), // 0=dark, 1=light, 2=accent
    })
  }
  return result
})()

function BokehBackground({ dark, light, accent }) {
  const palette = [dark, light, accent]
  return (
    <div className="bokeh-bg">
      {BOKEH_LAYOUT.map((c, i) => (
        <div
          key={i}
          className="bokeh-circle"
          style={{
            width: c.size,
            height: c.size,
            left: `${c.x}%`,
            top: `${c.y}%`,
            background: `radial-gradient(circle, ${palette[c.paletteIndex]}${Math.round(c.opacity * 255).toString(16).padStart(2, '0')} 0%, transparent 70%)`,
            animationDelay: `${-c.delay}s`,
            animationDuration: `${c.duration}s`,
          }}
        />
      ))}
    </div>
  )
}

// ─── Main App ────────────────────────────────────────────────────
export default function App(props) {
  const [colors, setColors] = useState({
    dark: '#888888',
    light: '#ffffff',
    accents: ['#ff4060', '#ffcc00', '#20ffa0', '#4060ff'],
    bg: '#141622',
  })
  const [accentIndex, setAccentIndex] = useState(0)

  const handleClick = useCallback(() => {
    setAccentIndex((prev) => (prev + 1) % colors.accents.length)
  }, [colors.accents.length])

  const connectors = useMemo(() => buildConnectors(colors, accentIndex), [colors, accentIndex])

  const updateColor = (key, value) => setColors((prev) => ({ ...prev, [key]: value }))
  const updateAccent = (index, value) => {
    setColors((prev) => {
      const newAccents = [...prev.accents]
      newAccents[index] = value
      return { ...prev, accents: newAccents }
    })
  }

  return (
    <div className="app-layout">
      {/* ── Canvas Viewport ── */}
      <div className="canvas-area">
        <div className="canvas-wrapper">
          <Canvas
            flat shadows
            onClick={handleClick}
            dpr={typeof window !== 'undefined' && window.innerWidth < 768 ? [1, 1] : [1, 1.5]}
            gl={{ antialias: false }}
            camera={{ position: [0, 0, typeof window !== 'undefined' && window.innerWidth < 768 ? 55 : 30], fov: typeof window !== 'undefined' && window.innerWidth < 768 ? 70 : 50, near: 1, far: 120 }}
          >
            <color attach="background" args={[colors.bg]} />
            <Physics timeStep="vary" gravity={[0, 0, 0]}>
              <Pointer />
              {connectors.map((props, i) => (
                <Sphere key={i} {...props} />
              ))}
            </Physics>
            <Environment resolution={256}>
              <group rotation={[-Math.PI / 3, 0, 1]}>
                <Lightformer form="circle" intensity={100} rotation-x={Math.PI / 2} position={[0, 5, -9]} scale={2} />
                <Lightformer form="circle" intensity={2} rotation-y={Math.PI / 2} position={[-5, 1, -1]} scale={2} />
                <Lightformer form="circle" intensity={2} rotation-y={Math.PI / 2} position={[-5, -1, -1]} scale={2} />
                <Lightformer form="circle" intensity={2} rotation-y={-Math.PI / 2} position={[10, 1, 0]} scale={8} />
                <Lightformer form="ring" color="#4060ff" intensity={80} onUpdate={(self) => self.lookAt(0, 0, 0)} position={[10, 10, 0]} scale={10} />
              </group>
            </Environment>
            <Effects />
          </Canvas>
          <BokehBackground dark={colors.dark} light={colors.light} accent={colors.accents[accentIndex]} />
        </div>
      </div>
    </div>
  )
}

// ─── Color Row Component ─────────────────────────────────────────
function ColorRow({ label, color, onChange, active }) {
  return (
    <div className={`color-row ${active ? 'active' : ''}`}>
      <label>{label}</label>
      <div className="color-inputs">
        <input type="color" value={color} onChange={(e) => onChange(e.target.value)} />
        <input
          type="text"
          className="hex-input"
          value={color}
          onChange={(e) => {
            const v = e.target.value
            if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v)
          }}
          maxLength={7}
        />
      </div>
    </div>
  )
}

// ─── Physics Sphere ──────────────────────────────────────────────
const IS_PORTRAIT = typeof window !== 'undefined' && window.innerHeight > window.innerWidth
const BOUNDS_X = IS_PORTRAIT ? 9 : 16
const BOUNDS_Y = IS_PORTRAIT ? 16 : 9

function Sphere({ position, children, vec = new THREE.Vector3(), scale = 1, r = THREE.MathUtils.randFloatSpread, accent, color = 'white', ...props }) {
  const api = useRef()
  const ref = useRef()
  const pos = useMemo(() => position || [(Math.random() - 0.5) * BOUNDS_X * 2, (Math.random() - 0.5) * BOUNDS_Y * 2, r(3)], [])
  useFrame((state, delta) => {
    delta = Math.min(0.1, delta)
    if (api.current) {
      const t = api.current.translation()
      let fx = 0, fy = 0
      if (t.x > BOUNDS_X) fx = (BOUNDS_X - t.x) * 0.5
      else if (t.x < -BOUNDS_X) fx = (-BOUNDS_X - t.x) * 0.5
      if (t.y > BOUNDS_Y) fy = (BOUNDS_Y - t.y) * 0.5
      else if (t.y < -BOUNDS_Y) fy = (-BOUNDS_Y - t.y) * 0.5
      vec.set(fx, fy, t.z * -0.5)
      api.current.applyImpulse(vec)
    }
    easing.dampC(ref.current.material.color, color, 0.2, delta)
  })
  return (
    <RigidBody linearDamping={4} angularDamping={1} friction={0.1} position={pos} ref={api} colliders={false}>
      <BallCollider args={[scale]} />
      <mesh ref={ref} castShadow receiveShadow>
        <sphereGeometry args={[scale, 64, 64]} />
        <meshStandardMaterial {...props} />
        {children}
      </mesh>
    </RigidBody>
  )
}

function Pointer({ vec = new THREE.Vector3() }) {
  const ref = useRef()
  useFrame(({ mouse, viewport }) => ref.current?.setNextKinematicTranslation(vec.set((mouse.x * viewport.width) / 2, (mouse.y * viewport.height) / 2, 0)))
  return (
    <RigidBody position={[0, 0, 0]} type="kinematicPosition" colliders={false} ref={ref}>
      <BallCollider args={[1]} />
    </RigidBody>
  )
}
