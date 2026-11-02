import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Compass, 
  DoorClosed, 
  Layers,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Eye
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

  // Angle constraints: 60° horizontal range (±30° from forward), slight pitch down and up
  const CENTER_YAW = Math.PI; // Facing straight forward toward front wall
  const YAW_RANGE_HALF = (30 * Math.PI) / 180; // 30 degrees = 60 degrees total
  const MIN_YAW = CENTER_YAW - YAW_RANGE_HALF;
  const MAX_YAW = CENTER_YAW + YAW_RANGE_HALF;

  const MIN_PITCH = (-14 * Math.PI) / 180; // 稍微低頭 (~14 degrees down)
  const MAX_PITCH = (24 * Math.PI) / 180; // 抬頭 (~24 degrees up)

  // HUD state
  const [yawOffsetDeg, setYawOffsetDeg] = useState(0);
  const [pitchDeg, setPitchDeg] = useState(0);
  const [playerCoord, setPlayerCoord] = useState({ x: 0, z: 1.8 });
  const [isJoyActive, setIsJoyActive] = useState(false);
  const [joyOffset, setJoyOffset] = useState({ x: 0, y: 0 });

  // Touch tracking refs
  const joyTouchIdRef = useRef<number | null>(null);
  const joyVectorRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lookTouchIdRef = useRef<number | null>(null);
  const lookLastPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Desktop mouse look tracking
  const isMouseDownRef = useRef(false);
  const mouseLastPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Camera angles (clamped)
  const cameraYawRef = useRef<number>(CENTER_YAW);
  const cameraPitchRef = useRef<number>(0);
  const targetYawRef = useRef<number>(CENTER_YAW);
  const targetPitchRef = useRef<number>(0);

  // Player position in room: entrance is at +Z, front wall is at -Z
  const playerPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 1.55, 2.0));
  const walkDistanceRef = useRef<number>(0);
  const lastFootstepDistRef = useRef<number>(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // --- 1. SCENE SETUP ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1510);
    scene.fog = new THREE.FogExp2(0x1a1510, 0.035);

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 80);
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

    // A. Warm Wood Plank Floor (木地板 - Staggered parquet wood planks with grain)
    const createWoodFloorTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 1024;
      const ctx = canvas.getContext('2d');
      if (!ctx) return new THREE.Texture();

      // Background rich warm tone
      ctx.fillStyle = '#6b4324';
      ctx.fillRect(0, 0, 1024, 1024);

      const rows = 16;
      const rowHeight = 1024 / rows;
      const plankCols = 4;
      const colWidth = 1024 / plankCols;

      const woodPalette = [
        '#9e6439', '#8f572e', '#a86f43', '#834e26', 
        '#985f34', '#794520', '#b17748', '#885329'
      ];

      for (let r = 0; r < rows; r++) {
        const y = r * rowHeight;
        const colShift = (r % 2) * (colWidth / 2);

        for (let c = -1; c <= plankCols; c++) {
          const x = c * colWidth + colShift;
          const colorIdx = Math.floor((Math.sin(r * 12.3 + c * 33.7) * 0.5 + 0.5) * woodPalette.length);
          ctx.fillStyle = woodPalette[colorIdx % woodPalette.length];
          ctx.fillRect(x + 1, y + 1, colWidth - 2, rowHeight - 2);

          // Subtle horizontal wood grain streaks inside each plank
          ctx.fillStyle = 'rgba(0, 0, 0, 0.07)';
          for (let g = 3; g < rowHeight - 3; g += 5) {
            ctx.fillRect(x + 2, y + g, colWidth - 4, 1.5);
          }
          // Subtle lighter grain highlight
          ctx.fillStyle = 'rgba(255, 230, 190, 0.08)';
          for (let g = 6; g < rowHeight - 3; g += 8) {
            ctx.fillRect(x + 2, y + g, colWidth - 4, 1);
          }

          // Plank edge shadows (bevel seam)
          ctx.fillStyle = 'rgba(25, 12, 5, 0.45)';
          ctx.fillRect(x, y + rowHeight - 2, colWidth, 2);
          ctx.fillRect(x + colWidth - 2, y, 2, rowHeight);
        }
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(4, 5);
      return texture;
    };

    // B. Vertical Wood Slat Wall (直條木紋牆壁 - Architectural fluted timber slats)
    const createVerticalWoodSlatTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (!ctx) return new THREE.Texture();

      // Dark shadow groove base
      ctx.fillStyle = '#22130a';
      ctx.fillRect(0, 0, 512, 512);

      const numSlats = 16;
      const slatWidth = 512 / numSlats;
      const gap = 3;

      for (let s = 0; s < numSlats; s++) {
        const x = s * slatWidth;
        const w = slatWidth - gap;

        // Linear gradient across slat for 3D bevel look
        const grad = ctx.createLinearGradient(x, 0, x + w, 0);
        grad.addColorStop(0.0, '#ba8254'); // Left highlight edge
        grad.addColorStop(0.2, '#aa7246');
        grad.addColorStop(0.8, '#8e5b32');
        grad.addColorStop(1.0, '#5f3a1c'); // Right shadow edge

        ctx.fillStyle = grad;
        ctx.fillRect(x, 0, w, 512);

        // Fine vertical wood grain fibers
        ctx.fillStyle = 'rgba(50, 25, 10, 0.12)';
        for (let gx = 3; gx < w - 2; gx += 4) {
          ctx.fillRect(x + gx, 0, 1.2, 512);
        }
        ctx.fillStyle = 'rgba(255, 235, 210, 0.15)';
        ctx.fillRect(x + 1, 0, 1.5, 512); // Crisp highlight line on left of each slat
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      return texture;
    };

    // C. Tabletop Fine Grain Wood Texture
    const createTabletopWoodTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (!ctx) return new THREE.Texture();

      // Rich amber teak/oak base
      const bgGrad = ctx.createLinearGradient(0, 0, 1024, 0);
      bgGrad.addColorStop(0, '#7c4d29');
      bgGrad.addColorStop(0.5, '#915a31');
      bgGrad.addColorStop(1, '#6f4322');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1024, 512);

      // Horizontal wood grain lines
      for (let y = 0; y < 512; y += 3) {
        const alpha = Math.sin(y * 0.1) * 0.05 + 0.08;
        ctx.fillStyle = `rgba(35, 18, 8, ${alpha})`;
        ctx.fillRect(0, y, 1024, 1.5);
      }

      // Warm golden sheen accents
      ctx.fillStyle = 'rgba(255, 220, 160, 0.08)';
      ctx.fillRect(0, 40, 1024, 60);
      ctx.fillRect(0, 260, 1024, 50);

      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      return texture;
    };

    // D. Soft Ceiling Plaster Texture
    const createCeilingTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (!ctx) return new THREE.Texture();

      ctx.fillStyle = '#231e19';
      ctx.fillRect(0, 0, 256, 256);

      ctx.fillStyle = 'rgba(255, 240, 225, 0.03)';
      for (let i = 0; i < 400; i++) {
        const rx = Math.random() * 256;
        const ry = Math.random() * 256;
        ctx.fillRect(rx, ry, 2, 2);
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(4, 4);
      return texture;
    };

    const floorTexture = createWoodFloorTexture();
    const wallTexture = createVerticalWoodSlatTexture();
    const tabletopTexture = createTabletopWoodTexture();
    const ceilingTexture = createCeilingTexture();

    // --- 3. ROOM ARCHITECTURE (SLIGHTLY COMPACT DIMENSIONS) ---
    // User request: "稍微縮小房間" -> 5.8m width, 2.9m height, 6.8m depth
    const ROOM_WIDTH = 5.8;
    const ROOM_HEIGHT = 2.9;
    const ROOM_DEPTH = 6.8;

    const roomGroup = new THREE.Group();

    // 1. Wood Floor
    const floorGeo = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughness: 0.35, // Polished wood sheen
      metalness: 0.05,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    roomGroup.add(floor);

    // 2. Ceiling
    const ceilingGeo = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH);
    const ceilingMat = new THREE.MeshStandardMaterial({
      map: ceilingTexture,
      roughness: 0.9,
      metalness: 0.02,
    });
    const ceiling = new THREE.Mesh(ceilingGeo, ceilingMat);
    ceiling.position.y = ROOM_HEIGHT;
    ceiling.rotation.x = Math.PI / 2;
    roomGroup.add(ceiling);

    // 3. Vertical Wood Slat Wall Material
    const makeWallMat = (repeatX: number, repeatY: number) => {
      const tex = wallTexture.clone();
      tex.repeat.set(repeatX, repeatY);
      tex.needsUpdate = true;
      return new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.55,
        metalness: 0.08,
      });
    };

    // Front Wall (Z = -ROOM_DEPTH / 2)
    const frontWallGeo = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_HEIGHT);
    const frontWallMat = makeWallMat(ROOM_WIDTH * 2.2, 1);
    const frontWall = new THREE.Mesh(frontWallGeo, frontWallMat);
    frontWall.position.set(0, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2);
    frontWall.receiveShadow = true;
    roomGroup.add(frontWall);

    // Left Wall (X = -ROOM_WIDTH / 2)
    const leftWallGeo = new THREE.PlaneGeometry(ROOM_DEPTH, ROOM_HEIGHT);
    const leftWallMat = makeWallMat(ROOM_DEPTH * 2.2, 1);
    const leftWall = new THREE.Mesh(leftWallGeo, leftWallMat);
    leftWall.position.set(-ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    roomGroup.add(leftWall);

    // Right Wall (X = ROOM_WIDTH / 2)
    const rightWallGeo = new THREE.PlaneGeometry(ROOM_DEPTH, ROOM_HEIGHT);
    const rightWallMat = makeWallMat(ROOM_DEPTH * 2.2, 1);
    const rightWall = new THREE.Mesh(rightWallGeo, rightWallMat);
    rightWall.position.set(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    roomGroup.add(rightWall);

    // Back Wall with Entrance Doorway (Z = ROOM_DEPTH / 2)
    const doorwayWidth = 1.6;
    const doorwayHeight = 2.3;
    const backWallSideWidth = (ROOM_WIDTH - doorwayWidth) / 2;

    const backWallMat = makeWallMat(backWallSideWidth * 2.2, 1);

    // Left back wall segment
    const bwLeftGeo = new THREE.PlaneGeometry(backWallSideWidth, ROOM_HEIGHT);
    const bwLeft = new THREE.Mesh(bwLeftGeo, backWallMat);
    bwLeft.position.set(-ROOM_WIDTH / 2 + backWallSideWidth / 2, ROOM_HEIGHT / 2, ROOM_DEPTH / 2);
    bwLeft.rotation.y = Math.PI;
    roomGroup.add(bwLeft);

    // Right back wall segment
    const bwRightGeo = new THREE.PlaneGeometry(backWallSideWidth, ROOM_HEIGHT);
    const bwRight = new THREE.Mesh(bwRightGeo, backWallMat);
    bwRight.position.set(ROOM_WIDTH / 2 - backWallSideWidth / 2, ROOM_HEIGHT / 2, ROOM_DEPTH / 2);
    bwRight.rotation.y = Math.PI;
    roomGroup.add(bwRight);

    // Lintel header above doorway
    const bwHeaderGeo = new THREE.PlaneGeometry(doorwayWidth, ROOM_HEIGHT - doorwayHeight);
    const bwHeader = new THREE.Mesh(bwHeaderGeo, backWallMat);
    bwHeader.position.set(0, ROOM_HEIGHT - (ROOM_HEIGHT - doorwayHeight) / 2, ROOM_DEPTH / 2);
    bwHeader.rotation.y = Math.PI;
    roomGroup.add(bwHeader);

    // Solid Wood Door Frame
    const doorFrameMat = new THREE.MeshStandardMaterial({
      color: 0x3d2415,
      roughness: 0.45,
      metalness: 0.1,
    });
    const framePillarGeo = new THREE.BoxGeometry(0.12, doorwayHeight, 0.16);
    const frameL = new THREE.Mesh(framePillarGeo, doorFrameMat);
    frameL.position.set(-doorwayWidth / 2 + 0.05, doorwayHeight / 2, ROOM_DEPTH / 2);
    roomGroup.add(frameL);

    const frameR = new THREE.Mesh(framePillarGeo, doorFrameMat);
    frameR.position.set(doorwayWidth / 2 - 0.05, doorwayHeight / 2, ROOM_DEPTH / 2);
    roomGroup.add(frameR);

    const frameTopGeo = new THREE.BoxGeometry(doorwayWidth, 0.1, 0.16);
    const frameT = new THREE.Mesh(frameTopGeo, doorFrameMat);
    frameT.position.set(0, doorwayHeight, ROOM_DEPTH / 2);
    roomGroup.add(frameT);

    // Open Door Leaf (The door the user entered through)
    const doorLeafGeo = new THREE.BoxGeometry(1.35, 2.25, 0.07);
    const doorLeafMat = new THREE.MeshStandardMaterial({
      color: 0x4a2a16,
      roughness: 0.38,
      metalness: 0.08,
    });
    const doorLeaf = new THREE.Mesh(doorLeafGeo, doorLeafMat);
    doorLeaf.position.set(0.68, 1.13, 0); // local offset from pivot

    const doorPivot = new THREE.Group();
    doorPivot.position.set(-doorwayWidth / 2 + 0.1, 0, ROOM_DEPTH / 2);
    doorPivot.rotation.y = -Math.PI * 0.42; // open into the room
    doorPivot.add(doorLeaf);

    // Brass Doorknob on the open door
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xdfb15b,
      roughness: 0.22,
      metalness: 0.9,
    });
    const knobGeo = new THREE.SphereGeometry(0.05, 16, 16);
    const doorKnob = new THREE.Mesh(knobGeo, brassMat);
    doorKnob.position.set(1.22, 1.05, 0.06);
    doorPivot.add(doorKnob);

    roomGroup.add(doorPivot);

    // Warm baseboards around perimeter
    const baseboardMat = new THREE.MeshStandardMaterial({ color: 0x331c10, roughness: 0.5 });
    // Left baseboard
    const bbL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, ROOM_DEPTH), baseboardMat);
    bbL.position.set(-ROOM_WIDTH / 2 + 0.02, 0.05, 0);
    roomGroup.add(bbL);
    // Right baseboard
    const bbR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, ROOM_DEPTH), baseboardMat);
    bbR.position.set(ROOM_WIDTH / 2 - 0.02, 0.05, 0);
    roomGroup.add(bbR);
    // Back baseboard segments
    const bbB1 = new THREE.Mesh(new THREE.BoxGeometry(backWallSideWidth, 0.1, 0.04), baseboardMat);
    bbB1.position.set(-ROOM_WIDTH / 2 + backWallSideWidth / 2, 0.05, ROOM_DEPTH / 2 - 0.02);
    roomGroup.add(bbB1);
    const bbB2 = new THREE.Mesh(new THREE.BoxGeometry(backWallSideWidth, 0.1, 0.04), baseboardMat);
    bbB2.position.set(ROOM_WIDTH / 2 - backWallSideWidth / 2, 0.05, ROOM_DEPTH / 2 - 0.02);
    roomGroup.add(bbB2);

    // --- 4. SMALL WOODEN TABLE (WALL-TO-WALL AGAINST FRONT WALL) ---
    // User request: "並將視角前方的牆邊擺上一張跟牆壁寬度同等的小木桌"
    // Front wall is at z = -ROOM_DEPTH / 2 (-3.4m)
    // Table width is EXACTLY ROOM_WIDTH (5.8m)
    const tableGroup = new THREE.Group();
    const TABLE_WIDTH = ROOM_WIDTH; // Spans full width of front wall
    const TABLE_DEPTH = 0.82;       // Comfortable desk depth
    const TABLE_HEIGHT = 0.76;      // Ergonomic table height
    const TABLE_TOP_THICK = 0.06;   // Thick solid wood board

    const tableMat = new THREE.MeshStandardMaterial({
      map: tabletopTexture,
      roughness: 0.32,
      metalness: 0.05,
    });

    const tableDarkWoodMat = new THREE.MeshStandardMaterial({
      color: 0x4a2c16,
      roughness: 0.45,
      metalness: 0.05,
    });

    // Tabletop Slab spanning wall-to-wall
    const topGeo = new THREE.BoxGeometry(TABLE_WIDTH, TABLE_TOP_THICK, TABLE_DEPTH);
    const tableTop = new THREE.Mesh(topGeo, tableMat);
    tableTop.position.set(0, TABLE_HEIGHT - TABLE_TOP_THICK / 2, 0);
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    tableGroup.add(tableTop);

    // Under-table apron / front fascia beam
    const apronGeo = new THREE.BoxGeometry(TABLE_WIDTH, 0.07, 0.04);
    const apronFront = new THREE.Mesh(apronGeo, tableDarkWoodMat);
    apronFront.position.set(0, TABLE_HEIGHT - TABLE_TOP_THICK - 0.035, TABLE_DEPTH / 2 - 0.03);
    tableGroup.add(apronFront);

    // Table Support Legs / Gable Panels
    // Left gable end panel
    const legGeoL = new THREE.BoxGeometry(0.06, TABLE_HEIGHT - TABLE_TOP_THICK, TABLE_DEPTH - 0.04);
    const legL = new THREE.Mesh(legGeoL, tableDarkWoodMat);
    legL.position.set(-TABLE_WIDTH / 2 + 0.03, (TABLE_HEIGHT - TABLE_TOP_THICK) / 2, 0);
    legL.castShadow = true;
    tableGroup.add(legL);

    // Right gable end panel
    const legR = new THREE.Mesh(legGeoL, tableDarkWoodMat);
    legR.position.set(TABLE_WIDTH / 2 - 0.03, (TABLE_HEIGHT - TABLE_TOP_THICK) / 2, 0);
    legR.castShadow = true;
    tableGroup.add(legR);

    // Intermediate support legs for structural realism
    [-TABLE_WIDTH / 3, TABLE_WIDTH / 3].forEach((xPos) => {
      const midLegGeo = new THREE.BoxGeometry(0.08, TABLE_HEIGHT - TABLE_TOP_THICK, 0.08);
      const midLeg = new THREE.Mesh(midLegGeo, tableDarkWoodMat);
      midLeg.position.set(xPos, (TABLE_HEIGHT - TABLE_TOP_THICK) / 2, TABLE_DEPTH / 2 - 0.08);
      midLeg.castShadow = true;
      tableGroup.add(midLeg);
    });

    // --- Elegant Minimalist Desk Accents on the Table ---
    // 1. Warm Desk Lamp with soft cone light
    const lampGroup = new THREE.Group();
    lampGroup.position.set(-1.4, TABLE_HEIGHT, -0.08);

    // Lamp Brass Base
    const lampBaseGeo = new THREE.CylinderGeometry(0.11, 0.12, 0.025, 20);
    const lampBase = new THREE.Mesh(lampBaseGeo, brassMat);
    lampBase.position.y = 0.0125;
    lampGroup.add(lampBase);

    // Lamp Stem
    const lampStemGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.42, 12);
    const lampStem = new THREE.Mesh(lampStemGeo, brassMat);
    lampStem.position.set(0, 0.22, 0);
    lampGroup.add(lampStem);

    // Lamp Shade (Warm cone)
    const lampShadeGeo = new THREE.ConeGeometry(0.14, 0.16, 20, 1, true);
    const lampShadeMat = new THREE.MeshStandardMaterial({
      color: 0x3d2716,
      roughness: 0.35,
      side: THREE.DoubleSide,
    });
    const lampShade = new THREE.Mesh(lampShadeGeo, lampShadeMat);
    lampShade.position.set(0, 0.42, 0);
    lampShade.rotation.x = Math.PI;
    lampGroup.add(lampShade);

    // Desk Lamp Glow Bulb
    const bulbGeo = new THREE.SphereGeometry(0.03, 12, 12);
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe2aa });
    const bulb = new THREE.Mesh(bulbGeo, bulbMat);
    bulb.position.set(0, 0.38, 0);
    lampGroup.add(bulb);

    // Warm Point Light casting localized soft light on table & slats
    const deskLampLight = new THREE.PointLight(0xffd594, 2.2, 3.8, 1.4);
    deskLampLight.position.set(0, 0.36, 0);
    deskLampLight.castShadow = true;
    lampGroup.add(deskLampLight);

    tableGroup.add(lampGroup);

    // 2. Minimalist Wooden Tray / Tablet Holder on Table Center
    const trayGeo = new THREE.BoxGeometry(0.38, 0.02, 0.26);
    const trayMat = new THREE.MeshStandardMaterial({ color: 0x331c10, roughness: 0.4 });
    const tray = new THREE.Mesh(trayGeo, trayMat);
    tray.position.set(0, TABLE_HEIGHT + 0.01, 0.05);
    tray.receiveShadow = true;
    tableGroup.add(tray);

    // 3. Subtle Cyber-Pixel Brand Plaque on Desk
    const plaqueGeo = new THREE.BoxGeometry(0.24, 0.06, 0.03);
    const plaqueMat = new THREE.MeshStandardMaterial({
      color: 0x241520,
      roughness: 0.2,
      metalness: 0.8,
    });
    const plaque = new THREE.Mesh(plaqueGeo, plaqueMat);
    plaque.position.set(0, TABLE_HEIGHT + 0.03, 0.05);
    plaque.rotation.x = -0.25;
    tableGroup.add(plaque);

    // Position entire table flush against the front wall
    // Front wall is at -ROOM_DEPTH / 2, table center is at -ROOM_DEPTH / 2 + TABLE_DEPTH / 2
    tableGroup.position.set(0, 0, -ROOM_DEPTH / 2 + TABLE_DEPTH / 2);
    roomGroup.add(tableGroup);

    scene.add(roomGroup);

    // --- 5. COZY WARM LIGHTING RIG ---
    // Warm Ambient Light
    const ambientLight = new THREE.AmbientLight(0xffecd6, 1.05);
    scene.add(ambientLight);

    // Ceiling Main Warm Chandelier / Downlight
    const ceilingDownlight = new THREE.PointLight(0xffebd2, 2.8, 12, 1.2);
    ceilingDownlight.position.set(0, ROOM_HEIGHT - 0.25, 0.3);
    ceilingDownlight.castShadow = true;
    ceilingDownlight.shadow.mapSize.width = 1024;
    ceilingDownlight.shadow.mapSize.height = 1024;
    ceilingDownlight.shadow.bias = -0.001;
    scene.add(ceilingDownlight);

    // Wooden Ceiling Fixture
    const fixGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.05, 24);
    const fixMat = new THREE.MeshStandardMaterial({ color: 0x3a2113, roughness: 0.5 });
    const fixture = new THREE.Mesh(fixGeo, fixMat);
    fixture.position.set(0, ROOM_HEIGHT - 0.025, 0.3);
    scene.add(fixture);

    // Diffuser ring
    const diffGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.02, 24);
    const diffMat = new THREE.MeshBasicMaterial({ color: 0xfffae6 });
    const diffuser = new THREE.Mesh(diffGeo, diffMat);
    diffuser.position.set(0, ROOM_HEIGHT - 0.055, 0.3);
    scene.add(diffuser);

    // Soft Amber Wall Wash Light highlighting the vertical wood slats
    const wallWashLight = new THREE.DirectionalLight(0xffe8cf, 0.7);
    wallWashLight.position.set(0, 3.0, 1.5);
    wallWashLight.target = frontWall;
    scene.add(wallWashLight);

    // Doorway Spilling Light from outside
    const doorLight = new THREE.PointLight(0xffcf88, 1.8, 6);
    doorLight.position.set(0, 1.6, ROOM_DEPTH / 2 - 0.3);
    scene.add(doorLight);

    // --- 6. ANIMATION & RENDER LOOP ---
    let animationId: number;
    let clock = new THREE.Clock();

    const renderLoop = () => {
      const delta = Math.min(clock.getDelta(), 0.1);

      // Smooth camera interpolation towards target yaw and pitch
      cameraYawRef.current = THREE.MathUtils.lerp(cameraYawRef.current, targetYawRef.current, 0.2);
      cameraPitchRef.current = THREE.MathUtils.lerp(cameraPitchRef.current, targetPitchRef.current, 0.2);

      // Apply restricted orientation to camera
      camera.rotation.y = cameraYawRef.current;
      camera.rotation.x = cameraPitchRef.current;

      // --- USER REQUEST: "將人的行進角度固定" ---
      // Player walking orientation is strictly fixed to the room axes:
      // joyY < 0 (pushing stick forward/up) ALWAYS moves towards the front table (-Z)
      // joyY > 0 (pushing stick backward/down) ALWAYS moves towards the doorway (+Z)
      // joyX < 0 (pushing stick left) ALWAYS moves towards the left wall (-X)
      // joyX > 0 (pushing stick right) ALWAYS moves towards the right wall (+X)
      // COMPLETELY INDEPENDENT of cameraYaw!
      const joyX = joyVectorRef.current.x;
      const joyY = joyVectorRef.current.y;
      const isMoving = Math.abs(joyX) > 0.05 || Math.abs(joyY) > 0.05;

      if (isMoving) {
        const moveSpeed = 2.4; // smooth, comfortable walking pace in small room
        const dx = joyX * moveSpeed * delta;
        const dz = joyY * moveSpeed * delta;

        playerPosRef.current.x += dx;
        playerPosRef.current.z += dz;

        // Collision boundaries:
        // Left & Right: within walls with padding
        const PADDING_X = 0.65;
        const minX = -ROOM_WIDTH / 2 + PADDING_X;
        const maxX = ROOM_WIDTH / 2 - PADDING_X;

        // Back: stop before back wall / doorway
        const maxZ = ROOM_DEPTH / 2 - 0.75;

        // Front: Table is at z = -ROOM_DEPTH / 2 + TABLE_DEPTH / 2, front edge is at -ROOM_DEPTH / 2 + TABLE_DEPTH
        // Stop right in front of the table so player can inspect the wooden desk!
        const tableFrontEdgeZ = -ROOM_DEPTH / 2 + TABLE_DEPTH;
        const minZ = tableFrontEdgeZ + 0.65; // ~0.65m in front of table

        playerPosRef.current.x = THREE.MathUtils.clamp(playerPosRef.current.x, minX, maxX);
        playerPosRef.current.z = THREE.MathUtils.clamp(playerPosRef.current.z, minZ, maxZ);

        const frameDist = Math.sqrt(dx * dx + dz * dz);
        walkDistanceRef.current += frameDist;

        // Footstep sound cadence (~0.8m)
        if (walkDistanceRef.current - lastFootstepDistRef.current > 0.8) {
          lastFootstepDistRef.current = walkDistanceRef.current;
          playFootstep();
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try { navigator.vibrate(6); } catch {}
          }
        }
      }

      // Very subtle gentle head bob while walking
      const walkBob = Math.sin(walkDistanceRef.current * 7.5) * 0.016;
      camera.position.set(
        playerPosRef.current.x,
        playerPosRef.current.y + walkBob,
        playerPosRef.current.z
      );

      // HUD angles for display
      const currentYawOffset = Math.round((cameraYawRef.current - CENTER_YAW) * (180 / Math.PI));
      const currentPitch = Math.round(cameraPitchRef.current * (180 / Math.PI));
      setYawOffsetDeg(currentYawOffset);
      setPitchDeg(currentPitch);
      setPlayerCoord({
        x: Number(playerPosRef.current.x.toFixed(1)),
        z: Number(playerPosRef.current.z.toFixed(1)),
      });

      renderer.render(scene, camera);
      animationId = requestAnimationFrame(renderLoop);
    };

    animationId = requestAnimationFrame(renderLoop);

    // Resize handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // --- CLEANUP ---
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);

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
      wallTexture.dispose();
      tabletopTexture.dispose();
      ceilingTexture.dispose();
      renderer.dispose();

      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [playFootstep, CENTER_YAW]);

  // --- TOUCH HANDLERS ---
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

      if (dist <= joyRadius * 1.5 && joyTouchIdRef.current === null) {
        joyTouchIdRef.current = touch.identifier;
        setIsJoyActive(true);
        updateJoystickVector(distX, distY, joyRadius);
      } else if (lookTouchIdRef.current === null) {
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

      // Update Look (Clamped to 60° horizontal and slight look up/down)
      if (touch.identifier === lookTouchIdRef.current) {
        const deltaX = touch.clientX - lookLastPosRef.current.x;
        const deltaY = touch.clientY - lookLastPosRef.current.y;
        lookLastPosRef.current = { x: touch.clientX, y: touch.clientY };

        const sensitivity = 0.0035;
        targetYawRef.current -= deltaX * sensitivity;
        targetPitchRef.current -= deltaY * sensitivity;

        // CLAMP: Total horizontal 60° (±30° from CENTER_YAW)
        targetYawRef.current = THREE.MathUtils.clamp(targetYawRef.current, MIN_YAW, MAX_YAW);
        // CLAMP: Look up and slightly down
        targetPitchRef.current = THREE.MathUtils.clamp(targetPitchRef.current, MIN_PITCH, MAX_PITCH);
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

    const sensitivity = 0.0028;
    targetYawRef.current -= deltaX * sensitivity;
    targetPitchRef.current -= deltaY * sensitivity;

    // Strict Clamps
    targetYawRef.current = THREE.MathUtils.clamp(targetYawRef.current, MIN_YAW, MAX_YAW);
    targetPitchRef.current = THREE.MathUtils.clamp(targetPitchRef.current, MIN_PITCH, MAX_PITCH);
  };

  const handleMouseUp = () => {
    isMouseDownRef.current = false;
  };

  // Reset view to look straight forward at the wooden desk
  const handleResetCameraView = () => {
    targetYawRef.current = CENTER_YAW;
    targetPitchRef.current = 0;
  };

  // Desktop keyboard controls
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
      className="absolute inset-0 w-full h-full select-none overflow-hidden touch-none bg-[#1a1510]"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* 3D WebGL Canvas */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Center Subtle Focus Ring */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-40">
        <div className="w-2.5 h-2.5 rounded-full border border-amber-300/80 bg-white/20 shadow-sm" />
      </div>

      {/* --- HUD OVERLAY --- */}

      {/* Top Bar: Visual Range Info & Actions */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-30">
        <div className="flex items-center gap-2">
          {/* Angle and Position Indicator */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/65 backdrop-blur-md border border-white/15 text-white shadow-lg pointer-events-auto">
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono text-[11px] font-bold text-amber-300">
              {yawOffsetDeg >= 0 ? `+${yawOffsetDeg}°` : `${yawOffsetDeg}°`}
            </span>
            <span className="text-[9px] text-white/50 font-mono">/ ±30°</span>
            <span className="text-[10px] text-white/30 font-mono">|</span>
            <span className="font-mono text-[10px] text-white/70">
              Z:{playerCoord.z}m
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-950/60 border border-amber-600/40 text-amber-200 text-[10px] font-mono font-bold">
            <span>木質空間 • 寬木桌</span>
          </div>
        </div>

        {/* Top Right Action Buttons */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            className="p-2 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 text-white active:scale-95 transition-all shadow-md"
            title="音效開關"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-amber-300" /> : <VolumeX className="w-3.5 h-3.5 text-white/40" />}
          </button>

          {/* Reset View Button */}
          <button
            onClick={handleResetCameraView}
            className="p-2 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md border border-white/15 text-white/80 active:scale-95 transition-all shadow-md"
            title="視角回正 (正對小木桌)"
          >
            <RotateCcw className="w-3.5 h-3.5 text-amber-300" />
          </button>

          {/* Menu Button */}
          <button
            onClick={onOpenMenu}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:brightness-110 text-white font-mono font-bold text-xs tracking-wider flex items-center gap-1.5 border border-amber-400/40 shadow-[0_0_15px_rgba(217,119,6,0.35)] active:scale-95 transition-all"
          >
            <Layers className="w-3.5 h-3.5 text-amber-200" />
            <span>探索選單</span>
          </button>

          {/* Exit Room Button */}
          <button
            onClick={onExitRoom}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white/90 font-mono text-xs font-bold tracking-wider flex items-center gap-1.5 active:scale-95 transition-all shadow-md"
          >
            <DoorClosed className="w-3.5 h-3.5 text-amber-300" />
            <span>退出</span>
          </button>
        </div>
      </div>

      {/* Floating Mode Pill */}
      <div className="absolute top-15 left-0 right-0 flex justify-center pointer-events-none z-20">
        <div className="px-3.5 py-1 rounded-full bg-black/65 backdrop-blur-md border border-white/15 text-white text-[10px] font-mono tracking-wider flex items-center gap-1.5 shadow-lg">
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span>固定行進角度 • 視角橫向 60° (可微調抬頭/低頭)</span>
        </div>
      </div>

      {/* --- VIRTUAL JOYSTICK (BOTTOM-LEFT) --- */}
      <div className="absolute bottom-6 left-6 z-30 select-none">
        <div
          ref={joystickBaseRef}
          className={`w-28 h-28 rounded-full border-2 relative flex items-center justify-center transition-colors shadow-[0_4px_25px_rgba(0,0,0,0.6)] backdrop-blur-md ${
            isJoyActive 
              ? 'bg-amber-600/25 border-amber-400/90 shadow-[0_0_25px_rgba(217,119,6,0.45)]' 
              : 'bg-black/50 border-white/25 hover:border-white/40'
          }`}
          style={{ touchAction: 'none' }}
        >
          {/* Fixed Direction Guide Arrows */}
          <ArrowUp className="absolute top-1.5 w-3.5 h-3.5 text-amber-300/60" />
          <ArrowDown className="absolute bottom-1.5 w-3.5 h-3.5 text-amber-300/60" />
          <ArrowLeft className="absolute left-1.5 w-3.5 h-3.5 text-amber-300/60" />
          <ArrowRight className="absolute right-1.5 w-3.5 h-3.5 text-amber-300/60" />

          {/* Inner Joystick Ring */}
          <div className="w-16 h-16 rounded-full border border-dashed border-amber-300/20 pointer-events-none" />

          {/* Draggable Knob */}
          <div
            className={`w-12 h-12 rounded-full absolute flex items-center justify-center transition-transform duration-75 shadow-lg pointer-events-none ${
              isJoyActive
                ? 'bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 border-2 border-white scale-105 shadow-[0_0_15px_rgba(245,158,11,0.7)]'
                : 'bg-gradient-to-tr from-amber-900 to-amber-700 border border-amber-300/40'
            }`}
            style={{
              transform: `translate3d(${joyOffset.x}px, ${joyOffset.y}px, 0)`,
            }}
          >
            <div className="w-3.5 h-3.5 rounded-full bg-white/60 shadow-inner" />
          </div>
        </div>

        {/* Joystick Label */}
        <div className="mt-2 text-center">
          <span className="text-[9px] font-mono text-amber-200/70 tracking-widest block uppercase font-bold">
            {isJoyActive ? 'WALKING...' : '直行前進 / 後退'}
          </span>
        </div>
      </div>

      {/* Bottom Right Swipe Guide */}
      <div className="absolute bottom-6 right-6 pointer-events-none z-20 hidden xs:flex flex-col items-end gap-1">
        <div className="px-3 py-1 rounded-xl bg-black/50 backdrop-blur-md border border-white/10 text-amber-100/70 text-[10px] font-mono tracking-wider flex items-center gap-1.5">
          <span>右側滑動 60° 轉向</span>
          <Compass className="w-3.5 h-3.5 text-amber-400" />
        </div>
      </div>
    </div>
  );
};
