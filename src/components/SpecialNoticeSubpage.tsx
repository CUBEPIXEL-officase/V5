import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Sparkles, ZoomIn, X, ChevronDown } from 'lucide-react';

interface SpecialNoticeSubpageProps {
  onClose: () => void;
}

const NOTICE_IMAGES = [
  {
    id: 'notice-1',
    title: '特別公告 (一)',
    page: '1 / 2',
    driveId: '1tQu22VKpHVpshSjC7Uj7QNuaS6Wjv81h',
    primaryUrl: 'https://lh3.googleusercontent.com/d/1tQu22VKpHVpshSjC7Uj7QNuaS6Wjv81h',
    fallbackUrl: 'https://drive.google.com/thumbnail?id=1tQu22VKpHVpshSjC7Uj7QNuaS6Wjv81h&sz=w1500',
    directDriveLink: 'https://drive.google.com/file/d/1tQu22VKpHVpshSjC7Uj7QNuaS6Wjv81h/view?usp=sharing'
  },
  {
    id: 'notice-2',
    title: '特別公告 (二)',
    page: '2 / 2',
    driveId: '1U9Dv7dMwjO0zbzkagDjcluffqyNI0zjZ',
    primaryUrl: 'https://lh3.googleusercontent.com/d/1U9Dv7dMwjO0zbzkagDjcluffqyNI0zjZ',
    fallbackUrl: 'https://drive.google.com/thumbnail?id=1U9Dv7dMwjO0zbzkagDjcluffqyNI0zjZ&sz=w1500',
    directDriveLink: 'https://drive.google.com/file/d/1U9Dv7dMwjO0zbzkagDjcluffqyNI0zjZ/view?usp=sharing'
  }
];

// Web Audio API 合成巨大震撼爆炸音效
function playMassiveExplosionSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // 1. 白噪音緩衝區（爆炸衝擊波與撕裂殘響）
    const bufferSize = ctx.sampleRate * 3.5;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    // 低通濾波器 sweep：從高頻衝擊 4500Hz 劇烈衰減至低沉 35Hz
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(4500, now);
    filter.frequency.exponentialRampToValueAtTime(35, now + 2.8);

    // 破音失真器（增加大爆炸的破壞與撕裂感）
    const distortion = ctx.createWaveShaper();
    const curve = new Float32Array(44100);
    const deg = Math.PI / 180;
    const k = 45;
    for (let i = 0; i < 44100; i++) {
      const x = (i * 2) / 44100 - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    distortion.curve = curve;
    distortion.oversample = '4x';

    // 噪聲增益包絡（很大聲音量）
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(2.8, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 3.2);

    whiteNoise.connect(filter);
    filter.connect(distortion);
    distortion.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    // 2. 超重低音重錘 (Sub-bass boom 180Hz -> 25Hz)
    const subOsc = ctx.createOscillator();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(190, now);
    subOsc.frequency.exponentialRampToValueAtTime(25, now + 1.2);

    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(3.2, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);

    subOsc.connect(subGain);
    subGain.connect(ctx.destination);

    // 3. 次級鋸齒波低音殘震
    const rumbleOsc = ctx.createOscillator();
    rumbleOsc.type = 'sawtooth';
    rumbleOsc.frequency.setValueAtTime(95, now);
    rumbleOsc.frequency.exponentialRampToValueAtTime(18, now + 2.6);

    const rumbleGain = ctx.createGain();
    rumbleGain.gain.setValueAtTime(1.2, now);
    rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 2.6);

    rumbleOsc.connect(rumbleGain);
    rumbleGain.connect(ctx.destination);

    // 啟動所有音源
    whiteNoise.start(now);
    subOsc.start(now);
    rumbleOsc.start(now);

    whiteNoise.stop(now + 3.5);
    subOsc.stop(now + 2.3);
    rumbleOsc.stop(now + 2.7);
  } catch (err) {
    console.warn('Explosion sound error:', err);
  }
}

