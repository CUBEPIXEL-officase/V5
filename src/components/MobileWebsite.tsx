import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  DoorClosed, 
  Compass, 
  RotateCcw, 
  ChevronRight, 
  X, 
  Volume2, 
  VolumeX, 
  Users, 
  Calendar, 
  Target, 
  Share2, 
  Handshake, 
  Heart, 
  ShieldAlert,
  ArrowRight,
  Footprints,
  Box
} from 'lucide-react';
import { Room3DScene } from './Room3DScene';

const LOGO_URL = "/assets/aistudio/____-removebg-preview_d70a7f72.png";
const FALLBACK_LOGO_URL = "/images/logo.png";

// Sound synthesizer via Web Audio API (safe, no external assets required)
class AudioEffects {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private initCtx() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  // Soft rhythmic footstep sound
  playFootstep() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(65 + Math.random() * 15, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.08);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(120, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch {
      // Audio might be blocked by browser policy
    }
  }

  // Metallic knob turn and click
  playKnobTurn() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;

      // Metallic friction
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(780, now + 0.12);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);

      // Latch click
      const clickOsc = this.ctx.createOscillator();
      const clickGain = this.ctx.createGain();
      clickOsc.type = 'triangle';
      clickOsc.frequency.setValueAtTime(1200, now + 0.12);
      clickOsc.frequency.exponentialRampToValueAtTime(150, now + 0.18);

      clickGain.gain.setValueAtTime(0.09, now + 0.12);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      clickOsc.connect(clickGain);
      clickGain.connect(this.ctx.destination);
      clickOsc.start(now + 0.12);
      clickOsc.stop(now + 0.22);
    } catch {}
  }

  // Wooden door creak swing open
  playDoorCreak() {
    if (!this.enabled) return;
    try {
      this.initCtx();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.linearRampToValueAtTime(260, now + 0.2);
      osc.frequency.linearRampToValueAtTime(140, now + 0.45);

      gain.gain.setValueAtTime(0.03, now);
      gain.gain.linearRampToValueAtTime(0.05, now + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.5);
    } catch {}
  }
}

const sfx = new AudioEffects();

// Realistic Spherical Doorknob Lock Component (喇叭鎖)
interface RoundDoorLockProps {
  isKnobTurned: boolean;
  onKnobClick?: () => void;
  interactive?: boolean;
}

