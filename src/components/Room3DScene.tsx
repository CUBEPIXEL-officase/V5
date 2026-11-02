import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  DoorClosed, 
  Layers,
  ArrowUp,
  Armchair,
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

export type SitState = 'standing_entrance' | 'walking_to_table' | 'sitting_down' | 'seated' | 'standing_up';

export const Room3DScene: React.FC<Room3DSceneProps> = ({
  onExitRoom,
  onOpenMenu,
  soundEnabled,
  onToggleSound,
  playFootstep,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Angle constraints: 60° horizontal range (±30° from forward), slight pitch down and up
  // Rotated 180°: CENTER_YAW = 0 looks straight forward (-Z) towards the front wooden desk & bonsai
  const CENTER_YAW = 0; 
  const YAW_RANGE_HALF = (35 * Math.PI) / 180; // 35 degrees each side = 70 degrees total
  const MIN_YAW = CENTER_YAW - YAW_RANGE_HALF;
  const MAX_YAW = CENTER_YAW + YAW_RANGE_HALF;

  const MIN_PITCH = (-20 * Math.PI) / 180; // 低頭看茶几茶具 (~20 degrees down)
  const MAX_PITCH = (25 * Math.PI) / 180; // 抬頭看木樑挑高天花板 (~25 degrees up)

  // Room Dimensions (User Request: 將房間改為10米*10米)
  const ROOM_WIDTH = 10.0;
  const ROOM_HEIGHT = 3.2;
  const ROOM_DEPTH = 10.0;
  const TABLE_DEPTH = 0.75; // 牆邊木桌深度
  const TABLE_HEIGHT = 1.0; // 牆邊木桌高度 (高檯設計)

  // Key Positions
  const STAND_HEIGHT = 1.55;
  const SEATED_HEIGHT = 0.68; // 盤腿/屈膝坐於坐墊時的視線高度
  const ENTRANCE_Z = 4.2; // 站在房門前 (背對房門，面朝茶几與盆栽)
  const SEATED_Z = 0.72; // 茶几南側坐墊位置 (茶几正前方)

  // HUD & Game State
  const [yawOffsetDeg, setYawOffsetDeg] = useState(0);
  const [sitState, setSitState] = useState<SitState>('standing_entrance');

  // References for render loop & input handling
  const sitStateRef = useRef<SitState>('standing_entrance');
  useEffect(() => {
    sitStateRef.current = sitState;
  }, [sitState]);

  // Touch look tracking (enabled ONLY when seated at table)
  const lookTouchIdRef = useRef<number | null>(null);
  const lookLastPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Desktop mouse look tracking (enabled ONLY when seated at table)
  const isMouseDownRef = useRef(false);
  const mouseLastPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Camera angles (strictly locked to CENTER_YAW / 0 until seated at table)
  const cameraYawRef = useRef<number>(CENTER_YAW);
  const cameraPitchRef = useRef<number>(0);
  const targetYawRef = useRef<number>(CENTER_YAW);
  const targetPitchRef = useRef<number>(0);

  // Player position: spawns just in front of the door at Z = 4.2, standing at 1.55m
  const playerPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, STAND_HEIGHT, ENTRANCE_Z));
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

    // --- 4. WALL-SIDE WOODEN TABLE (牆邊木桌 - 寬度縮小，移去舊物件，置放盆栽) ---
    const tableGroup = new THREE.Group();
    const TABLE_WIDTH = 2.6; // 寬度稍微縮小 (由原本滿牆 4.6m 縮為 2.6m，兩側留出空間)
    const TABLE_TOP_THICK = 0.055;

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

    // Tabletop Slab
    const topGeo = new THREE.BoxGeometry(TABLE_WIDTH, TABLE_TOP_THICK, TABLE_DEPTH);
    const tableTop = new THREE.Mesh(topGeo, tableMat);
    tableTop.position.set(0, TABLE_HEIGHT - TABLE_TOP_THICK / 2, 0);
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    tableGroup.add(tableTop);

    // Front apron rail
    const apronGeo = new THREE.BoxGeometry(TABLE_WIDTH - 0.12, 0.07, 0.035);
    const apronFront = new THREE.Mesh(apronGeo, tableDarkWoodMat);
    apronFront.position.set(0, TABLE_HEIGHT - TABLE_TOP_THICK - 0.035, TABLE_DEPTH / 2 - 0.04);
    tableGroup.add(apronFront);

    // 4 Clean Corner Legs
    const legThick = 0.065;
    const legHeight = TABLE_HEIGHT - TABLE_TOP_THICK;
    const legGeo = new THREE.BoxGeometry(legThick, legHeight, legThick);

    const legPositions = [
      [-TABLE_WIDTH / 2 + 0.06, legHeight / 2, -TABLE_DEPTH / 2 + 0.06],
      [TABLE_WIDTH / 2 - 0.06, legHeight / 2, -TABLE_DEPTH / 2 + 0.06],
      [-TABLE_WIDTH / 2 + 0.06, legHeight / 2, TABLE_DEPTH / 2 - 0.06],
      [TABLE_WIDTH / 2 - 0.06, legHeight / 2, TABLE_DEPTH / 2 - 0.06],
    ];
    legPositions.forEach(([lx, ly, lz]) => {
      const leg = new THREE.Mesh(legGeo, tableDarkWoodMat);
      leg.position.set(lx, ly, lz);
      leg.castShadow = true;
      tableGroup.add(leg);
    });

    // --- BONSAI POTTED PLANT ON WALL TABLE (牆邊木桌上的精緻盆栽) ---
    const bonsaiGroup = new THREE.Group();
    bonsaiGroup.position.set(0, TABLE_HEIGHT, 0);

    // 1. Ceramic Pot (深色陶藝盆)
    const potMat = new THREE.MeshStandardMaterial({
      color: 0x1d1b19,
      roughness: 0.38,
      metalness: 0.15,
    });
    const potGeo = new THREE.CylinderGeometry(0.20, 0.14, 0.14, 24);
    const pot = new THREE.Mesh(potGeo, potMat);
    pot.position.y = 0.07;
    pot.castShadow = true;
    pot.receiveShadow = true;
    bonsaiGroup.add(pot);

    // Pot Rim
    const rimGeo = new THREE.TorusGeometry(0.20, 0.016, 12, 24);
    const rim = new THREE.Mesh(rimGeo, potMat);
    rim.position.y = 0.14;
    rim.rotation.x = Math.PI / 2;
    bonsaiGroup.add(rim);

    // Pot Soil (深色濕潤盆土)
    const soilMat = new THREE.MeshStandardMaterial({
      color: 0x120c08,
      roughness: 0.95,
    });
    const soilGeo = new THREE.CylinderGeometry(0.19, 0.19, 0.02, 24);
    const soil = new THREE.Mesh(soilGeo, soilMat);
    soil.position.y = 0.135;
    bonsaiGroup.add(soil);

    // Moss Clumps on Soil Surface
    const mossMat = new THREE.MeshStandardMaterial({
      color: 0x2e4a21,
      roughness: 0.9,
    });
    [
      [-0.08, 0.142, 0.05, 0.045],
      [0.09, 0.142, -0.04, 0.05],
      [0.02, 0.142, 0.10, 0.04],
      [-0.05, 0.142, -0.09, 0.042],
    ].forEach(([mx, my, mz, mr]) => {
      const moss = new THREE.Mesh(new THREE.SphereGeometry(mr, 10, 8), mossMat);
      moss.position.set(mx, my, mz);
      moss.scale.set(1.4, 0.45, 1.2);
      bonsaiGroup.add(moss);
    });

    // 2. Bonsai Curved Trunk & Branches (曲幹老松主幹)
    const barkMat = new THREE.MeshStandardMaterial({
      color: 0x2c1b12,
      roughness: 0.85,
      metalness: 0.05,
    });

    // Trunk Segment 1 (Base)
    const trunk1 = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.05, 0.16, 12), barkMat);
    trunk1.position.set(0.01, 0.20, 0.01);
    trunk1.rotation.set(0.12, 0.2, -0.22);
    trunk1.castShadow = true;
    bonsaiGroup.add(trunk1);

    // Trunk Segment 2 (Mid Curve)
    const trunk2 = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.036, 0.16, 12), barkMat);
    trunk2.position.set(-0.035, 0.32, 0.03);
    trunk2.rotation.set(-0.15, -0.1, 0.35);
    trunk2.castShadow = true;
    bonsaiGroup.add(trunk2);

    // Trunk Segment 3 (Crown Lead)
    const trunk3 = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.026, 0.14, 12), barkMat);
    trunk3.position.set(0.02, 0.43, 0.01);
    trunk3.rotation.set(0.1, 0.3, -0.18);
    trunk3.castShadow = true;
    bonsaiGroup.add(trunk3);

    // Left lateral branch
    const branchL = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.020, 0.18, 10), barkMat);
    branchL.position.set(-0.10, 0.35, 0.04);
    branchL.rotation.set(-0.2, -0.4, 1.15);
    branchL.castShadow = true;
    bonsaiGroup.add(branchL);

    // Right lateral branch
    const branchR = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.020, 0.19, 10), barkMat);
    branchR.position.set(0.11, 0.40, -0.02);
    branchR.rotation.set(0.2, 0.3, -1.05);
    branchR.castShadow = true;
    bonsaiGroup.add(branchR);

    // 3. Foliage Clouds (翠綠松團層次)
    const leafMatDeep = new THREE.MeshStandardMaterial({
      color: 0x1e421c,
      roughness: 0.65,
    });
    const leafMatMid = new THREE.MeshStandardMaterial({
      color: 0x2d5c29,
      roughness: 0.6,
    });
    const leafMatBright = new THREE.MeshStandardMaterial({
      color: 0x3d7037,
      roughness: 0.55,
    });

    const foliageClusters = [
      // Apex / Crown
      { x: 0.01, y: 0.52, z: 0.00, sx: 0.16, sy: 0.08, sz: 0.14, mat: leafMatBright },
      { x: 0.04, y: 0.49, z: -0.03, sx: 0.14, sy: 0.07, sz: 0.13, mat: leafMatMid },
      // Left branch foliage
      { x: -0.18, y: 0.38, z: 0.06, sx: 0.17, sy: 0.07, sz: 0.14, mat: leafMatMid },
      { x: -0.15, y: 0.35, z: 0.02, sx: 0.13, sy: 0.06, sz: 0.12, mat: leafMatDeep },
      // Right branch foliage
      { x: 0.20, y: 0.43, z: -0.03, sx: 0.18, sy: 0.075, sz: 0.15, mat: leafMatBright },
      { x: 0.16, y: 0.40, z: 0.02, sx: 0.14, sy: 0.065, sz: 0.12, mat: leafMatMid },
      // Mid shelf foliage
      { x: -0.04, y: 0.44, z: -0.06, sx: 0.12, sy: 0.06, sz: 0.11, mat: leafMatDeep },
      { x: 0.08, y: 0.37, z: 0.05, sx: 0.13, sy: 0.06, sz: 0.11, mat: leafMatMid },
    ];

    foliageClusters.forEach((c) => {
      const fGeo = new THREE.SphereGeometry(1, 12, 10);
      const foliage = new THREE.Mesh(fGeo, c.mat);
      foliage.position.set(c.x, c.y, c.z);
      foliage.scale.set(c.sx, c.sy, c.sz);
      foliage.castShadow = true;
      foliage.receiveShadow = true;
      bonsaiGroup.add(foliage);
    });

    // Soft subtle spotlight highlighting the bonsai
    const bonsaiSpot = new THREE.PointLight(0xffeed6, 1.4, 3.5, 1.2);
    bonsaiSpot.position.set(0, 0.75, 0.25);
    bonsaiSpot.castShadow = true;
    bonsaiGroup.add(bonsaiSpot);

    tableGroup.add(bonsaiGroup);

    tableGroup.position.set(0, 0, -ROOM_DEPTH / 2 + TABLE_DEPTH / 2);
    roomGroup.add(tableGroup);

    // --- 4B. CENTER WOODEN TEA TABLE & FLOOR CUSHIONS (房間正中間木頭茶几與小坐墊) ---
    const centerTeaGroup = new THREE.Group();
    centerTeaGroup.position.set(0, 0, 0); // Exact center of the room

    const TEA_TABLE_WIDTH = 1.18;
    const TEA_TABLE_DEPTH = 0.64;
    const TEA_TABLE_HEIGHT = 0.32;
    const TEA_TABLE_TOP_THICK = 0.036;

    // Tea Table Top Slab
    const teaTopGeo = new THREE.BoxGeometry(TEA_TABLE_WIDTH, TEA_TABLE_TOP_THICK, TEA_TABLE_DEPTH);
    const teaTop = new THREE.Mesh(teaTopGeo, tableMat);
    teaTop.position.set(0, TEA_TABLE_HEIGHT - TEA_TABLE_TOP_THICK / 2, 0);
    teaTop.castShadow = true;
    teaTop.receiveShadow = true;
    centerTeaGroup.add(teaTop);

    // Tea Table Legs
    const teaLegHeight = TEA_TABLE_HEIGHT - TEA_TABLE_TOP_THICK;
    const teaLegThick = 0.052;
    const teaLegGeo = new THREE.BoxGeometry(teaLegThick, teaLegHeight, teaLegThick);
    const teaLegPositions = [
      [-TEA_TABLE_WIDTH / 2 + 0.05, teaLegHeight / 2, -TEA_TABLE_DEPTH / 2 + 0.05],
      [TEA_TABLE_WIDTH / 2 - 0.05, teaLegHeight / 2, -TEA_TABLE_DEPTH / 2 + 0.05],
      [-TEA_TABLE_WIDTH / 2 + 0.05, teaLegHeight / 2, TEA_TABLE_DEPTH / 2 - 0.05],
      [TEA_TABLE_WIDTH / 2 - 0.05, teaLegHeight / 2, TEA_TABLE_DEPTH / 2 - 0.05],
    ];
    teaLegPositions.forEach(([lx, ly, lz]) => {
      const leg = new THREE.Mesh(teaLegGeo, tableDarkWoodMat);
      leg.position.set(lx, ly, lz);
      leg.castShadow = true;
      centerTeaGroup.add(leg);
    });

    // Elegant tea tray on tea table
    const teaTrayGeo = new THREE.BoxGeometry(0.30, 0.012, 0.20);
    const teaTrayMat = new THREE.MeshStandardMaterial({ color: 0x1f120a, roughness: 0.5 });
    const teaTray = new THREE.Mesh(teaTrayGeo, teaTrayMat);
    teaTray.position.set(0, TEA_TABLE_HEIGHT + 0.006, 0);
    teaTray.receiveShadow = true;
    centerTeaGroup.add(teaTray);

    // Dark clay teapot
    const teapotGeo = new THREE.CylinderGeometry(0.038, 0.050, 0.058, 16);
    const teaPotMat = new THREE.MeshStandardMaterial({ color: 0x2b332e, roughness: 0.35, metalness: 0.1 });
    const teapot = new THREE.Mesh(teapotGeo, teaPotMat);
    teapot.position.set(-0.05, TEA_TABLE_HEIGHT + 0.040, 0);
    teapot.castShadow = true;
    centerTeaGroup.add(teapot);

    // Ceramic teacups
    const cupMat = new THREE.MeshStandardMaterial({ color: 0xe8e2d8, roughness: 0.4 });
    const cup1 = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.018, 0.034, 14), cupMat);
    cup1.position.set(0.05, TEA_TABLE_HEIGHT + 0.028, -0.035);
    cup1.castShadow = true;
    centerTeaGroup.add(cup1);

    const cup2 = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.018, 0.034, 14), cupMat);
    cup2.position.set(0.05, TEA_TABLE_HEIGHT + 0.028, 0.035);
    cup2.castShadow = true;
    centerTeaGroup.add(cup2);

    // --- Floor Cushions (小坐墊 / 和室厚坐墊) ---
    const cushionMatCharcoal = new THREE.MeshStandardMaterial({
      color: 0x2d2823, // 深炭灰織物
      roughness: 0.85,
    });
    const cushionMatEarth = new THREE.MeshStandardMaterial({
      color: 0x3a3229, // 溫暖大地色麻布
      roughness: 0.85,
    });

    const cushionGeo = new THREE.CylinderGeometry(0.20, 0.21, 0.060, 24);
    const cushionPositions = [
      // Left cushion (西側)
      { x: -TEA_TABLE_WIDTH / 2 - 0.24, z: 0, mat: cushionMatCharcoal },
      // Right cushion (東側)
      { x: TEA_TABLE_WIDTH / 2 + 0.24, z: 0, mat: cushionMatEarth },
      // South cushion (南側 - 面朝前門)
      { x: 0, z: TEA_TABLE_DEPTH / 2 + 0.24, mat: cushionMatEarth },
      // North cushion (北側 - 面朝木桌盆栽)
      { x: 0, z: -TEA_TABLE_DEPTH / 2 - 0.24, mat: cushionMatCharcoal },
    ];

    cushionPositions.forEach((pos) => {
      const cushionGroup = new THREE.Group();
      cushionGroup.position.set(pos.x, 0.03, pos.z);

      const cushion = new THREE.Mesh(cushionGeo, pos.mat);
      cushion.castShadow = true;
      cushion.receiveShadow = true;
      cushionGroup.add(cushion);

      // Center tuft button
      const buttonGeo = new THREE.SphereGeometry(0.016, 10, 8);
      const buttonMat = new THREE.MeshStandardMaterial({ color: 0x16120e, roughness: 0.6 });
      const button = new THREE.Mesh(buttonGeo, buttonMat);
      button.position.y = 0.031;
      button.scale.set(1, 0.4, 1);
      cushionGroup.add(button);

      centerTeaGroup.add(cushionGroup);
    });

    roomGroup.add(centerTeaGroup);

    scene.add(roomGroup);

    // --- 5. ATMOSPHERIC WARM LIGHTING RIG ---
    const ambientLight = new THREE.AmbientLight(0xffecd6, 0.85);
    scene.add(ambientLight);

    // Ceiling Main Downlight (10m x 10m room coverage)
    const ceilingDownlight = new THREE.PointLight(0xffebd2, 2.8, 22, 1.1);
    ceilingDownlight.position.set(0, ROOM_HEIGHT - 0.25, 0);
    ceilingDownlight.castShadow = true;
    ceilingDownlight.shadow.mapSize.width = 1024;
    ceilingDownlight.shadow.mapSize.height = 1024;
    ceilingDownlight.shadow.bias = -0.001;
    scene.add(ceilingDownlight);

    // Wooden Ceiling Fixture
    const fixGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.05, 24);
    const fixMat = new THREE.MeshStandardMaterial({ color: 0x22130a, roughness: 0.5 });
    const fixture = new THREE.Mesh(fixGeo, fixMat);
    fixture.position.set(0, ROOM_HEIGHT - 0.025, 0);
    scene.add(fixture);

    const diffGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.02, 24);
    const diffMat = new THREE.MeshBasicMaterial({ color: 0xfffae6 });
    const diffuser = new THREE.Mesh(diffGeo, diffMat);
    diffuser.position.set(0, ROOM_HEIGHT - 0.055, 0);
    scene.add(diffuser);

    // Hanging Wooden Pendant Lamp above Center Tea Table
    const pendantGroup = new THREE.Group();
    pendantGroup.position.set(0, ROOM_HEIGHT, 0);

    const cordGeo = new THREE.CylinderGeometry(0.005, 0.005, 1.4, 8);
    const cordMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const cord = new THREE.Mesh(cordGeo, cordMat);
    cord.position.y = -0.7;
    pendantGroup.add(cord);

    const shadeGeo = new THREE.CylinderGeometry(0.24, 0.34, 0.32, 16);
    const shadeMat = new THREE.MeshStandardMaterial({ color: 0x28180c, roughness: 0.6 });
    const shade = new THREE.Mesh(shadeGeo, shadeMat);
    shade.position.y = -1.50;
    pendantGroup.add(shade);

    // Warm golden glow illuminating the tea table
    const teaTablePendantLight = new THREE.PointLight(0xffdfa4, 2.6, 6.5, 1.2);
    teaTablePendantLight.position.set(0, -1.55, 0);
    teaTablePendantLight.castShadow = true;
    pendantGroup.add(teaTablePendantLight);

    scene.add(pendantGroup);

    // Directional wall wash highlighting the front wall slats & bonsai
    const wallWashLight = new THREE.DirectionalLight(0xffe8cf, 0.7);
    wallWashLight.position.set(0, 3.5, -2.0);
    wallWashLight.target = frontWall;
    scene.add(wallWashLight);

    // Doorway spill light from outside behind the player
    const doorLight = new THREE.PointLight(0xffcf88, 1.6, 10);
    doorLight.position.set(0, 2.0, ROOM_DEPTH / 2 - 0.4);
    scene.add(doorLight);

    // --- 6. ANIMATION & RENDER LOOP ---
    let animationId: number;
    let clock = new THREE.Clock();

    const renderLoop = () => {
      const delta = Math.min(clock.getDelta(), 0.1);

      // --- USER REQUEST: "按下坐下按鈕則走到茶几邊坐下" ---
      if (sitStateRef.current === 'walking_to_table') {
        const walkSpeed = 2.6; // comfortable walking speed
        const dz = -walkSpeed * delta;
        playerPosRef.current.z += dz;
        walkDistanceRef.current += Math.abs(dz);

        // Footstep cadence
        if (walkDistanceRef.current - lastFootstepDistRef.current > 0.75) {
          lastFootstepDistRef.current = walkDistanceRef.current;
          playFootstep();
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try { navigator.vibrate(6); } catch {}
          }
        }

        // Natural walking head bob
        const walkBob = Math.sin(walkDistanceRef.current * 7.5) * 0.016;
        camera.position.set(0, STAND_HEIGHT + walkBob, playerPosRef.current.z);

        // Keep view centered forward towards the tea table & bonsai while walking
        targetYawRef.current = CENTER_YAW;
        targetPitchRef.current = 0;
        cameraYawRef.current = CENTER_YAW;
        cameraPitchRef.current = 0;

        // Reached the south cushion by the tea table
        if (playerPosRef.current.z <= SEATED_Z) {
          playerPosRef.current.z = SEATED_Z;
          sitStateRef.current = 'sitting_down';
          setSitState('sitting_down');
        }
      } else if (sitStateRef.current === 'sitting_down') {
        // Smooth transition: lowering camera from standing eye height (1.55m) down to cushion seat height (0.68m)
        playerPosRef.current.y = THREE.MathUtils.lerp(playerPosRef.current.y, SEATED_HEIGHT, 0.065);
        camera.position.set(0, playerPosRef.current.y, SEATED_Z);

        cameraYawRef.current = CENTER_YAW;
        cameraPitchRef.current = 0;

        if (Math.abs(playerPosRef.current.y - SEATED_HEIGHT) < 0.008) {
          playerPosRef.current.y = SEATED_HEIGHT;
          targetYawRef.current = CENTER_YAW;
          targetPitchRef.current = 0;
          sitStateRef.current = 'seated';
          setSitState('seated');
        }
      } else if (sitStateRef.current === 'standing_up') {
        // Smoothly rise back up to standing eye height (1.55m)
        playerPosRef.current.y = THREE.MathUtils.lerp(playerPosRef.current.y, STAND_HEIGHT, 0.07);
        targetYawRef.current = THREE.MathUtils.lerp(targetYawRef.current, CENTER_YAW, 0.1);
        cameraYawRef.current = THREE.MathUtils.lerp(cameraYawRef.current, CENTER_YAW, 0.1);
        targetPitchRef.current = THREE.MathUtils.lerp(targetPitchRef.current, 0, 0.1);
        cameraPitchRef.current = THREE.MathUtils.lerp(cameraPitchRef.current, 0, 0.1);
        camera.position.set(0, playerPosRef.current.y, playerPosRef.current.z);

        if (Math.abs(playerPosRef.current.y - STAND_HEIGHT) < 0.008) {
          playerPosRef.current.y = STAND_HEIGHT;
          sitStateRef.current = 'standing_entrance';
          setSitState('standing_entrance');
        }
      } else if (sitStateRef.current === 'seated') {
        // Seated comfortably at tea table: allow smooth interactive look around
        cameraYawRef.current = THREE.MathUtils.lerp(cameraYawRef.current, targetYawRef.current, 0.18);
        cameraPitchRef.current = THREE.MathUtils.lerp(cameraPitchRef.current, targetPitchRef.current, 0.18);
        camera.position.set(0, SEATED_HEIGHT, SEATED_Z);
      } else {
        // Standing at entrance
        cameraYawRef.current = CENTER_YAW;
        cameraPitchRef.current = 0;
        camera.position.set(0, STAND_HEIGHT, playerPosRef.current.z);
      }

      camera.rotation.y = cameraYawRef.current;
      camera.rotation.x = cameraPitchRef.current;

      // HUD values
      const currentYawOffset = Math.round((cameraYawRef.current - CENTER_YAW) * (180 / Math.PI));
      setYawOffsetDeg(currentYawOffset);

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
  }, [playFootstep, CENTER_YAW, ENTRANCE_Z, SEATED_Z, STAND_HEIGHT, SEATED_HEIGHT]);

  // --- TOUCH HANDLERS (VIEW ROTATION ONLY WHEN SEATED) ---
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (sitStateRef.current !== 'seated') return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (lookTouchIdRef.current === null) {
        lookTouchIdRef.current = touch.identifier;
        lookLastPosRef.current = { x: touch.clientX, y: touch.clientY };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (sitStateRef.current !== 'seated') return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === lookTouchIdRef.current) {
        const deltaX = touch.clientX - lookLastPosRef.current.x;
        const deltaY = touch.clientY - lookLastPosRef.current.y;
        lookLastPosRef.current = { x: touch.clientX, y: touch.clientY };

        const sensitivity = 0.0035;
        targetYawRef.current -= deltaX * sensitivity;
        targetPitchRef.current -= deltaY * sensitivity;

        // Clamp to 70° horizontal (±35°) and slight look up/down
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

  // --- DESKTOP MOUSE LOOK (ENABLED ONLY WHEN SEATED) ---
  const handleMouseDown = (e: React.MouseEvent) => {
    if (sitStateRef.current !== 'seated') return;
    isMouseDownRef.current = true;
    mouseLastPosRef.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (sitStateRef.current !== 'seated' || !isMouseDownRef.current) return;
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

  // --- BUTTON CONTROL: 坐下 / 站起 ---
  const handleSitOrStand = (e?: React.SyntheticEvent) => {
    if (e) e.stopPropagation();
    if (sitStateRef.current === 'standing_entrance') {
      sitStateRef.current = 'walking_to_table';
      setSitState('walking_to_table');
    } else if (sitStateRef.current === 'seated') {
      sitStateRef.current = 'standing_up';
      setSitState('standing_up');
    }
  };

  // Keyboard shortcut (Space / Enter to Sit or Stand)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Enter') {
        handleSitOrStand();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isSeated = sitState === 'seated';
  const isMoving = sitState === 'walking_to_table' || sitState === 'sitting_down' || sitState === 'standing_up';

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
          isSeated ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
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
            {isSeated ? (
              <>
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-mono text-[11px] font-bold text-amber-300">
                  {yawOffsetDeg >= 0 ? `+${yawOffsetDeg}°` : `${yawOffsetDeg}°`}
                </span>
                <span className="text-[9px] text-white/50 font-mono">/ ±35°</span>
                <span className="text-[10px] text-white/30 font-mono">|</span>
                <span className="font-mono text-[10px] text-amber-200/90">茶几座席</span>
              </>
            ) : isMoving ? (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
                <span className="font-mono text-[10px] text-amber-200">
                  {sitState === 'walking_to_table' ? '走向茶几中...' : sitState === 'sitting_down' ? '落座茶席中...' : '起身中...'}
                </span>
              </>
            ) : (
              <>
                <Lock className="w-3.5 h-3.5 text-amber-400/80" />
                <span className="font-mono text-[10px] text-amber-200">
                  門邊站立 (背對房門)
                </span>
              </>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-950/70 border border-amber-600/40 text-amber-200 text-[10px] font-mono font-bold">
            <span>10m × 10m 寬敞茶室空間</span>
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

          {/* Reset View Button (only active if seated) */}
          {isSeated && (
            <button
              onClick={handleResetCameraView}
              className="p-2 rounded-xl bg-black/70 hover:bg-black/90 backdrop-blur-md border border-white/15 text-white/80 active:scale-95 transition-all shadow-md cursor-pointer"
              title="視角回正 (正對茶几與遠處盆栽)"
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
          {isSeated ? (
            <>
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-amber-200 font-bold">已在茶几旁就座 • 可滑動環顧茶室空間 (±35°)</span>
            </>
          ) : isMoving ? (
            <>
              <Sparkles className="w-3 h-3 text-amber-400/90 animate-spin" />
              <span>正在前往茶席入座...</span>
            </>
          ) : (
            <>
              <Armchair className="w-3 h-3 text-amber-400/90" />
              <span>點擊下方「坐下」走至房間中央茶几入座</span>
            </>
          )}
        </div>
      </div>

      {/* --- USER REQUEST: 刪除移動按鈕 並新增一個按鈕「坐下」 (按下則走到茶几邊坐下) --- */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30 select-none flex items-center justify-center">
        <button
          type="button"
          onClick={handleSitOrStand}
          disabled={isMoving}
          className={`group flex items-center gap-3.5 px-8 py-4 rounded-2xl border-2 transition-all duration-300 select-none cursor-pointer shadow-[0_8px_32px_rgba(0,0,0,0.75)] ${
            isMoving
              ? 'bg-amber-950/80 border-amber-500/50 text-amber-300/80 cursor-wait'
              : isSeated
              ? 'bg-black/85 hover:bg-black/95 border-amber-400/70 text-amber-200 active:scale-95 hover:border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.25)]'
              : 'bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:brightness-110 border-amber-300 text-white active:scale-95 shadow-[0_0_30px_rgba(245,158,11,0.5)]'
          }`}
        >
          <div className="p-2 rounded-xl bg-black/30">
            {isSeated ? (
              <ArrowUp className="w-5 h-5 text-amber-300 group-hover:-translate-y-0.5 transition-transform" />
            ) : isMoving ? (
              <Sparkles className="w-5 h-5 text-amber-300 animate-spin" />
            ) : (
              <Armchair className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
            )}
          </div>
          <div className="flex flex-col items-start">
            <span className="font-mono text-base font-bold tracking-wider">
              {isSeated
                ? '站起'
                : sitState === 'walking_to_table'
                ? '走向茶几中...'
                : sitState === 'sitting_down'
                ? '入座茶几中...'
                : sitState === 'standing_up'
                ? '起身中...'
                : '坐下'}
            </span>
            <span className="text-[10px] text-white/75 font-mono tracking-tight">
              {isSeated
                ? '點擊起身返回站立'
                : isMoving
                ? '自動行進至茶席'
                : '走到茶几邊坐下'}
            </span>
          </div>
        </button>
      </div>

      {/* Bottom Right Guidance Badge */}
      <div className="absolute bottom-6 right-6 pointer-events-none z-20 hidden sm:flex flex-col items-end gap-1.5">
        {isSeated ? (
          <div className="px-3.5 py-1.5 rounded-xl bg-amber-950/80 backdrop-blur-md border border-amber-500/40 text-amber-200 text-[11px] font-mono tracking-wider flex items-center gap-2 shadow-lg">
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            <span>左右滑動環顧茶室 (±35°)</span>
          </div>
        ) : (
          <div className="px-3.5 py-1.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-white/50 text-[10px] font-mono tracking-wider flex items-center gap-2">
            <Lock className="w-3 h-3 text-white/40" />
            <span>就座茶几後可環顧空間</span>
          </div>
        )}
      </div>
    </div>
  );
};

