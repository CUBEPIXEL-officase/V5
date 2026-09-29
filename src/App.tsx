/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'motion/react';
import { Radio, Send, User, Lock, CornerDownRight, X, Heart, Save, Trash2, History, ArrowLeft } from 'lucide-react';
const EventCalendar = React.lazy(() => 
  import('./components/EventCalendar').then(module => ({ default: module.EventCalendar }))
);
const BannedListPage = React.lazy(() => 
  import('./components/BannedListPage').then(module => ({ default: module.BannedListPage }))
);

import { MobileWebsite } from './components/MobileWebsite';
import { DarkRedSubPage } from './components/DarkRedSubPage';
import { EscalatorMonologueSubpage } from './components/EscalatorMonologueSubpage';
import { umiriPhotoBase64 as umiriOfficialPhoto } from './assets/umiriPhotoBase64';

const COLORS = [
  '#F08080', // 紅/淺珊瑚紅 (Light Coral)
  '#FFB347', // 橘/粉彩柑橘色 (Pastel Tangerine/Citrus Orange)
  '#FFFF00', // 黃/亮黃 (Bright Neon Yellow)
  '#7CFC00', // 綠/草綠 (Grass Green)
  '#87CEEB', // 藍/天藍 (Sky Blue)
  '#D1B3FF', // 紫/粉彩葡萄紫 (Pastel Grape)
  '#FFD1DC', // 粉/淺粉 (Light Pink)
  '#4C5E6E', // 灰藍 (Gray Blue)
];

const GRID_SIZE = 24; // px
const TICK_RATE = 200; // ms per step

interface Block {
  id: string;
  color: string;
  column: number;
  row: number;
  targetRow?: number; // If set, block will stop here
}

const CHARS: Record<string, number[][]> = {
  'H': [[1,0,1],[1,0,1],[1,1,1],[1,0,1],[1,0,1]],
  'E': [[1,1,1],[1,0,0],[1,1,0],[1,0,0],[1,1,1]],
  'L': [[1,0,0],[1,0,0],[1,0,0],[1,0,0],[1,1,1]],
  'O': [[1,1,1],[1,0,1],[1,0,1],[1,0,1],[1,1,1]],
  'W': [[1,0,1],[1,0,1],[1,0,1],[1,1,1],[1,0,1]],
  'R': [[1,1,0],[1,0,1],[1,1,0],[1,0,1],[1,0,1]],
  'D': [[1,1,0],[1,0,1],[1,0,1],[1,0,1],[1,1,0]],
  '!': [[0,1,0],[0,1,0],[0,1,0],[0,0,0],[0,1,0]],
  'A': [[0,1,0],[1,0,1],[1,1,1],[1,0,1],[1,0,1]],
  'Q': [[1,1,1],[1,0,1],[1,0,1],[1,1,1],[0,0,1]],
  '-': [[0,0,0],[0,0,0],[1,1,1],[0,0,0],[0,0,0]],
  'P': [[1,1,1],[1,0,1],[1,1,1],[1,0,0],[1,0,0]],
  'I': [[1,1,1],[0,1,0],[0,1,0],[0,1,0],[1,1,1]],
  'X': [[1,0,1],[1,0,1],[0,1,0],[1,0,1],[1,0,1]],
  'K': [[1,0,1],[1,1,0],[1,0,0],[1,1,0],[1,0,1]],
  'C': [[1,1,1],[1,0,0],[1,0,0],[1,0,0],[1,1,1]],
  'U': [[1,0,1],[1,0,1],[1,0,1],[1,0,1],[1,1,1]],
  'T': [[1,1,1],[0,1,0],[0,1,0],[0,1,0],[0,1,0]],
  'S': [[1,1,1],[1,0,0],[1,1,1],[0,0,1],[1,1,1]],
  'N': [[1,0,1],[1,1,1],[1,1,1],[1,0,1],[1,0,1]],
  '4': [[1,0,1],[1,0,1],[1,1,1],[0,0,1],[0,0,1]],
  'V': [[1,0,1],[1,0,1],[1,0,1],[1,0,1],[0,1,0]],
  '&': [[0,1,0],[1,0,1],[0,1,0],[1,0,1],[1,0,1]],
  '2': [[1,1,1],[0,0,1],[1,1,1],[1,0,0],[1,1,1]],
  'G': [[1,1,1],[1,0,0],[1,0,1],[1,0,1],[1,1,1]],
  'Y': [[1,0,1],[1,0,1],[0,1,0],[0,1,0],[0,1,0]],
  ' ': [[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0]],
};

const HEARTS = [
  { id: 'intro', label: '團體介紹', enLabel: 'GROUP INTRODUCTION', color: '#F08080', content: '夢開始的地方' },
  { id: 'performance', label: '小基地任務', enLabel: 'LITTLE BASE MISSION', color: '#FFB347', content: '歡迎來到我們的官方小基地！' },
  { id: 'live_event', label: '公演活動', enLabel: 'LIVE PERFORMANCE', color: '#FFFF00', content: '公演活動即將隆重推出！\n\n我們正全力籌備最精彩的舞台演出，這將是一場結合像素藝術、動感音樂與豐富互動的全新體驗。\n\n最新公演時間、售票資訊與現場限定活動詳情，皆會在此處即時更新，敬請所有迷你像素們拭目以待！' },
  { id: 'members', label: '選擇你的推', enLabel: 'SELECT YOUR OSHI', color: '#7CFC00', content: '成員包含：像素畫師、程式設計師、以及多位創意工作者。' },
  { id: 'social', label: '社群連結', enLabel: 'SOCIAL MEDIA LINKS', color: '#9ADDFF', content: '關注我們的 Twitter, Instagram 與 Discord 獲取最新消息。' },
  { id: 'collab', label: '合作邀約', enLabel: 'COLLABORATION', color: '#D1B3FF', content: '歡迎各類商業合作與專案洽談，請聯繫：contact@qpixel.com' },
  { id: 'visual', label: '特別感謝', enLabel: 'SPECIAL THANKS', color: '#FFD1DC', content: '特別感謝 團長 涼海璃 對幹程式碼一個月\n徒手造出紡塊像素的官方網站' },
  { id: 'disabled', label: '尚未開放', enLabel: 'COMING SOON', color: '#4C5E6E', content: '', disabled: true },
];

const BIG_TITLES: Record<string, { title: string; subtitle: string }> = {
  intro: { title: '團體介紹', subtitle: 'GROUP INTRODUCTION' },
  intro_prequel_story: { title: '前夜傳：第一章', subtitle: 'PREQUEL: CHAPTER 1' },
  intro_chapter_1: { title: '創團物語：第一章', subtitle: 'ORIGIN STORY: CHAPTER 1' },
  performance: { title: '小基地任務', subtitle: 'LITTLE BASE MISSION' },
  live_event: { title: '公演活動', subtitle: 'LIVE PERFORMANCE' },
  members: { title: '選擇你的推', subtitle: 'SELECT YOUR OSHI' },
  social: { title: '社群連結', subtitle: 'SOCIAL MEDIA LINKS' },
  collab: { title: '合作邀約', subtitle: 'COLLABORATION' },
  visual: { title: '特別感謝', subtitle: 'SPECIAL THANKS' },
  umiri_special: { title: '涼海璃', subtitle: 'UMIRI SPECIAL PAGE' },
  disabled: { title: '尚未開放', subtitle: 'COMING SOON' },
};

const FIGHTERS = [
  { id: 7, name: '鈴未 藪', color: '#87CEEB', icon: '?', profile: { name: '鈴未 藪', enName: 'Suzumi Sū' } },
  { id: 2, name: '?????', color: '#F08080', icon: '?' },
  { id: 3, name: '?????', color: '#7CFC00', icon: '?' },
  { id: 4, name: '?????', color: '#D1B3FF', icon: '?' },
  { id: 5, name: '?????', color: '#FFFF00', icon: '?' },
  { id: 6, name: '?????', color: '#FFD1DC', icon: '?' },
  { id: 1, name: '涼海 璃 UMIRI', color: '#4C5E6E', icon: '🔵', profile: { name: '涼海 璃(璃帽)', enName: 'SUZUMI RII', birthday: '20050822', zodiac: '獅子座', hobby: '戰鬥陀螺', specialty: '講話速度超快', triggerPoint: '你敢在我打太鼓的時候煩我 我下一個就把你當太鼓打' } },
  { id: 8, name: '遜砲小藍', color: '#EBF4F6', icon: '📢', profile: { name: '遜砲小藍', enName: 'AORI SHOU', birthday: '20260620', zodiac: '雙子座', hobby: '瘋狂廣播', specialty: '長得像麥克風的瘋狂喇叭' } },
  // 蕷蒔泡沫YOJIUTA 二期生預定
  { id: 11, name: '四方はつら', color: '#B8AC78', icon: '?', profile: { name: '四方はつら', enName: 'YOMO HATURA' } },
  { id: 12, name: '?????', color: '#B06565', icon: '?' },
  { id: 13, name: '?????', color: '#9985A8', icon: '?' },
  { id: 14, name: '?????', color: '#728E75', icon: '?' },
  // 獨立活動藝人 | VTUBER企劃
  { id: 15, name: 'YURUKIRA', color: '#A855F7', icon: '?', profile: { name: 'YURUKIRA', enName: 'YURUKIRA' } },
];

const getFighterCode = (id: number | undefined): string => {
  if (!id) return '';
  if (id === 1 || id === 8) return 'F00';
  if (id === 7) return 'F01';
  if (id === 11) return 'Y01';
  if (id === 12) return 'Y02';
  if (id === 13) return 'Y03';
  if (id === 14) return 'Y04';
  if (id === 15) return 'V01';
  return `F0${id}`;
};

const getRoleTag = (id: number): string | null => {
  switch (id) {
    case 7: return '天堂藍擔當';
    case 2: return '珊瑚紅擔當';
    case 3: return '亮草綠擔當';
    case 4: return '薰衣紫擔當';
    case 5: return '萌檸黃擔當';
    case 6: return '櫻花粉擔當';
    case 11: return '霧霾黃擔當';
    case 12: return '霧霾紅擔當';
    case 13: return '霧霾紫擔當';
    case 14: return '霧霾綠擔當';
    case 15: return 'VTUBER';
    default: return null;
  }
};

const MEMBER_CREDENTIALS: Record<number, { user: string; pass: string }> = {
  1: { user: 'QPKS54321', pass: '紡塊像素一生推' },
  // 可在此處為其他成員 (2-6) 新增帳號密碼
};

const TypingText: React.FC<{ text: string; className?: string }> = ({ text, className }) => {
  return (
    <motion.div
      key={text}
      initial={{ width: 0 }}
      animate={{ width: '100%' }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`overflow-hidden whitespace-nowrap ${className}`}
    >
      {text}
    </motion.div>
  );
};

const SOCIAL_LINKS = [
  { label: 'Instagram:紡塊像素CubePixel Officase', icon: '📸', color: '#A078D1', url: 'https://www.instagram.com/cubepixel.officase?igsh=Y3VuZ2NnOTBsMWZz' },
  { label: 'YOUTUBE:紡塊像素CubePixel', icon: '📺', color: '#FF0000', url: 'https://www.youtube.com/@Q%E3%83%94%E3%82%AF%E3%82%BB-%E3%82%A2%E3%82%A4%E3%83%89%E3%83%AB' },
  { label: 'LINE:紡塊像素CubePixel', icon: '💬', color: '#06C755', url: 'https://line.me/R/ti/p/@546ymkbs' },
];