// 機械掀蓋喀嚓與氣壓聲
function playMechanicalHatchSound(isOpen: boolean) {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    if (isOpen) {
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(620, now + 0.12);
    } else {
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.12);
    }

    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.16);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.18);

    // 氣壓阻尼釋放聲 (Pneumatic whoosh)
    const bufferSize = Math.floor(ctx.sampleRate * 0.22);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(isOpen ? 900 : 450, now);
    filter.Q.value = 2.5;

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.25, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + 0.22);
  } catch (e) {
    // ignore
  }
}

export const SpecialNoticeSubpage: React.FC<SpecialNoticeSubpageProps> = ({ onClose }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [isCoverOpen, setIsCoverOpen] = useState(false);
  const [isButtonPressed, setIsButtonPressed] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [isDraggingButton, setIsDraggingButton] = useState(false);
  const touchStartYRef = useRef<number | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartYRef.current !== null) {
      const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;
      if (deltaY < -35) {
        handleOpenCover();
      }
      touchStartYRef.current = null;
    }
  };

  const scrollToPage = (index: number) => {
    if (scrollContainerRef.current) {
      const containerWidth = scrollContainerRef.current.clientWidth;
      scrollContainerRef.current.scrollTo({
        left: containerWidth * index,
        behavior: 'smooth'
      });
      setCurrentPage(index);
    }
  };

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, clientWidth } = scrollContainerRef.current;
      const index = Math.round(scrollLeft / clientWidth);
      if (index !== currentPage && index >= 0 && index < NOTICE_IMAGES.length) {
        setCurrentPage(index);
      }
    }
  };

  const handleOpenCover = () => {
    playMechanicalHatchSound(true);
    setIsCoverOpen(true);
  };

  const handleCloseCover = () => {
    playMechanicalHatchSound(false);
    setIsCoverOpen(false);
  };

  // 按下獨裁者按鈕觸發巨大爆炸
  const handleDictatorButtonPress = () => {
    setIsButtonPressed(true);
    playMassiveExplosionSound();

    // 觸發震動回饋（支援的行動裝置）
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([150, 50, 250, 50, 400]);
      } catch (_) {}
    }

    // 觸發畫面劇烈狂震
    setIsShaking(true);
    // 觸發爆炸白光閃爍
    setIsFlashing(true);

    setTimeout(() => {
      setIsButtonPressed(false);
    }, 400);

    setTimeout(() => {
      setIsFlashing(false);
    }, 600);

    setTimeout(() => {
      setIsShaking(false);
    }, 900);
  };

  return (
    <motion.div
      key="special_notice_subpage_wrapper"
      initial={{ opacity: 0, y: 150 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 150 }}
      transition={{ type: "spring", damping: 25, stiffness: 180 }}
      className="absolute inset-0 z-50 overflow-hidden w-full h-full bg-[#05070c] text-white"
    >
      {/* =========================================================================
          下層頁面 (UNDERLAYER):
          只有一個沿著邊線的黃黑警告線的框框 + 一顆紅色的立體大按鈕
          上方標題「獨裁者按鈕（試做型）」 + 按下時很大聲爆炸音效
         ========================================================================= */}
      <motion.div 
        animate={
          isShaking
            ? {
                x: [0, -16, 18, -14, 12, -8, 5, 0],
                y: [0, 14, -16, 12, -10, 6, -3, 0],
                rotate: [0, -1.8, 2.2, -1.5, 1.2, 0],
              }
            : { x: 0, y: 0, rotate: 0 }
        }
        transition={{ duration: 0.65, ease: "linear" }}
        className="absolute inset-0 z-10 flex flex-col items-center justify-between p-3 sm:p-4 select-none"
        style={{
          // 四周沿著邊線的黃黑警告斜紋框框 (Hazard stripes border)
          background: 'repeating-linear-gradient(-45deg, #eab308 0, #eab308 14px, #000 14px, #000 28px)',
        }}
      >
        {/* 內層純黑底色 (製造四周厚度 14px~16px 的黃黑警告線邊框) */}
        <div className="relative w-full h-full bg-[#09090b] rounded-lg flex flex-col items-center justify-between p-4 sm:p-6 overflow-hidden">
          
          {/* 頂部快捷控制 (蓋回公告蓋板 / 關閉) */}
          <div className="w-full flex justify-between items-center z-30 pt-1">
            <button
              onClick={handleCloseCover}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/40 text-yellow-400 font-mono text-[11px] font-bold tracking-wider active:scale-95 transition-all cursor-pointer shadow-sm"
              title="蓋回上方公告面板"
            >
              <ChevronDown className="w-4 h-4" />
              <span>蓋回公告 // RESTORE</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-black/60 hover:bg-black/90 border border-white/20 text-white/70 hover:text-white transition-all cursor-pointer active:scale-95"
              title="關閉"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 中央核心區塊：上方標題 + 紅色立體大按鈕 (依需求：什麼都沒有，只有標題與按鈕) */}
          <div className="flex-1 w-full flex flex-col items-center justify-center gap-8 sm:gap-12 my-auto z-20">
            
            {/* 上方標題：「獨裁者按鈕（試做型）」 */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15, duration: 0.4 }}
              className="flex flex-col items-center text-center gap-2"
            >
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-yellow-400 tracking-[0.15em] sm:tracking-[0.2em] font-rounded drop-shadow-[0_0_20px_rgba(234,179,8,0.5)]">
                獨裁者按鈕（試做型）
              </h1>
              <span className="text-[10px] sm:text-xs font-mono tracking-[0.4em] text-yellow-500/60 uppercase">
                DICTATOR BUTTON // PROTOTYPE
              </span>
            </motion.div>

            {/* 一顆紅色的立體大按鈕 */}
            <div className="relative flex items-center justify-center">
              
              {/* 金屬與警戒底座環 */}
              <div 
                className="w-48 h-48 sm:w-56 sm:h-56 rounded-full p-2.5 flex items-center justify-center shadow-[0_20px_40px_rgba(0,0,0,0.9),inset_0_2px_4px_rgba(255,255,255,0.15)]"
                style={{
                  background: 'radial-gradient(circle at 40% 30%, #333333 0%, #171717 65%, #080808 100%)',
                  border: '3px solid #444444',
                }}
              >
                {/* 內部下陷凹槽環 */}
                <div className="w-full h-full rounded-full bg-[#0d0d0d] shadow-[inset_0_10px_20px_rgba(0,0,0,0.95)] flex items-center justify-center p-2.5">
                  
                  {/* 紅色立體大按鈕實體 */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={handleDictatorButtonPress}
                    className={`relative w-36 h-36 sm:w-44 sm:h-44 rounded-full cursor-pointer select-none transition-all duration-75 flex items-center justify-center ${
                      isButtonPressed
                        ? 'translate-y-3 shadow-[0_4px_0_#660000,0_8px_15px_rgba(0,0,0,0.9),inset_0_3px_6px_rgba(255,255,255,0.2),inset_0_-4px_8px_rgba(0,0,0,0.7)]'
                        : 'shadow-[0_16px_0_#660000,0_24px_30px_rgba(0,0,0,0.85),inset_0_6px_10px_rgba(255,255,255,0.45),inset_0_-10px_16px_rgba(0,0,0,0.6)]'
                    }`}
                    style={{
                      background: 'radial-gradient(circle at 35% 25%, #ff4d4d 0%, #dc2626 40%, #991b1b 75%, #7f1d1d 100%)',
                      border: '2px solid #ef4444',
                    }}
                    title="點擊引發爆炸"
                  >
                    {/* 按鈕頂部圓弧高光 */}
                    <div className="absolute top-2.5 left-6 right-6 h-10 sm:h-12 rounded-full bg-gradient-to-b from-white/40 to-transparent pointer-events-none blur-[1px]" />
                    
                    {/* 按鈕中心微型警示圖標 */}
                    <span className="text-white/90 text-2xl sm:text-3xl font-black drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] pointer-events-none font-mono">
                      PUSH
                    </span>
                  </motion.button>
                </div>
              </div>
            </div>

            {/* 提示小標語 */}
            <div className="h-6 flex items-center justify-center">
              <span className="text-[10px] text-yellow-500/50 font-mono tracking-widest uppercase animate-pulse">
                [ 點擊按鈕執行試做型試驗 ]
              </span>
            </div>

          </div>

          {/* 底部邊界占位 */}
          <div className="h-2" />

          {/* 爆炸白光/火光閃爍覆蓋層 (Explosion Flash Effect) */}
          <AnimatePresence>
            {isFlashing && (
              <motion.div
                initial={{ opacity: 0.95 }}
                animate={{ opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="absolute inset-0 z-50 bg-gradient-to-b from-white via-red-100 to-amber-200 pointer-events-none"
              />
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* =========================================================================
          上層頁面 (TOP COVER - 原本的特別公告區):
          具備機械式掀開特效，拉動最下方「關閉公告」按鈕即可將蓋板向上掀開，
          完全露出下層黃黑警告線與獨裁者按鈕。
         ========================================================================= */}
      <motion.div
        animate={
          isCoverOpen
            ? {
                y: '-105%',
                rotateX: -75,
                scale: 0.94,
                opacity: 0,
                pointerEvents: 'none',
              }
            : {
                y: '0%',
                rotateX: 0,
                scale: 1,
                opacity: 1,
                pointerEvents: 'auto',
              }
        }
        transition={{
          duration: 0.65,
          ease: [0.19, 1, 0.22, 1],
        }}
        style={{
          transformOrigin: 'top center',
          perspective: 1200,
        }}
        className="absolute inset-0 z-20 flex flex-col items-center justify-between p-3 sm:p-4 bg-[#05070c] backdrop-blur-xl w-full h-full text-white shadow-2xl border-b-2 border-white/20"
      >
        {/* Top Back/Close bar */}
        <div className="w-full flex justify-between items-center text-[9px] tracking-widest text-white/50 uppercase pt-2 pb-2 z-40 font-mono border-b border-white/20">
          <button 
            onClick={onClose}
            className="flex items-center gap-1 text-white hover:text-gray-300 font-bold tracking-widest cursor-pointer active:scale-95 transition-transform"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>返回</span>
          </button>
          <div className="flex items-center gap-1.5 text-white font-bold">
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span>SPECIAL ANNOUNCEMENT // 特別公告</span>
          </div>
        </div>

        {/* Scrollable Main Content Container */}
        <div className="flex-1 w-full overflow-y-auto py-2 px-1 my-auto flex flex-col items-center justify-start gap-2.5 custom-scrollbar">
          <div className="w-full max-w-lg text-center space-y-2.5">
            
            {/* Header Title Badge */}
            <div className="flex flex-col items-center gap-1">
              <div className="inline-flex items-center gap-2 py-0.5 px-3 bg-black/90 border border-white/40 rounded-full text-white text-[10px] font-mono font-black tracking-widest shadow-[0_0_15px_rgba(255,255,255,0.2)]">
                <span className="text-white">📢</span>
                <span>常態發布 OFFICIAL NOTICE</span>
              </div>
              
              <h3 className="text-base sm:text-lg font-black text-white tracking-wider font-rounded drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]">
                特別公告（常態發布）
              </h3>
            </div>

            {/* Large Carousel Slider Container (左右滑動 / 捲動翻頁) */}
            <div className="relative w-full flex flex-col items-center">
              
              {/* Scrollable Snap Container */}
              <div 
                ref={scrollContainerRef}
                onScroll={handleScroll}
                className="w-full flex overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar select-none"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {NOTICE_IMAGES.map((item) => (
                  <div 
                    key={item.id}
                    className="w-full shrink-0 snap-center flex flex-col items-center justify-center p-1 cursor-pointer group"
                    onClick={() => setSelectedImage(item.primaryUrl)}
                  >
                    <div className="relative w-full flex items-center justify-center overflow-hidden">
                      <img 
                        src={item.primaryUrl}
                        alt={item.title}
                        className="w-full h-auto max-h-[50vh] sm:max-h-[56vh] object-contain rounded-none transition-transform duration-300 group-hover:scale-[1.01]"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const target = e.currentTarget as HTMLImageElement;
                          if (!target.src.includes('thumbnail')) {
                            target.src = item.fallbackUrl;
                          }
                        }}
                      />
                      
                      {/* Hover Click to Zoom Hint */}
                      <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1 text-white text-xs font-mono font-bold">
                        <ZoomIn className="w-4 h-4" />
                        <span>點擊放大檢視</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Left / Right Quick Turn Controls */}
              {currentPage > 0 && (
                <button
                  onClick={() => scrollToPage(currentPage - 1)}
                  className="absolute left-1 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/70 hover:bg-black border border-white/30 text-white transition-all shadow-lg active:scale-90 z-20 cursor-pointer"
                  title="上一頁"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              )}

              {currentPage < NOTICE_IMAGES.length - 1 && (
                <button
                  onClick={() => scrollToPage(currentPage + 1)}
                  className="absolute right-1 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/70 hover:bg-black border border-white/30 text-white transition-all shadow-lg active:scale-90 z-20 cursor-pointer"
                  title="下一頁"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Pagination Indicators & Swipe Hint */}
            <div className="flex flex-col items-center justify-center gap-1.5 pt-1">
              <div className="flex items-center gap-2">
                {NOTICE_IMAGES.map((_, idx) => (
                  <button
                    key={`dot-${idx}`}
                    onClick={() => scrollToPage(idx)}
                    className={`transition-all duration-300 rounded-full cursor-pointer ${
                      currentPage === idx 
                        ? 'w-6 h-2 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]' 
                        : 'w-2 h-2 bg-white/30 hover:bg-white/60'
                    }`}
                    title={`切換至第 ${idx + 1} 頁`}
                  />
                ))}
              </div>
              
              <div className="text-[10px] text-white/70 font-mono flex items-center gap-1.5">
                <span>第 {currentPage + 1} / {NOTICE_IMAGES.length} 頁</span>
                <span>•</span>
                <span>左右滑動翻頁或點擊放大</span>
              </div>
            </div>

            {/* Extra Info Notice */}
            <div className="p-2 bg-white/[0.04] border border-white/20 rounded-xl text-center space-y-0.5">
              <div className="text-[10px] text-white/90 font-mono font-bold flex items-center justify-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-white" />
                <span>本區塊為常態發布公告，隨時可於首頁右下角快速查閱</span>
              </div>
            </div>

          </div>
        </div>

        {/* Bottom Actions: 關閉公告按鈕（點擊直接關閉，向上拉動則觸發掀開） */}
        <div className="w-full flex flex-col items-center gap-1 max-w-sm px-4 mt-1 z-40">
          <motion.button
            drag="y"
            dragConstraints={{ top: -140, bottom: 0 }}
            dragElastic={0.3}
            dragSnapToOrigin
            onDragStart={() => setIsDraggingButton(true)}
            onDragEnd={(_, info) => {
              setTimeout(() => setIsDraggingButton(false), 60);
              if (info.offset.y < -35 || info.velocity.y < -150) {
                handleOpenCover();
              }
            }}
            onClick={() => {
              if (!isDraggingButton) {
                onClose();
              }
            }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            className="w-full py-2.5 px-4 bg-white/10 hover:bg-white/20 active:bg-white/25 border border-white/20 rounded-xl flex flex-col items-center justify-center transition-colors cursor-grab active:cursor-grabbing select-none shadow-lg group relative touch-none"
            title="點擊關閉公告，向上拉動可掀開"
          >
            {/* 頂部微型拉動提把條（純幾何指示條，不含任何文字） */}
            <div className="w-8 h-1 rounded-full bg-white/30 group-hover:bg-white/50 mb-1 transition-colors pointer-events-none" />
            <span className="text-white font-black text-xs tracking-widest uppercase pointer-events-none">
              關閉公告
            </span>
          </motion.button>
        </div>

        {/* Lightbox Modal for Zoomed Image */}
        <AnimatePresence>
          {selectedImage && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-5"
              onClick={() => setSelectedImage(null)}
            >
              {/* Top Close Button */}
              <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
                <button 
                  onClick={() => setSelectedImage(null)}
                  className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white cursor-pointer active:scale-95 transition-transform"
                  title="關閉放大"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Large Preview Image */}
              <div 
                className="relative max-w-full max-h-[85vh] overflow-auto flex items-center justify-center p-1"
                onClick={(e) => e.stopPropagation()}
              >
                <img 
                  src={selectedImage}
                  alt="特別公告 放大檢視"
                  className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
                  referrerPolicy="no-referrer"
                />
              </div>

              <div className="text-[10px] text-white/60 font-mono pt-3">
                點擊任意處或右上角關閉
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};
