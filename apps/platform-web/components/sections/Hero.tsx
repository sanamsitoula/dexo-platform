'use client'

import { useEffect, useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, Float, MeshDistortMaterial } from '@react-three/drei'
import * as THREE from 'three'
import { motion } from 'framer-motion'
import Link from 'next/link'
import MagneticButton from '@/components/MagneticButton'

function GlassShapes({ simple }: { simple: boolean }) {
  const group = useRef<THREE.Group>(null)
  const mouse = useRef({ x: 0, y: 0 })

  useEffect(() => {
    function onMove(e: MouseEvent) {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1
    }
    window.addEventListener('mousemove', onMove, { passive: true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  useFrame((state) => {
    if (!group.current) return
    const t = state.clock.getElapsedTime()
    group.current.rotation.y = t * 0.08 + mouse.current.x * 0.3
    group.current.rotation.x = mouse.current.y * 0.15
    group.current.position.y = Math.sin(t * 0.4) * 0.15
  })

  const matProps = {
    roughness: 0.05,
    metalness: 0.1,
    transmission: simple ? 0 : 0.9,
    thickness: 1.5,
    ior: 1.4,
    clearcoat: 1,
    opacity: simple ? 0.55 : 1,
    transparent: true,
  }

  return (
    <group ref={group}>
      <Float speed={1.2} rotationIntensity={0.6} floatIntensity={1.2}>
        <mesh position={[-2.1, 0.6, 0]}>
          <icosahedronGeometry args={[1.05, simple ? 0 : 1]} />
          <meshPhysicalMaterial color="#818CF8" emissive="#4338CA" emissiveIntensity={0.25} {...matProps} />
        </mesh>
      </Float>
      <Float speed={1.6} rotationIntensity={0.8} floatIntensity={1.6}>
        <mesh position={[2.2, -0.4, -1]}>
          <torusGeometry args={[0.85, 0.28, 32, 96]} />
          <meshPhysicalMaterial color="#22D3EE" emissive="#0891B2" emissiveIntensity={0.3} {...matProps} />
        </mesh>
      </Float>
      <Float speed={1} rotationIntensity={0.5} floatIntensity={1}>
        <mesh position={[0.4, 1.3, -2]}>
          <sphereGeometry args={[0.6, 32, 32]} />
          <MeshDistortMaterial
            color="#A78BFA"
            emissive="#6D28D9"
            emissiveIntensity={0.2}
            roughness={0.1}
            metalness={0.2}
            distort={simple ? 0.15 : 0.35}
            speed={1.5}
            transparent
            opacity={simple ? 0.55 : 0.9}
          />
        </mesh>
      </Float>
    </group>
  )
}

function HeroScene({ simple }: { simple: boolean }) {
  return (
    <Canvas
      dpr={[1, simple ? 1.2 : 1.75]}
      camera={{ position: [0, 0, 6.5], fov: 45 }}
      gl={{ antialias: !simple, alpha: true, powerPreference: 'high-performance' }}
    >
      <ambientLight intensity={0.5} />
      <pointLight position={[5, 5, 5]} intensity={1.4} color="#818CF8" />
      <pointLight position={[-5, -3, -5]} intensity={1} color="#22D3EE" />
      <spotLight position={[0, 6, 4]} angle={0.4} penumbra={1} intensity={0.8} color="#ffffff" />
      <GlassShapes simple={simple} />
      {!simple && <Environment preset="city" />}
    </Canvas>
  )
}

export default function Hero() {
  const [simple, setSimple] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const small = window.innerWidth < 768
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setSimple(small || reduce)
    setReady(true)
  }, [])

  return (
    <section
      id="hero"
      className="relative flex min-h-[92vh] w-full flex-col items-center justify-center overflow-hidden bg-[#05050a] px-4 pt-16"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(99,102,241,0.18),transparent_60%)]" />

      <div className="absolute inset-0" aria-hidden="true">
        {ready && <HeroScene simple={simple} />}
      </div>

      <div className="relative z-10 mx-auto max-w-5xl text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-zinc-300 backdrop-blur-sm"
        >
          <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
          Domain-Driven Multi-Tenant SaaS
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl"
          style={{ fontFamily: 'var(--font-grotesk), Space Grotesk, system-ui, sans-serif' }}
        >
          Dexo Platform
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-6 bg-gradient-to-r from-indigo-300 via-cyan-200 to-violet-300 bg-clip-text text-2xl font-semibold text-transparent sm:text-3xl"
        >
          One Platform. 12 Industries. Unlimited Growth.
        </motion.p>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mx-auto mt-4 max-w-2xl text-lg text-zinc-400"
        >
          Transform your business with our domain-driven architecture. Whether you run a fitness
          center, salon, school, restaurant, hotel, or any business — Dexo adapts to you.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <MagneticButton href="/register" variant="primary">
            Start Free Trial
          </MagneticButton>
          <MagneticButton href="/login" variant="secondary">
            Sign In
          </MagneticButton>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.55 }}
          className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-zinc-500"
        >
          <span>Free 14-day trial</span>
          <span>No credit card required</span>
          <span>Cancel anytime</span>
        </motion.div>
      </div>

      <div className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-zinc-500">
        <div className="flex h-9 w-6 items-start justify-center rounded-full border border-white/20 p-1">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-cyan-300" />
        </div>
      </div>
    </section>
  )
}