const BubbleSystem: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [bubbles, setBubbles] = useState<{ 
    id: number; 
    x: number; 
    y: number;
    vx: number;
    vy: number;
    size: number; 
    color: string; 
    link: typeof SOCIAL_LINKS[0];
  }[]>([]);
  const [isClearing, setIsClearing] = useState(false);
  const draggedIdRef = useRef<number | null>(null);
  const mousePosRef = useRef({ x: 0, y: 0 });
  
  // Continuous drop interval
  useEffect(() => {
    const interval = setInterval(() => {
      if (!containerRef.current) return;
      const { clientWidth } = containerRef.current;
      const link = SOCIAL_LINKS[Math.floor(Math.random() * SOCIAL_LINKS.length)];
      const size = 80;
      const newBubble = {
        id: Date.now() + Math.random(),
        x: Math.random() * (clientWidth - 150) + 75,
        y: -150,
        vx: (Math.random() - 0.5) * 6,
        vy: 0,
        size: size,
        color: link.color,
        link: link,
      };
      setBubbles(prev => {
        const nextBubbles = [...prev, newBubble];
        // Cap the number of active bubbles at 25 to optimize performance and prevent memory/rendering lag
        if (nextBubbles.length > 25) {
          return nextBubbles.slice(nextBubbles.length - 25);
        }
        return nextBubbles;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Mouse tracking
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      mousePosRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };
    const handlePointerUp = () => {
      draggedIdRef.current = null;
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, []);

  // Clearing interval (only active when pile reaches top)
  useEffect(() => {
    if (!isClearing) return;

    const interval = setInterval(() => {
      setBubbles(prev => {
        if (!containerRef.current) return prev;
        const rect = containerRef.current.getBoundingClientRect();
        const clientHeight = rect.height;
        const viewportBottom = window.innerHeight - rect.top;
        const ground = Math.min(clientHeight, viewportBottom) - 20;

        // Remove all bubbles touching the bottom edge
        return prev.filter(b => (b.y + b.size) < ground - 5);
      });
    }, 2500);
    return () => clearInterval(interval);
  }, [isClearing]);

  useEffect(() => {
    let rafId: number;
    const update = () => {
      setBubbles(prev => {
        if (prev.length === 0 || !containerRef.current) return prev;
        const rect = containerRef.current.getBoundingClientRect();
        const clientWidth = rect.width;
        const clientHeight = rect.height;
        
        const viewportBottom = window.innerHeight - rect.top;
        const ground = Math.min(clientHeight, viewportBottom) - 20;

        const next = prev.map(b => ({ ...b }));
        const gravity = 0.4;
        const bounce = 0.3;
        const friction = 0.98;

        let reachedTop = false;

        // Physics Update
        for (let i = 0; i < next.length; i++) {
          const b = next[i];
          
          if (draggedIdRef.current === b.id) {
            // Dragging logic
            const targetX = mousePosRef.current.x - b.size / 2;
            const targetY = mousePosRef.current.y - b.size / 2;
            b.vx = (targetX - b.x) * 0.3;
            b.vy = (targetY - b.y) * 0.3;
            b.x = targetX;
            b.y = targetY;
          } else {
            b.vy += gravity;
            b.y += b.vy;
            b.x += b.vx;
          }

          // Ground collision
          if (b.y + b.size > ground) {
            b.y = ground - b.size;
            b.vy *= -bounce;
            b.vx *= friction;
          }
          // Wall collision
          if (b.x < 0) { b.x = 0; b.vx *= -bounce; }
          if (b.x + b.size > clientWidth) { b.x = clientWidth - b.size; b.vx *= -bounce; }

          // Check if reached top (Trigger clearing logic)
          if (Math.abs(b.vy) < 1 && b.y < 50 && draggedIdRef.current !== b.id) {
            reachedTop = true;
          }
        }

        // Update clearing state
        if (reachedTop !== isClearing) {
          setIsClearing(reachedTop);
        }

        // Collision & Merge Logic
        const toRemove = new Set<number>();
        // Run collision multiple times for stability
        for (let step = 0; step < 2; step++) {
          for (let i = 0; i < next.length; i++) {
            for (let j = i + 1; j < next.length; j++) {
              const b1 = next[i];
              const b2 = next[j];
              if (toRemove.has(b1.id) || toRemove.has(b2.id)) continue;

              const dx = (b1.x + b1.size/2) - (b2.x + b2.size/2);
              const dy = (b1.y + b1.size/2) - (b2.y + b2.size/2);
              const dist = Math.sqrt(dx*dx + dy*dy);
              const minDist = (b1.size + b2.size) / 2;

              if (dist < minDist) {
                if (b1.link.label === b2.link.label && Math.abs(b1.size - b2.size) < 1 && step === 0) {
                  b1.size = Math.min(b1.size * 1.3, 250);
                  b1.x = (b1.x + b2.x) / 2;
                  b1.y = (b1.y + b2.y) / 2;
                  b1.vx = (b1.vx + b2.vx) / 2;
                  b1.vy = (b1.vy + b2.vy) / 2;
                  toRemove.add(b2.id);
                } else {
                  // Strict collision resolution
                  const angle = Math.atan2(dy, dx);
                  const overlap = minDist - dist;
                  
                  // Push out logic
                  const moveX = Math.cos(angle) * (overlap / 2);
                  const moveY = Math.sin(angle) * (overlap / 2);
                  
                  if (draggedIdRef.current === b1.id) {
                    b2.x -= moveX * 2;
                    b2.y -= moveY * 2;
                    b2.vx -= moveX * 0.5;
                    b2.vy -= moveY * 0.5;
                  } else if (draggedIdRef.current === b2.id) {
                    b1.x += moveX * 2;
                    b1.y += moveY * 2;
                    b1.vx += moveX * 0.5;
                    b1.vy += moveY * 0.5;
                  } else {
                    b1.x += moveX;
                    b1.y += moveY;
                    b2.x -= moveX;
                    b2.y -= moveY;
                    
                    // Simple elastic collision response
                    const nx = dx / dist;
                    const ny = dy / dist;
                    const p = 2 * (b1.vx * nx + b1.vy * ny - b2.vx * nx - b2.vy * ny) / 2;
                    b1.vx -= p * nx * bounce;
                    b1.vy -= p * ny * bounce;
                    b2.vx += p * nx * bounce;
                    b2.vy += p * ny * bounce;
                  }
                }
              }
            }
          }
        }

        return next.filter(b => !toRemove.has(b.id));
      });
      rafId = requestAnimationFrame(update);
    };
    rafId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(rafId);
  }, [isClearing]);

  return (
    <div ref={containerRef} className="absolute inset-0 z-50 pointer-events-none overflow-hidden">
      {/* Background Instructions */}
      <div className="absolute inset-0 flex flex-col items-center justify-center opacity-10 select-none pointer-events-none">
        <h2 className="text-6xl font-black mb-4 text-white text-center">
          這是西瓜遊戲 請靜待球掉下來
        </h2>
        <p className="text-4xl font-bold text-white">
          (雙擊以跳轉連結)
        </p>
      </div>
      <AnimatePresence>
        {bubbles.map(bubble => (
          <motion.div
            key={bubble.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05, zIndex: 100 }}
            onPointerDown={(e) => {
              e.preventDefault();
              draggedIdRef.current = bubble.id;
            }}
            onDoubleClick={() => {
              window.open(bubble.link.url, '_blank', 'noopener,noreferrer');
            }}
            className="absolute flex items-center justify-center rounded-full border-4 border-white/40 shadow-[0_0_40px_rgba(255,255,255,0.1)] backdrop-blur-md cursor-grab active:cursor-grabbing pointer-events-auto group transition-transform duration-75"
            style={{
              width: bubble.size,
              height: bubble.size,
              backgroundColor: `${bubble.color}88`,
              left: bubble.x,
              top: bubble.y,
              touchAction: 'none'
            }}
          >
            <div className="flex flex-col items-center justify-center pointer-events-none">
              <span className="mb-1" style={{ fontSize: bubble.size * 0.4 }}>{bubble.link.icon}</span>
              <span className="text-[10px] font-black text-white text-center leading-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {bubble.link.label}
              </span>
            </div>
            <div className="absolute top-2 left-4 w-1/3 h-1/4 bg-white/30 rounded-full blur-[2px] rotate-[-20deg]" />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

const CharacterSelect: React.FC<{ 
  onHome?: () => void; 
  onPageChange?: (id: string) => void; 
  onSpecialPage?: (id: number) => void;
  onTriggerLogin?: () => void;
}> = ({ onHome, onPageChange, onSpecialPage, onTriggerLogin }) => {
  const PRODUCER_FIGHTER = FIGHTERS.find(f => f.id === 1)!;
  const HONORARY_FIGHTER = FIGHTERS.find(f => f.id === 8)!;
  const INITIAL_MEMBERS = FIGHTERS.filter(f => f.id !== 1 && f.id !== 8 && f.id < 10);
  const SECOND_GEN_MEMBERS = FIGHTERS.filter(f => f.id >= 11 && f.id <= 14);
  const INDEPENDENT_MEMBERS = FIGHTERS.filter(f => f.id === 15);
  const DISABLED_SLOTS = Array.from({ length: 16 }, (_, i) => ({
    id: 100 + i,
    name: '🔒 LOCK',
    color: '#333333',
    icon: '?',
    disabled: true,
  }));

  return (
    <div className="relative w-full flex flex-col font-mono px-3 sm:px-4 md:px-6 pb-20 justify-center items-center pt-36 sm:pt-44">
      {/* Character Grid Selector Area - slightly scaled down from full screen with margins */}
      <div className="w-full max-w-[1720px] bg-slate-900/40 backdrop-blur-xs p-4 sm:p-6 md:p-10 xl:p-12 z-10 rounded-3xl">
        
        {/* ROW 1: Producer & Honorary Member (涼海璃 & 遜砲小藍) */}
        <div className="mb-12">
          <div className="text-[10px] sm:text-xs text-[#4C5E6E] font-pixel tracking-[0.25em] mb-5 uppercase flex items-center gap-3 px-2">
            <span>PRODUCER & HONORARY MEMBER / 製作人與榮譽團員</span>
            <span className="h-[1px] bg-[#4C5E6E]/20 flex-1" />
          </div>
          <div className="grid grid-cols-4 gap-4 sm:gap-6 md:gap-8 lg:gap-10">
            {/* Producer Card */}
            <motion.div
              key={PRODUCER_FIGHTER.id}
              onClick={() => onSpecialPage?.(PRODUCER_FIGHTER.id)}
              whileHover={{ y: -10, scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="relative aspect-[16/9] rounded-3xl overflow-hidden cursor-pointer bg-black/80 hover:bg-black/90 border-2 border-white/15 hover:border-white/40 shadow-[0_12px_36px_rgba(0,0,0,0.6)] hover:shadow-[0_0_45px_rgba(255,255,255,0.2)] transition-all text-left"
            >
              <div className="absolute inset-0 w-full h-full">
                <img 
                  src={umiriOfficialPhoto} 
                  alt="Suzuumiri Official Photo"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </div>
              
              <div className="absolute top-3 left-3 bg-[#4C5E6E] text-white text-[9px] sm:text-xs md:text-sm font-black px-2 py-1 rounded-lg uppercase font-pixel tracking-widest shadow-md">
                製作人
              </div>
              
              <div className="absolute bottom-3 left-3 sm:bottom-6 sm:left-6 text-sm sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-black italic text-white tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                涼海 璃(璃帽)
              </div>
            </motion.div>

            {/* Honorary Member Card (遜砲小藍) */}
            <motion.div
              key={HONORARY_FIGHTER.id}
              onClick={() => onSpecialPage?.(HONORARY_FIGHTER.id)}
              whileHover={{ y: -10, scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="relative aspect-[16/9] rounded-3xl overflow-hidden cursor-pointer bg-black/80 hover:bg-black/90 border-2 border-white/15 hover:border-white/40 shadow-[0_12px_36px_rgba(0,0,0,0.6)] hover:shadow-[0_0_45px_rgba(255,255,255,0.2)] transition-all text-left"
            >
              <div 
                className="absolute inset-0 flex items-center justify-center text-5xl sm:text-7xl md:text-8xl lg:text-9xl xl:text-[11rem] opacity-90 font-black drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]"
                style={{ color: HONORARY_FIGHTER.color }}
              >
                {HONORARY_FIGHTER.icon}
              </div>
              
              <div className="absolute top-3 left-3 bg-white text-black text-[9px] sm:text-xs md:text-sm font-black px-2 py-1 rounded-lg uppercase font-pixel tracking-widest shadow-md">
                榮譽團員
              </div>

              <div className="absolute bottom-3 left-3 sm:bottom-6 sm:left-6 text-sm sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-black italic text-white tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                遜砲小藍
              </div>
            </motion.div>
          </div>
        </div>

        {/* ROW 2: Members (紡塊像素CubePixel_一期生) */}
        <div className="mb-12">
          <div className="text-[10px] sm:text-xs text-white/40 font-pixel tracking-[0.25em] mb-5 uppercase flex items-center gap-3 px-2">
            <span>紡塊像素CubePixel_一期生 / 1ST GENERATION</span>
            <span className="h-[1px] bg-white/10 flex-1" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8 lg:gap-10">
            {/* Initial Members */}
            {INITIAL_MEMBERS.map((f) => (
              <motion.div
                key={f.id}
                onClick={() => onSpecialPage?.(f.id)}
                whileHover={{ y: -10, scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="relative aspect-[16/9] rounded-3xl overflow-hidden cursor-pointer bg-black/80 hover:bg-black/90 border-2 border-white/15 hover:border-white/40 shadow-[0_12px_36px_rgba(0,0,0,0.6)] hover:shadow-[0_0_45px_rgba(255,255,255,0.2)] transition-all text-left"
              >
                <div 
                  className="absolute inset-0 flex items-center justify-center text-5xl sm:text-7xl md:text-8xl lg:text-9xl xl:text-[11rem] opacity-95 font-black font-pixel drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]"
                  style={{ color: f.color }}
                >
                  {f.icon}
                </div>

                {getRoleTag(f.id) && (
                  <div 
                    className="absolute top-3 left-3 text-black text-[9px] sm:text-xs md:text-sm font-black px-2 py-1 rounded-lg uppercase font-pixel tracking-widest shadow-md"
                    style={{ backgroundColor: f.color }}
                  >
                    {getRoleTag(f.id)}
                  </div>
                )}

                <div className="absolute bottom-3 left-3 sm:bottom-6 sm:left-6 text-sm sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-black italic text-white tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  {f.name}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ROW 3: 蕷蒔泡沫YOJIUTA_二期生預定 */}
        <div className="mb-12">
          <div className="text-[10px] sm:text-xs text-white/40 font-pixel tracking-[0.25em] mb-5 uppercase flex items-center gap-3 px-2">
            <span>蕷蒔泡沫YOJIUTA_二期生預定</span>
            <span className="h-[1px] bg-white/10 flex-1" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8 lg:gap-10">
            {SECOND_GEN_MEMBERS.map((slot) => (
              <motion.div
                key={slot.id}
                onClick={() => onSpecialPage?.(slot.id)}
                whileHover={{ y: -10, scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="relative aspect-[16/9] rounded-3xl overflow-hidden cursor-pointer bg-black/80 hover:bg-black/90 border-2 border-white/15 hover:border-white/40 shadow-[0_12px_36px_rgba(0,0,0,0.6)] hover:shadow-[0_0_45px_rgba(255,255,255,0.2)] transition-all text-left"
              >
                <div 
                  className="absolute inset-0 flex items-center justify-center text-5xl sm:text-7xl md:text-8xl lg:text-9xl xl:text-[11rem] opacity-95 font-black font-pixel drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]"
                  style={{ color: slot.color }}
                >
                  {slot.icon}
                </div>

                {getRoleTag(slot.id) && (
                  <div 
                    className="absolute top-3 left-3 text-black text-[9px] sm:text-xs md:text-sm font-black px-2 py-1 rounded-lg uppercase font-pixel tracking-widest shadow-md"
                    style={{ backgroundColor: slot.color }}
                  >
                    {getRoleTag(slot.id)}
                  </div>
                )}

                <div className="absolute bottom-3 left-3 sm:bottom-6 sm:left-6 text-sm sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-black italic text-white tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  {slot.name}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ROW: 獨立活動藝人 | VTUBER企劃 */}
        <div className="mb-12">
          <div className="text-[10px] sm:text-xs text-white/40 font-pixel tracking-[0.25em] mb-5 uppercase flex items-center gap-3 px-2">
            <span>獨立活動藝人 | VTUBER企劃</span>
            <span className="h-[1px] bg-white/10 flex-1" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8 lg:gap-10">
            {INDEPENDENT_MEMBERS.map((slot) => (
              <motion.div
                key={slot.id}
                onClick={() => onSpecialPage?.(slot.id)}
                whileHover={{ y: -10, scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="relative aspect-[16/9] rounded-3xl overflow-hidden cursor-pointer bg-black/80 hover:bg-black/90 border-2 border-white/15 hover:border-[#A855F7]/50 shadow-[0_12px_36px_rgba(0,0,0,0.6)] hover:shadow-[0_0_45px_rgba(168,85,247,0.3)] transition-all text-left"
              >
                <div 
                  className="absolute inset-0 flex items-center justify-center text-5xl sm:text-7xl md:text-8xl lg:text-9xl xl:text-[11rem] opacity-95 font-black font-pixel drop-shadow-[0_8px_16px_rgba(0,0,0,0.5)]"
                  style={{ color: slot.color }}
                >
                  {slot.icon}
                </div>

                {getRoleTag(slot.id) && (
                  <div 
                    className="absolute top-3 left-3 text-black text-[9px] sm:text-xs md:text-sm font-black px-2 py-1 rounded-lg uppercase font-pixel tracking-widest shadow-md"
                    style={{ backgroundColor: slot.color }}
                  >
                    {getRoleTag(slot.id)}
                  </div>
                )}

                <div className="absolute bottom-3 left-3 sm:bottom-6 sm:left-6 text-sm sm:text-xl md:text-2xl lg:text-3xl xl:text-4xl font-black italic text-white tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                  {slot.name}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* ROW 4: Candidates (候選名單_待招募) */}
        <div>
          <div className="text-[10px] sm:text-xs text-white/40 font-pixel tracking-[0.25em] mb-5 uppercase flex items-center gap-3 px-2">
            <span>候選名單_待招募 / CANDIDATES</span>
            <span className="h-[1px] bg-white/10 flex-1" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 md:gap-8 lg:gap-10">
            {/* 10 Black Disabled Slots */}
            {DISABLED_SLOTS.map((slot) => (
              <div
                key={slot.id}
                className="relative aspect-[16/9] bg-black/90 w-full rounded-3xl overflow-hidden flex flex-col items-center justify-center select-none border-2 border-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.7)]"
              >
                <div className="text-3xl sm:text-5xl md:text-7xl lg:text-8xl xl:text-9xl text-white/5 font-black font-pixel">?</div>
                <div className="absolute bottom-3 text-safety text-[8px] sm:text-xs md:text-sm text-white/5 font-pixel uppercase tracking-[0.3em]">
                  LOCKED
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const PixelHeart: React.FC<{ color: string, onClick: () => void, label: string, isActive: boolean, size?: 'sm' | 'md', disabled?: boolean }> = ({ color, onClick, label, isActive, size = 'md', disabled = false }) => {
  const heartPattern = [
    [0, 1, 1, 0, 1, 1, 0],
    [1, 2, 2, 1, 2, 2, 1],
    [1, 2, 2, 2, 2, 2, 1],
    [1, 2, 2, 2, 2, 2, 1],
    [0, 1, 2, 2, 2, 1, 0],
    [0, 0, 1, 2, 1, 0, 0],
    [0, 0, 0, 1, 0, 0, 0],
  ];

  const pixelSize = size === 'sm' ? 'w-2 h-2' : 'w-4 h-4 md:w-5 md:h-5';

  return (
    <div className="flex flex-col items-center translate-y-[1px]">
      <motion.div 
        onClick={disabled ? undefined : onClick}
        whileHover={disabled ? {} : { scale: 1.15 }}
        whileTap={disabled ? {} : { scale: 0.9 }}
        className={`${disabled ? 'opacity-40' : 'opacity-70 hover:opacity-90'} p-1.5 grid grid-cols-7 gap-0.5 transition-all duration-300 ${isActive ? 'scale-125 drop-shadow-[0_0_20px_rgba(255,255,255,0.6)] opacity-100' : ''}`}
      >
        {heartPattern.flat().map((pixel, i) => (
          <div 
            key={i} 
            className={pixelSize}
            style={{ 
              backgroundColor: pixel === 1 ? '#FFFFFF' : pixel === 2 ? color : 'transparent' 
            }}
          />
        ))}
      </motion.div>
    </div>
  );
};

const PixelRadio: React.FC<{ onClick: () => void, size?: 'sm' | 'md', isActive: boolean }> = ({ onClick, size = 'md', isActive }) => {
  const radioPattern = [
    [0, 0, 1, 0, 0, 0, 0],
    [0, 0, 1, 0, 0, 0, 0],
    [1, 1, 1, 1, 1, 1, 1],
    [1, 2, 2, 2, 2, 2, 1],
    [1, 2, 1, 1, 1, 2, 1],
    [1, 2, 2, 2, 2, 2, 1],
    [1, 1, 1, 1, 1, 1, 1],
  ];

  const pixelSize = size === 'sm' ? 'w-2 h-2' : 'w-4 h-4 md:w-5 md:h-5';

  return (
    <div className="flex flex-col items-center translate-y-[1px]">
      <motion.div 
        onClick={onClick}
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.9 }}
        className={`opacity-70 hover:opacity-100 p-1.5 grid grid-cols-7 gap-0.5 transition-all duration-300 ${isActive ? 'scale-125 drop-shadow-[0_0_20px_rgba(255,255,255,0.6)] opacity-100' : ''}`}
      >
        {radioPattern.flat().map((pixel, i) => (
          <div 
            key={i} 
            className={pixelSize}
            style={{ 
              backgroundColor: pixel === 1 ? '#FFFFFF' : pixel === 2 ? '#E0E0E0' : 'transparent' 
            }}
          />
        ))}
      </motion.div>
    </div>
  );
};

const Typewriter: React.FC<{ text: string; speed?: number; onComplete?: () => void }> = ({ text, speed = 50, onComplete }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [index, setIndex] = useState(0);

  // Use a ref for onComplete to prevent typewriter sequence resets on parent updates
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (index < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[index]);
        setIndex(prev => prev + 1);
      }, speed);
      return () => clearTimeout(timeout);
    } else if (onCompleteRef.current) {
      onCompleteRef.current();
    }
  }, [index, text, speed]);

  return <div className="whitespace-pre-wrap leading-relaxed">{displayedText}</div>;
};

const FallingBlocksOverlay: React.FC = () => {
  const [blocks, setBlocks] = useState<{id: string, color: string, column: number, row: number}[]>([]);
  const [dimensions, setDimensions] = useState({ cols: 0, rows: 0 });

  useEffect(() => {
    const update = () => {
      setDimensions({
        cols: Math.ceil(window.innerWidth / GRID_SIZE),
        rows: Math.ceil(window.innerHeight / GRID_SIZE)
      });
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  useEffect(() => {
    if (dimensions.cols === 0) return;
    const interval = setInterval(() => {
      setBlocks(prev => {
        const newBlocks = prev
          .map(b => ({ ...b, row: b.row + 1 }))
          .filter(b => b.row < dimensions.rows + 5);

        if (Math.random() > 0.4) {
          newBlocks.push({
            id: Math.random().toString(),
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            column: Math.floor(Math.random() * dimensions.cols),
            row: -1
          });
        }
        return newBlocks;
      });
    }, 150);
    return () => clearInterval(interval);
  }, [dimensions]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-40">
      {blocks.map(block => (
        <div
          key={block.id}
          style={{
            position: 'absolute',
            width: GRID_SIZE - 4,
            height: GRID_SIZE - 4,
            backgroundColor: block.color,
            left: block.column * GRID_SIZE + 2,
            top: block.row * GRID_SIZE + 2,
            transition: `top 150ms linear`,
            boxShadow: `inset 0 0 8px rgba(255,255,255,0.2), 0 0 15px ${block.color}33`,
            border: '1px solid rgba(255,255,255,0.15)',
          }}
        />
      ))}
    </div>
  );
};

const SpecialThanksPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const credits = `經紀公司:海璃海狸工作室
幕後贊助:酸欠像素偶像居酒屋
(沒錯 還是阿璃一手撐起這個偶像團的)

製作人:涼海璃UMIRI
營運:涼海璃UMIRI
官網工程師:涼海璃UMIRI
服裝設計:涼海璃UMIRI
道具組:涼海璃UMIRI
作詞:涼海璃UMIRI

攝影:涼海璃UMIRI
後製剪輯:涼海璃UMIRI
美工:涼海璃UMIRI

社群小編:涼海璃UMIRI
合作對接窗口:涼海璃UMIRI

團長:涼海璃UMIRI
居酒屋店長:「璃店長UMIRI-TENCHO」(還是涼海璃)

榮譽團員:遜砲小藍(一隻長得像麥克風的瘋狂喇叭)`;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[1000] bg-[#000814] flex flex-col font-mono overflow-hidden"
    >
      <FallingBlocksOverlay />

      {/* Top-Left Return Button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        whileHover={{ scale: 1.1, x: 5 }}
        whileTap={{ scale: 0.9 }}
        onClick={onBack}
        className="absolute top-8 left-8 z-[1010] flex items-center gap-4 text-white/50 hover:text-white group"
      >
        <div className="w-10 h-10 rounded-full border border-white/30 flex items-center justify-center group-hover:bg-white group-hover:text-[#000814] transition-all">
          <span className="text-xl">←</span>
        </div>
        <span className="font-black tracking-widest text-xs uppercase">Return</span>
      </motion.button>

      {/* Credits Content */}
      <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-6 py-24 overflow-y-auto max-h-[85vh] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="max-w-4xl w-full text-white/90 text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold tracking-wider text-center leading-relaxed sm:leading-loose">
          <Typewriter text={credits} speed={80} />
        </div>
      </div>

      {/* Bottom Label */}
      <div className="absolute bottom-12 left-12 text-white/10 font-black tracking-[0.5em] text-[10px] uppercase">
        UMIRI_CREDITS_SEQUENCE // SYSTEM_OVERRIDE
      </div>
    </motion.div>
  );
};

// --- Calligraphy Text Configuration for 2nd Gen Members ---
const CALLIGRAPHY_TEXT_MAP: Record<number, string> = {
  11: '四方八面',
};

// --- Swimming Fish Silhouette Graphic ---
const SwimmingFishGraphic: React.FC<{ color?: string; opacity?: number }> = ({ 
  color = '#38bdf8', 
  opacity = 0.6 
}) => {
  const gradId = `fish-grad-${color.replace('#', '')}-${Math.floor(opacity * 100)}`;
  return (
    <svg viewBox="0 0 160 56" className="w-full h-full overflow-visible" fill="none">
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={color} stopOpacity={opacity * 0.4} />
          <stop offset="55%" stopColor={color} stopOpacity={opacity * 0.85} />
          <stop offset="100%" stopColor={color} stopOpacity={opacity} />
        </linearGradient>
      </defs>
      
      {/* Main Fish Body (Head pointing to right +X, at x=148) */}
      <path
        d="M148,28 C128,10 88,6 48,20 C32,10 16,14 0,18 C10,24 16,32 0,38 C16,42 32,46 48,36 C88,50 128,46 148,28 Z"
        fill={`url(#${gradId})`}
      />
      
      {/* Dorsal Fin */}
      <path
        d="M96,15 C85,2 62,6 56,19 C72,13 86,13 96,15 Z"
        fill={color}
        fillOpacity={opacity * 0.75}
      />
      
      {/* Pectoral Fin */}
      <path
        d="M106,30 C100,44 82,52 74,42 C88,40 98,34 106,30 Z"
        fill={color}
        fillOpacity={opacity * 0.7}
      />
      
      {/* Tail Fin Details */}
      <path
        d="M32,27 C20,10 6,12 0,18 C8,24 8,32 0,38 C6,44 20,46 32,29 Z"
        fill={color}
        fillOpacity={opacity * 0.9}
      />

      {/* Subtle Luminescent Spine/Highlight */}
      <path
        d="M138,28 C112,23 75,24 45,28"
        stroke="#ffffff"
        strokeWidth="1.5"
        strokeOpacity={opacity * 0.35}
        strokeLinecap="round"
      />
    </svg>
  );
};

// --- Umiri Aquatic Lake Background with Splashes & Swimming Fish Shadows ---
const UmiriAquaticFishAndSplashEffect: React.FC = () => {
  // 16 swimming fish with different shades of blue, sizes, speeds, angles, and trajectories
  // Every fish swims forward in the exact direction of its head (vector = cos(angle), sin(angle))
  const fishSchool = useMemo(() => [
    // Right-bound / Up-Right / Down-Right Swimmers (angle between -45deg and 45deg)
    { id: 1, angle: -18, speed: 18, delay: 0, size: 115, color: '#0284c7', opacity: 0.65, startX: -12, startY: 65, dist: 135, blur: 'blur-[0.5px]' },
    { id: 2, angle: 14, speed: 24, delay: 3.5, size: 68, color: '#38bdf8', opacity: 0.45, startX: -8, startY: 22, dist: 130, blur: 'blur-[1.5px]' },
    { id: 3, angle: -32, speed: 15, delay: 7.2, size: 90, color: '#1d4ed8', opacity: 0.7, startX: 10, startY: 95, dist: 125, blur: 'blur-none' },
    { id: 4, angle: 22, speed: 20, delay: 1.8, size: 105, color: '#0369a1', opacity: 0.55, startX: -10, startY: 10, dist: 135, blur: 'blur-[1px]' },
    { id: 5, angle: -10, speed: 29, delay: 5.5, size: 52, color: '#0ea5e9', opacity: 0.4, startX: -6, startY: 78, dist: 140, blur: 'blur-[2px]' },
    { id: 6, angle: -42, speed: 13, delay: 12.0, size: 98, color: '#2563eb', opacity: 0.75, startX: 35, startY: 102, dist: 125, blur: 'blur-none' },
    { id: 7, angle: -5, speed: 22, delay: 9.0, size: 62, color: '#0891b2', opacity: 0.6, startX: -8, startY: 42, dist: 135, blur: 'blur-[0.5px]' },
    { id: 8, angle: 8, speed: 27, delay: 14.5, size: 135, color: '#1e3a8a', opacity: 0.45, startX: -15, startY: 55, dist: 145, blur: 'blur-[2.5px]' },
    
    // Left-bound / Up-Left / Down-Left Swimmers (angle between 145deg and 215deg)
    { id: 9, angle: 168, speed: 26, delay: 2.2, size: 120, color: '#0284c7', opacity: 0.5, startX: 108, startY: 38, dist: 140, blur: 'blur-[1px]' },
    { id: 10, angle: 195, speed: 19, delay: 10.5, size: 72, color: '#60a5fa', opacity: 0.4, startX: 106, startY: 18, dist: 135, blur: 'blur-[1.5px]' },
    { id: 11, angle: 160, speed: 21, delay: 6.8, size: 82, color: '#1e40af', opacity: 0.65, startX: 108, startY: 72, dist: 135, blur: 'blur-none' },
    { id: 12, angle: 185, speed: 23, delay: 13.2, size: 88, color: '#0369a1', opacity: 0.5, startX: 106, startY: 58, dist: 135, blur: 'blur-[0.5px]' },
    { id: 13, angle: 175, speed: 28, delay: 16.0, size: 95, color: '#0284c7', opacity: 0.45, startX: 108, startY: 28, dist: 140, blur: 'blur-[2px]' },
    { id: 14, angle: -28, speed: 16, delay: 15.5, size: 48, color: '#38bdf8', opacity: 0.7, startX: 2, startY: 88, dist: 130, blur: 'blur-none' },
    { id: 15, angle: 192, speed: 17, delay: 8.5, size: 58, color: '#93c5fd', opacity: 0.55, startX: 105, startY: 85, dist: 130, blur: 'blur-[1px]' },
    { id: 16, angle: -15, speed: 32, delay: 4.2, size: 145, color: '#0f766e', opacity: 0.4, startX: -14, startY: 30, dist: 145, blur: 'blur-[3px]' },
  ], []);

  // Water Splashes (水花效果：多組定點水花噴濺與水花水環)
  const splashSites = useMemo(() => [
    { id: 'sp1', x: '18%', y: '16%', duration: 4.8, delay: 0 },
    { id: 'sp2', x: '82%', y: '24%', duration: 5.5, delay: 2.2 },
    { id: 'sp3', x: '45%', y: '12%', duration: 6.2, delay: 1.1 },
    { id: 'sp4', x: '72%', y: '78%', duration: 5.0, delay: 3.4 },
    { id: 'sp5', x: '26%', y: '82%', duration: 5.8, delay: 4.2 },
    { id: 'sp6', x: '58%', y: '48%', duration: 6.5, delay: 2.8 },
  ], []);

  // Ambient Rising Aquatic Bubbles (上升水泡)
  const bubbles = useMemo(() => Array.from({ length: 22 }, (_, i) => ({
    id: i,
    left: `${4 + (i * 4.4) + (Math.sin(i * 9) * 2)}%`,
    size: 5 + ((i * 7) % 13),
    duration: 8 + ((i * 3.7) % 9),
    delay: (i * 0.7) % 7,
    sway: (i % 2 === 0 ? 1 : -1) * (10 + (i % 15)),
    opacity: 0.25 + ((i % 5) * 0.1),
  })), []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Deep & Light Lake Cyan-Blue-Green Layered Backdrop (深淺不一的湖水藍綠背景) */}
      <div 
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(ellipse at 50% 20%, #155e75 0%, #0e4453 45%, #092b36 80%),
            radial-gradient(ellipse at 85% 75%, #0d4b5c 0%, transparent 60%),
            radial-gradient(ellipse at 15% 85%, #0a3a47 0%, transparent 60%)
          `,
        }}
      />

      {/* Shimmering Lake Water Caustics / Sunlight Reflections (陽光穿透水面水紋光影) */}
      <div className="absolute inset-0 opacity-30 mix-blend-screen">
        <motion.div 
          animate={{
            opacity: [0.25, 0.45, 0.25],
            scale: [1, 1.05, 1],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at 50% 30%, rgba(34, 211, 238, 0.28) 0%, rgba(20, 184, 166, 0.15) 45%, transparent 75%)',
          }}
        />
        <motion.div 
          animate={{
            opacity: [0.15, 0.35, 0.15],
            x: [-20, 20, -20],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at 75% 60%, rgba(56, 189, 248, 0.22) 0%, transparent 60%)',
          }}
        />
      </div>

      {/* Water Splashes (水花效果：平滑無閃爍噴濺水珠粒子與水環) */}
      <div className="absolute inset-0">
        {splashSites.map((site) => (
          <div
            key={site.id}
            className="absolute pointer-events-none"
            style={{ left: site.x, top: site.y }}
          >
            {/* Center Splash Soft Mist Glow */}
            <motion.div
              initial={{ scale: 0.2, opacity: 0 }}
              animate={{
                scale: [0.2, 1.4, 1.8, 2.0, 2.0],
                opacity: [0, 0.45, 0.2, 0, 0],
              }}
              transition={{
                duration: site.duration,
                repeat: Infinity,
                times: [0, 0.12, 0.35, 0.6, 1],
                ease: "easeOut",
                delay: site.delay,
              }}
              className="absolute -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-cyan-300/30 blur-md"
            />

            {/* Splash Smooth Expanding Rings (漸進擴散淡出，無突兀閃爍) */}
            {[0, 0.45, 0.9].map((subDelay, subIdx) => (
              <motion.div
                key={subIdx}
                initial={{ scale: 0.1, opacity: 0 }}
                animate={{
                  scale: [0.1, 1.2, 2.2 + subIdx * 0.4, 2.8 + subIdx * 0.5, 2.8 + subIdx * 0.5],
                  opacity: [0, 0.55 - subIdx * 0.1, 0.3 - subIdx * 0.08, 0, 0],
                }}
                transition={{
                  duration: site.duration,
                  repeat: Infinity,
                  times: [0, 0.15, 0.5, 0.8, 1],
                  ease: "easeOut",
                  delay: site.delay + subDelay,
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2 w-28 h-28 rounded-full border border-cyan-200/50 shadow-[0_0_12px_rgba(34,211,238,0.3)]"
              />
            ))}

            {/* Splash Water Spray Droplets (平滑拋物線散開水花) */}
            {[
              { angle: -65, dist: 40, size: 5, delay: 0 },
              { angle: -40, dist: 52, size: 6, delay: 0.04 },
              { angle: -90, dist: 65, size: 7, delay: 0.02 },
              { angle: -120, dist: 50, size: 6, delay: 0.05 },
              { angle: -145, dist: 38, size: 5, delay: 0.03 },
              { angle: -25, dist: 30, size: 4, delay: 0.06 },
              { angle: -160, dist: 28, size: 4, delay: 0.07 },
            ].map((drop, dIdx) => {
              const rad = (drop.angle * Math.PI) / 180;
              const targetX = Math.cos(rad) * drop.dist;
              const targetY = Math.sin(rad) * drop.dist;
              return (
                <motion.div
                  key={dIdx}
                  initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                  animate={{
                    x: [0, targetX * 0.65, targetX, targetX, targetX],
                    y: [0, targetY - 6, targetY + 12, targetY + 16, targetY + 16],
                    scale: [0, 1.2, 0.8, 0, 0],
                    opacity: [0, 0.85, 0.6, 0, 0],
                  }}
                  transition={{
                    duration: site.duration,
                    repeat: Infinity,
                    times: [0, 0.12, 0.35, 0.55, 1],
                    ease: "easeOut",
                    delay: site.delay + drop.delay,
                  }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-t from-cyan-200 to-white shadow-[0_0_6px_rgba(255,255,255,0.7)]"
                  style={{ width: drop.size, height: drop.size }}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Ambient Rising Bubbles (上升水泡) */}
      <div className="absolute inset-0">
        {bubbles.map((b) => (
          <motion.div
            key={b.id}
            initial={{ y: '105vh', x: 0, opacity: 0 }}
            animate={{
              y: '-10vh',
              x: [0, b.sway, -b.sway, 0],
              opacity: [0, b.opacity, b.opacity, 0],
            }}
            transition={{
              y: {
                duration: b.duration,
                repeat: Infinity,
                ease: "linear",
                delay: b.delay,
              },
              x: {
                duration: b.duration / 2.5,
                repeat: Infinity,
                ease: "easeInOut",
              },
              opacity: {
                duration: b.duration,
                repeat: Infinity,
                times: [0, 0.1, 0.9, 1],
                delay: b.delay,
              }
            }}
            className="absolute rounded-full border border-cyan-200/50 bg-cyan-400/10 shadow-[0_0_6px_rgba(34,211,238,0.4)]"
            style={{
              left: b.left,
              width: b.size,
              height: b.size,
            }}
          />
        ))}
      </div>

      {/* Swimming Blue Fish Shadows (深淺不一的藍色游魚影 - 隨機出現並朝魚頭前方速度不一移動) */}
      <div className="absolute inset-0">
        {fishSchool.map((fish) => {
          // Calculate heading trajectory vector: D * (cos(angle), sin(angle))
          const rad = (fish.angle * Math.PI) / 180;
          const targetDeltaX = `${Math.cos(rad) * fish.dist}vw`;
          const targetDeltaY = `${Math.sin(rad) * fish.dist}vh`;

          return (
            <motion.div
              key={fish.id}
              initial={{
                x: 0,
                y: 0,
                opacity: 0,
              }}
              animate={{
                x: [0, targetDeltaX],
                y: [0, targetDeltaY],
                opacity: [0, fish.opacity, fish.opacity, 0],
              }}
              transition={{
                x: {
                  duration: fish.speed,
                  repeat: Infinity,
                  ease: "linear",
                  delay: fish.delay,
                },
                y: {
                  duration: fish.speed,
                  repeat: Infinity,
                  ease: "linear",
                  delay: fish.delay,
                },
                opacity: {
                  duration: fish.speed,
                  repeat: Infinity,
                  times: [0, 0.08, 0.92, 1],
                  delay: fish.delay,
                }
              }}
              style={{
                left: `${fish.startX}vw`,
                top: `${fish.startY}vh`,
                width: fish.size,
                height: fish.size * 0.35,
                transform: `rotate(${fish.angle}deg)`,
                transformOrigin: 'center center',
              }}
              className={`absolute select-none pointer-events-none ${fish.blur} drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)]`}
            >
              {/* Fish Body with Swimming Tail-Wiggle Motion */}
              <motion.div
                animate={{
                  rotate: [-3, 3, -3],
                  y: [-1.5, 1.5, -1.5],
                }}
                transition={{
                  duration: 0.8 + (fish.speed / 20),
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="w-full h-full"
              >
                <SwimmingFishGraphic color={fish.color} opacity={fish.opacity} />
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

const AncientWaterAndCalligraphyEffect: React.FC<{ fighterId: number; color?: string }> = ({ fighterId, color = '#B8AC78' }) => {
  const calligraphyText = CALLIGRAPHY_TEXT_MAP[fighterId];

  // Medium amount of floating calligraphy text streams (中量：14組從右向左橫向漂浮)
  const floatingParticles = useMemo(() => {
    if (!calligraphyText) return [];
    
    return [
      { id: 1, text: calligraphyText, top: '5%', duration: 20, delay: 0, size: 'text-4xl sm:text-5xl md:text-6xl', opacity: 0.28, swayY: 12 },
      { id: 2, text: calligraphyText, top: '13%', duration: 26, delay: 6.5, size: 'text-2xl sm:text-3xl md:text-4xl', opacity: 0.18, swayY: -10 },
      { id: 3, text: calligraphyText, top: '21%', duration: 18, delay: 11.5, size: 'text-5xl sm:text-6xl md:text-7xl', opacity: 0.32, swayY: 15 },
      { id: 4, text: calligraphyText, top: '29%', duration: 23, delay: 3.2, size: 'text-3xl sm:text-4xl md:text-5xl', opacity: 0.22, swayY: -8 },
      { id: 5, text: calligraphyText, top: '37%', duration: 19, delay: 14.8, size: 'text-2xl sm:text-3xl', opacity: 0.16, swayY: 10 },
      { id: 6, text: calligraphyText, top: '45%', duration: 27, delay: 8.4, size: 'text-4xl sm:text-5xl md:text-6xl', opacity: 0.26, swayY: -14 },
      { id: 7, text: calligraphyText, top: '53%', duration: 17, delay: 2.1, size: 'text-3xl sm:text-4xl md:text-5xl', opacity: 0.3, swayY: 9 },
      { id: 8, text: calligraphyText, top: '61%', duration: 28, delay: 16.2, size: 'text-5xl sm:text-7xl md:text-8xl', opacity: 0.2, swayY: -12 },
      { id: 9, text: calligraphyText, top: '69%', duration: 21, delay: 5.3, size: 'text-2xl sm:text-3xl md:text-4xl', opacity: 0.25, swayY: 14 },
      { id: 10, text: calligraphyText, top: '77%', duration: 24, delay: 12.7, size: 'text-4xl sm:text-5xl md:text-6xl', opacity: 0.35, swayY: -11 },
      { id: 11, text: calligraphyText, top: '84%', duration: 19, delay: 9.1, size: 'text-3xl sm:text-4xl md:text-5xl', opacity: 0.22, swayY: 8 },
      { id: 12, text: calligraphyText, top: '91%', duration: 29, delay: 1.5, size: 'text-2xl sm:text-3xl md:text-4xl', opacity: 0.18, swayY: -13 },
      { id: 13, text: calligraphyText, top: '17%', duration: 22, delay: 15.1, size: 'text-4xl sm:text-5xl', opacity: 0.24, swayY: 10 },
      { id: 14, text: calligraphyText, top: '57%', duration: 16, delay: 7.2, size: 'text-3xl sm:text-5xl md:text-6xl', opacity: 0.27, swayY: -8 },
    ];
  }, [calligraphyText]);

  // Ancient water ripples (古風水波漣漪)
  const ripples = useMemo(() => [
    { id: 'r1', x: '15%', y: '22%', duration: 7, delay: 0, maxScale: 3.2 },
    { id: 'r2', x: '80%', y: '16%', duration: 8.5, delay: 2.5, maxScale: 3.6 },
    { id: 'r3', x: '32%', y: '68%', duration: 9, delay: 4, maxScale: 4.0 },
    { id: 'r4', x: '85%', y: '75%', duration: 7.5, delay: 1.2, maxScale: 3.4 },
    { id: 'r5', x: '48%', y: '42%', duration: 10, delay: 5.5, maxScale: 4.5 },
  ], []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Soft gradient wash in member's signature color */}
      <div 
        className="absolute inset-0 opacity-40"
        style={{
          background: `radial-gradient(ellipse at 50% 30%, ${color}28 0%, transparent 70%), radial-gradient(ellipse at 80% 80%, ${color}18 0%, transparent 60%)`,
        }}
      />

      {/* Ancient Water Ripples (古風水波漣漪) */}
      <div className="absolute inset-0">
        {ripples.map((ripple) => (
          <div
            key={ripple.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{ left: ripple.x, top: ripple.y }}
          >
            {[0, 1.3, 2.6].map((subDelay, subIdx) => (
              <motion.div
                key={subIdx}
                initial={{ scale: 0.1, opacity: 0.7 }}
                animate={{
                  scale: [0.1, ripple.maxScale],
                  opacity: [0.65, 0],
                }}
                transition={{
                  duration: ripple.duration,
                  repeat: Infinity,
                  ease: "easeOut",
                  delay: ripple.delay + subDelay,
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2 w-44 h-44 rounded-full border border-dashed"
                style={{ borderColor: color }}
              />
            ))}
            <motion.div
              animate={{ opacity: [0.2, 0.7, 0.2], scale: [0.8, 1.3, 0.8] }}
              transition={{ duration: ripple.duration, repeat: Infinity, delay: ripple.delay }}
              className="w-2.5 h-2.5 rounded-full blur-[1px]"
              style={{ backgroundColor: color }}
            />
          </div>
        ))}
      </div>

      {/* Layered Flowing Ancient Water Wave SVG Curves (古風水波層疊波浪) */}
      <div className="absolute inset-x-0 bottom-0 h-[65%] opacity-30 overflow-hidden">
        {/* Wave Layer 1 */}
        <motion.svg
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
          className="absolute bottom-0 w-[200%] h-64 sm:h-80 -left-[50%]"
          animate={{ x: ['0%', '-25%', '0%'], y: [0, -14, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        >
          <path
            fill={color}
            fillOpacity="0.35"
            d="M0,160L48,176C96,192,192,224,288,218.7C384,213,480,171,576,165.3C672,160,768,192,864,208C960,224,1056,224,1152,197.3C1248,171,1344,117,1392,90.7L1440,64L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          />
        </motion.svg>

        {/* Wave Layer 2 */}
        <motion.svg
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
          className="absolute bottom-0 w-[200%] h-48 sm:h-64 -left-[20%]"
          animate={{ x: ['-20%', '0%', '-20%'], y: [0, 10, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        >
          <path
            fill={color}
            fillOpacity="0.25"
            d="M0,224L60,213.3C120,203,240,181,360,181.3C480,181,600,203,720,218.7C840,235,960,245,1080,229.3C1200,213,1320,171,1380,149.3L1440,128L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"
          />
        </motion.svg>

        {/* Wave Layer 3 - Gentle crest */}
        <motion.svg
          viewBox="0 0 1440 320"
          preserveAspectRatio="none"
          className="absolute bottom-0 w-[200%] h-36 sm:h-52 -left-[40%]"
          animate={{ x: ['0%', '-15%', '0%'], y: [0, -7, 0] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
        >
          <path
            fill={color}
            fillOpacity="0.4"
            d="M0,64L48,90.7C96,117,192,171,288,181.3C384,192,480,160,576,149.3C672,139,768,149,864,165.3C960,181,1056,203,1152,192C1248,181,1344,139,1392,117.3L1440,96L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          />
        </motion.svg>
      </div>

      {/* Floating Calligraphy Text - Horizontal from Right to Left (從右到左漂浮書法文字) */}
      {calligraphyText && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
          {floatingParticles.map((particle) => (
            <motion.div
              key={particle.id}
              initial={{ x: '105vw', y: 0, opacity: 0 }}
              animate={{
                x: ['105vw', '-60vw'],
                y: [0, particle.swayY, -particle.swayY, 0],
                opacity: [0, particle.opacity, particle.opacity, 0],
              }}
              transition={{
                x: {
                  duration: particle.duration,
                  repeat: Infinity,
                  ease: "linear",
                  delay: particle.delay,
                },
                y: {
                  duration: particle.duration / 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                },
                opacity: {
                  duration: particle.duration,
                  repeat: Infinity,
                  times: [0, 0.08, 0.92, 1],
                  delay: particle.delay,
                }
              }}
              style={{
                top: particle.top,
                fontFamily: '"Ma Shan Zheng", "Long Cang", "ZCOOL XiaoWei", "Kaiti", "STKaiti", "DFKai-SB", "Noto Serif TC", serif',
                color: color,
                textShadow: `0 0 20px ${color}80, 0 0 40px ${color}40`,
              }}
              className={`absolute whitespace-nowrap select-none font-normal tracking-[0.35em] ${particle.size} filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]`}
            >
              {particle.text}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

const UmiriSpecialPage: React.FC<{ fighterId: number; onBack: () => void; onSecretUnlock?: () => void }> = ({ fighterId, onBack, onSecretUnlock }) => {
  const activeFighter = FIGHTERS.find(f => f.id === fighterId) || FIGHTERS[0];
  const code = getFighterCode(fighterId);
  const isSecondGen = fighterId >= 11 && fighterId <= 14;
  const [isDraggingSheep, setIsDraggingSheep] = useState(false);
  const [sheepClickCount, setSheepClickCount] = useState(0);
  const [showEscalatorMonologue, setShowEscalatorMonologue] = useState(false);

  // Load custom Snoozing Hatsune Miku wait cursor for Umiri's special page only
  useEffect(() => {
    if (fighterId !== 1) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.cursors-4u.net/cursors/animated/wait-96-c3df6fb6-96.css';
    link.id = 'umiri-cursor-style';
    document.head.appendChild(link);
    
    // Disable the global custom cursor when on Umiri's special page
    document.documentElement.classList.add('umiri-special-active');

    return () => {
      const existing = document.getElementById('umiri-cursor-style');
      if (existing) {
        existing.remove();
      }
      // Re-enable global custom cursor when leaving Umiri's special page
      document.documentElement.classList.remove('umiri-special-active');
    };
  }, [fighterId]);

  const randomPos = useMemo(() => {
    // Generate a random position within the viewport, leaving some margin for the sticker size (approx 256px)
    const margin = 256;
    const maxX = typeof window !== 'undefined' ? window.innerWidth - margin : 800;
    const maxY = typeof window !== 'undefined' ? window.innerHeight - margin : 600;
    
    return {
      x: Math.max(20, Math.floor(Math.random() * maxX)),
      y: Math.max(20, Math.floor(Math.random() * maxY))
    };
  }, []);

  if (fighterId === 8) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[1000] bg-[#1a233a] flex flex-col items-center justify-center font-mono p-4"
      >
        {/* Background Grid */}
        <div 
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.3) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.3) 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />

        {/* Top-Left Return Button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.1, x: 5 }}
          whileTap={{ scale: 0.9 }}
          onClick={onBack}
          className="absolute top-8 left-8 z-[1010] flex items-center gap-4 text-white hover:text-white/80 group"
        >
          <div className="w-10 h-10 rounded-full border-2 border-white flex items-center justify-center group-hover:bg-white group-hover:text-[#1a233a] transition-all">
            <span className="text-xl">←</span>
          </div>
          <span className="font-black tracking-widest text-xs uppercase">Back to Members</span>
        </motion.button>

        {/* Centered Message Box */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 100 }}
          className="relative max-w-lg w-full p-8 md:p-12 bg-slate-900/80 border-4 border-white/20 rounded-3xl backdrop-blur-md shadow-2xl text-center space-y-8"
        >
          {/* Big Microphone Emoji / Icon */}
          <motion.div
            animate={{ 
              y: [0, -8, 0],
              rotate: [0, -3, 3, -3, 0]
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="text-8xl md:text-9xl filter drop-shadow-[0_10px_20px_rgba(255,255,255,0.1)]"
          >
            📢
          </motion.div>

          {/* The Sentence */}
          <div className="space-y-3">
            <h1 className="text-2xl md:text-3xl font-black text-white font-pixel tracking-wide leading-relaxed">
              你還期待啥 這只是個麥克風
            </h1>
            <p className="text-[10px] md:text-xs text-white/40 font-pixel tracking-widest uppercase">
              Microphone_Module_v1.0.0 // Idle
            </p>
          </div>
        </motion.div>

        {/* Small subtle decorative footer */}
        <div className="absolute bottom-8 text-white/10 font-black tracking-[0.5em] text-[10px] uppercase">
          ERROR_CODE: JUST_A_MIC
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`fixed inset-0 z-[1000] flex flex-col font-mono overflow-y-auto scroll-smooth custom-scrollbar ${
        isSecondGen ? 'bg-[#141518]' : fighterId === 1 ? 'bg-[#092b36]' : 'bg-[#4C5E6E]'
      }`}
    >
      {/* SECTION 1: MAIN PROFILE */}
      <div className="min-h-screen w-full relative flex flex-col overflow-hidden border-b border-white/10">
        {/* Background Layer: Aquatic Splash & Fish Shadows for Umiri, Ancient Water & Calligraphy for 2nd gen, Grid for others */}
        {fighterId === 1 ? (
          <UmiriAquaticFishAndSplashEffect />
        ) : isSecondGen ? (
          <AncientWaterAndCalligraphyEffect fighterId={fighterId} color={activeFighter.color} />
        ) : (
          <div 
            className="absolute inset-0 opacity-30 pointer-events-none"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(255,255,255,0.3) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255,255,255,0.3) 1px, transparent 1px)
              `,
              backgroundSize: '40px 40px',
            }}
          />
        )}

      {/* Top-Left Return Button */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        whileHover={{ scale: 1.1, x: 5 }}
        whileTap={{ scale: 0.9 }}
        onClick={onBack}
        className="absolute top-8 left-8 z-[1010] flex items-center gap-4 text-white hover:text-white/80 group"
      >
        <div className="w-10 h-10 rounded-full border-2 border-white flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all">
          <span className="text-xl">←</span>
        </div>
        <span className="font-black tracking-widest text-xs uppercase">Back to Members</span>
      </motion.button>

      {/* Main Content - Center Screen Control Block */}
      <div className="flex-1 flex items-center justify-center relative z-10 w-full px-3 sm:px-4 md:px-6 py-16 pt-36 sm:pt-44">
        <div className="flex flex-col xl:flex-row items-stretch gap-8 p-6 bg-slate-900/40 rounded-[2.5rem] backdrop-blur-xl border border-white/15 max-w-[1720px] w-full shadow-[0_20px_70px_rgba(0,0,0,0.5),inset_0_1px_2px_rgba(255,255,255,0.2)]">
          
          {/* Left Column Container */}
          <div className="flex flex-col gap-4 self-stretch hidden xl:flex flex-1 max-w-[360px]">
            {/* Status Screen */}
            <div className="relative h-20 bg-black/60 backdrop-blur-lg border border-white/15 rounded-2xl overflow-hidden flex items-center justify-center shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]">
              <div className="text-xl font-black tracking-[0.5em] animate-pulse text-white pl-[0.5em]">
                {fighterId === 1 ? '活動進行中' : fighterId === 8 ? '廣播進行中' : '空格．等待加入'}
              </div>
              <div className="absolute inset-0 pointer-events-none opacity-20 mix-blend-overlay" 
                   style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent  2px, rgba(0,0,0,0.8) 2px, rgba(0,0,0,0.8) 4px)' }} 
              />
            </div>

            {/* Community Sub Screen */}
            <div className="relative h-[300px] bg-black/60 backdrop-blur-lg border border-white/15 rounded-3xl overflow-hidden flex flex-col p-6 font-mono text-left shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]">
              <div className="text-white/60 text-[11px] font-black italic border-b border-white/10 pb-2 mb-6 tracking-widest uppercase">
                COMMUNITY_HUB
              </div>
              
              <div className="flex-1 space-y-4 overflow-hidden">
                {fighterId === 1 ? (
                  <>
                    <a 
                      href="https://www.youtube.com/@%E5%BE%AE%E7%9D%A1%E5%81%B6%E5%83%8F%E6%B6%BC%E6%B5%B7%E7%92%83" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10 hover:bg-white/15 transition-colors"
                    >
                      <div className="text-2xl">📺</div>
                      <div className="flex-1">
                        <div className="text-[11px] text-white/80 font-black">YOUTUBE</div>
                        <div className="text-[10px] text-white/40 font-bold tracking-tighter">微睡偶像涼海璃</div>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    </a>

                    <a 
                      href="https://www.instagram.com/suzumirii_keep.q/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10 hover:bg-white/15 transition-colors"
                    >
                      <div className="text-2xl">📸</div>
                      <div className="flex-1">
                        <div className="text-[11px] text-white/80 font-black">INSTAGRAM</div>
                        <div className="text-[10px] text-white/40 font-bold tracking-tighter">阿璃店長UMIRI</div>
                      </div>
                    </a>
                  </>
                ) : fighterId === 8 ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
                      <div className="text-2xl">📢</div>
                      <div className="flex-1">
                        <div className="text-[11px] text-white/80 font-black">BROADCAST MODE</div>
                        <div className="text-[10px] text-white/40 font-bold">瘋狂喇叭不停歇廣播</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
                      <div className="text-2xl">🎙️</div>
                      <div className="flex-1">
                        <div className="text-[11px] text-white/80 font-black">HARDWARE</div>
                        <div className="text-[10px] text-white/30 font-bold">一隻像麥克風的瘋狂喇叭</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center space-y-2 opacity-30">
                    <div className="text-6xl font-black text-white font-pixel">?</div>
                    <div className="text-[9px] text-white tracking-[0.3em] font-black">DATA_ENCRYPTED</div>
                  </div>
                )}
              </div>
              <div className="mt-4 flex justify-between items-center opacity-30">
                <div className="text-[9px] text-white font-black">NETWORK_STABLE</div>
                <div className="flex gap-1">
                  {[1,2,3,4].map(i => <div key={i} className="w-1.5 h-3 bg-white" />)}
                </div>
              </div>
              <div className="absolute inset-0 pointer-events-none opacity-20 mix-blend-overlay" 
                   style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.8) 2px, rgba(0,0,0,0.8) 4px)' }} 
              />
            </div>
          </div>

          {/* Main Display Screen with Glassmorphism Effect */}
          <div className="relative flex-[5] aspect-[16/9] bg-black/60 backdrop-blur-2xl border border-white/20 rounded-3xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.6),inset_0_1px_2px_rgba(255,255,255,0.3)] group flex flex-col justify-end">
            {/* Top Glass Highlight / Light Specular Reflection */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/15 via-white/[0.02] to-transparent pointer-events-none z-10" />

            {fighterId === 1 ? (
              <div className="absolute inset-0 w-full h-full">
                <img 
                  src={umiriOfficialPhoto} 
                  alt="Suzuumiri Official Photo"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                {/* Subtle dark gradient overlay to make text highly legible */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.div 
                  animate={{ 
                    y: [0, -10, 0],
                    rotate: [0, 1, 0, -1, 0]
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  className="text-[12rem] md:text-[16rem] drop-shadow-[0_0_50px_rgba(255,255,255,0.25)] font-black"
                  style={{ color: activeFighter.color }}
                >
                  {activeFighter.icon}
                </motion.div>
              </div>
            )}

            {/* Construction Label */}
            {fighterId === 1 ? (
              <div className="absolute top-6 right-6 bg-[#4C5E6E]/80 backdrop-blur-md text-white text-md font-black px-5 py-2 skew-x-[-12deg] border border-white/25 shadow-lg uppercase tracking-wider font-pixel z-20">
                Official Photo
              </div>
            ) : fighterId === 8 ? (
              <div className="absolute top-6 right-6 bg-white/15 backdrop-blur-md text-white text-md font-black px-5 py-2 skew-x-[-12deg] border border-white/25 shadow-lg z-20">
                廣播放送中
              </div>
            ) : null}

            {/* Character Name Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black via-black/50 to-transparent text-left z-20">
              <div className="text-3xl md:text-5xl font-black italic text-white tracking-tighter mb-4 flex items-baseline gap-3">
                <span className="text-sm not-italic font-bold text-white/50">{code}</span>
                {activeFighter.name}
              </div>
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5, 8].map(i => (
                  <div key={i} className="w-12 h-1 bg-white/10 overflow-hidden">
                    <div className="w-full h-full" style={{ backgroundColor: activeFighter.color }} />
                  </div>
                ))}
              </div>
            </div>

            <div className="absolute inset-0 pointer-events-none opacity-30 mix-blend-overlay z-10" 
                 style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.8) 2px, rgba(0,0,0,0.8) 4px)' }} 
            />
          </div>

          {/* Side Vertical Screen (Right Column) */}
          <div className="relative flex-1 max-w-[360px] bg-black/60 backdrop-blur-lg border border-white/15 rounded-3xl overflow-hidden p-6 flex flex-col font-mono text-left hidden lg:flex shadow-[inset_0_1px_1px_rgba(255,255,255,0.2)]">
            <div className="text-white/60 text-xs font-black italic border-b border-white/10 pb-2 mb-6 tracking-widest">
              CHARACTER_PROFILE
            </div>
            
            <div className="flex-1 space-y-6 overflow-hidden">
              <div className="space-y-1">
                <div className="text-xl font-black text-white italic tracking-tighter">
                  {activeFighter.profile?.name || activeFighter.name}
                </div>
                <div className="text-xs text-white/40 font-bold tracking-[0.15em]">
                  {activeFighter.profile?.enName || 'CANDIDATE'}
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/10">
                <div className="space-y-0.5">
                  <div className="text-[10px] text-white/40 font-black tracking-widest">生日:</div>
                  <div className="text-2xl text-white font-black tracking-tighter">
                    {activeFighter.profile?.birthday || '????????'}
                  </div>
                </div>

                <div className="space-y-0.5">
                  <div className="text-[10px] text-white/40 font-black tracking-widest">星座:</div>
                  <div className="text-2xl text-white font-black tracking-tighter">
                    {activeFighter.profile?.zodiac || '???'}
                  </div>
                </div>

                <div className="space-y-0.5">
                  <div className="text-[10px] text-white/40 font-black tracking-widest">興趣:</div>
                  <div className="text-xl text-white/80 font-black italic">
                    {activeFighter.profile?.hobby || '????????'}
                  </div>
                </div>

                <div className="space-y-0.5">
                  <div className="text-[10px] text-white/40 font-black tracking-widest">得意技:</div>
                  <div className="text-xl text-white/80 font-black italic">
                    {activeFighter.profile?.specialty || '????????'}
                  </div>
                </div>

                {(activeFighter.profile as any)?.triggerPoint && (
                  <div className="space-y-1 mt-2 p-2.5 bg-red-500/10 border border-red-500/20 rounded-xl">
                    <div className="text-[10px] text-red-400 font-black tracking-widest flex items-center gap-1">
                      <span>⚠️ 雷點:</span>
                    </div>
                    <div className="text-xs text-red-100 font-bold leading-relaxed font-sans">
                      {(activeFighter.profile as any).triggerPoint}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 space-y-2 border-t border-white/10">
              <div className="text-[9px] text-white/30 uppercase tracking-tighter">Status_Monitor</div>
              <div className="flex gap-1 h-8 items-end">
                {[...Array(10)].map((_, i) => (
                  <motion.div 
                    key={i}
                    initial={{ height: 5 }}
                    animate={{ height: `${10 + Math.random() * 20}px` }}
                    transition={{ duration: 1 + Math.random(), repeat: Infinity }}
                    className="flex-1 bg-white/20"
                  />
                ))}
              </div>
            </div>

            <div className="absolute inset-0 pointer-events-none opacity-20 mix-blend-overlay" 
                 style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.8) 2px, rgba(0,0,0,0.8) 4px)' }} 
            />
          </div>

        </div>
      </div>

      {/* Draggable Sheep Sticker */}
      {fighterId === 1 && (
        <>
          {/* Miku Hatsune Leek custom cursors injected specifically for the sheep sticker */}
          <style dangerouslySetInnerHTML={{ __html: `
            .sheep-sticker-container, .sheep-sticker-container * {
              cursor: url('https://cdn.cursors-4u.net/previews/normal-3717df60-96.webp') 0 0, auto !important;
            }
          `}} />
          {isDraggingSheep && (
            <style dangerouslySetInnerHTML={{ __html: `
              * {
                cursor: url('https://cdn.cursors-4u.net/previews/normal-3717df60-96.webp') 0 0, auto !important;
              }
            `}} />
          )}
          <motion.div
            drag
            dragElastic={0.2}
            initial={{ opacity: 0, scale: 0.5, x: randomPos.x, y: randomPos.y }}
            animate={{ opacity: 1, scale: 1, x: randomPos.x, y: randomPos.y }}
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.9, rotate: -5 }}
            onDragStart={() => setIsDraggingSheep(true)}
            onDragEnd={() => setIsDraggingSheep(false)}
            onClick={() => {
              const nextCount = sheepClickCount + 1;
              if (nextCount >= 7) {
                setSheepClickCount(0);
                if (onSecretUnlock) {
                  onSecretUnlock();
                }
              } else {
                setSheepClickCount(nextCount);
              }
            }}
            className="absolute top-0 left-0 z-[1020] sheep-sticker-container cursor-pointer"
          >
            <div className="relative group">
              <div className="absolute -inset-2 bg-white/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              <img 
                src="https://lh3.googleusercontent.com/d/1Atub1Buz03kfpOBXkTmpHEG6ySWRVoYl" 
                alt="Sheep Sticker"
                className="w-64 h-64 object-contain drop-shadow-[0_10px_20px_rgba(0,0,0,0.2)]"
                referrerPolicy="no-referrer"
              />
              <div className="absolute -top-4 -right-4 bg-slate-900 text-slate-200 border border-slate-500/50 text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg opacity-100 uppercase tracking-tighter">
                {sheepClickCount > 0 ? `🐑 ${sheepClickCount}/7` : 'Drag / Click Me!'}
              </div>
            </div>
          </motion.div>
        </>
      )}

      {/* Bottom Label */}
      <div className="absolute bottom-12 right-12 text-white/40 font-black tracking-[0.5em] text-[10px] uppercase text-right">
        UMIRI_HEAVEN_MODULE // STORM_WARNING
      </div>

      {/* Scroll Down Indicator */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/30 pointer-events-none"
      >
        <span className="text-[10px] font-black tracking-[0.5em] uppercase">Scroll</span>
        <motion.div 
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-1 h-8 bg-gradient-to-b from-white/30 to-transparent rounded-full"
        />
      </motion.div>
    </div>

    {fighterId === 1 ? (
      <>
        {/* SECTION 2: PERSONAL INTRODUCTION */}
        <div className="min-h-screen w-full bg-[#155e75] relative flex flex-col items-center justify-center py-20 px-6 border-b border-white/10 overflow-hidden">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative z-10 max-w-4xl text-center flex flex-col items-center gap-10"
          >
            <div className="text-[11px] text-cyan-200/60 font-pixel tracking-[0.4em] uppercase">
              UMIRI / MEMOIR MODULE
            </div>
            
            <div className="flex flex-col gap-6 text-white max-w-3xl">
              <p className="text-2xl sm:text-3xl md:text-5xl font-extrabold leading-relaxed md:leading-normal tracking-[0.04em] sm:tracking-[0.06em] drop-shadow-[0_0_25px_rgba(255,255,255,0.3)] italic">
                Mira esa marioneta de cristal tan lamentable,<br />
                frágil y entrañable.
              </p>
            </div>
          </motion.div>
          
          {/* Scroll Down Indicator */}
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/40 pointer-events-none"
          >
            <motion.div 
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-1 h-8 bg-gradient-to-b from-white/40 to-transparent rounded-full"
            />
          </motion.div>
        </div>

        {/* SECTION 3: ADDITIONAL INFO */}
        <div className="min-h-screen w-full bg-[#0891b2] relative flex flex-col items-start pt-32 pb-32 px-20 overflow-hidden">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative z-10 flex flex-col items-start text-left w-full max-w-7xl"
          >
            <div className="flex flex-col items-start mb-20">
              <h2 className="text-9xl font-black text-white tracking-[-0.02em] italic drop-shadow-[0_0_40px_rgba(255,255,255,0.4)] leading-none">
                涼海璃 UMIRI
              </h2>
              <div className="mt-8 flex items-center gap-6">
                <span className="text-white/30 font-pixel text-sm tracking-tighter">━━━━━━</span>
                <span className="text-xs text-white/60 font-pixel tracking-[0.5em] uppercase whitespace-nowrap">SUZUUMI RII</span>
              </div>
            </div>

            {/* Profile Content Box */}
            <div className="w-full min-h-[600px] border-2 border-dashed border-white/10 rounded-3xl flex flex-col items-start justify-start p-16 bg-white/5 backdrop-blur-sm relative overflow-hidden group border-white/20 hover:border-white/35 transition-all">
              {/* Decorative Background Text */}
              <div className="absolute top-10 right-10 text-[120px] font-black text-white/5 italic select-none pointer-events-none tracking-tighter">
                UMIRI
              </div>

              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                className="relative z-10 flex flex-col gap-12 w-full"
              >
                <div className="flex flex-col gap-4">
                  <h3 className="text-6xl font-black text-white italic tracking-wider">個人檔案 SECRET</h3>
                  <div className="flex items-center gap-4">
                    <span className="text-white/30 font-pixel text-xs">━━━━</span>
                    <span className="text-white/60 font-pixel text-sm tracking-[0.2em]">PROFILE DATA // 001</span>
                  </div>
                </div>

                <div className="flex flex-col gap-8">
                  <div className="flex flex-col md:flex-row md:items-baseline gap-4 md:gap-12">
                    <span className="text-white/40 font-pixel text-xs uppercase tracking-[0.2em] w-28 shrink-0">Birthday</span>
                    <span className="text-4xl font-bold text-white tracking-widest">20050822</span>
                  </div>
                  <div className="flex flex-col md:flex-row md:items-baseline gap-4 md:gap-12">
                    <span className="text-white/40 font-pixel text-xs uppercase tracking-[0.2em] w-28 shrink-0">Hobby</span>
                    <span className="text-4xl font-bold text-white tracking-widest">非常愛吃卡茲爆米花</span>
                  </div>
                  
                  <div className="h-[1px] w-full bg-white/10 my-2" />
                  
                  <div className="flex flex-col md:flex-row gap-4 md:gap-12">
                    <span className="text-white/40 font-pixel text-xs uppercase tracking-[0.2em] w-28 shrink-0 pt-2">Features</span>
                    <div className="flex flex-col gap-6">
                      <div className="flex items-start gap-4">
                        <span className="text-xl text-[#FFFF00] mt-1">✦</span>
                        <span className="text-2xl md:text-3xl font-extrabold text-white tracking-wide leading-relaxed">
                          高音低音隨便切換 (心情越賭爛的時候會越低)
                        </span>
                      </div>
                      <div className="flex items-start gap-4">
                        <span className="text-xl text-[#FFFF00] mt-1">✦</span>
                        <span className="text-2xl md:text-3xl font-extrabold text-white tracking-wide leading-relaxed">
                          絕對冷淡表情 特技是面不改色的唱《Bad Apple!!!》
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="h-[1px] w-full bg-white/10 my-2" />
                  
                  <div className="flex flex-col md:flex-row gap-4 md:gap-12">
                    <span className="text-white/40 font-pixel text-xs uppercase tracking-[0.2em] w-28 shrink-0 pt-2">Notes</span>
                    <div className="flex flex-col gap-6">
                      <div className="flex items-start gap-4">
                        <span className="text-xl text-[#FF4500] mt-1 animate-pulse">⚠️</span>
                        <div className="flex flex-col gap-2">
                          <p className="text-2xl md:text-3xl font-extrabold text-white tracking-wide leading-relaxed">
                            如果你發現今天的阿璃聲音低到嚇死 而且頭上戴著紫色惡魔角的髮箍
                          </p>
                          <p className="text-2xl md:text-3xl font-black text-[#FF4500] drop-shadow-[0_0_15px_rgba(255,69,0,0.5)] tracking-wide leading-relaxed animate-pulse">
                            「快跑 阿璃氣到要殺人了」
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* SECTION 3 BOTTOM: 新按鈕 - 某璃的獨白 */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-start w-full gap-6">
              <motion.button
                whileHover={{ scale: 1.03, boxShadow: '0 0 35px rgba(185, 28, 28, 0.6)' }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowEscalatorMonologue(true)}
                className="w-full sm:w-auto px-8 py-4 bg-[#1a0206] border-2 border-red-600/80 hover:border-red-500 rounded-2xl text-red-400 hover:text-white font-mono font-bold text-base md:text-lg tracking-[0.2em] shadow-[0_0_25px_rgba(185,28,28,0.35)] transition-all duration-300 flex items-center justify-center gap-3 cursor-pointer relative group overflow-hidden"
              >
                <div className="absolute inset-0 bg-red-600/10 group-hover:bg-red-600/20 transition-all duration-300" />
                <span className="text-red-500 text-xl group-hover:scale-110 transition-transform">🪜</span>
                <span className="relative z-10 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)] font-mono">
                  某璃的獨白
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-950/80 border border-red-600/50 text-red-300 font-pixel uppercase tracking-widest ml-2">
                  MONOLOGUE
                </span>
              </motion.button>
            </div>
          </motion.div>
        </div>
      </>
    ) : (
      <>
        {/* SECTION 2: UNDER CONSTRUCTION PAGE */}
        <div 
          className="min-h-screen w-full relative flex flex-col items-center justify-center py-20 px-6 overflow-hidden border-t border-white/10"
          style={{ backgroundColor: isSecondGen ? '#121316' : (activeFighter.color ? `${activeFighter.color}15` : '#1e1b4b') }}
        >
          {isSecondGen ? (
            <AncientWaterAndCalligraphyEffect fighterId={fighterId} color={activeFighter.color} />
          ) : (
            <div className="absolute inset-0 opacity-15 pointer-events-none"
                 style={{
                   backgroundImage: `
                     linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
                     linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)
                   `,
                   backgroundSize: '40px 40px',
                 }}
            />
          )}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative z-10 text-center flex flex-col items-center gap-6"
          >
            <div className="text-[11px] text-white/40 font-pixel tracking-[0.4em] uppercase mb-2">
              {code} / CONSTRUCTION MODULE
            </div>
            
            <h2 className="text-4xl md:text-7xl font-semibold text-white/90 tracking-[0.2em] italic drop-shadow-[0_0_30px_rgba(255,255,255,0.25)]">
              個人頁施工中
            </h2>
            
            <div className="h-[2px] w-24 bg-white/20 mt-4" />
            
            <p className="text-white/40 text-sm font-pixel select-none uppercase tracking-widest mt-2 animate-pulse font-bold">
              Under Construction
            </p>
          </motion.div>
        </div>
      </>
    )}

    {/* Full Screen Escalator Monologue Modal */}
    <AnimatePresence>
      {showEscalatorMonologue && (
        <EscalatorMonologueSubpage onClose={() => setShowEscalatorMonologue(false)} />
      )}
    </AnimatePresence>
  </motion.div>
  );
};

// --- Broadcast Studio Component ---
interface BroadcastEntry {
  id: string; // e.g., R01
  text: string;
  timestamp: number;
}

const PREFIX_MAP: Record<number, string> = {
  1: 'B', // Blue
  2: 'R', // Red
  3: 'G', // Green
  4: 'M', // Purple
  5: 'Y', // Yellow
  6: 'P', // Pink
  7: 'S', // Sky Blue
  11: 'YY', // Yojiuta Yellow
  12: 'YR', // Yojiuta Red
  13: 'YP', // Yojiuta Purple
  14: 'YG', // Yojiuta Green
};

const BroadcastStudioPage: React.FC<{ 
  onBack: () => void; 
  isAdmin: boolean; 
  setIsAdmin: (val: boolean) => void; 
  adminMemberId: number | null;
  setAdminMemberId: (id: number | null) => void;
  initialLoginModal?: boolean 
}> = ({ onBack, isAdmin, setIsAdmin, adminMemberId, setAdminMemberId, initialLoginModal = false }) => {
  const [draftText, setDraftText] = useState('');
  const [combinedLog, setCombinedLog] = useState<(BroadcastEntry & { memberId: number })[]>([]);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(initialLoginModal);
  const [credentials, setCredentials] = useState({ user: '', pass: '' });
  
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadAllLogs = () => {
    const allLogs: (BroadcastEntry & { memberId: number })[] = [];
    FIGHTERS.forEach(f => {
      const saved = localStorage.getItem(`qpixel_log_${f.id}`);
      if (saved) {
        try {
          const entries: BroadcastEntry[] = JSON.parse(saved);
          entries.forEach(e => allLogs.push({ ...e, memberId: f.id }));
        } catch (err) {
          console.error(`Failed to load log for ${f.name}`);
        }
      }
    });
    // Sort by timestamp descending
    allLogs.sort((a, b) => b.timestamp - a.timestamp);
    setCombinedLog(allLogs);
  };

  // Initialize Umiri's first message if empty
  useEffect(() => {
    const umiriLogKey = `qpixel_log_1`;
    const existingLog = localStorage.getItem(umiriLogKey);
    if (!existingLog) {
      const initialEntry: BroadcastEntry = {
        id: 'B01',
        text: '涼海:全新區塊做好了喔~這裡就是我們的廣播區了',
        timestamp: Date.now(),
      };
      localStorage.setItem(umiriLogKey, JSON.stringify([initialEntry]));
    }
    loadAllLogs();
  }, []);

  // Sync state with selected member
  useEffect(() => {
    if (isAdmin && adminMemberId) {
      const savedDraft = localStorage.getItem(`qpixel_draft_${adminMemberId}`);
      setDraftText(savedDraft || '');
    }
  }, [isAdmin, adminMemberId]);

  // Save draft
  useEffect(() => {
    if (isAdmin && adminMemberId) {
      localStorage.setItem(`qpixel_draft_${adminMemberId}`, draftText);
    }
  }, [draftText, isAdmin, adminMemberId]);

  // Scroll to top on new messages
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [combinedLog]);

  const handleSaveBroadcast = () => {
    if (!draftText.trim() || !adminMemberId) return;

    const prefix = PREFIX_MAP[adminMemberId] || 'X';
    const memberLogKey = `qpixel_log_${adminMemberId}`;
    const currentLogSaved = localStorage.getItem(memberLogKey);
    const currentLog: BroadcastEntry[] = currentLogSaved ? JSON.parse(currentLogSaved) : [];
    
    const nextNum = (currentLog.length + 1).toString().padStart(2, '0');
    const newEntry: BroadcastEntry = {
      id: `${prefix}${nextNum}`,
      text: draftText,
      timestamp: Date.now(),
    };

    const newMemberLog = [newEntry, ...currentLog];
    localStorage.setItem(memberLogKey, JSON.stringify(newMemberLog));
    setDraftText('');
    loadAllLogs();
  };

  const handleDeleteEntry = (entry: BroadcastEntry & { memberId: number }) => {
    if (!isAdmin || adminMemberId !== entry.memberId) return;
    if (confirm('確定要刪除這條廣播紀錄嗎？')) {
      const memberLogKey = `qpixel_log_${entry.memberId}`;
      const saved = localStorage.getItem(memberLogKey);
      if (saved) {
        const log: BroadcastEntry[] = JSON.parse(saved);
        const newLog = log.filter(e => e.id !== entry.id);
        localStorage.setItem(memberLogKey, JSON.stringify(newLog));
        loadAllLogs();
      }
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    let foundMemberId: number | null = null;
    Object.entries(MEMBER_CREDENTIALS).forEach(([id, creds]) => {
      if (creds.user === credentials.user && creds.pass === credentials.pass) {
        foundMemberId = parseInt(id);
      }
    });

    if (foundMemberId) {
      setIsAdmin(true);
      setAdminMemberId(foundMemberId);
      setIsLoginModalOpen(false);
      setCredentials({ user: '', pass: '' });
      localStorage.setItem('qpixel_is_admin', 'true');
      localStorage.setItem('qpixel_admin_id', foundMemberId.toString());
    } else {
      alert('帳號或密碼錯誤');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[2000] bg-[#1a0b2e] flex flex-col font-mono"
    >
      {/* Header */}
      <div className="h-20 bg-[#2d1b4d] border-b-4 border-white/10 flex items-center justify-between px-8">
        <div className="flex items-center gap-8">
          <button onClick={onBack} className="flex items-center gap-3 text-white/60 hover:text-white transition-colors">
            <div className="w-8 h-8 border-2 border-current flex items-center justify-center font-bold">←</div>
            <span className="text-xs font-pixel uppercase tracking-widest">Exit</span>
          </button>
          <div className="flex items-center gap-3">
            <Radio size={20} className="text-white/40" />
            <div className="text-sm font-black italic tracking-tighter text-white uppercase">Team Broadcasting Station</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isAdmin ? (
            <div className="flex items-center gap-4">
              <div className="px-4 py-1.5 rounded-full border border-white/10 flex items-center gap-3 bg-black/40">
                <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: FIGHTERS.find(f => f.id === adminMemberId)?.color }} />
                <span className="text-[10px] font-pixel text-white/80 uppercase">
                  ACTIVE: {FIGHTERS.find(f => f.id === adminMemberId)?.name}
                </span>
              </div>
              <button 
                onClick={() => {
                  setIsAdmin(false);
                  setAdminMemberId(null);
                  localStorage.removeItem('qpixel_is_admin');
                  localStorage.removeItem('qpixel_admin_id');
                }}
                className="px-4 py-1 bg-red-500/10 border border-red-500/50 text-red-500 text-[8px] font-pixel hover:bg-red-500 hover:text-white transition-all uppercase"
              >
                Logout
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setIsLoginModalOpen(true)}
              className="text-[10px] font-pixel text-white/10 hover:text-white/40 transition-all uppercase tracking-widest"
            >
              Secret Entrance
            </button>
          )}
        </div>
      </div>

      {/* Main View: Radio Station Chat Style */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 overflow-hidden relative">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 0)', backgroundSize: '16px 16px' }} />
        
        <div className="w-full max-w-[95vw] md:max-w-[90vw] h-[90vh] flex flex-col bg-black/20 rounded-[2.5rem] border-4 border-white/5 overflow-hidden shadow-2xl backdrop-blur-sm">
          {/* Status Bar */}
          <div className="h-14 bg-white/5 border-b-2 border-white/5 flex items-center justify-between px-6">
            <div className="flex items-center gap-3">
              <Radio size={16} className="text-white/30 animate-pulse" />
              <div className="flex flex-col">
                <div className="text-[9px] font-pixel text-white/60 uppercase tracking-[0.2em]">TEAM BROADCAST CHANNEL</div>
                <div className="text-[7px] font-pixel text-white/20 uppercase tracking-[0.4em]">Signal Stable | All Members Frequency</div>
              </div>
            </div>
            <div className="flex gap-1.5 h-4 items-end">
              {[1, 2, 3, 4, 5].map(i => (
                <div 
                  key={i} 
                  className="w-1 bg-white/20 animate-pulse" 
                  style={{ height: `${20 + Math.random() * 80}%`, animationDelay: `${i * 0.1}s` }} 
                />
              ))}
            </div>
          </div>

          {/* Chat List */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col custom-scrollbar">

            {combinedLog.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-5 text-center py-20 grayscale scale-75">
                <Radio size={64} className="mb-6" />
                <div className="text-sm font-pixel uppercase tracking-widest">Channel Empty</div>
              </div>
            ) : (
              combinedLog.map((entry) => {
                const fighter = FIGHTERS.find(f => f.id === entry.memberId);
                const isSelfEntry = isAdmin && adminMemberId === entry.memberId;
                
                return (
                  <motion.div
                    key={entry.memberId + entry.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="relative flex flex-col items-start"
                  >
                    <div className="flex items-center gap-3 mb-2 ml-1">
                      <div className="flex items-center">
                        <span 
                          className="px-1.5 py-0.5 text-black font-black italic text-[8px] rounded-l-sm"
                          style={{ backgroundColor: fighter?.color || '#fff' }}
                        >
                          {fighter?.name?.split(' ')[0]}
                        </span>
                        <span className="px-1.5 py-0.5 bg-white/20 text-white font-black italic text-[8px] rounded-r-sm border-r border-y border-white/10">
                          {entry.id}
                        </span>
                      </div>
                      <span className="text-[8px] font-pixel text-white/20 uppercase tracking-widest">
                        {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div 
                      className="group relative border-l-4 p-5 rounded-r-2xl rounded-bl-sm w-full transition-all"
                      style={{ 
                        backgroundColor: `${fighter?.color || '#ffffff'}10`,
                        borderColor: fighter?.color || '#fff'
                      }}
                    >
                      <p className="text-white/90 text-lg md:text-xl leading-relaxed italic">
                        「{entry.text}」
                      </p>
                      {isSelfEntry && (
                        <button 
                          onClick={() => handleDeleteEntry(entry)}
                          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-red-500/40 hover:text-red-500 transition-all p-1"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Input Bar (IDOL ONLY) */}
          {isAdmin && adminMemberId && (
            <div className="p-6 bg-white/5 border-t-2 border-white/10">
              <div className="flex gap-4 p-4 bg-white/5 border-2 border-white/10 rounded-2xl focus-within:border-white/30 transition-all relative">
                <textarea
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  placeholder={`在此輸入廣播草稿...`}
                  className="flex-1 bg-transparent border-none outline-none text-white text-sm h-16 resize-none italic placeholder:text-white/10 custom-scrollbar"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey) {
                      handleSaveBroadcast();
                    }
                  }}
                />
                <button 
                  onClick={handleSaveBroadcast}
                  disabled={!draftText.trim()}
                  className="w-12 h-12 bg-white text-black rounded-xl border-2 border-transparent hover:scale-105 active:scale-95 transition-all shadow-xl flex items-center justify-center disabled:opacity-10"
                >
                  <Send size={20} />
                </button>
              </div>
              <div className="mt-3 flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full animate-pulse shadow-[0_0_5px_rgba(34,197,94,0.5)]" style={{ backgroundColor: FIGHTERS.find(f => f.id === adminMemberId)?.color }} />
                  <span className="text-[8px] font-pixel text-white/30 uppercase tracking-[0.2em]">Live: Recording as {FIGHTERS.find(f => f.id === adminMemberId)?.name}</span>
                </div>
                <span className="text-[7px] font-pixel text-white/5 italic">Ctrl+Enter to Broadcast</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Secret Login Modal */}
      <AnimatePresence>
        {isLoginModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[3000] bg-black/95 backdrop-blur-md flex items-center justify-center p-8"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-sm bg-[#1a0b2e] border-4 border-white/10 p-10 rounded-[3rem] relative shadow-[0_0_120px_rgba(168,85,247,0.3)]"
            >
              <div className="flex flex-col items-center mb-12">
                <div className="w-20 h-20 bg-white/5 rounded-[1.5rem] flex items-center justify-center mb-6 border border-white/10">
                  <Radio className="text-white/60 animate-pulse" size={40} />
                </div>
                <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase whitespace-nowrap">Internal Hub Access</h2>
                <div className="text-[8px] font-pixel text-white/20 mt-2 tracking-[0.5em]">Identity verification required</div>
              </div>
              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] text-white/40 font-pixel uppercase tracking-widest ml-1">Member Account</label>
                  <input 
                    type="text"
                    value={credentials.user}
                    onChange={(e) => setCredentials(prev => ({...prev, user: e.target.value}))}
                    className="w-full bg-white/5 border-2 border-white/10 p-4 text-white text-xs focus:border-white/40 outline-none transition-all rounded-2xl"
                    placeholder="輸入帳號"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] text-white/40 font-pixel uppercase tracking-widest ml-1">Security Code</label>
                  <input 
                    type="text"
                    value={credentials.pass}
                    onChange={(e) => setCredentials(prev => ({...prev, pass: e.target.value}))}
                    className="w-full bg-white/5 border-2 border-white/10 p-4 text-white text-xs focus:border-white/40 outline-none transition-all rounded-2xl"
                    placeholder="輸入密碼"
                  />
                </div>
                <div className="flex flex-col gap-4 mt-8">
                  <button className="w-full py-5 bg-white text-black font-black tracking-[0.5em] uppercase hover:scale-[1.02] active:scale-[0.98] transition-all rounded-2xl shadow-2xl">
                    Authorize
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsLoginModalOpen(false)}
                    className="w-full py-2 text-[9px] text-white/20 hover:text-white transition-all font-pixel uppercase tracking-widest"
                  >
                    Return to Station
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
export default function App() {
  const [isMobile, setIsMobile] = useState(false);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [dimensions, setDimensions] = useState({ cols: 0, rows: 0 });
  const [gameState, setGameState] = useState<'idle' | 'forming' | 'formed' | 'dissolving' | 'next_page' | 'special' | 'umiri_special' | 'special_thanks' | 'idol_studio' | 'banned_list'>('idle');
  const [selectedFighterId, setSelectedFighterId] = useState<number>(1);
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('qpixel_is_admin') === 'true');
  const [adminMemberId, setAdminMemberId] = useState<number | null>(() => {
    const id = localStorage.getItem('qpixel_admin_id');
    return id ? parseInt(id) : null;
  });
  const [isAdminLoginTriggered, setIsAdminLoginTriggered] = useState(false);
  const whiteBlocksGoneAt = useRef<number | null>(null);
  
  // Rope and UI Pull state
  const bannerY = useMotionValue(-400);
  const springBannerY = useSpring(bannerY, { stiffness: 400, damping: 40 });
  const [ropeVisible, setRopeVisible] = useState(false);
  const [isUILocked, setIsUILocked] = useState(false);
  const [isRopeBroken, setIsRopeBroken] = useState(false);
  const [activeSubPage, setActiveSubPage] = useState<string | null>(null);
  const [showDarkRedSubPage, setShowDarkRedSubPage] = useState(false);
  const [showAllNewsSubpage, setShowAllNewsSubpage] = useState(false);
  const [isWitchHour, setIsWitchHour] = useState<boolean>(() => new Date().getHours() === 0);

  useEffect(() => {
    const checkWitchHour = () => {
      setIsWitchHour(new Date().getHours() === 0);
    };
    checkWitchHour();
    const interval = setInterval(checkWitchHour, 5000);
    return () => clearInterval(interval);
  }, []);
  const [activeIntroCard, setActiveIntroCard] = useState<'prequel' | 'origin' | 'future'>('prequel');
  const [fullscreenToast, setFullscreenToast] = useState<string | null>(null);
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Internal Monitor Sizing Auto-Scale Detection Module
  const [windowDimensions, setWindowDimensions] = useState({ width: 1200, height: 800 });
  const [displayScale, setDisplayScale] = useState(1);
  const [isScaleEnabled, setIsScaleEnabled] = useState(true);

  useEffect(() => {
    const handleDimensionChange = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setWindowDimensions({ width: w, height: h });
      
      if (!isScaleEnabled) {
        setDisplayScale(1);
        return;
      }

      // Calculate perfect scale factor to minimize empty/blank space on larger screens (such as 1080p, 1440p, or 4K monitors)
      if (w >= 1024) {
        // We use 1366x850 as the baseline for content container layout.
        const widthRatio = w / 1366;
        const heightRatio = h / 850;
        // Take a balanced ratio to scale up cleanly without overflowing height
        const balancedRatio = Math.min(widthRatio, heightRatio);
        // Clamp scale factor between 1.0 (standard size) and 1.28 (maximum upscale for very large screens)
        const targetScale = balancedRatio > 1.02 ? Math.min(1.28, balancedRatio) : 1;
        setDisplayScale(Number(targetScale.toFixed(2)));
      } else {
        setDisplayScale(1);
      }
    };

    handleDimensionChange();
    window.addEventListener('resize', handleDimensionChange);
    return () => window.removeEventListener('resize', handleDimensionChange);
  }, [isScaleEnabled]);

  const [isTutorialMinimized, setIsTutorialMinimized] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const prevGameState = useRef(gameState);

  // Remove the auto-lock on position change, we'll handle it via drag events
  useEffect(() => {
    const wasSpecial = prevGameState.current === 'umiri_special' || prevGameState.current === 'special_thanks' || prevGameState.current === 'banned_list';
    
    if (gameState === 'next_page') {
      const timer = setTimeout(() => {
        setRopeVisible(true);
        setIsRopeBroken(false);
        
        if (wasSpecial) {
          // Keep it locked if returning from special
          setIsUILocked(true);
          bannerY.set(0);
        } else {
          setIsUILocked(false);
          // Keep banner hidden, only rope knot will show at top
          bannerY.set(-380);
        }
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      // Only reset if not going to a special page
      if (gameState !== 'umiri_special' && gameState !== 'special_thanks' && gameState !== 'banned_list') {
        setRopeVisible(false);
        setIsUILocked(false);
        setIsRopeBroken(false);
        bannerY.set(-400);
      }
    }
    prevGameState.current = gameState;
  }, [gameState, bannerY]);

  // Initialize dimensions
  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({
        cols: Math.ceil(window.innerWidth / GRID_SIZE),
        rows: Math.ceil(window.innerHeight / GRID_SIZE) + 1
      });
    };
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Game Loop: Movement
  useEffect(() => {
    if (dimensions.cols === 0) return;

    const moveInterval = setInterval(() => {
      setBlocks((prev) => {
        const nextBlocks = prev
          .map(block => {
            // If it has a target row and has reached it, stay there
            // UNLESS we are in 'dissolving' phase and this block has been picked to fall (targetRow removed)
            if (block.targetRow !== undefined && block.row >= block.targetRow) {
              return block;
            }
            return { ...block, row: block.row + 1 };
          })
          .filter(block => block.row < dimensions.rows);
        
        // Transition to 'next_page' when all white blocks are gone in dissolving phase
        if (gameState === 'dissolving') {
          const hasWhiteBlocks = nextBlocks.some(b => b.color === '#FFFFFF');
          if (!hasWhiteBlocks) {
            setGameState('next_page');
          }
        }

        return nextBlocks;
      });
    }, TICK_RATE);

    return () => clearInterval(moveInterval);
  }, [dimensions, gameState]);

  // Game Loop: Spawning Random Blocks
  useEffect(() => {
    if (dimensions.cols === 0) return;

    const spawnInterval = setInterval(() => {
      // Spawn on transitions OR on the main homepage (activeSubPage === null)
      const shouldSpawn = gameState !== 'next_page' || activeSubPage === null;
      if (!shouldSpawn) return;

      setBlocks((prev) => {
        // Find columns that don't have a block at row 0 or 1 to prevent overlap
        const occupiedTopCols = new Set(
          prev.filter(b => b.row <= 1).map(b => b.column)
        );
        
        const availableCols = Array.from({ length: dimensions.cols })
          .map((_, i) => i)
          .filter(col => !occupiedTopCols.has(col));

        // Increased spawn probability (0.8 chance per tick)
        if (availableCols.length === 0 || Math.random() > 0.8) return prev;

        // Spawn more blocks at once for higher density with smaller grid
        const spawnCount = Math.floor(Math.random() * 6) + 2;
        let newBlocks = [...prev];
        let currentAvailable = [...availableCols];

        for (let i = 0; i < spawnCount && currentAvailable.length > 0; i++) {
          const randomIndex = Math.floor(Math.random() * currentAvailable.length);
          const randomCol = currentAvailable[randomIndex];
          currentAvailable.splice(randomIndex, 1);

          newBlocks.push({
            id: Math.random().toString(36).substr(2, 9),
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            column: randomCol,
            row: 0
          });
        }

        return newBlocks;
      });
    }, TICK_RATE); // Spawn every tick for maximum density

    return () => clearInterval(spawnInterval);
  }, [dimensions, gameState, activeSubPage]);

  // Scroll to top when entering a sub-page
  useEffect(() => {
    if (activeSubPage && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [activeSubPage]);

  // Monitor text formation completion
  useEffect(() => {
    if (gameState === 'forming') {
      const allReached = blocks.every(b => b.targetRow === undefined || b.row >= b.targetRow);
      // We also need to check if there are actually message blocks present
      const hasMessageBlocks = blocks.some(b => b.id.startsWith('msg-'));
      
      if (hasMessageBlocks && allReached) {
        setGameState('formed');
      }
    }
  }, [blocks, gameState]);

  // Handle 'formed' to 'dissolving' transition after 222ms
  useEffect(() => {
    if (gameState === 'formed') {
      const timer = setTimeout(() => {
        setGameState('dissolving');
      }, 222);
      return () => clearTimeout(timer);
    }
  }, [gameState]);

  // Staggered dissolve logic
  useEffect(() => {
    if (gameState !== 'dissolving' || blocks.length === 0) return;

    const dissolveInterval = setInterval(() => {
      setBlocks(prev => {
        // Find blocks that are still at their targetRow
        const staticBlocks = prev.filter(b => b.targetRow !== undefined && b.row >= b.targetRow);
        
        if (staticBlocks.length === 0) return prev;

        // Pick 1-5 random blocks to start falling
        const count = Math.floor(Math.random() * 5) + 1;
        const toFallIds = new Set<string>();
        const tempStatic = [...staticBlocks];
        
        for (let i = 0; i < count && tempStatic.length > 0; i++) {
          const idx = Math.floor(Math.random() * tempStatic.length);
          toFallIds.add(tempStatic[idx].id);
          tempStatic.splice(idx, 1);
        }

        return prev.map(b => {
          if (toFallIds.has(b.id)) {
            return { ...b, targetRow: undefined };
          }
          return b;
        });
      });
    }, 100); // Stagger every 100ms

    return () => clearInterval(dissolveInterval);
  }, [gameState, blocks.length]);

  const getDesktopTransitionText = () => {
    const rand = Math.random();
    if (rand < 0.25) {
      return { line1: "KEEP Q", line2: "WE ARE Q-PIXEL" };
    } else if (rand < 0.5) {
      return { line1: "SANKETSU", line2: "4EVER & 2GETHER" };
    } else if (rand < 0.75) {
      return { line1: "IDOL", line2: "NI NARETAI" };
    } else {
      return { line1: "HELLO WORLD", line2: "WE ARE Q-PIXEL" };
    }
  };

  // Handle Game Start
  const handleStart = () => {
    // Show custom warning message
    setFullscreenToast("各位迷你像素 為了您的使用體驗 請不要退出全螢幕模式喔");
    setTimeout(() => {
      setFullscreenToast(null);
    }, 6000);

    const { line1, line2 } = getDesktopTransitionText();

    // Request full screen
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().then(() => {
        // Wait a bit for dimensions to update from resize
        setTimeout(() => {
          setGameState('forming');
          whiteBlocksGoneAt.current = null;
          
          const generateMessageBlocks = (text: string, startRow: number) => {
            const charWidth = 4; // 3 pixels + 1 space
            const totalWidth = text.length * charWidth - 1;
            const latestCols = Math.ceil(window.innerWidth / GRID_SIZE);
            const latestRows = Math.ceil(window.innerHeight / GRID_SIZE);
            const startCol = Math.floor((latestCols - totalWidth) / 2);
            
            const newBlocks: Block[] = [];
            text.split('').forEach((char, charIdx) => {
              const charMap = CHARS[char] || CHARS[' '];
              charMap.forEach((rowArr, rIdx) => {
                rowArr.forEach((pixel, cIdx) => {
                  if (pixel === 1) {
                    newBlocks.push({
                      id: `msg-${text}-${charIdx}-${rIdx}-${cIdx}-${Math.random()}`,
                      color: '#FFFFFF',
                      column: startCol + charIdx * charWidth + cIdx,
                      row: -Math.floor(Math.random() * 20) - 10, // Drop from even higher
                      targetRow: startRow + rIdx
                    });
                  }
                });
              });
            });
            return newBlocks;
          };

          const latestRows = Math.ceil(window.innerHeight / GRID_SIZE);
          const msg1 = generateMessageBlocks(line1, Math.floor(latestRows / 2) - 4);
          const msg2 = generateMessageBlocks(line2, Math.floor(latestRows / 2) + 2);
          
          // Append white blocks to existing colorful blocks
          setBlocks(prev => [...prev, ...msg1, ...msg2]);
        }, 300);
      }).catch(err => {
        console.warn(`Error attempting to enable full-screen mode: ${err.message}`);
        // Fallback if fullscreen fails
        setGameState('forming');
        
        const generateMessageBlocks = (text: string, startRow: number) => {
          const charWidth = 4;
          const totalWidth = text.length * charWidth - 1;
          const startCol = Math.floor((dimensions.cols - totalWidth) / 2);
          const newBlocks: Block[] = [];
          text.split('').forEach((char, charIdx) => {
            const charMap = CHARS[char] || CHARS[' '];
            charMap.forEach((rowArr, rIdx) => {
              rowArr.forEach((pixel, cIdx) => {
                if (pixel === 1) {
                  newBlocks.push({
                    id: `msg-${text}-${charIdx}-${rIdx}-${cIdx}-${Math.random()}`,
                    color: '#FFFFFF',
                    column: startCol + charIdx * charWidth + cIdx,
                    row: -Math.floor(Math.random() * 20) - 10,
                    targetRow: startRow + rIdx
                  });
                }
              });
            });
          });
          return newBlocks;
        };
        const msg1 = generateMessageBlocks(line1, Math.floor(dimensions.rows / 2) - 4);
        const msg2 = generateMessageBlocks(line2, Math.floor(dimensions.rows / 2) + 2);
        setBlocks(prev => [...prev, ...msg1, ...msg2]);
      });
    } else {
      // No fullscreen support
      setGameState('forming');
      
      const generateMessageBlocks = (text: string, startRow: number) => {
        const charWidth = 4;
        const totalWidth = text.length * charWidth - 1;
        const startCol = Math.floor((dimensions.cols - totalWidth) / 2);
        const newBlocks: Block[] = [];
        text.split('').forEach((char, charIdx) => {
          const charMap = CHARS[char] || CHARS[' '];
          charMap.forEach((rowArr, rIdx) => {
            rowArr.forEach((pixel, cIdx) => {
              if (pixel === 1) {
                newBlocks.push({
                  id: `msg-${text}-${charIdx}-${rIdx}-${cIdx}-${Math.random()}`,
                  color: '#FFFFFF',
                  column: startCol + charIdx * charWidth + cIdx,
                  row: -Math.floor(Math.random() * 20) - 10,
                  targetRow: startRow + rIdx
                });
              }
            });
          });
        });
        return newBlocks;
      };
      const msg1 = generateMessageBlocks(line1, Math.floor(dimensions.rows / 2) - 4);
      const msg2 = generateMessageBlocks(line2, Math.floor(dimensions.rows / 2) + 2);
      setBlocks(prev => [...prev, ...msg1, ...msg2]);
    }
  };

  useEffect(() => {
    const checkDevice = () => {
      const ua = navigator.userAgent;
      const isTouch = navigator.maxTouchPoints > 0;
      const isSmallWidth = window.innerWidth < 1024;
      
      // Heuristic for mobile phones (including "Desktop Site" mode)
      const isPhoneUA = /Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
      const isIPad = /iPad/i.test(ua) || (isTouch && /Macintosh/i.test(ua) && window.innerWidth >= 768);
      
      if ((isPhoneUA || (isTouch && !isIPad)) && isSmallWidth) {
        setIsMobile(true);
      } else {
        setIsMobile(false);
      }
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  if (isMobile) {
    return (
      <MobileWebsite 
        gameState={gameState}
        setGameState={setGameState}
        activeSubPage={activeSubPage}
        setActiveSubPage={setActiveSubPage}
      />
    );
  }

  // Handle Skip Transition
  const handleSkip = () => {
    if (['forming', 'formed', 'dissolving'].includes(gameState)) {
      setGameState('next_page');
      setBlocks(prev => prev.filter(block => block.color !== '#FFFFFF'));
    }
  };

  return (
    <div className="relative min-h-screen w-full bg-[#001B3D] overflow-hidden flex items-center justify-center">
      <AnimatePresence mode="wait">
        {gameState === 'umiri_special' ? (
          <UmiriSpecialPage 
            key={`umiri_special-${selectedFighterId}`} 
            fighterId={selectedFighterId} 
            onBack={() => setGameState('next_page')} 
            onSecretUnlock={() => {
              setGameState('next_page');
              setActiveSubPage('disabled');
            }}
          />
        ) : gameState === 'banned_list' ? (
          <React.Suspense fallback={null}>
            <BannedListPage key="banned_list" onBack={() => setGameState('next_page')} />
          </React.Suspense>
        ) : gameState === 'special_thanks' ? (
          <SpecialThanksPage key="special_thanks" onBack={() => setGameState('next_page')} />
        ) : gameState === 'idol_studio' ? (
          <BroadcastStudioPage 
            key="idol_studio" 
            onBack={() => {
              setGameState('next_page');
              setIsAdminLoginTriggered(false);
            }} 
            isAdmin={isAdmin}
            setIsAdmin={setIsAdmin}
            adminMemberId={adminMemberId}
            setAdminMemberId={setAdminMemberId}
            initialLoginModal={isAdminLoginTriggered}
          />
        ) : gameState === 'next_page' ? (
          <motion.div 
            key="next_page"
            ref={scrollContainerRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`absolute inset-0 bg-[#001B3D] overflow-x-hidden overflow-y-auto scroll-smooth custom-scrollbar`}
          >
            {/* SECTION 1: CUTE DEEP PURPLE HUB */}
            <div className="min-h-screen w-full relative flex flex-col bg-[#2D033B] overflow-hidden border-b border-white/5">
              {/* Subtle Purple Grid */}
              <div className="absolute inset-0 opacity-10 pointer-events-none" 
                   style={{ backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)`, backgroundSize: '32px 32px' }} />
              
              {/* Background Falling Blocks on Main Hub Page */}
              {activeSubPage === null && (
                <div className="absolute inset-0 pointer-events-none z-0">
                  {blocks.map((block) => (
                    <motion.div
                      key={block.id}
                      initial={false}
                      animate={{ 
                        y: block.row * GRID_SIZE + 2,
                        x: block.column * GRID_SIZE + 2,
                      }}
                      transition={{ 
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                        mass: 0.5
                      }}
                      style={{
                        position: 'absolute',
                        width: GRID_SIZE - 4,
                        height: GRID_SIZE - 4,
                        backgroundColor: block.color,
                        boxShadow: `inset 0 0 8px rgba(255,255,255,0.2), 0 0 15px ${block.color}33`,
                        border: '1px solid rgba(255,255,255,0.15)',
                        zIndex: 0,
                      }}
                    />
                  ))}
                </div>
              )}
              
              {/* Top Header Banner with Draggable Rope */}
          <motion.div 
            className="absolute top-0 left-0 w-full z-20 pointer-events-none"
            style={{ y: isUILocked ? 0 : springBannerY }}
            drag={isUILocked ? false : "y"}
            dragConstraints={{ top: -380, bottom: 0 }}
            dragElastic={0.05}
            onDragEnd={() => {
              if (!isUILocked) {
                setIsUILocked(true);
                bannerY.set(0);
              }
            }}
          >
            <div className="relative">
              {/* Global Home Trigger - Top Left Square */}
              <div 
                onClick={() => setActiveSubPage(null)}
                className="absolute top-0 left-0 w-80 h-80 z-[100] cursor-pointer group pointer-events-auto"
                title="返回主頁"
              >
                {/* Subtle visual hint for the trigger area */}
                <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-white/10 group-hover:border-white/40 transition-colors" />
              </div>

              {/* Top-Left Navigation Overlay - Bound to Banner */}
              <div className="absolute top-4 left-80 z-50 flex flex-col gap-6 pointer-events-auto">
                <div className="flex gap-6">
                  {HEARTS.map((heart) => {
                    const isSecretHeartPublished = false; // 預設隱藏發布，灰色心不可點擊
                    const isDisabled = heart.id === 'disabled' ? !isSecretHeartPublished : (heart as any).disabled;
                    return (
                      <PixelHeart 
                        key={heart.id}
                        color={heart.color}
                        label={heart.label}
                        size="sm"
                        isActive={activeSubPage === heart.id}
                        disabled={isDisabled}
                        onClick={() => {
                          if (heart.id === 'disabled' && !isSecretHeartPublished) {
                            return;
                          }
                          if (heart.id === 'visual') {
                            setGameState('special_thanks');
                          } else {
                            setActiveSubPage(heart.id);
                          }
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              {/* Hemp Rope - Moved before image to be behind (z-layer) */}
              {ropeVisible && !isRopeBroken && (
                <motion.div 
                  initial={{ y: -800 }}
                  animate={isRopeBroken ? { y: 1500 } : { y: -500 }}
                  transition={isRopeBroken ? { duration: 0.5, ease: "easeIn" } : { 
                    type: "spring", 
                    stiffness: 80, 
                    damping: 12,
                    mass: 1.2,
                    delay: 0.5
                  }}
                  className={`absolute top-[80%] left-[2%] flex flex-col items-center z-10 pointer-events-auto ${isUILocked ? 'cursor-grab active:cursor-grabbing' : ''}`}
                  drag={isUILocked ? "y" : false}
                  dragConstraints={{ top: 0, bottom: 200 }}
                  onDragStart={() => {
                    if (isUILocked) {
                      setIsRopeBroken(true);
                    }
                  }}
                >
                  {/* Gray-Blue-Green Rope (#50727B) */}
                  <div className="w-2 h-[800px] bg-[#50727B] rounded-full shadow-[inset_-2px_0_4px_rgba(0,0,0,0.3)] relative">
                    <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, #2C3E44 4px, #2C3E44 8px)' }} />
                  </div>
                  <div className="w-8 h-8 bg-[#50727B] rounded-full -mt-2 shadow-xl border-4 border-[#2C3E44] flex items-center justify-center">
                    <div className="w-1 h-4 bg-[#2C3E44]/30 rounded-full" />
                  </div>
                  <div className="mt-4 text-[#50727B] font-mono text-[10px] font-bold uppercase tracking-tighter opacity-70 select-none">
                    {isUILocked ? 'PULL TO BREAK' : 'PULL'}
                  </div>
                </motion.div>
              )}

              {/* Falling broken rope animation */}
              <AnimatePresence>
                {isRopeBroken && (
                  <motion.div
                    initial={{ y: 0, opacity: 1 }}
                    animate={{ y: 1500, opacity: 0 }}
                    transition={{ duration: 0.8, ease: "easeIn" }}
                    className="absolute top-[80%] left-[2%] flex flex-col items-center z-10 pointer-events-none"
                  >
                    <div className="w-2 h-[800px] bg-[#50727B] rounded-full opacity-50" />
                    <div className="w-8 h-8 bg-[#50727B] rounded-full -mt-2" />
                  </motion.div>
                )}
              </AnimatePresence>

              <img 
                src="https://lh3.googleusercontent.com/d/17Vt5pwNSqbxZvjtWZPTNtiI8droJP_62" 
                alt="Q-PIXEL Banner" 
                className="w-1/2 h-auto object-contain object-left-top drop-shadow-[0_5px_20px_rgba(255,255,255,0.3)] relative z-10 pointer-events-none select-none"
                referrerPolicy="no-referrer"
                draggable="false"
                onError={(e) => {
                  e.currentTarget.src = "https://picsum.photos/seed/qpixel-banner/1200/400";
                }}
              />
            </div>
          </motion.div>
          
          {/* Content Area for Next Page */}
          <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
            {/* Screen Transition Effect */}
            <AnimatePresence mode="wait">
              {activeSubPage && (
                <motion.div
                  key={`bg-${activeSubPage}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.05 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 pointer-events-none"
                  style={{ backgroundColor: HEARTS.find(h => h.id === activeSubPage || (activeSubPage === 'intro_chapter_1' && h.id === 'intro'))?.color }}
                />
              )}
            </AnimatePresence>

            {/* Sub-page Content */}
            <div className="relative z-10 w-full px-0">
              <AnimatePresence mode="wait">
                {activeSubPage ? (
                  <motion.div
                    key={activeSubPage}
                    initial={{ opacity: 0, scale: 0.98, y: 10, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, scale: 1.02, y: -10, filter: 'blur(10px)' }}
                    transition={{ 
                      type: 'spring', 
                      stiffness: 150, 
                      damping: 25,
                      opacity: { duration: 0.3 }
                    }}
                    className="text-white font-mono p-8 rounded-2xl transition-all duration-500 relative min-h-[calc(100vh-120px)]"
                    style={{ 
                      transform: displayScale !== 1 ? `scale(${displayScale})` : undefined, 
                      transformOrigin: 'top center',
                      transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
                    }}
                  >
                    {/* Display Monitor Scale Auto-Detection Module HUD is hidden per user request, but scale optimization remains fully functional */}

                    {/* Big Title - Now dynamic for all pages */}
                    {BIG_TITLES[activeSubPage] && (
                      <div className="absolute top-4 right-12 text-right z-50 pointer-events-none">
                        <motion.div 
                          key={`title-${activeSubPage}`}
                          initial={{ x: 100, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          className="text-8xl font-black italic text-white tracking-tighter drop-shadow-[0_0_40px_rgba(255,255,255,0.5)]"
                          style={{ WebkitTextStroke: '2px rgba(255,255,255,0.2)' }}
                        >
                          {BIG_TITLES[activeSubPage].title}
                        </motion.div>
                        <motion.div 
                          key={`subtitle-${activeSubPage}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 0.4 }}
                          className="text-xs text-white tracking-[1em] mt-2 uppercase font-black pr-2"
                        >
                          {BIG_TITLES[activeSubPage].subtitle}
                        </motion.div>
                      </div>
                    )}

                    {activeSubPage === 'members' ? (
                      <CharacterSelect 
                        onHome={() => setActiveSubPage(null)} 
                        onPageChange={(id) => setActiveSubPage(id)} 
                        onSpecialPage={(id) => {
                          setSelectedFighterId(id);
                          if (id === 8) {
                            setGameState('idol_studio');
                          } else {
                            setGameState('umiri_special');
                          }
                        }}
                        onTriggerLogin={() => {
                          setIsAdminLoginTriggered(true);
                          setGameState('idol_studio');
                        }}
                      />
                    ) : activeSubPage === 'social' ? (
                      <>
                        <BubbleSystem />
                      </>
                    ) : activeSubPage === 'intro' ? (() => {
                      const getCardStyle = (cardId: 'prequel' | 'origin' | 'future') => {
                        const order = ['prequel', 'origin', 'future'] as const;
                        const cardIndex = order.indexOf(cardId);
                        const activeIndex = order.indexOf(activeIntroCard);
                        const diff = cardIndex - activeIndex;
                        
                        if (diff === 0) {
                          return {
                            x: 0,
                            y: 0,
                            rotate: 0,
                            scale: 1,
                            opacity: 1,
                            zIndex: 30,
                          };
                        } else if (diff === 1) {
                          return {
                            x: isMobile ? 330 : 520,
                            y: 0,
                            rotate: 1.5,
                            scale: 0.88,
                            opacity: 0.75,
                            zIndex: 20,
                          };
                        } else if (diff === 2) {
                          return {
                            x: isMobile ? 360 : 580,
                            y: isMobile ? -10 : -15,
                            rotate: 3,
                            scale: 0.82,
                            opacity: 0.45,
                            zIndex: 10,
                          };
                        } else if (diff === -1) {
                          return {
                            x: isMobile ? -330 : -520,
                            y: 0,
                            rotate: -1.5,
                            scale: 0.88,
                            opacity: 0.75,
                            zIndex: 20,
                          };
                        } else if (diff === -2) {
                          return {
                            x: isMobile ? -360 : -580,
                            y: isMobile ? -10 : -15,
                            rotate: -3,
                            scale: 0.82,
                            opacity: 0.45,
                            zIndex: 10,
                          };
                        }

                        return {
                          x: 0,
                          y: 0,
                          rotate: 0,
                          scale: 1,
                          opacity: 1,
                          zIndex: 10,
                        };
                      };

                      return (
                        <div className="absolute inset-0 flex flex-col items-center pt-32 pb-16 px-4 md:pt-44 md:pb-24 md:px-8 gap-12 overflow-y-auto overflow-x-hidden custom-scrollbar">
                          <div className="flex flex-col items-center w-full max-w-6xl gap-10">
                            {/* Dynamic Heading based on centered/active card */}
                            <AnimatePresence mode="wait">
                              <motion.div
                                key={activeIntroCard}
                                initial={{ y: -15, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                exit={{ y: 15, opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="text-center"
                              >
                                <h2 className="text-4xl md:text-6xl font-black text-white tracking-[0.2em] italic drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                                  {activeIntroCard === 'prequel' 
                                    ? '保持你的初心-前夜傳' 
                                    : activeIntroCard === 'origin' 
                                      ? '創團物語' 
                                      : '未完待續'}
                                </h2>
                                <div className="mt-4 flex items-center justify-center gap-4">
                                  <span className="text-white/20 font-pixel text-[8px]">━━━━</span>
                                  <span className="text-[10px] text-white/40 font-pixel tracking-[0.5em] uppercase">
                                    {activeIntroCard === 'prequel' 
                                      ? 'Prequel: Keep Your Original Intent' 
                                      : activeIntroCard === 'origin' 
                                        ? 'The Story of Origin' 
                                        : 'Future Chapters Coming Soon'}
                                  </span>
                                  <span className="text-white/20 font-pixel text-[8px]">━━━━</span>
                                </div>
                              </motion.div>
                            </AnimatePresence>

                            {/* Carousel Track with horizontal navigation arrows */}
                            <div className="relative w-full flex flex-col items-center">
                              {/* Navigation Arrows (Continuous cycling) */}
                              <div className="absolute top-[50%] -translate-y-1/2 left-0 sm:left-4 z-40">
                                <motion.button
                                  whileHover={{ scale: 1.1, x: -2 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => {
                                    const prevMap: Record<'prequel' | 'origin' | 'future', 'prequel' | 'origin' | 'future'> = {
                                      prequel: 'future',
                                      origin: 'prequel',
                                      future: 'origin'
                                    };
                                    setActiveIntroCard(prevMap[activeIntroCard]);
                                  }}
                                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-white/10 backdrop-blur-md flex items-center justify-center transition-all cursor-pointer bg-white/10 text-white hover:bg-white/20 hover:border-white/20"
                                >
                                  <span className="text-lg font-bold">←</span>
                                </motion.button>
                              </div>

                              <div className="absolute top-[50%] -translate-y-1/2 right-0 sm:right-4 z-40">
                                <motion.button
                                  whileHover={{ scale: 1.1, x: 2 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => {
                                    const nextMap: Record<'prequel' | 'origin' | 'future', 'prequel' | 'origin' | 'future'> = {
                                      prequel: 'origin',
                                      origin: 'future',
                                      future: 'prequel'
                                    };
                                    setActiveIntroCard(nextMap[activeIntroCard]);
                                  }}
                                  className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-white/10 backdrop-blur-md flex items-center justify-center transition-all cursor-pointer bg-white/10 text-white hover:bg-white/20 hover:border-white/20"
                                >
                                  <span className="text-lg font-bold">→</span>
                                </motion.button>
                              </div>

                              {/* 3D Slideway Viewport */}
                              <div className="relative w-full h-[460px] sm:h-[680px] overflow-visible flex items-center justify-center">
                                
                                {/* Card 1: Prequel */}
                                <motion.div
                                  animate={getCardStyle('prequel')}
                                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                  onClick={() => setActiveIntroCard('prequel')}
                                  className="absolute cursor-pointer select-none origin-center"
                                  style={{ width: isMobile ? 320 : 480, height: isMobile ? 420 : 640 }}
                                >
                                  <div className="w-full h-full bg-white/5 backdrop-blur-xl rounded-[32px] sm:rounded-[40px] border-2 border-white/10 shadow-[0_0_50px_rgba(255,255,255,0.06)] overflow-hidden relative">
                                    <img 
                                      src="https://picsum.photos/seed/prequel-origin/800/800" 
                                      alt="Prequel Origin"
                                      className="w-full h-full object-cover opacity-90 transition-transform duration-700 ease-out"
                                      referrerPolicy="no-referrer"
                                      loading="lazy"
                                    />
                                    
                                    {/* Prequel Badge/Button */}
                                    <motion.button
                                      initial={{ opacity: 0, scale: 0.8 }}
                                      animate={{ 
                                        opacity: activeIntroCard === 'prequel' ? 1 : 0,
                                        scale: activeIntroCard === 'prequel' ? 1 : 0.8,
                                        pointerEvents: activeIntroCard === 'prequel' ? 'auto' : 'none'
                                      }}
                                      whileHover={activeIntroCard === 'prequel' ? { scale: 1.05, y: -2 } : {}}
                                      whileTap={activeIntroCard === 'prequel' ? { scale: 0.95 } : {}}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (activeIntroCard === 'prequel') {
                                          setActiveSubPage('intro_prequel_story');
                                        }
                                      }}
                                      className="absolute top-5 right-5 sm:top-6 sm:right-6 z-30 bg-[#50727B] text-white border-2 border-white/20 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-[0_8px_20px_rgba(80,114,123,0.4)] hover:border-white/50 hover:bg-[#608792] transition-colors cursor-pointer font-mono"
                                    >
                                      <span className="font-pixel text-[8px] sm:text-[9px] tracking-widest font-black uppercase flex items-center gap-2">
                                        前夜傳 // PREQUEL <span className="animate-pulse text-[#FFFF00]">▶</span>
                                      </span>
                                    </motion.button>
                                    
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#001B3D]/90 via-[#001B3D]/20 to-transparent pointer-events-none" />
                                    
                                    {/* Text Content inside Frame */}
                                    <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10 z-20">
                                      <p className="text-2xl sm:text-3xl font-black tracking-[0.1em] text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.4)] italic leading-tight">
                                        前傳01 一切的起點
                                      </p>
                                      
                                      <div className="mt-3 sm:mt-4 flex items-center gap-3">
                                        <span className="text-white/40 font-pixel text-xs">━━━━</span>
                                        <div className="text-[8px] sm:text-[9px] opacity-60 uppercase tracking-[0.3em] font-pixel text-white">
                                          Q-PIXEL PREQUEL // 000
                                        </div>
                                      </div>
                                    </div>

                                    <div className="absolute top-5 left-5 w-8 h-8 border-t-2 border-l-2 border-white/30 rounded-tl-lg" />
                                    <div className="absolute bottom-5 right-5 w-8 h-8 border-b-2 border-r-2 border-white/30 rounded-br-lg" />
                                    <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
                                  </div>
                                </motion.div>

                                {/* Card 2: Origin Story */}
                                <motion.div
                                  animate={getCardStyle('origin')}
                                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                  onClick={() => setActiveIntroCard('origin')}
                                  className="absolute cursor-pointer select-none origin-center"
                                  style={{ width: isMobile ? 320 : 480, height: isMobile ? 420 : 640 }}
                                >
                                  <div className="w-full h-full bg-white/5 backdrop-blur-xl rounded-[32px] sm:rounded-[40px] border-2 border-white/10 shadow-[0_0_50px_rgba(255,255,255,0.06)] overflow-hidden relative">
                                    <img 
                                      src="https://lh3.googleusercontent.com/d/1UQln4avTEezktGqc7ezjiV8BjN3ugH1-" 
                                      alt="Origin"
                                      className="w-full h-full object-cover opacity-90 transition-transform duration-700 ease-out"
                                      referrerPolicy="no-referrer"
                                      loading="lazy"
                                      onError={(e) => {
                                        e.currentTarget.src = "https://picsum.photos/seed/origin-fallback/800/800";
                                      }}
                                    />
                                    
                                    {/* Chapter 1 Badge/Button */}
                                    <motion.button
                                      initial={{ opacity: 0, scale: 0.8 }}
                                      animate={{ 
                                        opacity: activeIntroCard === 'origin' ? 1 : 0,
                                        scale: activeIntroCard === 'origin' ? 1 : 0.8,
                                        pointerEvents: activeIntroCard === 'origin' ? 'auto' : 'none'
                                      }}
                                      whileHover={activeIntroCard === 'origin' ? { scale: 1.05, y: -2 } : {}}
                                      whileTap={activeIntroCard === 'origin' ? { scale: 0.95 } : {}}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (activeIntroCard === 'origin') {
                                          setActiveSubPage('intro_chapter_1');
                                        }
                                      }}
                                      className="absolute top-5 right-5 sm:top-6 sm:right-6 z-30 bg-[#4C5E6E] text-white border-2 border-white/20 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-[0_8px_20px_rgba(76,94,110,0.4)] hover:border-white/50 hover:bg-[#5a7082] transition-colors cursor-pointer font-mono"
                                    >
                                      <span className="font-pixel text-[8px] sm:text-[9px] tracking-widest font-black uppercase flex items-center gap-2">
                                        第一章 // CHAPTER 1 <span className="animate-pulse text-[#FFD1DC]">▶</span>
                                      </span>
                                    </motion.button>
                                    
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#001B3D]/90 via-[#001B3D]/20 to-transparent pointer-events-none" />
                                    
                                    <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10 z-20">
                                      <p className="text-2xl sm:text-3xl font-black tracking-[0.1em] text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.4)] italic leading-tight">
                                        夢開始的地方
                                      </p>
                                      
                                      <div className="mt-3 sm:mt-4 flex items-center gap-3">
                                        <span className="text-white/40 font-pixel text-xs">━━━━</span>
                                        <div className="text-[8px] sm:text-[9px] opacity-60 uppercase tracking-[0.5em] font-pixel text-white">
                                          Q-PIXEL ORIGIN // 001
                                        </div>
                                      </div>
                                    </div>

                                    <div className="absolute top-5 left-5 w-8 h-8 border-t-2 border-l-2 border-white/30 rounded-tl-lg" />
                                    <div className="absolute bottom-5 right-5 w-8 h-8 border-b-2 border-r-2 border-white/30 rounded-br-lg" />
                                    <div className="absolute inset-0 pointer-events-none opacity-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
                                  </div>
                                </motion.div>

                                {/* Card 3: Future Story (Placeholder) */}
                                <motion.div
                                  animate={getCardStyle('future')}
                                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                  onClick={() => setActiveIntroCard('future')}
                                  className="absolute cursor-pointer select-none origin-center"
                                  style={{ width: isMobile ? 320 : 480, height: isMobile ? 420 : 640 }}
                                >
                                  <div className="w-full h-full bg-white/5 backdrop-blur-xl rounded-[32px] sm:rounded-[40px] border-2 border-white/10 shadow-[0_0_50px_rgba(255,255,255,0.06)] overflow-hidden relative">
                                    <img 
                                      src="https://picsum.photos/seed/cube-future/800/800" 
                                      alt="Future Chapter"
                                      className="w-full h-full object-cover opacity-50 filter grayscale contrast-125 group-hover/fut:scale-105 transition-transform duration-700 ease-out"
                                      referrerPolicy="no-referrer"
                                      loading="lazy"
                                    />
                                    
                                    {/* Locked / Coming Soon Badge */}
                                    <div className="absolute top-5 right-5 sm:top-6 sm:right-6 z-30 bg-black/60 text-white/80 border-2 border-white/10 px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-lg backdrop-blur-sm font-mono">
                                      <span className="font-pixel text-[8px] sm:text-[9px] tracking-widest font-black uppercase flex items-center gap-2">
                                        🔒 未完待續 // COMING SOON
                                      </span>
                                    </div>
                                    
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />
                                    
                                    <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10 z-20">
                                      <p className="text-2xl sm:text-3xl font-black tracking-[0.1em] text-white/50 drop-shadow-[0_0_12px_rgba(255,255,255,0.2)] italic leading-tight">
                                        新企劃 敬請期待
                                      </p>
                                      
                                      <div className="mt-3 sm:mt-4 flex items-center gap-3">
                                        <span className="text-white/20 font-pixel text-xs">━━━━</span>
                                        <div className="text-[8px] sm:text-[9px] opacity-40 uppercase tracking-[0.5em] font-pixel text-white">
                                          Q-PIXEL FUTURE // 002
                                        </div>
                                      </div>
                                    </div>

                                    <div className="absolute top-5 left-5 w-8 h-8 border-t-2 border-l-2 border-white/10 rounded-tl-lg" />
                                    <div className="absolute bottom-5 right-5 w-8 h-8 border-b-2 border-r-2 border-white/10 rounded-br-lg" />
                                    <div className="absolute inset-0 pointer-events-none opacity-5 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
                                  </div>
                                </motion.div>

                              </div>

                              {/* Indicators */}
                              <div className="flex gap-2.5 mt-6">
                                <button 
                                  onClick={() => setActiveIntroCard('prequel')}
                                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                                    activeIntroCard === 'prequel' ? 'bg-[#87CEEB] scale-125 shadow-[0_0_8px_rgba(135,206,235,0.8)]' : 'bg-white/25 hover:bg-white/40'
                                  }`}
                                />
                                <button 
                                  onClick={() => setActiveIntroCard('origin')}
                                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                                    activeIntroCard === 'origin' ? 'bg-[#FFD1DC] scale-125 shadow-[0_0_8px_rgba(255,209,220,0.8)]' : 'bg-white/25 hover:bg-white/40'
                                  }`}
                                />
                                <button 
                                  onClick={() => setActiveIntroCard('future')}
                                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                                    activeIntroCard === 'future' ? 'bg-[#E0E0E0] scale-125 shadow-[0_0_8px_rgba(224,224,224,0.8)]' : 'bg-white/25 hover:bg-white/40'
                                  }`}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })() : activeSubPage === 'intro_prequel_story' ? (
                      <div className="absolute inset-x-0 mx-auto max-w-6xl flex flex-col items-center justify-center p-4 md:p-10">
                        {/* Back navigation button */}
                        <motion.button
                          whileHover={{ scale: 1.05, x: -4 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setActiveSubPage('intro')}
                          className="self-start mb-6 z-40 flex items-center gap-3 text-white/70 hover:text-white transition-all py-2 px-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-mono shadow-md cursor-pointer"
                        >
                          <span className="text-base font-black">←</span>
                          <span className="text-[10px] font-pixel uppercase tracking-widest">返回創團起點 // BACK</span>
                        </motion.button>

                        <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 w-full items-center justify-center z-10 text-white font-mono">
                          {/* Left Column: Visual card */}
                          <motion.div
                            initial={{ x: -30, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="w-[300px] h-[400px] sm:w-[320px] sm:h-[420px] bg-white/5 backdrop-blur-xl rounded-[24px] border-2 border-white/10 overflow-hidden relative shadow-[0_0_40px_rgba(80,114,123,0.2)] flex-shrink-0"
                          >
                            <img 
                              src="https://picsum.photos/seed/prequel-origin/600/800" 
                              alt="Prequel chapter"
                              className="w-full h-full object-cover opacity-80"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#001B3D]/95 via-[#001B3D]/30 to-transparent pointer-events-none" />
                            
                            <div className="absolute bottom-6 left-6 right-6">
                              <span className="text-[10px] bg-[#50727B] text-white px-2.5 py-1 rounded font-pixel uppercase tracking-widest font-bold">PREQUEL</span>
                              <h3 className="text-xl font-black mt-2 tracking-wider italic text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]">一切的起點</h3>
                              <p className="text-[10px] text-white/50 font-pixel uppercase tracking-[0.2em] mt-1">THE STARTS BEFORE DAWN</p>
                            </div>
                            
                            <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-white/30 rounded-tl-lg" />
                            <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-white/30 rounded-br-lg" />
                          </motion.div>

                          {/* Right Column: Story Text Content Scroll */}
                          <motion.div
                            initial={{ x: 30, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="flex-1 w-full max-w-2xl bg-black/45 backdrop-blur-md border-2 border-white/10 rounded-2xl p-6 md:p-8 relative overflow-hidden flex flex-col justify-between shadow-[0_12px_45px_rgba(0,0,0,0.5)] min-h-[400px]"
                          >
                            <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[#50727B]" />
                            <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[#50727B]" />
                            <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[#50727B]" />
                            <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[#50727B]" />

                            <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
                              <div className="flex items-center gap-2">
                                <span>✨</span>
                                <span className="font-pixel text-[11px] tracking-[0.3em] uppercase text-[#87CEEB] font-bold">ARCADE HISTORY MODULE_00</span>
                              </div>
                              <span className="font-pixel text-[10px] text-white/35">PRE-STAGE SYNC // READY</span>
                            </div>

                            <div className="space-y-4 sm:space-y-5 text-sm sm:text-[15px] leading-relaxed text-white/90 font-mono tracking-wide py-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                              <p className="border-l-4 border-[#87CEEB] pl-4 text-white font-bold">
                                在熱鬧的盛夏到來前，那是無數個漫長的寒夜。
                              </p>
                              <p>
                                每位在白日為了生計而奔波、在鋼筋水泥的都市中壓抑靈魂的我們，總在午夜的群組裡不約而同地亮起綠燈。
                              </p>
                              <p className="text-white/80 italic pl-3 border-l-2 border-[#87CEEB]/40">
                                「不論這個世界怎麼變，我們當初對創作最純粹的那份熱愛，絕對不能被磨滅。」
                              </p>
                              <p>
                                像素、方塊、復古的 8-bit 音效……這些在他人眼裡或許是過時的產物，在我們眼中，卻是最高自由度的造夢工具。
                              </p>
                              <p>
                                那張由咖啡漬印染的草稿紙上，寫下了後來成為我們核心精神的誓言。沒有繁複的修飾，唯有一顆絕對真誠、想要傳達心意的「初心」。
                              </p>
                              <p className="text-[#87CEEB] font-bold">
                                這是前夜傳，是我們一切故事最珍貴、也最純淨的起點。
                              </p>
                            </div>

                            <div className="mt-6 pt-4 border-t border-white/10 flex justify-between items-center text-[10px] text-white/40 tracking-widest uppercase">
                              <span>PREQUEL LOG: INITIALIZED</span>
                              <span className="text-[#87CEEB] font-bold font-pixel">Q-PIXEL_PRE_0.0</span>
                            </div>
                          </motion.div>
                        </div>
                      </div>
                    ) : activeSubPage === 'intro_chapter_1' ? (
                      <div className="absolute inset-x-0 mx-auto max-w-7xl w-full flex flex-col items-center justify-center p-4 md:p-8 lg:p-12">
                        {/* Back navigation button */}
                        <motion.button
                          whileHover={{ scale: 1.05, x: -4 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setActiveSubPage('intro')}
                          className="self-start mb-8 z-40 flex items-center gap-3 text-white/70 hover:text-white transition-all py-2.5 px-5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-mono shadow-md cursor-pointer"
                        >
                          <span className="text-base font-black">←</span>
                          <span className="text-[10px] font-pixel uppercase tracking-widest">返回創團起點 // BACK</span>
                        </motion.button>

                        <div className="flex flex-col lg:flex-row gap-12 lg:gap-20 w-full items-center justify-center z-10 text-white font-mono">
                          {/* Left Column: Visual card - Enlarged to reduce empty space */}
                          <motion.div
                            initial={{ x: -30, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.2 }}
                            className="w-[260px] h-[350px] sm:w-[340px] sm:h-[460px] md:w-[380px] md:h-[510px] bg-white/5 backdrop-blur-xl rounded-[24px] border border-white/10 overflow-hidden relative shadow-[0_0_40px_rgba(76,94,110,0.2)] flex-shrink-0"
                          >
                            <img 
                              src="https://lh3.googleusercontent.com/d/1UQln4avTEezktGqc7ezjiV8BjN3ugH1-" 
                              alt="Origin chapter"
                              className="w-full h-full object-cover opacity-85"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                e.currentTarget.src = "https://picsum.photos/seed/chapter-fallback/600/800";
                              }}
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#001B3D]/95 via-[#001B3D]/30 to-transparent pointer-events-none" />
                            
                            <div className="absolute bottom-6 left-6 right-6">
                              <span className="text-[10px] bg-[#4C5E6E] text-white px-3 py-1 rounded font-pixel uppercase tracking-widest font-bold">CHAPTER 1</span>
                              <h3 className="text-xl font-black mt-2 tracking-wider italic text-white drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]">回不去的曾經</h3>
                              <p className="text-[10px] text-white/50 font-pixel uppercase tracking-[0.2em] mt-0.5">THE STORY CONTINUES</p>
                            </div>
                            
                            <div className="absolute top-4 left-4 w-5 h-5 border-t border-l border-white/30 rounded-tl-md" />
                            <div className="absolute bottom-4 right-4 w-5 h-5 border-b border-r border-white/30 rounded-br-md" />
                          </motion.div>

                          {/* Right Column: Story Text Content - Enlarged max-width, padding and spacing, no borders/scrolling */}
                          <motion.div
                            initial={{ x: 30, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="flex-1 w-full max-w-4xl bg-black/15 backdrop-blur-xs p-6 md:p-8 lg:p-10 relative flex flex-col justify-between shadow-none"
                          >
                            <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
                              <div className="flex items-center gap-2">
                                <span className="text-xl">🌌</span>
                                <span className="font-pixel text-[11px] tracking-[0.3em] uppercase text-[#7E98B0] font-bold">ARCADE HISTORY MODULE_01</span>
                              </div>
                              <span className="font-pixel text-[10px] text-white/35">ONLINE SYNC // SUCCESS</span>
                            </div>

                            <div className="space-y-6 sm:space-y-8 text-[18px] sm:text-[21px] md:text-[24px] lg:text-[26px] leading-relaxed text-white/95 font-mono tracking-wide py-2">
                              <p className="border-l-4 border-[#4C5E6E] pl-5 text-white font-bold">
                                本來 一切都是挺好的.........直到那天
                              </p>
                              <p>
                                獨自離家 和父親相依為命(至少我以為是這樣)<br />
                                一個人創業 一個人努力工作 甚至一個人架網站<br />
                                在我本來以為一切都好起來了 嚮往已久的工作室終於到手的時候
                              </p>
                              <p className="text-white/80 italic pl-4 border-l-2 border-[#4C5E6E]/40">
                                就因為父親一句話 一個錯誤的決策 一個本不應由我承擔的結果<br />
                                被強行的壓到我頭上 工作室也即將退租被收回
                              </p>
                              <p>
                                這是如此的可笑 書上所講的個人造業個人擔 在那一瞬間聽起來就像個笑話<br />
                                所謂的 「人在家中坐 大黑鍋從天上來」 大概就是這個意思吧......
                              </p>
                              <p>
                                網上所說的「你有一個低認知父母 事業就毀一半」這種話<br />
                                我在以前都是笑笑帶過 直到事情打到我頭上 我才知道
                              </p>
                              <p className="text-[#FFA4B4] font-bold text-2xl sm:text-3xl md:text-4xl border-t border-white/10 pt-5 mt-4">
                                「呵 我有兩個」
                              </p>
                            </div>

                            <div className="mt-8 pt-4 border-t border-white/10 flex justify-between items-center text-[10px] text-white/40 tracking-widest uppercase">
                              <span>AUTOSAVE STATE: STORED</span>
                              <span className="text-[#4C5E6E] font-bold font-pixel">Q-PIXEL_PROD_1.0</span>
                            </div>
                          </motion.div>
                        </div>
                      </div>
                    ) : activeSubPage === 'collab' ? (
                      <div className="absolute inset-0 flex items-start justify-center px-16 pt-72 pb-16 z-40">
                        <div className="grid grid-cols-2 grid-rows-3 gap-4 w-full h-full max-h-[calc(100vh-320px)] max-w-[95vw] mx-auto">
                          {[
                            { title: 'BRAND', id: '01' },
                            { title: 'EVENT', id: '02' },
                            { title: 'MUSIC', id: '03' },
                            { title: 'ART', id: '04' },
                            { title: 'MEDIA', id: '05' },
                            { title: 'OTHER', id: '06' }
                          ].map((item, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, scale: 0.98 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: i * 0.05 }}
                              className="bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10 transition-all duration-300 cursor-pointer flex flex-col items-center justify-center group relative overflow-hidden shadow-2xl"
                            >
                              {/* Background Text Accent - Removed */}
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                              </div>

                              {/* Decorative Corner Accents */}
                              <div className="absolute top-0 left-0 w-32 h-32 border-t-2 border-l-2 border-white/10 group-hover:border-white/30 transition-all duration-500" />
                              <div className="absolute bottom-0 right-0 w-32 h-32 border-b-2 border-r-2 border-white/10 group-hover:border-white/30 transition-all duration-500" />
                              
                              {/* Content */}
                              <div className="relative z-10 flex flex-col items-center justify-center px-8 text-center w-full h-full">
                                {i === 0 && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-white font-black text-6xl md:text-8xl tracking-[0.2em] drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]"
                                  >
                                    團員招募中
                                  </motion.div>
                                )}
                               {i === 4 && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-white font-bold flex flex-col gap-4 text-center items-center"
                                  >
                                    <div className="text-3xl md:text-4xl tracking-widest opacity-60">官方通訊管道</div>
                                    <div className="text-xl md:text-2xl opacity-80 font-mono tracking-widest">
                                      電話: 02-8925-2329
                                    </div>
                                  </motion.div>
                                )}
                                {i === 5 && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-white font-bold flex flex-col gap-4"
                                  >
                                    <div className="text-3xl md:text-4xl tracking-widest opacity-60">其他合作邀約請聯繫</div>
                                    <div className="text-xl md:text-2xl text-[#4C5E6E] break-all">海璃海狸工作室電子郵件<br/>haillibaobao0822@gmail.com</div>
                                    <div className="text-lg md:text-xl opacity-80 leading-relaxed">
                                      或於平日早上9:00至晚上8:00<br/>
                                      至海璃海狸工作室進行商談
                                    </div>
                                  </motion.div>
                                )}
                                <div className="absolute bottom-12 h-3 w-0 bg-white/70 group-hover:w-96 transition-all duration-500" />
                              </div>
                              
                              {/* Hover Glow & Scanline */}
                              <div className="absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                              <div className="absolute inset-0 pointer-events-none opacity-[0.06] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]" />
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    ) : activeSubPage === 'performance' ? (
                      <div className="w-full flex flex-col items-center gap-16 md:gap-24 relative z-10">
                        {/* Page 1: Announcement Block */}
                        <div className="min-h-[calc(100vh-220px)] w-full flex flex-col items-center justify-center p-4 md:p-8 relative">
                          {/* Enlarged pixel prohibition button for Banned List, aligned in the bottom right corner */}
                          <div className="absolute bottom-6 right-6 sm:bottom-8 sm:right-8 md:bottom-12 md:right-12 z-50 pointer-events-auto">
                            <motion.button 
                              whileHover={{ scale: 1.1, rotate: -5 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setGameState('banned_list')}
                              className="p-4 bg-neutral-950/95 hover:bg-red-950/45 border-2 border-[#FF5555] rounded-xl flex flex-col items-center justify-center gap-3 transition-all duration-300 shadow-[0_0_25px_rgba(255,85,85,0.3)] hover:shadow-[0_0_35px_rgba(255,85,85,0.5)] cursor-pointer group"
                            >
                              {/* Large Pixel Prohibition Icon */}
                              <div className="grid grid-cols-9 gap-[1px]">
                                {[
                                  [0, 0, 1, 1, 1, 1, 1, 0, 0],
                                  [0, 1, 2, 2, 2, 2, 2, 1, 0],
                                  [1, 2, 2, 2, 0, 0, 0, 2, 1],
                                  [1, 2, 0, 2, 2, 0, 0, 2, 1],
                                  [1, 2, 0, 0, 2, 2, 0, 2, 1],
                                  [1, 2, 0, 0, 0, 2, 2, 2, 1],
                                  [1, 2, 0, 0, 0, 0, 2, 2, 1],
                                  [0, 1, 2, 2, 2, 2, 2, 1, 0],
                                  [0, 0, 1, 1, 1, 1, 1, 0, 0],
                                ].map((row, rowIndex) => 
                                  row.map((pixel, colIndex) => (
                                    <div 
                                      key={`${rowIndex}-${colIndex}`} 
                                      className="w-1.5 h-1.5 sm:w-2 sm:h-2 md:w-2.5 md:h-2.5"
                                      style={{ 
                                        backgroundColor: pixel === 1 ? '#FFFFFF' : pixel === 2 ? '#FF3333' : 'transparent' 
                                      }}
                                    />
                                  ))
                                )}
                              </div>
                              
                              <div className="flex flex-col items-center gap-0.5">
                                <span className="text-[#FF5555] text-[11px] sm:text-xs font-pixel tracking-wider font-bold group-hover:text-red-400">
                                  出禁名單
                                </span>
                                <span className="text-white/40 text-[8px] font-mono tracking-widest uppercase">
                                  BLACKLIST
                                </span>
                              </div>
                            </motion.button>
                          </div>
                          <div className="w-full max-w-5xl flex flex-col gap-8 my-auto py-8">
                            {/* Opening Announcement Block (Enlarged) */}
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.1 }}
                              className="w-full bg-black/45 backdrop-blur-lg rounded-2xl py-16 px-6 sm:px-12 md:py-20 md:px-16 border-2 border-white/10 shadow-[0_0_50px_rgba(255,179,71,0.18)] relative overflow-hidden group"
                            >
                              {/* Neon-colored pixel corner decorations */}
                              <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-[#FFB347]" />
                              <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-[#FFB347]" />
                              <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-[#FFB347]" />
                              <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-[#FFB347]" />
                              
                              {/* Content header style */}
                              <div className="flex items-center justify-center gap-4 mb-10">
                                <span className="text-4xl animate-pulse select-none">🏮</span>
                                <span className="text-sm md:text-base text-[#FFB347] font-pixel tracking-[0.5em] uppercase font-black">INFO MODULE</span>
                                <span className="text-4xl animate-pulse select-none">🏮</span>
                              </div>
                              
                              {/* Announcement Body */}
                              <p className="text-center text-xl sm:text-2xl md:text-4xl lg:text-5xl xl:text-6xl font-black text-white tracking-[0.15em] leading-[1.8] select-none drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                                紡塊像素官方小基地<br />
                                <span className="text-[#FFB347] drop-shadow-[0_0_25px_rgba(255,179,113,0.6)] font-extrabold inline-block my-3">「酸欠像素偶像居酒屋」</span><br />
                                現正營業中
                              </p>
                            </motion.div>
                          </div>
                          
                          {/* Scroll Down Indicator */}
                          <motion.div 
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 0.6 }}
                            viewport={{ once: true }}
                            className="absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/30 pointer-events-none"
                          >
                            <span className="text-[10px] font-black tracking-[0.5em] uppercase">Scroll</span>
                            <motion.div 
                              animate={{ y: [0, 8, 0] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="w-1 h-8 bg-gradient-to-b from-white/30 to-transparent rounded-full"
                            />
                          </motion.div>
                        </div>

                        {/* Page 2: Monthly Calendar */}
                        <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 md:p-8 relative">
                          <div className="w-full max-w-4xl flex flex-col gap-8 my-auto py-8">
                            <motion.div
                              initial={{ opacity: 0, y: 30 }}
                              whileInView={{ opacity: 1, y: 0 }}
                              viewport={{ once: true }}
                              transition={{ duration: 0.6 }}
                              className="w-full"
                            >
                              <React.Suspense fallback={
                                <div className="flex flex-col items-center justify-center p-12 bg-white/5 border border-white/10 rounded-2xl animate-pulse font-mono text-xs text-white/50 tracking-widest">
                                  <div className="w-8 h-8 border-2 border-[#87CEEB] border-t-transparent rounded-full animate-spin mb-4" />
                                  LOADING CALENDAR MODULE // 載入行事曆模組
                                </div>
                              }>
                                <EventCalendar mode="store-only" />
                              </React.Suspense>
                            </motion.div>
                          </div>
                        </div>
                      </div>
                    ) : activeSubPage === 'live_event' ? (
                      <div className="w-full flex flex-col items-center gap-16 md:gap-24 relative z-10">
                        {/* Page 1: Announcement Block */}
                        <div className="min-h-[calc(100vh-220px)] w-full flex flex-col items-center justify-center p-4 md:p-8 relative">
                          <div className="w-full max-w-4xl flex flex-col gap-8 my-auto py-8">
                            {/* Opening Announcement Block (Enlarged) */}
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.1 }}
                              className="w-full bg-black/45 backdrop-blur-lg rounded-2xl py-16 px-12 md:py-20 md:px-16 border-2 border-[#FFFF00]/25 shadow-[0_0_50px_rgba(255,255,0,0.12)] relative overflow-hidden group"
                            >
                              {/* Neon-colored pixel corner decorations */}
                              <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-[#FFFF00]" />
                              <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-[#FFFF00]" />
                              <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-[#FFFF00]" />
                              <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-[#FFFF00]" />
                              
                              {/* Content header style */}
                              <div className="flex items-center justify-center gap-4 mb-10">
                                <span className="text-4xl animate-pulse select-none">🎤</span>
                                <span className="text-sm md:text-base text-[#FFFF00] font-pixel tracking-[0.5em] uppercase font-black">LIVE PERFORMANCE</span>
                                <span className="text-4xl animate-pulse select-none">🎤</span>
                              </div>
                              
                              {/* Announcement Body */}
                              <p className="text-center text-xl sm:text-2xl md:text-4xl font-black text-white tracking-[0.15em] leading-[1.8] select-none drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
                                CUBEPIXEL 夏季特別Live公演<br />
                                <span className="text-[#FFFF00] drop-shadow-[0_0_25px_rgba(255,255,0,0.6)] font-extrabold inline-block my-2">「第一回紡塊公演：像素重力」</span><br />
                                即將隆重推出，敬請期待！
                              </p>
                            </motion.div>
                          </div>
                          
                          {/* Scroll Down Indicator */}
                          <motion.div 
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 0.6 }}
                            viewport={{ once: true }}
                            className="absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/30 pointer-events-none"
                          >
                            <span className="text-[10px] font-black tracking-[0.5em] uppercase">Scroll</span>
                            <motion.div 
                              animate={{ y: [0, 8, 0] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="w-1 h-8 bg-gradient-to-b from-white/30 to-transparent rounded-full"
                            />
                          </motion.div>
                        </div>

                        {/* Page 2: Monthly Calendar */}
                        <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 md:p-8 relative">
                          <div className="w-full max-w-4xl flex flex-col gap-8 my-auto py-8">
                            <motion.div
                              initial={{ opacity: 0, y: 30 }}
                              whileInView={{ opacity: 1, y: 0 }}
                              viewport={{ once: true }}
                              transition={{ duration: 0.6 }}
                              className="w-full"
                            >
                              <React.Suspense fallback={
                                <div className="flex flex-col items-center justify-center p-12 bg-white/5 border border-white/10 rounded-2xl animate-pulse font-mono text-xs text-white/50 tracking-widest">
                                  <div className="w-8 h-8 border-2 border-[#FFFF00] border-t-transparent rounded-full animate-spin mb-4" />
                                  LOADING CALENDAR MODULE // 載入行事曆模組
                                </div>
                              }>
                                <EventCalendar mode="performance-only" />
                              </React.Suspense>
                            </motion.div>
                          </div>
                        </div>
                      </div>
                    ) : activeSubPage === 'disabled' ? (
                      <div className="w-full min-h-[calc(100vh-220px)] flex flex-col items-center justify-center p-4 md:p-8 relative z-10">
                        <motion.div 
                          initial={{ opacity: 0, scale: 0.92 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.4 }}
                          className="max-w-2xl w-full bg-slate-900/95 border-2 border-slate-500/40 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-[0_0_50px_rgba(76,94,110,0.3)] flex flex-col items-center text-center space-y-6"
                        >
                          {/* Header Tag */}
                          <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-800/90 border border-slate-500/40 rounded-full text-slate-300 text-xs font-mono font-bold tracking-widest shadow-sm">
                            <span>🔒 SECRET UNLOCKED // 隱藏內容</span>
                          </div>

                          {/* Image Container */}
                          <div className="w-full rounded-2xl overflow-hidden border border-slate-600/30 bg-black/80 shadow-2xl relative group">
                            <img 
                              src="https://drive.google.com/thumbnail?id=16pSSUb3kREFMRTd08o-97CZ-bSvH-Ulm&sz=w1000"
                              alt="隱藏圖片"
                              className="w-full max-h-[60vh] object-contain transition-transform duration-500 group-hover:scale-105"
                              referrerPolicy="no-referrer"
                            />
                          </div>

                          {/* Action Buttons */}
                          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
                            <a 
                              href="https://drive.google.com/file/d/16pSSUb3kREFMRTd08o-97CZ-bSvH-Ulm/view?usp=sharing"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-5 py-2.5 bg-slate-700/80 hover:bg-slate-600 text-white rounded-xl text-xs font-bold font-mono transition-all border border-slate-500/30 shadow-md flex items-center gap-2"
                            >
                              <span>🖼️</span>
                              <span>開啟原圖連結</span>
                            </a>
                            <button
                              onClick={() => setActiveSubPage(null)}
                              className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold font-mono transition-all border border-white/20"
                            >
                              ✕ 關閉頁面
                            </button>
                          </div>
                        </motion.div>
                      </div>
                    ) : (
                      <div className="absolute inset-y-0 left-0 flex flex-col justify-center px-20 max-w-5xl">
                        <motion.div
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: 0.2 }}
                        >
                          <p className="text-3xl opacity-90 leading-relaxed whitespace-pre-line font-medium border-l-8 border-white/20 pl-12">
                            {HEARTS.find(h => h.id === activeSubPage)?.content}
                          </p>
                          <div className="mt-12 flex justify-start pl-12">
                            <div className="text-sm opacity-30 uppercase tracking-[0.4em] font-black">
                              Q-PIXEL SYSTEM // MODULE_ID: 00{HEARTS.findIndex(h => h.id === activeSubPage) + 1}
                            </div>
                          </div>
                        </motion.div>
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div 
                    key="home_intro_slogan"
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 1.02, y: -15 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="flex flex-col items-center justify-center text-center max-w-5xl mx-auto py-12 relative"
                  >
                    {/* Beautiful Neon border accents */}
                    <div className="absolute top-0 left-12 w-2 h-2 bg-[#87CEEB]" />
                    <div className="absolute bottom-0 right-12 w-2 h-2 bg-[#87CEEB]" />
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-48 h-[2px] bg-gradient-to-r from-transparent via-[#87CEEB] to-transparent opacity-80" />
                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-48 h-[2px] bg-gradient-to-r from-transparent via-[#87CEEB] to-transparent opacity-80" />
                    
                    <p className="text-4xl md:text-6xl font-black text-white tracking-[0.2em] md:tracking-[0.3em] leading-relaxed italic drop-shadow-[0_0_30px_rgba(135,206,235,0.4)] px-4">
                      精緻偶像讓人著迷<br />但遜砲偶像讓人為之瘋狂
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Scroll Down Indicator */}
            {!activeSubPage && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 2 }}
                className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/30 pointer-events-none"
              >
                <span className="text-xs font-black tracking-[0.5em] uppercase">Scroll</span>
                <motion.div 
                  animate={{ y: [0, 10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-1 h-8 bg-gradient-to-b from-white/30 to-transparent rounded-full"
                />
              </motion.div>
            )}
          </div>
        </div>

          {/* SECTION 2: EXTENDED CONTENT (ORIGINAL COLOR) */}
          {!activeSubPage && (
            <div className="min-h-screen w-full bg-[#001B3D] relative flex flex-col items-center pt-32 pb-32 px-20">
              <div className="absolute inset-0 opacity-20 pointer-events-none"
                   style={{
                     backgroundImage: `
                       linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
                       linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)
                     `,
                     backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
                   }}
              />
              
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="relative z-10 flex flex-col items-center text-center w-full max-w-6xl"
              >
                <div className="flex flex-col items-center mb-16">
                  <h2 className="text-[80px] font-black text-white tracking-[0.2em] italic drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">
                    最新資訊
                  </h2>
                  <div className="mt-4 flex items-center justify-center gap-6 w-full max-w-md">
                    <span className="text-white/20 font-pixel text-xs flex-1 text-right">━━━━━━</span>
                    <span className="text-xs text-white/40 font-pixel tracking-[0.5em] uppercase whitespace-nowrap">Latest News</span>
                    <span className="text-white/20 font-pixel text-xs flex-1 text-left">━━━━━━</span>
                  </div>
                </div>

                {/* News List - Main Page (Featured 2-Block Size Pinned Notice & Leave Notice) */}
                <div className="flex flex-col gap-8 w-full max-w-4xl">
                  {/* News Card 0: 8月10日 涼海璃請假與居酒屋暫停營業通知 */}
                  <div className="w-full bg-black/30 backdrop-blur-md rounded-2xl py-12 px-10 md:py-14 md:px-12 border-[0.5px] border-white/10 relative overflow-hidden flex flex-col items-start justify-center text-left hover:border-[#D1B3FF]/30 transition-all duration-300">
                    <div className="absolute top-0 left-0 w-3 h-3 border-t-[0.5px] border-l-[0.5px] border-[#D1B3FF]" />
                    <div className="absolute top-0 right-0 w-3 h-3 border-t-[0.5px] border-r-[0.5px] border-[#D1B3FF]" />
                    <div className="absolute bottom-0 left-0 w-3 h-3 border-b-[0.5px] border-l-[0.5px] border-[#D1B3FF]" />
                    <div className="absolute bottom-0 right-0 w-3 h-3 border-b-[0.5px] border-r-[0.5px] border-[#D1B3FF]" />
                    
                    <div className="flex flex-wrap items-center justify-between w-full gap-4 mb-6 pb-4 border-b border-white/5">
                      <div className="flex items-center gap-3">
                        <span className="inline-block px-2.5 py-1 text-xs font-bold bg-[#D1B3FF]/10 text-[#D1B3FF] border border-[#D1B3FF]/30 rounded font-pixel uppercase tracking-widest">
                          請假與公休
                        </span>
                        <span className="text-sm font-mono text-white/40">2026.08.10</span>
                      </div>
                      <span className="text-xs font-mono text-white/20 select-none">NOTICE ID: #006</span>
                    </div>

                    <h3 className="text-2xl md:text-3xl font-black text-white mb-4 tracking-wider hover:text-[#D1B3FF] transition-colors">
                      【重要通知】8月10日 涼海璃請假與居酒屋暫停營業通知 🌸
                    </h3>
                    
                    <p className="text-lg md:text-xl text-white/80 leading-relaxed font-mono font-medium">
                      親愛的各位玩家與顧客：
                      <br />
                      團長 <span className="text-[#D1B3FF] font-bold">涼海璃</span> 於今日（<span className="text-amber-400 font-bold">8月10日</span>）請假一天，
                      <br />
                      酸欠像素偶像居酒屋同步 <span className="text-amber-400 font-bold">暫停營業一天</span>。
                      <span className="text-base md:text-lg text-white/60 block mt-2">
                        造成不便敬請見諒，感謝大家的理解與體諒！
                      </span>
                    </p>

                    <div className="mt-8 flex items-center justify-between w-full">
                      <p className="text-sm text-white/40 font-mono">
                        祝大家有美好的一天，期待明日與大家再次相見！
                      </p>
                      <div className="w-2 h-2 bg-[#D1B3FF] rounded-full animate-pulse" />
                    </div>
                  </div>

                  {/* News Card 1: 出禁公告 (Featured / 2-Block Enlarge Size / Deep Wine Red Theme) */}
                  <div className="w-full bg-[#24060B]/90 backdrop-blur-md rounded-3xl py-14 px-10 md:py-16 md:px-14 border-2 border-[#800A1D] relative overflow-hidden flex flex-col items-start justify-center text-left hover:border-[#FF4D6D] transition-all duration-300 shadow-[0_0_50px_rgba(128,10,29,0.35)] min-h-[480px]">
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#FF4D6D]" />
                    <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-[#FF4D6D]" />
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-[#FF4D6D]" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#FF4D6D]" />
                    
                    <div className="flex flex-wrap items-center justify-between w-full gap-4 mb-6 pb-4 border-b border-[#800A1D]/60">
                      <div className="flex items-center gap-3">
                        <span className="inline-block px-3 py-1 text-xs font-black bg-[#800A1D]/80 text-[#FF6B81] border border-[#FF6B81]/50 rounded-md font-pixel uppercase tracking-widest shadow-sm">
                          出禁公告
                        </span>
                        <span className="inline-block px-3 py-1 text-xs font-black bg-[#A31D33]/40 text-red-200 border border-[#A31D33]/60 rounded-md font-pixel uppercase tracking-widest animate-pulse">
                          📌 PINNED / 重要特大
                        </span>
                        <span className="text-sm font-mono text-white/50">2026.07.24</span>
                      </div>
                      <span className="text-xs font-mono text-[#FF6B81]/70 select-none">NOTICE ID: #005</span>
                    </div>

                    <h3 className="text-2xl md:text-4xl font-black text-white mb-6 tracking-wider hover:text-[#FF6B81] transition-colors leading-tight">
                      【出禁】近期因怪阿伯出沒 於是本店將暫不開放前台區域 🚫
                    </h3>
                    
                    <p className="text-lg md:text-xl text-white/95 leading-relaxed font-mono font-medium mb-6">
                      因本店出現怪阿伯於非營業時間且未經店長本人允許時，
                      <br />
                      在前方櫃台區域進行 <span className="text-red-400 font-bold underline decoration-red-500/50">無故侵入之非法行為</span>，
                      <br />
                      故 <span className="text-amber-400 font-bold">暫不開放前台區給顧客做相關使用</span> 非常抱歉。
                    </p>

                    {/* Attached Official Banned Poster Image */}
                    <div className="my-6 w-full flex flex-col items-center md:items-start">
                      <div className="relative overflow-hidden rounded-2xl border-2 border-[#800A1D] bg-black/70 p-3 max-w-md w-full shadow-[0_0_30px_rgba(234,179,8,0.2)]">
                        <img
                          src="https://lh3.googleusercontent.com/d/1I5Y6bWvuyfmAn5mispwM-oBZFbz2d6nR"
                          alt="酸欠像素偶像居酒屋官方出禁公告 二"
                          className="w-full h-auto rounded-xl object-contain max-h-[480px]"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-[#800A1D]/50 flex items-center justify-between w-full">
                      <p className="text-sm text-white/50 font-mono">
                        敬請各位顧客與居民多加留意，造成不便非常抱歉。
                      </p>
                      <div className="w-3 h-3 bg-[#FF6B81] rounded-full animate-pulse shadow-[0_0_10px_#FF6B81]" />
                    </div>
                  </div>

                  {/* News Card 2: 涼海璃請假通知 */}
                  <div className="w-full bg-black/30 backdrop-blur-md rounded-2xl py-12 px-10 md:py-14 md:px-12 border-[0.5px] border-white/10 relative overflow-hidden flex flex-col items-start justify-center text-left hover:border-[#D1B3FF]/30 transition-all duration-300">
                    <div className="absolute top-0 left-0 w-3 h-3 border-t-[0.5px] border-l-[0.5px] border-[#D1B3FF]" />
                    <div className="absolute top-0 right-0 w-3 h-3 border-t-[0.5px] border-r-[0.5px] border-[#D1B3FF]" />
                    <div className="absolute bottom-0 left-0 w-3 h-3 border-b-[0.5px] border-l-[0.5px] border-[#D1B3FF]" />
                    <div className="absolute bottom-0 right-0 w-3 h-3 border-b-[0.5px] border-r-[0.5px] border-[#D1B3FF]" />
                    
                    <div className="flex flex-wrap items-center justify-between w-full gap-4 mb-6 pb-4 border-b border-white/5">
                      <div className="flex items-center gap-3">
                        <span className="inline-block px-2.5 py-1 text-xs font-bold bg-[#D1B3FF]/10 text-[#D1B3FF] border border-[#D1B3FF]/30 rounded font-pixel uppercase tracking-widest">
                          請假通知
                        </span>
                        <span className="text-sm font-mono text-white/40">2026.07.15</span>
                      </div>
                      <span className="text-xs font-mono text-white/20 select-none">NOTICE ID: #004</span>
                    </div>

                    <h3 className="text-2xl md:text-3xl font-black text-white mb-4 tracking-wider hover:text-[#D1B3FF] transition-colors">
                      【重要通知】7月16日 涼海璃請假通知 🌸
                    </h3>
                    
                    <p className="text-lg md:text-xl text-white/80 leading-relaxed font-mono font-medium">
                      親愛的各位玩家與顧客：
                      <br />
                      團長 <span className="text-[#D1B3FF] font-bold">涼海璃</span> 將於 <span className="text-amber-400 font-bold">7月16日</span> 請假一天。
                      <span className="text-base md:text-lg text-white/60 block mt-2">
                        當天相關業務與接待服務將稍作調整，感謝大家的理解與體諒！
                      </span>
                    </p>

                    <div className="mt-8 flex items-center justify-between w-full">
                      <p className="text-sm text-white/40 font-mono">
                        祝大家有美好的一天，期待隔日與大家再次相見！
                      </p>
                      <div className="w-2 h-2 bg-[#D1B3FF] rounded-full animate-pulse" />
                    </div>
                  </div>
                </div>

                {/* Show More Posts Button */}
                <div className="mt-10 flex justify-center w-full">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setShowAllNewsSubpage(true)}
                    className="px-8 py-4 bg-black/50 hover:bg-black/80 border border-white/20 hover:border-white/50 text-white font-mono font-bold text-base md:text-lg rounded-2xl flex items-center gap-3 shadow-[0_0_25px_rgba(255,255,255,0.08)] cursor-pointer transition-all duration-300"
                  >
                    <span>顯示其他貼文</span>
                    <span className="text-white/40 text-xs font-pixel tracking-widest uppercase">SHOW MORE POSTS</span>
                  </motion.button>
                </div>
              </motion.div>
            </div>
          )}

          {/* Fullscreen Modal: 所有其他貼文 (Subpage) */}
          <AnimatePresence>
            {showAllNewsSubpage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.25 }}
                className="fixed inset-0 z-50 bg-[#000814]/98 backdrop-blur-2xl overflow-y-auto p-6 md:p-16 flex flex-col items-center justify-start"
                style={{
                  backgroundImage: `
                    linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)
                  `,
                  backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
                }}
              >
                {/* Top Header Bar */}
                <div className="w-full max-w-5xl flex items-center justify-between mb-12 pb-6 border-b border-white/10">
                  <button
                    onClick={() => setShowAllNewsSubpage(false)}
                    className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/15 text-white hover:text-amber-400 font-mono font-bold text-base transition-all duration-200 cursor-pointer shadow-lg"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    <span>返回主頁 BACK TO MAIN</span>
                  </button>
                  <div className="text-xs text-white/40 font-mono tracking-widest uppercase">
                    NEWS ARCHIVE / 所有貼文區
                  </div>
                </div>

                {/* Header Title */}
                <div className="flex flex-col items-center mb-12 text-center">
                  <h2 className="text-4xl md:text-5xl font-black text-white tracking-[0.2em] italic drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                    所有歷史貼文
                  </h2>
                  <div className="mt-3 flex items-center justify-center gap-4 w-full max-w-md">
                    <span className="text-white/20 font-pixel text-xs flex-1 text-right">━━━━━━</span>
                    <span className="text-xs text-white/40 font-pixel tracking-[0.5em] uppercase whitespace-nowrap">All Official Announcements</span>
                    <span className="text-white/20 font-pixel text-xs flex-1 text-left">━━━━━━</span>
                  </div>
                </div>

                {/* All Posts Container including earliest 試營運通知 */}
                <div className="flex flex-col gap-8 w-full max-w-4xl pb-16">
                  {/* News Card: 8月10日 涼海璃請假與居酒屋暫停營業通知 */}
                  <div className="w-full bg-black/30 backdrop-blur-md rounded-2xl py-12 px-10 md:py-14 md:px-12 border-[0.5px] border-white/10 relative overflow-hidden flex flex-col items-start justify-center text-left hover:border-[#D1B3FF]/30 transition-all duration-300">
                    <div className="absolute top-0 left-0 w-3 h-3 border-t-[0.5px] border-l-[0.5px] border-[#D1B3FF]" />
                    <div className="absolute top-0 right-0 w-3 h-3 border-t-[0.5px] border-r-[0.5px] border-[#D1B3FF]" />
                    <div className="absolute bottom-0 left-0 w-3 h-3 border-b-[0.5px] border-l-[0.5px] border-[#D1B3FF]" />
                    <div className="absolute bottom-0 right-0 w-3 h-3 border-b-[0.5px] border-r-[0.5px] border-[#D1B3FF]" />
                    
                    <div className="flex flex-wrap items-center justify-between w-full gap-4 mb-6 pb-4 border-b border-white/5">
                      <div className="flex items-center gap-3">
                        <span className="inline-block px-2.5 py-1 text-xs font-bold bg-[#D1B3FF]/10 text-[#D1B3FF] border border-[#D1B3FF]/30 rounded font-pixel uppercase tracking-widest">
                          請假與公休
                        </span>
                        <span className="text-sm font-mono text-white/40">2026.08.10</span>
                      </div>
                      <span className="text-xs font-mono text-white/20 select-none">NOTICE ID: #006</span>
                    </div>

                    <h3 className="text-2xl md:text-3xl font-black text-white mb-4 tracking-wider hover:text-[#D1B3FF] transition-colors">
                      【重要通知】8月10日 涼海璃請假與居酒屋暫停營業通知 🌸
                    </h3>
                    
                    <p className="text-lg md:text-xl text-white/80 leading-relaxed font-mono font-medium">
                      親愛的各位玩家與顧客：
                      <br />
                      團長 <span className="text-[#D1B3FF] font-bold">涼海璃</span> 於今日（<span className="text-amber-400 font-bold">8月10日</span>）請假一天，
                      <br />
                      酸欠像素偶像居酒屋同步 <span className="text-amber-400 font-bold">暫停營業一天</span>。
                      <span className="text-base md:text-lg text-white/60 block mt-2">
                        造成不便敬請見諒，感謝大家的理解與體諒！
                      </span>
                    </p>

                    <div className="mt-8 flex items-center justify-between w-full">
                      <p className="text-sm text-white/40 font-mono">
                        祝大家有美好的一天，期待明日與大家再次相見！
                      </p>
                      <div className="w-2 h-2 bg-[#D1B3FF] rounded-full animate-pulse" />
                    </div>
                  </div>

                  {/* News Card: 出禁公告 (Pinned / Deep Wine Red) */}
                  <div className="w-full bg-[#24060B]/85 backdrop-blur-md rounded-2xl py-12 px-10 md:py-14 md:px-12 border-[0.5px] border-[#800A1D] relative overflow-hidden flex flex-col items-start justify-center text-left hover:border-[#FF4D6D] transition-all duration-300 shadow-[0_0_35px_rgba(128,10,29,0.3)]">
                    <div className="absolute top-0 left-0 w-3 h-3 border-t-[0.5px] border-l-[0.5px] border-[#FF4D6D]" />
                    <div className="absolute top-0 right-0 w-3 h-3 border-t-[0.5px] border-r-[0.5px] border-[#FF4D6D]" />
                    <div className="absolute bottom-0 left-0 w-3 h-3 border-b-[0.5px] border-l-[0.5px] border-[#FF4D6D]" />
                    <div className="absolute bottom-0 right-0 w-3 h-3 border-b-[0.5px] border-r-[0.5px] border-[#FF4D6D]" />
                    
                    <div className="flex flex-wrap items-center justify-between w-full gap-4 mb-6 pb-4 border-b border-[#800A1D]/50">
                      <div className="flex items-center gap-3">
                        <span className="inline-block px-2.5 py-1 text-xs font-bold bg-[#800A1D]/50 text-[#FF6B81] border border-[#FF6B81]/40 rounded font-pixel uppercase tracking-widest">
                          出禁公告
                        </span>
                        <span className="inline-block px-2.5 py-1 text-xs font-bold bg-[#A31D33]/30 text-red-200 border border-[#A31D33]/50 rounded font-pixel uppercase tracking-widest">
                          📌 PINNED / 釘選
                        </span>
                        <span className="text-sm font-mono text-white/50">2026.07.24</span>
                      </div>
                      <span className="text-xs font-mono text-[#FF6B81]/70 select-none">NOTICE ID: #005</span>
                    </div>

                    <h3 className="text-2xl md:text-3xl font-black text-white mb-4 tracking-wider hover:text-[#FF6B81] transition-colors">
                      【出禁】近期因怪阿伯出沒 於是本店將暫不開放前台區域 🚫
                    </h3>
                    
                    <p className="text-lg md:text-xl text-white/90 leading-relaxed font-mono font-medium">
                      因本店出現怪阿伯於非營業時間且未經店長本人允許時，
                      <br />
                      在前方櫃台區域進行 <span className="text-red-400 font-bold underline decoration-red-500/50">無故侵入之非法行為</span>，
                      <br />
                      故 <span className="text-amber-400 font-bold">暫不開放前台區給顧客做相關使用</span> 非常抱歉。
                    </p>

                    {/* Attached Official Banned Poster Image */}
                    <div className="my-6 w-full flex flex-col items-center md:items-start">
                      <div className="relative overflow-hidden rounded-2xl border-2 border-[#800A1D] bg-black/70 p-3 max-w-md w-full shadow-[0_0_30px_rgba(234,179,8,0.2)]">
                        <img
                          src="https://lh3.googleusercontent.com/d/1I5Y6bWvuyfmAn5mispwM-oBZFbz2d6nR"
                          alt="酸欠像素偶像居酒屋官方出禁公告 二"
                          className="w-full h-auto rounded-xl object-contain max-h-[480px]"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </div>

                    <div className="mt-8 flex items-center justify-between w-full">
                      <p className="text-sm text-white/50 font-mono">
                        敬請各位顧客與居民多加留意，造成不便非常抱歉。
                      </p>
                      <div className="w-2.5 h-2.5 bg-[#FF6B81] rounded-full animate-pulse" />
                    </div>
                  </div>

                  {/* News Card: 涼海璃請假通知 */}
                  <div className="w-full bg-black/30 backdrop-blur-md rounded-2xl py-12 px-10 md:py-14 md:px-12 border-[0.5px] border-white/10 relative overflow-hidden flex flex-col items-start justify-center text-left hover:border-[#D1B3FF]/30 transition-all duration-300">
                    <div className="absolute top-0 left-0 w-3 h-3 border-t-[0.5px] border-l-[0.5px] border-[#D1B3FF]" />
                    <div className="absolute top-0 right-0 w-3 h-3 border-t-[0.5px] border-r-[0.5px] border-[#D1B3FF]" />
                    <div className="absolute bottom-0 left-0 w-3 h-3 border-b-[0.5px] border-l-[0.5px] border-[#D1B3FF]" />
                    <div className="absolute bottom-0 right-0 w-3 h-3 border-b-[0.5px] border-r-[0.5px] border-[#D1B3FF]" />
                    
                    <div className="flex flex-wrap items-center justify-between w-full gap-4 mb-6 pb-4 border-b border-white/5">
                      <div className="flex items-center gap-3">
                        <span className="inline-block px-2.5 py-1 text-xs font-bold bg-[#D1B3FF]/10 text-[#D1B3FF] border border-[#D1B3FF]/30 rounded font-pixel uppercase tracking-widest">
                          請假通知
                        </span>
                        <span className="text-sm font-mono text-white/40">2026.07.15</span>
                      </div>
                      <span className="text-xs font-mono text-white/20 select-none">NOTICE ID: #004</span>
                    </div>

                    <h3 className="text-2xl md:text-3xl font-black text-white mb-4 tracking-wider hover:text-[#D1B3FF] transition-colors">
                      【重要通知】7月16日 涼海璃請假通知 🌸
                    </h3>
                    
                    <p className="text-lg md:text-xl text-white/80 leading-relaxed font-mono font-medium">
                      親愛的各位玩家與顧客：
                      <br />
                      團長 <span className="text-[#D1B3FF] font-bold">涼海璃</span> 將於 <span className="text-amber-400 font-bold">7月16日</span> 請假一天。
                      <span className="text-base md:text-lg text-white/60 block mt-2">
                        當天相關業務與接待服務將稍作調整，感謝大家的理解與體諒！
                      </span>
                    </p>

                    <div className="mt-8 flex items-center justify-between w-full">
                      <p className="text-sm text-white/40 font-mono">
                        祝大家有美好的一天，期待隔日與大家再次相見！
                      </p>
                      <div className="w-2 h-2 bg-[#D1B3FF] rounded-full animate-pulse" />
                    </div>
                  </div>

                  {/* News Card: 暫停營業通知 */}
                  <div className="w-full bg-black/30 backdrop-blur-md rounded-2xl py-12 px-10 md:py-14 md:px-12 border-[0.5px] border-white/10 relative overflow-hidden flex flex-col items-start justify-center text-left hover:border-[#FFB347]/30 transition-all duration-300">
                    <div className="absolute top-0 left-0 w-3 h-3 border-t-[0.5px] border-l-[0.5px] border-[#FFB347]" />
                    <div className="absolute top-0 right-0 w-3 h-3 border-t-[0.5px] border-r-[0.5px] border-[#FFB347]" />
                    <div className="absolute bottom-0 left-0 w-3 h-3 border-b-[0.5px] border-l-[0.5px] border-[#FFB347]" />
                    <div className="absolute bottom-0 right-0 w-3 h-3 border-b-[0.5px] border-r-[0.5px] border-[#FFB347]" />
                    
                    <div className="flex flex-wrap items-center justify-between w-full gap-4 mb-6 pb-4 border-b border-white/5">
                      <div className="flex items-center gap-3">
                        <span className="inline-block px-2.5 py-1 text-xs font-bold bg-[#FFB347]/10 text-[#FFB347] border border-[#FFB347]/30 rounded font-pixel uppercase tracking-widest">
                          系統維護
                        </span>
                        <span className="text-sm font-mono text-white/40">2026.07.15</span>
                      </div>
                      <span className="text-xs font-mono text-white/20 select-none">NOTICE ID: #003</span>
                    </div>

                    <h3 className="text-2xl md:text-3xl font-black text-white mb-4 tracking-wider hover:text-[#FFB347] transition-colors">
                      【公告】酸欠像素偶像居酒屋內部網站整改 暫停營業一天 🛠️
                    </h3>
                    
                    <p className="text-lg md:text-xl text-white/80 leading-relaxed font-mono font-medium">
                      為提供更優質、流暢的數位互動體驗，
                      <br />
                      酸欠像素偶像居酒屋將進行 <span className="text-red-400 font-bold">內部網站系統整改</span>，期間將 <span className="text-[#FFB347] font-bold">暫停營業一天</span>。
                      <span className="text-base md:text-lg text-white/60 block mt-2">
                        整改完成後我們將帶給大家更精緻的像素互動體驗，敬請期待！
                      </span>
                    </p>

                    <div className="mt-8 flex items-center justify-between w-full">
                      <p className="text-sm text-white/40 font-mono">
                        造成不便敬請見諒，感謝全體像素居民對我們的愛護與支持。
                      </p>
                      <div className="w-2 h-2 bg-[#FFB347] rounded-full animate-pulse" />
                    </div>
                  </div>

                  {/* News Card: 時間最早的試營運通知 */}
                  <div className="w-full bg-black/30 backdrop-blur-md rounded-2xl py-12 px-10 md:py-14 md:px-12 border-[0.5px] border-white/10 relative overflow-hidden flex flex-col items-start justify-center text-left hover:border-[#FFA4B4]/30 transition-all duration-300">
                    <div className="absolute top-0 left-0 w-3 h-3 border-t-[0.5px] border-l-[0.5px] border-[#FFA4B4]" />
                    <div className="absolute top-0 right-0 w-3 h-3 border-t-[0.5px] border-r-[0.5px] border-[#FFA4B4]" />
                    <div className="absolute bottom-0 left-0 w-3 h-3 border-b-[0.5px] border-l-[0.5px] border-[#FFA4B4]" />
                    <div className="absolute bottom-0 right-0 w-3 h-3 border-b-[0.5px] border-r-[0.5px] border-[#FFA4B4]" />
                    
                    <div className="flex flex-wrap items-center justify-between w-full gap-4 mb-6 pb-4 border-b border-white/5">
                      <div className="flex items-center gap-3">
                        <span className="inline-block px-2.5 py-1 text-xs font-bold bg-[#FFA4B4]/10 text-[#FFA4B4] border border-[#FFA4B4]/30 rounded font-pixel uppercase tracking-widest">
                          試營運通知
                        </span>
                        <span className="text-sm font-mono text-white/40">2026.06.25</span>
                      </div>
                      <span className="text-xs font-mono text-white/20 select-none">NOTICE ID: #002</span>
                    </div>

                    <h3 className="text-2xl md:text-3xl font-black text-white mb-4 tracking-wider hover:text-[#FFA4B4] transition-colors">
                      【試營運通知】紡塊像素官方小基地開張囉 🏮
                    </h3>
                    
                    <p className="text-lg md:text-xl text-white/80 leading-relaxed font-mono font-medium">
                      紡塊像素官方小基地<span className="text-[#87CEEB] font-bold">「酸欠像素偶像居酒屋」</span>
                      <br />
                      將於 <span className="text-[#FFA4B4] font-bold">7/14 日</span> 正式開始試營運！
                      <span className="text-base md:text-lg text-white/60 block mt-2">
                        試營運當日將有神秘活動 還有陀螺比賽可以參加喔~
                      </span>
                    </p>

                    <div className="mt-8 flex items-center justify-between w-full">
                      <p className="text-sm text-white/40 font-mono">
                        誠摯邀請各位前來，一同見證這片全新拼貼的像素世界。
                      </p>
                      <div className="w-2 h-2 bg-[#FFA4B4] rounded-full animate-pulse" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* SECTION 3: 活動行事曆 */}
          {!activeSubPage && (
            <div className="min-h-screen w-full bg-[#00142C] relative flex flex-col items-center pt-32 pb-32 px-20 border-t border-white/5">
              <div className="absolute inset-0 opacity-15 pointer-events-none"
                   style={{
                     backgroundImage: `
                       linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
                       linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)
                     `,
                     backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
                   }}
              />
              
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="relative z-10 flex flex-col items-center text-center w-full max-w-6xl"
              >
                <div className="flex flex-col items-center mb-16">
                  <h2 className="text-[80px] font-black text-white tracking-[0.2em] italic drop-shadow-[0_0_30px_rgba(255,255,255,0.3)]">
                    活動行事曆
                  </h2>
                  <div className="mt-4 flex items-center justify-center gap-6 w-full max-w-md">
                    <span className="text-white/20 font-pixel text-xs flex-1 text-right">━━━━━━</span>
                    <span className="text-xs text-white/40 font-pixel tracking-[0.5em] uppercase whitespace-nowrap">Activity Calendar</span>
                    <span className="text-white/20 font-pixel text-xs flex-1 text-left">━━━━━━</span>
                  </div>
                </div>

                {/* Event Calendar A (Full Display) */}
                <div className="w-full max-w-4xl mt-4">
                  <React.Suspense fallback={
                    <div className="flex flex-col items-center justify-center p-12 bg-white/5 border border-white/10 rounded-2xl animate-pulse font-mono text-xs text-white/50 tracking-widest">
                      <div className="w-8 h-8 border-2 border-[#87CEEB] border-t-transparent rounded-full animate-spin mb-4" />
                      LOADING CALENDAR MODULE // 載入行事曆模組
                    </div>
                  }>
                    <EventCalendar mode="all" />
                  </React.Suspense>
                </div>
              </motion.div>
            </div>
          )}

          {/* SECTION 4: 黑紅特區 (COMPACT BUTTON SECTION - ONLY VISIBLE AT 00:00~00:59) */}
          {!activeSubPage && isWitchHour && (
            <div className="w-full bg-[#050001] relative flex flex-col items-center justify-center py-12 px-6 border-t border-red-950/40">
              <div 
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{
                  backgroundImage: `
                    linear-gradient(to right, rgba(239, 68, 68, 0.1) 1px, transparent 1px),
                    linear-gradient(to bottom, rgba(239, 68, 68, 0.1) 1px, transparent 1px)
                  `,
                  backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
                }}
              />

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="relative z-10 flex flex-col items-center justify-center"
              >
                {/* Standalone Black & Red Button */}
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: '0 0 35px rgba(239, 68, 68, 0.8)' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowDarkRedSubPage(true)}
                  className="px-8 py-4 bg-black border-2 border-red-600 rounded-2xl text-red-500 font-black text-base md:text-lg tracking-[0.2em] shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all duration-300 flex items-center justify-center cursor-pointer relative group overflow-hidden"
                >
                  <div className="absolute inset-0 bg-red-600/10 group-hover:bg-red-600/20 transition-all duration-300" />
                  <span className="relative z-10 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)] font-mono tracking-[0.2em]">
                    ?????
                  </span>
                </motion.button>
              </motion.div>
            </div>
          )}

          {/* Fixed Tutorial Box - Only visible on main hub */}
          <AnimatePresence>
            {!activeSubPage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9, x: 20, y: 20 }}
                animate={{ 
                  opacity: 1,
                  scale: 1,
                  x: 0,
                  y: 0,
                  width: isTutorialMinimized ? 48 : 600,
                  height: isTutorialMinimized ? 48 : 'auto',
                  borderRadius: isTutorialMinimized ? '12px' : '16px'
                }}
                exit={{ opacity: 0, scale: 0.9, x: 20, y: 20 }}
                onDoubleClick={() => setIsTutorialMinimized(!isTutorialMinimized)}
                className={`fixed bottom-24 right-10 z-[60] bg-[#001B3D]/90 border-2 border-[#50727B] backdrop-blur-xl shadow-[0_0_30px_rgba(0,0,0,0.5),inset_0_0_10px_rgba(80,114,123,0.2)] group flex flex-col overflow-hidden transition-all duration-300 origin-bottom-right ${isTutorialMinimized ? 'p-0 items-center justify-center cursor-pointer' : 'p-6 cursor-default'}`}
              >
                {isTutorialMinimized ? (
                  <div className="text-[#50727B] font-black text-xl select-none">i</div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-4 border-b border-[#50727B]/30 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-[#50727B] animate-pulse rounded-full" />
                        <h3 className="text-[#50727B] font-pixel text-xs tracking-[0.2em] uppercase">System Tutorial // 指南</h3>
                      </div>
                      <div className="flex gap-1">
                        <div className="w-1 h-1 bg-[#50727B]/40 rounded-full" />
                        <div className="w-1 h-1 bg-[#50727B]/40 rounded-full" />
                      </div>
                    </div>
                    
                    <ul className="space-y-4 text-base text-white/90 font-mono leading-relaxed">
                      <li className="flex gap-3 group/item whitespace-nowrap">
                        <span className="text-[#50727B] font-black opacity-50 group-hover/item:opacity-100 transition-opacity">01</span>
                        <span className="border-l border-white/10 pl-3 text-base">將左側麻繩向下拖拽以展開 UI 選單</span>
                      </li>
                      <li className="flex gap-3 group/item whitespace-nowrap">
                        <span className="text-[#50727B] font-black opacity-50 group-hover/item:opacity-100 transition-opacity">02</span>
                        <span className="border-l border-white/10 pl-3 text-base">點擊頂部像素心圖示可切換不同頁面</span>
                      </li>
                      <li className="flex gap-3 group/item whitespace-nowrap">
                        <span className="text-[#50727B] font-black opacity-50 group-hover/item:opacity-100 transition-opacity">03</span>
                        <span className="border-l border-white/10 pl-3 text-base">點擊左上角空白區塊可隨時回到主頁</span>
                      </li>
                      <li className="flex gap-3 group/item whitespace-nowrap">
                        <span className="text-[#50727B] font-black opacity-50 group-hover/item:opacity-100 transition-opacity">04</span>
                        <span className="border-l border-white/10 pl-3 text-base">UI 鎖定後再次拉動麻繩會斷裂，除此之外啥也不會發生</span>
                      </li>
                    </ul>
                    
                    <div className="mt-5 flex justify-between items-center">
                      <div className="text-[10px] text-[#50727B]/40 uppercase tracking-[0.3em] font-pixel">Double Click to Minimize</div>
                      <span className="text-[#50727B]/20 font-pixel text-[10px]">━━━━</span>
                    </div>
                    
                    {/* Corner Accents */}
                    <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-[#50727B]/40 rounded-tl-sm" />
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-[#50727B]/40 rounded-br-sm" />
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
        ) : (
          <motion.div
            key="others"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onDoubleClick={handleSkip}
            className={`absolute inset-0 flex items-center justify-center ${['forming', 'formed', 'dissolving'].includes(gameState) ? 'cursor-pointer' : ''}`}
          >
          {/* Grid Background */}
          <div 
            className="absolute inset-0 pointer-events-none opacity-40"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(255,255,255,0.15) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255,255,255,0.15) 1px, transparent 1px)
              `,
              backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
            }}
          />

          {/* Background Falling Blocks */}
          <div className="absolute inset-0 pointer-events-none">
            {blocks.map((block) => (
              <motion.div
                key={block.id}
                initial={false}
                animate={{ 
                  y: block.row * GRID_SIZE + 2,
                  x: block.column * GRID_SIZE + 2,
                }}
                transition={{ 
                  type: "spring",
                  stiffness: 500,
                  damping: 30,
                  mass: 0.5
                }}
                style={{
                  position: 'absolute',
                  width: GRID_SIZE - 4,
                  height: GRID_SIZE - 4,
                  backgroundColor: block.color,
                  boxShadow: `inset 0 0 8px rgba(255,255,255,0.2), 0 0 15px ${block.color}33`,
                  border: '1px solid rgba(255,255,255,0.15)',
                  zIndex: block.color === '#FFFFFF' ? 3 : 1,
                }}
              />
            ))}
          </div>

          {/* Content Layer - Image and Button */}
          <AnimatePresence>
            {gameState === 'idle' && (
              <div className="relative z-10 flex flex-col items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0, y: 0, rotate: -2 }}
                  animate={{ opacity: 1, y: -30, rotate: -5 }}
                  exit={{ opacity: 0, scale: 0.8, y: -100 }}
                  transition={{ duration: 0.8, ease: "easeIn" }}
                  className="max-w-[95vw] md:max-w-5xl drop-shadow-[0_30px_60px_rgba(0,0,0,0.6)] pointer-events-none"
                >
                  <img 
                    src="https://drive.google.com/thumbnail?id=1yqTzowdnAcZTofISD4xSGTz-GigyR_Ma&sz=w1000" 
                    alt="Cube Pixel Console"
                    className="w-full h-auto rounded-lg"
                    referrerPolicy="no-referrer"
                  />
                </motion.div>

                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  whileHover={{ scale: 1.05, backgroundColor: '#0077be', color: '#fff' }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleStart}
                  transition={{ delay: 0.2, duration: 0.5 }}
                  className="px-12 py-4 bg-transparent border-4 border-[#0077be] text-[#0077be] font-bold text-2xl tracking-widest uppercase rounded-none hover:shadow-[0_0_20px_#0077be] transition-all z-20"
                  style={{ fontFamily: 'var(--font-mono)' }}
                >
                  Game Start
                </motion.button>
              </div>
            )}
          </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Fullscreen Toast Notification */}
      <AnimatePresence>
        {fullscreenToast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 15 }}
            className="fixed top-8 left-1/2 -translate-x-1/2 z-[9999] bg-slate-950/95 backdrop-blur-md border-2 border-[#50727B] shadow-[0_0_40px_rgba(80,114,123,0.6),inset_0_0_20px_rgba(80,114,123,0.3)] px-8 py-5 rounded-3xl flex items-center gap-4 text-white pointer-events-auto"
          >
            <div className="w-3 h-3 rounded-full bg-[#FFD1DC] animate-ping shrink-0" />
            <span className="font-pixel text-base tracking-widest leading-relaxed text-center font-black text-transparent bg-clip-text bg-gradient-to-r from-pink-300 via-[#D1B3FF] to-blue-200">
              {fullscreenToast}
            </span>
            <div className="w-3 h-3 rounded-full bg-[#D1B3FF] animate-ping shrink-0" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full screen Dark Red Sub-page Overlay */}
      <AnimatePresence>
        {showDarkRedSubPage && (
          <DarkRedSubPage onClose={() => setShowDarkRedSubPage(false)} />
        )}
      </AnimatePresence>

      {/* Persistent Gray Mask Overlay */}
      <div className="absolute inset-0 bg-gray-900/60 pointer-events-none z-[5]" />

      {/* Footer Credit */}
      <div className="absolute bottom-0 left-0 right-0 bg-[#020813]/60 border-t border-white/5 py-4 flex justify-center z-[10] pointer-events-none backdrop-blur-xs">
        <span className="text-white/45 text-[12px] sm:text-[13px] font-mono tracking-[0.18em] uppercase px-4 text-center">
          {(() => {
            const hour = new Date().getHours();
            const isLateNight = hour >= 1 && hour < 9;
            return isLateNight 
              ? "紡塊像素CubePixel_2026 感謝團長涼海璃 大半夜不睡覺還在更新官網 《QPKS-VER4.0.0》"
              : "紡塊像素CubePixel_2026 感謝團長涼海璃製作 《QPKS-VER4.0.0》";
          })()}
        </span>
      </div>
    </div>
  );
}
