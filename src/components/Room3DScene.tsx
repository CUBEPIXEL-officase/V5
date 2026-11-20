import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface Room3DSceneProps {
  onExitRoom?: () => void;
  onOpenMenu?: () => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  playFootstep?: () => void;
}

export const Room3DScene: React.FC<Room3DSceneProps> = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  // User Request: "刪除抬頭 降低左右視角轉動 將視角轉動方式從360度改為T字(左右 下視角)"
  const CENTER_YAW = 0; 
  const YAW_RANGE_HALF = (20 * Math.PI) / 180; // 降低左右視角轉動：左右各 20° (共 40° 視角)

  const getYawRangeHalf = () => {
    const cam = cameraRef.current;
    if (!cam) return YAW_RANGE_HALF;
    if (!isLobbyStyleRoom(activeRoomRef.current)) {
      return THREE.MathUtils.degToRad(72);
    }
    const halfFovYRad = THREE.MathUtils.degToRad(cam.fov * 0.5);
    const halfFovXRad = Math.atan(Math.tan(halfFovYRad) * cam.aspect);
    // Keep desktop at ±20°, while allowing narrow/portrait viewports to pan smoothly to the left wall corner (~62° horizontal edge)
    return Math.max(YAW_RANGE_HALF, THREE.MathUtils.degToRad(62) - halfFovXRad);
  };

  const MIN_PITCH = (-26 * Math.PI) / 180; // 下視角：俯視茶几茶具與檯燈 (~26 degrees down)
  const MAX_PITCH = 0; // 刪除抬頭：平視水平線為頂限，不可抬頭 (0 degrees)

  // Room Dimensions (房間的寬度 10*7米)
  const ROOM_WIDTH = 10.0; // 寬度 10 米
  const ROOM_HEIGHT = 3.0; // 挑高 3 米
  const ROOM_DEPTH = 7.0;  // 深度 7 米
  const TABLE_DEPTH = 0.70; // 牆邊木桌深度
  const TABLE_HEIGHT = 0.95; // 牆邊木桌高度

  // Key Seated Position (直接坐在茶几南側坐墊前)
  const SEATED_HEIGHT = 0.68; // 坐姿視線高度
  const SEATED_Z = 1.15; // 圓形茶几南側坐墊位置 (圓几半徑 0.85m + 坐墊中心 0.30m)

  type ExtraRoomId = 'purple' | 'green' | 'gold' | 'cyan' | 'cyan_b1' | 'royalblue' | 'brown';
  type RoomId = 'lobby' | ExtraRoomId;
  const isLobbyStyleRoom = (id: RoomId) => id === 'lobby' || id === 'royalblue' || id === 'brown';
  const isFoyerRoom = (id: RoomId) => id === 'cyan' || id === 'cyan_b1';

  // Game, Camera Location, Active Portal Room & Light State
  const [isLampOn, setIsLampOn] = useState(true);
  const [isConsoleHeld, setIsConsoleHeld] = useState(false);
  const [isScreenActive, setIsScreenActive] = useState(false);
  const [viewLocation, setViewLocation] = useState<'table' | 'cabinet' | 'door' | 'door2' | 'center'>('table');
  const viewLocationRef = useRef<'table' | 'cabinet' | 'door' | 'door2' | 'center'>('table');
  const [activeRoom, setActiveRoom] = useState<RoomId>('lobby');
  const activeRoomRef = useRef<RoomId>('lobby');
  const [isCyanFloorDialogOpen, setIsCyanFloorDialogOpen] = useState(false);
  const isCyanFloorDialogOpenRef = useRef(false);
  const enterPortalRoomRef = useRef<
    ((targetRoom: RoomId, spawnView?: 'table' | 'door' | 'door2') => void) | null
  >(null);
  const portalVeilRef = useRef<HTMLDivElement | null>(null);
  const portalSwapTimeoutRef = useRef<number | null>(null);
  const portalFadeEndTimeoutRef = useRef<number | null>(null);

  const desktopEmbedUrl = React.useMemo(() => {
    if (typeof window === 'undefined') return '?desktop=1';
    const url = new URL(window.location.href);
    url.searchParams.set('desktop', '1');
    return url.toString();
  }, []);

  // Camera & Raycaster Refs
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const sceneRef = useRef<THREE.Scene | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);
  const hemiLightRef = useRef<THREE.HemisphereLight | null>(null);
  const lobbyRoomGroupRef = useRef<THREE.Group | null>(null);
  const consoleSceneRef = useRef<THREE.Group | null>(null);

  // Table Lamp 3D Object Refs for interactive tap & light control
  const lampGroupRef = useRef<THREE.Group | null>(null);
  const lampHitboxRef = useRef<THREE.Mesh | null>(null);
  const lampLightRef = useRef<THREE.PointLight | null>(null);
  const lampBulbMatRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const lampShadeMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const pouchFrontMatRef = useRef<THREE.MeshPhysicalMaterial | null>(null);
  const pouchSideMatRef = useRef<THREE.MeshPhysicalMaterial | null>(null);

  // Lobby Door (大廳, 亮銀色) & Circular Steampunk 4-Color Portal Dial Refs
  const lobbyDoorHitboxRef = useRef<THREE.Mesh | null>(null);
  const lobbyDoorLeafPivotRef = useRef<THREE.Group | null>(null);
  const portalWheelRef = useRef<THREE.Group | null>(null);
  const portalOuterGearRef = useRef<THREE.Group | null>(null);
  const portalHitboxRef = useRef<THREE.Mesh | null>(null);
  const portalPointLightRef = useRef<THREE.PointLight | null>(null);
  const portalGemMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const portalSectorMatsRef = useRef<THREE.MeshStandardMaterial[]>([]);
  const portalRimGemMatsRef = useRef<THREE.MeshStandardMaterial[]>([]);
  const portalColorIdxRef = useRef<number>(0); // 0: 草綠色, 1: 紫色, 2: 金色, 3: 青色
  const portalCurrentAngleRef = useRef<number>(0);
  const portalTargetAngleRef = useRef<number>(0);

  // Colored Portal Rooms (紫色 / 綠色 / 金色 / 青色) & Steampunk Dial Refs
  interface ExtraRoomDoorState {
    roomGroup: THREE.Group | null;
    doorHitbox: THREE.Mesh | null;
    doorLeafPivot: THREE.Group | null;
    wheelGroup: THREE.Group | null;
    outerGearGroup: THREE.Group | null;
    dialHitbox: THREE.Mesh | null;
    dialLight: THREE.PointLight | null;
    tipGemMat: THREE.MeshStandardMaterial | null;
    sectorMats: THREE.MeshStandardMaterial[];
    rimGemMats: THREE.MeshStandardMaterial[];
    colors: readonly [number, number, number, number];
    hasColorSlot: readonly [boolean, boolean, boolean, boolean];
    colorIdx: number;
    currentAngle: number;
    targetAngle: number;
  }
  const createInitialExtraRoomState = (
    colors: readonly [number, number, number, number] = [0xe8eef5, 0x111216, 0x111216, 0x111216],
    hasColorSlot: readonly [boolean, boolean, boolean, boolean] = [true, false, false, false],
    initialIdx = 0,
    initialAngle = 0
  ): ExtraRoomDoorState => ({
    roomGroup: null,
    doorHitbox: null,
    doorLeafPivot: null,
    wheelGroup: null,
    outerGearGroup: null,
    dialHitbox: null,
    dialLight: null,
    tipGemMat: null,
    sectorMats: [],
    rimGemMats: [],
    colors,
    hasColorSlot,
    colorIdx: initialIdx,
    currentAngle: initialAngle,
    targetAngle: initialAngle,
  });
  const extraRoomsRef = useRef<Record<ExtraRoomId, ExtraRoomDoorState>>({
    purple: createInitialExtraRoomState(),
    green: createInitialExtraRoomState(),
    gold: createInitialExtraRoomState(),
    cyan: createInitialExtraRoomState(
      [0x111216, 0x111216, 0x111216, 0x06b6d4],
      [false, false, false, true],
      3,
      Math.PI / 2
    ),
    cyan_b1: createInitialExtraRoomState(
      [0xc2410c, 0x111216, 0x111216, 0x06b6d4], // 上: 深橘色, 右/下: 黑色(不可用), 左: 青色(回一樓大廳)
      [true, false, false, true],
      3,
      Math.PI / 2
    ),
    royalblue: createInitialExtraRoomState(
      [0xe8eef5, 0x111216, 0x111216, 0x111216], // Top: 銀色(回二樓門廊), 其餘三個黑色
      [true, false, false, false],
      0,
      0
    ),
    brown: createInitialExtraRoomState(
      [0xe8eef5, 0x111216, 0x111216, 0x111216], // Top: 銀色(回二樓門廊), 其餘三個黑色
      [true, false, false, false],
      0,
      0
    ),
  });
  // Secondary far-end door inside the 12x4m 2F Foyer (二樓的門廊, on the 4m right-side wall)
  const cyanFarDoorRef = useRef<ExtraRoomDoorState>(
    createInitialExtraRoomState(
      [0x1d4ed8, 0xaa7a4a, 0x111216, 0x111216], // 寶藍色, 略深淺棕色, 黑色(不可用), 黑色(不可用)
      [true, true, false, false],
      0,
      0
    )
  );
  // Secondary far-end door inside the 12x4m B1 Foyer (B1 門廊, on the 4m right-side wall)
  const cyanB1FarDoorRef = useRef<ExtraRoomDoorState>(
    createInitialExtraRoomState(
      [0x324b8f, 0x111216, 0x111216, 0x111216], // 上: 深湖藍紫色, 右/下/左: 黑色(不可用)
      [true, false, false, false],
      0,
      0
    )
  );
  const doorRattleTimerRef = useRef<number>(0);

  // Blue-Violet Handheld Console 3D Refs & Hold Animation Tracker
  const consoleGroupRef = useRef<THREE.Group | null>(null);
  const isConsoleHeldRef = useRef<boolean>(false);
  const consoleHoldLerpRef = useRef<number>(0);
  const isScreenActiveRef = useRef<boolean>(false);
  const screenOverlayRef = useRef<HTMLDivElement | null>(null);
  const desktopIframeRef = useRef<HTMLIFrameElement | null>(null);

  // Interactive 3D Handheld Control Refs (Left D-Pad Scroll & Right ABXY Pull Rope)
  const dpadGroupRef = useRef<THREE.Group | null>(null);
  const dpadRestZRef = useRef<number>(0);
  const dpadUpHitboxRef = useRef<THREE.Mesh | null>(null);
  const dpadDownHitboxRef = useRef<THREE.Mesh | null>(null);
  const abxyHitboxRef = useRef<THREE.Mesh | null>(null);
  const faceButtonMeshesRef = useRef<THREE.Mesh[]>([]);
  const faceButtonRestZRef = useRef<number>(0);

  const activeDpadDirRef = useRef<-1 | 0 | 1>(0);
  const dpadPressStartTimeRef = useRef<number>(0);
  const dpadHasScrolledRef = useRef<boolean>(false);
  const activeConsoleTouchIdRef = useRef<number | null>(null);
  const activeConsoleTouchRoleRef = useRef<'dpad' | 'abxy' | 'chassis' | null>(null);
  const activeConsoleMouseRoleRef = useRef<'dpad' | 'abxy' | 'chassis' | null>(null);
  const abxyPressedTimerRef = useRef<number>(0);
  const pressedFaceBtnIdxRef = useRef<number | null>(null);

  // Tap vs Drag tracking for 3D Object Interaction
  const touchStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchStartTime = useRef<number>(0);
  const touchHasMoved = useRef<boolean>(false);
  const lastTouchTimeRef = useRef<number>(0);

  const mouseStartPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const mouseStartTime = useRef<number>(0);
  const mouseHasMoved = useRef<boolean>(false);

  // Touch look tracking (enabled immediately while seated)
  const lookTouchIdRef = useRef<number | null>(null);
  const lookLastPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Desktop mouse look tracking (enabled immediately while seated)
  const isMouseDownRef = useRef(false);
  const mouseLastPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Camera angles (starts centered at 0, T-shape rotation active)
  const cameraYawRef = useRef<number>(CENTER_YAW);
  const cameraPitchRef = useRef<number>(0);
  const targetYawRef = useRef<number>(CENTER_YAW);
  const targetPitchRef = useRef<number>(0);

  // Player position: directly seated at tea table cushion
  const playerPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, SEATED_HEIGHT, SEATED_Z));

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // --- 1. SCENE SETUP (DARK COZY MOOD) ---
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x0c0907);
    scene.fog = new THREE.FogExp2(0x0c0907, 0.008);

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const camera = new THREE.PerspectiveCamera(65, width / height, 0.02, 80);
    camera.position.copy(playerPosRef.current);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = CENTER_YAW;
    camera.rotation.x = 0;
    cameraRef.current = camera;

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

    // --- 3. ROOM ARCHITECTURE (大廳 - 10x7m) ---
    const roomGroup = new THREE.Group();
    lobbyRoomGroupRef.current = roomGroup;

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

    // --- 3B. CLOSED PORTAL DOOR ("1F" / "2F" CARVED) & STEAMPUNK DIAL BUILDER ---
    const createCarvedFloorTexture = (floorText: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 176;
      const ctx = canvas.getContext('2d');
      if (!ctx) return new THREE.Texture();

      // Dark walnut carved plaque grain
      const bg = ctx.createLinearGradient(0, 0, 512, 176);
      bg.addColorStop(0, '#2a160b');
      bg.addColorStop(0.5, '#331c0f');
      bg.addColorStop(1, '#200f07');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 512, 176);

      for (let y = 0; y < 176; y += 3) {
        ctx.fillStyle = y % 6 === 0 ? 'rgba(0,0,0,0.22)' : 'rgba(180,120,70,0.06)';
        ctx.fillRect(0, y, 512, 1.5);
      }

      // Carved inner border groove
      ctx.strokeStyle = 'rgba(10, 4, 2, 0.85)';
      ctx.lineWidth = 6;
      ctx.strokeRect(14, 14, 484, 148);
      ctx.strokeStyle = 'rgba(215, 165, 92, 0.35)';
      ctx.lineWidth = 2;
      ctx.strokeRect(18, 18, 476, 140);

      // Deeply carved bevel floor lettering
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 104px Georgia, "Times New Roman", serif';

      // Bottom highlight catchlight (chiseled lower bevel)
      ctx.fillStyle = 'rgba(232, 184, 110, 0.82)';
      ctx.fillText(floorText, 257, 94);

      // Upper shadow bevel
      ctx.fillStyle = 'rgba(5, 2, 1, 0.92)';
      ctx.fillText(floorText, 255, 89);

      // Recessed carved letter face
      ctx.fillStyle = '#cfa05a';
      ctx.fillText(floorText, 256, 91);

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    };
    const doorEngravingTex = createCarvedFloorTexture('1F');
    const door2FEngravingTex = createCarvedFloorTexture('2F');
    const doorB1EngravingTex = createCarvedFloorTexture('B1');

    const createPortalDoorAndDial = (opts: {
      colors: readonly [number, number, number, number];
      hasColorSlot: readonly [boolean, boolean, boolean, boolean];
      initialIdx: number;
      currentAngle: number;
      showFloorLabel: boolean;
      floorLabelTexture?: THREE.Texture;
      accentWoodTint?: number;
    }) => {
      const doorContainer = new THREE.Group();
      const FD_WIDTH = 0.96;
      const FD_HEIGHT = 2.14;
      const FD_FRAME_W = 0.085;
      const FD_FRAME_D = 0.13;

      const frameMat = new THREE.MeshStandardMaterial({
        color: opts.accentWoodTint ?? 0x1f120a,
        roughness: 0.48,
        metalness: 0.12,
      });
      const leafMat = new THREE.MeshStandardMaterial({
        color: 0x2c170d,
        roughness: 0.42,
        metalness: 0.08,
      });
      const recessMat = new THREE.MeshStandardMaterial({
        color: 0x221008,
        roughness: 0.50,
        metalness: 0.06,
      });
      const doorBrassMat = new THREE.MeshStandardMaterial({
        color: 0xdfb15b,
        roughness: 0.24,
        metalness: 0.88,
      });

      // Outer fixed jambs, lintel & floor sill
      const leftJamb = new THREE.Mesh(
        new THREE.BoxGeometry(FD_FRAME_W, FD_HEIGHT + FD_FRAME_W, FD_FRAME_D),
        frameMat
      );
      leftJamb.position.set(-FD_WIDTH / 2 - FD_FRAME_W / 2, (FD_HEIGHT + FD_FRAME_W) / 2, FD_FRAME_D * 0.35);
      leftJamb.castShadow = true;
      leftJamb.receiveShadow = true;
      doorContainer.add(leftJamb);

      const rightJamb = new THREE.Mesh(
        new THREE.BoxGeometry(FD_FRAME_W, FD_HEIGHT + FD_FRAME_W, FD_FRAME_D),
        frameMat
      );
      rightJamb.position.set(FD_WIDTH / 2 + FD_FRAME_W / 2, (FD_HEIGHT + FD_FRAME_W) / 2, FD_FRAME_D * 0.35);
      rightJamb.castShadow = true;
      rightJamb.receiveShadow = true;
      doorContainer.add(rightJamb);

      const topLintel = new THREE.Mesh(
        new THREE.BoxGeometry(FD_WIDTH + FD_FRAME_W * 2 + 0.04, FD_FRAME_W + 0.015, FD_FRAME_D + 0.015),
        frameMat
      );
      topLintel.position.set(0, FD_HEIGHT + FD_FRAME_W / 2, FD_FRAME_D * 0.38);
      topLintel.castShadow = true;
      doorContainer.add(topLintel);

      const sill = new THREE.Mesh(
        new THREE.BoxGeometry(FD_WIDTH + FD_FRAME_W * 2, 0.022, FD_FRAME_D + 0.03),
        baseboardMat
      );
      sill.position.set(0, 0.011, FD_FRAME_D * 0.42);
      doorContainer.add(sill);

      // Carved "1F" wooden signboard plaque directly above the door lintel
      if (opts.showFloorLabel) {
        const signGroup = new THREE.Group();
        signGroup.position.set(0, FD_HEIGHT + FD_FRAME_W + 0.095, 0.042);

        const plaqueBack = new THREE.Mesh(
          new THREE.BoxGeometry(0.40, 0.135, 0.024),
          frameMat
        );
        plaqueBack.castShadow = true;
        signGroup.add(plaqueBack);

        const plaqueFront = new THREE.Mesh(
          new THREE.PlaneGeometry(0.37, 0.115),
          new THREE.MeshStandardMaterial({
            map: opts.floorLabelTexture ?? doorEngravingTex,
            roughness: 0.45,
            metalness: 0.08,
          })
        );
        plaqueFront.position.z = 0.013;
        signGroup.add(plaqueFront);

        doorContainer.add(signGroup);
      }

      // Hinge-pivoted closed leaf group (allows realistic locked rattle feedback!)
      const leafPivot = new THREE.Group();
      leafPivot.position.set(-FD_WIDTH / 2, 0, 0);
      doorContainer.add(leafPivot);

      const leafOffset = new THREE.Group();
      leafOffset.position.set(FD_WIDTH / 2, 0, 0);
      leafPivot.add(leafOffset);

      const leaf = new THREE.Mesh(new THREE.BoxGeometry(FD_WIDTH, FD_HEIGHT, 0.055), leafMat);
      leaf.position.set(0, FD_HEIGHT / 2 + 0.01, 0.034);
      leaf.castShadow = true;
      leaf.receiveShadow = true;
      leafOffset.add(leaf);

      // Classic 4 recessed wooden panels & perimeter moldings
      [
        [-0.20, 1.56, 0.30, 0.72],
        [0.20, 1.56, 0.30, 0.72],
        [-0.20, 0.62, 0.30, 0.64],
        [0.20, 0.62, 0.30, 0.64],
      ].forEach(([px, py, pw, ph]) => {
        const trim = new THREE.Mesh(new THREE.BoxGeometry(pw + 0.04, ph + 0.04, 0.016), frameMat);
        trim.position.set(px, py, 0.062);
        leafOffset.add(trim);
        const inset = new THREE.Mesh(new THREE.BoxGeometry(pw, ph, 0.012), recessMat);
        inset.position.set(px, py, 0.068);
        leafOffset.add(inset);
      });

      // Brass hinge barrels
      [0.36, 1.08, 1.80].forEach((hy) => {
        const hinge = new THREE.Mesh(new THREE.CylinderGeometry(0.010, 0.010, 0.075, 10), doorBrassMat);
        hinge.position.set(-FD_WIDTH / 2 + 0.008, hy, 0.068);
        leafOffset.add(hinge);
      });

      // Brass doorknob + keyhole escutcheon
      const escutcheon = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.165, 0.012), doorBrassMat);
      escutcheon.position.set(FD_WIDTH / 2 - 0.095, 1.02, 0.064);
      leafOffset.add(escutcheon);

      const knobNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.016, 0.036, 12), doorBrassMat);
      knobNeck.rotation.x = Math.PI / 2;
      knobNeck.position.set(FD_WIDTH / 2 - 0.095, 1.055, 0.082);
      leafOffset.add(knobNeck);

      const knobHead = new THREE.Mesh(new THREE.SphereGeometry(0.032, 16, 14), doorBrassMat);
      knobHead.position.set(FD_WIDTH / 2 - 0.095, 1.055, 0.106);
      leafOffset.add(knobHead);

      // Door click hitbox (checked AFTER the circular dial hitbox)
      const doorHitbox = new THREE.Mesh(
        new THREE.BoxGeometry(FD_WIDTH + 0.06, FD_HEIGHT, 0.14),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      doorHitbox.name = 'portal_door_hitbox';
      doorHitbox.position.set(0, FD_HEIGHT / 2, 0.07);
      leafOffset.add(doorHitbox);

      // Circular Steampunk 4-Sector Dial mounted at Peephole Spot (y = 1.54)
      const dialGroup = new THREE.Group();
      dialGroup.position.set(0, 1.54, 0.075);
      dialGroup.scale.setScalar(1.30);

      const dialIronMat = new THREE.MeshStandardMaterial({ color: 0x1c1714, roughness: 0.46, metalness: 0.78 });
      const dialBronzeMat = new THREE.MeshStandardMaterial({ color: 0x9c7435, roughness: 0.28, metalness: 0.88 });
      const dialCopperMat = new THREE.MeshStandardMaterial({ color: 0x7c4327, roughness: 0.34, metalness: 0.84 });
      const dialDarkBronzeMat = new THREE.MeshStandardMaterial({ color: 0x352717, roughness: 0.40, metalness: 0.80 });

      const circularBaseDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.126, 0.130, 0.014, 48), dialIronMat);
      circularBaseDisc.rotation.x = Math.PI / 2;
      circularBaseDisc.castShadow = true;
      circularBaseDisc.receiveShadow = true;
      dialGroup.add(circularBaseDisc);

      const outerBronzeRing = new THREE.Mesh(new THREE.TorusGeometry(0.118, 0.011, 16, 48), dialBronzeMat);
      outerBronzeRing.position.z = 0.008;
      dialGroup.add(outerBronzeRing);

      const innerCopperRing = new THREE.Mesh(new THREE.TorusGeometry(0.095, 0.0055, 12, 48), dialCopperMat);
      innerCopperRing.position.z = 0.011;
      dialGroup.add(innerCopperRing);

      for (let r = 0; r < 12; r++) {
        const ang = (r / 12) * Math.PI * 2 + Math.PI / 12;
        const rivet = new THREE.Mesh(new THREE.CylinderGeometry(0.0052, 0.0058, 0.008, 6), dialBronzeMat);
        rivet.rotation.x = Math.PI / 2;
        rivet.position.set(Math.cos(ang) * 0.116, Math.sin(ang) * 0.116, 0.016);
        dialGroup.add(rivet);
      }

      const clockworkFaceDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.094, 0.094, 0.006, 48), dialDarkBronzeMat);
      clockworkFaceDisc.rotation.x = Math.PI / 2;
      clockworkFaceDisc.position.z = 0.008;
      dialGroup.add(clockworkFaceDisc);

      const outerGearGroup = new THREE.Group();
      outerGearGroup.position.set(0, 0, 0.012);
      const gearTrackRing = new THREE.Mesh(new THREE.TorusGeometry(0.090, 0.0032, 8, 40), dialBronzeMat);
      outerGearGroup.add(gearTrackRing);
      for (let t = 0; t < 24; t++) {
        const ang = (t / 24) * Math.PI * 2;
        const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.007, 0.009, 0.005), dialBronzeMat);
        tooth.position.set(Math.cos(ang) * 0.088, Math.sin(ang) * 0.088, 0);
        tooth.rotation.z = ang;
        outerGearGroup.add(tooth);
      }
      outerGearGroup.rotation.z = -0.5 * opts.currentAngle;
      dialGroup.add(outerGearGroup);

      const SECTOR_CENTER_ANGLES = [Math.PI / 2, 0, (Math.PI * 3) / 2, Math.PI];
      const sectorMats: THREE.MeshStandardMaterial[] = [];
      const rimGemMats: THREE.MeshStandardMaterial[] = [];
      const sectorGap = 0.08;

      opts.colors.forEach((hex, idx) => {
        const cAng = SECTOR_CENTER_ANGLES[idx];
        const startAngle = cAng - Math.PI / 4 + sectorGap / 2;
        const sweep = Math.PI / 2 - sectorGap;
        const sectorShape = new THREE.Shape();
        sectorShape.absarc(0, 0, 0.083, startAngle, startAngle + sweep, false);
        sectorShape.absarc(0, 0, 0.028, startAngle + sweep, startAngle, true);
        sectorShape.closePath();

        const sectorGeo = new THREE.ExtrudeGeometry(sectorShape, {
          depth: 0.005,
          bevelEnabled: true,
          bevelThickness: 0.0012,
          bevelSize: 0.0012,
          bevelSegments: 2,
          curveSegments: 16,
        });

        const isActive = idx === opts.initialIdx;
        const hasSlot = opts.hasColorSlot[idx];
        const sectorMat = new THREE.MeshStandardMaterial({
          color: hex,
          emissive: new THREE.Color(hasSlot ? hex : 0x050508),
          emissiveIntensity: hasSlot ? (isActive ? 0.90 : 0.09) : 0.01,
          roughness: hasSlot ? (isActive ? 0.16 : 0.36) : 0.78,
          metalness: hasSlot ? (hex === 0xe8eef5 ? 0.55 : 0.16) : 0.25,
        });
        sectorMats.push(sectorMat);

        const sectorMesh = new THREE.Mesh(sectorGeo, sectorMat);
        sectorMesh.position.z = 0.011;
        dialGroup.add(sectorMesh);

        const studSocket = new THREE.Mesh(new THREE.CylinderGeometry(0.0095, 0.011, 0.007, 12), dialCopperMat);
        studSocket.rotation.x = Math.PI / 2;
        studSocket.position.set(Math.cos(cAng) * 0.104, Math.sin(cAng) * 0.104, 0.015);
        dialGroup.add(studSocket);

        const rimGemMat = new THREE.MeshStandardMaterial({
          color: hex,
          emissive: new THREE.Color(hasSlot ? hex : 0x050508),
          emissiveIntensity: hasSlot ? (isActive ? 1.0 : 0.12) : 0.01,
          roughness: hasSlot ? 0.15 : 0.72,
          metalness: hasSlot ? 0.18 : 0.25,
        });
        rimGemMats.push(rimGemMat);
        const rimGem = new THREE.Mesh(new THREE.SphereGeometry(0.0065, 12, 10), rimGemMat);
        rimGem.scale.set(1, 1, 0.65);
        rimGem.position.set(Math.cos(cAng) * 0.104, Math.sin(cAng) * 0.104, 0.019);
        dialGroup.add(rimGem);
      });

      for (let s = 0; s < 2; s++) {
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.172, 0.0055, 0.008), dialBronzeMat);
        spoke.rotation.z = Math.PI / 4 + (s * Math.PI) / 2;
        spoke.position.z = 0.016;
        dialGroup.add(spoke);
      }

      // Rotating Central Steampunk Pointer Hand + Toothed Escapement Cogwheel
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(0, 0, 0.023);

      const innerCogDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.029, 0.031, 0.006, 24), dialBronzeMat);
      innerCogDisc.rotation.x = Math.PI / 2;
      wheelGroup.add(innerCogDisc);

      for (let gt = 0; gt < 14; gt++) {
        const ang = (gt / 14) * Math.PI * 2;
        const cTooth = new THREE.Mesh(new THREE.BoxGeometry(0.0055, 0.010, 0.005), dialCopperMat);
        cTooth.position.set(Math.cos(ang) * 0.032, Math.sin(ang) * 0.032, 0);
        cTooth.rotation.z = ang;
        wheelGroup.add(cTooth);
      }

      const handShape = new THREE.Shape();
      handShape.moveTo(0, 0.088);
      handShape.lineTo(0.0085, 0.062);
      handShape.lineTo(0.0050, 0.056);
      handShape.lineTo(0.0105, 0.032);
      handShape.lineTo(0.0065, 0.018);
      handShape.lineTo(0.0095, -0.024);
      handShape.lineTo(0.0165, -0.044);
      handShape.lineTo(0.0055, -0.037);
      handShape.lineTo(0, -0.048);
      handShape.lineTo(-0.0055, -0.037);
      handShape.lineTo(-0.0165, -0.044);
      handShape.lineTo(-0.0095, -0.024);
      handShape.lineTo(-0.0065, 0.018);
      handShape.lineTo(-0.0105, 0.032);
      handShape.lineTo(-0.0050, 0.056);
      handShape.lineTo(-0.0085, 0.062);
      handShape.closePath();

      const cutHole = new THREE.Path();
      cutHole.moveTo(0, 0.052);
      cutHole.lineTo(0.0042, 0.034);
      cutHole.lineTo(0, 0.022);
      cutHole.lineTo(-0.0042, 0.034);
      cutHole.closePath();
      handShape.holes.push(cutHole);

      const handGeo = new THREE.ExtrudeGeometry(handShape, {
        depth: 0.0055,
        bevelEnabled: true,
        bevelThickness: 0.0012,
        bevelSize: 0.0010,
        bevelSegments: 2,
      });
      const steampunkHandMat = new THREE.MeshStandardMaterial({
        color: 0xd9a84e,
        roughness: 0.22,
        metalness: 0.92,
      });
      const steampunkHandMesh = new THREE.Mesh(handGeo, steampunkHandMat);
      steampunkHandMesh.position.z = 0.005;
      steampunkHandMesh.castShadow = true;
      wheelGroup.add(steampunkHandMesh);

      const pointerTailRing = new THREE.Mesh(new THREE.TorusGeometry(0.012, 0.0028, 10, 20), dialCopperMat);
      pointerTailRing.position.set(0, -0.030, 0.008);
      wheelGroup.add(pointerTailRing);

      const initActiveColor = opts.colors[opts.initialIdx];
      const initHasSlot = opts.hasColorSlot[opts.initialIdx];
      const tipGemMat = new THREE.MeshStandardMaterial({
        color: initActiveColor,
        emissive: new THREE.Color(initHasSlot ? initActiveColor : 0x050508),
        emissiveIntensity: initHasSlot ? 1.0 : 0.02,
        roughness: 0.14,
        metalness: 0.15,
      });
      const pointerTipGem = new THREE.Mesh(new THREE.SphereGeometry(0.0055, 12, 10), tipGemMat);
      pointerTipGem.scale.set(1, 1.35, 0.65);
      pointerTipGem.position.set(0, 0.068, 0.011);
      wheelGroup.add(pointerTipGem);

      const centerHub = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.018, 0.014, 18), dialCopperMat);
      centerHub.rotation.x = Math.PI / 2;
      centerHub.position.z = 0.008;
      wheelGroup.add(centerHub);

      const centerHexScrew = new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0095, 0.020, 6), steampunkHandMat);
      centerHexScrew.rotation.x = Math.PI / 2;
      centerHexScrew.position.z = 0.011;
      wheelGroup.add(centerHexScrew);

      wheelGroup.rotation.z = opts.currentAngle;
      dialGroup.add(wheelGroup);

      const dialLight = new THREE.PointLight(
        initHasSlot ? initActiveColor : 0x22222c,
        initHasSlot ? 0.68 : 0.12,
        1.25,
        1.7
      );
      dialLight.position.set(0, 0, 0.15);
      dialGroup.add(dialLight);

      const dialHitbox = new THREE.Mesh(
        new THREE.CylinderGeometry(0.175, 0.175, 0.14, 24),
        new THREE.MeshBasicMaterial({ visible: false })
      );
      dialHitbox.rotation.x = Math.PI / 2;
      dialHitbox.name = 'portal_dial_hitbox';
      dialHitbox.position.set(0, 0, 0.04);
      dialGroup.add(dialHitbox);

      leafOffset.add(dialGroup);

      return {
        doorGroup: doorContainer,
        leafPivot,
        doorHitbox,
        dialHitbox,
        wheelGroup,
        outerGearGroup,
        sectorMats,
        rimGemMats,
        tipGemMat,
        dialLight,
      };
    };

    // Lobby Closed Door ("1F") & 4-Color Dial (草綠色, 紫色, 金色, 青色)
    const lobbyPortalDoor = createPortalDoorAndDial({
      colors: [0x65c226, 0x9333ea, 0xeab308, 0x06b6d4],
      hasColorSlot: [true, true, true, true],
      initialIdx: portalColorIdxRef.current,
      currentAngle: portalCurrentAngleRef.current,
      showFloorLabel: true,
    });
    lobbyPortalDoor.doorGroup.position.set(-3.65, 0, -ROOM_DEPTH / 2);
    roomGroup.add(lobbyPortalDoor.doorGroup);

    lobbyDoorHitboxRef.current = lobbyPortalDoor.doorHitbox;
    lobbyDoorLeafPivotRef.current = lobbyPortalDoor.leafPivot;
    portalWheelRef.current = lobbyPortalDoor.wheelGroup;
    portalOuterGearRef.current = lobbyPortalDoor.outerGearGroup;
    portalHitboxRef.current = lobbyPortalDoor.dialHitbox;
    portalPointLightRef.current = lobbyPortalDoor.dialLight;
    portalGemMatRef.current = lobbyPortalDoor.tipGemMat;
    portalSectorMatsRef.current = lobbyPortalDoor.sectorMats;
    portalRimGemMatsRef.current = lobbyPortalDoor.rimGemMats;

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

    const textureLoader = new THREE.TextureLoader();

    // --- 4A-1. BLACK VINYL RECORD & BLONDE WOOD EASEL ON WALL TABLE CENTER (牆邊木桌正中間黑膠唱片與底座) ---
    const vinylCenterTexture = textureLoader.load('/assets/vinyl_center_tex.png');
    vinylCenterTexture.colorSpace = THREE.SRGBColorSpace;
    vinylCenterTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const createVinylDiscFaceTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 1024;
      const ctx = canvas.getContext('2d');
      if (!ctx) return new THREE.Texture();

      // Deep satin-black vinyl base
      ctx.fillStyle = '#121317';
      ctx.fillRect(0, 0, 1024, 1024);

      // Anisotropic radial sheen reflection across vinyl tracks
      const sheen = ctx.createConicGradient(0.45, 512, 512);
      sheen.addColorStop(0.0, 'rgba(255,255,255,0.04)');
      sheen.addColorStop(0.18, 'rgba(255,255,255,0.0)');
      sheen.addColorStop(0.42, 'rgba(255,255,255,0.065)');
      sheen.addColorStop(0.58, 'rgba(255,255,255,0.0)');
      sheen.addColorStop(0.85, 'rgba(255,255,255,0.05)');
      sheen.addColorStop(1.0, 'rgba(255,255,255,0.04)');
      ctx.fillStyle = sheen;
      ctx.fillRect(0, 0, 1024, 1024);

      // Subtle concentric LP micro-grooves from outer rim inward to label margin
      for (let r = 268; r <= 504; r += 3) {
        ctx.beginPath();
        ctx.arc(512, 512, r, 0, Math.PI * 2);
        const trackBand = r % 63 < 4 ? 0.08 : (r % 9 === 0 ? 0.045 : 0.018);
        ctx.strokeStyle = `rgba(255, 255, 255, ${trackBand})`;
        ctx.lineWidth = r % 63 < 4 ? 1.8 : 1.0;
        ctx.stroke();
      }

      // Expressive cyan metallic marker autograph "み UMIR 2026." on lower-right vinyl ring
      ctx.save();
      ctx.strokeStyle = '#18beff';
      ctx.fillStyle = '#18beff';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      // Cursive "み" loop + star finial matching reference photo
      ctx.lineWidth = 11;
      ctx.beginPath();
      ctx.moveTo(765, 592);
      ctx.quadraticCurveTo(815, 586, 835, 586);
      ctx.bezierCurveTo(800, 635, 762, 682, 742, 690);
      ctx.bezierCurveTo(722, 698, 725, 658, 765, 646);
      ctx.bezierCurveTo(822, 630, 895, 648, 902, 706);
      ctx.bezierCurveTo(906, 738, 875, 756, 845, 748);
      ctx.stroke();

      // Diagonal downward crossing stroke of "み"
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(862, 580);
      ctx.quadraticCurveTo(846, 672, 795, 732);
      ctx.stroke();

      // Tiny 5-point star accent at end of cursive tail
      const sx = 843;
      const sy = 747;
      ctx.beginPath();
      for (let p = 0; p < 10; p++) {
        const ang = (p * Math.PI) / 5 - Math.PI / 2;
        const rad = p % 2 === 0 ? 11 : 5;
        const px = sx + Math.cos(ang) * rad;
        const py = sy + Math.sin(ang) * rad;
        if (p === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();

      // Hand-lettered "UMIR" & "2026." on right margin next to "み"
      ctx.translate(932, 608);
      ctx.rotate(0.08);
      ctx.font = 'bold 34px "Comic Sans MS", "Trebuchet MS", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('UMIR', 0, 0);
      ctx.font = 'bold 26px "Comic Sans MS", "Trebuchet MS", sans-serif';
      ctx.fillText('2026.', 4, 34);
      ctx.restore();

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      return tex;
    };

    const vinylDiscFaceTexture = createVinylDiscFaceTexture();

    const vinylEaselGroup = new THREE.Group();
    vinylEaselGroup.position.set(0, TABLE_HEIGHT, 0.02);

    const easelWoodMat = new THREE.MeshStandardMaterial({
      color: 0xe2cca6,
      roughness: 0.58,
      metalness: 0.03,
    });
    const easelPinMat = new THREE.MeshStandardMaterial({
      color: 0x9c825a,
      roughness: 0.45,
      metalness: 0.25,
    });

    // 1. Mini Blonde Wood A-Frame Easel Stand (grounded at y = 0 on tabletop)
    const EASEL_LEAN = -0.19; // ~11 deg backward lean
    const easelFrontFrame = new THREE.Group();
    easelFrontFrame.position.set(0, 0, 0.035);
    easelFrontFrame.rotation.x = EASEL_LEAN;

    // Left & Right splayed A-frame legs
    const frontLegGeo = new THREE.BoxGeometry(0.015, 0.225, 0.015);
    [-1, 1].forEach((side) => {
      const fLeg = new THREE.Mesh(frontLegGeo, easelWoodMat);
      fLeg.position.set(side * 0.068, 0.112, 0);
      fLeg.rotation.z = side * 0.18;
      fLeg.castShadow = true;
      fLeg.receiveShadow = true;
      easelFrontFrame.add(fLeg);
    });

    // Top crossbeam tying A-frame shoulders
    const easelTopBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.115, 0.014, 0.014),
      easelWoodMat
    );
    easelTopBar.position.set(0, 0.205, 0);
    easelTopBar.castShadow = true;
    easelFrontFrame.add(easelTopBar);

    // Front horizontal shelf ledge cradling the vinyl disc bottom rim
    const easelLedge = new THREE.Mesh(
      new THREE.BoxGeometry(0.205, 0.014, 0.030),
      easelWoodMat
    );
    easelLedge.position.set(0, 0.056, 0.012);
    easelLedge.castShadow = true;
    easelLedge.receiveShadow = true;
    easelFrontFrame.add(easelLedge);

    // Subtle front lip stopper on the ledge so the record sits securely
    const easelLedgeLip = new THREE.Mesh(
      new THREE.BoxGeometry(0.205, 0.008, 0.005),
      easelWoodMat
    );
    easelLedgeLip.position.set(0, 0.065, 0.0245);
    easelFrontFrame.add(easelLedgeLip);

    // 2. Grooved Black 12" Vinyl Disc + Center Illustration Sticker resting on the easel ledge
    const DISC_R = 0.182;
    const discAssembly = new THREE.Group();
    discAssembly.position.set(0, 0.063 + DISC_R, 0.0115);

    const vinylBodyMat = new THREE.MeshStandardMaterial({
      color: 0x101115,
      roughness: 0.34,
      metalness: 0.18,
    });
    const vinylRimCylinder = new THREE.Mesh(
      new THREE.CylinderGeometry(DISC_R, DISC_R, 0.0046, 64),
      vinylBodyMat
    );
    vinylRimCylinder.rotation.x = Math.PI / 2;
    vinylRimCylinder.castShadow = true;
    vinylRimCylinder.receiveShadow = true;
    discAssembly.add(vinylRimCylinder);

    // Front circular grooved vinyl surface + cyan "み UMIR 2026." autograph
    const vinylFrontFace = new THREE.Mesh(
      new THREE.CircleGeometry(DISC_R - 0.001, 64),
      new THREE.MeshStandardMaterial({
        map: vinylDiscFaceTexture,
        color: 0xffffff,
        roughness: 0.30,
        metalness: 0.14,
      })
    );
    vinylFrontFace.position.z = 0.0026;
    vinylFrontFace.receiveShadow = true;
    discAssembly.add(vinylFrontFace);

    // Center "保持可愛漫研社" illustrated round vinyl sticker
    const vinylCenterLabel = new THREE.Mesh(
      new THREE.CircleGeometry(DISC_R * 0.505, 64),
      new THREE.MeshStandardMaterial({
        map: vinylCenterTexture,
        color: 0xffffff,
        roughness: 0.44,
        metalness: 0.03,
        transparent: true,
        alphaTest: 0.12,
      })
    );
    vinylCenterLabel.position.z = 0.0033;
    vinylCenterLabel.receiveShadow = true;
    discAssembly.add(vinylCenterLabel);

    easelFrontFrame.add(discAssembly);
    vinylEaselGroup.add(easelFrontFrame);

    // Rear A-frame hinged support leg brace touching tabletop at y = 0
    const rearLegGroup = new THREE.Group();
    rearLegGroup.position.set(0, 0.195, -0.004);
    rearLegGroup.rotation.x = 0.44;
    [-1, 1].forEach((side) => {
      const rLeg = new THREE.Mesh(
        new THREE.BoxGeometry(0.013, 0.215, 0.013),
        easelWoodMat
      );
      rLeg.position.set(side * 0.045, -0.105, 0);
      rLeg.rotation.z = side * 0.12;
      rLeg.castShadow = true;
      rearLegGroup.add(rLeg);
    });
    const rearBrace = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 0.012, 0.012),
      easelWoodMat
    );
    rearBrace.position.set(0, -0.12, 0);
    rearLegGroup.add(rearBrace);
    vinylEaselGroup.add(rearLegGroup);

    // Tiny metal hinge pins joining front & rear easel struts
    [-1, 1].forEach((side) => {
      const pin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.0035, 0.0035, 0.022, 10),
        easelPinMat
      );
      pin.rotation.z = Math.PI / 2;
      pin.position.set(side * 0.048, 0.198, -0.002);
      vinylEaselGroup.add(pin);
    });

    // Soft warm spotlight illuminating the centered vinyl record & wooden easel
    const vinylSpot = new THREE.PointLight(0xffeed6, 1.5, 3.6, 1.2);
    vinylSpot.position.set(0, 0.68, 0.42);
    vinylSpot.castShadow = true;
    vinylEaselGroup.add(vinylSpot);

    tableGroup.add(vinylEaselGroup);

    // --- 4A-1b. STACKED TRIPLE-CAT TRASH BIN AT FAR-LEFT OF WALL TABLE (牆邊桌面最左側貓貓垃圾桶) ---
    const createCatFaceTexture = (variant: 'apricot' | 'white' | 'red') => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (!ctx) return new THREE.Texture();

      ctx.clearRect(0, 0, 512, 256);
      const cx = 256;
      const cy = 128;

      // Whiskers & cheeks common setup
      const whiskerColor =
        variant === 'red' ? '#f7f7f7' : variant === 'white' ? '#ebb24c' : '#181818';
      ctx.strokeStyle = whiskerColor;
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      [-1, 1].forEach((side) => {
        ctx.beginPath();
        ctx.moveTo(cx + side * 112, cy + 4);
        ctx.lineTo(cx + side * 158, cy - 6);
        ctx.moveTo(cx + side * 112, cy + 24);
        ctx.lineTo(cx + side * 160, cy + 28);
        ctx.stroke();
      });

      // Rosy pink oval blush cheeks + tiny highlight dashes
      [-1, 1].forEach((side) => {
        const bx = cx + side * 78;
        const by = cy + 28;
        ctx.fillStyle = '#eb7c98';
        ctx.beginPath();
        ctx.ellipse(bx, by, 22, 13, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffd0dc';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(bx - 5, by - 4);
        ctx.lineTo(bx - 5, by + 4);
        ctx.moveTo(bx + 5, by - 4);
        ctx.lineTo(bx + 5, by + 4);
        ctx.stroke();
      });

      if (variant === 'red') {
        // Large cartoon white-sclera eyes with forward black pupils
        [-1, 1].forEach((side) => {
          const ex = cx + side * 52;
          const ey = cy - 10;
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#181818';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(ex, ey, 22, 26, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#141414';
          ctx.beginPath();
          ctx.ellipse(ex - side * 4, ey + 2, 12, 16, 0, 0, Math.PI * 2);
          ctx.fill();
        });
        // Outlined pink Y-nose & smile
        ctx.strokeStyle = '#f8f8f8';
        ctx.fillStyle = '#e56f89';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(cx - 8, cy + 16);
        ctx.lineTo(cx + 8, cy + 16);
        ctx.lineTo(cx, cy + 26);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx, cy + 26);
        ctx.lineTo(cx, cy + 38);
        ctx.stroke();
      } else if (variant === 'white') {
        // Shiny dark eyes with crescent specular highlights
        [-1, 1].forEach((side) => {
          const ex = cx + side * 52;
          const ey = cy - 8;
          ctx.fillStyle = '#161618';
          ctx.beginPath();
          ctx.ellipse(ex, ey, 21, 23, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(ex + 6, ey - 5, 7.5, 0, Math.PI * 2);
          ctx.fill();
        });
        // Tiny oval black nose
        ctx.fillStyle = '#161618';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 16, 8, 5, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Happy ^ ^ squinting eyes + cheerful pink open mouth
        ctx.strokeStyle = '#181818';
        ctx.lineWidth = 6.5;
        ctx.lineCap = 'round';
        [-1, 1].forEach((side) => {
          const ex = cx + side * 52;
          ctx.beginPath();
          ctx.arc(ex, cy - 2, 19, Math.PI * 1.15, Math.PI * 1.85);
          ctx.stroke();
        });
        // Cute open mouth with pink tongue
        ctx.fillStyle = '#d96b86';
        ctx.strokeStyle = '#181818';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(cx - 20, cy + 16);
        ctx.quadraticCurveTo(cx, cy + 22, cx + 20, cy + 16);
        ctx.quadraticCurveTo(cx + 16, cy + 52, cx, cy + 52);
        ctx.quadraticCurveTo(cx - 16, cy + 52, cx - 20, cy + 16);
        ctx.fill();
        ctx.stroke();
        // Little nose dot
        ctx.fillStyle = '#181818';
        ctx.beginPath();
        ctx.arc(cx, cy + 10, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      return tex;
    };

    const catFaceApricotTex = createCatFaceTexture('apricot');
    const catFaceWhiteTex = createCatFaceTexture('white');
    const catFaceRedTex = createCatFaceTexture('red');

    const catBinGroup = new THREE.Group();
    const CAT_R = 0.115;
    const CAT_H = 0.084;

    // 1. Matte black stepped circular foot ring
    const catBaseRing = new THREE.Mesh(
      new THREE.CylinderGeometry(CAT_R * 0.92, CAT_R * 0.97, 0.018, 36),
      new THREE.MeshStandardMaterial({ color: 0x16171a, roughness: 0.55, metalness: 0.06 })
    );
    catBaseRing.position.y = 0.009;
    catBaseRing.castShadow = true;
    catBaseRing.receiveShadow = true;
    catBinGroup.add(catBaseRing);

    // Cushion drum Lathe profile (vertical bulge matching stacked plush-plastic bin tiers)
    const makeCatHeadProfile = (rMax: number, h: number, rOff = 0) => [
      new THREE.Vector2(rMax * 0.72 + rOff, 0.0),
      new THREE.Vector2(rMax * 0.91 + rOff, h * 0.12),
      new THREE.Vector2(rMax + rOff, h * 0.48),
      new THREE.Vector2(rMax * 0.92 + rOff, h * 0.86),
      new THREE.Vector2(rMax * 0.74 + rOff, h),
    ];

    const catHeadGeo = new THREE.LatheGeometry(makeCatHeadProfile(CAT_R, CAT_H), 40);
    catHeadGeo.computeVertexNormals();
    const catFacePatchGeo = new THREE.LatheGeometry(
      makeCatHeadProfile(CAT_R, CAT_H, 0.0014),
      28,
      -0.60,
      1.20
    );
    const catEarGeo = new THREE.ConeGeometry(0.022, 0.032, 16);

    const catTiers: Array<{
      y: number;
      color: number;
      faceTex: THREE.Texture;
    }> = [
      { y: 0.016, color: 0xeeb56e, faceTex: catFaceApricotTex },
      { y: 0.016 + CAT_H * 0.94, color: 0xeef2ee, faceTex: catFaceWhiteTex },
      { y: 0.016 + CAT_H * 1.88, color: 0xb71d23, faceTex: catFaceRedTex },
    ];

    catTiers.forEach((tier) => {
      const tierGroup = new THREE.Group();
      tierGroup.position.y = tier.y;

      const shellMat = new THREE.MeshPhysicalMaterial({
        color: tier.color,
        roughness: 0.16,
        metalness: 0.04,
        clearcoat: 0.92,
        clearcoatRoughness: 0.12,
      });

      const body = new THREE.Mesh(catHeadGeo, shellMat);
      body.castShadow = true;
      body.receiveShadow = true;
      tierGroup.add(body);

      // Curved front face graphic patch hugging the chubby cheek curvature
      const faceMesh = new THREE.Mesh(
        catFacePatchGeo,
        new THREE.MeshStandardMaterial({
          map: tier.faceTex,
          color: 0xffffff,
          roughness: 0.22,
          transparent: true,
          depthWrite: false,
          polygonOffset: true,
          polygonOffsetFactor: -1,
        })
      );
      tierGroup.add(faceMesh);

      // Two sculpted front-facing triangular cat ears
      [-1, 1].forEach((side) => {
        const ear = new THREE.Mesh(catEarGeo, shellMat);
        ear.scale.set(1.0, 1.0, 0.72);
        ear.position.set(side * 0.056, CAT_H * 0.96, 0.068);
        ear.rotation.set(0.18, 0, -side * 0.16);
        ear.castShadow = true;
        tierGroup.add(ear);
      });

      catBinGroup.add(tierGroup);
    });

    // Dark recessed inner bin rim at the top of the red cat head
    const binTopRim = new THREE.Mesh(
      new THREE.CylinderGeometry(CAT_R * 0.72, CAT_R * 0.72, 0.008, 32),
      new THREE.MeshStandardMaterial({ color: 0x161619, roughness: 0.65 })
    );
    binTopRim.position.y = 0.016 + CAT_H * 2.86;
    catBinGroup.add(binTopRim);

    catBinGroup.position.set(-1.12, TABLE_HEIGHT, 0.05);
    catBinGroup.rotation.y = 0.12; // Subtle welcoming angle toward viewer
    tableGroup.add(catBinGroup);

    // --- 4A-1c. NINTENDO SWITCH 2 + IINE CHARGING DOCK RIGHT OF CAT BIN (貓貓垃圾桶右側 Switch 2 主機底座) ---
    const createSwitchDockLogoTex = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 320;
      const ctx = canvas.getContext('2d');
      if (!ctx) return new THREE.Texture();

      ctx.fillStyle = '#24262b';
      ctx.fillRect(0, 0, 512, 320);

      // Embossed black/glossy "Switch 2" icon + "2" + NINTENDO SWITCH wordmark
      ctx.fillStyle = '#0c0d10';
      ctx.strokeStyle = '#0c0d10';
      // Left Joy-Con silhouette icon
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.roundRect(172, 62, 36, 76, [14, 2, 2, 14]);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(190, 86, 6, 0, Math.PI * 2);
      ctx.fill();
      // Right Joy-Con silhouette icon
      ctx.beginPath();
      ctx.roundRect(216, 62, 36, 76, [2, 14, 14, 2]);
      ctx.fill();
      ctx.fillStyle = '#24262b';
      ctx.beginPath();
      ctx.arc(234, 108, 7, 0, Math.PI * 2);
      ctx.fill();

      // Big "2" beside Joy-Con emblem
      ctx.fillStyle = '#0c0d10';
      ctx.font = '900 84px "Arial Black", "Helvetica Neue", sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('2', 268, 138);

      // NINTENDO / SWITCH wordmark centered beneath
      ctx.textAlign = 'center';
      ctx.font = 'bold 20px "Helvetica Neue", sans-serif';
      ctx.fillText('N I N T E N D O', 256, 174);
      ctx.font = '900 32px "Arial Black", "Helvetica Neue", sans-serif';
      ctx.fillText('SWITCH', 256, 208);

      // Subtle lower dock horizontal groove seam + tiny TV icon on left
      ctx.strokeStyle = '#181a1e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 246);
      ctx.lineTo(512, 246);
      ctx.stroke();

      ctx.strokeStyle = '#6b707a';
      ctx.lineWidth = 2;
      ctx.strokeRect(24, 266, 16, 11);

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      return tex;
    };

    const createIineBaseLogoTex = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 96;
      const ctx = canvas.getContext('2d');
      if (!ctx) return new THREE.Texture();

      ctx.fillStyle = '#1d1f24';
      ctx.fillRect(0, 0, 256, 96);
      ctx.fillStyle = '#d4d8e0';
      ctx.font = 'italic 900 28px "Arial Black", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('IINE', 128, 48);

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      return tex;
    };

    const switchDockLogoTex = createSwitchDockLogoTex();
    const iineBaseLogoTex = createIineBaseLogoTex();

    const switch2Group = new THREE.Group();
    const swDarkMat = new THREE.MeshStandardMaterial({
      color: 0x1d1f24,
      roughness: 0.48,
      metalness: 0.10,
    });
    const swShieldMat = new THREE.MeshStandardMaterial({
      color: 0x24262b,
      roughness: 0.52,
      metalness: 0.08,
    });
    const swScreenMat = new THREE.MeshPhysicalMaterial({
      color: 0x090b0f,
      roughness: 0.08,
      metalness: 0.15,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
    });
    const swGreyTrimMat = new THREE.MeshStandardMaterial({
      color: 0x898e96,
      roughness: 0.38,
      metalness: 0.25,
    });
    const swCyanMat = new THREE.MeshStandardMaterial({
      color: 0x42b8e8,
      roughness: 0.32,
      metalness: 0.08,
    });
    const swOrangeMat = new THREE.MeshStandardMaterial({
      color: 0xe85a32,
      roughness: 0.32,
      metalness: 0.08,
    });

    // 1. Wide IINE Charging Base Platform (grounded at y = 0)
    const DOCK_BASE_W = 0.232;
    const DOCK_BASE_H = 0.032;
    const DOCK_BASE_D = 0.084;
    const baseFoot = new THREE.Mesh(
      new THREE.BoxGeometry(DOCK_BASE_W, 0.005, DOCK_BASE_D),
      swDarkMat
    );
    baseFoot.position.set(0, 0.0025, 0);
    switch2Group.add(baseFoot);

    // Light grey bottom perimeter accent band
    const baseGreyLine = new THREE.Mesh(
      new THREE.BoxGeometry(DOCK_BASE_W + 0.001, 0.0035, DOCK_BASE_D + 0.001),
      swGreyTrimMat
    );
    baseGreyLine.position.set(0, 0.0065, 0);
    switch2Group.add(baseGreyLine);

    const baseUpperBody = new THREE.Mesh(
      new THREE.BoxGeometry(DOCK_BASE_W, DOCK_BASE_H - 0.008, DOCK_BASE_D),
      swDarkMat
    );
    baseUpperBody.position.set(0, 0.008 + (DOCK_BASE_H - 0.008) / 2, 0);
    baseUpperBody.castShadow = true;
    baseUpperBody.receiveShadow = true;
    switch2Group.add(baseUpperBody);

    // Raised curved front center IINE arch hump + logo face
    const iineHump = new THREE.Mesh(
      new THREE.BoxGeometry(0.072, 0.011, DOCK_BASE_D * 0.45),
      swDarkMat
    );
    iineHump.position.set(0, DOCK_BASE_H + 0.0045, DOCK_BASE_D * 0.27);
    switch2Group.add(iineHump);

    const iineLogoFace = new THREE.Mesh(
      new THREE.PlaneGeometry(0.056, 0.022),
      new THREE.MeshStandardMaterial({ map: iineBaseLogoTex, roughness: 0.45 })
    );
    iineLogoFace.position.set(0, 0.022, DOCK_BASE_D / 2 + 0.0008);
    switch2Group.add(iineLogoFace);

    // Front-right USB-A & USB-C recessed dark ports
    const usbPortMat = new THREE.MeshStandardMaterial({ color: 0x090a0c, roughness: 0.4, metalness: 0.4 });
    const usbAPort = new THREE.Mesh(new THREE.BoxGeometry(0.013, 0.007, 0.002), usbPortMat);
    usbAPort.position.set(0.068, 0.018, DOCK_BASE_D / 2 + 0.0008);
    switch2Group.add(usbAPort);
    const usbCPort = new THREE.Mesh(new THREE.BoxGeometry(0.009, 0.004, 0.002), usbPortMat);
    usbCPort.position.set(0.088, 0.018, DOCK_BASE_D / 2 + 0.0008);
    switch2Group.add(usbCPort);

    // 2. Upright Rounded Nintendo Switch 2 Front Dock Shield (with embossed 2 / NINTENDO SWITCH logo)
    const SHIELD_W = 0.184;
    const SHIELD_H = 0.106;
    const shieldShape = new THREE.Shape();
    const shw = SHIELD_W / 2;
    const sr = 0.016;
    shieldShape.moveTo(-shw, 0);
    shieldShape.lineTo(shw, 0);
    shieldShape.lineTo(shw, SHIELD_H - sr);
    shieldShape.quadraticCurveTo(shw, SHIELD_H, shw - sr, SHIELD_H);
    shieldShape.lineTo(-shw + sr, SHIELD_H);
    shieldShape.quadraticCurveTo(-shw, SHIELD_H, -shw, SHIELD_H - sr);
    shieldShape.closePath();

    const dockShieldGeo = new THREE.ExtrudeGeometry(shieldShape, {
      depth: 0.016,
      bevelEnabled: true,
      bevelThickness: 0.002,
      bevelSize: 0.002,
      bevelSegments: 2,
    });
    const dockShieldMesh = new THREE.Mesh(dockShieldGeo, swShieldMat);
    dockShieldMesh.position.set(0, DOCK_BASE_H - 0.002, 0.008);
    dockShieldMesh.castShadow = true;
    dockShieldMesh.receiveShadow = true;
    switch2Group.add(dockShieldMesh);

    const dockShieldFrontLogo = new THREE.Mesh(
      new THREE.PlaneGeometry(SHIELD_W - 0.012, SHIELD_H - 0.010),
      new THREE.MeshStandardMaterial({ map: switchDockLogoTex, roughness: 0.52 })
    );
    dockShieldFrontLogo.position.set(0, DOCK_BASE_H + SHIELD_H / 2 - 0.002, 0.0265);
    switch2Group.add(dockShieldFrontLogo);

    // 3. Docked Nintendo Switch 2 Console Body (peeking cleanly above the front shield!)
    const CONSOLE2_W = 0.194;
    const CONSOLE2_H = 0.120;
    const console2Body = new THREE.Mesh(
      new THREE.BoxGeometry(CONSOLE2_W, CONSOLE2_H, 0.012),
      swScreenMat
    );
    console2Body.position.set(0, DOCK_BASE_H + 0.010 + CONSOLE2_H / 2, -0.006);
    console2Body.castShadow = true;
    switch2Group.add(console2Body);

    // 4. Left & Right Joy-Con 2 Controllers with Signature Cyan & Orange Stick Collars
    const JC_W = 0.036;
    const JC_H = 0.120;
    const makeJoyConGeo = (isLeft: boolean) => {
      const shape = new THREE.Shape();
      const hw = JC_W / 2;
      const hh = JC_H / 2;
      const r = 0.017;
      if (isLeft) {
        shape.moveTo(hw, -hh);
        shape.lineTo(-hw + r, -hh);
        shape.quadraticCurveTo(-hw, -hh, -hw, -hh + r);
        shape.lineTo(-hw, hh - r);
        shape.quadraticCurveTo(-hw, hh, -hw + r, hh);
        shape.lineTo(hw, hh);
      } else {
        shape.moveTo(-hw, -hh);
        shape.lineTo(hw - r, -hh);
        shape.quadraticCurveTo(hw, -hh, hw, -hh + r);
        shape.lineTo(hw, hh - r);
        shape.quadraticCurveTo(hw, hh, hw - r, hh);
        shape.lineTo(-hw, hh);
      }
      shape.closePath();
      return new THREE.ExtrudeGeometry(shape, {
        depth: 0.013,
        bevelEnabled: true,
        bevelThickness: 0.002,
        bevelSize: 0.002,
        bevelSegments: 2,
      });
    };

    const btnMat = new THREE.MeshStandardMaterial({ color: 0x2b2e35, roughness: 0.42 });
    const stickCapMat = new THREE.MeshStandardMaterial({ color: 0x16181c, roughness: 0.35 });

    // Left Joy-Con 2
    const leftJCGroup = new THREE.Group();
    leftJCGroup.position.set(-CONSOLE2_W / 2 - JC_W / 2 + 0.002, DOCK_BASE_H + 0.010 + JC_H / 2, -0.011);
    const leftJCMesh = new THREE.Mesh(makeJoyConGeo(true), swDarkMat);
    leftJCMesh.castShadow = true;
    leftJCGroup.add(leftJCMesh);

    // Cyan-ring Left Thumbstick
    const lRing = new THREE.Mesh(new THREE.CylinderGeometry(0.0095, 0.0095, 0.004, 20), swCyanMat);
    lRing.rotation.x = Math.PI / 2;
    lRing.position.set(-0.001, 0.028, 0.0155);
    leftJCGroup.add(lRing);
    const lStick = new THREE.Mesh(new THREE.CylinderGeometry(0.0075, 0.0075, 0.006, 20), stickCapMat);
    lStick.rotation.x = Math.PI / 2;
    lStick.position.set(-0.001, 0.028, 0.018);
    leftJCGroup.add(lStick);

    // Left 4 D-pad buttons
    [
      [0, 0.008],
      [0, -0.008],
      [-0.008, 0],
      [0.008, 0],
    ].forEach(([bx, by]) => {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.0032, 0.0032, 0.003, 12), btnMat);
      b.rotation.x = Math.PI / 2;
      b.position.set(bx - 0.001, by - 0.002, 0.0155);
      leftJCGroup.add(b);
    });
    switch2Group.add(leftJCGroup);

    // Right Joy-Con 2
    const rightJCGroup = new THREE.Group();
    rightJCGroup.position.set(CONSOLE2_W / 2 + JC_W / 2 - 0.002, DOCK_BASE_H + 0.010 + JC_H / 2, -0.011);
    const rightJCMesh = new THREE.Mesh(makeJoyConGeo(false), swDarkMat);
    rightJCMesh.castShadow = true;
    rightJCGroup.add(rightJCMesh);

    // Right X/Y/A/B diamond buttons
    [
      [0, 0.009],
      [0, -0.009],
      [-0.009, 0],
      [0.009, 0],
    ].forEach(([bx, by]) => {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.0034, 0.0034, 0.003, 12), btnMat);
      b.rotation.x = Math.PI / 2;
      b.position.set(bx + 0.001, by + 0.026, 0.0155);
      rightJCGroup.add(b);
    });

    // Coral-orange-ring Right Thumbstick
    const rRing = new THREE.Mesh(new THREE.CylinderGeometry(0.0095, 0.0095, 0.004, 20), swOrangeMat);
    rRing.rotation.x = Math.PI / 2;
    rRing.position.set(0.001, -0.004, 0.0155);
    rightJCGroup.add(rRing);
    const rStick = new THREE.Mesh(new THREE.CylinderGeometry(0.0075, 0.0075, 0.006, 20), stickCapMat);
    rStick.rotation.x = Math.PI / 2;
    rStick.position.set(0.001, -0.004, 0.018);
    rightJCGroup.add(rStick);
    switch2Group.add(rightJCGroup);

    switch2Group.position.set(-0.77, TABLE_HEIGHT, 0.05);
    switch2Group.rotation.y = 0.08;
    tableGroup.add(switch2Group);

    tableGroup.position.set(0, 0, -ROOM_DEPTH / 2 + TABLE_DEPTH / 2);
    roomGroup.add(tableGroup);

    // --- 4A-2. LASER-ENGRAVED WOODEN STUDIO PLAQUE ON FRONT WALL (正前方橫桌偏左牆面木牌) ---
    const plaqueTexture = textureLoader.load('/assets/studio_plaque_tex.png');
    plaqueTexture.colorSpace = THREE.SRGBColorSpace;
    plaqueTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const studioPlaqueGroup = new THREE.Group();
    const PLAQUE_W = 0.62;
    const PLAQUE_H = 0.40; // ~1.55 : 1 ratio matching reference photo
    const PLAQUE_R = 0.034;

    const plaqueShape = new THREE.Shape();
    const pw = PLAQUE_W / 2;
    const ph = PLAQUE_H / 2;
    plaqueShape.moveTo(-pw + PLAQUE_R, -ph);
    plaqueShape.lineTo(pw - PLAQUE_R, -ph);
    plaqueShape.quadraticCurveTo(pw, -ph, pw, -ph + PLAQUE_R);
    plaqueShape.lineTo(pw, ph - PLAQUE_R);
    plaqueShape.quadraticCurveTo(pw, ph, pw - PLAQUE_R, ph);
    plaqueShape.lineTo(-pw + PLAQUE_R, ph);
    plaqueShape.quadraticCurveTo(-pw, ph, -pw, ph - PLAQUE_R);
    plaqueShape.lineTo(-pw, -ph + PLAQUE_R);
    plaqueShape.quadraticCurveTo(-pw, -ph, -pw + PLAQUE_R, -ph);

    // 1. Solid Timber Board with Dark Laser-Charred Beveled Rim
    const plaqueBoardGeo = new THREE.ExtrudeGeometry(plaqueShape, {
      depth: 0.016,
      bevelEnabled: true,
      bevelThickness: 0.002,
      bevelSize: 0.002,
      bevelSegments: 3,
      curveSegments: 12,
    });
    const plaqueEdgeMat = new THREE.MeshStandardMaterial({
      color: 0x3b2010, // Charred walnut laser-cut rim
      roughness: 0.62,
      metalness: 0.04,
    });
    const plaqueBoard = new THREE.Mesh(plaqueBoardGeo, plaqueEdgeMat);
    plaqueBoard.position.z = 0.008;
    plaqueBoard.castShadow = true;
    plaqueBoard.receiveShadow = true;
    studioPlaqueGroup.add(plaqueBoard);

    // 2. Front Laser-Engraved Beech Wood Grain Surface
    const plaqueFaceGeo = new THREE.ShapeGeometry(plaqueShape, 12);
    const uvAttr = plaqueFaceGeo.attributes.uv;
    for (let i = 0; i < uvAttr.count; i++) {
      const px = uvAttr.getX(i);
      const py = uvAttr.getY(i);
      uvAttr.setXY(i, (px + pw) / PLAQUE_W, (py + ph) / PLAQUE_H);
    }
    uvAttr.needsUpdate = true;

    const plaqueFaceMat = new THREE.MeshStandardMaterial({
      map: plaqueTexture,
      color: 0xffffff,
      roughness: 0.52,
      metalness: 0.02,
    });
    const plaqueFace = new THREE.Mesh(plaqueFaceGeo, plaqueFaceMat);
    plaqueFace.position.z = 0.0265;
    plaqueFace.receiveShadow = true;
    studioPlaqueGroup.add(plaqueFace);

    // 3. Recessed Rear Wall Mounting Standoffs (6mm shadow offset off slat wall)
    const standoffGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.008, 12);
    standoffGeo.rotateX(Math.PI / 2);
    const standoffMat = new THREE.MeshStandardMaterial({
      color: 0x1e1610,
      roughness: 0.5,
      metalness: 0.4,
    });
    [
      [-pw + 0.08, ph - 0.07],
      [pw - 0.08, ph - 0.07],
      [-pw + 0.08, -ph + 0.07],
      [pw - 0.08, -ph + 0.07],
    ].forEach(([sx, sy]) => {
      const peg = new THREE.Mesh(standoffGeo, standoffMat);
      peg.position.set(sx, sy, 0.004);
      studioPlaqueGroup.add(peg);
    });

    // Mount on front wall within the left half of the wall table span (table X ∈ [-1.30, +1.30])
    studioPlaqueGroup.position.set(-0.82, 1.52, -ROOM_DEPTH / 2);
    roomGroup.add(studioPlaqueGroup);

    // Gentle warm accent light highlighting the wooden studio plaque
    const plaqueSpot = new THREE.PointLight(0xffeed6, 1.05, 2.8, 1.3);
    plaqueSpot.position.set(-0.82, 1.85, -ROOM_DEPTH / 2 + 0.65);
    roomGroup.add(plaqueSpot);

    // --- 4A-3. SUZUMI SU HANGING SCROLL TAPESTRY ON FRONT WALL RIGHT END OF TABLE (正前方桌子偏右側尾端牆面掛軸) ---
    const suzumiScrollTexture = textureLoader.load('/assets/suzumi_scroll_tex.png');
    suzumiScrollTexture.colorSpace = THREE.SRGBColorSpace;
    suzumiScrollTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const suzumiScrollGroup = new THREE.Group();
    const SCROLL2_W = 0.45;
    const SCROLL2_H = 1.20; // Exact 600 : 1600 ratio matching tapestry artwork

    // 1. Subdivided gently draping tapestry cloth mesh
    const scroll2ClothGeo = new THREE.PlaneGeometry(SCROLL2_W, SCROLL2_H, 12, 24);
    const s2Pos = scroll2ClothGeo.attributes.position;
    for (let i = 0; i < s2Pos.count; i++) {
      const sx = s2Pos.getX(i);
      const sy = s2Pos.getY(i);
      const ny = (sy + SCROLL2_H / 2) / SCROLL2_H; // 0 bottom .. 1 top
      const nx = sx / (SCROLL2_W / 2); // -1 .. +1
      // Very gentle vertical cloth drape wave so it doesn't look flat
      const drapeZ =
        Math.sin(ny * Math.PI) * 0.0045 +
        Math.cos(nx * Math.PI) * 0.0025 * Math.sin(ny * Math.PI);
      s2Pos.setY(i, sy - SCROLL2_H / 2); // Pivot at top rod y = 0
      s2Pos.setZ(i, 0.010 + drapeZ);
    }
    scroll2ClothGeo.computeVertexNormals();

    const suzumiFrontMesh = new THREE.Mesh(
      scroll2ClothGeo,
      new THREE.MeshStandardMaterial({
        map: suzumiScrollTexture,
        color: 0xffffff,
        roughness: 0.78,
        metalness: 0.03,
      })
    );
    suzumiFrontMesh.castShadow = true;
    suzumiFrontMesh.receiveShadow = true;
    suzumiScrollGroup.add(suzumiFrontMesh);

    // 2. Dark burgundy back cloth lining for realistic edge thickness
    const suzumiBackMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(SCROLL2_W, SCROLL2_H),
      new THREE.MeshStandardMaterial({
        color: 0x1b0e14,
        roughness: 0.9,
        side: THREE.FrontSide,
      })
    );
    suzumiBackMesh.position.set(0, -SCROLL2_H / 2, 0.0085);
    suzumiBackMesh.rotation.y = Math.PI;
    suzumiScrollGroup.add(suzumiBackMesh);

    // 3. Top & Bottom matte black horizontal scroll rods with end caps
    const scroll2RodMat = new THREE.MeshStandardMaterial({
      color: 0x141418,
      roughness: 0.42,
      metalness: 0.14,
    });
    const scroll2RodGeo = new THREE.CylinderGeometry(0.0085, 0.0085, SCROLL2_W + 0.024, 16);
    scroll2RodGeo.rotateZ(Math.PI / 2);

    const topRod2 = new THREE.Mesh(scroll2RodGeo, scroll2RodMat);
    topRod2.position.set(0, 0.004, 0.011);
    topRod2.castShadow = true;
    suzumiScrollGroup.add(topRod2);

    const botRod2 = new THREE.Mesh(scroll2RodGeo, scroll2RodMat);
    botRod2.position.set(0, -SCROLL2_H - 0.004, 0.011);
    botRod2.castShadow = true;
    suzumiScrollGroup.add(botRod2);

    // 4. Crisp white hanging cord triangle rising from top dowel ends to wall pin
    const cordCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-SCROLL2_W / 2 + 0.016, 0.008, 0.011),
      new THREE.Vector3(-SCROLL2_W / 4 + 0.008, 0.078, 0.007),
      new THREE.Vector3(0, 0.146, 0.004),
      new THREE.Vector3(SCROLL2_W / 4 - 0.008, 0.078, 0.007),
      new THREE.Vector3(SCROLL2_W / 2 - 0.016, 0.008, 0.011),
    ]);
    const cordMesh = new THREE.Mesh(
      new THREE.TubeGeometry(cordCurve, 24, 0.0024, 8, false),
      new THREE.MeshStandardMaterial({
        color: 0xedeff2,
        roughness: 0.72,
        metalness: 0.02,
      })
    );
    cordMesh.castShadow = true;
    suzumiScrollGroup.add(cordMesh);

    // 5. Small silver wall pin/nail at hanging apex
    const scroll2Pin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.0032, 0.0032, 0.016, 10),
      new THREE.MeshStandardMaterial({ color: 0xbac0c8, roughness: 0.3, metalness: 0.8 })
    );
    scroll2Pin.rotation.x = Math.PI / 2;
    scroll2Pin.position.set(0, 0.148, 0.005);
    suzumiScrollGroup.add(scroll2Pin);

    // Mount flush on the front wall near the right end of the wall-side table (table spans X ∈ [-1.30, +1.30])
    suzumiScrollGroup.position.set(1.06, 2.40, -ROOM_DEPTH / 2);
    roomGroup.add(suzumiScrollGroup);

    // Gentle warm spotlight illuminating the hanging scroll on the right side of the front wall table
    const suzumiScrollSpot = new THREE.PointLight(0xffeed6, 1.15, 3.2, 1.25);
    suzumiScrollSpot.position.set(1.06, 2.15, -ROOM_DEPTH / 2 + 0.72);
    roomGroup.add(suzumiScrollSpot);

    // --- 4B. ENLARGED CIRCULAR WOODEN TEA TABLE & TABLE LAMP (放大並改為圓形木茶几，附設雅緻檯燈) ---
    const centerTeaGroup = new THREE.Group();
    centerTeaGroup.position.set(0, 0, 0); // Exact center of the room

    const TEA_TABLE_RADIUS = 0.85; // 圓形茶几半徑 (直徑 1.7m，大器且舒適)
    const TEA_TABLE_HEIGHT = 0.36; // 茶几高度
    const TEA_TABLE_TOP_THICK = 0.045; // 實木厚度

    // Circular Tabletop Slab
    const teaTopGeo = new THREE.CylinderGeometry(TEA_TABLE_RADIUS, TEA_TABLE_RADIUS, TEA_TABLE_TOP_THICK, 48);
    const teaTop = new THREE.Mesh(teaTopGeo, tableMat);
    teaTop.position.set(0, TEA_TABLE_HEIGHT - TEA_TABLE_TOP_THICK / 2, 0);
    teaTop.castShadow = true;
    teaTop.receiveShadow = true;
    centerTeaGroup.add(teaTop);

    // Beveled Round Edge Trim
    const roundRimGeo = new THREE.TorusGeometry(TEA_TABLE_RADIUS, 0.018, 16, 48);
    const roundRimMesh = new THREE.Mesh(roundRimGeo, tableDarkWoodMat);
    roundRimMesh.position.set(0, TEA_TABLE_HEIGHT - TEA_TABLE_TOP_THICK / 2, 0);
    roundRimMesh.rotation.x = Math.PI / 2;
    centerTeaGroup.add(roundRimMesh);

    // 4 Curved / Angled Sturdy Wooden Legs under Round Table
    const legRadius = TEA_TABLE_RADIUS - 0.20;
    const roundLegHeight = TEA_TABLE_HEIGHT - TEA_TABLE_TOP_THICK;
    const roundLegGeo = new THREE.BoxGeometry(0.065, roundLegHeight, 0.065);
    
    [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75].forEach((angle) => {
      const lx = Math.cos(angle) * legRadius;
      const lz = Math.sin(angle) * legRadius;
      const leg = new THREE.Mesh(roundLegGeo, tableDarkWoodMat);
      leg.position.set(lx, roundLegHeight / 2, lz);
      leg.rotation.y = -angle;
      leg.castShadow = true;
      centerTeaGroup.add(leg);
    });

    // Cross brace frame under the tabletop
    const braceGeo = new THREE.BoxGeometry(legRadius * 2, 0.035, 0.035);
    const brace1 = new THREE.Mesh(braceGeo, tableDarkWoodMat);
    brace1.position.set(0, 0.12, 0);
    brace1.rotation.y = Math.PI * 0.25;
    centerTeaGroup.add(brace1);

    const brace2 = new THREE.Mesh(braceGeo, tableDarkWoodMat);
    brace2.position.set(0, 0.12, 0);
    brace2.rotation.y = Math.PI * 0.75;
    centerTeaGroup.add(brace2);

    // --- TABLE LAMP ON TEA TABLE (User Request: 在茶几上擺上一個檯燈) ---
    const lampGroup = new THREE.Group();
    // Positioned gracefully on the round tea table (slightly offset to the left-rear to frame the tea tray)
    lampGroup.position.set(-0.35, TEA_TABLE_HEIGHT, -0.15);

    // 1. Heavy dark bronze/ceramic lamp base
    const lampBaseMat = new THREE.MeshStandardMaterial({
      color: 0x1b1512,
      roughness: 0.35,
      metalness: 0.25,
    });
    const lampBaseGeo = new THREE.CylinderGeometry(0.11, 0.13, 0.032, 24);
    const lampBase = new THREE.Mesh(lampBaseGeo, lampBaseMat);
    lampBase.position.y = 0.016;
    lampBase.castShadow = true;
    lampGroup.add(lampBase);

    // Brass accent ring above base
    const brassRingGeo = new THREE.TorusGeometry(0.08, 0.01, 12, 24);
    const brassRing = new THREE.Mesh(brassRingGeo, brassMat);
    brassRing.position.y = 0.034;
    brassRing.rotation.x = Math.PI / 2;
    lampGroup.add(brassRing);

    // 2. Sculpted wooden/ceramic stem neck
    const lampStemGeo = new THREE.CylinderGeometry(0.020, 0.040, 0.16, 16);
    const lampStem = new THREE.Mesh(lampStemGeo, tableDarkWoodMat);
    lampStem.position.y = 0.115;
    lampStem.castShadow = true;
    lampGroup.add(lampStem);

    // 3. Washi Paper / Pleated Drum Lampshade (透光和紙燈罩)
    const lampShadeMat = new THREE.MeshStandardMaterial({
      color: 0xfff0dc,
      roughness: 0.85,
      side: THREE.DoubleSide,
    });
    const lampShadeGeo = new THREE.CylinderGeometry(0.14, 0.17, 0.20, 24, 1, true);
    const lampShade = new THREE.Mesh(lampShadeGeo, lampShadeMat);
    lampShade.position.y = 0.27;
    lampShade.castShadow = true;
    lampGroup.add(lampShade);

    // Dark wood top & bottom shade rims
    const shadeRimTop = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.007, 12, 24), tableDarkWoodMat);
    shadeRimTop.position.y = 0.37;
    shadeRimTop.rotation.x = Math.PI / 2;
    lampGroup.add(shadeRimTop);

    const shadeRimBottom = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.007, 12, 24), tableDarkWoodMat);
    shadeRimBottom.position.y = 0.17;
    shadeRimBottom.rotation.x = Math.PI / 2;
    lampGroup.add(shadeRimBottom);

    // Internal soft incandescent bulb
    const lampBulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.024, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xffeacc })
    );
    lampBulb.position.y = 0.26;
    lampGroup.add(lampBulb);

    // Table Lamp Point Light casting warm intimate glow on the tabletop & surroundings
    const tableLampLight = new THREE.PointLight(0xffdf9a, isLampOn ? 2.8 : 0, 5.2, 1.25);
    tableLampLight.position.y = 0.27;
    tableLampLight.castShadow = true;
    lampGroup.add(tableLampLight);

    // Dedicated invisible interaction hitbox around the lamp for responsive tap/click
    const lampHitboxGeo = new THREE.CylinderGeometry(0.172, 0.172, 0.52, 16);
    const lampHitboxMat = new THREE.MeshBasicMaterial({ visible: false });
    const lampHitbox = new THREE.Mesh(lampHitboxGeo, lampHitboxMat);
    lampHitbox.position.y = 0.24;
    lampHitbox.name = 'lamp_hitbox';
    lampGroup.add(lampHitbox);
    lampHitboxRef.current = lampHitbox;

    // Save refs for dynamic toggle and tap detection
    lampLightRef.current = tableLampLight;
    lampBulbMatRef.current = lampBulb.material as THREE.MeshBasicMaterial;
    lampShadeMatRef.current = lampShadeMat;
    lampGroupRef.current = lampGroup;

    centerTeaGroup.add(lampGroup);

    // --- 40CM ROUND PADDLE FAN ON TEA TABLE (優化版 40 公分直徑圓扇) ---
    const fanTexture = textureLoader.load('/assets/round_fan_tex.png');
    fanTexture.colorSpace = THREE.SRGBColorSpace;
    fanTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const fanGroup = new THREE.Group();
    const FAN_RADIUS = 0.20; // Diameter = 40 cm (0.40 m)

    const fanPlasticMat = new THREE.MeshStandardMaterial({
      color: 0x131418,
      roughness: 0.56,
      metalness: 0.08,
    });
    const fanPrintMat = new THREE.MeshPhysicalMaterial({
      map: fanTexture,
      color: 0xffffff,
      roughness: 0.30,
      metalness: 0.02,
      clearcoat: 0.65,
      clearcoatRoughness: 0.22,
      alphaTest: 0.45,
    });

    // 1. Solid PP plastic backing core disk (40 cm diameter)
    const fanCoreGeo = new THREE.CylinderGeometry(FAN_RADIUS - 0.001, FAN_RADIUS - 0.001, 0.0020, 64);
    fanCoreGeo.rotateX(Math.PI / 2);
    const fanCore = new THREE.Mesh(fanCoreGeo, fanPlasticMat);
    fanCore.castShadow = true;
    fanCore.receiveShadow = true;
    fanGroup.add(fanCore);

    // 2. Crisp 1024px printed laminated circular fan face
    const fanFace = new THREE.Mesh(new THREE.CircleGeometry(FAN_RADIUS - 0.001, 64), fanPrintMat);
    fanFace.position.z = 0.0015;
    fanFace.receiveShadow = true;
    fanGroup.add(fanFace);

    // 3. Outer molded black plastic rim framing the artwork cleanly without covering edge lettering
    const fanRim = new THREE.Mesh(new THREE.TorusGeometry(FAN_RADIUS + 0.0022, 0.0038, 14, 72), fanPlasticMat);
    fanRim.castShadow = true;
    fanGroup.add(fanRim);

    // 4. Flared neck junction joining blade bottom edge into ribbed handle
    const neckShape = new THREE.Shape();
    neckShape.moveTo(-0.044, -FAN_RADIUS + 0.004);
    neckShape.lineTo(0.044, -FAN_RADIUS + 0.004);
    neckShape.quadraticCurveTo(0.020, -FAN_RADIUS - 0.020, 0.015, -FAN_RADIUS - 0.045);
    neckShape.lineTo(-0.015, -FAN_RADIUS - 0.045);
    neckShape.quadraticCurveTo(-0.020, -FAN_RADIUS - 0.020, -0.044, -FAN_RADIUS + 0.004);
    neckShape.closePath();

    const neckGeo = new THREE.ExtrudeGeometry(neckShape, {
      depth: 0.0056,
      bevelEnabled: true,
      bevelThickness: 0.001,
      bevelSize: 0.001,
      bevelSegments: 2,
    });
    neckGeo.translate(0, 0, -0.0028);
    const fanNeck = new THREE.Mesh(neckGeo, fanPlasticMat);
    fanNeck.castShadow = true;
    fanGroup.add(fanNeck);

    // Molded V-shaped structural gusset ribs along neck junction
    [-0.014, 0, 0.014].forEach((offsetX, idx) => {
      const neckRib = new THREE.Mesh(new THREE.BoxGeometry(0.0022, 0.044, 0.0082), fanPlasticMat);
      neckRib.position.set(offsetX * 0.65, -FAN_RADIUS - 0.018, 0);
      neckRib.rotation.z = (idx - 1) * -0.28;
      fanGroup.add(neckRib);
    });

    // 5. Ribbed black handle shaft
    const HANDLE_LEN = 0.145;
    const handleBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.030, HANDLE_LEN, 0.0068),
      fanPlasticMat
    );
    handleBar.position.set(0, -FAN_RADIUS - 0.042 - HANDLE_LEN / 2 + 0.01, 0);
    handleBar.castShadow = true;
    fanGroup.add(handleBar);

    const ribGeo = new THREE.BoxGeometry(0.0024, HANDLE_LEN + 0.012, 0.0092);
    [-0.010, -0.0035, 0.0035, 0.010].forEach((rx) => {
      const rib = new THREE.Mesh(ribGeo, fanPlasticMat);
      rib.position.set(rx, -FAN_RADIUS - 0.042 - HANDLE_LEN / 2 + 0.01, 0);
      fanGroup.add(rib);
    });

    // 6. Tail circular medallion ring + mini character sticker at end of handle
    const TAIL_Y = -FAN_RADIUS - 0.042 - HANDLE_LEN - 0.018;
    const tailRing = new THREE.Mesh(new THREE.TorusGeometry(0.032, 0.0040, 14, 40), fanPlasticMat);
    tailRing.position.set(0, TAIL_Y, 0);
    tailRing.castShadow = true;
    fanGroup.add(tailRing);

    const tailBackingGeo = new THREE.CylinderGeometry(0.031, 0.031, 0.0044, 36);
    tailBackingGeo.rotateX(Math.PI / 2);
    const tailBacking = new THREE.Mesh(tailBackingGeo, fanPlasticMat);
    tailBacking.position.set(0, TAIL_Y, 0);
    fanGroup.add(tailBacking);

    const tailSticker = new THREE.Mesh(new THREE.CircleGeometry(0.029, 36), fanPrintMat);
    tailSticker.position.set(0, TAIL_Y, 0.0028);
    fanGroup.add(tailSticker);

    // Lay flat face-up on the right half of the tea table, angled neatly toward the seated viewer
    fanGroup.position.set(0.25, TEA_TABLE_HEIGHT + 0.0055, 0.01);
    fanGroup.rotation.set(-Math.PI / 2, 0, 0.22);
    centerTeaGroup.add(fanGroup);

    // --- Floor Cushions (小坐墊 / 環繞圓几的和室厚坐墊) ---
    const cushionMatCharcoal = new THREE.MeshStandardMaterial({
      color: 0x2d2823, // 深炭灰織物
      roughness: 0.85,
    });
    const cushionMatEarth = new THREE.MeshStandardMaterial({
      color: 0x3a3229, // 溫暖大地色麻布
      roughness: 0.85,
    });

    const cushionGeo = new THREE.CylinderGeometry(0.22, 0.23, 0.065, 24);
    const CUSHION_DISTANCE = TEA_TABLE_RADIUS + 0.30; // 1.15m from center

    const cushionPositions = [
      // South cushion (南側 - 面朝茶几與前方盆栽，玩家落座處)
      { x: 0, z: CUSHION_DISTANCE, mat: cushionMatEarth },
      // North cushion (北側)
      { x: 0, z: -CUSHION_DISTANCE, mat: cushionMatCharcoal },
      // East cushion (東側)
      { x: CUSHION_DISTANCE, z: 0, mat: cushionMatEarth },
      // West cushion (西側)
      { x: -CUSHION_DISTANCE, z: 0, mat: cushionMatCharcoal },
    ];

    cushionPositions.forEach((pos) => {
      const cushionGroup = new THREE.Group();
      cushionGroup.position.set(pos.x, 0.0325, pos.z);

      const cushion = new THREE.Mesh(cushionGeo, pos.mat);
      cushion.castShadow = true;
      cushion.receiveShadow = true;
      cushionGroup.add(cushion);

      // Center tuft button
      const buttonGeo = new THREE.SphereGeometry(0.016, 10, 8);
      const buttonMat = new THREE.MeshStandardMaterial({ color: 0x16120e, roughness: 0.6 });
      const button = new THREE.Mesh(buttonGeo, buttonMat);
      button.position.y = 0.033;
      button.scale.set(1, 0.4, 1);
      cushionGroup.add(button);

      centerTeaGroup.add(cushionGroup);
    });

    roomGroup.add(centerTeaGroup);

    // --- 4F. 180CM STANDING DISPLAY RACK ON FAR-LEFT SIDE (左側盡頭側面的 180 公分立牌展架) ---
    const displayRackGroup = new THREE.Group();
    const RACK_TOTAL_H = 1.80; // Real-world 180 cm height
    const FOOT_H = 0.012;
    const FRAME_BAR = 0.032;
    const FRAME_DEPTH = 0.038;
    const POSTER_W = 0.745;
    const POSTER_H = 1.614; // Exact 720 : 1560 (1 : 2.167) ratio matching photo
    const RACK_W = POSTER_W + FRAME_BAR * 2; // ~0.809 m
    const BASE_D = 0.44;

    const displayPosterTexture = textureLoader.load('/assets/display_rack_poster.png');
    displayPosterTexture.colorSpace = THREE.SRGBColorSpace;
    displayPosterTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const rackMetalMat = new THREE.MeshStandardMaterial({
      color: 0x16171b,
      roughness: 0.36,
      metalness: 0.65,
    });
    const rackBaseMat = new THREE.MeshStandardMaterial({
      color: 0x1c1e24,
      roughness: 0.46,
      metalness: 0.52,
    });
    const rackFootMat = new THREE.MeshStandardMaterial({
      color: 0x0b0b0d,
      roughness: 0.85,
      metalness: 0.05,
    });

    // 1. Four low rubber floor pads grounded flush at Y = 0
    const footGeo = new THREE.CylinderGeometry(0.020, 0.022, FOOT_H, 12);
    [
      [-RACK_W / 2 + 0.05, -BASE_D / 2 + 0.05],
      [RACK_W / 2 - 0.05, -BASE_D / 2 + 0.05],
      [-RACK_W / 2 + 0.05, BASE_D / 2 - 0.05],
      [RACK_W / 2 - 0.05, BASE_D / 2 - 0.05],
    ].forEach(([fx, fz]) => {
      const foot = new THREE.Mesh(footGeo, rackFootMat);
      foot.position.set(fx, FOOT_H / 2, fz);
      displayRackGroup.add(foot);
    });

    // 2. Weighted Sloped Black Steel Wedge Base (Y = 0.012m up to bottom of frame)
    const FRAME_BOTTOM_Y = RACK_TOTAL_H - (POSTER_H + FRAME_BAR * 2); // ~0.122m
    const wedgeShape = new THREE.Shape();
    wedgeShape.moveTo(-BASE_D / 2, 0);
    wedgeShape.lineTo(BASE_D / 2, 0);
    wedgeShape.lineTo(BASE_D / 2, 0.028);
    wedgeShape.lineTo(0.055, FRAME_BOTTOM_Y - FOOT_H + 0.014);
    wedgeShape.lineTo(-0.055, FRAME_BOTTOM_Y - FOOT_H + 0.014);
    wedgeShape.lineTo(-BASE_D / 2, 0.028);
    wedgeShape.closePath();

    const wedgeGeo = new THREE.ExtrudeGeometry(wedgeShape, {
      depth: RACK_W,
      bevelEnabled: true,
      bevelThickness: 0.003,
      bevelSize: 0.003,
      bevelSegments: 2,
    });
    // Rotate so extruded span aligns along X centered at 0, and profile lies in Y-Z plane
    wedgeGeo.rotateY(Math.PI / 2);
    wedgeGeo.translate(-RACK_W / 2, FOOT_H, 0);
    const wedgeBase = new THREE.Mesh(wedgeGeo, rackBaseMat);
    wedgeBase.castShadow = true;
    wedgeBase.receiveShadow = true;
    displayRackGroup.add(wedgeBase);

    // 3. Outer Matte-Black Aluminum Poster Frame (exact top at Y = 1.800 m)
    const FRAME_BODY_H = POSTER_H + FRAME_BAR * 2; // 1.678 m
    const topBar = new THREE.Mesh(
      new THREE.BoxGeometry(RACK_W, FRAME_BAR, FRAME_DEPTH),
      rackMetalMat
    );
    topBar.position.set(0, RACK_TOTAL_H - FRAME_BAR / 2, 0);
    topBar.castShadow = true;
    displayRackGroup.add(topBar);

    const bottomBar = new THREE.Mesh(
      new THREE.BoxGeometry(RACK_W, FRAME_BAR, FRAME_DEPTH),
      rackMetalMat
    );
    bottomBar.position.set(0, FRAME_BOTTOM_Y + FRAME_BAR / 2, 0);
    bottomBar.castShadow = true;
    displayRackGroup.add(bottomBar);

    const sideStileGeo = new THREE.BoxGeometry(FRAME_BAR, FRAME_BODY_H, FRAME_DEPTH);
    [-1, 1].forEach((side) => {
      const stile = new THREE.Mesh(sideStileGeo, rackMetalMat);
      stile.position.set(side * (POSTER_W / 2 + FRAME_BAR / 2), FRAME_BOTTOM_Y + FRAME_BODY_H / 2, 0);
      stile.castShadow = true;
      stile.receiveShadow = true;
      displayRackGroup.add(stile);
    });

    // 4. Solid Steel Backing Panel Inside Frame
    const posterCenterY = FRAME_BOTTOM_Y + FRAME_BAR + POSTER_H / 2;
    const rackBackPanel = new THREE.Mesh(
      new THREE.BoxGeometry(POSTER_W + 0.006, POSTER_H + 0.006, 0.012),
      rackBaseMat
    );
    rackBackPanel.position.set(0, posterCenterY, -0.004);
    rackBackPanel.castShadow = true;
    displayRackGroup.add(rackBackPanel);

    // 5. Front Printed CubePixel / Umiri Recruitment Poster Graphic
    const posterFrontMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(POSTER_W, POSTER_H),
      new THREE.MeshStandardMaterial({
        map: displayPosterTexture,
        color: 0xffffff,
        roughness: 0.38,
        metalness: 0.04,
      })
    );
    posterFrontMesh.position.set(0, posterCenterY, 0.006);
    posterFrontMesh.receiveShadow = true;
    displayRackGroup.add(posterFrontMesh);

    // Place sideways flush along the left wall at the far end of the room (左側盡頭側面)
    displayRackGroup.position.set(-ROOM_WIDTH / 2 + 0.38, 0, -2.92);
    displayRackGroup.rotation.y = Math.PI / 2;
    roomGroup.add(displayRackGroup);

    // Warm subtle corner fill light illuminating the 180cm display stand
    const displayRackLight = new THREE.PointLight(0xffebd0, 1.45, 4.5, 1.25);
    displayRackLight.position.set(-ROOM_WIDTH / 2 + 1.20, 2.25, -2.65);
    roomGroup.add(displayRackLight);

    // --- 4D. RIGHT-WALL HANGING SCROLL BANNER (右側櫃旁牆面的立體掛軸) ---
    const scrollGroup = new THREE.Group();
    const SCROLL_W = 0.56;
    const SCROLL_H = 1.75; // Ratio ~1 : 3.125 matching the reference banner photo
    const SHOULDER_RATIO = 1138 / 1600; // Vertical straight sides end at 71.1%
    const TIP_RATIO = 1588 / 1600; // V-tip vertex at 99.25%
    const scrollTexture = textureLoader.load('/assets/slytherin_banner_tex.png');
    scrollTexture.colorSpace = THREE.SRGBColorSpace;
    scrollTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    // Build subdivided pentagonal cloth mesh with subtle natural fabric wave & packaging fold creases
    const buildBannerClothGeo = (zOffset: number, flipFacing: boolean) => {
      const cols = 12;
      const rows = 40;
      const positions: number[] = [];
      const uvs: number[] = [];
      const indices: number[] = [];

      for (let r = 0; r <= rows; r++) {
        const t = (r / rows) * TIP_RATIO;
        const y = -t * SCROLL_H;
        const halfWidthFrac =
          t <= SHOULDER_RATIO
            ? 1.0
            : Math.max(0.002, 1 - (t - SHOULDER_RATIO) / (TIP_RATIO - SHOULDER_RATIO));

        // Gentle cloth drape & faint horizontal fold ridges seen in the reference photo
        const topPinned = Math.min(1, t / 0.08);
        const foldRidge =
          Math.exp(-Math.pow((t - 0.27) * 42, 2)) * 0.0045 +
          Math.exp(-Math.pow((t - 0.52) * 42, 2)) * 0.0055 +
          Math.exp(-Math.pow((t - 0.74) * 42, 2)) * 0.0045;

        for (let c = 0; c <= cols; c++) {
          const sNorm = c / cols - 0.5; // -0.5 .. +0.5
          const x = sNorm * SCROLL_W * halfWidthFrac;

          const centerCrease = (1 - Math.min(1, Math.abs(sNorm) * 6)) * 0.0045 * topPinned;
          const lateralBillow = Math.cos(sNorm * Math.PI) * 0.007 * topPinned;
          const z = zOffset + lateralBillow + centerCrease + foldRidge * topPinned;

          positions.push(x, y, z);

          // Map cleanly onto the rectified pentagon area inside slytherin_banner_tex.png
          const u = 0.498 + (x / SCROLL_W) * (500 / 512);
          const v = 1.0 - t;
          uvs.push(u, v);
        }
      }

      const stride = cols + 1;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const a = r * stride + c;
          const b = a + 1;
          const d = (r + 1) * stride + c;
          const e = d + 1;
          if (!flipFacing) {
            indices.push(a, d, b);
            indices.push(b, d, e);
          } else {
            indices.push(a, b, d);
            indices.push(b, e, d);
          }
        }
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geo.setIndex(indices);
      geo.computeVertexNormals();
      return geo;
    };

    // 1. Front printed teal cloth face
    const scrollFrontGeo = buildBannerClothGeo(0.005, false);
    const scrollFrontMat = new THREE.MeshStandardMaterial({
      map: scrollTexture,
      color: 0xffffff,
      roughness: 0.76,
      metalness: 0.04,
      alphaTest: 0.45,
      transparent: false,
      side: THREE.FrontSide,
    });
    const scrollFrontMesh = new THREE.Mesh(scrollFrontGeo, scrollFrontMat);
    scrollFrontMesh.castShadow = true;
    scrollFrontMesh.receiveShadow = true;
    scrollGroup.add(scrollFrontMesh);

    // 2. Back dark cloth lining so the banner has realistic thickness from oblique corner angles
    const scrollBackGeo = buildBannerClothGeo(0.001, true);
    const scrollBackMat = new THREE.MeshStandardMaterial({
      color: 0x092420,
      roughness: 0.88,
      metalness: 0.02,
      side: THREE.FrontSide,
    });
    const scrollBackMesh = new THREE.Mesh(scrollBackGeo, scrollBackMat);
    scrollGroup.add(scrollBackMesh);

    // 3. Top stitched black fabric sleeve band (matches black top header bar in photo)
    const SLEEVE_H = 0.042;
    const sleeveGeo = new THREE.BoxGeometry(SCROLL_W + 0.006, SLEEVE_H, 0.014);
    const sleeveMat = new THREE.MeshStandardMaterial({
      color: 0x0e0f12,
      roughness: 0.84,
      metalness: 0.05,
    });
    const sleeveMesh = new THREE.Mesh(sleeveGeo, sleeveMat);
    sleeveMesh.position.set(0, -SLEEVE_H / 2 + 0.002, 0.005);
    sleeveMesh.castShadow = true;
    scrollGroup.add(sleeveMesh);

    // 4. Internal top horizontal dowel rod subtly emerging from both sleeve ends
    const rodGeo = new THREE.CylinderGeometry(0.0055, 0.0055, SCROLL_W + 0.016, 14);
    rodGeo.rotateZ(Math.PI / 2);
    const rodMat = new THREE.MeshStandardMaterial({
      color: 0x18120e,
      roughness: 0.45,
      metalness: 0.12,
    });
    const rodMesh = new THREE.Mesh(rodGeo, rodMat);
    rodMesh.position.set(0, -SLEEVE_H / 2 + 0.002, 0.004);
    scrollGroup.add(rodMesh);

    // 5. Left & Right metallic brass grommet eyelets + wall pins in the top black strip
    const grommetGeo = new THREE.TorusGeometry(0.011, 0.0034, 10, 22);
    const pinGeo = new THREE.CylinderGeometry(0.0032, 0.0032, 0.024, 10);
    pinGeo.rotateX(Math.PI / 2);
    const pinMat = new THREE.MeshStandardMaterial({
      color: 0x3b352c,
      roughness: 0.35,
      metalness: 0.8,
    });

    [-1, 1].forEach((side) => {
      const gx = side * (SCROLL_W / 2 - 0.025);
      const gy = -SLEEVE_H / 2 + 0.002;

      const grommet = new THREE.Mesh(grommetGeo, brassMat);
      grommet.position.set(gx, gy, 0.0125);
      scrollGroup.add(grommet);

      const wallPin = new THREE.Mesh(pinGeo, pinMat);
      wallPin.position.set(gx, gy, 0.003);
      scrollGroup.add(wallPin);
    });

    // Mount flush on the right wall directly beside the right side of the 6-tier cabinet
    scrollGroup.position.set(ROOM_WIDTH / 2 - 0.014, 2.46, -2.78);
    scrollGroup.rotation.y = -Math.PI / 2;
    roomGroup.add(scrollGroup);

    // Warm subtle corner light gently illuminating the hanging scroll banner
    const scrollAccentLight = new THREE.PointLight(0xffebd0, 1.35, 3.8, 1.3);
    scrollAccentLight.position.set(ROOM_WIDTH / 2 - 0.78, 2.55, -2.60);
    roomGroup.add(scrollAccentLight);

    // --- 4E. TWIN SIX-TIER DEEP DARK WOOD CABINETS (畫面右邊鏡頭底部的並排六層深木櫃) ---
    const CAB_W = 1.12;
    const CAB_D = 0.44;
    const CAB_H = 2.16;
    const PLINTH_H = 0.08;
    const CROWN_H = 0.06;
    const SIDE_THICK = 0.036;
    const SHELF_THICK = 0.032;
    const CAB_X = 3.95;
    const CAB2_X = CAB_X - (CAB_W + 0.08); // 2.75: identical cabinet directly to the left (0.02m crown seam)
    const CAB_Z = -3.26; // Back sits flush near front wall (-3.48), front face at -3.04

    const cabDarkMat = new THREE.MeshStandardMaterial({
      color: 0x1a0d07,
      roughness: 0.52,
      metalness: 0.06,
    });
    const cabBackMat = new THREE.MeshStandardMaterial({
      color: 0x110804,
      roughness: 0.72,
      metalness: 0.03,
    });

    const createSixTierCabinet = () => {
      const cab = new THREE.Group();

      // 1. Grounded Plinth Base + Front Kickplate Trim
      const plinthCore = new THREE.Mesh(
        new THREE.BoxGeometry(CAB_W - 0.03, PLINTH_H, CAB_D - 0.03),
        cabDarkMat
      );
      plinthCore.position.set(0, PLINTH_H / 2, -0.01);
      plinthCore.castShadow = true;
      plinthCore.receiveShadow = true;
      cab.add(plinthCore);

      const kickplate = new THREE.Mesh(
        new THREE.BoxGeometry(CAB_W + 0.01, PLINTH_H * 0.85, 0.024),
        tableDarkWoodMat
      );
      kickplate.position.set(0, (PLINTH_H * 0.85) / 2, CAB_D / 2 - 0.008);
      cab.add(kickplate);

      // 2. Left & Right Vertical Side Panels + Front Stile Molding
      const bodyHeight = CAB_H - PLINTH_H - CROWN_H; // 2.02m
      const sideGeo = new THREE.BoxGeometry(SIDE_THICK, bodyHeight, CAB_D);
      const stileGeo = new THREE.BoxGeometry(0.044, bodyHeight, 0.014);

      [-1, 1].forEach((side) => {
        const sx = side * (CAB_W / 2 - SIDE_THICK / 2);
        const sidePanel = new THREE.Mesh(sideGeo, tableMat);
        sidePanel.position.set(sx, PLINTH_H + bodyHeight / 2, 0);
        sidePanel.castShadow = true;
        sidePanel.receiveShadow = true;
        cab.add(sidePanel);

        const frontStile = new THREE.Mesh(stileGeo, cabDarkMat);
        frontStile.position.set(sx, PLINTH_H + bodyHeight / 2, CAB_D / 2 + 0.005);
        frontStile.castShadow = true;
        cab.add(frontStile);
      });

      // 3. Recessed Deep Dark Wood Back Panel
      const cabBack = new THREE.Mesh(
        new THREE.BoxGeometry(CAB_W - SIDE_THICK * 2 + 0.01, bodyHeight, 0.018),
        cabBackMat
      );
      cabBack.position.set(0, PLINTH_H + bodyHeight / 2, -CAB_D / 2 + 0.01);
      cabBack.receiveShadow = true;
      cab.add(cabBack);

      // 4. Seven Horizontal Shelves Creating Six Distinct Open Tiers (六層分隔層板)
      const innerSpanW = CAB_W - SIDE_THICK * 2;
      const shelfGeo = new THREE.BoxGeometry(innerSpanW, SHELF_THICK, CAB_D - 0.02);
      const shelfLipGeo = new THREE.BoxGeometry(innerSpanW, SHELF_THICK + 0.004, 0.014);
      const tierPitch = (bodyHeight - SHELF_THICK) / 6; // 6 equal vertical bays

      for (let i = 0; i <= 6; i++) {
        const sy = PLINTH_H + SHELF_THICK / 2 + i * tierPitch;
        const shelf = new THREE.Mesh(shelfGeo, tableMat);
        shelf.position.set(0, sy, 0.004);
        shelf.castShadow = true;
        shelf.receiveShadow = true;
        cab.add(shelf);

        const shelfLip = new THREE.Mesh(shelfLipGeo, cabDarkMat);
        shelfLip.position.set(0, sy, CAB_D / 2 - 0.003);
        cab.add(shelfLip);
      }

      // 5. Stepped Crown Cornice Trim along Top Edge
      const lowerCrown = new THREE.Mesh(
        new THREE.BoxGeometry(CAB_W + 0.028, CROWN_H * 0.45, CAB_D + 0.022),
        cabDarkMat
      );
      lowerCrown.position.set(0, CAB_H - CROWN_H + (CROWN_H * 0.45) / 2, 0.008);
      lowerCrown.castShadow = true;
      cab.add(lowerCrown);

      const upperCrown = new THREE.Mesh(
        new THREE.BoxGeometry(CAB_W + 0.06, CROWN_H * 0.55, CAB_D + 0.044),
        tableDarkWoodMat
      );
      upperCrown.position.set(0, CAB_H - (CROWN_H * 0.55) / 2, 0.014);
      upperCrown.castShadow = true;
      cab.add(upperCrown);

      return cab;
    };

    const cabinetGroup = createSixTierCabinet();
    cabinetGroup.position.set(CAB_X, 0, CAB_Z);
    roomGroup.add(cabinetGroup);

    const cabinetGroupLeft = createSixTierCabinet();
    cabinetGroupLeft.position.set(CAB2_X, 0, CAB_Z);

    // --- 4E-2. ACRYLIC DESK SIGN HOLDER ON 2ND TIER FROM TOP (左邊櫃子從上數下來第二層最左側壓克力立牌) ---
    const signCardTexture = textureLoader.load('/assets/umiri_desk_sign_tex.png');
    signCardTexture.colorSpace = THREE.SRGBColorSpace;
    signCardTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const acrylicSignGroup = new THREE.Group();
    const CARD_W = 0.288;
    const CARD_H = 0.204; // Exact 1600 : 1131 ratio matching source card artwork
    const ACRYLIC_W = CARD_W + 0.016; // Clear acrylic border around card
    const ACRYLIC_H = CARD_H + 0.016;
    const TILT_RAD = -0.19; // ~11 deg backward lean like L-shaped tabletop holder

    const acrylicClearMat = new THREE.MeshPhysicalMaterial({
      color: 0xeaf2ff,
      roughness: 0.08,
      metalness: 0.05,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
    });
    const acrylicRimMat = new THREE.MeshStandardMaterial({
      color: 0xdce6f5,
      roughness: 0.14,
      metalness: 0.12,
      transparent: true,
      opacity: 0.55,
    });

    // 1. Flat clear acrylic L-foot base plate resting flush on shelf surface Y = 0
    const footDepth = 0.082;
    const signBasePlate = new THREE.Mesh(
      new THREE.BoxGeometry(ACRYLIC_W, 0.005, footDepth),
      acrylicClearMat
    );
    signBasePlate.position.set(0, 0.0025, -footDepth * 0.34);
    acrylicSignGroup.add(signBasePlate);

    // Subtle crisp acrylic front foot rim bar
    const baseFrontEdge = new THREE.Mesh(
      new THREE.BoxGeometry(ACRYLIC_W, 0.005, 0.004),
      acrylicRimMat
    );
    baseFrontEdge.position.set(0, 0.0025, footDepth * 0.16);
    acrylicSignGroup.add(baseFrontEdge);

    // 2. Tilted acrylic sleeve + sandwiched cardstock backing + crisp printed front artwork
    const signTiltPivot = new THREE.Group();
    signTiltPivot.position.set(0, 0.005, 0.008);
    signTiltPivot.rotation.x = TILT_RAD;

    const signCenterY = ACRYLIC_H / 2;

    // Rear clear acrylic plate
    const acrylicBackSheet = new THREE.Mesh(
      new THREE.BoxGeometry(ACRYLIC_W, ACRYLIC_H, 0.003),
      acrylicClearMat
    );
    acrylicBackSheet.position.set(0, signCenterY, -0.003);
    signTiltPivot.add(acrylicBackSheet);

    // Opaque cardstock backing behind printed face
    const cardBacking = new THREE.Mesh(
      new THREE.PlaneGeometry(CARD_W, CARD_H),
      new THREE.MeshStandardMaterial({ color: 0xf4f1fa, roughness: 0.85, side: THREE.DoubleSide })
    );
    cardBacking.position.set(0, signCenterY, -0.0005);
    cardBacking.rotation.y = Math.PI;
    signTiltPivot.add(cardBacking);

    // Printed front card graphic
    const cardFront = new THREE.Mesh(
      new THREE.PlaneGeometry(CARD_W, CARD_H),
      new THREE.MeshStandardMaterial({
        map: signCardTexture,
        color: 0xffffff,
        roughness: 0.36,
        metalness: 0.02,
      })
    );
    cardFront.position.set(0, signCenterY, 0.0002);
    cardFront.castShadow = true;
    cardFront.receiveShadow = true;
    signTiltPivot.add(cardFront);

    // Front protective clear acrylic cover plate
    const acrylicFrontSheet = new THREE.Mesh(
      new THREE.BoxGeometry(ACRYLIC_W, ACRYLIC_H, 0.0025),
      acrylicClearMat
    );
    acrylicFrontSheet.position.set(0, signCenterY, 0.0028);
    signTiltPivot.add(acrylicFrontSheet);

    // Crisp outer beveled acrylic rim highlights (top, left, right) matching photo sleeve edges
    const topRimStrip = new THREE.Mesh(
      new THREE.BoxGeometry(ACRYLIC_W, 0.003, 0.008),
      acrylicRimMat
    );
    topRimStrip.position.set(0, ACRYLIC_H - 0.0015, 0);
    signTiltPivot.add(topRimStrip);

    const sideRimGeo = new THREE.BoxGeometry(0.003, ACRYLIC_H, 0.008);
    [-1, 1].forEach((side) => {
      const sideRim = new THREE.Mesh(sideRimGeo, acrylicRimMat);
      sideRim.position.set(side * (ACRYLIC_W / 2 - 0.0015), signCenterY, 0);
      signTiltPivot.add(sideRim);
    });

    acrylicSignGroup.add(signTiltPivot);

    // Position at far-left of 2nd shelf bay from the top (shelf index i = 4 top surface)
    const cabBodyH = CAB_H - PLINTH_H - CROWN_H;
    const cabTierPitch = (cabBodyH - SHELF_THICK) / 6;
    const secondFromTopFloorY = PLINTH_H + SHELF_THICK + 4 * cabTierPitch;
    const cabInnerLeftX = -(CAB_W - SIDE_THICK * 2) / 2;

    acrylicSignGroup.position.set(
      cabInnerLeftX + 0.022 + ACRYLIC_W / 2,
      secondFromTopFloorY,
      0.06
    );
    acrylicSignGroup.rotation.y = 0.05;
    cabinetGroupLeft.add(acrylicSignGroup);

    // --- 4E-2b. MAKAI RIRIMU PLUSHIE POUCH ON TEA TABLE BESIDE LAMP (茶几上檯燈旁邊正面朝上平放的魔界莉莉姆娃包 - 純形狀與實拍去背材質渲染) ---
    const ririmuFrontTex = textureLoader.load('/assets/ririmu_bag_front.png');
    ririmuFrontTex.colorSpace = THREE.SRGBColorSpace;
    ririmuFrontTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const ririmuBackTex = textureLoader.load('/assets/ririmu_bag_back.png');
    ririmuBackTex.colorSpace = THREE.SRGBColorSpace;
    ririmuBackTex.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const ririmuSideTex = textureLoader.load('/assets/ririmu_bag_side.png');
    ririmuSideTex.colorSpace = THREE.SRGBColorSpace;
    ririmuSideTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    ririmuSideTex.wrapS = THREE.RepeatWrapping;
    ririmuSideTex.wrapT = THREE.ClampToEdgeWrapping;

    const ririmuBagGroup = new THREE.Group();
    const POUCH_W = 0.122; // 12.2 cm wide
    const POUCH_H = 0.170; // 17.0 cm tall
    const POUCH_D = 0.064; // 6.4 cm thick
    const P_EXP = 2.38;
    const FRONT_PUFF = 0.0085;
    const BACK_PUFF = 0.0040;
    const N_SEG = 96;

    const evalSuperellipse = (theta: number, rScale: number): [number, number] => {
      const cx = -Math.sin(theta);
      const cy = Math.cos(theta);
      const denom = Math.pow(
        Math.pow(Math.abs(cx), P_EXP) + Math.pow(Math.abs(cy), P_EXP),
        1 / P_EXP
      ) || 1;
      const x = (cx / denom) * (POUCH_W / 2) * rScale;
      const y = (cy / denom) * (POUCH_H / 2) * rScale;
      return [x, y];
    };

    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const pushVert = (x: number, y: number, z: number, u: number, v: number): number => {
      const idx = positions.length / 3;
      positions.push(x, y, z);
      uvs.push(u, v);
      return idx;
    };

    const pouchGeo = new THREE.BufferGeometry();

    // 1. Group 0: Front Dome Cap (+Z -> Front Photo Texture)
    const frontStartIdx = indices.length;
    const frontCenterV = pushVert(0, 0, POUCH_D / 2 + FRONT_PUFF, 0.5, 0.5);
    const FRONT_RINGS = 10;
    const frontRings: number[][] = [];
    for (let rIdx = 1; rIdx <= FRONT_RINGS; rIdx++) {
      const r = rIdx / FRONT_RINGS;
      const bead = r > 0.92 ? 0.0022 * Math.sin((Math.PI * (r - 0.92)) / 0.08) : 0;
      const z = POUCH_D / 2 + FRONT_PUFF * (1 - r * r) + bead;
      const ring: number[] = [];
      for (let i = 0; i <= N_SEG; i++) {
        const theta = (i / N_SEG) * Math.PI * 2;
        const [x, y] = evalSuperellipse(theta, r);
        ring.push(pushVert(x, y, z, 0.5 + x / POUCH_W, 0.5 + y / POUCH_H));
      }
      frontRings.push(ring);
    }
    for (let i = 0; i < N_SEG; i++) {
      indices.push(frontCenterV, frontRings[0][i], frontRings[0][i + 1]);
    }
    for (let rIdx = 0; rIdx < FRONT_RINGS - 1; rIdx++) {
      for (let i = 0; i < N_SEG; i++) {
        const a = frontRings[rIdx][i];
        const b = frontRings[rIdx + 1][i];
        const c = frontRings[rIdx + 1][i + 1];
        const d = frontRings[rIdx][i + 1];
        indices.push(a, b, c, a, c, d);
      }
    }
    pouchGeo.addGroup(frontStartIdx, indices.length - frontStartIdx, 0);

    // 2. Group 1: Back Cushioned Cap (-Z -> Back Pom-Poms Photo Texture)
    const backStartIdx = indices.length;
    const backCenterV = pushVert(0, 0, -POUCH_D / 2 - BACK_PUFF, 0.5, 0.5);
    const BACK_RINGS = 8;
    const backRings: number[][] = [];
    for (let rIdx = 1; rIdx <= BACK_RINGS; rIdx++) {
      const r = rIdx / BACK_RINGS;
      const bead = r > 0.92 ? 0.0018 * Math.sin((Math.PI * (r - 0.92)) / 0.08) : 0;
      const z = -POUCH_D / 2 - BACK_PUFF * (1 - r * r) - bead;
      const ring: number[] = [];
      for (let i = 0; i <= N_SEG; i++) {
        const theta = (i / N_SEG) * Math.PI * 2;
        const [x, y] = evalSuperellipse(theta, r);
        ring.push(pushVert(x, y, z, 0.5 - x / POUCH_W, 0.5 + y / POUCH_H));
      }
      backRings.push(ring);
    }
    for (let i = 0; i < N_SEG; i++) {
      indices.push(backCenterV, backRings[0][i + 1], backRings[0][i]);
    }
    for (let rIdx = 0; rIdx < BACK_RINGS - 1; rIdx++) {
      for (let i = 0; i < N_SEG; i++) {
        const a = backRings[rIdx][i];
        const b = backRings[rIdx + 1][i];
        const c = backRings[rIdx + 1][i + 1];
        const d = backRings[rIdx][i + 1];
        indices.push(a, c, b, a, d, c);
      }
    }
    pouchGeo.addGroup(backStartIdx, indices.length - backStartIdx, 1);

    // 3. Group 2: Continuous 360° Curved Side Gusset Wall (Panoramic Zipper/Pom-Poms Photo Texture)
    const sideStartIdx = indices.length;
    const DEPTH_RINGS = 10;
    const sideRings: number[][] = [];
    for (let dIdx = 0; dIdx <= DEPTH_RINGS; dIdx++) {
      const s = dIdx / DEPTH_RINGS; // 0 = Back Rim, 1 = Front Rim
      const z = -POUCH_D / 2 + s * POUCH_D;
      const pillow = Math.sin(Math.PI * s) * 0.036;
      const bead =
        s < 0.12
          ? Math.sin((s / 0.12) * Math.PI) * 0.018
          : s > 0.88
            ? Math.sin(((s - 0.88) / 0.12) * Math.PI) * 0.018
            : 0;
      const rScale = 1.0 + pillow + bead;
      const ring: number[] = [];
      for (let i = 0; i <= N_SEG; i++) {
        const u = i / N_SEG;
        const theta = u * Math.PI * 2;
        const [x, y] = evalSuperellipse(theta, rScale);
        ring.push(pushVert(x, y, z, u, s));
      }
      sideRings.push(ring);
    }
    for (let dIdx = 0; dIdx < DEPTH_RINGS; dIdx++) {
      for (let i = 0; i < N_SEG; i++) {
        const a = sideRings[dIdx][i];
        const b = sideRings[dIdx][i + 1];
        const c = sideRings[dIdx + 1][i + 1];
        const d = sideRings[dIdx + 1][i];
        indices.push(a, b, c, a, c, d);
      }
    }
    pouchGeo.addGroup(sideStartIdx, indices.length - sideStartIdx, 2);

    pouchGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    pouchGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    pouchGeo.setIndex(indices);
    pouchGeo.computeVertexNormals();

    const pouchFrontMat = new THREE.MeshPhysicalMaterial({
      map: ririmuFrontTex,
      roughness: isLampOn ? 0.22 : 0.36,
      metalness: 0.02,
      clearcoat: isLampOn ? 0.96 : 0.32,
      clearcoatRoughness: isLampOn ? 0.08 : 0.24,
      specularIntensity: isLampOn ? 1.0 : 0.42,
    });
    const pouchBackMat = new THREE.MeshPhysicalMaterial({
      map: ririmuBackTex,
      roughness: 0.28,
      metalness: 0.02,
      clearcoat: 0.65,
      clearcoatRoughness: 0.16,
    });
    const pouchSideMat = new THREE.MeshPhysicalMaterial({
      map: ririmuSideTex,
      roughness: isLampOn ? 0.24 : 0.36,
      metalness: 0.03,
      clearcoat: isLampOn ? 0.85 : 0.32,
      clearcoatRoughness: isLampOn ? 0.10 : 0.24,
      specularIntensity: isLampOn ? 0.95 : 0.42,
    });
    pouchFrontMatRef.current = pouchFrontMat;
    pouchSideMatRef.current = pouchSideMat;

    // Prop up slightly & lean diagonally beside the table lamp (稍微立起來、斜靠在檯燈旁邊)
    const pouchLeanEuler = new THREE.Euler(-0.92, 0, 0.14, 'XYZ');
    const pouchLeanQuat = new THREE.Quaternion().setFromEuler(pouchLeanEuler);
    const tmpVert = new THREE.Vector3();
    let pouchMinY = Infinity;
    for (let vi = 0; vi < positions.length; vi += 3) {
      tmpVert.set(positions[vi], positions[vi + 1], positions[vi + 2]).applyQuaternion(pouchLeanQuat);
      if (tmpVert.y < pouchMinY) pouchMinY = tmpVert.y;
    }

    const pouchFlatPivot = new THREE.Group();
    pouchFlatPivot.quaternion.copy(pouchLeanQuat);
    pouchFlatPivot.position.y = -pouchMinY;
    ririmuBagGroup.add(pouchFlatPivot);

    const pouchMesh = new THREE.Mesh(pouchGeo, [pouchFrontMat, pouchBackMat, pouchSideMat]);
    pouchMesh.castShadow = true;
    pouchMesh.receiveShadow = true;
    pouchFlatPivot.add(pouchMesh);

    // Subtle physical metal D-ring + white spring ring resting naturally at the top edge
    const dRingMesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.007, 0.0015, 8, 18),
      new THREE.MeshStandardMaterial({ color: 0xd0d4dc, roughness: 0.24, metalness: 0.85 })
    );
    dRingMesh.position.set(0, POUCH_H / 2 + 0.004, -POUCH_D * 0.22);
    dRingMesh.rotation.x = 0.2;
    pouchFlatPivot.add(dRingMesh);

    const claspRingMesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.009, 0.0020, 8, 20),
      new THREE.MeshStandardMaterial({ color: 0xf6f5f8, roughness: 0.40, metalness: 0.04 })
    );
    claspRingMesh.position.set(-0.008, POUCH_H / 2 + 0.013, -POUCH_D * 0.36);
    claspRingMesh.rotation.set(0.18, 0.12, 0.25);
    pouchFlatPivot.add(claspRingMesh);

    // Grounded flush on tea table right beside the lamp base, angled toward the seated viewer
    ririmuBagGroup.position.set(-0.195, TEA_TABLE_HEIGHT, -0.080);
    ririmuBagGroup.rotation.y = 0.30;
    centerTeaGroup.add(ririmuBagGroup);

    // --- 4E-2B. 最愛チアモ (もあちあも) PHOTO-TEXTURED 3D VOLUMETRIC RECONSTRUCTION IN FRONT OF FAN ---
    const loadChiamoTex = (url: string) => {
      const t = textureLoader.load(url);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = renderer.capabilities.getMaxAnisotropy();
      return t;
    };

    const chiamoBaseTex = loadChiamoTex('/assets/chiamo_base.png');
    const chiamoFrontAlphaTex = loadChiamoTex('/assets/chiamo_front.png');
    const chiamoBackAlphaTex = loadChiamoTex('/assets/chiamo_back.png');
    const chiamoFrontRgbTex = loadChiamoTex('/assets/chiamo_front_rgb.jpg');
    const chiamoBackRgbTex = loadChiamoTex('/assets/chiamo_back_rgb.jpg');
    const chiamoLeftRgbTex = loadChiamoTex('/assets/chiamo_left_rgb.jpg');
    const chiamoRightRgbTex = loadChiamoTex('/assets/chiamo_right_rgb.jpg');

    const chiamoNewGroup = new THREE.Group();
    const CHIAMO_BASE_R = 0.068;

    // Helper: create 4-view directional photo-projection MeshPhysicalMaterial in unified figure coordinates
    const makeChiamoProjMaterial = (isHead: boolean) => {
      const mat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        roughness: isHead ? 0.38 : 0.32,
        metalness: 0.02,
        clearcoat: isHead ? 0.18 : 0.34,
        clearcoatRoughness: isHead ? 0.42 : 0.24,
      });
      mat.customProgramCacheKey = () => (isHead ? 'chiamo_4view_head_v2' : 'chiamo_4view_body_v2');
      mat.onBeforeCompile = (shader) => {
        shader.uniforms.uTexFront = { value: chiamoFrontRgbTex };
        shader.uniforms.uTexBack = { value: chiamoBackRgbTex };
        shader.uniforms.uTexLeft = { value: chiamoLeftRgbTex };
        shader.uniforms.uTexRight = { value: chiamoRightRgbTex };
        shader.uniforms.uIsHead = { value: isHead ? 1.0 : 0.0 };

        shader.vertexShader = shader.vertexShader
          .replace(
            '#include <common>',
            `#include <common>
            varying vec3 vFigPos;
            varying vec3 vFigNorm;`
          )
          .replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
            vFigPos = position;
            vFigNorm = normalize(normal);`
          );

        shader.fragmentShader = shader.fragmentShader
          .replace(
            '#include <common>',
            `#include <common>
            uniform sampler2D uTexFront;
            uniform sampler2D uTexBack;
            uniform sampler2D uTexLeft;
            uniform sampler2D uTexRight;
            uniform float uIsHead;
            varying vec3 vFigPos;
            varying vec3 vFigNorm;`
          )
          .replace(
            '#include <map_fragment>',
            `#include <map_fragment>
            vec3 fn = normalize(vFigNorm);
            float wF = pow(max(fn.z, 0.0), 2.8);
            float wB = pow(max(-fn.z, 0.0), 2.8);
            float wL = pow(max(fn.x, 0.0), 2.8);
            float wR = pow(max(-fn.x, 0.0), 2.8);
            if (uIsHead < 0.5 && vFigPos.y > 0.136 && vFigPos.y < 0.188 && vFigPos.z > 0.005 && fn.z > 0.02) {
              wF += 0.35 * smoothstep(0.02, 0.35, fn.z);
            }
            float fy = clamp((vFigPos.y - (-0.010)) / 0.280, 0.002, 0.998);
            vec2 uvF = vec2(clamp(0.5 + vFigPos.x / 0.210, 0.002, 0.998), fy);
            vec2 uvB = vec2(clamp(0.5 - vFigPos.x / 0.210, 0.002, 0.998), fy);
            vec2 uvL = vec2(clamp(0.5 - vFigPos.z / 0.210, 0.002, 0.998), fy);
            vec2 uvR = vec2(clamp(0.5 + vFigPos.z / 0.210, 0.002, 0.998), fy);
            vec3 colF = texture2D(uTexFront, uvF).rgb;
            vec3 colB = texture2D(uTexBack, uvB).rgb;
            vec3 colL = texture2D(uTexLeft, uvL).rgb;
            vec3 colR = texture2D(uTexRight, uvR).rgb;
            if (uIsHead > 0.5) {
              // Suppress projected front finger-claw purple tint on outer cheek side edges
              float dxH = abs(vFigPos.x - 0.0055);
              if (dxH > 0.0185 && vFigPos.y < 0.228 && colF.r > colF.g * 1.18 && colF.b > colF.g * 1.08) {
                colF = vec3(0.91, 0.69, 0.62);
              }
            }
            float wSum = max(wF + wB + wL + wR, 0.0001);
            diffuseColor.rgb = (colF * wF + colB * wB + colL * wL + colR * wR) / wSum;`
          );
      };
      return mat;
    };

    const chiamoBodyProjMat = makeChiamoProjMaterial(false);
    const chiamoHeadProjMat = makeChiamoProjMaterial(true);

    // Helper: bake transform directly into BufferGeometry so shader vFigPos/vFigNorm stay in exact figure coordinates
    const addBakedProjMesh = (geo: THREE.BufferGeometry, mat: THREE.Material, m?: THREE.Matrix4) => {
      if (m) geo.applyMatrix4(m);
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      chiamoNewGroup.add(mesh);
      return mesh;
    };

    const makeBakedCapsule = (
      p1: [number, number, number],
      p2: [number, number, number],
      rTop: number,
      rBot: number,
      sx = 1.0,
      sz = 1.0
    ) => {
      const v1 = new THREE.Vector3(...p1);
      const v2 = new THREE.Vector3(...p2);
      const dir = new THREE.Vector3().subVectors(v2, v1);
      const len = dir.length();
      const geo = new THREE.CylinderGeometry(rTop, rBot, len, 22, 4);
      geo.scale(sx, 1, sz);
      const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
      const center = new THREE.Vector3().addVectors(v1, v2).multiplyScalar(0.5);
      const mat4 = new THREE.Matrix4().compose(center, quat, new THREE.Vector3(1, 1, 1));
      return addBakedProjMesh(geo, chiamoBodyProjMat, mat4);
    };

    const makeBakedEllipsoid = (
      cx: number,
      cy: number,
      cz: number,
      rx: number,
      ry: number,
      rz: number,
      rotEuler: [number, number, number] = [0, 0, 0],
      mat: THREE.Material = chiamoBodyProjMat
    ) => {
      const geo = new THREE.SphereGeometry(1, 28, 22);
      const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotEuler));
      const mat4 = new THREE.Matrix4().compose(
        new THREE.Vector3(cx, cy, cz),
        quat,
        new THREE.Vector3(rx, ry, rz)
      );
      return addBakedProjMesh(geo, mat, mat4);
    };

    // 1. Glossy Hot-Magenta Acrylic Circular Base with Real 「もあちあも」 Photo Texture
    const chiamoBaseEdgeMat = new THREE.MeshPhysicalMaterial({
      color: 0xa40b4b,
      roughness: 0.12,
      metalness: 0.02,
      clearcoat: 0.95,
      clearcoatRoughness: 0.06,
      transparent: true,
      opacity: 0.90,
    });
    const chiamoBaseTopMat = new THREE.MeshPhysicalMaterial({
      map: chiamoBaseTex,
      roughness: 0.14,
      metalness: 0.02,
      clearcoat: 0.94,
      clearcoatRoughness: 0.08,
      transparent: true,
      alphaTest: 0.25,
    });
    const chiamoBaseCylinder = new THREE.Mesh(
      new THREE.CylinderGeometry(CHIAMO_BASE_R, CHIAMO_BASE_R + 0.001, 0.008, 64),
      chiamoBaseEdgeMat
    );
    chiamoBaseCylinder.position.y = 0.004;
    chiamoBaseCylinder.castShadow = true;
    chiamoBaseCylinder.receiveShadow = true;
    chiamoNewGroup.add(chiamoBaseCylinder);

    const chiamoBaseTop = new THREE.Mesh(new THREE.CircleGeometry(CHIAMO_BASE_R - 0.0003, 64), chiamoBaseTopMat);
    chiamoBaseTop.rotation.x = -Math.PI / 2;
    chiamoBaseTop.position.y = 0.0082;
    chiamoBaseTop.receiveShadow = true;
    chiamoNewGroup.add(chiamoBaseTop);

    // 2. Clear Acrylic Rear Heel Support Pillar & Translucent Heart Tail
    const chiamoAcrylicClearMat = new THREE.MeshPhysicalMaterial({
      color: 0xf0f4ff,
      roughness: 0.10,
      metalness: 0.02,
      clearcoat: 0.94,
      transparent: true,
      opacity: 0.62,
    });
    const clearPeg = new THREE.Mesh(new THREE.BoxGeometry(0.011, 0.028, 0.013), chiamoAcrylicClearMat);
    clearPeg.position.set(0.002, 0.022, -0.025);
    clearPeg.rotation.x = -0.06;
    chiamoNewGroup.add(clearPeg);

    const tailCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.004, 0.114, -0.015),
      new THREE.Vector3(0.014, 0.106, -0.026),
      new THREE.Vector3(0.022, 0.098, -0.032),
      new THREE.Vector3(0.018, 0.091, -0.028),
    ]);
    const tailStem = new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 18, 0.0015, 8, false), chiamoAcrylicClearMat);
    chiamoNewGroup.add(tailStem);
    const tailHeart = new THREE.Mesh(new THREE.SphereGeometry(0.0038, 10, 10), chiamoAcrylicClearMat);
    tailHeart.scale.set(1.2, 1.0, 0.65);
    tailHeart.position.set(0.018, 0.090, -0.028);
    chiamoNewGroup.add(tailHeart);

    // 3. Signature Large Tilted Glossy Hot-Pink Hoop Ring (looping open-air behind thighs -> front ankles)
    const chiamoHoopPinkMat = new THREE.MeshPhysicalMaterial({
      color: 0xdc377e,
      roughness: 0.22,
      metalness: 0.04,
      clearcoat: 0.80,
    });
    const hoopRing = new THREE.Mesh(new THREE.TorusGeometry(0.053, 0.0019, 14, 64), chiamoHoopPinkMat);
    hoopRing.position.set(-0.005, 0.072, -0.002);
    hoopRing.rotation.set(-0.68, 0.05, -0.06);
    hoopRing.castShadow = true;
    chiamoNewGroup.add(hoopRing);

    // 4. Calibrated Sculpted 3D Legs + Sneakers (exact pixel-scanned positions, open air gap preserved)
    // Standing Right Leg (-X viewer's left)
    makeBakedEllipsoid(-0.001, 0.016, 0.006, 0.0105, 0.0085, 0.0175, [0, 0.14, 0]); // front sneaker
    makeBakedCapsule([-0.007, 0.021, 0.004], [-0.010, 0.058, 0.003], 0.0110, 0.0135); // leg warmer
    makeBakedCapsule([-0.010, 0.056, 0.003], [-0.011, 0.076, 0.008], 0.0102, 0.0094); // knee calf
    makeBakedEllipsoid(-0.011, 0.076, 0.008, 0.0102, 0.0102, 0.0102); // knee cap
    makeBakedCapsule([-0.011, 0.076, 0.008], [-0.010, 0.114, 0.001], 0.0138, 0.0105); // thigh

    // Raised Bent Left Leg (+X viewer's right)
    makeBakedCapsule([0.016, 0.114, 0.002], [0.024, 0.076, 0.014], 0.0138, 0.0105); // thigh
    makeBakedEllipsoid(0.024, 0.076, 0.014, 0.0106, 0.0106, 0.0106); // bent knee
    makeBakedCapsule([0.024, 0.076, 0.014], [0.005, 0.044, -0.016], 0.0102, 0.0128); // lower leg & warmer
    makeBakedEllipsoid(0.002, 0.036, -0.022, 0.0100, 0.0085, 0.0165, [0.82, -0.14, 0]); // raised sneaker

    // 5. Continuous Contoured 3D Torso, Skirt, Waist, Bust & Sailor Collar Loft (mapped to photo silhouettes)
    const torsoSlices: Array<{ y: number; cx: number; cz: number; rx: number; rz: number }> = [
      { y: 0.110, cx: 0.004, cz: 0.002, rx: 0.0265, rz: 0.0210 }, // skirt frill hem
      { y: 0.123, cx: 0.005, cz: 0.002, rx: 0.0255, rz: 0.0215 }, // belt & jacket bottom
      { y: 0.136, cx: 0.005, cz: 0.002, rx: 0.0230, rz: 0.0205 }, // waist
      { y: 0.150, cx: 0.005, cz: 0.004, rx: 0.0235, rz: 0.0215 }, // mid torso
      { y: 0.165, cx: 0.005, cz: 0.010, rx: 0.0250, rz: 0.0232 }, // bust fullness
      { y: 0.180, cx: 0.005, cz: 0.003, rx: 0.0265, rz: 0.0200 }, // sailor collar
      { y: 0.190, cx: 0.005, cz: 0.002, rx: 0.0185, rz: 0.0155 }, // shoulders top
      { y: 0.197, cx: 0.005, cz: 0.002, rx: 0.0085, rz: 0.0085 }, // neck
    ];
    const T_SEG = 32;
    const tPos: number[] = [];
    const tIdx: number[] = [];
    const tRings: number[][] = [];
    torsoSlices.forEach((sl) => {
      const ring: number[] = [];
      for (let i = 0; i <= T_SEG; i++) {
        const a = (i / T_SEG) * Math.PI * 2;
        const idx = tPos.length / 3;
        tPos.push(sl.cx + Math.cos(a) * sl.rx, sl.y, sl.cz + Math.sin(a) * sl.rz);
        ring.push(idx);
      }
      tRings.push(ring);
    });
    for (let r = 0; r < tRings.length - 1; r++) {
      for (let i = 0; i < T_SEG; i++) {
        const a = tRings[r][i], b = tRings[r][i + 1];
        const c = tRings[r + 1][i + 1], d = tRings[r + 1][i];
        tIdx.push(a, c, b, a, d, c);
      }
    }
    const botCapIdx = tPos.length / 3;
    tPos.push(0.004, 0.110, 0.002);
    for (let i = 0; i < T_SEG; i++) tIdx.push(botCapIdx, tRings[0][i], tRings[0][i + 1]);

    const torsoLoftGeo = new THREE.BufferGeometry();
    torsoLoftGeo.setAttribute('position', new THREE.Float32BufferAttribute(tPos, 3));
    torsoLoftGeo.setIndex(tIdx);
    addBakedProjMesh(torsoLoftGeo, chiamoBodyProjMat);

    // Smoothly contoured 3D bust relief domes so sailor bow & chest silhouette catch authentic light without steep underside shadow seams
    makeBakedEllipsoid(-0.004, 0.165, 0.0175, 0.0122, 0.0115, 0.0092);
    makeBakedEllipsoid(0.014, 0.165, 0.0175, 0.0122, 0.0115, 0.0092);

    // 6. Symmetrical Raised Puffy Hoodie Sleeves (calibrated CatmullRomCurve3 tubes)
    const rightSleeveCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.018, 0.181, 0.0),
      new THREE.Vector3(-0.044, 0.184, 0.002),
      new THREE.Vector3(-0.049, 0.205, 0.009),
      new THREE.Vector3(-0.036, 0.214, 0.017),
    ]);
    addBakedProjMesh(new THREE.TubeGeometry(rightSleeveCurve, 22, 0.0145, 16, false), chiamoBodyProjMat);
    makeBakedEllipsoid(-0.047, 0.194, 0.004, 0.0155, 0.0165, 0.0155);

    const leftSleeveCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.028, 0.182, 0.0),
      new THREE.Vector3(0.055, 0.187, 0.002),
      new THREE.Vector3(0.059, 0.207, 0.009),
      new THREE.Vector3(0.045, 0.215, 0.017),
    ]);
    addBakedProjMesh(new THREE.TubeGeometry(leftSleeveCurve, 22, 0.0145, 16, false), chiamoBodyProjMat);
    makeBakedEllipsoid(0.057, 0.196, 0.004, 0.0155, 0.0165, 0.0155);

    // Left-shoulder butterfly badge + yellow pom-pom subtle 3D projection anchor
    makeBakedEllipsoid(0.040, 0.173, 0.014, 0.0085, 0.0085, 0.0065, [0, 0.65, 0]);

    // 7. Contoured Head Sphere & Twin High Looped Hair Buns (mapped with 4-view real photos)
    makeBakedEllipsoid(0.0055, 0.214, 0.003, 0.0255, 0.0245, 0.0245, [0.06, 0, -0.05], chiamoHeadProjMat);
    makeBakedEllipsoid(-0.032, 0.236, -0.005, 0.0165, 0.0145, 0.0135, [0, 0.15, 0.35], chiamoBodyProjMat);
    makeBakedEllipsoid(0.038, 0.242, -0.006, 0.0165, 0.0145, 0.0135, [0, -0.15, -0.35], chiamoBodyProjMat);

    // 8. Sculpted Back-Hair Curtain + Flared Spiral Curls (solid back core + thick 3D cutout curl wings)
    makeBakedEllipsoid(0.005, 0.172, -0.025, 0.0195, 0.042, 0.0105, [0.10, 0, 0], chiamoBodyProjMat);

    // Helper: create curved multi-layer 3D photo-cutout relief with exact unified world UV mapping
    const chiamoCutoutFrontMat = new THREE.MeshPhysicalMaterial({
      map: chiamoFrontAlphaTex,
      roughness: 0.32,
      metalness: 0.04,
      clearcoat: 0.36,
      alphaTest: 0.38,
      side: THREE.DoubleSide,
    });
    const chiamoCutoutBackMat = new THREE.MeshPhysicalMaterial({
      map: chiamoBackAlphaTex,
      roughness: 0.32,
      metalness: 0.04,
      clearcoat: 0.36,
      alphaTest: 0.38,
      side: THREE.DoubleSide,
    });

    const addCurvedCutoutRelief = (
      xMin: number,
      xMax: number,
      yMin: number,
      yMax: number,
      zCenter: number,
      curveZ: number,
      thickness: number,
      yaw: number,
      useFrontAlpha: boolean
    ) => {
      const segX = 12;
      const segY = 12;
      const geo = new THREE.PlaneGeometry(xMax - xMin, yMax - yMin, segX, segY);
      const posAttr = geo.attributes.position as THREE.BufferAttribute;
      const uvAttr = geo.attributes.uv as THREE.BufferAttribute;
      const cx = (xMin + xMax) / 2;
      const cy = (yMin + yMax) / 2;
      for (let i = 0; i < posAttr.count; i++) {
        const lx = posAttr.getX(i);
        const ly = posAttr.getY(i);
        const nx = lx / ((xMax - xMin) / 2);
        const wx = cx + lx;
        const wy = cy + ly;
        const dz = (1 - nx * nx) * curveZ;
        posAttr.setXYZ(i, lx, ly, dz);
        const fy = (wy - -0.010) / 0.280;
        const u = useFrontAlpha ? 0.5 + wx / 0.210 : 0.5 - wx / 0.210;
        uvAttr.setXY(i, u, fy);
      }
      geo.computeVertexNormals();

      const grp = new THREE.Group();
      grp.position.set(cx, cy, zCenter);
      grp.rotation.y = yaw;
      [-thickness / 2, 0, thickness / 2].forEach((oz, li) => {
        const mat = li === 0 && !useFrontAlpha ? chiamoCutoutBackMat : useFrontAlpha ? chiamoCutoutFrontMat : chiamoCutoutBackMat;
        const layer = new THREE.Mesh(geo, mat);
        layer.position.z = oz;
        layer.castShadow = li === 1;
        grp.add(layer);
      });
      chiamoNewGroup.add(grp);
    };

    // Twin Splayed Purple-Claw Hands & Pink Wrist Ribbons framing cheeks (exact hand regions)
    addCurvedCutoutRelief(-0.044, -0.012, 0.186, 0.234, 0.025, 0.004, 0.0028, 0.22, true);
    addCurvedCutoutRelief(0.019, 0.050, 0.186, 0.234, 0.025, 0.004, 0.0028, -0.22, true);

    // Dual Dark-Navy Double-Wing Butterfly Hair Clips on Crown
    addCurvedCutoutRelief(-0.028, -0.006, 0.224, 0.266, 0.002, 0.003, 0.0032, 0.35, true);
    addCurvedCutoutRelief(0.008, 0.036, 0.224, 0.266, 0.001, 0.003, 0.0032, -0.35, true);

    // Flared Outward-Curled Back Hair Spirals (left & right hip wings from real back hair photo!)
    addCurvedCutoutRelief(-0.056, -0.014, 0.122, 0.185, -0.026, -0.005, 0.0055, -0.24, false);
    addCurvedCutoutRelief(0.018, 0.060, 0.122, 0.185, -0.026, -0.005, 0.0055, 0.24, false);

    // Placed on the far-left of the 2nd tier from the top of the right-side cabinet (右邊櫃子第二層最左邊)
    chiamoNewGroup.position.set(
      cabInnerLeftX + 0.025 + CHIAMO_BASE_R,
      secondFromTopFloorY,
      0.065
    );
    chiamoNewGroup.rotation.y = -0.06;
    cabinetGroup.add(chiamoNewGroup);

    roomGroup.add(cabinetGroupLeft);

    // --- 4E-3. WHITE ILLUSTRATED CARDBOARD BOX ON RIGHT CABINET BOTTOM-RIGHT (右邊櫃子最下面的最右邊白色紙箱) ---
    const whiteBoxFrontTexture = textureLoader.load('/assets/white_box_front.png');
    whiteBoxFrontTexture.colorSpace = THREE.SRGBColorSpace;
    whiteBoxFrontTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const createWhiteBoxTopTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (!ctx) return new THREE.Texture();

      // Matte off-white corrugated cardboard top
      ctx.fillStyle = '#e7e6e1';
      ctx.fillRect(0, 0, 512, 512);

      // Subtle corrugated paper flute grain
      for (let y = 0; y < 512; y += 6) {
        ctx.fillStyle = y % 12 === 0 ? 'rgba(0,0,0,0.018)' : 'rgba(255,255,255,0.18)';
        ctx.fillRect(0, y, 512, 2);
      }

      // Faint cardboard top lid flap center crease & side edge seams
      ctx.strokeStyle = 'rgba(70, 66, 60, 0.24)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(10, 256);
      ctx.lineTo(502, 256);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(70, 66, 60, 0.16)';
      ctx.lineWidth = 2;
      ctx.strokeRect(8, 8, 496, 496);

      // Helper to stamp a black cat paw print motif on top lid (back-left area matching reference photo)
      const drawPawStamp = (cx: number, cy: number, scale: number, angle: number) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.scale(scale, scale);
        ctx.fillStyle = '#181818';

        // Main heart/trilobe pad
        ctx.beginPath();
        ctx.ellipse(0, 12, 22, 16, 0, 0, Math.PI * 2);
        ctx.fill();

        // Four toe beans
        const toes: Array<[number, number, number, number, number]> = [
          [-26, -12, 9, 12, -0.35],
          [-9, -24, 9, 13, -0.1],
          [10, -24, 9, 13, 0.1],
          [26, -12, 9, 12, 0.35],
        ];
        toes.forEach(([tx, ty, rx, ry, rot]) => {
          ctx.beginPath();
          ctx.ellipse(tx, ty, rx, ry, rot, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      };

      drawPawStamp(128, 128, 0.72, -0.22);
      drawPawStamp(218, 108, 0.68, 0.15);

      const tex = new THREE.CanvasTexture(canvas);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      return tex;
    };

    const whiteBoxTopTexture = createWhiteBoxTopTexture();

    const whiteBoxGroup = new THREE.Group();
    const BOX_W = 0.455;
    const BOX_H = 0.246;
    const BOX_D = 0.295;

    const boxCardboardMat = new THREE.MeshStandardMaterial({
      color: 0xe6e5df,
      roughness: 0.88,
      metalness: 0.01,
    });
    const boxSeamEdgeMat = new THREE.MeshStandardMaterial({
      color: 0xd5d3cb,
      roughness: 0.92,
      metalness: 0.01,
    });
    const boxFrontPrintMat = new THREE.MeshStandardMaterial({
      map: whiteBoxFrontTexture,
      color: 0xffffff,
      roughness: 0.72,
      metalness: 0.02,
    });
    const boxTopPrintMat = new THREE.MeshStandardMaterial({
      map: whiteBoxTopTexture,
      color: 0xffffff,
      roughness: 0.84,
      metalness: 0.01,
    });

    // 1. Main white corrugated box body (bottom-center grounded pivot)
    const boxCoreMesh = new THREE.Mesh(
      new THREE.BoxGeometry(BOX_W, BOX_H - 0.012, BOX_D),
      boxCardboardMat
    );
    boxCoreMesh.position.set(0, (BOX_H - 0.012) / 2, 0);
    boxCoreMesh.castShadow = true;
    boxCoreMesh.receiveShadow = true;
    whiteBoxGroup.add(boxCoreMesh);

    // 2. Printed illustrated front face panel (polygonOffset prevents z-fighting)
    const boxFrontPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(BOX_W - 0.004, BOX_H - 0.014),
      boxFrontPrintMat
    );
    boxFrontPlane.position.set(0, (BOX_H - 0.012) / 2, BOX_D / 2 + 0.0008);
    boxFrontPlane.receiveShadow = true;
    whiteBoxGroup.add(boxFrontPlane);

    // 3. Top hinged lid overhang slab + stamped corrugated top texture
    const boxLidSlab = new THREE.Mesh(
      new THREE.BoxGeometry(BOX_W + 0.004, 0.012, BOX_D + 0.004),
      boxCardboardMat
    );
    boxLidSlab.position.set(0, BOX_H - 0.006, 0);
    boxLidSlab.castShadow = true;
    boxLidSlab.receiveShadow = true;
    whiteBoxGroup.add(boxLidSlab);

    const boxTopPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(BOX_W + 0.002, BOX_D + 0.002),
      boxTopPrintMat
    );
    boxTopPlane.rotation.x = -Math.PI / 2;
    boxTopPlane.position.set(0, BOX_H + 0.0006, 0);
    boxTopPlane.receiveShadow = true;
    whiteBoxGroup.add(boxTopPlane);

    // 4. Subtle dark crease line along top lid tuck seam + corner fold ribs
    const lidCreaseBar = new THREE.Mesh(
      new THREE.BoxGeometry(BOX_W + 0.005, 0.0025, 0.003),
      boxSeamEdgeMat
    );
    lidCreaseBar.position.set(0, BOX_H - 0.012, BOX_D / 2 + 0.0015);
    whiteBoxGroup.add(lidCreaseBar);

    const cabInnerRightX = (CAB_W - SIDE_THICK * 2) / 2;
    const bottomShelfFloorY = PLINTH_H + SHELF_THICK;
    whiteBoxGroup.position.set(
      cabInnerRightX - 0.02 - BOX_W / 2,
      bottomShelfFloorY,
      0.045
    );
    whiteBoxGroup.rotation.y = -0.025;
    cabinetGroup.add(whiteBoxGroup);

    // Bright warm fill light highlighting both 6-tier dark wood cabinets
    const cabinetAccentLight = new THREE.PointLight(0xffebd0, 2.6, 7.5, 1.0);
    cabinetAccentLight.position.set((CAB_X + CAB2_X) / 2, 2.28, CAB_Z + 1.15);
    roomGroup.add(cabinetAccentLight);

    scene.add(roomGroup);

    // --- 4C. ENLARGED BLUE-VIOLET HANDHELD GAME CONSOLE (放大版 16:9 螢幕藍紫色掌上型遊戲機) ---
    const createConsoleScreenTexture = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 360; // Exact 16:9 aspect ratio
      const ctx = canvas.getContext('2d');
      if (!ctx) return new THREE.Texture();

      // Match original desktop #001B3D dark ocean backdrop seamlessly
      ctx.fillStyle = '#001B3D';
      ctx.fillRect(0, 0, 640, 360);

      // Subtle retro grid matching desktop landing
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 1;
      for (let gx = 0; gx < 640; gx += 20) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, 360);
        ctx.stroke();
      }
      for (let gy = 0; gy < 360; gy += 20) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(640, gy);
        ctx.stroke();
      }

      // Scattered colorful tetris accent blocks
      const previewBlocks = [
        [44, 60, '#FF007F'], [96, 260, '#00E5FF'], [540, 80, '#FFD700'],
        [560, 280, '#A855F7'], [120, 40, '#4ADE80'], [490, 220, '#F97316'],
      ] as const;
      previewBlocks.forEach(([bx, by, col]) => {
        ctx.fillStyle = col;
        ctx.fillRect(bx, by, 18, 18);
      });

      // Center title & Game Start prompt preview
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px sans-serif';
      ctx.fillText('保持可愛漫研社', 320, 154);

      ctx.strokeStyle = '#0077be';
      ctx.lineWidth = 3;
      ctx.strokeRect(225, 200, 190, 44);
      ctx.fillStyle = '#0077be';
      ctx.font = 'bold 18px monospace';
      ctx.fillText('GAME START', 320, 228);

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    };

    const consoleScreenTex = createConsoleScreenTexture();

    const consoleGroup = new THREE.Group();
    const CONSOLE_W = 0.364;
    const CONSOLE_H = 0.162;
    const CONSOLE_R = 0.026;
    const CONSOLE_D = 0.019;

    // Rounded handheld body shape
    const bodyShape = new THREE.Shape();
    const hw = CONSOLE_W / 2;
    const hh = CONSOLE_H / 2;
    bodyShape.moveTo(-hw + CONSOLE_R, -hh);
    bodyShape.lineTo(hw - CONSOLE_R, -hh);
    bodyShape.quadraticCurveTo(hw, -hh, hw, -hh + CONSOLE_R);
    bodyShape.lineTo(hw, hh - CONSOLE_R);
    bodyShape.quadraticCurveTo(hw, hh, hw - CONSOLE_R, hh);
    bodyShape.lineTo(-hw + CONSOLE_R, hh);
    bodyShape.quadraticCurveTo(-hw, hh, -hw, hh - CONSOLE_R);
    bodyShape.lineTo(-hw, -hh + CONSOLE_R);
    bodyShape.quadraticCurveTo(-hw, -hh, -hw + CONSOLE_R, -hh);

    const bodyGeo = new THREE.ExtrudeGeometry(bodyShape, {
      depth: CONSOLE_D,
      bevelEnabled: true,
      bevelThickness: 0.003,
      bevelSize: 0.003,
      bevelSegments: 4,
    });
    bodyGeo.translate(0, 0, -CONSOLE_D / 2);

    // Vivid Blue-Violet Chassis Material (藍紫色機身)
    const consoleBodyMat = new THREE.MeshStandardMaterial({
      color: 0x5c4be8,
      roughness: 0.34,
      metalness: 0.18,
      emissive: 0x1b144a,
      emissiveIntensity: 0.30,
    });
    const consoleBody = new THREE.Mesh(bodyGeo, consoleBodyMat);
    consoleBody.castShadow = true;
    consoleBody.receiveShadow = true;
    consoleGroup.add(consoleBody);

    // Dark Slate-Indigo Bezel around Enlarged 16:9 Screen
    const SCREEN_W = 0.256;
    const SCREEN_H = 0.144; // Exact 16:9 ratio (0.256 / 0.144 = 16/9)
    const bezelGeo = new THREE.BoxGeometry(SCREEN_W + 0.008, SCREEN_H + 0.008, 0.003);
    const bezelMat = new THREE.MeshStandardMaterial({
      color: 0x110e1c,
      roughness: 0.18,
      metalness: 0.25,
    });
    const bezelMesh = new THREE.Mesh(bezelGeo, bezelMat);
    bezelMesh.position.set(0, 0, CONSOLE_D / 2 + 0.0026);
    consoleGroup.add(bezelMesh);

    // Self-lit 16:9 LCD/OLED Display Screen
    const screenGeo = new THREE.PlaneGeometry(SCREEN_W, SCREEN_H);
    const screenMat = new THREE.MeshStandardMaterial({
      map: consoleScreenTex,
      emissiveMap: consoleScreenTex,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.85,
      roughness: 0.15,
      metalness: 0.05,
    });
    const screenMesh = new THREE.Mesh(screenGeo, screenMat);
    screenMesh.position.set(0, 0, CONSOLE_D / 2 + 0.0046);
    consoleGroup.add(screenMesh);

    // Deep Indigo Trim Material for sticks, D-pad & shoulder triggers
    const consoleTrimMat = new THREE.MeshStandardMaterial({
      color: 0x261f47,
      roughness: 0.4,
      metalness: 0.2,
    });
    const stickRingMat = new THREE.MeshStandardMaterial({
      color: 0x8273ff,
      roughness: 0.3,
    });
    const dpadArrowMat = new THREE.MeshBasicMaterial({ color: 0xd8b4fe });

    const CTRL_X = 0.157;
    const UPPER_CTRL_Y = 0.022;
    const STICK_Y = -0.036;

    // Left Tactile D-Pad Cross Group (controls page scroll UP / DOWN)
    const dpadGroup = new THREE.Group();
    const dpadRestZ = CONSOLE_D / 2 + 0.0042;
    dpadGroup.position.set(-CTRL_X, UPPER_CTRL_Y, dpadRestZ);
    dpadRestZRef.current = dpadRestZ;

    const dpadDiscGeo = new THREE.CylinderGeometry(0.020, 0.021, 0.002, 24);
    dpadDiscGeo.rotateX(Math.PI / 2);
    const dpadDisc = new THREE.Mesh(
      dpadDiscGeo,
      new THREE.MeshStandardMaterial({ color: 0x181330, roughness: 0.5 })
    );
    dpadDisc.position.z = -0.0012;
    dpadGroup.add(dpadDisc);

    const dpadH = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.011, 0.0048), consoleTrimMat);
    dpadGroup.add(dpadH);

    const dpadV = new THREE.Mesh(new THREE.BoxGeometry(0.011, 0.034, 0.0048), consoleTrimMat);
    dpadGroup.add(dpadV);

    // Subtle ▲ / ▼ directional pips on D-Pad vertical arms
    const arrowGeo = new THREE.ConeGeometry(0.0032, 0.0048, 3);
    const arrowUp = new THREE.Mesh(arrowGeo, dpadArrowMat);
    arrowUp.position.set(0, 0.0125, 0.0028);
    dpadGroup.add(arrowUp);

    const arrowDown = new THREE.Mesh(arrowGeo, dpadArrowMat);
    arrowDown.rotation.z = Math.PI;
    arrowDown.position.set(0, -0.0125, 0.0028);
    dpadGroup.add(arrowDown);

    dpadGroupRef.current = dpadGroup;
    consoleGroup.add(dpadGroup);

    // Generous invisible touch hitboxes for D-Pad UP & DOWN
    const dpadUpHitbox = new THREE.Mesh(
      new THREE.BoxGeometry(0.048, 0.042, 0.030),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    dpadUpHitbox.position.set(-CTRL_X, UPPER_CTRL_Y + 0.021, CONSOLE_D / 2 + 0.006);
    dpadUpHitbox.name = 'dpad_up_hitbox';
    dpadUpHitboxRef.current = dpadUpHitbox;
    consoleGroup.add(dpadUpHitbox);

    const dpadDownHitbox = new THREE.Mesh(
      new THREE.BoxGeometry(0.048, 0.042, 0.030),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    dpadDownHitbox.position.set(-CTRL_X, UPPER_CTRL_Y - 0.021, CONSOLE_D / 2 + 0.006);
    dpadDownHitbox.name = 'dpad_down_hitbox';
    dpadDownHitboxRef.current = dpadDownHitbox;
    consoleGroup.add(dpadDownHitbox);

    // Left & Right Analog Thumbsticks
    const stickGeo = new THREE.CylinderGeometry(0.0115, 0.0115, 0.0055, 18);
    stickGeo.rotateX(Math.PI / 2);
    const ringGeo = new THREE.TorusGeometry(0.0124, 0.0016, 10, 20);

    const leftStick = new THREE.Mesh(stickGeo, consoleTrimMat);
    leftStick.position.set(-CTRL_X, STICK_Y, CONSOLE_D / 2 + 0.0044);
    consoleGroup.add(leftStick);

    const leftRing = new THREE.Mesh(ringGeo, stickRingMat);
    leftRing.position.set(-CTRL_X, STICK_Y, CONSOLE_D / 2 + 0.003);
    consoleGroup.add(leftRing);

    const rightStick = new THREE.Mesh(stickGeo, consoleTrimMat);
    rightStick.position.set(CTRL_X, STICK_Y, CONSOLE_D / 2 + 0.0044);
    consoleGroup.add(rightStick);

    const rightRing = new THREE.Mesh(ringGeo, stickRingMat);
    rightRing.position.set(CTRL_X, STICK_Y, CONSOLE_D / 2 + 0.003);
    consoleGroup.add(rightRing);

    // Right 4 Face Buttons (ABXY - tapping any pulls the hemp rope)
    const btnGeo = new THREE.CylinderGeometry(0.0066, 0.0066, 0.0048, 16);
    btnGeo.rotateX(Math.PI / 2);
    const btnRestZ = CONSOLE_D / 2 + 0.0044;
    faceButtonRestZRef.current = btnRestZ;
    faceButtonMeshesRef.current = [];
    const faceButtons = [
      { dx: 0, dy: 0.0145, color: 0x93c5fd },   // X
      { dx: 0, dy: -0.0145, color: 0xfde68a },  // B
      { dx: -0.0145, dy: 0, color: 0xc4b5fd },  // Y
      { dx: 0.0145, dy: 0, color: 0xf472b6 },   // A
    ];
    faceButtons.forEach((b, idx) => {
      const btn = new THREE.Mesh(
        btnGeo,
        new THREE.MeshStandardMaterial({ color: b.color, roughness: 0.28, emissive: b.color, emissiveIntensity: 0.28 })
      );
      btn.position.set(CTRL_X + b.dx, UPPER_CTRL_Y + b.dy, btnRestZ);
      btn.name = `abxy_btn_${idx}`;
      faceButtonMeshesRef.current.push(btn);
      consoleGroup.add(btn);
    });

    // Generous invisible touch hitbox covering all 4 right-side ABXY buttons
    const abxyHitbox = new THREE.Mesh(
      new THREE.BoxGeometry(0.052, 0.068, 0.030),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    abxyHitbox.position.set(CTRL_X, UPPER_CTRL_Y, CONSOLE_D / 2 + 0.006);
    abxyHitbox.name = 'abxy_hitbox';
    abxyHitboxRef.current = abxyHitbox;
    consoleGroup.add(abxyHitbox);

    // Power LED Indicator
    const ledMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.003, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0x6ee7b7 })
    );
    ledMesh.position.set(0.145, 0.064, CONSOLE_D / 2 + 0.0032);
    consoleGroup.add(ledMesh);

    // Shoulder Triggers L & R along top edge
    const shoulderGeo = new THREE.BoxGeometry(0.056, 0.010, 0.014);
    const shoulderL = new THREE.Mesh(shoulderGeo, consoleTrimMat);
    shoulderL.position.set(-0.132, hh + 0.001, 0);
    consoleGroup.add(shoulderL);

    const shoulderR = new THREE.Mesh(shoulderGeo, consoleTrimMat);
    shoulderR.position.set(0.132, hh + 0.001, 0);
    consoleGroup.add(shoulderR);

    // Dedicated invisible interaction hitbox for easy mobile tap/click when on table
    const consoleHitbox = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.22, 0.09),
      new THREE.MeshBasicMaterial({ visible: false })
    );
    consoleHitbox.name = 'console_hitbox';
    consoleGroup.add(consoleHitbox);

    // Resting world pose on the round wooden tea table (south-west front of table)
    const consoleTablePos = new THREE.Vector3(-0.20, TEA_TABLE_HEIGHT + 0.015, 0.36);
    const consoleTableQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(-Math.PI / 2, 0.20, 0, 'YXZ')
    );

    consoleGroup.position.copy(consoleTablePos);
    consoleGroup.quaternion.copy(consoleTableQuat);
    consoleGroup.scale.setScalar(1.0);

    consoleGroupRef.current = consoleGroup;
    consoleSceneRef.current = consoleGroup;
    scene.add(consoleGroup);

    // --- 5. BRIGHT WARM LIGHTING RIG (MAIN LOBBY ROOM) ---
    const ambientLight = new THREE.AmbientLight(0xffecd6, 1.55);
    ambientLightRef.current = ambientLight;
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xfff5ea, 0x6e5a47, 0.95);
    hemiLightRef.current = hemiLight;
    scene.add(hemiLight);

    // Ceiling Main Downlight (10m x 7m bright room coverage)
    const ceilingDownlight = new THREE.PointLight(0xffebd2, 4.6, 28, 0.95);
    ceilingDownlight.position.set(0, ROOM_HEIGHT - 0.25, 0);
    ceilingDownlight.castShadow = true;
    ceilingDownlight.shadow.mapSize.width = 1024;
    ceilingDownlight.shadow.mapSize.height = 1024;
    ceilingDownlight.shadow.bias = -0.001;
    roomGroup.add(ceilingDownlight);

    // Wooden Ceiling Fixture
    const fixGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.05, 24);
    const fixMat = new THREE.MeshStandardMaterial({ color: 0x22130a, roughness: 0.5 });
    const fixture = new THREE.Mesh(fixGeo, fixMat);
    fixture.position.set(0, ROOM_HEIGHT - 0.025, 0);
    roomGroup.add(fixture);

    const diffGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.02, 24);
    const diffMat = new THREE.MeshBasicMaterial({ color: 0xfffae6 });
    const diffuser = new THREE.Mesh(diffGeo, diffMat);
    diffuser.position.set(0, ROOM_HEIGHT - 0.055, 0);
    roomGroup.add(diffuser);

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
    const teaTablePendantLight = new THREE.PointLight(0xffdfa4, 3.5, 8.5, 1.05);
    teaTablePendantLight.position.set(0, -1.55, 0);
    teaTablePendantLight.castShadow = true;
    pendantGroup.add(teaTablePendantLight);

    roomGroup.add(pendantGroup);

    // Directional wall wash highlighting the front wall slats & bonsai
    const wallWashLight = new THREE.DirectionalLight(0xffe8cf, 1.35);
    wallWashLight.position.set(0, 3.5, -2.0);
    wallWashLight.target = frontWall;
    roomGroup.add(wallWashLight);

    // Doorway spill light from outside behind the player
    const doorLight = new THREE.PointLight(0xffcf88, 2.6, 14);
    doorLight.position.set(0, 2.0, ROOM_DEPTH / 2 - 0.4);
    roomGroup.add(doorLight);

    // --- 5B. NEW EMPTY 7x7m ROOMS: PURPLE, GREEN & GOLD ROOMS (7x7公尺空屋) ---
    // Positioned at X ∈ [-5.0, +2.0] (7m wide), Z ∈ [-3.5, +3.5] (7m deep) so the door at (-3.65, 0, -3.5)
    // retains the exact 1.35m left-corner relative position inside every room.
    const PR_SIZE = 7.0;
    const PR_HEIGHT = 3.0;
    const PR_CENTER_X = -1.5; // -5.0 + 7.0 / 2
    const extraRoomTexturesToDispose: THREE.Texture[] = [];

    const EXTRA_ROOM_THEMES: Record<
      'purple' | 'green' | 'gold',
      {
        floorColor: number;
        ceilingColor: number;
        wallColor: number;
        baseboardColor: number;
        accentWoodTint: number;
        ceilingRoseColor: number;
        lampCapColor: number;
        bulbColor: number;
        mainLightColor: number;
        upGlowColor: number;
        doorAccentColor: number;
      }
    > = {
      purple: {
        floorColor: 0x8f74b3,
        ceilingColor: 0x5c3e82,
        wallColor: 0xa78bfa,
        baseboardColor: 0x1b0e29,
        accentWoodTint: 0x1d1124,
        ceilingRoseColor: 0x1c0f29,
        lampCapColor: 0x2a183b,
        bulbColor: 0xf5ebff,
        mainLightColor: 0xd8b4fe,
        upGlowColor: 0xc084fc,
        doorAccentColor: 0xd8b4fe,
      },
      green: {
        floorColor: 0x639e4b,
        ceilingColor: 0x3a6328,
        wallColor: 0x84cc52,
        baseboardColor: 0x101f0c,
        accentWoodTint: 0x12220e,
        ceilingRoseColor: 0x11210c,
        lampCapColor: 0x1c3615,
        bulbColor: 0xf0fde8,
        mainLightColor: 0xbef292,
        upGlowColor: 0x86efac,
        doorAccentColor: 0xbef292,
      },
      gold: {
        floorColor: 0xb38b3e,
        ceilingColor: 0x6e511c,
        wallColor: 0xf5c84c,
        baseboardColor: 0x241908,
        accentWoodTint: 0x261a09,
        ceilingRoseColor: 0x241907,
        lampCapColor: 0x3d2a0d,
        bulbColor: 0xfff8dc,
        mainLightColor: 0xfde68a,
        upGlowColor: 0xfbbf24,
        doorAccentColor: 0xfde68a,
      },
    };

    const buildColoredRoomCore = (roomId: 'purple' | 'green' | 'gold') => {
      const theme = EXTRA_ROOM_THEMES[roomId];
      const roomState = extraRoomsRef.current[roomId];
      const coloredRoomGroup = new THREE.Group();
      coloredRoomGroup.visible = activeRoomRef.current === roomId;
      roomState.roomGroup = coloredRoomGroup;

      // 1. Empty 7x7 Colored Hardwood Floor
      const cFloorTex = floorTexture.clone();
      cFloorTex.repeat.set(3.5, 3.5);
      cFloorTex.needsUpdate = true;
      extraRoomTexturesToDispose.push(cFloorTex);
      const cFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(PR_SIZE, PR_SIZE),
        new THREE.MeshStandardMaterial({
          map: cFloorTex,
          color: theme.floorColor,
          roughness: 0.46,
          metalness: 0.06,
        })
      );
      cFloor.rotation.x = -Math.PI / 2;
      cFloor.position.set(PR_CENTER_X, 0, 0);
      cFloor.receiveShadow = true;
      coloredRoomGroup.add(cFloor);

      // 2. Empty 7x7 Ceiling
      const cCeilingTex = ceilingTexture.clone();
      cCeilingTex.repeat.set(3, 3);
      cCeilingTex.needsUpdate = true;
      extraRoomTexturesToDispose.push(cCeilingTex);
      const cCeiling = new THREE.Mesh(
        new THREE.PlaneGeometry(PR_SIZE, PR_SIZE),
        new THREE.MeshStandardMaterial({
          map: cCeilingTex,
          color: theme.ceilingColor,
          roughness: 0.88,
          metalness: 0.03,
        })
      );
      cCeiling.position.set(PR_CENTER_X, PR_HEIGHT, 0);
      cCeiling.rotation.x = Math.PI / 2;
      coloredRoomGroup.add(cCeiling);

      // 3. Four Empty 7x3m Colored Timber Slat Walls
      const makeColoredWallMat = () => {
        const tex = wallTexture.clone();
        tex.repeat.set(PR_SIZE * 2.2, 1);
        tex.needsUpdate = true;
        extraRoomTexturesToDispose.push(tex);
        return new THREE.MeshStandardMaterial({
          map: tex,
          color: theme.wallColor,
          roughness: 0.62,
          metalness: 0.05,
        });
      };

      const cFrontWall = new THREE.Mesh(new THREE.PlaneGeometry(PR_SIZE, PR_HEIGHT), makeColoredWallMat());
      cFrontWall.position.set(PR_CENTER_X, PR_HEIGHT / 2, -PR_SIZE / 2);
      cFrontWall.receiveShadow = true;
      coloredRoomGroup.add(cFrontWall);

      const cBackWall = new THREE.Mesh(new THREE.PlaneGeometry(PR_SIZE, PR_HEIGHT), makeColoredWallMat());
      cBackWall.position.set(PR_CENTER_X, PR_HEIGHT / 2, PR_SIZE / 2);
      cBackWall.rotation.y = Math.PI;
      cBackWall.receiveShadow = true;
      coloredRoomGroup.add(cBackWall);

      const cLeftWall = new THREE.Mesh(new THREE.PlaneGeometry(PR_SIZE, PR_HEIGHT), makeColoredWallMat());
      cLeftWall.position.set(-5.0, PR_HEIGHT / 2, 0);
      cLeftWall.rotation.y = Math.PI / 2;
      cLeftWall.receiveShadow = true;
      coloredRoomGroup.add(cLeftWall);

      const cRightWall = new THREE.Mesh(new THREE.PlaneGeometry(PR_SIZE, PR_HEIGHT), makeColoredWallMat());
      cRightWall.position.set(2.0, PR_HEIGHT / 2, 0);
      cRightWall.rotation.y = -Math.PI / 2;
      cRightWall.receiveShadow = true;
      coloredRoomGroup.add(cRightWall);

      // Baseboards
      const cBaseboardMat = new THREE.MeshStandardMaterial({ color: theme.baseboardColor, roughness: 0.55 });
      [
        [PR_SIZE, 0.1, 0.04, PR_CENTER_X, 0.05, PR_SIZE / 2 - 0.02],
        [0.04, 0.1, PR_SIZE, -5.0 + 0.02, 0.05, 0],
        [0.04, 0.1, PR_SIZE, 2.0 - 0.02, 0.05, 0],
        [PR_SIZE, 0.1, 0.04, PR_CENTER_X, 0.05, -PR_SIZE / 2 + 0.02],
      ].forEach(([bw, bh, bd, bx, by, bz]) => {
        const bb = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), cBaseboardMat);
        bb.position.set(bx, by, bz);
        coloredRoomGroup.add(bb);
      });

      // Door in exact same relative front-left corner offset (-3.65, 0, -3.50)
      // Dial has 3 Black sectors (Right/Bottom/Left) and ONLY Top is Bright Silver (亮銀色 -> returns to 大廳)
      const cPortalDoor = createPortalDoorAndDial({
        colors: roomState.colors,
        hasColorSlot: roomState.hasColorSlot,
        initialIdx: roomState.colorIdx,
        currentAngle: roomState.currentAngle,
        showFloorLabel: false,
        accentWoodTint: theme.accentWoodTint,
      });
      cPortalDoor.doorGroup.position.set(-3.65, 0, -PR_SIZE / 2);
      coloredRoomGroup.add(cPortalDoor.doorGroup);

      roomState.doorHitbox = cPortalDoor.doorHitbox;
      roomState.doorLeafPivot = cPortalDoor.leafPivot;
      roomState.wheelGroup = cPortalDoor.wheelGroup;
      roomState.outerGearGroup = cPortalDoor.outerGearGroup;
      roomState.dialHitbox = cPortalDoor.dialHitbox;
      roomState.dialLight = cPortalDoor.dialLight;
      roomState.tipGemMat = cPortalDoor.tipGemMat;
      roomState.sectorMats = cPortalDoor.sectorMats;
      roomState.rimGemMats = cPortalDoor.rimGemMats;

      // Overhead Center Pendant Light Fixture (頭頂正中央吊燈光源)
      const cCeilingRose = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.16, 0.04, 24),
        new THREE.MeshStandardMaterial({ color: theme.ceilingRoseColor, roughness: 0.45, metalness: 0.5 })
      );
      cCeilingRose.position.set(PR_CENTER_X, PR_HEIGHT - 0.02, 0);
      coloredRoomGroup.add(cCeilingRose);

      const cLightRod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.010, 0.010, 0.36, 12),
        new THREE.MeshStandardMaterial({ color: 0x8f6b32, roughness: 0.32, metalness: 0.85 })
      );
      cLightRod.position.set(PR_CENTER_X, PR_HEIGHT - 0.20, 0);
      coloredRoomGroup.add(cLightRod);

      const cLampCap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.15, 0.07, 24),
        new THREE.MeshStandardMaterial({ color: theme.lampCapColor, roughness: 0.38, metalness: 0.65 })
      );
      cLampCap.position.set(PR_CENTER_X, PR_HEIGHT - 0.38, 0);
      coloredRoomGroup.add(cLampCap);

      const cOverheadBulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.115, 24, 18),
        new THREE.MeshBasicMaterial({ color: theme.bulbColor })
      );
      cOverheadBulb.scale.set(1.15, 0.85, 1.15);
      cOverheadBulb.position.set(PR_CENTER_X, PR_HEIGHT - 0.46, 0);
      coloredRoomGroup.add(cOverheadBulb);

      const cMainLight = new THREE.PointLight(theme.mainLightColor, 5.2, 28, 0.85);
      cMainLight.position.set(PR_CENTER_X, PR_HEIGHT - 0.52, 0);
      cMainLight.castShadow = true;
      cMainLight.shadow.mapSize.width = 1024;
      cMainLight.shadow.mapSize.height = 1024;
      cMainLight.shadow.bias = -0.001;
      coloredRoomGroup.add(cMainLight);

      const cUpGlow = new THREE.PointLight(theme.upGlowColor, 2.2, 11, 1.05);
      cUpGlow.position.set(PR_CENTER_X, PR_HEIGHT - 0.30, 0);
      coloredRoomGroup.add(cUpGlow);

      const cDoorAccentLight = new THREE.PointLight(theme.doorAccentColor, 2.4, 10, 1.0);
      cDoorAccentLight.position.set(-3.65, 2.25, -2.05);
      coloredRoomGroup.add(cDoorAccentLight);

      scene.add(coloredRoomGroup);
    };

    (['purple', 'green', 'gold'] as const).forEach(buildColoredRoomCore);

    // --- 5C. CYAN FOYERS: 2F FOYER (「二樓的門廊」) & CLONED B1 FOYER (「地下一樓的門廊」) ---
    // X ∈ [-5.0, +7.0] (12m wide front/back walls), Z ∈ [-3.5, +0.5] (4m deep side walls), 鎖視角, 雙門
    const CY_WIDTH = 12.0;
    const CY_DEPTH = 4.0;
    const CY_HEIGHT = 3.0;
    const CY_CENTER_X = 1.0;  // -5.0 + 12.0 / 2
    const CY_CENTER_Z = -1.5; // -3.5 + 4.0 / 2

    const buildFoyerRoom = (
      roomId: 'cyan' | 'cyan_b1',
      farDoorState: ExtraRoomDoorState,
      floorPlaqueTex: THREE.Texture
    ) => {
      const foyerState = extraRoomsRef.current[roomId];
      const foyerGroup = new THREE.Group();
      foyerGroup.visible = activeRoomRef.current === roomId;
      foyerState.roomGroup = foyerGroup;

      // 1. 12x4m Cyan-Tinted Hardwood Floor
      const cyFloorTex = floorTexture.clone();
      cyFloorTex.repeat.set(6, 2);
      cyFloorTex.needsUpdate = true;
      extraRoomTexturesToDispose.push(cyFloorTex);
      const cyFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(CY_WIDTH, CY_DEPTH),
        new THREE.MeshStandardMaterial({
          map: cyFloorTex,
          color: 0x3b8c9e,
          roughness: 0.45,
          metalness: 0.07,
        })
      );
      cyFloor.rotation.x = -Math.PI / 2;
      cyFloor.position.set(CY_CENTER_X, 0, CY_CENTER_Z);
      cyFloor.receiveShadow = true;
      foyerGroup.add(cyFloor);

      // 2. 12x4m Deep Cyan Ceiling
      const cyCeilingTex = ceilingTexture.clone();
      cyCeilingTex.repeat.set(5, 2);
      cyCeilingTex.needsUpdate = true;
      extraRoomTexturesToDispose.push(cyCeilingTex);
      const cyCeiling = new THREE.Mesh(
        new THREE.PlaneGeometry(CY_WIDTH, CY_DEPTH),
        new THREE.MeshStandardMaterial({
          map: cyCeilingTex,
          color: 0x1a4d5c,
          roughness: 0.88,
          metalness: 0.03,
        })
      );
      cyCeiling.position.set(CY_CENTER_X, CY_HEIGHT, CY_CENTER_Z);
      cyCeiling.rotation.x = Math.PI / 2;
      foyerGroup.add(cyCeiling);

      // 3. 12x3m Front/Back Walls & 4x3m Left/Right Side Walls
      const makeCyanWallMat = (wallSpan: number) => {
        const tex = wallTexture.clone();
        tex.repeat.set(wallSpan * 2.2, 1);
        tex.needsUpdate = true;
        extraRoomTexturesToDispose.push(tex);
        return new THREE.MeshStandardMaterial({
          map: tex,
          color: 0x38bdf8,
          roughness: 0.60,
          metalness: 0.06,
        });
      };

      const cyFrontWall = new THREE.Mesh(new THREE.PlaneGeometry(CY_WIDTH, CY_HEIGHT), makeCyanWallMat(CY_WIDTH));
      cyFrontWall.position.set(CY_CENTER_X, CY_HEIGHT / 2, -3.5);
      cyFrontWall.receiveShadow = true;
      foyerGroup.add(cyFrontWall);

      const cyBackWall = new THREE.Mesh(new THREE.PlaneGeometry(CY_WIDTH, CY_HEIGHT), makeCyanWallMat(CY_WIDTH));
      cyBackWall.position.set(CY_CENTER_X, CY_HEIGHT / 2, 0.5);
      cyBackWall.rotation.y = Math.PI;
      cyBackWall.receiveShadow = true;
      foyerGroup.add(cyBackWall);

      const cyLeftWall = new THREE.Mesh(new THREE.PlaneGeometry(CY_DEPTH, CY_HEIGHT), makeCyanWallMat(CY_DEPTH));
      cyLeftWall.position.set(-5.0, CY_HEIGHT / 2, CY_CENTER_Z);
      cyLeftWall.rotation.y = Math.PI / 2;
      cyLeftWall.receiveShadow = true;
      foyerGroup.add(cyLeftWall);

      const cyRightWall = new THREE.Mesh(new THREE.PlaneGeometry(CY_DEPTH, CY_HEIGHT), makeCyanWallMat(CY_DEPTH));
      cyRightWall.position.set(7.0, CY_HEIGHT / 2, CY_CENTER_Z);
      cyRightWall.rotation.y = -Math.PI / 2;
      cyRightWall.receiveShadow = true;
      foyerGroup.add(cyRightWall);

      // Baseboards along 12m & 4m walls
      const cyBaseboardMat = new THREE.MeshStandardMaterial({ color: 0x0b2229, roughness: 0.55 });
      [
        [CY_WIDTH, 0.1, 0.04, CY_CENTER_X, 0.05, 0.5 - 0.02],
        [0.04, 0.1, CY_DEPTH, -5.0 + 0.02, 0.05, CY_CENTER_Z],
        [0.04, 0.1, CY_DEPTH, 7.0 - 0.02, 0.05, CY_CENTER_Z],
        [CY_WIDTH, 0.1, 0.04, CY_CENTER_X, 0.05, -3.5 + 0.02],
      ].forEach(([bw, bh, bd, bx, by, bz]) => {
        const bb = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), cyBaseboardMat);
        bb.position.set(bx, by, bz);
        foyerGroup.add(bb);
      });

      // Door 1 (12m front wall left end, same offset (-3.65, 0, -3.50))
      // Dial: ONLY Left is Cyan (0x06b6d4), other 3 sectors are Black
      const foyerDoor1 = createPortalDoorAndDial({
        colors: foyerState.colors,
        hasColorSlot: foyerState.hasColorSlot,
        initialIdx: foyerState.colorIdx,
        currentAngle: foyerState.currentAngle,
        showFloorLabel: true,
        floorLabelTexture: floorPlaqueTex,
        accentWoodTint: 0x0d2129,
      });
      foyerDoor1.doorGroup.position.set(-3.65, 0, -3.5);
      foyerGroup.add(foyerDoor1.doorGroup);

      foyerState.doorHitbox = foyerDoor1.doorHitbox;
      foyerState.doorLeafPivot = foyerDoor1.leafPivot;
      foyerState.wheelGroup = foyerDoor1.wheelGroup;
      foyerState.outerGearGroup = foyerDoor1.outerGearGroup;
      foyerState.dialHitbox = foyerDoor1.dialHitbox;
      foyerState.dialLight = foyerDoor1.dialLight;
      foyerState.tipGemMat = foyerDoor1.tipGemMat;
      foyerState.sectorMats = foyerDoor1.sectorMats;
      foyerState.rimGemMats = foyerDoor1.rimGemMats;

      // Door 2 (Other end on the 4m right-side wall at X = +7.0, Z = -1.5, facing -X, identical door + plaque)
      const foyerDoor2 = createPortalDoorAndDial({
        colors: farDoorState.colors,
        hasColorSlot: farDoorState.hasColorSlot,
        initialIdx: farDoorState.colorIdx,
        currentAngle: farDoorState.currentAngle,
        showFloorLabel: true,
        floorLabelTexture: floorPlaqueTex,
        accentWoodTint: 0x0d2129,
      });
      foyerDoor2.doorGroup.position.set(7.0, 0, CY_CENTER_Z);
      foyerDoor2.doorGroup.rotation.y = -Math.PI / 2;
      foyerGroup.add(foyerDoor2.doorGroup);

      farDoorState.doorHitbox = foyerDoor2.doorHitbox;
      farDoorState.doorLeafPivot = foyerDoor2.leafPivot;
      farDoorState.wheelGroup = foyerDoor2.wheelGroup;
      farDoorState.outerGearGroup = foyerDoor2.outerGearGroup;
      farDoorState.dialHitbox = foyerDoor2.dialHitbox;
      farDoorState.dialLight = foyerDoor2.dialLight;
      farDoorState.tipGemMat = foyerDoor2.tipGemMat;
      farDoorState.sectorMats = foyerDoor2.sectorMats;
      farDoorState.rimGemMats = foyerDoor2.rimGemMats;

      // 1F-Lobby-Matching Bright Warm Lighting Rig for Foyer
      const cyCeilingDownlight = new THREE.PointLight(0xffebd2, 4.8, 30, 0.9);
      cyCeilingDownlight.position.set(CY_CENTER_X, CY_HEIGHT - 0.25, CY_CENTER_Z);
      cyCeilingDownlight.castShadow = true;
      cyCeilingDownlight.shadow.mapSize.width = 1024;
      cyCeilingDownlight.shadow.mapSize.height = 1024;
      cyCeilingDownlight.shadow.bias = -0.001;
      foyerGroup.add(cyCeilingDownlight);

      const cyFixture = new THREE.Mesh(
        new THREE.CylinderGeometry(0.45, 0.45, 0.05, 24),
        new THREE.MeshStandardMaterial({ color: 0x22130a, roughness: 0.5 })
      );
      cyFixture.position.set(CY_CENTER_X, CY_HEIGHT - 0.025, CY_CENTER_Z);
      foyerGroup.add(cyFixture);

      const cyDiffuser = new THREE.Mesh(
        new THREE.CylinderGeometry(0.38, 0.38, 0.02, 24),
        new THREE.MeshBasicMaterial({ color: 0xfffae6 })
      );
      cyDiffuser.position.set(CY_CENTER_X, CY_HEIGHT - 0.055, CY_CENTER_Z);
      foyerGroup.add(cyDiffuser);

      const cyPendantGroup = new THREE.Group();
      cyPendantGroup.position.set(CY_CENTER_X, CY_HEIGHT, CY_CENTER_Z);
      const cyCord = new THREE.Mesh(
        new THREE.CylinderGeometry(0.005, 0.005, 1.1, 8),
        new THREE.MeshBasicMaterial({ color: 0x111111 })
      );
      cyCord.position.y = -0.55;
      cyPendantGroup.add(cyCord);
      const cyShade = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.34, 0.32, 16),
        new THREE.MeshStandardMaterial({ color: 0x28180c, roughness: 0.6 })
      );
      cyShade.position.y = -1.20;
      cyPendantGroup.add(cyShade);
      const cyPendantLight = new THREE.PointLight(0xffdfa4, 3.8, 12, 1.0);
      cyPendantLight.position.set(0, -1.25, 0);
      cyPendantGroup.add(cyPendantLight);
      foyerGroup.add(cyPendantGroup);

      const cyWallWashLight = new THREE.DirectionalLight(0xffe8cf, 1.35);
      cyWallWashLight.position.set(CY_CENTER_X, 3.5, -1.2);
      cyWallWashLight.target = cyFrontWall;
      foyerGroup.add(cyWallWashLight);

      const cyDoor1SpillLight = new THREE.PointLight(0xffcf88, 3.0, 14);
      cyDoor1SpillLight.position.set(-3.65, 2.0, -1.85);
      foyerGroup.add(cyDoor1SpillLight);

      const cyDoor2SpillLight = new THREE.PointLight(0xffcf88, 3.0, 14);
      cyDoor2SpillLight.position.set(5.35, 2.0, CY_CENTER_Z);
      foyerGroup.add(cyDoor2SpillLight);

      scene.add(foyerGroup);
    };

    buildFoyerRoom('cyan', cyanFarDoorRef.current, door2FEngravingTex);
    buildFoyerRoom('cyan_b1', cyanB1FarDoorRef.current, doorB1EngravingTex);

    // --- 5D. TWO 10x7m EMPTY LOBBY-LOGIC 2F HALLS (寶藍色大廳 & 淺棕色大廳) ---
    // Exact 1F Lobby dimensions (10m x 7m x 3m), warm 1F lighting, T-shape seated look,
    // clean center round wooden table + cushions, and front-left 2F return door to 二樓的門廊 (Top=銀色).
    const LOBBY_2F_THEMES: Record<
      'royalblue' | 'brown',
      {
        floorColor: number;
        wallColor: number;
        ceilingColor: number;
        baseboardColor: number;
        accentWoodTint: number;
      }
    > = {
      royalblue: {
        floorColor: 0x7b92c4,
        wallColor: 0x4f74c9,
        ceilingColor: 0xc2d1eb,
        baseboardColor: 0x0f182e,
        accentWoodTint: 0x101930,
      },
      brown: {
        floorColor: 0xb38a62,
        wallColor: 0xc28c59,
        ceilingColor: 0xebd9c5,
        baseboardColor: 0x24160b,
        accentWoodTint: 0x26170b,
      },
    };

    const buildLobbyLogic2FRoom = (roomId: 'royalblue' | 'brown') => {
      const theme = LOBBY_2F_THEMES[roomId];
      const roomState = extraRoomsRef.current[roomId];
      const hallGroup = new THREE.Group();
      hallGroup.visible = activeRoomRef.current === roomId;
      roomState.roomGroup = hallGroup;

      // 1. 10x7m Hardwood Floor
      const hFloorTex = floorTexture.clone();
      hFloorTex.repeat.set(4, 5);
      hFloorTex.needsUpdate = true;
      extraRoomTexturesToDispose.push(hFloorTex);
      const hFloor = new THREE.Mesh(
        new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH),
        new THREE.MeshStandardMaterial({
          map: hFloorTex,
          color: theme.floorColor,
          roughness: 0.42,
          metalness: 0.05,
        })
      );
      hFloor.rotation.x = -Math.PI / 2;
      hFloor.receiveShadow = true;
      hallGroup.add(hFloor);

      // 2. 10x7m Ceiling
      const hCeilingTex = ceilingTexture.clone();
      hCeilingTex.repeat.set(4, 4);
      hCeilingTex.needsUpdate = true;
      extraRoomTexturesToDispose.push(hCeilingTex);
      const hCeiling = new THREE.Mesh(
        new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_DEPTH),
        new THREE.MeshStandardMaterial({
          map: hCeilingTex,
          color: theme.ceilingColor,
          roughness: 0.9,
          metalness: 0.02,
        })
      );
      hCeiling.position.y = ROOM_HEIGHT;
      hCeiling.rotation.x = Math.PI / 2;
      hallGroup.add(hCeiling);

      // 3. 10x7m Vertical Wood Slat Walls (matching 1F Lobby proportions & doorway behind player)
      const makeHallWallMat = (repeatX: number) => {
        const tex = wallTexture.clone();
        tex.repeat.set(repeatX, 1);
        tex.needsUpdate = true;
        extraRoomTexturesToDispose.push(tex);
        return new THREE.MeshStandardMaterial({
          map: tex,
          color: theme.wallColor,
          roughness: 0.58,
          metalness: 0.08,
        });
      };

      const hFrontWall = new THREE.Mesh(
        new THREE.PlaneGeometry(ROOM_WIDTH, ROOM_HEIGHT),
        makeHallWallMat(ROOM_WIDTH * 2.2)
      );
      hFrontWall.position.set(0, ROOM_HEIGHT / 2, -ROOM_DEPTH / 2);
      hFrontWall.receiveShadow = true;
      hallGroup.add(hFrontWall);

      const hLeftWall = new THREE.Mesh(
        new THREE.PlaneGeometry(ROOM_DEPTH, ROOM_HEIGHT),
        makeHallWallMat(ROOM_DEPTH * 2.2)
      );
      hLeftWall.position.set(-ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0);
      hLeftWall.rotation.y = Math.PI / 2;
      hLeftWall.receiveShadow = true;
      hallGroup.add(hLeftWall);

      const hRightWall = new THREE.Mesh(
        new THREE.PlaneGeometry(ROOM_DEPTH, ROOM_HEIGHT),
        makeHallWallMat(ROOM_DEPTH * 2.2)
      );
      hRightWall.position.set(ROOM_WIDTH / 2, ROOM_HEIGHT / 2, 0);
      hRightWall.rotation.y = -Math.PI / 2;
      hRightWall.receiveShadow = true;
      hallGroup.add(hRightWall);

      const hBackWallMat = makeHallWallMat(backWallSideWidth * 2.2);
      const hBwLeft = new THREE.Mesh(new THREE.PlaneGeometry(backWallSideWidth, ROOM_HEIGHT), hBackWallMat);
      hBwLeft.position.set(-ROOM_WIDTH / 2 + backWallSideWidth / 2, ROOM_HEIGHT / 2, ROOM_DEPTH / 2);
      hBwLeft.rotation.y = Math.PI;
      hallGroup.add(hBwLeft);

      const hBwRight = new THREE.Mesh(new THREE.PlaneGeometry(backWallSideWidth, ROOM_HEIGHT), hBackWallMat);
      hBwRight.position.set(ROOM_WIDTH / 2 - backWallSideWidth / 2, ROOM_HEIGHT / 2, ROOM_DEPTH / 2);
      hBwRight.rotation.y = Math.PI;
      hallGroup.add(hBwRight);

      const hBwHeader = new THREE.Mesh(
        new THREE.PlaneGeometry(doorwayWidth, ROOM_HEIGHT - doorwayHeight),
        hBackWallMat
      );
      hBwHeader.position.set(0, ROOM_HEIGHT - (ROOM_HEIGHT - doorwayHeight) / 2, ROOM_DEPTH / 2);
      hBwHeader.rotation.y = Math.PI;
      hallGroup.add(hBwHeader);

      const hFrameL = new THREE.Mesh(framePillarGeo, doorFrameMat);
      hFrameL.position.set(-doorwayWidth / 2 + 0.05, doorwayHeight / 2, ROOM_DEPTH / 2);
      hallGroup.add(hFrameL);
      const hFrameR = new THREE.Mesh(framePillarGeo, doorFrameMat);
      hFrameR.position.set(doorwayWidth / 2 - 0.05, doorwayHeight / 2, ROOM_DEPTH / 2);
      hallGroup.add(hFrameR);
      const hFrameT = new THREE.Mesh(frameTopGeo, doorFrameMat);
      hFrameT.position.set(0, doorwayHeight, ROOM_DEPTH / 2);
      hallGroup.add(hFrameT);

      // Baseboards
      const hBaseboardMat = new THREE.MeshStandardMaterial({ color: theme.baseboardColor, roughness: 0.55 });
      const hBbL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, ROOM_DEPTH), hBaseboardMat);
      hBbL.position.set(-ROOM_WIDTH / 2 + 0.02, 0.05, 0);
      hallGroup.add(hBbL);
      const hBbR = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, ROOM_DEPTH), hBaseboardMat);
      hBbR.position.set(ROOM_WIDTH / 2 - 0.02, 0.05, 0);
      hallGroup.add(hBbR);
      const hBbB1 = new THREE.Mesh(new THREE.BoxGeometry(backWallSideWidth, 0.1, 0.04), hBaseboardMat);
      hBbB1.position.set(-ROOM_WIDTH / 2 + backWallSideWidth / 2, 0.05, ROOM_DEPTH / 2 - 0.02);
      hallGroup.add(hBbB1);
      const hBbB2 = new THREE.Mesh(new THREE.BoxGeometry(backWallSideWidth, 0.1, 0.04), hBaseboardMat);
      hBbB2.position.set(ROOM_WIDTH / 2 - backWallSideWidth / 2, 0.05, ROOM_DEPTH / 2 - 0.02);
      hallGroup.add(hBbB2);

      // 4. Center Round Wooden Table + Surrounding Cushions (空大廳正中央的圓桌)
      const hRoundTableGroup = new THREE.Group();
      hRoundTableGroup.position.set(0, 0, 0);

      const hTeaTop = new THREE.Mesh(teaTopGeo, tableMat);
      hTeaTop.position.set(0, TEA_TABLE_HEIGHT - TEA_TABLE_TOP_THICK / 2, 0);
      hTeaTop.castShadow = true;
      hTeaTop.receiveShadow = true;
      hRoundTableGroup.add(hTeaTop);

      const hRoundRim = new THREE.Mesh(roundRimGeo, tableDarkWoodMat);
      hRoundRim.position.set(0, TEA_TABLE_HEIGHT - TEA_TABLE_TOP_THICK / 2, 0);
      hRoundRim.rotation.x = Math.PI / 2;
      hRoundTableGroup.add(hRoundRim);

      [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75].forEach((angle) => {
        const lx = Math.cos(angle) * legRadius;
        const lz = Math.sin(angle) * legRadius;
        const hLeg = new THREE.Mesh(roundLegGeo, tableDarkWoodMat);
        hLeg.position.set(lx, roundLegHeight / 2, lz);
        hLeg.rotation.y = -angle;
        hLeg.castShadow = true;
        hRoundTableGroup.add(hLeg);
      });

      const hBrace1 = new THREE.Mesh(braceGeo, tableDarkWoodMat);
      hBrace1.position.set(0, 0.12, 0);
      hBrace1.rotation.y = Math.PI * 0.25;
      hRoundTableGroup.add(hBrace1);
      const hBrace2 = new THREE.Mesh(braceGeo, tableDarkWoodMat);
      hBrace2.position.set(0, 0.12, 0);
      hBrace2.rotation.y = Math.PI * 0.75;
      hRoundTableGroup.add(hBrace2);

      cushionPositions.forEach((pos) => {
        const cGroup = new THREE.Group();
        cGroup.position.set(pos.x, 0.0325, pos.z);
        const cushion = new THREE.Mesh(cushionGeo, pos.mat);
        cushion.castShadow = true;
        cushion.receiveShadow = true;
        cGroup.add(cushion);
        const btn = new THREE.Mesh(
          new THREE.SphereGeometry(0.016, 10, 8),
          new THREE.MeshStandardMaterial({ color: 0x16120e, roughness: 0.6 })
        );
        btn.position.y = 0.033;
        btn.scale.set(1, 0.4, 1);
        cGroup.add(btn);
        hRoundTableGroup.add(cGroup);
      });

      hallGroup.add(hRoundTableGroup);

      // 5. Front-Left Portal Door ("2F" plaque, Top=銀色 returning to 二樓的門廊, other 3=黑色)
      const hPortalDoor = createPortalDoorAndDial({
        colors: roomState.colors,
        hasColorSlot: roomState.hasColorSlot,
        initialIdx: roomState.colorIdx,
        currentAngle: roomState.currentAngle,
        showFloorLabel: true,
        floorLabelTexture: door2FEngravingTex,
        accentWoodTint: theme.accentWoodTint,
      });
      hPortalDoor.doorGroup.position.set(-3.65, 0, -ROOM_DEPTH / 2);
      hallGroup.add(hPortalDoor.doorGroup);

      roomState.doorHitbox = hPortalDoor.doorHitbox;
      roomState.doorLeafPivot = hPortalDoor.leafPivot;
      roomState.wheelGroup = hPortalDoor.wheelGroup;
      roomState.outerGearGroup = hPortalDoor.outerGearGroup;
      roomState.dialHitbox = hPortalDoor.dialHitbox;
      roomState.dialLight = hPortalDoor.dialLight;
      roomState.tipGemMat = hPortalDoor.tipGemMat;
      roomState.sectorMats = hPortalDoor.sectorMats;
      roomState.rimGemMats = hPortalDoor.rimGemMats;

      // 6. Exact 1F Lobby Bright Warm Lighting Rig
      const hCeilingDownlight = new THREE.PointLight(0xffebd2, 4.8, 28, 0.95);
      hCeilingDownlight.position.set(0, ROOM_HEIGHT - 0.25, 0);
      hCeilingDownlight.castShadow = true;
      hCeilingDownlight.shadow.mapSize.width = 1024;
      hCeilingDownlight.shadow.mapSize.height = 1024;
      hCeilingDownlight.shadow.bias = -0.001;
      hallGroup.add(hCeilingDownlight);

      const hFixture = new THREE.Mesh(fixGeo, fixMat);
      hFixture.position.set(0, ROOM_HEIGHT - 0.025, 0);
      hallGroup.add(hFixture);

      const hDiffuser = new THREE.Mesh(diffGeo, diffMat);
      hDiffuser.position.set(0, ROOM_HEIGHT - 0.055, 0);
      hallGroup.add(hDiffuser);

      const hPendantGroup = new THREE.Group();
      hPendantGroup.position.set(0, ROOM_HEIGHT, 0);
      const hCord = new THREE.Mesh(cordGeo, cordMat);
      hCord.position.y = -0.7;
      hPendantGroup.add(hCord);
      const hShade = new THREE.Mesh(shadeGeo, shadeMat);
      hShade.position.y = -1.50;
      hPendantGroup.add(hShade);
      const hTeaLight = new THREE.PointLight(0xffdfa4, 3.6, 9.0, 1.0);
      hTeaLight.position.set(0, -1.55, 0);
      hTeaLight.castShadow = true;
      hPendantGroup.add(hTeaLight);
      hallGroup.add(hPendantGroup);

      const hWallWashLight = new THREE.DirectionalLight(0xffe8cf, 1.35);
      hWallWashLight.position.set(0, 3.5, -2.0);
      hWallWashLight.target = hFrontWall;
      hallGroup.add(hWallWashLight);

      const hDoorLight = new THREE.PointLight(0xffcf88, 2.6, 14);
      hDoorLight.position.set(0, 2.0, ROOM_DEPTH / 2 - 0.4);
      hallGroup.add(hDoorLight);

      scene.add(hallGroup);
    };

    (['royalblue', 'brown'] as const).forEach(buildLobbyLogic2FRoom);

    // --- 6. ANIMATION & RENDER LOOP ---
    let animationId: number;
    const clock = new THREE.Clock();
    const tempForward = new THREE.Vector3();
    const tempHeldPos = new THREE.Vector3();
    const tempZAxis = new THREE.Vector3(0, 0, 1);
    const tempRollQuat = new THREE.Quaternion();
    const tempHeldQuat = new THREE.Quaternion();
    const tempCenterPos = new THREE.Vector3();
    const tempRightPos = new THREE.Vector3();
    const tempTopPos = new THREE.Vector3();

    const TABLE_VIEW_POS = new THREE.Vector3(0, SEATED_HEIGHT, SEATED_Z);
    const CABINET_VIEW_POS = new THREE.Vector3((CAB_X + CAB2_X) / 2, 1.10, CAB_Z + 2.75);
    const DOOR_VIEW_POS = new THREE.Vector3(-3.65, 1.28, -1.62);
    const CYAN_DOOR2_VIEW_POS = new THREE.Vector3(5.12, 1.28, CY_CENTER_Z);
    const ROOM_CENTER_POS = new THREE.Vector3(PR_CENTER_X, 1.38, 0);

    const renderLoop = () => {
      const delta = Math.min(clock.getDelta(), 0.1);

      // Smoothly move camera between tea table, 6-tier cabinet, doors, and center of colored rooms
      const targetPos =
        viewLocationRef.current === 'cabinet'
          ? CABINET_VIEW_POS
          : viewLocationRef.current === 'door'
            ? DOOR_VIEW_POS
            : viewLocationRef.current === 'door2'
              ? CYAN_DOOR2_VIEW_POS
              : viewLocationRef.current === 'center'
                ? ROOM_CENTER_POS
                : TABLE_VIEW_POS;
      playerPosRef.current.x = THREE.MathUtils.damp(playerPosRef.current.x, targetPos.x, 4.6, delta);
      playerPosRef.current.y = THREE.MathUtils.damp(playerPosRef.current.y, targetPos.y, 4.6, delta);
      playerPosRef.current.z = THREE.MathUtils.damp(playerPosRef.current.z, targetPos.z, 4.6, delta);

      cameraYawRef.current = THREE.MathUtils.damp(cameraYawRef.current, targetYawRef.current, 7.5, delta);
      cameraPitchRef.current = THREE.MathUtils.damp(cameraPitchRef.current, targetPitchRef.current, 7.5, delta);
      camera.position.copy(playerPosRef.current);
      camera.rotation.z = 0;
      camera.rotation.y = cameraYawRef.current;
      camera.rotation.x = cameraPitchRef.current;
      camera.updateMatrixWorld();

      // Smoothly animate Blue-Violet Handheld Console between Tea Table and Close-Up Landscape View
      const targetHold = isConsoleHeldRef.current ? 1 : 0;
      if (consoleHoldLerpRef.current < targetHold) {
        consoleHoldLerpRef.current = Math.min(1, consoleHoldLerpRef.current + delta * 3.8);
      } else if (consoleHoldLerpRef.current > targetHold) {
        consoleHoldLerpRef.current = Math.max(0, consoleHoldLerpRef.current - delta * 4.2);
      }

      if (consoleGroupRef.current) {
        const l = consoleHoldLerpRef.current;
        if (l <= 0.0001) {
          consoleGroupRef.current.position.copy(consoleTablePos);
          consoleGroupRef.current.quaternion.copy(consoleTableQuat);
          consoleGroupRef.current.scale.setScalar(1.0);
        } else {
          const eased = l < 0.5 ? 4 * l * l * l : 1 - Math.pow(-2 * l + 2, 3) / 2;

          // Bring handheld much closer to camera & flip to landscape orientation on portrait screens
          const HOLD_DIST = 0.20;
          const visH = 2 * HOLD_DIST * Math.tan(THREE.MathUtils.degToRad(32.5));
          const visW = visH * camera.aspect;
          const isPortrait = camera.aspect < 1.0;

          tempRollQuat.setFromAxisAngle(tempZAxis, isPortrait ? -Math.PI / 2 : 0);
          tempHeldQuat.copy(camera.quaternion).multiply(tempRollQuat);

          const heldSpanW = isPortrait ? CONSOLE_H : CONSOLE_W;
          const heldSpanH = isPortrait ? CONSOLE_W : CONSOLE_H;
          const heldScale = Math.min((visW * 0.96) / heldSpanW, (visH * 0.96) / heldSpanH);

          tempForward.set(0, 0, -1).applyQuaternion(camera.quaternion);
          tempHeldPos
            .copy(camera.position)
            .addScaledVector(tempForward, HOLD_DIST);

          consoleGroupRef.current.position.lerpVectors(consoleTablePos, tempHeldPos, eased);
          consoleGroupRef.current.quaternion.slerpQuaternions(consoleTableQuat, tempHeldQuat, eased);
          const s = THREE.MathUtils.lerp(1.0, heldScale, eased);
          consoleGroupRef.current.scale.setScalar(s);
        }

        // Tactile D-Pad press & continuous scroll when held
        if (dpadGroupRef.current) {
          const dir = activeDpadDirRef.current;
          const targetTiltX = dir === -1 ? -0.15 : dir === 1 ? 0.15 : 0;
          const targetDpadZ = dir !== 0 ? dpadRestZRef.current - 0.0014 : dpadRestZRef.current;
          dpadGroupRef.current.rotation.x = THREE.MathUtils.lerp(dpadGroupRef.current.rotation.x, targetTiltX, 0.35);
          dpadGroupRef.current.position.z = THREE.MathUtils.lerp(dpadGroupRef.current.position.z, targetDpadZ, 0.35);

          if (dir !== 0 && isConsoleHeldRef.current && isScreenActiveRef.current) {
            if (performance.now() - dpadPressStartTimeRef.current >= 140) {
              dpadHasScrolledRef.current = true;
              desktopIframeRef.current?.contentWindow?.postMessage(
                { type: 'console_scroll', deltaY: dir * (delta * 900), smooth: false },
                window.location.origin
              );
            }
          }
        }

        // Tactile ABXY button press depression animation
        if (abxyPressedTimerRef.current > 0) {
          abxyPressedTimerRef.current = Math.max(0, abxyPressedTimerRef.current - delta);
        }
        faceButtonMeshesRef.current.forEach((btnMesh, idx) => {
          const isPressed = abxyPressedTimerRef.current > 0 && pressedFaceBtnIdxRef.current === idx;
          const targetBtnZ = isPressed ? faceButtonRestZRef.current - 0.0024 : faceButtonRestZRef.current;
          btnMesh.position.z = THREE.MathUtils.lerp(btnMesh.position.z, targetBtnZ, 0.45);
        });

        // Synchronize interactive 16:9 desktop website overlay precisely over the 3D screen aperture
        const shouldActivateScreen = isConsoleHeldRef.current && l >= 0.97;
        if (shouldActivateScreen !== isScreenActiveRef.current) {
          isScreenActiveRef.current = shouldActivateScreen;
          setIsScreenActive(shouldActivateScreen);
        }

        if (shouldActivateScreen && screenOverlayRef.current) {
          const viewW = container.clientWidth || window.innerWidth;
          const viewH = container.clientHeight || window.innerHeight;
          consoleGroupRef.current.updateMatrixWorld(true);

          tempCenterPos.set(0, 0, 0).applyMatrix4(screenMesh.matrixWorld).project(camera);
          tempRightPos.set(SCREEN_W / 2, 0, 0).applyMatrix4(screenMesh.matrixWorld).project(camera);
          tempTopPos.set(0, SCREEN_H / 2, 0).applyMatrix4(screenMesh.matrixWorld).project(camera);

          const cx = (tempCenterPos.x * 0.5 + 0.5) * viewW;
          const cy = (-tempCenterPos.y * 0.5 + 0.5) * viewH;
          const rx = (tempRightPos.x * 0.5 + 0.5) * viewW;
          const ry = (-tempRightPos.y * 0.5 + 0.5) * viewH;
          const tx = (tempTopPos.x * 0.5 + 0.5) * viewW;
          const ty = (-tempTopPos.y * 0.5 + 0.5) * viewH;

          const pxW = Math.hypot((rx - cx) * 2, (ry - cy) * 2);
          const pxH = Math.hypot((tx - cx) * 2, (ty - cy) * 2);
          const angleRad = Math.atan2(ry - cy, rx - cx);

          screenOverlayRef.current.style.transform =
            `translate3d(${cx}px, ${cy}px, 0) translate(-50%, -50%) rotate(${angleRad}rad) scale(${pxW / 1600}, ${pxH / 900})`;
        }
      }

      // Smooth clockwise damped rotation for Lobby & Colored Rooms' steampunk pointers & outer gear rings
      if (portalWheelRef.current) {
        portalCurrentAngleRef.current = THREE.MathUtils.damp(
          portalCurrentAngleRef.current,
          portalTargetAngleRef.current,
          10.5,
          delta
        );
        portalWheelRef.current.rotation.z = portalCurrentAngleRef.current;
        if (portalOuterGearRef.current) {
          portalOuterGearRef.current.rotation.z = -0.5 * portalCurrentAngleRef.current;
        }
      }
      const animateDialState = (rs: ExtraRoomDoorState) => {
        if (rs.wheelGroup) {
          rs.currentAngle = THREE.MathUtils.damp(rs.currentAngle, rs.targetAngle, 10.5, delta);
          rs.wheelGroup.rotation.z = rs.currentAngle;
          if (rs.outerGearGroup) {
            rs.outerGearGroup.rotation.z = -0.5 * rs.currentAngle;
          }
        }
      };
      (['purple', 'green', 'gold', 'cyan', 'cyan_b1', 'royalblue', 'brown'] as const).forEach((roomId) => {
        animateDialState(extraRoomsRef.current[roomId]);
      });
      animateDialState(cyanFarDoorRef.current);
      animateDialState(cyanB1FarDoorRef.current);

      // Brief hinge rattle when clicking a locked door (pointer color doesn't match a room)
      if (doorRattleTimerRef.current > 0) {
        doorRattleTimerRef.current = Math.max(0, doorRattleTimerRef.current - delta);
        const wobble = Math.sin(doorRattleTimerRef.current * 42) * 0.014 * (doorRattleTimerRef.current / 0.35);
        if (lobbyDoorLeafPivotRef.current) lobbyDoorLeafPivotRef.current.rotation.y = wobble;
        (['purple', 'green', 'gold', 'cyan', 'cyan_b1', 'royalblue', 'brown'] as const).forEach((roomId) => {
          const pivot = extraRoomsRef.current[roomId].doorLeafPivot;
          if (pivot) pivot.rotation.y = wobble;
        });
        if (cyanFarDoorRef.current.doorLeafPivot) cyanFarDoorRef.current.doorLeafPivot.rotation.y = wobble;
        if (cyanB1FarDoorRef.current.doorLeafPivot) cyanB1FarDoorRef.current.doorLeafPivot.rotation.y = wobble;
      } else {
        if (lobbyDoorLeafPivotRef.current) lobbyDoorLeafPivotRef.current.rotation.y = 0;
        (['purple', 'green', 'gold', 'cyan', 'cyan_b1', 'royalblue', 'brown'] as const).forEach((roomId) => {
          const pivot = extraRoomsRef.current[roomId].doorLeafPivot;
          if (pivot) pivot.rotation.y = 0;
        });
        if (cyanFarDoorRef.current.doorLeafPivot) cyanFarDoorRef.current.doorLeafPivot.rotation.y = 0;
        if (cyanB1FarDoorRef.current.doorLeafPivot) cyanB1FarDoorRef.current.doorLeafPivot.rotation.y = 0;
      }

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
      if (portalSwapTimeoutRef.current !== null) window.clearTimeout(portalSwapTimeoutRef.current);
      if (portalFadeEndTimeoutRef.current !== null) window.clearTimeout(portalFadeEndTimeoutRef.current);

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
      enterPortalRoomRef.current = null;
      doorEngravingTex.dispose();
      door2FEngravingTex.dispose();
      doorB1EngravingTex.dispose();
      extraRoomTexturesToDispose.forEach((tex) => tex.dispose());
      consoleScreenTex.dispose();
      scrollTexture.dispose();
      displayPosterTexture.dispose();
      fanTexture.dispose();
      plaqueTexture.dispose();
      vinylCenterTexture.dispose();
      vinylDiscFaceTexture.dispose();
      suzumiScrollTexture.dispose();
      catFaceApricotTex.dispose();
      catFaceWhiteTex.dispose();
      catFaceRedTex.dispose();
      switchDockLogoTex.dispose();
      iineBaseLogoTex.dispose();
      ririmuFrontTex.dispose();
      ririmuBackTex.dispose();
      ririmuSideTex.dispose();
      chiamoBaseTex.dispose();
      chiamoFrontAlphaTex.dispose();
      chiamoBackAlphaTex.dispose();
      chiamoFrontRgbTex.dispose();
      chiamoBackRgbTex.dispose();
      chiamoLeftRgbTex.dispose();
      chiamoRightRgbTex.dispose();
      signCardTexture.dispose();
      whiteBoxFrontTexture.dispose();
      whiteBoxTopTexture.dispose();
      renderer.dispose();

      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [CENTER_YAW, SEATED_Z, SEATED_HEIGHT]);

  // Toggle Table Lamp when tapped
  const handleToggleLamp = () => {
    setIsLampOn((prev) => {
      const next = !prev;
      if (lampLightRef.current) {
        lampLightRef.current.intensity = next ? 2.8 : 0;
      }
      if (lampBulbMatRef.current) {
        lampBulbMatRef.current.color.set(next ? 0xffeacc : 0x221a12);
      }
      if (lampShadeMatRef.current) {
        lampShadeMatRef.current.color.set(next ? 0xfff0dc : 0x4a3a2e);
        lampShadeMatRef.current.emissive = new THREE.Color(next ? 0x332211 : 0x000000);
      }
      if (pouchFrontMatRef.current) {
        pouchFrontMatRef.current.roughness = next ? 0.22 : 0.36;
        pouchFrontMatRef.current.clearcoat = next ? 0.96 : 0.32;
        pouchFrontMatRef.current.clearcoatRoughness = next ? 0.08 : 0.24;
        pouchFrontMatRef.current.specularIntensity = next ? 1.0 : 0.42;
      }
      if (pouchSideMatRef.current) {
        pouchSideMatRef.current.roughness = next ? 0.24 : 0.36;
        pouchSideMatRef.current.clearcoat = next ? 0.85 : 0.32;
        pouchSideMatRef.current.clearcoatRoughness = next ? 0.10 : 0.24;
        pouchSideMatRef.current.specularIntensity = next ? 0.95 : 0.42;
      }
      return next;
    });
  };

  // Toggle Handheld Console between Tea Table and Close-Up Interactive Landscape View
  const handleToggleConsole = (hold: boolean) => {
    isConsoleHeldRef.current = hold;
    setIsConsoleHeld(hold);
    if (!hold) {
      isScreenActiveRef.current = false;
      setIsScreenActive(false);
      activeDpadDirRef.current = 0;
      activeConsoleTouchIdRef.current = null;
      activeConsoleTouchRoleRef.current = null;
      activeConsoleMouseRoleRef.current = null;
    }
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(18); } catch {}
    }
  };

  // Raycast held console controls: Left D-Pad (scroll up/down), Right ABXY (pull rope), or chassis/outside
  const raycastHeldConsole = (
    clientX: number,
    clientY: number
  ): { role: 'dpad_up' | 'dpad_down' | 'abxy' | 'chassis' | 'outside'; btnIdx?: number } => {
    if (!containerRef.current || !cameraRef.current) return { role: 'outside' };
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycasterRef.current.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

    const controlTargets = [
      dpadUpHitboxRef.current,
      dpadDownHitboxRef.current,
      abxyHitboxRef.current,
    ].filter((obj): obj is THREE.Mesh => obj !== null);

    const ctrlHits = raycasterRef.current.intersectObjects(controlTargets, false);
    if (ctrlHits.length > 0) {
      const hit = ctrlHits[0];
      if (hit.object.name === 'dpad_up_hitbox') return { role: 'dpad_up' };
      if (hit.object.name === 'dpad_down_hitbox') return { role: 'dpad_down' };
      if (hit.object.name === 'abxy_hitbox') {
        let closestIdx = 0;
        let minDist = Infinity;
        const tmpWorld = new THREE.Vector3();
        faceButtonMeshesRef.current.forEach((btnMesh, idx) => {
          btnMesh.getWorldPosition(tmpWorld);
          const d = tmpWorld.distanceToSquared(hit.point);
          if (d < minDist) {
            minDist = d;
            closestIdx = idx;
          }
        });
        return { role: 'abxy', btnIdx: closestIdx };
      }
    }

    if (consoleGroupRef.current) {
      const bodyHits = raycasterRef.current.intersectObjects(consoleGroupRef.current.children, true);
      if (bodyHits.length > 0) {
        return { role: 'chassis' };
      }
    }

    return { role: 'outside' };
  };

  // Press D-Pad / ABXY helper (called on touchStart / mouseDown while console is held)
  const triggerHeldControlDown = (
    hit: { role: 'dpad_up' | 'dpad_down' | 'abxy' | 'chassis' | 'outside'; btnIdx?: number }
  ): 'dpad' | 'abxy' | 'chassis' | null => {
    if (hit.role === 'dpad_up' || hit.role === 'dpad_down') {
      activeDpadDirRef.current = hit.role === 'dpad_up' ? -1 : 1;
      dpadPressStartTimeRef.current = performance.now();
      dpadHasScrolledRef.current = false;
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(10); } catch {}
      }
      return 'dpad';
    }
    if (hit.role === 'abxy') {
      abxyPressedTimerRef.current = 0.18;
      pressedFaceBtnIdxRef.current = hit.btnIdx ?? 0;
      desktopIframeRef.current?.contentWindow?.postMessage(
        { type: 'console_pull_rope' },
        window.location.origin
      );
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(18); } catch {}
      }
      return 'abxy';
    }
    if (hit.role === 'chassis') {
      return 'chassis';
    }
    return null;
  };

  const releaseHeldDpad = () => {
    const dir = activeDpadDirRef.current;
    if (dir !== 0 && !dpadHasScrolledRef.current && isScreenActiveRef.current) {
      desktopIframeRef.current?.contentWindow?.postMessage(
        { type: 'console_scroll', deltaY: dir * 240, smooth: true },
        window.location.origin
      );
    }
    activeDpadDirRef.current = 0;
  };

    // Rotate steampunk pointer clockwise on a dial state
    const LOBBY_DIAL_COLORS = [0x65c226, 0x9333ea, 0xeab308, 0x06b6d4] as const; // 草綠色, 紫色, 金色, 青色

    const cycleDialState = (roomState: ExtraRoomDoorState) => {
      const nextIdx = (roomState.colorIdx + 1) % 4;
      roomState.colorIdx = nextIdx;
      roomState.targetAngle -= Math.PI / 2;
      const isSlotActive = roomState.hasColorSlot[nextIdx];
      const activeHex = roomState.colors[nextIdx];

      roomState.sectorMats.forEach((mat, idx) => {
        if (roomState.hasColorSlot[idx]) {
          const isSelected = idx === nextIdx;
          mat.emissiveIntensity = isSelected ? 0.92 : 0.10;
          mat.roughness = isSelected ? 0.16 : 0.34;
        } else {
          mat.emissiveIntensity = 0.01;
          mat.roughness = 0.78;
        }
      });
      roomState.rimGemMats.forEach((mat, idx) => {
        mat.emissiveIntensity = roomState.hasColorSlot[idx] ? (idx === nextIdx ? 1.0 : 0.14) : 0.01;
      });
      if (roomState.tipGemMat) {
        roomState.tipGemMat.color.setHex(activeHex);
        roomState.tipGemMat.emissive.setHex(isSlotActive ? activeHex : 0x050508);
        roomState.tipGemMat.emissiveIntensity = isSlotActive ? 1.0 : 0.02;
      }
      if (roomState.dialLight) {
        roomState.dialLight.color.setHex(isSlotActive ? activeHex : 0x22222c);
        roomState.dialLight.intensity = isSlotActive ? 0.72 : 0.12;
      }
    };

    const handleCyclePortalColor = (dialTarget?: ExtraRoomDoorState) => {
      if (dialTarget) {
        cycleDialState(dialTarget);
      } else if (activeRoomRef.current === 'lobby') {
        const nextIdx = (portalColorIdxRef.current + 1) % 4;
        portalColorIdxRef.current = nextIdx;
        portalTargetAngleRef.current -= Math.PI / 2;
        const activeHex = LOBBY_DIAL_COLORS[nextIdx];

        portalSectorMatsRef.current.forEach((mat, idx) => {
          const isActive = idx === nextIdx;
          mat.emissiveIntensity = isActive ? 0.90 : 0.09;
          mat.roughness = isActive ? 0.16 : 0.36;
        });
        portalRimGemMatsRef.current.forEach((mat, idx) => {
          mat.emissiveIntensity = idx === nextIdx ? 1.0 : 0.12;
        });
        if (portalGemMatRef.current) {
          portalGemMatRef.current.color.setHex(activeHex);
          portalGemMatRef.current.emissive.setHex(activeHex);
        }
        if (portalPointLightRef.current) {
          portalPointLightRef.current.color.setHex(activeHex);
          portalPointLightRef.current.intensity = 0.68;
        }
      } else {
        cycleDialState(extraRoomsRef.current[activeRoomRef.current]);
      }

      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(14); } catch {}
      }
    };

    const ROOM_ATMOSPHERE: Record<
      RoomId,
      {
        name: string;
        floor: '1F' | '2F' | 'B1';
        bgHex: number;
        ambientColor: number;
        ambientIntensity: number;
        hemiSky: number;
        hemiGround: number;
        hemiIntensity: number;
      }
    > = {
      lobby: { name: '大廳', floor: '1F', bgHex: 0x0c0907, ambientColor: 0xffecd6, ambientIntensity: 1.55, hemiSky: 0xfff5ea, hemiGround: 0x6e5a47, hemiIntensity: 0.95 },
      purple: { name: '紫色房間', floor: '1F', bgHex: 0x10081c, ambientColor: 0xd8b4fe, ambientIntensity: 1.65, hemiSky: 0xede0ff, hemiGround: 0x563f73, hemiIntensity: 1.0 },
      green: { name: '綠色房間', floor: '1F', bgHex: 0x081406, ambientColor: 0xbef292, ambientIntensity: 1.65, hemiSky: 0xe2fcd4, hemiGround: 0x456936, hemiIntensity: 1.0 },
      gold: { name: '金色房間', floor: '1F', bgHex: 0x171005, ambientColor: 0xfde68a, ambientIntensity: 1.65, hemiSky: 0xfff3c4, hemiGround: 0x785c28, hemiIntensity: 1.0 },
      cyan: { name: '二樓的門廊', floor: '2F', bgHex: 0x0c0907, ambientColor: 0xffecd6, ambientIntensity: 1.60, hemiSky: 0xfff5ea, hemiGround: 0x5c686e, hemiIntensity: 0.95 },
      cyan_b1: { name: '地下一樓的門廊', floor: 'B1', bgHex: 0x0c0907, ambientColor: 0xffecd6, ambientIntensity: 1.60, hemiSky: 0xfff5ea, hemiGround: 0x5c686e, hemiIntensity: 0.95 },
      royalblue: { name: '寶藍色大廳', floor: '2F', bgHex: 0x0c0907, ambientColor: 0xffecd6, ambientIntensity: 1.60, hemiSky: 0xfff5ea, hemiGround: 0x52607a, hemiIntensity: 0.95 },
      brown: { name: '棕色大廳', floor: '2F', bgHex: 0x0c0907, ambientColor: 0xffecd6, ambientIntensity: 1.60, hemiSky: 0xfff5ea, hemiGround: 0x6e5844, hemiIntensity: 0.95 },
    };

    // Switch behind-the-door room seamlessly across 1F, 2F & B1 rooms
    const handleEnterPortalRoom = (
      targetRoom: RoomId,
      spawnView: 'table' | 'door' | 'door2' = 'door'
    ) => {
      if (portalSwapTimeoutRef.current !== null) window.clearTimeout(portalSwapTimeoutRef.current);
      if (portalFadeEndTimeoutRef.current !== null) window.clearTimeout(portalFadeEndTimeoutRef.current);

      if (portalVeilRef.current) {
        portalVeilRef.current.style.opacity = '0.94';
      }
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate([16, 40, 22]); } catch {}
      }

      portalSwapTimeoutRef.current = window.setTimeout(() => {
        const isLobby = targetRoom === 'lobby';
        activeRoomRef.current = targetRoom;
        setActiveRoom(targetRoom);

        if (lobbyRoomGroupRef.current) lobbyRoomGroupRef.current.visible = isLobby;
        if (consoleSceneRef.current) consoleSceneRef.current.visible = isLobby;
        (['purple', 'green', 'gold', 'cyan', 'cyan_b1', 'royalblue', 'brown'] as const).forEach((roomId) => {
          const rg = extraRoomsRef.current[roomId].roomGroup;
          if (rg) rg.visible = targetRoom === roomId;
        });

        const atmo = ROOM_ATMOSPHERE[targetRoom];
        if (sceneRef.current) {
          sceneRef.current.background = new THREE.Color(atmo.bgHex);
          sceneRef.current.fog = new THREE.FogExp2(atmo.bgHex, 0.008);
        }
        if (ambientLightRef.current) {
          ambientLightRef.current.color.setHex(atmo.ambientColor);
          ambientLightRef.current.intensity = atmo.ambientIntensity;
        }
        if (hemiLightRef.current) {
          hemiLightRef.current.color.setHex(atmo.hemiSky);
          hemiLightRef.current.groundColor.setHex(atmo.hemiGround);
          hemiLightRef.current.intensity = atmo.hemiIntensity;
        }

        viewLocationRef.current = spawnView;
        setViewLocation(spawnView);
        if (spawnView === 'table') {
          playerPosRef.current.set(0, SEATED_HEIGHT, SEATED_Z);
          targetYawRef.current = CENTER_YAW;
          cameraYawRef.current = CENTER_YAW;
        } else if (spawnView === 'door2') {
          playerPosRef.current.set(5.12, 1.28, -1.5);
          targetYawRef.current = -Math.PI / 2;
          cameraYawRef.current = -Math.PI / 2;
        } else {
          playerPosRef.current.set(-3.65, 1.28, -1.62);
          targetYawRef.current = CENTER_YAW;
          cameraYawRef.current = CENTER_YAW;
        }
        targetPitchRef.current = 0;
        cameraPitchRef.current = 0;

        portalFadeEndTimeoutRef.current = window.setTimeout(() => {
          if (portalVeilRef.current) {
            portalVeilRef.current.style.opacity = '0';
          }
        }, 60);
      }, 180);
    };
    enterPortalRoomRef.current = handleEnterPortalRoom;

    // Raycast tap handler: Dial spin, Portal Door room swap, Console pickup & Table Lamp toggle
    const handleSceneTap = (clientX: number, clientY: number): boolean => {
      if (isCyanFloorDialogOpenRef.current) {
        return false;
      }
      if (isConsoleHeldRef.current) {
        const hit = raycastHeldConsole(clientX, clientY);
        if (hit.role === 'outside') {
          handleToggleConsole(false);
          return true;
        }
        return false;
      }

      if (!containerRef.current || !cameraRef.current) return false;
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(new THREE.Vector2(x, y), cameraRef.current);

      const triggerLockedRattle = () => {
        doorRattleTimerRef.current = 0.35;
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try { navigator.vibrate([12, 30, 12]); } catch {}
        }
      };

      const currentRoom = activeRoomRef.current;

      // 1. Check active room's circular steampunk dial(s) FIRST (mounted on front of door)
      if (currentRoom === 'lobby') {
        if (portalHitboxRef.current && raycasterRef.current.intersectObject(portalHitboxRef.current, false).length > 0) {
          handleCyclePortalColor();
          return true;
        }
      } else if (currentRoom === 'cyan' || currentRoom === 'cyan_b1') {
        const foyerDials = [
          extraRoomsRef.current[currentRoom],
          currentRoom === 'cyan' ? cyanFarDoorRef.current : cyanB1FarDoorRef.current,
        ];
        for (const ds of foyerDials) {
          if (ds.dialHitbox && raycasterRef.current.intersectObject(ds.dialHitbox, false).length > 0) {
            handleCyclePortalColor(ds);
            return true;
          }
        }
      } else {
        const dialHitbox = extraRoomsRef.current[currentRoom].dialHitbox;
        if (dialHitbox && raycasterRef.current.intersectObject(dialHitbox, false).length > 0) {
          handleCyclePortalColor();
          return true;
        }
      }

      // 2. Check active room's portal door click: swap room behind door if pointer color matches
      if (currentRoom === 'lobby') {
        if (lobbyDoorHitboxRef.current && raycasterRef.current.intersectObject(lobbyDoorHitboxRef.current, false).length > 0) {
          const lobbyDestinationByColorIdx: Record<number, ExtraRoomId | undefined> = {
            0: 'green',  // 草綠色 -> 綠色房間
            1: 'purple', // 紫色 -> 紫色房間
            2: 'gold',   // 金色 -> 金色房間
            3: 'cyan',   // 青色 -> 跳出「上樓」(2F門廊) / 「下樓」(B1門廊) 對話框
          };
          const dest = lobbyDestinationByColorIdx[portalColorIdxRef.current];
          if (dest === 'cyan') {
            isCyanFloorDialogOpenRef.current = true;
            setIsCyanFloorDialogOpen(true);
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              try { navigator.vibrate(14); } catch {}
            }
          } else if (dest) {
            handleEnterPortalRoom(dest, 'door');
          } else {
            triggerLockedRattle();
          }
          return true;
        }
      } else if (currentRoom === 'cyan') {
        const nearDoor = extraRoomsRef.current.cyan;
        const farDoor = cyanFarDoorRef.current;
        if (nearDoor.doorHitbox && raycasterRef.current.intersectObject(nearDoor.doorHitbox, false).length > 0) {
          // Near door (12m wall): only Left (idx 3) is Cyan -> returns to Lobby; others are Black
          if (nearDoor.colorIdx === 3) {
            handleEnterPortalRoom('lobby', 'door');
          } else {
            triggerLockedRattle();
          }
          return true;
        }
        if (farDoor.doorHitbox && raycasterRef.current.intersectObject(farDoor.doorHitbox, false).length > 0) {
          // Far door (4m end wall): Top (0)=寶藍色, Right (1)=棕色 -> 複製「大廳邏輯」空大廳; Bottom/Left=黑色
          if (farDoor.colorIdx === 0) {
            handleEnterPortalRoom('royalblue', 'table');
          } else if (farDoor.colorIdx === 1) {
            handleEnterPortalRoom('brown', 'table');
          } else {
            triggerLockedRattle();
          }
          return true;
        }
      } else if (currentRoom === 'cyan_b1') {
        const nearDoor = extraRoomsRef.current.cyan_b1;
        const farDoor = cyanB1FarDoorRef.current;
        if (nearDoor.doorHitbox && raycasterRef.current.intersectObject(nearDoor.doorHitbox, false).length > 0) {
          // Near door (12m wall): Top (0)=深橘色, Left (3)=青色 -> returns to Lobby; Right/Bottom=黑色
          if (nearDoor.colorIdx === 3) {
            handleEnterPortalRoom('lobby', 'door');
          } else {
            triggerLockedRattle();
          }
          return true;
        }
        if (farDoor.doorHitbox && raycasterRef.current.intersectObject(farDoor.doorHitbox, false).length > 0) {
          // Far door (4m end wall): Top (0)=深湖藍紫色, Right/Bottom/Left=黑色
          triggerLockedRattle();
          return true;
        }
      } else if (currentRoom === 'royalblue' || currentRoom === 'brown') {
        const doorHitbox = extraRoomsRef.current[currentRoom].doorHitbox;
        if (doorHitbox && raycasterRef.current.intersectObject(doorHitbox, false).length > 0) {
          // Top (idx 0) is Silver -> returns directly to 二樓的門廊 facing Door 2
          if (extraRoomsRef.current[currentRoom].colorIdx === 0) {
            handleEnterPortalRoom('cyan', 'door2');
          } else {
            triggerLockedRattle();
          }
          return true;
        }
      } else {
        const doorHitbox = extraRoomsRef.current[currentRoom].doorHitbox;
        if (doorHitbox && raycasterRef.current.intersectObject(doorHitbox, false).length > 0) {
          if (extraRoomsRef.current[currentRoom].colorIdx === 0) {
            handleEnterPortalRoom('lobby', 'door');
          } else {
            triggerLockedRattle();
          }
          return true;
        }
      }

      if (activeRoomRef.current === 'lobby' && viewLocationRef.current === 'table') {
        // 3. Check Blue-Violet Handheld Console tap first
        if (consoleGroupRef.current) {
          const consoleHits = raycasterRef.current.intersectObjects(consoleGroupRef.current.children, true);
          if (consoleHits.length > 0) {
            handleToggleConsole(true);
            return true;
          }
        }

        // 4. Check Table Lamp tap
        if (lampGroupRef.current) {
          const lampHits = raycasterRef.current.intersectObjects(lampGroupRef.current.children, true);
          if (lampHits.length > 0) {
            handleToggleLamp();
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              try { navigator.vibrate(18); } catch {}
            }
            return true;
          }
        }
      }

      return false;
    };

  // Helper: normalize yaw into [-PI, PI] so returning to door takes the shortest turn
  const normalizeCurrentYaw = () => {
    const twoPi = Math.PI * 2;
    cameraYawRef.current = (((cameraYawRef.current + Math.PI) % twoPi) + twoPi) % twoPi - Math.PI;
  };

  // Move smoothly inside Lobby (tea table, door, cabinet)
  const handleToggleViewLocation = (target: 'door' | 'cabinet') => {
    if (isCyanFloorDialogOpenRef.current) {
      isCyanFloorDialogOpenRef.current = false;
      setIsCyanFloorDialogOpen(false);
    }
    if (isConsoleHeldRef.current) {
      handleToggleConsole(false);
    }
    normalizeCurrentYaw();
    const next: 'table' | 'cabinet' | 'door' | 'door2' | 'center' =
      viewLocationRef.current === target ? 'table' : target;
    viewLocationRef.current = next;
    setViewLocation(next);
    targetYawRef.current = CENTER_YAW;
    targetPitchRef.current = 0;
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(15); } catch {}
    }
  };

  // Close or confirm the 1F Lobby Cyan door floor-choice dialog
  const handleCloseCyanFloorDialog = () => {
    isCyanFloorDialogOpenRef.current = false;
    setIsCyanFloorDialogOpen(false);
  };

  const handleSelectCyanFloor = (targetFoyer: 'cyan' | 'cyan_b1') => {
    isCyanFloorDialogOpenRef.current = false;
    setIsCyanFloorDialogOpen(false);
    enterPortalRoomRef.current?.(targetFoyer, 'door');
  };

  // Move smoothly inside non-lobby rooms:
  // - Cyan Foyers (2F / B1) swap between the two doors
  // - Royalblue & Brown 2F Lobby-logic rooms toggle between center round table and door
  // - Other 7x7 rooms toggle between door and center
  const handleToggleRoomCenterOrDoor = () => {
    normalizeCurrentYaw();
    if (isFoyerRoom(activeRoomRef.current)) {
      const next: 'door' | 'door2' = viewLocationRef.current === 'door2' ? 'door' : 'door2';
      viewLocationRef.current = next;
      setViewLocation(next);
      targetYawRef.current = next === 'door2' ? -Math.PI / 2 : CENTER_YAW;
      targetPitchRef.current = 0;
    } else if (activeRoomRef.current === 'royalblue' || activeRoomRef.current === 'brown') {
      const next: 'table' | 'door' = viewLocationRef.current === 'door' ? 'table' : 'door';
      viewLocationRef.current = next;
      setViewLocation(next);
      targetYawRef.current = CENTER_YAW;
      targetPitchRef.current = 0;
    } else {
      const next: 'door' | 'center' = viewLocationRef.current === 'center' ? 'door' : 'center';
      viewLocationRef.current = next;
      setViewLocation(next);
      targetYawRef.current = CENTER_YAW;
      targetPitchRef.current = 0;
    }
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(15); } catch {}
    }
  };

  // Apply look rotation: Lobby-style rooms (lobby, royalblue, brown) preserve T-shape bounds;
  // Cyan Foyers (2F & B1) lock camera angle; other rooms allow 360° horizontal + slight vertical
  const applyLookDelta = (deltaX: number, deltaY: number, sensitivity: number) => {
    if (isFoyerRoom(activeRoomRef.current) || isCyanFloorDialogOpenRef.current) {
      return;
    }
    targetYawRef.current -= deltaX * sensitivity;
    targetPitchRef.current -= deltaY * sensitivity;

    if (isLobbyStyleRoom(activeRoomRef.current)) {
      const yawHalf = getYawRangeHalf();
      targetYawRef.current = THREE.MathUtils.clamp(
        targetYawRef.current,
        CENTER_YAW - yawHalf,
        CENTER_YAW + yawHalf
      );
      targetPitchRef.current = THREE.MathUtils.clamp(targetPitchRef.current, MIN_PITCH, MAX_PITCH);
    } else {
      const OTHER_MIN_PITCH = (-14 * Math.PI) / 180;
      const OTHER_MAX_PITCH = (14 * Math.PI) / 180;
      targetPitchRef.current = THREE.MathUtils.clamp(
        targetPitchRef.current,
        OTHER_MIN_PITCH,
        OTHER_MAX_PITCH
      );
    }
  };

  // --- TOUCH HANDLERS (T-SHAPE IN LOBBY, 360° IN OTHER ROOMS + TAP INTERACTION) ---
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    lastTouchTimeRef.current = performance.now();
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      touchStartPos.current = { x: touch.clientX, y: touch.clientY };
      touchStartTime.current = performance.now();
      touchHasMoved.current = false;

      if (isConsoleHeldRef.current && isScreenActiveRef.current) {
        const hit = raycastHeldConsole(touch.clientX, touch.clientY);
        const role = triggerHeldControlDown(hit);
        if (role) {
          activeConsoleTouchIdRef.current = touch.identifier;
          activeConsoleTouchRoleRef.current = role;
          lookTouchIdRef.current = null;
          return;
        }
      }

      lookLastPosRef.current = { x: touch.clientX, y: touch.clientY };
      lookTouchIdRef.current = touch.identifier;
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    lastTouchTimeRef.current = performance.now();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === lookTouchIdRef.current) {
        const dx = touch.clientX - touchStartPos.current.x;
        const dy = touch.clientY - touchStartPos.current.y;
        if (Math.hypot(dx, dy) > 8) {
          touchHasMoved.current = true;
        }

        if (!isConsoleHeldRef.current) {
          const deltaX = touch.clientX - lookLastPosRef.current.x;
          const deltaY = touch.clientY - lookLastPosRef.current.y;
          lookLastPosRef.current = { x: touch.clientX, y: touch.clientY };
          applyLookDelta(deltaX, deltaY, 0.0032);
        }
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    lastTouchTimeRef.current = performance.now();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === activeConsoleTouchIdRef.current) {
        if (activeConsoleTouchRoleRef.current === 'dpad') {
          releaseHeldDpad();
        }
        activeConsoleTouchIdRef.current = null;
        activeConsoleTouchRoleRef.current = null;
        continue;
      }
      if (touch.identifier === lookTouchIdRef.current) {
        const duration = performance.now() - touchStartTime.current;
        if (!touchHasMoved.current && duration < 400) {
          handleSceneTap(touch.clientX, touch.clientY);
        }
        lookTouchIdRef.current = null;
      }
    }
  };

  // --- DESKTOP MOUSE LOOK + CONSOLE CONTROLS/LAMP CLICK ---
  const handleMouseDown = (e: React.MouseEvent) => {
    if (performance.now() - lastTouchTimeRef.current < 600) return;
    mouseStartPos.current = { x: e.clientX, y: e.clientY };
    mouseStartTime.current = performance.now();
    mouseHasMoved.current = false;
    mouseLastPosRef.current = { x: e.clientX, y: e.clientY };

    if (isConsoleHeldRef.current && isScreenActiveRef.current) {
      const hit = raycastHeldConsole(e.clientX, e.clientY);
      const role = triggerHeldControlDown(hit);
      if (role) {
        activeConsoleMouseRoleRef.current = role;
        isMouseDownRef.current = false;
        return;
      }
    }

    activeConsoleMouseRoleRef.current = null;
    isMouseDownRef.current = true;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (performance.now() - lastTouchTimeRef.current < 600) return;
    const dx = e.clientX - mouseStartPos.current.x;
    const dy = e.clientY - mouseStartPos.current.y;
    if (Math.hypot(dx, dy) > 6) {
      mouseHasMoved.current = true;
    }

    if (!isConsoleHeldRef.current && isMouseDownRef.current) {
      const deltaX = e.clientX - mouseLastPosRef.current.x;
      const deltaY = e.clientY - mouseLastPosRef.current.y;
      mouseLastPosRef.current = { x: e.clientX, y: e.clientY };
      applyLookDelta(deltaX, deltaY, 0.0026);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (performance.now() - lastTouchTimeRef.current < 600) return;
    if (activeConsoleMouseRoleRef.current) {
      if (activeConsoleMouseRoleRef.current === 'dpad') {
        releaseHeldDpad();
      }
      activeConsoleMouseRoleRef.current = null;
      return;
    }
    isMouseDownRef.current = false;
    const duration = performance.now() - mouseStartTime.current;
    if (!mouseHasMoved.current && duration < 400) {
      handleSceneTap(e.clientX, e.clientY);
    }
  };

  const handleMouseLeave = () => {
    isMouseDownRef.current = false;
    if (activeConsoleMouseRoleRef.current === 'dpad') {
      releaseHeldDpad();
    }
    activeConsoleMouseRoleRef.current = null;
  };

  return (
    <div 
      className={`absolute inset-0 w-full h-full select-none overflow-hidden bg-[#0c0907] ${
        isConsoleHeld ? '' : 'touch-none'
      }`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      {/* 3D WebGL Canvas */}
      <div 
        ref={containerRef} 
        className={`absolute inset-0 w-full h-full touch-none ${
          isConsoleHeld
            ? 'cursor-pointer'
            : isFoyerRoom(activeRoom)
              ? 'cursor-default'
              : 'cursor-grab active:cursor-grabbing'
        }`} 
      />

      {/* Live Touch-Interactive 16:9 Original Desktop Website Overlay on Console Screen */}
      {isConsoleHeld && (
        <div
          ref={screenOverlayRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 1600,
            height: 900,
            transformOrigin: 'center center',
            zIndex: 25,
            opacity: isScreenActive ? 1 : 0,
            pointerEvents: isScreenActive ? 'auto' : 'none',
            touchAction: 'auto',
            transition: 'opacity 180ms ease-out',
          }}
          className="overflow-hidden bg-[#001B3D] rounded-[8px] shadow-[0_0_24px_rgba(0,0,0,0.6)]"
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseMove={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
        >
          <iframe
            ref={desktopIframeRef}
            src={desktopEmbedUrl}
            title="保持可愛漫研社 電腦版網站"
            width={1600}
            height={900}
            className="w-[1600px] h-[900px] border-0 block"
            style={{ touchAction: 'auto' }}
          />
        </div>
      )}

      {/* Center Subtle Focus Ring */}
      {!isConsoleHeld && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-25">
          <div className="w-2.5 h-2.5 rounded-full border border-amber-300/70 bg-white/15 shadow-sm" />
        </div>
      )}

      {/* Portal Door Room-Switch Cross-Dissolve Veil */}
      <div
        ref={portalVeilRef}
        style={{ opacity: 0, transition: 'opacity 180ms ease-in-out' }}
        className="absolute inset-0 z-40 bg-[#0b0712] pointer-events-none"
      />

      {/* Bottom-Right Navigation Buttons */}
      {!isConsoleHeld && activeRoom === 'lobby' && (
        <div className="absolute bottom-5 right-5 z-30 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleViewLocation('door');
            }}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            className="px-4 py-2.5 rounded-lg bg-[#1c110a]/90 border border-amber-500/45 text-amber-100 text-sm font-medium tracking-wide shadow-[0_4px_16px_rgba(0,0,0,0.55)] hover:bg-[#2a1a10] hover:border-amber-400/75 active:scale-95 transition-all cursor-pointer select-none"
          >
            {viewLocation === 'door' ? '回到茶几前面' : '去門前'}
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleViewLocation('cabinet');
            }}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            className="px-4 py-2.5 rounded-lg bg-[#1c110a]/90 border border-amber-500/45 text-amber-100 text-sm font-medium tracking-wide shadow-[0_4px_16px_rgba(0,0,0,0.55)] hover:bg-[#2a1a10] hover:border-amber-400/75 active:scale-95 transition-all cursor-pointer select-none"
          >
            {viewLocation === 'cabinet' ? '回到茶几前面' : '去櫃子前面'}
          </button>
        </div>
      )}

      {/* 1F Lobby Cyan Portal Door Floor-Choice Dialog (上樓 / 下樓) */}
      {!isConsoleHeld && activeRoom === 'lobby' && isCyanFloorDialogOpen && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/55 backdrop-blur-[2px] p-4"
          onClick={(e) => {
            e.stopPropagation();
            handleCloseCyanFloorDialog();
          }}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseMove={(e) => e.stopPropagation()}
          onMouseUp={(e) => e.stopPropagation()}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="選擇前往樓層"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[300px] rounded-2xl bg-[#160e09]/95 border border-cyan-400/50 p-5 text-center shadow-[0_20px_50px_rgba(0,0,0,0.8)]"
          >
            <p className="text-xs font-medium tracking-[0.18em] text-cyan-300/80 mb-1">
              青色傳送門
            </p>
            <h2 className="text-base font-semibold text-amber-50 tracking-wide mb-4">
              請選擇前往樓層
            </h2>
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => handleSelectCyanFloor('cyan')}
                className="w-full py-3 px-4 rounded-xl bg-[#0b2530] border border-cyan-400/60 text-cyan-50 text-sm font-semibold tracking-wider shadow-[0_4px_14px_rgba(6,182,212,0.18)] hover:bg-[#113747] hover:border-cyan-300 active:scale-95 transition-all cursor-pointer select-none flex items-center justify-between"
              >
                <span>上樓</span>
                <span className="text-xs font-normal text-cyan-200/80">2F 門廊</span>
              </button>
              <button
                type="button"
                onClick={() => handleSelectCyanFloor('cyan_b1')}
                className="w-full py-3 px-4 rounded-xl bg-[#0b2530] border border-cyan-400/60 text-cyan-50 text-sm font-semibold tracking-wider shadow-[0_4px_14px_rgba(6,182,212,0.18)] hover:bg-[#113747] hover:border-cyan-300 active:scale-95 transition-all cursor-pointer select-none flex items-center justify-between"
              >
                <span>下樓</span>
                <span className="text-xs font-normal text-cyan-200/80">B1 門廊</span>
              </button>
              <button
                type="button"
                onClick={handleCloseCyanFloorDialog}
                className="mt-1 w-full py-2 px-4 rounded-lg bg-transparent border border-amber-500/25 text-amber-200/75 text-xs tracking-wider hover:bg-white/5 hover:text-amber-100 active:scale-95 transition-all cursor-pointer select-none"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Non-Lobby Rooms Bottom-Right Button */}
      {!isConsoleHeld && activeRoom !== 'lobby' && (
        <div className="absolute bottom-5 right-5 z-30 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleRoomCenterOrDoor();
            }}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseUp={(e) => e.stopPropagation()}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium tracking-wide shadow-[0_4px_16px_rgba(0,0,0,0.55)] active:scale-95 transition-all cursor-pointer select-none border ${
              activeRoom === 'green'
                ? 'bg-[#0f1f0c]/90 border-lime-400/50 text-lime-100 hover:bg-[#193314] hover:border-lime-300/80'
                : activeRoom === 'gold'
                  ? 'bg-[#241907]/90 border-amber-400/55 text-amber-100 hover:bg-[#38270c] hover:border-amber-300/85'
                  : isFoyerRoom(activeRoom)
                    ? 'bg-[#081c24]/90 border-cyan-400/55 text-cyan-100 hover:bg-[#0e2d3a] hover:border-cyan-300/85'
                    : activeRoom === 'royalblue'
                      ? 'bg-[#0c1633]/90 border-blue-400/55 text-blue-100 hover:bg-[#14234f] hover:border-blue-300/85'
                      : activeRoom === 'brown'
                        ? 'bg-[#21150b]/90 border-amber-600/55 text-amber-100 hover:bg-[#332011] hover:border-amber-500/85'
                        : 'bg-[#1b1028]/90 border-purple-400/50 text-purple-100 hover:bg-[#29173d] hover:border-purple-300/80'
            }`}
          >
            {isFoyerRoom(activeRoom)
              ? '去另一邊的門'
              : activeRoom === 'royalblue' || activeRoom === 'brown'
                ? viewLocation === 'door'
                  ? '回到圓桌前面'
                  : '去門前'
                : viewLocation === 'center'
                  ? '去門前'
                  : '去房間正中央'}
          </button>
        </div>
      )}
    </div>
  );
};

