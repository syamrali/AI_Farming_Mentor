"use client";

import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, ContactShadows } from "@react-three/drei";
import * as THREE from "three";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
export interface AvatarHandle {
  startSpeaking: (audioBuffer: ArrayBuffer) => void;
  stopSpeaking: () => void;
}

interface AvatarProps {
  isSpeaking: boolean;
  isListening: boolean;
  isThinking: boolean;
  mouthOpenRef: React.MutableRefObject<number>;
}

// ─────────────────────────────────────────────────────────────
// Farmer 3D Avatar Mesh
// ─────────────────────────────────────────────────────────────
function FarmerAvatar({ isSpeaking, isListening, isThinking, mouthOpenRef }: AvatarProps) {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const jawRef = useRef<THREE.Mesh>(null);
  const eyeLRef = useRef<THREE.Mesh>(null);
  const eyeRRef = useRef<THREE.Mesh>(null);
  const eyelidLRef = useRef<THREE.Mesh>(null);
  const eyelidRRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftHandRef = useRef<THREE.Group>(null);
  const rightHandRef = useRef<THREE.Group>(null);
  const bodyRef = useRef<THREE.Mesh>(null);
  const turbanRef = useRef<THREE.Mesh>(null);

  // Animation state refs
  const clockRef = useRef(0);
  const blinkTimerRef = useRef(0);
  const nextBlinkRef = useRef(2.5);
  const isBlinkingRef = useRef(false);
  const blinkPhaseRef = useRef(0);
  const headNodRef = useRef(0);
  const gesturePhaseRef = useRef(0);
  const gestureTimerRef = useRef(0);
  const currentGestureRef = useRef(0); // 0=idle, 1=nod, 2=wave, 3=point

  // Materials
  const skinMat = new THREE.MeshStandardMaterial({ color: "#C68642", roughness: 0.7 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: "#E8A020", roughness: 0.8 });
  const dhotiMat = new THREE.MeshStandardMaterial({ color: "#F5E6C8", roughness: 0.9 });
  const turbanMat = new THREE.MeshStandardMaterial({ color: "#FF6B35", roughness: 0.8 });
  const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: "#FFFFFF", roughness: 0.5 });
  const irisMat = new THREE.MeshStandardMaterial({ color: "#3B2314", roughness: 0.3, metalness: 0.1 });
  const lipMat = new THREE.MeshStandardMaterial({ color: "#A0522D", roughness: 0.7 });
  const mustacheMat = new THREE.MeshStandardMaterial({ color: "#2C1810", roughness: 0.9 });
  const hairMat = new THREE.MeshStandardMaterial({ color: "#1A0A00", roughness: 0.9 });
  const toothMat = new THREE.MeshStandardMaterial({ color: "#F8F4E8", roughness: 0.4 });
  const jawMat = new THREE.MeshStandardMaterial({ color: "#C68642", roughness: 0.7 });
  const eyelidMat = new THREE.MeshStandardMaterial({ color: "#C68642", roughness: 0.7, side: THREE.FrontSide });

  useFrame((_, delta) => {
    clockRef.current += delta;
    const t = clockRef.current;

    // ── Breathing (subtle body bob) ──
    if (bodyRef.current) {
      bodyRef.current.scale.y = 1 + Math.sin(t * 1.2) * 0.008;
    }

    // ── Head subtle sway (idle) ──
    if (headRef.current) {
      const speakingBob = isSpeaking ? Math.sin(t * 4) * 0.015 : 0;
      headRef.current.rotation.y = Math.sin(t * 0.4) * 0.04 + (isSpeaking ? Math.sin(t * 2.5) * 0.03 : 0);
      headRef.current.rotation.z = Math.sin(t * 0.3) * 0.02;
      headRef.current.position.y = speakingBob;

      // Head nod when thinking
      if (isThinking) {
        headRef.current.rotation.x = Math.sin(t * 1.5) * 0.08 - 0.05;
      } else {
        headRef.current.rotation.x = Math.sin(t * 0.25) * 0.015;
      }
    }

    // ── Jaw / Lip Sync ──
    if (jawRef.current) {
      const target = isSpeaking ? mouthOpenRef.current * 0.25 : 0;
      jawRef.current.rotation.x = THREE.MathUtils.lerp(jawRef.current.rotation.x, target, 0.3);
    }

    // ── Turban slight bob with head ──
    if (turbanRef.current && headRef.current) {
      turbanRef.current.rotation.y = headRef.current.rotation.y * 0.5;
    }

    // ── Eye blinking ──
    blinkTimerRef.current += delta;
    if (!isBlinkingRef.current && blinkTimerRef.current > nextBlinkRef.current) {
      isBlinkingRef.current = true;
      blinkPhaseRef.current = 0;
      blinkTimerRef.current = 0;
      nextBlinkRef.current = 2 + Math.random() * 4;
    }
    if (isBlinkingRef.current) {
      blinkPhaseRef.current += delta * 12;
      const blink = Math.sin(blinkPhaseRef.current) * (blinkPhaseRef.current < Math.PI ? 1 : 0);
      const eyelidClose = Math.max(0, Math.sin(blinkPhaseRef.current));
      [eyelidLRef.current, eyelidRRef.current].forEach(lid => {
        if (lid) lid.scale.y = 1 - eyelidClose * 0.95;
      });
      if (blinkPhaseRef.current > Math.PI) {
        isBlinkingRef.current = false;
        [eyelidLRef.current, eyelidRRef.current].forEach(lid => {
          if (lid) lid.scale.y = 1;
        });
      }
      void blink;
    }

    // ── Eye look around ──
    const eyeLookX = Math.sin(t * 0.3) * 0.04;
    const eyeLookY = Math.sin(t * 0.5) * 0.02;
    [eyeLRef.current, eyeRRef.current].forEach(eye => {
      if (eye) {
        eye.rotation.x = eyeLookY;
        eye.rotation.y = eyeLookX;
      }
    });

    // ── Hand Gesture System ──
    gestureTimerRef.current += delta;

    if (isSpeaking) {
      // Cycle through gestures every 3s while speaking
      if (gestureTimerRef.current > 3.0) {
        gestureTimerRef.current = 0;
        currentGestureRef.current = (currentGestureRef.current + 1) % 3;
      }
      gesturePhaseRef.current += delta * 3;
    } else {
      currentGestureRef.current = 0;
      gesturePhaseRef.current = 0;
    }

    const gp = gesturePhaseRef.current;

    if (leftArmRef.current && rightArmRef.current) {
      switch (currentGestureRef.current) {
        case 0: // Idle: gentle sway at sides
          leftArmRef.current.rotation.z = THREE.MathUtils.lerp(leftArmRef.current.rotation.z, Math.sin(t * 0.8) * 0.06 + 0.15, 0.05);
          leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, 0, 0.05);
          rightArmRef.current.rotation.z = THREE.MathUtils.lerp(rightArmRef.current.rotation.z, -Math.sin(t * 0.8) * 0.06 - 0.15, 0.05);
          rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, 0, 0.05);
          break;
        case 1: // Nod / Emphasize: right arm raised, forearm gestures
          rightArmRef.current.rotation.z = THREE.MathUtils.lerp(rightArmRef.current.rotation.z, -0.6 + Math.sin(gp) * 0.15, 0.08);
          rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, -0.3 + Math.sin(gp * 0.8) * 0.1, 0.08);
          leftArmRef.current.rotation.z = THREE.MathUtils.lerp(leftArmRef.current.rotation.z, 0.2, 0.05);
          leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, 0, 0.05);
          break;
        case 2: // Both arms open / welcoming
          leftArmRef.current.rotation.z = THREE.MathUtils.lerp(leftArmRef.current.rotation.z, 0.6 + Math.sin(gp * 0.7) * 0.1, 0.08);
          leftArmRef.current.rotation.x = THREE.MathUtils.lerp(leftArmRef.current.rotation.x, -0.2, 0.05);
          rightArmRef.current.rotation.z = THREE.MathUtils.lerp(rightArmRef.current.rotation.z, -0.6 - Math.sin(gp * 0.7) * 0.1, 0.08);
          rightArmRef.current.rotation.x = THREE.MathUtils.lerp(rightArmRef.current.rotation.x, -0.2, 0.05);
          break;
      }
    }

    // ── Listening: head tilts ──
    if (isListening && headRef.current) {
      headRef.current.rotation.z = THREE.MathUtils.lerp(headRef.current.rotation.z, 0.08, 0.03);
    }
  });

  return (
    <group ref={groupRef} position={[0, -1.8, 0]}>
      {/* ── LEGS / DHOTI ── */}
      <mesh position={[0, 0.55, 0]} material={dhotiMat}>
        <cylinderGeometry args={[0.38, 0.42, 1.1, 16]} />
      </mesh>
      {/* Left leg */}
      <mesh position={[-0.18, -0.15, 0]} material={dhotiMat}>
        <cylinderGeometry args={[0.13, 0.11, 0.7, 12]} />
      </mesh>
      {/* Right leg */}
      <mesh position={[0.18, -0.15, 0]} material={dhotiMat}>
        <cylinderGeometry args={[0.13, 0.11, 0.7, 12]} />
      </mesh>
      {/* Feet */}
      <mesh position={[-0.18, -0.55, 0.05]} material={skinMat}>
        <boxGeometry args={[0.18, 0.09, 0.3]} />
      </mesh>
      <mesh position={[0.18, -0.55, 0.05]} material={skinMat}>
        <boxGeometry args={[0.18, 0.09, 0.3]} />
      </mesh>

      {/* ── BODY / TORSO ── */}
      <mesh ref={bodyRef} position={[0, 1.15, 0]} material={shirtMat}>
        <cylinderGeometry args={[0.3, 0.37, 0.9, 16]} />
      </mesh>
      {/* Shirt collar */}
      <mesh position={[0, 1.58, 0.08]} material={shirtMat}>
        <boxGeometry args={[0.22, 0.08, 0.08]} />
      </mesh>

      {/* ── LEFT ARM + HAND ── */}
      <group ref={leftArmRef} position={[-0.42, 1.38, 0]} rotation={[0, 0, 0.15]}>
        {/* Upper arm */}
        <mesh position={[0, -0.22, 0]} material={shirtMat}>
          <cylinderGeometry args={[0.1, 0.09, 0.44, 10]} />
        </mesh>
        {/* Forearm */}
        <mesh position={[0, -0.58, 0]} material={skinMat}>
          <cylinderGeometry args={[0.08, 0.07, 0.38, 10]} />
        </mesh>
        {/* Hand */}
        <group ref={leftHandRef} position={[0, -0.82, 0]}>
          <mesh material={skinMat}>
            <boxGeometry args={[0.14, 0.16, 0.08]} />
          </mesh>
          {/* Fingers */}
          {[-0.04, -0.013, 0.013, 0.04].map((x, i) => (
            <mesh key={i} position={[x, 0.11, 0]} material={skinMat}>
              <cylinderGeometry args={[0.017, 0.015, 0.12, 6]} />
            </mesh>
          ))}
          {/* Thumb */}
          <mesh position={[-0.1, 0.02, 0]} rotation={[0, 0, -1.1]} material={skinMat}>
            <cylinderGeometry args={[0.018, 0.015, 0.1, 6]} />
          </mesh>
        </group>
      </group>

      {/* ── RIGHT ARM + HAND ── */}
      <group ref={rightArmRef} position={[0.42, 1.38, 0]} rotation={[0, 0, -0.15]}>
        {/* Upper arm */}
        <mesh position={[0, -0.22, 0]} material={shirtMat}>
          <cylinderGeometry args={[0.1, 0.09, 0.44, 10]} />
        </mesh>
        {/* Forearm */}
        <mesh position={[0, -0.58, 0]} material={skinMat}>
          <cylinderGeometry args={[0.08, 0.07, 0.38, 10]} />
        </mesh>
        {/* Hand */}
        <group ref={rightHandRef} position={[0, -0.82, 0]}>
          <mesh material={skinMat}>
            <boxGeometry args={[0.14, 0.16, 0.08]} />
          </mesh>
          {[-0.04, -0.013, 0.013, 0.04].map((x, i) => (
            <mesh key={i} position={[x, 0.11, 0]} material={skinMat}>
              <cylinderGeometry args={[0.017, 0.015, 0.12, 6]} />
            </mesh>
          ))}
          <mesh position={[0.1, 0.02, 0]} rotation={[0, 0, 1.1]} material={skinMat}>
            <cylinderGeometry args={[0.018, 0.015, 0.1, 6]} />
          </mesh>
        </group>
      </group>

      {/* ── NECK ── */}
      <mesh position={[0, 1.65, 0]} material={skinMat}>
        <cylinderGeometry args={[0.11, 0.13, 0.22, 12]} />
      </mesh>

      {/* ── HEAD ── */}
      <group ref={headRef} position={[0, 1.95, 0]}>
        {/* Head base */}
        <mesh material={skinMat}>
          <sphereGeometry args={[0.32, 24, 20]} />
        </mesh>
        {/* Slightly more prominent cheeks */}
        <mesh position={[-0.2, -0.02, 0.12]} material={skinMat}>
          <sphereGeometry args={[0.11, 12, 10]} />
        </mesh>
        <mesh position={[0.2, -0.02, 0.12]} material={skinMat}>
          <sphereGeometry args={[0.11, 12, 10]} />
        </mesh>

        {/* ── TURBAN ── */}
        <group ref={turbanRef} position={[0, 0.14, 0]}>
          {/* Turban base */}
          <mesh material={turbanMat}>
            <cylinderGeometry args={[0.3, 0.34, 0.2, 20]} />
          </mesh>
          {/* Turban dome */}
          <mesh position={[0, 0.12, 0]} material={turbanMat}>
            <sphereGeometry args={[0.3, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
          </mesh>
          {/* Turban wrap accent */}
          <mesh position={[0, 0.02, 0]} material={new THREE.MeshStandardMaterial({ color: "#FF8C42", roughness: 0.8 })}>
            <torusGeometry args={[0.3, 0.035, 8, 32]} />
          </mesh>
        </group>

        {/* ── EYES ── */}
        {/* Left eye socket */}
        <mesh position={[-0.115, 0.06, 0.27]} material={eyeWhiteMat}>
          <sphereGeometry args={[0.065, 14, 12]} />
        </mesh>
        {/* Left iris + pupil */}
        <mesh ref={eyeLRef} position={[-0.115, 0.06, 0.325]}>
          <sphereGeometry args={[0.038, 12, 10]} />
          <meshStandardMaterial color="#3B2314" roughness={0.3} metalness={0.1} />
        </mesh>
        <mesh position={[-0.115, 0.06, 0.335]}>
          <sphereGeometry args={[0.018, 10, 8]} />
          <meshStandardMaterial color="#0A0A0A" roughness={0.1} />
        </mesh>
        {/* Eye highlight */}
        <mesh position={[-0.106, 0.068, 0.338]}>
          <sphereGeometry args={[0.007, 6, 6]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>

        {/* Right eye socket */}
        <mesh position={[0.115, 0.06, 0.27]} material={eyeWhiteMat}>
          <sphereGeometry args={[0.065, 14, 12]} />
        </mesh>
        {/* Right iris + pupil */}
        <mesh ref={eyeRRef} position={[0.115, 0.06, 0.325]}>
          <sphereGeometry args={[0.038, 12, 10]} />
          <meshStandardMaterial color="#3B2314" roughness={0.3} metalness={0.1} />
        </mesh>
        <mesh position={[0.115, 0.06, 0.335]}>
          <sphereGeometry args={[0.018, 10, 8]} />
          <meshStandardMaterial color="#0A0A0A" roughness={0.1} />
        </mesh>
        <mesh position={[0.124, 0.068, 0.338]}>
          <sphereGeometry args={[0.007, 6, 6]} />
          <meshStandardMaterial color="#FFFFFF" />
        </mesh>

        {/* ── EYELIDS ── */}
        <mesh ref={eyelidLRef} position={[-0.115, 0.068, 0.33]}>
          <sphereGeometry args={[0.068, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
          <meshStandardMaterial color="#C68642" roughness={0.7} side={THREE.FrontSide} />
        </mesh>
        <mesh ref={eyelidRRef} position={[0.115, 0.068, 0.33]}>
          <sphereGeometry args={[0.068, 12, 6, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
          <meshStandardMaterial color="#C68642" roughness={0.7} side={THREE.FrontSide} />
        </mesh>

        {/* Eyebrows */}
        <mesh position={[-0.115, 0.135, 0.285]} rotation={[0, 0, 0.1]}>
          <boxGeometry args={[0.12, 0.022, 0.025]} />
          <meshStandardMaterial color="#1A0A00" roughness={0.9} />
        </mesh>
        <mesh position={[0.115, 0.135, 0.285]} rotation={[0, 0, -0.1]}>
          <boxGeometry args={[0.12, 0.022, 0.025]} />
          <meshStandardMaterial color="#1A0A00" roughness={0.9} />
        </mesh>

        {/* ── NOSE ── */}
        <mesh position={[0, -0.01, 0.305]}>
          <sphereGeometry args={[0.048, 10, 8]} />
          <meshStandardMaterial color="#B5742A" roughness={0.7} />
        </mesh>
        {/* Nostrils */}
        <mesh position={[-0.028, -0.025, 0.305]}>
          <sphereGeometry args={[0.018, 8, 6]} />
          <meshStandardMaterial color="#A0622A" roughness={0.8} />
        </mesh>
        <mesh position={[0.028, -0.025, 0.305]}>
          <sphereGeometry args={[0.018, 8, 6]} />
          <meshStandardMaterial color="#A0622A" roughness={0.8} />
        </mesh>

        {/* ── MUSTACHE ── */}
        <mesh position={[-0.045, -0.072, 0.3]} rotation={[0, 0, 0.3]}>
          <torusGeometry args={[0.038, 0.012, 8, 12, Math.PI * 0.7]} />
          <meshStandardMaterial color="#2C1810" roughness={0.9} />
        </mesh>
        <mesh position={[0.045, -0.072, 0.3]} rotation={[0, 0, -0.3]}>
          <torusGeometry args={[0.038, 0.012, 8, 12, Math.PI * 0.7]} />
          <meshStandardMaterial color="#2C1810" roughness={0.9} />
        </mesh>

        {/* ── MOUTH + JAW ── */}
        {/* Upper lip */}
        <mesh position={[0, -0.1, 0.295]}>
          <boxGeometry args={[0.12, 0.028, 0.03]} />
          <meshStandardMaterial color="#A0522D" roughness={0.7} />
        </mesh>

        {/* Jaw (animated) */}
        <group ref={jawRef} position={[0, -0.13, 0]}>
          {/* Lower lip */}
          <mesh position={[0, 0, 0.295]}>
            <boxGeometry args={[0.11, 0.025, 0.03]} />
            <meshStandardMaterial color="#A0522D" roughness={0.7} />
          </mesh>
          {/* Chin */}
          <mesh position={[0, -0.06, 0.22]}>
            <sphereGeometry args={[0.08, 10, 8]} />
            <meshStandardMaterial color="#C68642" roughness={0.7} />
          </mesh>
          {/* Teeth (upper row visible when mouth opens) */}
          <mesh position={[0, 0.015, 0.29]}>
            <boxGeometry args={[0.09, 0.02, 0.02]} />
            <meshStandardMaterial color="#F8F4E8" roughness={0.4} />
          </mesh>
        </group>

        {/* ── EAR + Earring ── */}
        <mesh position={[-0.315, 0.02, 0]} material={skinMat}>
          <sphereGeometry args={[0.055, 10, 8]} />
        </mesh>
        <mesh position={[0.315, 0.02, 0]} material={skinMat}>
          <sphereGeometry args={[0.055, 10, 8]} />
        </mesh>
      </group>

      {/* ── GROUND SHADOW HINT ── */}
      <mesh position={[0, -0.62, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.45, 32]} />
        <meshStandardMaterial color="#000000" opacity={0.12} transparent />
      </mesh>
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
// Particle Effects (ambient floating particles)
// ─────────────────────────────────────────────────────────────
function AmbientParticles({ isSpeaking }: { isSpeaking: boolean }) {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 80;

  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 6;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 6;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 4 - 1;
  }

  useFrame((_, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * (isSpeaking ? 0.04 : 0.012);
      pointsRef.current.rotation.x += delta * 0.005;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions as unknown as Float32Array<ArrayBuffer>, 3]} />
      </bufferGeometry>
      <pointsMaterial
        size={0.025}
        color={isSpeaking ? "#4ade80" : "#34d399"}
        transparent
        opacity={isSpeaking ? 0.7 : 0.3}
        sizeAttenuation
      />
    </points>
  );
}

// ─────────────────────────────────────────────────────────────
// Sound Wave Ring (appears behind avatar while speaking)
// ─────────────────────────────────────────────────────────────
function SoundWaveRings({ isSpeaking }: { isSpeaking: boolean }) {
  const rings = [useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null), useRef<THREE.Mesh>(null)];

  useFrame((_, delta) => {
    rings.forEach((ring, i) => {
      if (!ring.current) return;
      if (isSpeaking) {
        const phase = (Date.now() / 1000 + i * 0.5) % 2;
        ring.current.scale.setScalar(1 + phase * 0.8);
        (ring.current.material as THREE.MeshStandardMaterial).opacity = Math.max(0, 0.4 - phase * 0.2);
      } else {
        ring.current.scale.setScalar(THREE.MathUtils.lerp(ring.current.scale.x, 1, 0.05));
        (ring.current.material as THREE.MeshStandardMaterial).opacity = THREE.MathUtils.lerp(
          (ring.current.material as THREE.MeshStandardMaterial).opacity, 0, 0.05
        );
      }
    });
  });

  return (
    <group position={[0, 0.2, -0.5]}>
      {rings.map((ring, i) => (
        <mesh key={i} ref={ring} rotation={[0, 0, 0]}>
          <torusGeometry args={[1.1, 0.02, 8, 48]} />
          <meshStandardMaterial color="#4ade80" transparent opacity={0} emissive="#4ade80" emissiveIntensity={0.5} />
        </mesh>
      ))}
    </group>
  );
}

// ─────────────────────────────────────────────────────────────
// Main Scene Wrapper (exported)
// ─────────────────────────────────────────────────────────────
interface AvatarSceneProps {
  isSpeaking: boolean;
  isListening: boolean;
  isThinking: boolean;
  mouthOpenRef: React.MutableRefObject<number>;
}

export default function AvatarScene({ isSpeaking, isListening, isThinking, mouthOpenRef }: AvatarSceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 0.8, 2.8], fov: 42 }}
      style={{ width: "100%", height: "100%" }}
      gl={{ antialias: true, alpha: true }}
      shadows
    >
      {/* Lighting */}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[3, 5, 3]}
        intensity={1.4}
        castShadow
        shadow-mapSize={[1024, 1024]}
        color="#FFF8F0"
      />
      <pointLight position={[-2, 2, 2]} intensity={0.5} color="#4ade80" />
      <pointLight position={[2, -1, 1]} intensity={0.3} color="#FF6B35" />
      {/* Rim light */}
      <directionalLight position={[-3, 1, -2]} intensity={0.4} color="#A0D8FF" />

      <AmbientParticles isSpeaking={isSpeaking} />
      <SoundWaveRings isSpeaking={isSpeaking} />

      <FarmerAvatar
        isSpeaking={isSpeaking}
        isListening={isListening}
        isThinking={isThinking}
        mouthOpenRef={mouthOpenRef}
      />

      <ContactShadows
        position={[0, -2.42, 0]}
        opacity={0.4}
        scale={4}
        blur={2.5}
        far={4}
        color="#000000"
      />

      <OrbitControls
        enableZoom={false}
        enablePan={false}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 1.8}
        target={[0, 0.5, 0]}
        autoRotate={!isSpeaking && !isListening}
        autoRotateSpeed={0.4}
      />
    </Canvas>
  );
}
