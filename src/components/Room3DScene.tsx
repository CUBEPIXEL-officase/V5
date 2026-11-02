import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  DoorClosed, 
  Layers,
  ArrowUp,
  ArrowDown,
  Eye,
  Lock,
  Sparkles
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

  // Angle constraints: 60° horizontal range (±30° from forward), slight pitch down and up
  // Rotated 180° per user request: CENTER_YAW = 0 looks straight forward (-Z) towards the front wooden desk
  const CENTER_YAW = 0; 
  const YAW_RANGE_HALF = (30 * Math.PI) / 180; // 30 degrees each side = 60 degrees total
  const MIN_YAW = CENTER_YAW - YAW_RANGE_HALF;
  const MAX_YAW = CENTER_YAW + YAW_RANGE_HALF;

  const MIN_PITCH = (-14 * Math.PI) / 180; // 稍微低頭 (~14 degrees down)
  const MAX_PITCH = (24 * Math.PI) / 180; // 抬頭 (~24 degrees up)

  // Room Dimensions
  const ROOM_WIDTH = 5.8;
  const ROOM_HEIGHT = 2.9;
  const ROOM_DEPTH = 6.8;
  const TABLE_DEPTH = 0.82;
  const TABLE_HEIGHT = 0.76;

  // Collision limits:
  // Front: Table front edge is at -ROOM_DEPTH / 2 + TABLE_DEPTH = -3.4 + 0.82 = -2.58
  const tableFrontEdgeZ = -ROOM_DEPTH / 2 + TABLE_DEPTH;
  const MIN_Z = tableFrontEdgeZ + 0.55; // Stop in front of the table (~ -2.03m)
  const MAX_Z = ROOM_DEPTH / 2 - 0.75;  // Entrance door is behind player (~ 2.65m)

  // Table contact zone threshold: reached / touching the table
  const AT_TABLE_THRESHOLD_Z = tableFrontEdgeZ + 0.70; // ~ -1.88m

  // HUD & Game State
  const [yawOffsetDeg, setYawOffsetDeg] = useState(0);
  const [playerDistanceToTable, setPlayerDistanceToTable] = useState('0.0');
  const [isAtTable, setIsAtTable] = useState(false);
  const [isWalkingForward, setIsWalkingForward] = useState(false);
  const [isWalkingBackward, setIsWalkingBackward] = useState(false);

  // References for render loop & input handling
  const isAtTableRef = useRef(false);
  const walkDirRef = useRef<number>(0); // -1: forward (-Z), 1: backward (+Z), 0: idle
  const keysDownRef = useRef<{ forward: boolean; backward: boolean }>({ forward: false, backward: false });

  // Touch look tracking (enabled ONLY when touching table)
  const lookTouchIdRef = useRef<number | null>(null);
  const lookLastPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Desktop mouse look tracking (enabled ONLY when touching table)
  const isMouseDownRef = useRef(false);
  const mouseLastPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Camera angles (strictly locked to CENTER_YAW / 0 until touching table)
  const cameraYawRef = useRef<number>(CENTER_YAW);
  const cameraPitchRef = useRef<number>(0);
  const targetYawRef = useRef<number>(CENTER_YAW);
  const targetPitchRef = useRef<number>(0);

  // User request: "將視角改為進入門內(背對房門)"
  // Entrance door is at Z = +ROOM_DEPTH / 2 (+3.4m).
  // Player spawns at Z = 2.6m, back to door, looking straight forward (-Z) towards the front wooden desk.
  const playerPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 1.55, 2.6));
  const walkDistanceRef = useRef<number>(0);
  const lastFootstepDistRef = useRef<number>(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // --- 1. SCENE SETUP (DARK COZY MOOD) ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0c0907);
    scene.fog = new THREE.FogExp2(0x0c0907, 0.04);

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const camera = new THREE.PerspectiveCamera(65, width / height, 0.1, 80);
    camera.position.copy(playerPosRef.current);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = CENTER_YAW;
    camera.rotation.x = 0;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // --- 2. PROCEDURAL TEXTURES (USER REQUEST: 牆壁跟地板顏色變深) ---

    // A. Deep Dark Walnut Wood Floor (地板顏色變深 - 深色胡桃實木地板)
    const createWoodFloorTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 1024;
      const ctx = canvas.getContext('2d');
      if (!ctx) return new THREE.Texture();

      // Deep dark espresso/walnut base
      ctx.fillStyle = '#140c07';
      ctx.fillRect(0, 0, 1024, 1024);

      const rows = 16;
      const rowHeight = 1024 / rows;
      const plankCols = 4;
      const colWidth = 1024 / plankCols;

      // Dark smoked walnut palette
      const woodPalette = [
        '#28160d', '#201108', '#2d190f', '#190d06', 
        '#23130b', '#1c0e07', '#2a170e', '#1e0f08'
      ];

      for (let r = 0; r < rows; r++) {
        const y = r * rowHeight;
        const colShift = (r % 2) * (colWidth / 2);

        for (let c = -1; c <= plankCols; c++) {
          const x = c * colWidth + colShift;
          const colorIdx = Math.floor((Math.sin(r * 12.3 + c * 33.7) * 0.5 + 0.5) * woodPalette.length);
          ctx.fillStyle = woodPalette[colorIdx % woodPalette.length];
          ctx.fillRect(x + 1, y + 1, colWidth - 2, rowHeight - 2);

          // Deep wood grain lines
          ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
          for (let g = 3; g < rowHeight - 3; g += 5) {
            ctx.fillRect(x + 2, y + g, colWidth - 4, 1.5);
          }
          // Very subtle warm timber reflection streak
          ctx.fillStyle = 'rgba(180, 120, 80, 0.05)';
          for (let g = 6; g < rowHeight - 3; g += 8) {
            ctx.fillRect(x + 2, y + g, colWidth - 4, 1);
          }

          // Plank edge shadows (dark bevel seam)
          ctx.fillStyle = 'rgba(4, 2, 1, 0.8)';
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

    // B. Deep Dark Vertical Wood Slat Wall (牆壁顏色變深 - 深色直條木紋隔柵牆)
    const createVerticalWoodSlatTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (!ctx) return new THREE.Texture();

      // Deep black groove base
      ctx.fillStyle = '#080402';
      ctx.fillRect(0, 0, 512, 512);

      const numSlats = 16;
      const slatWidth = 512 / numSlats;
      const gap = 3;

      for (let s = 0; s < numSlats; s++) {
        const x = s * slatWidth;
        const w = slatWidth - gap;

        // Dark timber linear gradient across each slat
        const grad = ctx.createLinearGradient(x, 0, x + w, 0);
        grad.addColorStop(0.0, '#3b2214'); // Left subtle highlight edge
        grad.addColorStop(0.2, '#2c180d');
        grad.addColorStop(0.8, '#1e0f07');
        grad.addColorStop(1.0, '#120703'); // Right deep shadow edge

        ctx.fillStyle = grad;
        ctx.fillRect(x, 0, w, 512);

        // Vertical grain fibers
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        for (let gx = 3; gx < w - 2; gx += 4) {
          ctx.fillRect(x + gx, 0, 1.2, 512);
        }
        // Subtle crisp warm highlight on the left slat rib
        ctx.fillStyle = 'rgba(180, 110, 60, 0.12)';
        ctx.fillRect(x + 1, 0, 1.5, 512);
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      return texture;
    };

    // C. Deep Dark Tabletop Wood Texture (深色同壁寬木桌)
    const createTabletopWoodTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (!ctx) return new THREE.Texture();

      const bgGrad = ctx.createLinearGradient(0, 0, 1024, 0);
      bgGrad.addColorStop(0, '#26140b');
      bgGrad.addColorStop(0.5, '#301a0e');
      bgGrad.addColorStop(1, '#201008');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1024, 512);

      // Fine grain lines
      for (let y = 0; y < 512; y += 3) {
        const alpha = Math.sin(y * 0.1) * 0.04 + 0.12;
        ctx.fillStyle = `rgba(10, 5, 2, ${alpha})`;
        ctx.fillRect(0, y, 1024, 1.5);
      }

      // Warm amber satin sheen
      ctx.fillStyle = 'rgba(210, 150, 90, 0.05)';
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

      ctx.fillStyle = '#14100c';
      ctx.fillRect(0, 0, 256, 256);

      ctx.fillStyle = 'rgba(255, 240, 225, 0.02)';
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

    // --- 3. ROOM ARCHITECTURE ---
    const roomGroup = new THREE.Group();

    // 1. Dark Wood Floor
    const floorGeo = new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH);
    const floorMat = new THREE.MeshStandardMaterial({
      map: floorTexture,
      roughness: 0.42,
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

    // 3. Dark Vertical Wood Slat Walls
    const makeWallMat = (repeatX: number, repeatY: number) => {
      const tex = wallTexture.clone();
      tex.repeat.set(repeatX, repeatY);
      tex.needsUpdate = true;
      return new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.58,
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

    // Dark Door Frame
    const doorFrameMat = new THREE.MeshStandardMaterial({
      color: 0x1f120a,
      roughness: 0.5,
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

    // Open Door Leaf (The door behind the player)
    const doorLeafGeo = new THREE.BoxGeometry(1.35, 2.25, 0.07);
    const doorLeafMat = new THREE.MeshStandardMaterial({
      color: 0x2c170d,
      roughness: 0.42,
      metalness: 0.08,
    });
    const doorLeaf = new THREE.Mesh(doorLeafGeo, doorLeafMat);
    doorLeaf.position.set(0.68, 1.13, 0);

    const doorPivot = new THREE.Group();
    doorPivot.position.set(-doorwayWidth / 2 + 0.1, 0, ROOM_DEPTH / 2);
    doorPivot.rotation.y = -Math.PI * 0.42; // open into room
    doorPivot.add(doorLeaf);

    // Brass Doorknob
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

    // Dark Baseboards
    const baseboardMat = new THREE.MeshStandardMaterial({ color: 0x180d07, roughness: 0.55 });
    const bbL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, ROOM_DEPTH), baseboardMat);
    bbL.position.set(-ROOM_WIDTH / 2 + 0.02, 0.05, 0);
    roomGroup.add(bbL);
    const bbR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, ROOM_DEPTH), baseboardMat);
    bbR.position.set(ROOM_WIDTH / 2 - 0.02, 0.05, 0);
    roomGroup.add(bbR);
    const bbB1 = new THREE.Mesh(new THREE.BoxGeometry(backWallSideWidth, 0.1, 0.04), baseboardMat);
    bbB1.position.set(-ROOM_WIDTH / 2 + backWallSideWidth / 2, 0.05, ROOM_DEPTH / 2 - 0.02);
    roomGroup.add(bbB1);
    const bbB2 = new THREE.Mesh(new THREE.BoxGeometry(backWallSideWidth, 0.1, 0.04), baseboardMat);
    bbB2.position.set(ROOM_WIDTH / 2 - backWallSideWidth / 2, 0.05, ROOM_DEPTH / 2 - 0.02);
    roomGroup.add(bbB2);

    // --- 4. SMALL WOODEN TABLE (WALL-TO-WALL AGAINST FRONT WALL) ---
    const tableGroup = new THREE.Group();
    const TABLE_WIDTH = ROOM_WIDTH; // Spans full width of front wall
    const TABLE_TOP_THICK = 0.06;

    const tableMat = new THREE.MeshStandardMaterial({
      map: tabletopTexture,
      roughness: 0.35,
      metalness: 0.05,
    });

    const tableDarkWoodMat = new THREE.MeshStandardMaterial({
      color: 0x22120a,
      roughness: 0.48,
      metalness: 0.05,
    });

    // Tabletop Slab spanning wall-to-wall
    const topGeo = new THREE.BoxGeometry(TABLE_WIDTH, TABLE_TOP_THICK, TABLE_DEPTH);
    const tableTop = new THREE.Mesh(topGeo, tableMat);
    tableTop.position.set(0, TABLE_HEIGHT - TABLE_TOP_THICK / 2, 0);
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    tableGroup.add(tableTop);

    // Under-table apron front fascia
    const apronGeo = new THREE.BoxGeometry(TABLE_WIDTH, 0.07, 0.04);
    const apronFront = new THREE.Mesh(apronGeo, tableDarkWoodMat);
    apronFront.position.set(0, TABLE_HEIGHT - TABLE_TOP_THICK - 0.035, TABLE_DEPTH / 2 - 0.03);
    tableGroup.add(apronFront);

    // Gable End Legs
    const legGeoL = new THREE.BoxGeometry(0.06, TABLE_HEIGHT - TABLE_TOP_THICK, TABLE_DEPTH - 0.04);
    const legL = new THREE.Mesh(legGeoL, tableDarkWoodMat);
    legL.position.set(-TABLE_WIDTH / 2 + 0.03, (TABLE_HEIGHT - TABLE_TOP_THICK) / 2, 0);
    legL.castShadow = true;
    tableGroup.add(legL);

    const legR = new THREE.Mesh(legGeoL, tableDarkWoodMat);
    legR.position.set(TABLE_WIDTH / 2 - 0.03, (TABLE_HEIGHT - TABLE_TOP_THICK) / 2, 0);
    legR.castShadow = true;
    tableGroup.add(legR);

    // Intermediate support legs
    [-TABLE_WIDTH / 3, TABLE_WIDTH / 3].forEach((xPos) => {
      const midLegGeo = new THREE.BoxGeometry(0.08, TABLE_HEIGHT - TABLE_TOP_THICK, 0.08);
      const midLeg = new THREE.Mesh(midLegGeo, tableDarkWoodMat);
      midLeg.position.set(xPos, (TABLE_HEIGHT - TABLE_TOP_THICK) / 2, TABLE_DEPTH / 2 - 0.08);
      midLeg.castShadow = true;
      tableGroup.add(midLeg);
    });

    // --- Tabletop Accents ---
    // Brass Desk Lamp
    const lampGroup = new THREE.Group();
    lampGroup.position.set(-1.4, TABLE_HEIGHT, -0.08);

    const lampBaseGeo = new THREE.CylinderGeometry(0.11, 0.12, 0.025, 20);
    const lampBase = new THREE.Mesh(lampBaseGeo, brassMat);
    lampBase.position.y = 0.0125;
    lampGroup.add(lampBase);

    const lampStemGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.42, 12);
    const lampStem = new THREE.Mesh(lampStemGeo, brassMat);
    lampStem.position.set(0, 0.22, 0);
    lampGroup.add(lampStem);

    const lampShadeGeo = new THREE.ConeGeometry(0.14, 0.16, 20, 1, true);
    const lampShadeMat = new THREE.MeshStandardMaterial({
      color: 0x22130a,
      roughness: 0.35,
      side: THREE.DoubleSide,
    });
    const lampShade = new THREE.Mesh(lampShadeGeo, lampShadeMat);
    lampShade.position.set(0, 0.42, 0);
    lampShade.rotation.x = Math.PI;
    lampGroup.add(lampShade);

    const bulbGeo = new THREE.SphereGeometry(0.03, 12, 12);
    const bulbMat = new THREE.MeshBasicMaterial({ color: 0xffe2aa });
    const bulb = new THREE.Mesh(bulbGeo, bulbMat);
    bulb.position.set(0, 0.38, 0);
    lampGroup.add(bulb);

    const deskLampLight = new THREE.PointLight(0xffd594, 2.4, 4.0, 1.4);
    deskLampLight.position.set(0, 0.36, 0);
    deskLampLight.castShadow = true;
    lampGroup.add(deskLampLight);

    tableGroup.add(lampGroup);

    // Wooden Tray on Desk Center
    const trayGeo = new THREE.BoxGeometry(0.38, 0.02, 0.26);
    const trayMat = new THREE.MeshStandardMaterial({ color: 0x1f1109, roughness: 0.4 });
    const tray = new THREE.Mesh(trayGeo, trayMat);
    tray.position.set(0, TABLE_HEIGHT + 0.01, 0.05);
    tray.receiveShadow = true;
    tableGroup.add(tray);

    // Cyber-Pixel Plaque on Desk
    const plaqueGeo = new THREE.BoxGeometry(0.24, 0.06, 0.03);
    const plaqueMat = new THREE.MeshStandardMaterial({
      color: 0x180d18,
      roughness: 0.2,
      metalness: 0.8,
    });
    const plaque = new THREE.Mesh(plaqueGeo, plaqueMat);
    plaque.position.set(0, TABLE_HEIGHT + 0.03, 0.05);
    plaque.rotation.x = -0.25;
    tableGroup.add(plaque);

    tableGroup.position.set(0, 0, -ROOM_DEPTH / 2 + TABLE_DEPTH / 2);
    roomGroup.add(tableGroup);

    scene.add(roomGroup);

    // --- 5. ATMOSPHERIC WARM LIGHTING RIG ---
    const ambientLight = new THREE.AmbientLight(0xffecd6, 0.85);
    scene.add(ambientLight);

    // Ceiling Main Downlight
    const ceilingDownlight = new THREE.PointLight(0xffebd2, 2.6, 12, 1.2);
    ceilingDownlight.position.set(0, ROOM_HEIGHT - 0.25, 0.3);
    ceilingDownlight.castShadow = true;
    ceilingDownlight.shadow.mapSize.width = 1024;
    ceilingDownlight.shadow.mapSize.height = 1024;
    ceilingDownlight.shadow.bias = -0.001;
    scene.add(ceilingDownlight);

    // Wooden Ceiling Fixture
    const fixGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.05, 24);
    const fixMat = new THREE.MeshStandardMaterial({ color: 0x22130a, roughness: 0.5 });
    const fixture = new THREE.Mesh(fixGeo, fixMat);
    fixture.position.set(0, ROOM_HEIGHT - 0.025, 0.3);
    scene.add(fixture);

    const diffGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.02, 24);
    const diffMat = new THREE.MeshBasicMaterial({ color: 0xfffae6 });
    const diffuser = new THREE.Mesh(diffGeo, diffMat);
    diffuser.position.set(0, ROOM_HEIGHT - 0.055, 0.3);
    scene.add(diffuser);

    // Directional wall wash highlighting the dark vertical slats
    const wallWashLight = new THREE.DirectionalLight(0xffe8cf, 0.7);
    wallWashLight.position.set(0, 3.0, 1.5);
    wallWashLight.target = frontWall;
    scene.add(wallWashLight);

    // Doorway spill light from outside behind the player
    const doorLight = new THREE.PointLight(0xffcf88, 1.5, 6);
    doorLight.position.set(0, 1.6, ROOM_DEPTH / 2 - 0.3);
    scene.add(doorLight);

    // --- 6. ANIMATION & RENDER LOOP ---
    let animationId: number;
    let clock = new THREE.Clock();

    const renderLoop = () => {
      const delta = Math.min(clock.getDelta(), 0.1);

      // Determine if player has reached / touched the wooden table
      const reachedTable = playerPosRef.current.z <= AT_TABLE_THRESHOLD_Z;
      if (reachedTable !== isAtTableRef.current) {
        isAtTableRef.current = reachedTable;
        setIsAtTable(reachedTable);
      }

      // --- USER REQUEST: "在碰到木桌前完全刪掉視角轉動" ---
      if (!isAtTableRef.current) {
        // Locked forward straight view
        targetYawRef.current = CENTER_YAW;
        targetPitchRef.current = 0;
        cameraYawRef.current = CENTER_YAW;
        cameraPitchRef.current = 0;
      } else {
        // Once at the table, allow smooth 60° horizontal view & pitch rotation
        cameraYawRef.current = THREE.MathUtils.lerp(cameraYawRef.current, targetYawRef.current, 0.2);
        cameraPitchRef.current = THREE.MathUtils.lerp(cameraPitchRef.current, targetPitchRef.current, 0.2);
      }

      camera.rotation.y = cameraYawRef.current;
      camera.rotation.x = cameraPitchRef.current;

      // Walking motion from forward/backward button or keyboard
      let moveDirZ = walkDirRef.current;
      if (keysDownRef.current.forward) moveDirZ = -1;
      else if (keysDownRef.current.backward) moveDirZ = 1;

      if (moveDirZ !== 0) {
        const moveSpeed = 2.3;
        const dz = moveDirZ * moveSpeed * delta;
        playerPosRef.current.z += dz;
        playerPosRef.current.z = THREE.MathUtils.clamp(playerPosRef.current.z, MIN_Z, MAX_Z);

        walkDistanceRef.current += Math.abs(dz);

        // Footstep cadence
        if (walkDistanceRef.current - lastFootstepDistRef.current > 0.8) {
          lastFootstepDistRef.current = walkDistanceRef.current;
          playFootstep();
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try { navigator.vibrate(6); } catch {}
          }
        }
      }

      // Gentle walking bob
      const walkBob = Math.sin(walkDistanceRef.current * 7.5) * 0.015;
      camera.position.set(
        playerPosRef.current.x,
        playerPosRef.current.y + (moveDirZ !== 0 ? walkBob : 0),
        playerPosRef.current.z
      );

      // HUD values
      const currentYawOffset = Math.round((cameraYawRef.current - CENTER_YAW) * (180 / Math.PI));
      setYawOffsetDeg(currentYawOffset);

      // Distance to table in meters
      const distToDesk = Math.max(0, playerPosRef.current.z - MIN_Z);
      setPlayerDistanceToTable(distToDesk.toFixed(1));

      renderer.render(scene, camera);
      animationId = requestAnimationFrame(renderLoop);
    };

    animationId = requestAnimationFrame(renderLoop);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

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
  }, [playFootstep, CENTER_YAW, AT_TABLE_THRESHOLD_Z, MIN_Z, MAX_Z]);

  // --- TOUCH HANDLERS (VIEW ROTATION ONLY AFTER TOUCHING TABLE) ---
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    // If not at the table yet, rotation is strictly disabled
    if (!isAtTableRef.current) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (lookTouchIdRef.current === null) {
        lookTouchIdRef.current = touch.identifier;
        lookLastPosRef.current = { x: touch.clientX, y: touch.clientY };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isAtTableRef.current) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === lookTouchIdRef.current) {
        const deltaX = touch.clientX - lookLastPosRef.current.x;
        const deltaY = touch.clientY - lookLastPosRef.current.y;
        lookLastPosRef.current = { x: touch.clientX, y: touch.clientY };

        const sensitivity = 0.0035;
        targetYawRef.current -= deltaX * sensitivity;
        targetPitchRef.current -= deltaY * sensitivity;

        // Clamp to 60° horizontal (±30°) and slight look up/down
        targetYawRef.current = THREE.MathUtils.clamp(targetYawRef.current, MIN_YAW, MAX_YAW);
        targetPitchRef.current = THREE.MathUtils.clamp(targetPitchRef.current, MIN_PITCH, MAX_PITCH);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === lookTouchIdRef.current) {
        lookTouchIdRef.current = null;
      }
    }
  };

  // --- DESKTOP MOUSE LOOK (ENABLED ONLY AFTER TOUCHING TABLE) ---
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isAtTableRef.current) return;
    isMouseDownRef.current = true;
    mouseLastPosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isAtTableRef.current || !isMouseDownRef.current) return;
    const deltaX = e.clientX - mouseLastPosRef.current.x;
    const deltaY = e.clientY - mouseLastPosRef.current.y;
    mouseLastPosRef.current = { x: e.clientX, y: e.clientY };

    const sensitivity = 0.0028;
    targetYawRef.current -= deltaX * sensitivity;
    targetPitchRef.current -= deltaY * sensitivity;

    targetYawRef.current = THREE.MathUtils.clamp(targetYawRef.current, MIN_YAW, MAX_YAW);
    targetPitchRef.current = THREE.MathUtils.clamp(targetPitchRef.current, MIN_PITCH, MAX_PITCH);
  };

  const handleMouseUp = () => {
    isMouseDownRef.current = false;
  };

  const handleResetCameraView = () => {
    targetYawRef.current = CENTER_YAW;
    targetPitchRef.current = 0;
  };

  // --- BUTTON CONTROL ACTIONS: FORWARD & BACKWARD ---
  const startWalkingForward = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    walkDirRef.current = -1;
    setIsWalkingForward(true);
  };

  const stopWalkingForward = (e?: React.SyntheticEvent) => {
    if (e) e.stopPropagation();
    if (walkDirRef.current === -1) {
      walkDirRef.current = 0;
    }
    setIsWalkingForward(false);
  };

  const startWalkingBackward = (e: React.SyntheticEvent) => {
    e.stopPropagation();
    walkDirRef.current = 1;
    setIsWalkingBackward(true);
  };

  const stopWalkingBackward = (e?: React.SyntheticEvent) => {
    if (e) e.stopPropagation();
    if (walkDirRef.current === 1) {
      walkDirRef.current = 0;
    }
    setIsWalkingBackward(false);
  };

  // Desktop keyboard controls (W/Up to move forward, S/Down to step back)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'w' || key === 'arrowup') {
        keysDownRef.current.forward = true;
        setIsWalkingForward(true);
      }
      if (key === 's' || key === 'arrowdown') {
        keysDownRef.current.backward = true;
        setIsWalkingBackward(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'w' || key === 'arrowup') {
        keysDownRef.current.forward = false;
        setIsWalkingForward(false);
      }
      if (key === 's' || key === 'arrowdown') {
        keysDownRef.current.backward = false;
        setIsWalkingBackward(false);
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
      className="absolute inset-0 w-full h-full select-none overflow-hidden touch-none bg-[#0c0907]"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* 3D WebGL Canvas */}
      <div 
        ref={containerRef} 
        className={`absolute inset-0 w-full h-full ${
          isAtTable ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
        }`} 
      />

      {/* Center Subtle Focus Ring */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-40">
        <div className="w-2.5 h-2.5 rounded-full border border-amber-300/80 bg-white/20 shadow-sm" />
      </div>

      {/* --- HUD OVERLAY --- */}

      {/* Top Bar: Visual Range Info & Actions */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none z-30">
        <div className="flex items-center gap-2">
          {/* Angle and Position Indicator */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-black/75 backdrop-blur-md border border-white/15 text-white shadow-lg pointer-events-auto">
            {isAtTable ? (
              <>
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-mono text-[11px] font-bold text-amber-300">
                  {yawOffsetDeg >= 0 ? `+${yawOffsetDeg}°` : `${yawOffsetDeg}°`}
                </span>
                <span className="text-[9px] text-white/50 font-mono">/ ±30°</span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-amber-400/80" />
                <span className="font-mono text-[10px] text-amber-200">
                  前進中 (視角鎖定)
                </span>
              </>
            )}
            <span className="text-[10px] text-white/30 font-mono">|</span>
            <span className="font-mono text-[10px] text-white/70">
              距木桌 {playerDistanceToTable}m
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-950/70 border border-amber-600/40 text-amber-200 text-[10px] font-mono font-bold">
            <span>深木質空間 • 寬木桌</span>
          </div>
        </div>

        {/* Top Right Action Buttons */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* Sound Toggle */}
          <button
            onClick={onToggleSound}
            className="p-2 rounded-xl bg-black/70 hover:bg-black/90 backdrop-blur-md border border-white/15 text-white active:scale-95 transition-all shadow-md cursor-pointer"
            title="音效開關"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-amber-300" /> : <VolumeX className="w-3.5 h-3.5 text-white/40" />}
          </button>

          {/* Reset View Button (only active if at table) */}
          {isAtTable && (
            <button
              onClick={handleResetCameraView}
              className="p-2 rounded-xl bg-black/70 hover:bg-black/90 backdrop-blur-md border border-white/15 text-white/80 active:scale-95 transition-all shadow-md cursor-pointer"
              title="視角回正 (正對小木桌)"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-300" />
            </button>
          )}

          {/* Menu Button */}
          <button
            onClick={onOpenMenu}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-700 hover:brightness-110 text-white font-mono font-bold text-xs tracking-wider flex items-center gap-1.5 border border-amber-400/40 shadow-[0_0_15px_rgba(217,119,6,0.35)] active:scale-95 transition-all cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5 text-amber-200" />
            <span>探索選單</span>
          </button>

          {/* Exit Room Button */}
          <button
            onClick={onExitRoom}
            className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white/90 font-mono text-xs font-bold tracking-wider flex items-center gap-1.5 active:scale-95 transition-all shadow-md cursor-pointer"
          >
            <DoorClosed className="w-3.5 h-3.5 text-amber-300" />
            <span>退出</span>
          </button>
        </div>
      </div>

      {/* Floating State Hint Banner */}
      <div className="absolute top-15 left-0 right-0 flex justify-center pointer-events-none z-20 px-4">
        <div className="px-4 py-1.5 rounded-full bg-black/75 backdrop-blur-md border border-white/15 text-white text-[11px] font-mono tracking-wider flex items-center gap-2 shadow-xl">
          {isAtTable ? (
            <>
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-amber-200 font-bold">已抵達木桌邊 • 可左右滑動環顧視角 (60°)</span>
            </>
          ) : (
            <>
              <Lock className="w-3 h-3 text-amber-400/90" />
              <span>直行前往木桌 • 抵達木桌前固定視角</span>
            </>
          )}
        </div>
      </div>

      {/* --- FORWARD & RETREAT WALKING BUTTONS (REPLACED JOYSTICK) --- */}
      <div className="absolute bottom-6 left-6 z-30 select-none flex items-center gap-3">
        {/* Main "向前進" Button (User request: 將搖桿改為向前進的按鈕) */}
        <div className="flex flex-col items-start gap-1">
          <button
            type="button"
            onPointerDown={startWalkingForward}
            onPointerUp={stopWalkingForward}
            onPointerLeave={stopWalkingForward}
            onContextMenu={(e) => e.preventDefault()}
            className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl border-2 transition-all duration-150 select-none cursor-pointer shadow-[0_6px_25px_rgba(0,0,0,0.65)] ${
              isWalkingForward
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 border-amber-300 text-white scale-95 shadow-[0_0_25px_rgba(245,158,11,0.6)]'
                : isAtTable
                ? 'bg-black/65 hover:bg-black/80 border-amber-500/50 text-amber-200'
                : 'bg-gradient-to-r from-amber-700/80 to-amber-800/80 hover:brightness-110 border-amber-400/80 text-white shadow-[0_0_18px_rgba(217,119,6,0.35)]'
            }`}
            style={{ touchAction: 'none' }}
          >
            <div className={`p-1.5 rounded-xl ${isWalkingForward ? 'bg-white/20' : 'bg-black/30'}`}>
              <ArrowUp className={`w-5 h-5 ${isWalkingForward ? 'text-white' : 'text-amber-300'}`} />
            </div>
            <div className="flex flex-col items-start">
              <span className="font-mono text-sm font-bold tracking-wider">
                {isWalkingForward ? '步行前進中...' : '向前進'}
              </span>
              <span className="text-[9px] text-white/60 font-mono tracking-tight">
                {isAtTable ? '已達木桌邊緣' : '長按或點擊推進'}
              </span>
            </div>
          </button>
        </div>

        {/* Secondary "後退" Button (allows stepping back towards the entrance door) */}
        <button
          type="button"
          onPointerDown={startWalkingBackward}
          onPointerUp={stopWalkingBackward}
          onPointerLeave={stopWalkingBackward}
          onContextMenu={(e) => e.preventDefault()}
          className={`flex items-center gap-1.5 px-3.5 py-3.5 rounded-2xl border transition-all duration-150 select-none cursor-pointer shadow-md ${
            isWalkingBackward
              ? 'bg-amber-700/80 border-amber-300 text-white scale-95'
              : 'bg-black/60 hover:bg-black/80 border-white/20 text-white/70 hover:text-white'
          }`}
          title="後退 (退回門邊)"
          style={{ touchAction: 'none' }}
        >
          <ArrowDown className="w-4 h-4 text-amber-300/80" />
          <span className="font-mono text-xs font-medium">後退</span>
        </button>
      </div>

      {/* Bottom Right Guidance Badge */}
      <div className="absolute bottom-6 right-6 pointer-events-none z-20 hidden xs:flex flex-col items-end gap-1.5">
        {isAtTable ? (
          <div className="px-3.5 py-1.5 rounded-xl bg-amber-950/80 backdrop-blur-md border border-amber-500/40 text-amber-200 text-[11px] font-mono tracking-wider flex items-center gap-2 shadow-lg">
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            <span>左右滑動環顧 (±30°)</span>
          </div>
        ) : (
          <div className="px-3.5 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white/50 text-[10px] font-mono tracking-wider flex items-center gap-2">
            <Lock className="w-3 h-3 text-white/40" />
            <span>抵達木桌後解鎖視角</span>
          </div>
        )}
      </div>
    </div>
  );
};
