import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Compass, 
  Grid3X3, 
  DoorClosed, 
  Maximize2,
  Sparkles,
  Layers,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';

interface Room3DSceneProps {
  onExitRoom: () => void;
  onOpenMenu: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  playFootstep: () => void;
}

export const Room3DScene: React.FC<Room3DSceneProps> = ({
  onExitRoom,
  onOpenMenu,
  soundEnabled,
  onToggleSound,
  playFootstep,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const joystickBaseRef = useRef<HTMLDivElement>(null);

  // Compass heading and position for HUD
  const [headingDegrees, setHeadingDegrees] = useState(0);
  const [playerCoord, setPlayerCoord] = useState({ x: 0, z: 2.5 });
  const [isJoyActive, setIsJoyActive] = useState(false);
  const [joyOffset, setJoyOffset] = useState({ x: 0, y: 0 });

  // Joystick touch tracking refs
  const joyTouchIdRef = useRef<number | null>(null);
  const joyVectorRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  
  // Look-around touch tracking refs
  const lookTouchIdRef = useRef<number | null>(null);
  const lookLastPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Mouse look fallback tracking
  const isMouseDownRef = useRef(false);
  const mouseLastPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Three.js internal state refs
  const cameraYawRef = useRef<number>(Math.PI); // Facing inward from entrance
  const cameraPitchRef = useRef<number>(0);
  const targetYawRef = useRef<number>(Math.PI);
  const targetPitchRef = useRef<number>(0);

  const playerPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 1.6, 3.8));
  const walkDistanceRef = useRef<number>(0);
  const lastFootstepDistRef = useRef<number>(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // --- 1. SCENE & RENDERER SETUP ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0c16);
    scene.fog = new THREE.FogExp2(0x0a0c16, 0.05);

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const camera = new THREE.PerspectiveCamera(68, width / height, 0.1, 100);
    camera.position.copy(playerPosRef.current);
    camera.rotation.order = 'YXZ';

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // --- 2. PROCEDURAL TEXTURES ---
    // Floor Grid Canvas Texture
    const createFloorTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (!ctx) return new THREE.Texture();

      // Base tile color
      ctx.fillStyle = '#0f1422';
      ctx.fillRect(0, 0, 512, 512);

      // Tile bevel
      ctx.strokeStyle = '#1e2840';
      ctx.lineWidth = 4;
      ctx.strokeRect(4, 4, 504, 504);

      // Cyberpunk grid accent lines
      ctx.strokeStyle = 'rgba(244, 114, 182, 0.18)';
      ctx.lineWidth = 2;
      ctx.strokeRect(16, 16, 480, 480);

      // Subtle center crosshair in each tile
      ctx.fillStyle = 'rgba(251, 191, 36, 0.25)';
      ctx.fillRect(254, 246, 4, 20);
      ctx.fillRect(246, 254, 20, 4);

      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(8, 10);
      return texture;
    };

    // Ceiling Acoustic Texture
    const createCeilingTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (!ctx) return new THREE.Texture();

      ctx.fillStyle = '#0d111b';
      ctx.fillRect(0, 0, 256, 256);

      ctx.strokeStyle = '#182033';
      ctx.lineWidth = 6;
      ctx.strokeRect(0, 0, 256, 256);

      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(6, 8);
      return texture;
    };

    const floorTexture = createFloorTexture();
    const ceilingTexture = createCeilingTexture();

    // --- 3. ROOM ARCHITECTURE ---
    const ROOM_WIDTH = 9.0;
    const ROOM_HEIGHT = 3.6;
    const ROOM_DEPTH = 11.0;
    const roomGroup = new THREE.Group();

    // Floor Mesh
    const floorGeo = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughness: 0.4,
      metalness: 0.3,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    roomGroup.add(floor);

    // Ceiling Mesh
    const ceilingGeo = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH);
    const ceilingMat = new THREE.MeshStandardMaterial({
      map: ceilingTexture,
      roughness: 0.8,
      metalness: 0.1,
    });
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceiling.position.y = ROOM_HEIGHT;
    ceiling.rotation.x = Math.PI / 2;
    roomGroup.add(ceiling);

    // Wall Material (Slate Studio Wall)
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x141824,
      roughness: 0.65,
      metalness: 0.15,
    });

    // Front Wall (Z = -ROOM_DEPTH / 2)
    const frontWallGeo = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_HEIGHT);
    const frontWall = new THREE.Mesh(frontWallGeo, wallMat);
    frontWall.position.set(0, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2);
    frontWall.receiveShadow = true;
    roomGroup.add(frontWall);

    // Front Wall Cyber Accent Glow Strip
    const frontNeonGeo = new THREE.BoxGeometry(ROOM_WIDTH * 0.7, 0.08, 0.04);
    const frontNeonMat = new THREE.MeshBasicMaterial({ color: 0xf472b6 });
    const frontNeon = new THREE.Mesh(frontNeonGeo, frontNeonMat);
    frontNeon.position.set(0, 2.2, -ROOM_DEPTH / 2 + 0.03);
    roomGroup.add(frontNeon);

    // Front Wall Holographic Billboard / Logo Plate
    const frontBoardGeo = new THREE.PlaneGeometry(3.6, 1.4);
    const frontBoardMat = new THREE.MeshBasicMaterial({
      color: 0x22132e,
      side: THREE.DoubleSide,
    });
    const frontBoard = new THREE.Mesh(frontBoardGeo, frontBoardMat);
    frontBoard.position.set(0, 2.3, -ROOM_DEPTH / 2 + 0.05);
    roomGroup.add(frontBoard);

    // Left Wall (X = -ROOM_WIDTH / 2)
    const leftWallGeo = new THREE.PlaneGeometry(ROOM_DEPTH, ROOM_HEIGHT);
    const leftWall = new THREE.Mesh(leftWallGeo, wallMat);
    leftWall.position.set(-ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    roomGroup.add(leftWall);

    // Right Wall (X = ROOM_WIDTH / 2)
    const rightWallGeo = new THREE.PlaneGeometry(ROOM_DEPTH, ROOM_HEIGHT);
    const rightWall = new THREE.Mesh(rightWallGeo, wallMat);
    rightWall.position.set(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    roomGroup.add(rightWall);

    // Back Wall With Entrance Doorway (Z = ROOM_DEPTH / 2)
    // Left piece of back wall
    const backWallLeftGeo = new THREE.PlaneGeometry((ROOM_WIDTH - 1.8) / 2, ROOM_HEIGHT);
    const backWallLeft = new THREE.Mesh(backWallLeftGeo, wallMat);
    backWallLeft.position.set(-ROOM_WIDTH / 2 + (ROOM_WIDTH - 1.8) / 4, ROOM_HEIGHT / 2, ROOM_DEPTH / 2);
    backWallLeft.rotation.y = Math.PI;
    roomGroup.add(backWallLeft);

    // Right piece of back wall
    const backWallRightGeo = new THREE.PlaneGeometry((ROOM_WIDTH - 1.8) / 2, ROOM_HEIGHT);
    const backWallRight = new THREE.Mesh(backWallRightGeo, wallMat);
    backWallRight.position.set(ROOM_WIDTH / 2 - (ROOM_WIDTH - 1.8) / 4, ROOM_HEIGHT / 2, ROOM_DEPTH / 2);
    backWallRight.rotation.y = Math.PI;
    roomGroup.add(backWallRight);

    // Header piece above doorway
    const backWallHeaderGeo = new THREE.PlaneGeometry(1.8, ROOM_HEIGHT - 2.5);
    const backWallHeader = new THREE.Mesh(backWallHeaderGeo, wallMat);
    backWallHeader.position.set(0, ROOM_HEIGHT - (ROOM_HEIGHT - 2.5) / 2, ROOM_DEPTH / 2);
    backWallHeader.rotation.y = Math.PI;
    roomGroup.add(backWallHeader);

    // Door Frame
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x3d271d, roughness: 0.5 });
    const frameGeoL = new THREE.BoxGeometry(0.12, 2.5, 0.18);
    const frameL = new THREE.Mesh(frameGeoL, frameMat);
    frameL.position.set(-0.85, 1.25, ROOM_DEPTH / 2);
    roomGroup.add(frameL);

    const frameR = new THREE.Mesh(frameGeoL, frameMat);
    frameR.position.set(0.85, 1.25, ROOM_DEPTH / 2);
    roomGroup.add(frameR);

    const frameGeoT = new THREE.BoxGeometry(1.82, 0.12, 0.18);
    const frameT = new THREE.Mesh(frameGeoT, frameMat);
    frameT.position.set(0, 2.5, ROOM_DEPTH / 2);
    roomGroup.add(frameT);

    // Open Door Leaf (The door the player just entered through!)
    const doorLeafGeo = new THREE.BoxGeometry(1.5, 2.45, 0.08);
    const doorLeafMat = new THREE.MeshStandardMaterial({
      color: 0x241812,
      roughness: 0.35,
      metalness: 0.1,
    });
    const doorLeaf = new THREE.Mesh(doorLeafGeo, doorLeafMat);
    // Hinge at -0.78, rotated open into the room
    doorLeaf.position.set(0.75, 1.23, 0); // local offset from hinge pivot
    const doorPivot = new THREE.Group();
    doorPivot.position.set(-0.78, 0, ROOM_DEPTH / 2);
    doorPivot.rotation.y = -Math.PI * 0.45; // open ~80 degrees
    doorPivot.add(doorLeaf);

    // Brass Spherical Knob on the open door
    const knobMat = new THREE.MeshStandardMaterial({
      color: 0xd4af37,
      roughness: 0.2,
      metalness: 0.9,
    });
    const knobGeo = new THREE.SphereGeometry(0.06, 16, 16);
    const knob = new THREE.Mesh(knobGeo, knobMat);
    knob.position.set(1.35, 1.15, 0.08);
    doorPivot.add(knob);

    roomGroup.add(doorPivot);

    // Outer Void Starfield Plane behind door
    const voidMat = new THREE.MeshBasicMaterial({ color: 0x030611 });
    const voidGeo = new THREE.PlaneGeometry(6, 5);
    const voidMesh = new THREE.Mesh(voidGeo, voidMat);
    voidMesh.position.set(0, 1.5, ROOM_DEPTH / 2 + 0.8);
    roomGroup.add(voidMesh);

    // LED Baseboards (Neon Skirting Lines)
    const baseboardPinkMat = new THREE.MeshBasicMaterial({ color: 0xff3888 });
    const baseboardCyanMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });

    // Left baseboard
    const bbLeftGeo = new THREE.BoxGeometry(0.05, 0.06, ROOM_DEPTH);
    const bbLeft = new THREE.Mesh(bbLeftGeo, baseboardPinkMat);
    bbLeft.position.set(-ROOM_WIDTH / 2 + 0.03, 0.03, 0);
    roomGroup.add(bbLeft);

    // Right baseboard
    const bbRight = new THREE.Mesh(bbLeftGeo, baseboardCyanMat);
    bbRight.position.set(ROOM_WIDTH / 2 - 0.03, 0.03, 0);
    roomGroup.add(bbRight);

    // Front baseboard
    const bbFrontGeo = new THREE.BoxGeometry(ROOM_WIDTH, 0.06, 0.05);
    const bbFront = new THREE.Mesh(bbFrontGeo, baseboardPinkMat);
    bbFront.position.set(0, 0.03, -ROOM_DEPTH / 2 + 0.03);
    roomGroup.add(bbFront);

    // Pillars along the walls
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x1b2233, roughness: 0.5 });
    [-3.2, 0, 3.2].forEach((zPos) => {
      // Left side pillar
      const pilGeo = new THREE.BoxGeometry(0.2, ROOM_HEIGHT, 0.4);
      const pilL = new THREE.Mesh(pilGeo, pillarMat);
      pilL.position.set(-ROOM_WIDTH / 2 + 0.1, ROOM_HEIGHT / 2, zPos);
      roomGroup.add(pilL);

      // Right side pillar
      const pilR = new THREE.Mesh(pilGeo, pillarMat);
      pilR.position.set(ROOM_WIDTH / 2 - 0.1, ROOM_HEIGHT / 2, zPos);
      roomGroup.add(pilR);
    });

    // Floating Center Hologram: CubePixel Rotating Emblem Box
    const holoCubeGroup = new THREE.Group();
    holoCubeGroup.position.set(0, 1.8, -1.5);

    const holoGeo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
    const holoWireMat = new THREE.MeshBasicMaterial({
      color: 0xf472b6,
      wireframe: true,
      transparent: true,
      opacity: 0.75,
    });
    const holoWire = new THREE.Mesh(holoGeo, holoWireMat);
    holoCubeGroup.add(holoWire);

    const holoCoreGeo = new THREE.BoxGeometry(0.45, 0.45, 0.45);
    const holoCoreMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.5,
    });
    const holoCore = new THREE.Mesh(holoCoreGeo, holoCoreMat);
    holoCubeGroup.add(holoCore);

    roomGroup.add(holoCubeGroup);

    scene.add(roomGroup);

    // --- 4. LIGHTING RIG ---
    // Warm Ambient Light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
    scene.add(ambientLight);

    // Ceiling Main Downlight
    const ceilingLight = new THREE.PointLight(0xfff5ea, 2.4, 15, 1.5);
    ceilingLight.position.set(0, ROOM_HEIGHT - 0.2, 0);
    ceilingLight.castShadow = true;
    ceilingLight.shadow.mapSize.width = 1024;
    ceilingLight.shadow.mapSize.height = 1024;
    scene.add(ceilingLight);

    // Ceiling Light Fixture (Visual mesh)
    const fixGeo = new THREE.CylinderGeometry(0.9, 0.9, 0.08, 24);
    const fixMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const fixture = new THREE.Mesh(fixGeo, fixMat);
    fixture.position.set(0, ROOM_HEIGHT - 0.04, 0);
    scene.add(fixture);

    // Pink Neon Glow Light (Left side)
    const pinkLight = new THREE.PointLight(0xff3888, 1.8, 8);
    pinkLight.position.set(-ROOM_WIDTH / 2 + 1, 1.2, 0);
    scene.add(pinkLight);

    // Cyan Neon Glow Light (Right side)
    const cyanLight = new THREE.PointLight(0x38bdf8, 1.8, 8);
    cyanLight.position.set(ROOM_WIDTH / 2 - 1, 1.2, 0);
    scene.add(cyanLight);

    // Golden Entrance Light spilling from the doorway
    const doorGlowLight = new THREE.PointLight(0xffbf69, 2.2, 8);
    doorGlowLight.position.set(0, 1.8, ROOM_DEPTH / 2 - 0.5);
    scene.add(doorGlowLight);

    // --- 5. ANIMATION & RENDER LOOP ---
    let animationId: number;
    let clock = new THREE.Clock();

    const renderLoop = () => {
      const delta = Math.min(clock.getDelta(), 0.1);

      // Smooth camera yaw and pitch interpolation
      cameraYawRef.current = THREE.MathUtils.lerp(cameraYawRef.current, targetYawRef.current, 0.22);
      cameraPitchRef.current = THREE.MathUtils.lerp(cameraPitchRef.current, targetPitchRef.current, 0.22);

      // Update camera orientation
      camera.rotation.y = cameraYawRef.current;
      camera.rotation.x = cameraPitchRef.current;

      // Animate floating hologram
      holoCubeGroup.rotation.y += delta * 1.2;
      holoCubeGroup.rotation.x += delta * 0.6;
      holoCubeGroup.position.y = 1.8 + Math.sin(clock.getElapsedTime() * 2) * 0.08;

      // Movement logic via virtual joystick
      const joyX = joyVectorRef.current.x;
      const joyY = joyVectorRef.current.y;
      const isMoving = Math.abs(joyX) > 0.05 || Math.abs(joyY) > 0.05;

      if (isMoving) {
        const moveSpeed = 3.2; // meters per second
        const yaw = cameraYawRef.current;

        // Forward vector on XZ plane
        const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
        // Right vector on XZ plane
        const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));

        // Movement direction: -joyY means forward when stick is pushed up
        const moveDir = new THREE.Vector3()
          .addScaledVector(forward, -joyY)
          .addScaledVector(right, joyX);

        if (moveDir.lengthSq() > 0.001) {
          moveDir.normalize();
          const distThisFrame = moveSpeed * delta;
          playerPosRef.current.x += moveDir.x * distThisFrame;
          playerPosRef.current.z += moveDir.z * distThisFrame;

          // Boundary collision clamping (Stay inside the empty room!)
          const PADDING_X = 0.7;
          const PADDING_Z = 0.8;
          const minX = -ROOM_WIDTH / 2 + PADDING_X;
          const maxX = ROOM_WIDTH / 2 - PADDING_X;
          const minZ = -ROOM_DEPTH / 2 + PADDING_Z;
          const maxZ = ROOM_DEPTH / 2 - PADDING_Z;

          playerPosRef.current.x = THREE.MathUtils.clamp(playerPosRef.current.x, minX, maxX);
          playerPosRef.current.z = THREE.MathUtils.clamp(playerPosRef.current.z, minZ, maxZ);

          walkDistanceRef.current += distThisFrame;

          // Soft footstep sound every ~0.85m
          if (walkDistanceRef.current - lastFootstepDistRef.current > 0.85) {
            lastFootstepDistRef.current = walkDistanceRef.current;
            playFootstep();
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              try { navigator.vibrate(6); } catch {}
            }
          }
        }
      }

      // Gentle walking bobbing
      const walkBob = Math.sin(walkDistanceRef.current * 7) * 0.025;
      camera.position.set(
        playerPosRef.current.x,
        playerPosRef.current.y + walkBob,
        playerPosRef.current.z
      );

      // Periodic HUD sync
      const deg = Math.round(((-cameraYawRef.current * (180 / Math.PI)) % 360 + 360) % 360);
      setHeadingDegrees(deg);
      setPlayerCoord({
        x: Number(playerPosRef.current.x.toFixed(1)),
        z: Number(playerPosRef.current.z.toFixed(1)),
      });

      renderer.render(scene, camera);
      animationId = requestAnimationFrame(renderLoop);
    };

    animationId = requestAnimationFrame(renderLoop);

    // Window resize handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // --- CLEANUP ON UNMOUNT ---
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);

      // Dispose Geometries and Materials
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          if (obj.geometry) obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else if (obj.material) {
            obj.material.dispose();
          }
        }
      });

      floorTexture.dispose();
      ceilingTexture.dispose();
      renderer.dispose();

      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [playFootstep]);

  // --- TOUCH CONTROLS (SEPARATED JOYSTICK & LOOK-AROUND) ---
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const joyBase = joystickBaseRef.current;
    if (!joyBase) return;
    const baseRect = joyBase.getBoundingClientRect();
    const joyRadius = baseRect.width / 2;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const distX = touch.clientX - (baseRect.left + joyRadius);
      const distY = touch.clientY - (baseRect.top + joyRadius);
      const dist = Math.sqrt(distX * distX + distY * distY);

      // Check if touch starts on or near joystick (within 1.4x radius)
      if (dist <= joyRadius * 1.5 && joyTouchIdRef.current === null) {
        joyTouchIdRef.current = touch.identifier;
        setIsJoyActive(true);
        updateJoystickVector(distX, distY, joyRadius);
      } else if (lookTouchIdRef.current === null) {
        // Otherwise, this touch is for looking around
        lookTouchIdRef.current = touch.identifier;
        lookLastPosRef.current = { x: touch.clientX, y: touch.clientY };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const joyBase = joystickBaseRef.current;
    if (!joyBase) return;
    const baseRect = joyBase.getBoundingClientRect();
    const joyRadius = baseRect.width / 2;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];

      // Update Joystick
      if (touch.identifier === joyTouchIdRef.current) {
        const distX = touch.clientX - (baseRect.left + joyRadius);
        const distY = touch.clientY - (baseRect.top + joyRadius);
        updateJoystickVector(distX, distY, joyRadius);
      }

      // Update Look-Around
      if (touch.identifier === lookTouchIdRef.current) {
        const deltaX = touch.clientX - lookLastPosRef.current.x;
        const deltaY = touch.clientY - lookLastPosRef.current.y;
        lookLastPosRef.current = { x: touch.clientX, y: touch.clientY };

        const sensitivity = 0.0055;
        targetYawRef.current -= deltaX * sensitivity;
        targetPitchRef.current -= deltaY * sensitivity;

        // Clamp pitch to [-60deg, +60deg]
        targetPitchRef.current = Math.max(-1.05, Math.min(1.05, targetPitchRef.current));
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];

      if (touch.identifier === joyTouchIdRef.current) {
        joyTouchIdRef.current = null;
        setIsJoyActive(false);
        setJoyOffset({ x: 0, y: 0 });
        joyVectorRef.current = { x: 0, y: 0 };
      }

      if (touch.identifier === lookTouchIdRef.current) {
        lookTouchIdRef.current = null;
      }
    }
  };

  const updateJoystickVector = (dx: number, dy: number, maxRadius: number) => {
    const dist = Math.sqrt(dx * dx + dy * dy);
    const clampedDist = Math.min(dist, maxRadius);
    const angle = Math.atan2(dy, dx);

    const clampedX = Math.cos(angle) * clampedDist;
    const clampedY = Math.sin(angle) * clampedDist;

    setJoyOffset({ x: clampedX, y: clampedY });

    // Normalized vector [-1, 1]
    joyVectorRef.current = {
      x: clampedX / maxRadius,
      y: clampedY / maxRadius,
    };
  };

  // --- DESKTOP MOUSE LOOK SUPPORT ---
  const handleMouseDown = (e: React.MouseEvent) => {
    isMouseDownRef.current = true;
    mouseLastPosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDownRef.current) return;
    const deltaX = e.clientX - mouseLastPosRef.current.x;
    const deltaY = e.clientY - mouseLastPosRef.current.y;
    mouseLastPosRef.current = { x: e.clientX, y: e.clientY };

    const sensitivity = 0.004;
    targetYawRef.current -= deltaX * sensitivity;
    targetPitchRef.current -= deltaY * sensitivity;
    targetPitchRef.current = Math.max(-1.05, Math.min(1.05, targetPitchRef.current));
  };

  const handleMouseUp = () => {
    isMouseDownRef.current = false;
  };

  // Reset view to look forward
  const handleResetCameraView = () => {
    targetYawRef.current = Math.PI;
    targetPitchRef.current = 0;
  };

  // Keyboard navigation for desktop testing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'w' || key === 'arrowup') joyVectorRef.current.y = -1;
      if (key === 's' || key === 'arrowdown') joyVectorRef.current.y = 1;
      if (key === 'a' || key === 'arrowleft') joyVectorRef.current.x = -1;
      if (key === 'd' || key === 'arrowright') joyVectorRef.current.x = 1;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'w' || key === 'arrowup' || key === 's' || key === 'arrowdown') {
        joyVectorRef.current.y = 0;
      }
      if (key === 'a' || key === 'arrowleft' || key === 'd' || key === 'arrowright') {
        joyVectorRef.current.x = 0;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <div 
      className="absolute inset-0 w-full h-full select-none overflow-hidden touch-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* 3D WebGL Canvas Container */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Subtle Viewport Center Gaze Reticle */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-40">
        <div className="w-2 h-2 rounded-full border border-pink-300/80 bg-white/20" />
      </div>

      {/* --- HUD OVERLAY --- */}

      {/* Top Bar: Bearing, Coords, Actions */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-30">
        <div className="flex items-center gap-2">
          {/* Compass & Position Info */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/15 text-white shadow-lg pointer-events-auto">
            <Compass className="w-3.5 h-3.5 text-pink-400 animate-spin" style={{ animationDuration: '24s' }} />
            <span className="font-mono text-[11px] font-bold text-amber-300">
              {headingDegrees.toString().padStart(3, '0')}°
            </span>
            <span className="text-[10px] text-white/40 font-mono">|</span>
            <span className="font-mono text-[10px] text-white/70">
              X:{playerCoord.x} Z:{playerCoord.z}
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-pink-500/20 border border-pink-400/30 text-pink-200 text-[10px] font-mono font-bold">
            <Sparkles className="w-3 h-3 text-amber-300" />
            <span>空房間視角</span>
          </div>
        </div>

        {/* Top Right Control Buttons */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            className="p-2 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 text-white active:scale-95 transition-all shadow-md"
            title="音效開關"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-amber-300" /> : <VolumeX className="w-3.5 h-3.5 text-white/40" />}
          </button>

          {/* Reset Camera View Button */}
          <button
            onClick={handleResetCameraView}
            className="p-2 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 text-white/80 active:scale-95 transition-all shadow-md"
            title="重設視角"
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-300" />
          </button>

          {/* Explore Hub Menu Button */}
          <button
            onClick={onOpenMenu}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-rose-500 hover:brightness-110 text-white font-mono font-bold text-xs tracking-wider flex items-center gap-1.5 border border-pink-300/40 shadow-[0_0_20px_rgba(244,114,182,0.4)] active:scale-95 transition-all"
          >
            <Layers className="w-3.5 h-3.5 text-amber-200" />
            <span>探索選單</span>
          </button>

          {/* Exit Room / Return to Door Landing */}
          <button
            onClick={onExitRoom}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white/90 font-mono text-xs font-bold tracking-wider flex items-center gap-1.5 active:scale-95 transition-all shadow-md"
          >
            <DoorClosed className="w-3.5 h-3.5 text-pink-300" />
            <span>退出</span>
          </button>
        </div>
      </div>

      {/* Floating Center Notification Pill */}
      <div className="absolute top-16 left-0 right-0 flex justify-center pointer-events-none z-20">
        <div className="px-3.5 py-1 rounded-full bg-slate-900/75 backdrop-blur-md border border-white/15 text-white text-[10px] font-mono tracking-wider flex items-center gap-1.5 shadow-lg animate-fade-in">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-ping" />
          <span>滑動畫面轉動視角 • 搖桿移動 (雙手可同時操作)</span>
        </div>
      </div>

      {/* --- VIRTUAL JOYSTICK (BOTTOM-LEFT) --- */}
      <div className="absolute bottom-6 left-6 z-30 select-none">
        <div
          ref={joystickBaseRef}
          className={`w-28 h-28 rounded-full border-2 relative flex items-center justify-center transition-colors shadow-[0_4px_25px_rgba(0,0,0,0.6)] backdrop-blur-md ${
            isJoyActive 
              ? 'bg-pink-500/20 border-pink-400/80 shadow-[0_0_25px_rgba(244,114,182,0.4)]' 
              : 'bg-black/40 border-white/25 hover:border-white/40'
          }`}
          style={{ touchAction: 'none' }}
        >
          {/* Subtle Direction Indicators */}
          <ArrowUp className="absolute top-1.5 w-3 h-3 text-white/30" />
          <ArrowDown className="absolute bottom-1.5 w-3 h-3 text-white/30" />
          <ArrowLeft className="absolute left-1.5 w-3 h-3 text-white/30" />
          <ArrowRight className="absolute right-1.5 w-3 h-3 text-white/30" />

          {/* Inner Joystick Ring */}
          <div className="w-16 h-16 rounded-full border border-dashed border-white/15 pointer-events-none" />

          {/* The Draggable Joystick Knob (搖桿球頭) */}
          <div
            className={`w-12 h-12 rounded-full absolute flex items-center justify-center transition-transform duration-75 shadow-lg pointer-events-none ${
              isJoyActive
                ? 'bg-gradient-to-tr from-pink-500 via-rose-500 to-amber-400 border-2 border-white scale-105 shadow-[0_0_15px_rgba(251,191,36,0.7)]'
                : 'bg-gradient-to-tr from-slate-700 to-slate-500 border border-white/40'
            }`}
            style={{
              transform: `translate3d(${joyOffset.x}px, ${joyOffset.y}px, 0)`,
            }}
          >
            <div className="w-3.5 h-3.5 rounded-full bg-white/50 shadow-inner" />
          </div>
        </div>

        {/* Joystick Label */}
        <div className="mt-2 text-center">
          <span className="text-[9px] font-mono text-white/50 tracking-widest block uppercase font-bold">
            {isJoyActive ? 'MOVING...' : 'JOYSTICK • 移動'}
          </span>
        </div>
      </div>

      {/* Bottom Right Swipe Gesture Indicator */}
      <div className="absolute bottom-6 right-6 pointer-events-none z-20 hidden xs:flex flex-col items-end gap-1">
        <div className="px-3 py-1 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 text-white/60 text-[10px] font-mono tracking-wider flex items-center gap-1.5">
          <span>右側滑動轉向視角</span>
          <Compass className="w-3.5 h-3.5 text-cyan-300" />
        </div>
      </div>
    </div>
  );
};