const RoundDoorLock: React.FC<RoundDoorLockProps> = ({ isKnobTurned, onKnobClick, interactive = true }) => {
  return (
    <div 
      className={`relative select-none flex items-center justify-center ${interactive ? 'cursor-pointer group' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        if (onKnobClick) onKnobClick();
      }}
      title="喇叭鎖 (點擊旋轉開門)"
    >
      {/* 1. Outer Rosette / Escutcheon Plate (喇叭鎖圓形護蓋底座) */}
      <div 
        className="w-14 h-14 rounded-full relative flex items-center justify-center shadow-[2px_4px_10px_rgba(0,0,0,0.6)]"
        style={{
          background: 'radial-gradient(circle at 35% 30%, #FFEBAA 0%, #D4AF37 45%, #8A6A1C 80%, #3D2B03 100%)',
          boxShadow: 'inset 1px 1px 2px rgba(255,255,255,0.7), inset -1px -1px 3px rgba(0,0,0,0.8), 2px 3px 8px rgba(0,0,0,0.7)',
        }}
      >
        {/* Rosette Concentric Chamfer Ring */}
        <div 
          className="w-12 h-12 rounded-full border border-[#FFF2B2]/60 shadow-[inset_0_0_4px_rgba(0,0,0,0.6)] flex items-center justify-center"
          style={{
            background: 'radial-gradient(circle at 40% 35%, #F0CB5B 0%, #C99B28 50%, #6E5312 95%)',
          }}
        >
          {/* Subtle Rosette Screw Heads */}
          <div className="absolute top-1.5 w-1 h-1 rounded-full bg-[#4A380C] shadow-inner" />
          <div className="absolute bottom-1.5 w-1 h-1 rounded-full bg-[#4A380C] shadow-inner" />

          {/* 2. Cylindrical Neck / Stem (喇叭鎖頸部) */}
          <div 
            className="w-6 h-6 rounded-full relative flex items-center justify-center shadow-md"
            style={{
              background: 'linear-gradient(135deg, #FFE89E 0%, #B88924 50%, #4D3809 100%)',
            }}
          >
            {/* 3. The Spherical Round Knob (經典圓形球狀握把) */}
            <motion.div 
              animate={{ 
                rotate: isKnobTurned ? 38 : 0,
                scale: isKnobTurned ? 0.96 : 1
              }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="w-10 h-10 rounded-full relative flex items-center justify-center transition-transform"
              style={{
                // 3D Spherical metallic brass radial highlight
                background: 'radial-gradient(circle at 32% 28%, #FFFFFF 0%, #FFF3BF 15%, #E5BD45 42%, #B5841D 70%, #523908 95%)',
                boxShadow: `
                  3px 4px 10px rgba(0,0,0,0.65),
                  inset -2px -3px 6px rgba(45,30,5,0.7),
                  inset 2px 2px 5px rgba(255,255,255,0.85)
                `,
              }}
            >
              {/* Spherical Specular Light Glint */}
              <div 
                className="absolute top-1.5 left-2 w-3.5 h-2 rounded-full bg-white/70 blur-[0.6px] transform -rotate-25 pointer-events-none" 
              />
              <div 
                className="absolute bottom-1.5 right-2 w-2.5 h-1.5 rounded-full bg-amber-200/30 blur-[1px] pointer-events-none" 
              />

              {/* 4. Center Keyhole Cylinder / Push Button Core (中央鎖心與鑰匙孔) */}
              <div 
                className="w-4 h-4 rounded-full relative flex items-center justify-center border border-[#966E16]/80 shadow-inner"
                style={{
                  background: 'radial-gradient(circle at 35% 35%, #FCE390 0%, #A87C1D 65%, #3B2A06 100%)',
                  boxShadow: 'inset 1px 1px 2px rgba(0,0,0,0.8), inset -0.5px -0.5px 1px rgba(255,255,255,0.4)',
                }}
              >
                {/* Traditional Vertical Keyhole Groove (垂直鑰匙槽孔) */}
                <div className="flex flex-col items-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#1A1203] shadow-inner" />
                  <div className="w-0.5 h-1.5 bg-[#140D02] rounded-b-sm -mt-0.5 shadow-inner" />
                </div>
              </div>

              {/* Knob Grip Knurl / Subtle Texture Rings */}
              <div className="absolute inset-0 rounded-full border border-amber-300/30 pointer-events-none" />
            </motion.div>
          </div>
        </div>
      </div>

      {/* Pulsing Aura Indicator when reaching door */}
      {interactive && !isKnobTurned && (
        <span className="absolute -inset-2 rounded-full border-2 border-amber-400/60 animate-ping pointer-events-none opacity-40" />
      )}
    </div>
  );
};

// Single-Leaf Door Panel Component (單扇門板)
interface SingleDoorPanelProps {
  isDoorOpen: boolean;
  isKnobTurned: boolean;
  onKnobClick?: () => void;
  interactive?: boolean;
}

const SingleDoorPanel: React.FC<SingleDoorPanelProps> = ({ 
  isDoorOpen, 
  isKnobTurned, 
  onKnobClick,
  interactive = true 
}) => {
  return (
    <div 
      className="relative select-none"
      style={{
        perspective: '1200px',
        transformStyle: 'preserve-3d',
      }}
    >
      {/* Outer Door Frame Casing (門框) */}
      <div 
        className="relative p-2.5 rounded-t-lg bg-[#1F1713] border-t-2 border-x-2 border-[#4A372D] shadow-[0_20px_60px_rgba(0,0,0,0.9)]"
        style={{
          boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.1), 0 15px 45px rgba(0,0,0,0.8)',
        }}
      >
        {/* Door Sill (門檻陰影與地板線) */}
        <div className="absolute -bottom-2.5 left-0 right-0 h-2.5 bg-[#140E0B] border-t border-[#3B2C24]" />

        {/* Interior Void Light Beam Behind Door (開門時從門後透出的奇幻聖光) */}
        <div 
          className="absolute inset-2.5 overflow-hidden rounded-t pointer-events-none"
          style={{
            background: isDoorOpen 
              ? 'radial-gradient(ellipse at 50% 50%, rgba(255,235,170,0.95) 0%, rgba(244,114,182,0.8) 40%, rgba(99,102,241,0.6) 80%, rgba(15,23,42,0.9) 100%)' 
              : 'rgba(5, 10, 20, 0.95)',
            boxShadow: isDoorOpen ? '0 0 80px rgba(251,191,36,0.9), inset 0 0 50px rgba(255,255,255,0.8)' : 'none',
            transition: 'all 0.8s ease-out'
          }}
        >
          {isDoorOpen && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1.1 }}
              transition={{ duration: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 bg-gradient-to-t from-pink-500/20 via-transparent to-amber-300/30"
            >
              <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-2xl animate-pulse">
                <Sparkles className="w-8 h-8 text-amber-300" />
              </div>
            </motion.div>
          )}
        </div>

        {/* The Single Door Leaf (單扇門板本體) */}
        <motion.div
          animate={{
            rotateY: isDoorOpen ? -78 : 0,
            x: isDoorOpen ? -4 : 0,
          }}
          transition={{
            duration: 1.1,
            ease: [0.25, 1, 0.5, 1],
          }}
          style={{
            transformOrigin: 'left center',
            transformStyle: 'preserve-3d',
          }}
          className="relative w-56 h-[420px] sm:w-64 sm:h-[480px] rounded-t flex flex-col justify-between p-3.5 shadow-2xl border border-[#443328]"
        >
          {/* Rich Wood Grain & Finish (深邃深褐紫木紋質地) */}
          <div 
            className="absolute inset-0 rounded-t"
            style={{
              background: `
                linear-gradient(180deg, #33241C 0%, #251A14 50%, #1A120E 100%)
              `,
              boxShadow: `
                inset 1px 1px 2px rgba(255,255,255,0.15),
                inset -2px -2px 4px rgba(0,0,0,0.8)
              `,
            }}
          />

          {/* Door Hinges on the Left Edge (左側金屬鉸鏈) */}
          <div className="absolute left-0 top-10 -translate-x-1.5 w-2 h-7 rounded-sm bg-gradient-to-r from-[#D4AF37] to-[#5C450F] shadow-md border-y border-[#FFEAA7]" />
          <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1.5 w-2 h-7 rounded-sm bg-gradient-to-r from-[#D4AF37] to-[#5C450F] shadow-md border-y border-[#FFEAA7]" />
          <div className="absolute left-0 bottom-10 -translate-x-1.5 w-2 h-7 rounded-sm bg-gradient-to-r from-[#D4AF37] to-[#5C450F] shadow-md border-y border-[#FFEAA7]" />

          {/* Upper Recessed Panel (上部古典凹槽門板) */}
          <div 
            className="relative z-10 w-full h-[44%] rounded border border-[#140E0B] p-2 flex flex-col justify-between"
            style={{
              background: 'linear-gradient(180deg, #2A1D16 0%, #1D1410 100%)',
              boxShadow: 'inset 2px 3px 6px rgba(0,0,0,0.85), inset -1px -1px 2px rgba(255,255,255,0.08), 1px 1px 2px rgba(255,255,255,0.06)',
            }}
          >
            {/* Inner Molding Rim */}
            <div 
              className="w-full h-full rounded border border-[#3E2D23]/80 p-2 flex items-center justify-center relative"
              style={{
                boxShadow: 'inset 1px 1px 3px rgba(0,0,0,0.7)',
              }}
            >
              {/* Subtle Brand Emblem in Door Top Panel */}
              <div className="text-center opacity-30 select-none pointer-events-none">
                <span className="text-[10px] font-mono tracking-[0.3em] text-amber-200/80 block uppercase">
                  CUBE PIXEL
                </span>
                <span className="text-[8px] font-serif text-amber-100/60 block mt-0.5">
                  紡塊像素
                </span>
              </div>
            </div>
          </div>

          {/* Lower Recessed Panel (下部古典凹槽門板) */}
          <div 
            className="relative z-10 w-full h-[48%] rounded border border-[#140E0B] p-2"
            style={{
              background: 'linear-gradient(180deg, #2A1D16 0%, #18100C 100%)',
              boxShadow: 'inset 2px 3px 6px rgba(0,0,0,0.85), inset -1px -1px 2px rgba(255,255,255,0.08), 1px 1px 2px rgba(255,255,255,0.06)',
            }}
          >
            <div 
              className="w-full h-full rounded border border-[#3E2D23]/80 flex items-center justify-center"
              style={{
                boxShadow: 'inset 1px 1px 3px rgba(0,0,0,0.7)',
              }}
            >
              <div className="w-12 h-16 border border-white/5 rounded-sm opacity-20" />
            </div>
          </div>

          {/* Right Edge: THE SPHERICAL DOORKNOB LOCK (喇叭鎖) */}
          <div className="absolute right-3.5 top-[52%] -translate-y-1/2 z-20">
            <RoundDoorLock 
              isKnobTurned={isKnobTurned} 
              onKnobClick={onKnobClick}
              interactive={interactive}
            />
          </div>

          {/* Latch Plate on Right Edge of Door (門側鎖舌擋板) */}
          <div className="absolute right-0 top-[52%] -translate-y-1/2 translate-x-[1px] w-[3px] h-12 bg-[#8C6B1B] rounded-r-xs shadow-sm" />
        </motion.div>
      </div>
    </div>
  );
};

// Social Links for the Explored Menu
const SOCIAL_LINKS = [
  { 
    label: 'Instagram', 
    sub: 'cubepixel.officase', 
    icon: '📸', 
    color: '#E1306C',
    bg: 'rgba(225, 48, 108, 0.12)',
    border: 'rgba(225, 48, 108, 0.35)',
    url: 'https://www.instagram.com/cubepixel.officase?igsh=Y3VuZ2NnOTBsMWZz' 
  },
  { 
    label: 'YouTube', 
    sub: '紡塊像素CubePixel', 
    icon: '📺', 
    color: '#FF4D4D',
    bg: 'rgba(255, 77, 77, 0.12)',
    border: 'rgba(255, 77, 77, 0.35)',
    url: 'https://www.youtube.com/@Q%E3%83%94%E3%82%AF%E3%82%BB-%E3%82%A2%E3%82%A4%E3%83%89%E3%83%AB' 
  },
  { 
    label: 'LINE 官方', 
    sub: '@546ymkbs', 
    icon: '💬', 
    color: '#06C755',
    bg: 'rgba(6, 199, 85, 0.12)',
    border: 'rgba(6, 199, 85, 0.35)',
    url: 'https://line.me/R/ti/p/@546ymkbs' 
  },
];

const EXPLORE_CATEGORIES = [
  { id: 'intro', label: '團體介紹', en: 'GROUP INTRO', color: '#F08080', icon: '✨', desc: '夢開始的地方與創團物語' },
  { id: 'members', label: '選擇你的推', en: 'SELECT YOUR OSHI', color: '#7CFC00', icon: '💖', desc: '成員個別檔案與專屬應援' },
  { id: 'performance', label: '小基地任務', en: 'LITTLE BASE', color: '#FFB347', icon: '🎮', desc: '基地官方任務與互動' },
  { id: 'live_event', label: '公演活動', en: 'LIVE EVENT', color: '#FFFF00', icon: '🎤', desc: '最新現場演出與售票資訊' },
  { id: 'social', label: '社群連結', en: 'SOCIAL MEDIA', color: '#9ADDFF', icon: '🌐', desc: 'Instagram / YouTube / LINE' },
  { id: 'visual', label: '特別感謝', en: 'SPECIAL THANKS', color: '#FFD1DC', icon: '👑', desc: '團長 涼海璃 與幕後團隊' },
];

export interface MobileWebsiteProps {
  gameState?: string;
  setGameState?: (state: any) => void;
  activeSubPage?: string | null;
  setActiveSubPage?: (sub: string | null) => void;
}

export const MobileWebsite: React.FC<MobileWebsiteProps> = ({
  gameState,
  setGameState,
  activeSubPage,
  setActiveSubPage,
}) => {
  // Mobile Scene Flow:
  // 'landing' -> Only LOGO and "開始探索"
  // 'walking' -> Perspective slow walk towards the single door panel
  // 'door_reached' -> Door enlarged so round knob lock (喇叭鎖) is clearly visible
  // 'door_opening' -> Knob turns and door swings inward
  // 'text_transition' -> Black background transition with welcome messages
  // 'room' -> 3D empty room with look-around viewpoint
  // 'explored' -> Explored hub behind the door
  const [sceneState, setSceneState] = useState<'landing' | 'walking' | 'door_reached' | 'door_opening' | 'text_transition' | 'room' | 'explored'>('landing');

  // Walking progress from 0 (far) to 1 (at door)
  const [walkProgress, setWalkProgress] = useState(0);
  const [isKnobTurned, setIsKnobTurned] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedCategoryModal, setSelectedCategoryModal] = useState<string | null>(null);

  const walkingAnimRef = useRef<number | null>(null);
  const walkStartTimeRef = useRef<number>(0);
  const lastFootstepStepRef = useRef<number>(-1);

  // Toggle sound
  const toggleSound = () => {
    sfx.enabled = !soundEnabled;
    setSoundEnabled(!soundEnabled);
  };

  // Start the walking journey
  const handleStartExplore = () => {
    setSceneState('walking');
    setWalkProgress(0);
    setIsKnobTurned(false);
    walkStartTimeRef.current = performance.now();
    lastFootstepStepRef.current = -1;

    // Gentle haptic on mobile tap (reduced from 30ms to 12ms)
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(12); } catch {}
    }
  };

  // Skip walking and jump straight to the close-up door
  const handleSkipWalk = () => {
    if (walkingAnimRef.current) {
      cancelAnimationFrame(walkingAnimRef.current);
    }
    setWalkProgress(1);
    setSceneState('door_reached');
  };

  // Walking animation loop (slow, leisurely ~7.6 seconds walk with gentle cadence)
  useEffect(() => {
    if (sceneState !== 'walking') return;

    // Slowed down walking speed for calm, cinematic approach
    const WALK_DURATION = 7600; 

    const updateWalk = (now: number) => {
      const elapsed = now - walkStartTimeRef.current;
      const rawProgress = Math.min(elapsed / WALK_DURATION, 1);
      
      // Smooth ease-in-out curve
      const smoothProgress = rawProgress < 0.5
        ? 2 * rawProgress * rawProgress
        : 1 - Math.pow(-2 * rawProgress + 2, 2) / 2;

      setWalkProgress(smoothProgress);

      // Footstep cadence: 7 gentle steps across the slower walk
      const currentStep = Math.floor(rawProgress * 7);
      if (currentStep > lastFootstepStepRef.current && currentStep < 7) {
        lastFootstepStepRef.current = currentStep;
        sfx.playFootstep();
        // Light, subtle vibration pulse
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try { navigator.vibrate(6); } catch {}
        }
      }

      if (rawProgress >= 1) {
        setSceneState('door_reached');
      } else {
        walkingAnimRef.current = requestAnimationFrame(updateWalk);
      }
    };

    walkingAnimRef.current = requestAnimationFrame(updateWalk);

    return () => {
      if (walkingAnimRef.current) {
        cancelAnimationFrame(walkingAnimRef.current);
      }
    };
  }, [sceneState]);

  // Turn the spherical knob lock and open the door
  const handleKnobAction = () => {
    if (sceneState !== 'door_reached') return;

    sfx.playKnobTurn();
    setIsKnobTurned(true);

    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate([20, 15, 25]); } catch {}
    }

    setSceneState('door_opening');

    // Swing door open and creak
    setTimeout(() => {
      sfx.playDoorCreak();
    }, 280);

    // User Request: 在開門到進房間之前新增一段黑背景文字小轉場
    setTimeout(() => {
      setSceneState('text_transition');
    }, 1200);
  };

  // Auto-advance from text transition into the 3D room after displaying messages
  useEffect(() => {
    if (sceneState !== 'text_transition') return;
    const timer = setTimeout(() => {
      setSceneState('room');
    }, 3800);
    return () => clearTimeout(timer);
  }, [sceneState]);

  // Return back to the initial landing screen
  const handleResetToLanding = () => {
    setSceneState('landing');
    setWalkProgress(0);
    setIsKnobTurned(false);
    setSelectedCategoryModal(null);
  };

  // Replay walking sequence
  const handleReplayWalk = () => {
    handleStartExplore();
  };

  // Calculate dynamic camera walking bobbing & scale
  // Softened sinusoidal vertical bobbing (reduced from 9px to 3.2px)
  const cameraBobY = sceneState === 'walking' 
    ? Math.sin(walkProgress * Math.PI * 14) * 3.2 
    : 0;

  // Gentle lateral head sway (reduced from 4.5px to 1.5px)
  const cameraSwayX = sceneState === 'walking' 
    ? Math.sin(walkProgress * Math.PI * 7) * 1.5 
    : 0;
  const cameraTilt = sceneState === 'walking' 
    ? Math.sin(walkProgress * Math.PI * 7) * 0.22 
    : 0;

  // Door scale: starts at 0.13 (far in the distance), slowly magnifies to 2.15 (right in front with 喇叭鎖 clearly visible)
  const doorScale = sceneState === 'landing' 
    ? 0.13 
    : 0.13 + Math.pow(walkProgress, 1.35) * 2.02;

  // Estimated walking distance (15.0m down to 0.3m)
  const remainingDistance = Math.max(0.3, (15 - walkProgress * 14.7)).toFixed(1);

  return (
    <div className="fixed inset-0 w-full h-[100dvh] bg-[#000B18] text-white flex flex-col items-center justify-between overflow-hidden select-none font-rounded">
      
      {/* 3D Cosmic / Pixel Ambient Environment */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Atmospheric Neon Aura Lights */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-500/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-[130px] pointer-events-none" />

      {/* Top Controls Bar (hidden during 3D room mode to give full screen viewport) */}
      {sceneState !== 'room' && (
        <header className="w-full max-w-md flex justify-between items-center text-xs px-4 pt-3 pb-2 z-40 border-b border-white/5 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-pink-400 animate-ping inline-block" />
            <span className="font-mono font-bold tracking-widest text-[10px] text-pink-300">
              QPKS // CUBEPIXEL
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Sound Toggle Button */}
            <button 
              onClick={toggleSound}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 active:scale-95 transition-all text-[11px] flex items-center gap-1 font-mono border border-white/10"
              title="音效開關"
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-amber-300" /> : <VolumeX className="w-3.5 h-3.5 text-white/40" />}
            </button>

            {/* Quick Return to Landing if in other states */}
            {sceneState !== 'landing' && (
              <button
                onClick={handleResetToLanding}
                className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-white/80 active:scale-95 transition-all text-[10px] font-mono flex items-center gap-1 border border-white/15"
              >
                <RotateCcw className="w-3 h-3 text-pink-300" />
                <span>首頁</span>
              </button>
            )}
          </div>
        </header>
      )}

      {/* ======================================================== */}
      {/* 1. INITIAL LANDING SCREEN: STRICTLY LOGO & 開始探索 */}
      {/* ======================================================== */}
      <AnimatePresence mode="wait">
        {sceneState === 'landing' && (
          <motion.div
            key="landing-screen"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-sm flex-1 flex flex-col items-center justify-center px-6 z-20 text-center gap-8 my-auto"
          >
            {/* The Official LOGO */}
            <motion.div 
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
              className="relative flex flex-col items-center justify-center"
            >
              <div className="w-36 h-36 sm:w-40 sm:h-40 rounded-3xl border-2 border-pink-400/50 shadow-[0_0_45px_rgba(244,114,182,0.45),inset_0_0_25px_rgba(244,114,182,0.2)] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-tr from-pink-500/25 via-transparent to-amber-400/25 pointer-events-none" />
                <img 
                  src={LOGO_URL} 
                  alt="紡塊像素 CubePixel Logo" 
                  className="w-full h-full object-contain drop-shadow-[0_0_25px_rgba(251,191,36,0.65)] relative z-10"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.src = FALLBACK_LOGO_URL;
                  }}
                />
              </div>

              {/* Logo Brand Tag */}
              <div className="mt-4 flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/15 border border-pink-400/40 text-pink-300 text-[11px] font-mono tracking-widest uppercase">
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>紡塊像素 CUBEPIXEL</span>
              </div>
            </motion.div>

            {/* The Start Exploring Button (開始探索) */}
            <div className="w-full flex flex-col items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleStartExplore}
                className="w-full py-4 px-8 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 text-white font-black text-lg tracking-[0.25em] shadow-[0_0_35px_rgba(244,114,182,0.6)] border border-pink-300/50 flex items-center justify-center gap-3 relative overflow-hidden group cursor-pointer"
              >
                {/* Button Ambient Shimmer */}
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                <Compass className="w-5 h-5 text-amber-200 animate-spin" style={{ animationDuration: '8s' }} />
                <span>開始探索</span>
                <ArrowRight className="w-5 h-5 text-amber-200 group-hover:translate-x-1 transition-transform" />
              </motion.button>

              <span className="text-[10px] text-white/40 font-mono tracking-widest">
                TAP TO EMBARK ON THE JOURNEY
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* 2. WALKING & DOOR SCENE: SLOW WALKING EFFECT & ZOOMING DOOR */}
      {/* ======================================================== */}
      <AnimatePresence mode="wait">
        {(sceneState === 'walking' || sceneState === 'door_reached' || sceneState === 'door_opening') && (
          <motion.div
            key="walking-door-viewport"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 w-full h-full flex flex-col items-center justify-center overflow-hidden z-20"
            style={{
              perspective: '1000px',
            }}
          >
            {/* Perspective Floor Plane with Forward Motion Effect */}
            <div 
              className="absolute -bottom-20 left-[-50%] right-[-50%] h-[60%] pointer-events-none origin-bottom"
              style={{
                transform: 'rotateX(72deg)',
                backgroundImage: `
                  linear-gradient(to right, rgba(244, 114, 182, 0.15) 1px, transparent 1px),
                  linear-gradient(to bottom, rgba(251, 191, 36, 0.2) 1px, transparent 1px)
                `,
                backgroundSize: '40px 40px',
                backgroundPosition: `0px ${(walkProgress * 400) % 40}px`,
                maskImage: 'linear-gradient(to top, rgba(0,0,0,1) 30%, transparent 100%)',
                WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,1) 30%, transparent 100%)',
              }}
            />

            {/* Distant Fog & Horizon Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-48 bg-gradient-to-t from-pink-500/20 via-amber-400/10 to-transparent blur-3xl pointer-events-none" />

            {/* Walking Camera Head-Bobbing & Sway Container */}
            <div 
              className="relative flex flex-col items-center justify-center w-full h-full transition-transform ease-out"
              style={{
                transform: `translate3d(${cameraSwayX}px, ${cameraBobY}px, 0) rotate(${cameraTilt}deg)`,
              }}
            >
              {/* THE SINGLE DOOR PANEL (單扇門板) Scaling Up Toward Viewer */}
              <div 
                className="relative flex items-center justify-center transition-transform ease-linear"
                style={{
                  transform: `scale(${doorScale})`,
                  transformOrigin: 'center 62%',
                }}
              >
                <SingleDoorPanel 
                  isDoorOpen={sceneState === 'door_opening'}
                  isKnobTurned={isKnobTurned}
                  onKnobClick={handleKnobAction}
                  interactive={sceneState === 'door_reached'}
                />
              </div>
            </div>

            {/* HUD / Status Info During Walking */}
            <div className="absolute top-16 left-0 right-0 flex flex-col items-center justify-center gap-2 pointer-events-none z-30">
              {sceneState === 'walking' && (
                <div className="flex flex-col items-center gap-1.5 animate-pulse">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/20 text-white text-[11px] font-mono tracking-wider shadow-lg">
                    <Footprints className="w-3.5 h-3.5 text-pink-400 animate-bounce" />
                    <span>視角漫步接近中... 距離 {remainingDistance}m</span>
                  </div>

                  {/* Footstep Dots Cadence */}
                  <div className="flex items-center gap-1">
                    {[0, 1, 2, 3, 4, 5, 6].map((i) => (
                      <span 
                        key={i} 
                        className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                          walkProgress * 7 >= i ? 'bg-amber-300 scale-125' : 'bg-white/20'
                        }`} 
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Clear Instruction when Door & Knob are reached */}
              {sceneState === 'door_reached' && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="pointer-events-auto flex flex-col items-center gap-2"
                >
                  <button
                    onClick={handleKnobAction}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-pink-500 text-white font-bold text-xs tracking-wider shadow-[0_0_30px_rgba(251,191,36,0.6)] border border-amber-200/60 active:scale-95 transition-transform cursor-pointer animate-pulse"
                  >
                    <Sparkles className="w-4 h-4 text-amber-200" />
                    <span>輕觸喇叭鎖開門</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <span className="text-[10px] text-amber-300/80 font-mono tracking-widest drop-shadow">
                    SPHERICAL KNOB LOCK UNLOCKED
                  </span>
                </motion.div>
              )}
            </div>

            {/* Bottom Floating Walking Controls */}
            {sceneState === 'walking' && (
              <div className="absolute bottom-6 left-0 right-0 flex justify-center items-center gap-3 z-30">
                <button
                  onClick={handleSkipWalk}
                  className="px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white/80 text-[11px] font-mono tracking-wider active:scale-95 transition-all flex items-center gap-1.5 shadow-md"
                >
                  <span>直接走近門前 (Skip)</span>
                  <ArrowRight className="w-3 h-3 text-pink-300" />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* 2.5 BLACK BACKGROUND TEXT TRANSITION (User Request) */}
      {/* ======================================================== */}
      <AnimatePresence mode="wait">
        {sceneState === 'text_transition' && (
          <motion.div
            key="text-transition-screen"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
            className="absolute inset-0 w-full h-full z-50 bg-[#080605] flex flex-col items-center justify-center p-8 text-center select-none cursor-pointer"
            onClick={() => setSceneState('room')}
          >
            <div className="max-w-md w-full space-y-8 flex flex-col items-center">
              {/* Message 1 */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 0.25 }}
                className="text-amber-100 font-serif text-lg sm:text-2xl tracking-[0.2em] font-medium leading-relaxed drop-shadow-[0_2px_10px_rgba(251,191,36,0.15)]"
              >
                「歡迎光臨保持可愛漫研社的網站」
              </motion.div>

              {/* Message 2 */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9, delay: 1.3 }}
                className="text-amber-300/85 font-serif text-sm sm:text-lg tracking-[0.18em] leading-relaxed italic"
              >
                「記得幫我關門 會有蚊子」
              </motion.div>

              {/* Tap hint */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.45 }}
                transition={{ duration: 0.8, delay: 2.2 }}
                className="pt-6 text-[10px] text-white/50 font-mono tracking-widest flex items-center gap-1.5"
              >
                <span>點擊任意處或稍待自動進房...</span>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* 3. 3D EMPTY ROOM: ROTATING VIEWPOINT & VIRTUAL JOYSTICK */}
      {/* ======================================================== */}
      <AnimatePresence mode="wait">
        {sceneState === 'room' && (
          <motion.div
            key="room-3d-scene"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="absolute inset-0 w-full h-full z-40 bg-[#0a0c16]"
          >
            <Room3DScene 
              onExitRoom={handleResetToLanding}
              onOpenMenu={() => setSceneState('explored')}
              soundEnabled={soundEnabled}
              onToggleSound={toggleSound}
              playFootstep={() => sfx.playFootstep()}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* 4. EXPLORED HUB: REVEALED BEHIND THE OPENED DOOR */}
      {/* ======================================================== */}
      <AnimatePresence mode="wait">
        {sceneState === 'explored' && (
          <motion.div
            key="explored-hub"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-md flex-1 flex flex-col items-center justify-start p-4 z-30 overflow-y-auto space-y-4 my-2"
          >
            {/* Door Opened Welcome Banner */}
            <div className="w-full text-center space-y-1.5 pt-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/15 border border-pink-400/30 text-pink-300 text-[10px] font-mono tracking-widest">
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>DOOR OPENED // 漫步抵達</span>
              </div>
              <h2 className="text-xl font-black text-white tracking-[0.2em] font-rounded">
                歡迎來到紡塊像素
              </h2>
              <p className="text-[11px] text-white/60 font-mono tracking-wide">
                推開大門，選擇你想探索的領域
              </p>
            </div>

            {/* Category Grid */}
            <div className="w-full grid grid-cols-2 gap-2.5">
              {EXPLORE_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryModal(cat.id)}
                  style={{ borderColor: `${cat.color}40` }}
                  className="p-3 rounded-2xl bg-slate-900/70 backdrop-blur-md border hover:border-white/40 active:scale-95 transition-all text-left flex flex-col justify-between h-24 group relative overflow-hidden shadow-lg"
                >
                  <div 
                    className="absolute top-0 right-0 w-16 h-16 rounded-bl-full pointer-events-none opacity-20 group-hover:opacity-40 transition-opacity"
                    style={{ backgroundColor: cat.color }}
                  />
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xl">{cat.icon}</span>
                    <span 
                      className="text-[8px] font-mono tracking-widest uppercase px-1.5 py-0.5 rounded font-bold"
                      style={{ color: cat.color, backgroundColor: `${cat.color}20` }}
                    >
                      {cat.en}
                    </span>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white tracking-wide">
                      {cat.label}
                    </div>
                    <div className="text-[9px] text-white/50 truncate font-mono">
                      {cat.desc}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Official Social Media Channels */}
            <div className="w-full space-y-2 pt-2">
              <div className="flex items-center justify-between text-[9px] font-mono text-white/40 tracking-widest uppercase px-1">
                <span>OFFICIAL CHANNELS</span>
                <span>官方社群</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {SOCIAL_LINKS.map((link) => (
                  <a
                    key={link.label}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ backgroundColor: link.bg, borderColor: link.border }}
                    className="flex flex-col items-center justify-center p-2.5 rounded-xl border transition-transform active:scale-95 group text-center cursor-pointer shadow-sm hover:brightness-125"
                  >
                    <span className="text-lg mb-0.5">{link.icon}</span>
                    <span className="text-[10px] font-bold text-white tracking-tight">
                      {link.label}
                    </span>
                    <span className="text-[7.5px] text-white/50 font-mono scale-90 truncate max-w-full">
                      前往關注 ↗
                    </span>
                  </a>
                ))}
              </div>
            </div>

            {/* Actions: Return to 3D Room, Walk Again or Close Door */}
            <div className="w-full space-y-2 pt-2">
              <button
                onClick={() => setSceneState('room')}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-pink-500/25 via-purple-500/25 to-amber-500/25 hover:from-pink-500/35 hover:to-amber-500/35 border border-pink-400/40 text-pink-200 text-xs font-mono font-bold tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md"
              >
                <Box className="w-4 h-4 text-amber-300" />
                <span>返回 3D 空房間漫遊 (虛擬搖桿)</span>
              </button>

              <div className="w-full flex items-center gap-2">
                <button
                  onClick={handleReplayWalk}
                  className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white/90 text-xs font-mono font-bold tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md"
                >
                  <Footprints className="w-3.5 h-3.5 text-pink-300" />
                  <span>重新漫步探索</span>
                </button>
                <button
                  onClick={handleResetToLanding}
                  className="flex-1 py-2.5 rounded-xl bg-pink-500/20 hover:bg-pink-500/30 border border-pink-400/40 text-pink-200 text-xs font-mono font-bold tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md"
                >
                  <DoorClosed className="w-3.5 h-3.5 text-amber-300" />
                  <span>關閉門板返回</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category Detail Modal */}
      <AnimatePresence>
        {selectedCategoryModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-4"
            onClick={() => setSelectedCategoryModal(null)}
          >
            <motion.div
              initial={{ y: 50, scale: 0.95 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 50, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm bg-slate-900 border border-white/20 rounded-3xl p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">
                    {EXPLORE_CATEGORIES.find(c => c.id === selectedCategoryModal)?.icon}
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      {EXPLORE_CATEGORIES.find(c => c.id === selectedCategoryModal)?.label}
                    </h3>
                    <p className="text-[9px] font-mono text-white/50">
                      {EXPLORE_CATEGORIES.find(c => c.id === selectedCategoryModal)?.en}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCategoryModal(null)}
                  className="p-1 rounded-full bg-white/10 text-white/60 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Content Based on Selection */}
              <div className="text-xs text-white/80 space-y-3 leading-relaxed font-rounded">
                {selectedCategoryModal === 'intro' && (
                  <div className="space-y-2">
                    <p className="text-pink-300 font-bold">【夢開始的地方】</p>
                    <p>紡塊像素 CubePixel 是一支融合像素藝術、動態程式與熱血音樂的次世代偶像企劃。</p>
                    <p>在像素的每個微小網格中，蘊藏著所有成員與粉絲相遇的最初夢想。</p>
                  </div>
                )}

                {selectedCategoryModal === 'members' && (
                  <div className="space-y-2.5">
                    <p className="text-green-300 font-bold">【成員一覽】</p>
                    <div className="space-y-2">
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-white">鈴未 藪 (Suzumi Sū)</div>
                          <div className="text-[10px] text-cyan-300 font-mono">F01 • 天堂藍擔當</div>
                        </div>
                        <span className="text-lg">🔵</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-white">涼海 璃 (SUZUMI RII)</div>
                          <div className="text-[10px] text-slate-300 font-mono">團長 • 璃帽</div>
                        </div>
                        <span className="text-lg">🧢</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-white">遜砲小藍 (AORI SHOU)</div>
                          <div className="text-[10px] text-amber-200 font-mono">瘋狂喇叭廣播</div>
                        </div>
                        <span className="text-lg">📢</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
                        <div>
                          <div className="font-bold text-white">四方はつら (YOMO HATURA)</div>
                          <div className="text-[10px] text-yellow-200 font-mono">二期生預定</div>
                        </div>
                        <span className="text-lg">✨</span>
                      </div>
                    </div>
                  </div>
                )}

                {selectedCategoryModal === 'performance' && (
                  <div className="space-y-2">
                    <p className="text-amber-300 font-bold">【小基地任務】</p>
                    <p>歡迎來到官方小基地！在此完成每日簽到、留言互動與解鎖特別語音壁紙。</p>
                  </div>
                )}

                {selectedCategoryModal === 'live_event' && (
                  <div className="space-y-2">
                    <p className="text-yellow-300 font-bold">【公演活動】</p>
                    <p>最新現場活動與售票資訊籌備中，敬請密切留意官方社群公告！</p>
                  </div>
                )}

                {selectedCategoryModal === 'social' && (
                  <div className="space-y-2">
                    <p className="text-cyan-300 font-bold">【官方社群】</p>
                    <p>點擊下方按鈕可直接跳轉官方 Instagram、YouTube 與 LINE 群組！</p>
                  </div>
                )}

                {selectedCategoryModal === 'visual' && (
                  <div className="space-y-2">
                    <p className="text-pink-300 font-bold">【特別感謝】</p>
                    <p>特別感謝 團長 涼海璃 對幹程式碼一個月，徒手造出紡塊像素官方小基地！</p>
                  </div>
                )}
              </div>

              <button
                onClick={() => setSelectedCategoryModal(null)}
                className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs font-bold"
              >
                關閉
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer (hidden during full 3D room mode) */}
      {sceneState !== 'room' && (
        <footer className="w-full max-w-md flex flex-col items-center gap-1 pt-1 pb-2 text-center font-mono z-30 border-t border-white/5">
          <div className="text-[8px] text-white/40 tracking-wider">
            © 2026 CUBEPIXEL • 保持你的可愛
          </div>
        </footer>
      )}
    </div>
  );
};
