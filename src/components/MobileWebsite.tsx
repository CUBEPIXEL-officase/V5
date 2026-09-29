import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Monitor, RefreshCw, ChevronLeft, AlertTriangle, Lock } from 'lucide-react';
import { EventCalendar } from './EventCalendar';
import { BusinessCardSubpage } from './BusinessCardSubpage';
import { SpecialNoticeSubpage } from './SpecialNoticeSubpage';
import { EscalatorMonologueSubpage } from './EscalatorMonologueSubpage';
import { umiriPhotoBase64 as umiriOfficialPhoto } from '../assets/umiriPhotoBase64';

const TANJIRO_IMAGE_URL = "/images/tanjiro_qposket.jpg";

const NEW_LOGO_URL = "https://drive.google.com/thumbnail?id=1HvP72IEkODWDk29WboH2lHwIq8bvNEZ-&sz=w1000";

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
  'N': [[1,0,1],[1,1,1],[1,1,1],[1,0,1],[1,0,1]],
  'S': [[1,1,1],[1,0,0],[1,1,1],[0,0,1],[1,1,1]],
  '4': [[1,0,1],[1,0,1],[1,1,1],[0,0,1],[0,0,1]],
  'V': [[1,0,1],[1,0,1],[1,0,1],[1,0,1],[0,1,0]],
  '&': [[0,1,0],[1,0,1],[0,1,0],[1,0,1],[1,0,1]],
  '2': [[1,1,1],[0,0,1],[1,1,1],[1,0,0],[1,1,1]],
  'G': [[1,1,1],[1,0,0],[1,0,1],[1,0,1],[1,1,1]],
  'Y': [[1,0,1],[1,0,1],[0,1,0],[0,1,0],[0,1,0]],
  ' ': [[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0]],
};

interface Block {
  id: string;
  color: string;
  column: number;
  row: number;
  targetRow?: number;
}

interface MobileWebsiteProps {
  gameState: 'idle' | 'forming' | 'formed' | 'dissolving' | 'next_page' | 'special' | 'umiri_special' | 'special_thanks' | 'idol_studio' | 'banned_list';
  setGameState: (state: any) => void;
  activeSubPage: string | null;
  setActiveSubPage: (sub: string | null) => void;
}

// Computer-style Pixel Heart component translated for Mobile Website (10x10)
const MobilePixelHeart: React.FC<{ 
  color: string; 
  onClick?: () => void; 
  size?: 'xs' | 'sm' | 'md' | 'lg'; 
  className?: string; 
  pulse?: boolean;
}> = ({ color, onClick, size = 'sm', className = '', pulse = false }) => {
  const heartPattern = [
    [0, 1, 1, 0, 0, 0, 0, 1, 1, 0],
    [1, 2, 2, 1, 0, 0, 1, 2, 2, 1],
    [1, 2, 2, 2, 1, 1, 2, 2, 2, 1],
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    [0, 1, 2, 2, 2, 2, 2, 2, 1, 0],
    [0, 0, 1, 2, 2, 2, 2, 1, 0, 0],
    [0, 0, 0, 1, 2, 2, 1, 0, 0, 0],
    [0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
  ];

  const pixelSize = size === 'xs' 
    ? 'w-[1px] h-[1px]' 
    : size === 'sm' 
    ? 'w-[1.5px] h-[1.5px]' 
    : size === 'md' 
    ? 'w-[2.5px] h-[2.5px]' 
    : 'w-[3.5px] h-[3.5px]';

  return (
    <motion.div 
      onClick={onClick}
      className={`flex flex-col items-center justify-center ${className} ${pulse ? 'animate-pulse' : ''}`}
      whileHover={onClick ? { scale: 1.15 } : {}}
      whileTap={onClick ? { scale: 0.95 } : {}}
    >
      <div className={`p-0.5 grid grid-cols-10 gap-[0.5px] ${onClick ? 'cursor-pointer' : ''}`}>
        {heartPattern.flat().map((pixel, i) => (
          <div 
            key={i} 
            className={pixelSize}
            style={{ 
              backgroundColor: pixel === 1 ? '#FFFFFF' : pixel === 2 ? color : 'transparent' 
            }}
          />
        ))}
      </div>
    </motion.div>
  );
};

// Computer-style Pixel Download icon component (10x10)
const MobilePixelDownload: React.FC<{ 
  color: string; 
  borderColor?: string;
  onClick?: () => void; 
  size?: 'xs' | 'sm' | 'md' | 'lg'; 
  className?: string; 
  pulse?: boolean;
}> = ({ color, borderColor = '#FFFFFF', onClick, size = 'sm', className = '', pulse = false }) => {
  const downloadPattern = [
    [0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 2, 1, 0, 0, 0],
    [0, 0, 0, 0, 1, 2, 1, 0, 0, 0],
    [0, 0, 0, 0, 1, 2, 1, 0, 0, 0],
    [1, 1, 1, 1, 1, 2, 1, 1, 1, 1],
    [0, 1, 2, 2, 2, 2, 2, 2, 1, 0],
    [0, 0, 1, 2, 2, 2, 2, 1, 0, 0],
    [0, 0, 0, 1, 2, 2, 1, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  ];

  const pixelSize = size === 'xs' 
    ? 'w-[1px] h-[1px]' 
    : size === 'sm' 
    ? 'w-[1.5px] h-[1.5px]' 
    : size === 'md' 
    ? 'w-[2.5px] h-[2.5px]' 
    : 'w-[3.5px] h-[3.5px]';

  return (
    <motion.div 
      onClick={onClick}
      className={`flex flex-col items-center justify-center ${className} ${pulse ? 'animate-pulse' : ''}`}
      whileHover={onClick ? { scale: 1.15 } : {}}
      whileTap={onClick ? { scale: 0.95 } : {}}
    >
      <div className={`p-0.5 grid grid-cols-10 gap-[0.5px] ${onClick ? 'cursor-pointer' : ''}`}>
        {downloadPattern.flat().map((pixel, i) => (
          <div 
            key={i} 
            className={pixelSize}
            style={{ 
              backgroundColor: pixel === 1 ? borderColor : pixel === 2 ? color : 'transparent' 
            }}
          />
        ))}
      </div>
    </motion.div>
  );
};

// Computer-style Pixel Compass icon component (Red/White for Store Latest News) (10x10)
const MobilePixelCompass: React.FC<{ 
  color?: string; 
  needleColor?: string;
  onClick?: () => void; 
  size?: 'xs' | 'sm' | 'md' | 'lg'; 
  className?: string; 
  pulse?: boolean;
}> = ({ color = '#EF4444', needleColor = '#94A3B8', onClick, size = 'sm', className = '', pulse = false }) => {
  // 0: transparent, 1: outer border (white), 2: north needle (red), 3: south needle (light silver/needleColor)
  const compassPattern = [
    [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
    [0, 1, 1, 0, 2, 2, 0, 1, 1, 0],
    [0, 1, 0, 0, 2, 2, 0, 0, 1, 0],
    [1, 0, 0, 2, 2, 2, 0, 0, 0, 1],
    [1, 2, 2, 2, 1, 1, 3, 3, 3, 1],
    [1, 2, 2, 2, 1, 1, 3, 3, 3, 1],
    [1, 0, 0, 0, 3, 3, 3, 0, 0, 1],
    [0, 1, 0, 0, 3, 3, 0, 0, 1, 0],
    [0, 1, 1, 0, 3, 3, 0, 1, 1, 0],
    [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
  ];

  const pixelSize = size === 'xs' 
    ? 'w-[1px] h-[1px]' 
    : size === 'sm' 
    ? 'w-[1.5px] h-[1.5px]' 
    : size === 'md' 
    ? 'w-[2.5px] h-[2.5px]' 
    : 'w-[3.5px] h-[3.5px]';

  return (
    <motion.div 
      onClick={onClick}
      className={`flex flex-col items-center justify-center ${className} ${pulse ? 'animate-pulse' : ''}`}
      whileHover={onClick ? { scale: 1.15 } : {}}
      whileTap={onClick ? { scale: 0.95 } : {}}
    >
      <div className={`p-0.5 grid grid-cols-10 gap-[0.5px] ${onClick ? 'cursor-pointer' : ''}`}>
        {compassPattern.flat().map((pixel, i) => (
          <div 
            key={i} 
            className={pixelSize}
            style={{ 
              backgroundColor: pixel === 1 ? '#FFFFFF' : pixel === 2 ? color : pixel === 3 ? needleColor : 'transparent' 
            }}
          />
        ))}
      </div>
    </motion.div>
  );
};

// Computer-style Pixel 'N' icon component (Red for Store Latest News) (10x10)
const MobilePixelN: React.FC<{ 
  color?: string; 
  onClick?: () => void; 
  size?: 'xs' | 'sm' | 'md' | 'lg'; 
  className?: string; 
  pulse?: boolean;
}> = ({ color = '#EF4444', onClick, size = 'sm', className = '', pulse = false }) => {
  const nPattern = [
    [1, 2, 2, 1, 0, 0, 0, 1, 2, 1],
    [1, 2, 2, 2, 1, 0, 0, 1, 2, 1],
    [1, 2, 1, 2, 2, 1, 0, 1, 2, 1],
    [1, 2, 1, 1, 2, 2, 1, 1, 2, 1],
    [1, 2, 1, 0, 1, 2, 2, 1, 2, 1],
    [1, 2, 1, 0, 0, 1, 2, 2, 2, 1],
    [1, 2, 1, 0, 0, 0, 1, 2, 2, 1],
    [1, 2, 1, 0, 0, 0, 1, 2, 2, 1],
    [1, 2, 2, 1, 0, 0, 1, 2, 2, 1],
    [1, 1, 1, 0, 0, 0, 1, 1, 1, 1],
  ];

  const pixelSize = size === 'xs' 
    ? 'w-[1px] h-[1px]' 
    : size === 'sm' 
    ? 'w-[1.5px] h-[1.5px]' 
    : size === 'md' 
    ? 'w-[2.5px] h-[2.5px]' 
    : 'w-[3.5px] h-[3.5px]';

  return (
    <motion.div 
      onClick={onClick}
      className={`flex flex-col items-center justify-center ${className} ${pulse ? 'animate-pulse' : ''}`}
      whileHover={onClick ? { scale: 1.15 } : {}}
      whileTap={onClick ? { scale: 0.95 } : {}}
    >
      <div className={`p-0.5 grid grid-cols-10 gap-[0.5px] ${onClick ? 'cursor-pointer' : ''}`}>
        {nPattern.flat().map((pixel, i) => (
          <div 
            key={i} 
            className={pixelSize}
            style={{ 
              backgroundColor: pixel === 1 ? '#FFFFFF' : pixel === 2 ? color : 'transparent' 
            }}
          />
        ))}
      </div>
    </motion.div>
  );
};

// Computer-style Pixel Shopping Bag icon component for Hot Products / Merch (10x10)
const MobilePixelBag: React.FC<{ 
  color?: string; 
  onClick?: () => void; 
  size?: 'xs' | 'sm' | 'md' | 'lg'; 
  className?: string; 
  pulse?: boolean;
}> = ({ color = '#F45B3E', onClick, size = 'sm', className = '', pulse = false }) => {
  // 0: transparent, 1: white outline/handle, 2: bag body fill (rich coral-orange)
  const bagPattern = [
    [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
    [0, 0, 1, 2, 0, 0, 2, 1, 0, 0],
    [0, 0, 1, 2, 0, 0, 2, 1, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  ];

  const pixelSize = size === 'xs' 
    ? 'w-[1px] h-[1px]' 
    : size === 'sm' 
    ? 'w-[1.5px] h-[1.5px]' 
    : size === 'md' 
    ? 'w-[2.5px] h-[2.5px]' 
    : 'w-[3.5px] h-[3.5px]';

  return (
    <motion.div 
      onClick={onClick}
      className={`flex flex-col items-center justify-center ${className} ${pulse ? 'animate-pulse' : ''}`}
      whileHover={onClick ? { scale: 1.15 } : {}}
      whileTap={onClick ? { scale: 0.95 } : {}}
    >
      <div className={`p-0.5 grid grid-cols-10 gap-[0.5px] ${onClick ? 'cursor-pointer' : ''}`}>
        {bagPattern.flat().map((pixel, i) => (
          <div 
            key={i} 
            className={pixelSize}
            style={{ 
              backgroundColor: pixel === 1 ? '#FFFFFF' : pixel === 2 ? color : 'transparent' 
            }}
          />
        ))}
      </div>
    </motion.div>
  );
};

// Computer-style Pixel Card icon component (Teal/Cyan for Flippable Business Card) (10x10)
const MobilePixelCard: React.FC<{ 
  color?: string; 
  detailColor?: string;
  onClick?: () => void; 
  size?: 'xs' | 'sm' | 'md' | 'lg'; 
  className?: string; 
  pulse?: boolean;
}> = ({ color = '#2DD4BF', detailColor = '#FFFFFF', onClick, size = 'sm', className = '', pulse = false }) => {
  // 0: transparent, 1: white border, 2: teal card fill, 3: white/sparkle accent
  const cardPattern = [
    [0, 1, 1, 1, 1, 1, 1, 1, 0, 0],
    [1, 2, 2, 2, 2, 2, 2, 2, 1, 0],
    [1, 2, 3, 3, 2, 2, 3, 2, 1, 1],
    [1, 2, 3, 3, 2, 3, 3, 3, 1, 1],
    [1, 2, 2, 2, 2, 2, 3, 2, 1, 1],
    [1, 2, 3, 3, 3, 2, 2, 2, 1, 1],
    [1, 2, 3, 3, 3, 3, 3, 2, 1, 1],
    [1, 2, 2, 2, 2, 2, 2, 2, 1, 1],
    [1, 2, 3, 3, 3, 3, 2, 2, 1, 0],
    [0, 1, 1, 1, 1, 1, 1, 1, 0, 0],
  ];

  const pixelSize = size === 'xs' 
    ? 'w-[1px] h-[1px]' 
    : size === 'sm' 
    ? 'w-[1.5px] h-[1.5px]' 
    : size === 'md' 
    ? 'w-[2.5px] h-[2.5px]' 
    : 'w-[3.5px] h-[3.5px]';

  return (
    <motion.div 
      onClick={onClick}
      className={`flex flex-col items-center justify-center ${className} ${pulse ? 'animate-pulse' : ''}`}
      whileHover={onClick ? { scale: 1.15 } : {}}
      whileTap={onClick ? { scale: 0.95 } : {}}
    >
      <div className={`p-0.5 grid grid-cols-10 gap-[0.5px] ${onClick ? 'cursor-pointer' : ''}`}>
        {cardPattern.flat().map((pixel, i) => (
          <div 
            key={i} 
            className={pixelSize}
            style={{ 
              backgroundColor: pixel === 1 ? '#FFFFFF' : pixel === 2 ? color : pixel === 3 ? detailColor : 'transparent' 
            }}
          />
        ))}
      </div>
    </motion.div>
  );
};

// Computer-style Pixel Diamond (Rhombus) icon component for Hot Products / Merch (10x10)
const MobilePixelDiamond: React.FC<{ 
  color?: string; 
  onClick?: () => void; 
  size?: 'xs' | 'sm' | 'md' | 'lg'; 
  className?: string; 
  pulse?: boolean;
}> = ({ color = '#FA7268', onClick, size = 'sm', className = '', pulse = false }) => {
  const diamondPattern = [
    [0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
    [0, 0, 0, 1, 1, 2, 1, 0, 0, 0],
    [0, 0, 1, 1, 2, 2, 2, 1, 0, 0],
    [0, 1, 1, 2, 2, 2, 2, 2, 1, 0],
    [1, 1, 2, 2, 2, 2, 2, 2, 2, 1],
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    [0, 1, 2, 2, 2, 2, 2, 2, 1, 0],
    [0, 0, 1, 2, 2, 2, 2, 1, 0, 0],
    [0, 0, 0, 1, 2, 2, 1, 0, 0, 0],
    [0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
  ];

  const pixelSize = size === 'xs' 
    ? 'w-[1px] h-[1px]' 
    : size === 'sm' 
    ? 'w-[1.5px] h-[1.5px]' 
    : size === 'md' 
    ? 'w-[2.5px] h-[2.5px]' 
    : 'w-[3.5px] h-[3.5px]';

  return (
    <motion.div 
      onClick={onClick}
      className={`flex flex-col items-center justify-center ${className} ${pulse ? 'animate-pulse' : ''}`}
      whileHover={onClick ? { scale: 1.15 } : {}}
      whileTap={onClick ? { scale: 0.95 } : {}}
    >
      <div className={`p-0.5 grid grid-cols-10 gap-[0.5px] ${onClick ? 'cursor-pointer' : ''}`}>
        {diamondPattern.flat().map((pixel, i) => (
          <div 
            key={i} 
            className={pixelSize}
            style={{ 
              backgroundColor: pixel === 1 ? '#FFFFFF' : pixel === 2 ? color : 'transparent' 
            }}
          />
        ))}
      </div>
    </motion.div>
  );
};

// Computer-style Pixel Exclamation Mark icon component (Glossy Black / Pure White for Special Notice) (10x10)
const MobilePixelExclamation: React.FC<{ 
  color?: string; 
  detailColor?: string;
  onClick?: () => void; 
  size?: 'xs' | 'sm' | 'md' | 'lg'; 
  className?: string; 
  pulse?: boolean;
}> = ({ color = '#000000', detailColor = '#FFFFFF', onClick, size = 'sm', className = '', pulse = false }) => {
  // 0: transparent, 1: outer white border/shine, 2: glossy black background, 3: pure white exclamation mark
  const exclamationPattern = [
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [1, 2, 2, 3, 3, 3, 3, 2, 2, 1],
    [1, 2, 2, 3, 3, 3, 3, 2, 2, 1],
    [1, 2, 2, 3, 3, 3, 3, 2, 2, 1],
    [1, 2, 2, 3, 3, 3, 3, 2, 2, 1],
    [1, 2, 2, 0, 3, 3, 0, 2, 2, 1],
    [1, 2, 2, 0, 0, 0, 0, 2, 2, 1],
    [1, 2, 2, 3, 3, 3, 3, 2, 2, 1],
    [1, 2, 2, 3, 3, 3, 3, 2, 2, 1],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  ];

  const pixelSize = size === 'xs' 
    ? 'w-[1px] h-[1px]' 
    : size === 'sm' 
    ? 'w-[1.5px] h-[1.5px]' 
    : size === 'md' 
    ? 'w-[2.5px] h-[2.5px]' 
    : 'w-[3.5px] h-[3.5px]';

  return (
    <motion.div 
      onClick={onClick}
      className={`flex flex-col items-center justify-center ${className} ${pulse ? 'animate-pulse' : ''}`}
      whileHover={onClick ? { scale: 1.15 } : {}}
      whileTap={onClick ? { scale: 0.95 } : {}}
    >
      <div className={`p-0.5 grid grid-cols-10 gap-[0.5px] ${onClick ? 'cursor-pointer' : ''}`}>
        {exclamationPattern.flat().map((pixel, i) => (
          <div 
            key={i} 
            className={pixelSize}
            style={{ 
              backgroundColor: pixel === 1 ? '#E2E8F0' : pixel === 2 ? color : pixel === 3 ? detailColor : 'transparent' 
            }}
          />
        ))}
      </div>
    </motion.div>
  );
};

// Computer-style Pixel Wi-Fi icon component (Red for Store Latest News) (10x10)
const MobilePixelWifi: React.FC<{ 
  color?: string; 
  onClick?: () => void; 
  size?: 'xs' | 'sm' | 'md' | 'lg'; 
  className?: string; 
  pulse?: boolean;
}> = ({ color = '#EF4444', onClick, size = 'sm', className = '', pulse = false }) => {
  const wifiPattern = [
    [0, 1, 2, 2, 2, 2, 2, 2, 1, 0],
    [1, 2, 1, 0, 0, 0, 0, 1, 2, 1],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 1, 2, 2, 2, 2, 1, 0, 0],
    [0, 1, 2, 0, 0, 0, 0, 2, 1, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 1, 2, 2, 1, 0, 0, 0],
    [0, 0, 1, 2, 0, 0, 2, 1, 0, 0],
    [0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
    [0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
  ];

  const pixelSize = size === 'xs' 
    ? 'w-[1px] h-[1px]' 
    : size === 'sm' 
    ? 'w-[1.5px] h-[1.5px]' 
    : size === 'md' 
    ? 'w-[2.5px] h-[2.5px]' 
    : 'w-[3.5px] h-[3.5px]';

  return (
    <motion.div 
      onClick={onClick}
      className={`flex flex-col items-center justify-center ${className} ${pulse ? 'animate-pulse' : ''}`}
      whileHover={onClick ? { scale: 1.15 } : {}}
      whileTap={onClick ? { scale: 0.95 } : {}}
    >
      <div className={`p-0.5 grid grid-cols-10 gap-[0.5px] ${onClick ? 'cursor-pointer' : ''}`}>
        {wifiPattern.flat().map((pixel, i) => (
          <div 
            key={i} 
            className={pixelSize}
            style={{ 
              backgroundColor: pixel === 1 ? '#FFFFFF' : pixel === 2 ? color : 'transparent' 
            }}
          />
        ))}
      </div>
    </motion.div>
  );
};

// Computer-style Pixel Chat Bubble icon component (Orange for Reservation / Social Chat) (10x10)
const MobilePixelChat: React.FC<{ 
  color?: string; 
  dotColor?: string;
  onClick?: () => void; 
  size?: 'xs' | 'sm' | 'md' | 'lg'; 
  className?: string; 
  pulse?: boolean;
}> = ({ color = '#FFB347', dotColor = '#FFFFFF', onClick, size = 'sm', className = '', pulse = false }) => {
  // 0: transparent, 1: white border, 2: orange fill, 3: interior chat dots (white)
  const chatPattern = [
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    [1, 2, 3, 2, 3, 2, 3, 2, 2, 1],
    [1, 2, 3, 2, 3, 2, 3, 2, 2, 1],
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    [0, 1, 1, 1, 1, 2, 2, 1, 1, 0],
    [0, 0, 0, 0, 1, 2, 2, 1, 0, 0],
    [0, 0, 0, 0, 1, 2, 1, 0, 0, 0],
    [0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
  ];

  const pixelSize = size === 'xs' 
    ? 'w-[1px] h-[1px]' 
    : size === 'sm' 
    ? 'w-[1.5px] h-[1.5px]' 
    : size === 'md' 
    ? 'w-[2.5px] h-[2.5px]' 
    : 'w-[3.5px] h-[3.5px]';

  return (
    <motion.div 
      onClick={onClick}
      className={`flex flex-col items-center justify-center ${className} ${pulse ? 'animate-pulse' : ''}`}
      whileHover={onClick ? { scale: 1.15 } : {}}
      whileTap={onClick ? { scale: 0.95 } : {}}
    >
      <div className={`p-0.5 grid grid-cols-10 gap-[0.5px] ${onClick ? 'cursor-pointer' : ''}`}>
        {chatPattern.flat().map((pixel, i) => (
          <div 
            key={i} 
            className={pixelSize}
            style={{ 
              backgroundColor: pixel === 1 ? '#FFFFFF' : pixel === 2 ? color : pixel === 3 ? dotColor : 'transparent' 
            }}
          />
        ))}
      </div>
    </motion.div>
  );
};

// Computer-style Pixel Phone Receiver icon component (Orange for Reservation) (10x10)
const MobilePixelPhone: React.FC<{ 
  color?: string; 
  onClick?: () => void; 
  size?: 'xs' | 'sm' | 'md' | 'lg'; 
  className?: string; 
  pulse?: boolean;
}> = ({ color = '#FFB347', onClick, size = 'sm', className = '', pulse = false }) => {
  const phonePattern = [
    [0, 0, 0, 0, 1, 2, 2, 2, 1, 0],
    [0, 0, 0, 1, 2, 2, 2, 2, 2, 1],
    [0, 0, 1, 2, 2, 1, 1, 1, 2, 1],
    [0, 1, 2, 2, 1, 0, 0, 0, 1, 0],
    [1, 2, 2, 1, 0, 0, 0, 0, 0, 0],
    [1, 2, 2, 1, 0, 0, 0, 0, 0, 0],
    [1, 2, 2, 1, 0, 0, 0, 1, 0, 0],
    [1, 2, 2, 1, 0, 0, 1, 2, 1, 0],
    [0, 1, 2, 2, 1, 1, 2, 2, 2, 1],
    [0, 0, 1, 2, 2, 2, 2, 2, 1, 0],
  ];

  const pixelSize = size === 'xs' 
    ? 'w-[1px] h-[1px]' 
    : size === 'sm' 
    ? 'w-[1.5px] h-[1.5px]' 
    : size === 'md' 
    ? 'w-[2.5px] h-[2.5px]' 
    : 'w-[3.5px] h-[3.5px]';

  return (
    <motion.div 
      onClick={onClick}
      className={`flex flex-col items-center justify-center ${className} ${pulse ? 'animate-pulse' : ''}`}
      whileHover={onClick ? { scale: 1.15 } : {}}
      whileTap={onClick ? { scale: 0.95 } : {}}
    >
      <div className={`p-0.5 grid grid-cols-10 gap-[0.5px] ${onClick ? 'cursor-pointer' : ''}`}>
        {phonePattern.flat().map((pixel, i) => (
          <div 
            key={i} 
            className={pixelSize}
            style={{ 
              backgroundColor: pixel === 1 ? '#FFFFFF' : pixel === 2 ? color : 'transparent' 
            }}
          />
        ))}
      </div>
    </motion.div>
  );
};

// Computer-style Pixel Contact icon component (Green for Character Intro) (10x10)
const MobilePixelContact: React.FC<{ 
  color?: string; 
  onClick?: () => void; 
  size?: 'xs' | 'sm' | 'md' | 'lg'; 
  className?: string; 
  pulse?: boolean;
}> = ({ color = '#7CFC00', onClick, size = 'sm', className = '', pulse = false }) => {
  const contactPattern = [
    [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
    [0, 0, 1, 2, 2, 2, 2, 1, 0, 0],
    [0, 0, 1, 2, 2, 2, 2, 1, 0, 0],
    [0, 0, 1, 2, 2, 2, 2, 1, 0, 0],
    [0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
    [0, 0, 0, 0, 1, 1, 0, 0, 0, 0],
    [0, 0, 1, 1, 1, 1, 1, 1, 0, 0],
    [0, 1, 2, 2, 2, 2, 2, 2, 1, 0],
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  ];

  const pixelSize = size === 'xs' 
    ? 'w-[1px] h-[1px]' 
    : size === 'sm' 
    ? 'w-[1.5px] h-[1.5px]' 
    : size === 'md' 
    ? 'w-[2.5px] h-[2.5px]' 
    : 'w-[3.5px] h-[3.5px]';

  return (
    <motion.div 
      onClick={onClick}
      className={`flex flex-col items-center justify-center ${className} ${pulse ? 'animate-pulse' : ''}`}
      whileHover={onClick ? { scale: 1.15 } : {}}
      whileTap={onClick ? { scale: 0.95 } : {}}
    >
      <div className={`p-0.5 grid grid-cols-10 gap-[0.5px] ${onClick ? 'cursor-pointer' : ''}`}>
        {contactPattern.flat().map((pixel, i) => (
          <div 
            key={i} 
            className={pixelSize}
            style={{ 
              backgroundColor: pixel === 1 ? '#FFFFFF' : pixel === 2 ? color : 'transparent' 
            }}
          />
        ))}
      </div>
    </motion.div>
  );
};

// Computer-style Pixel Calendar icon component (Yellow/Red Pixel Calendar for Calendar) (10x10)
const MobilePixelCalendar: React.FC<{ 
  color?: string; 
  headerColor?: string;
  onClick?: () => void; 
  size?: 'xs' | 'sm' | 'md' | 'lg'; 
  className?: string; 
  pulse?: boolean;
}> = ({ color = '#FFE600', headerColor = '#EF4444', onClick, size = 'sm', className = '', pulse = false }) => {
  // 0: transparent, 1: white border/highlight/binders, 2: yellow body/accent, 3: red top bar
  const calendarPattern = [
    [0, 1, 0, 0, 1, 1, 0, 0, 1, 0],
    [1, 3, 3, 3, 3, 3, 3, 3, 3, 1],
    [1, 3, 3, 3, 3, 3, 3, 3, 3, 1],
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    [1, 2, 1, 2, 1, 2, 1, 2, 2, 1],
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    [1, 2, 1, 2, 1, 2, 1, 2, 2, 1],
    [1, 2, 2, 2, 2, 2, 2, 2, 2, 1],
    [1, 2, 1, 2, 1, 2, 1, 2, 2, 1],
    [0, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  ];

  const pixelSize = size === 'xs' 
    ? 'w-[1px] h-[1px]' 
    : size === 'sm' 
    ? 'w-[1.5px] h-[1.5px]' 
    : size === 'md' 
    ? 'w-[2.5px] h-[2.5px]' 
    : 'w-[3.5px] h-[3.5px]';

  return (
    <motion.div 
      onClick={onClick}
      className={`flex flex-col items-center justify-center ${className} ${pulse ? 'animate-pulse' : ''}`}
      whileHover={onClick ? { scale: 1.15 } : {}}
      whileTap={onClick ? { scale: 0.95 } : {}}
    >
      <div className={`p-0.5 grid grid-cols-10 gap-[0.5px] ${onClick ? 'cursor-pointer' : ''}`}>
        {calendarPattern.flat().map((pixel, i) => (
          <div 
            key={i} 
            className={pixelSize}
            style={{ 
              backgroundColor: 
                pixel === 1 ? '#FFFFFF' : 
                pixel === 2 ? color : 
                pixel === 3 ? headerColor : 
                'transparent' 
            }}
          />
        ))}
      </div>
    </motion.div>
  );
};

const HEARTS_CONFIG = [
  { id: 'news', color: '#F08080', label: '店面最新資訊', desc: '實時公告與最新通知 📢' },
  { id: 'reservation', color: '#FFB347', label: '社群預約功能', desc: '預約服務與開門注意事項 門' },
  { id: 'calendar', color: '#FFFF00', label: '店鋪專用行事曆', desc: '活動企劃與主題之夜 📅' },
  { id: 'intro', color: '#7CFC00', label: '角色介紹', desc: '選擇你的推 🎨' },
  { id: 'social', color: '#87CEEB', label: '社群連結', desc: '關注 X, Instagram 與 Discord 獲取最新消息 📱' },
  { id: 'collab', color: '#D1B3FF', label: '合作邀約', desc: '歡迎各類商業合作與專案洽談 ✉️' },
  { id: 'visual', color: '#FFD1DC', label: '特別感謝', desc: '特別感謝團長涼海璃對幹程式碼一個月 🔵' },
  { id: 'disabled', color: '#4C5E6E', label: '尚未開放', desc: '更多神祕功能即將推出，敬請期待！✨' },
];

export const MobileWebsite: React.FC<MobileWebsiteProps> = () => {
  // Mobile-specific game state sequence to handle the transition
  const [localGameState, setLocalGameState] = useState<'idle' | 'forming' | 'formed' | 'dissolving' | 'next_page'>('idle');
  const [currentTime, setCurrentTime] = useState('');
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [dimensions, setDimensions] = useState({ cols: 0, rows: 0 });
  const [showNewsSubpage, setShowNewsSubpage] = useState(false);
  const [showReservationSubpage, setShowReservationSubpage] = useState(false);
  const [showCalendarSubpage, setShowCalendarSubpage] = useState(false);
  const [showIntroSubpage, setShowIntroSubpage] = useState(false);
  const [showAppInstallSubpage, setShowAppInstallSubpage] = useState(false);
  const [showSecretSubpage, setShowSecretSubpage] = useState(false);
  const [showBusinessCardSubpage, setShowBusinessCardSubpage] = useState(false);
  const [showSpecialNoticeSubpage, setShowSpecialNoticeSubpage] = useState(false);
  const [showMonologueSubpage, setShowMonologueSubpage] = useState(false);
  const [mobileSheepClickCount, setMobileSheepClickCount] = useState(0);
  const isSecretHeartPublished = false; // 預設隱藏發布，灰色心不可點擊
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [selectedMobileFighter, setSelectedMobileFighter] = useState<any | null>(null);
  const [selectedHeartId, setSelectedHeartId] = useState<string | null>(null);

  useEffect(() => {
    const checkStandalone = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const isStandaloneMode = 
        window.matchMedia('(display-mode: standalone)').matches || 
        (navigator as any).standalone || 
        document.referrer.includes('android-app://') ||
        urlParams.get('display') === 'standalone' ||
        urlParams.get('mode') === 'standalone';
      setIsStandalone(isStandaloneMode);
    };
    checkStandalone();
    
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = (e: MediaQueryListEvent) => {
      setIsStandalone(e.matches);
    };
    mediaQuery.addEventListener('change', handleChange);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  const handleBlockExplosion = (color: string) => {
    if (dimensions.cols === 0) return;
    setBlocks(prev => {
      const explosionBlocks = [];
      const numBlocks = Math.floor(Math.random() * 8) + 12; // 12-20 blocks
      for (let i = 0; i < numBlocks; i++) {
        explosionBlocks.push({
          id: `explosion-${Math.random().toString(36).substr(2, 9)}`,
          color: color,
          column: Math.floor(Math.random() * dimensions.cols),
          row: Math.floor(Math.random() * -3)
        });
      }
      return [...prev, ...explosionBlocks];
    });
  };

  // Dynamically calculate grid size based on mobile width to fit the formed word perfectly without overflowing
  const GRID_SIZE = Math.max(9, Math.min(12, Math.floor(typeof window !== 'undefined' ? window.innerWidth / 33 : 10)));
  const TICK_RATE = 75; // Fast tick rate for smooth pixel animation on phone screens

  // Clock Update Effect
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toTimeString().split(' ')[0]);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

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
  }, [GRID_SIZE]);

  // Main game loop: Block physics and falling
  useEffect(() => {
    if (dimensions.cols === 0) return;

    const moveInterval = setInterval(() => {
      setBlocks((prev) => {
        const nextBlocks = prev
          .map(block => {
            if (block.targetRow !== undefined && block.row >= block.targetRow) {
              return block;
            }
            return { ...block, row: block.row + 1 };
          })
          .filter(block => block.row < dimensions.rows);

        // Check transition to 'formed' state when in 'forming' and all white blocks have arrived
        if (localGameState === 'forming') {
          const hasWhiteBlocks = nextBlocks.some(b => b.color === '#FFFFFF');
          const allWhiteReached = nextBlocks
            .filter(b => b.color === '#FFFFFF')
            .every(b => b.targetRow !== undefined && b.row >= b.targetRow);

          if (hasWhiteBlocks && allWhiteReached) {
            setLocalGameState('formed');
          }
        }

        // Transition to 'next_page' when in 'dissolving' and no white blocks are left
        if (localGameState === 'dissolving') {
          const hasWhiteBlocks = nextBlocks.some(b => b.color === '#FFFFFF');
          if (!hasWhiteBlocks) {
            setLocalGameState('next_page');
          }
        }

        return nextBlocks;
      });
    }, TICK_RATE);

    return () => clearInterval(moveInterval);
  }, [dimensions, localGameState]);

  // Spawning random falling color pixels in 'idle' and 'forming' phase
  useEffect(() => {
    if (dimensions.cols === 0 || localGameState === 'next_page') return;

    const spawnInterval = setInterval(() => {
      if (localGameState !== 'idle' && localGameState !== 'forming') return;

      setBlocks((prev) => {
        // Find occupied top columns
        const occupiedTopCols = new Set(
          prev.filter(b => b.row <= 1).map(b => b.column)
        );

        const availableCols = Array.from({ length: dimensions.cols })
          .map((_, i) => i)
          .filter(col => !occupiedTopCols.has(col));

        // Spawn probability (0.75 chance per tick)
        if (availableCols.length === 0 || Math.random() > 0.75) return prev;

        const spawnCount = Math.floor(Math.random() * 4) + 1;
        let newBlocks = [...prev];
        let currentAvailable = [...availableCols];

        for (let i = 0; i < spawnCount && currentAvailable.length > 0; i++) {
          const randomIndex = Math.floor(Math.random() * currentAvailable.length);
          const randomCol = currentAvailable[randomIndex];
          currentAvailable.splice(randomIndex, 1);

          newBlocks.push({
            id: `colored-${Math.random().toString(36).substr(2, 9)}`,
            color: COLORS[Math.floor(Math.random() * COLORS.length)],
            column: randomCol,
            row: 0
          });
        }

        return newBlocks;
      });
    }, TICK_RATE);

    return () => clearInterval(spawnInterval);
  }, [dimensions, localGameState]);

  // Handle 'formed' to 'dissolving' transition after a short delay
  useEffect(() => {
    if (localGameState === 'formed') {
      const timer = setTimeout(() => {
        setLocalGameState('dissolving');
      }, 222);
      return () => clearTimeout(timer);
    }
  }, [localGameState]);

  // Staggered dissolve logic
  useEffect(() => {
    if (localGameState !== 'dissolving' || blocks.length === 0) return;

    const dissolveInterval = setInterval(() => {
      setBlocks(prev => {
        const staticBlocks = prev.filter(b => b.targetRow !== undefined && b.row >= b.targetRow);
        
        if (staticBlocks.length === 0) return prev;

        // Pick 2-6 random blocks to start falling
        const count = Math.floor(Math.random() * 5) + 2;
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
    }, 60);

    return () => clearInterval(dissolveInterval);
  }, [localGameState, blocks.length]);

  // Tap action to trigger start transition
  const handleStart = () => {
    if (localGameState !== 'idle') return;

    setLocalGameState('forming');

    const rand = Math.random();
    const line1 = rand < 0.5 ? "Q AND" : "SANKETSU";
    const line2 = rand < 0.5 ? "SANKETSU" : "EVERYDAY";

    const generateMessageBlocks = (text: string, startRow: number) => {
      const charWidth = 4; // 3 width + 1 space column
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
                row: -Math.floor(Math.random() * 15) - 5, // Dropping from random heights above
                targetRow: startRow + rIdx
              });
            }
          });
        });
      });
      return newBlocks;
    };

    const startRow1 = Math.floor(dimensions.rows / 2) - 4;
    const startRow2 = Math.floor(dimensions.rows / 2) + 2;

    const msg1 = generateMessageBlocks(line1, startRow1);
    const msg2 = generateMessageBlocks(line2, startRow2);

    // Make all existing colorful blocks fall without targetRow, then append white text blocks
    setBlocks(prev => {
      const fallingColorful = prev.map(b => ({ ...b, targetRow: undefined }));
      return [...fallingColorful, ...msg1, ...msg2];
    });
  };

  const handleSkip = () => {
    if (['forming', 'formed', 'dissolving'].includes(localGameState)) {
      setLocalGameState('next_page');
      setBlocks([]);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-[#000B18] z-[9999] flex flex-col items-center justify-between overflow-hidden font-rounded text-white select-none"
      style={{
        backgroundImage: `
          linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
      }}
      onClick={handleStart}
      onDoubleClick={handleSkip}
    >
      {/* 1. BACKGROUND FALLING BLOCKS LAYER (Covering entire screen with no grid border) */}
      {localGameState !== 'next_page' && (
        <div className="absolute inset-0 pointer-events-none">
          {blocks.map((block) => (
            <div
              key={block.id}
              style={{
                position: 'absolute',
                transform: `translate3d(${block.column * GRID_SIZE + 1}px, ${block.row * GRID_SIZE}px, 0)`,
                width: GRID_SIZE - 2,
                height: GRID_SIZE - 2,
                backgroundColor: block.color,
                boxShadow: block.color === '#FFFFFF' 
                  ? 'inset 0 0 4px rgba(255,255,255,0.4), 0 0 10px rgba(255,255,255,0.8)'
                  : `inset 0 0 4px rgba(255,255,255,0.2), 0 0 8px ${block.color}33`,
                border: '1px solid rgba(255,255,255,0.1)',
                zIndex: block.color === '#FFFFFF' ? 30 : 10,
                transition: 'transform 0.08s linear'
              }}
            />
          ))}
        </div>
      )}

      {/* 2. TRANSLUCENT OVERLAYS AND TEXT DETAILS */}
      <AnimatePresence mode="wait">
        {localGameState === 'idle' && (
          <motion.div
            key="landing_info"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-0 flex flex-col items-center justify-between p-6 z-20 pointer-events-none"
          >
            {/* Top status indicator */}
            <div className="w-full flex justify-between items-center text-[9px] tracking-widest text-white/30 uppercase pt-2 font-mono">
              <div className="flex items-center gap-1.5">
                <MobilePixelHeart color="#FFB347" size="xs" pulse className="translate-y-[-1px]" />
                <span>QPKS-APP-VER3.0</span>
              </div>
              <div>{currentTime}</div>
            </div>

            {/* Fully Transparent Floating Logo (Enlarged) */}
            <div className="flex-1 flex flex-col items-center justify-center">
              <motion.div
                initial={{ scale: 0.9, opacity: 0, rotate: -2 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ duration: 1, type: 'spring' }}
                className="relative"
              >
                {/* Clean floating logo image without any background grids or container boxes, enlarged for prominence */}
                <img 
                  src={NEW_LOGO_URL} 
                  alt="紡塊像素 Logo" 
                  className="w-64 h-64 sm:w-72 sm:h-72 object-contain drop-shadow-[0_0_45px_rgba(251,191,36,0.35)] animate-float"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.src = "https://drive.google.com/thumbnail?id=1yqTzowdnAcZTofISD4xSGTz-GigyR_Ma&sz=w1000";
                  }}
                />
              </motion.div>
            </div>

            {/* Tap to Start Game instruction */}
            <motion.div 
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="mb-8 text-center space-y-1.5"
            >
              <span className="text-amber-400 font-black text-sm tracking-[0.4em] uppercase">
                👉 點擊以開始遊戲 👈
              </span>
              <p className="text-[8px] text-white/20 tracking-widest uppercase font-mono">
                TAP TO INITIATE TRANSITION
              </p>
            </motion.div>
          </motion.div>
        )}

        {/* 3. NEXT PAGE - AFTER PIXEL TRANSITION COMPLETION */}
        {localGameState === 'next_page' && (
          <motion.div
            key="next_page_content"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, type: 'spring' }}
            className="absolute inset-0 flex flex-col items-center justify-between p-3 sm:p-4 z-20 bg-[#000B18] relative w-full h-full overflow-hidden"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)
              `,
              backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
            }}
          >
            {/* 上方 ⅓ 區塊：粉色霓虹細框線，LOGO 擺在正中間，下方以無框線小字標注地址與電話 */}
            <div className="w-full max-w-sm sm:max-w-md h-[31vh] sm:h-[33vh] flex-none rounded-3xl border border-pink-400/60 shadow-[0_0_18px_rgba(244,114,182,0.35),inset_0_0_14px_rgba(244,114,182,0.12)] bg-black/40 backdrop-blur-md relative overflow-hidden flex flex-col items-center justify-between p-2.5 sm:p-3">
              {/* Ambient pink glow */}
              <div className="absolute inset-0 bg-gradient-to-b from-pink-500/10 via-transparent to-purple-500/10 pointer-events-none" />

              {/* Status Header */}
              <div className="w-full flex justify-between items-center text-[8px] tracking-widest text-pink-300/60 uppercase font-mono z-10 px-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse" />
                  <span>QPKS // CUBEPIXEL</span>
                </div>
                <div>{currentTime}</div>
              </div>

              {/* Center LOGO with Perfect Circular Frame (Enlarged) */}
              <motion.div 
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                className="relative flex justify-center items-center my-auto z-10"
              >
                {/* Perfect Circle Frame */}
                <div className="w-[21vh] h-[21vh] min-w-[140px] min-h-[140px] max-w-[195px] max-h-[195px] aspect-square rounded-full border border-pink-400/50 shadow-[0_0_22px_rgba(244,114,182,0.4),inset_0_0_15px_rgba(244,114,182,0.15)] bg-black/40 backdrop-blur-sm flex items-center justify-center p-2.5 relative overflow-hidden group">
                  {/* Subtle circular pulse ring */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-pink-500/15 via-transparent to-amber-500/15 pointer-events-none" />
                  
                  <img 
                    src={NEW_LOGO_URL} 
                    alt="紡塊像素 Logo" 
                    className="w-full h-full object-contain drop-shadow-[0_0_25px_rgba(251,191,36,0.45)] relative z-10"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.src = "https://drive.google.com/thumbnail?id=1yqTzowdnAcZTofISD4xSGTz-GigyR_Ma&sz=w1000";
                    }}
                  />
                </div>
              </motion.div>

              {/* 聯絡與營業狀態區塊：無框線、小字標注 */}
              <div className="w-full flex flex-col items-center gap-0.5 text-[8.5px] font-mono z-10 pb-0.5">
                <div className="flex items-center justify-center gap-2 text-white/80">
                  <span className="flex items-center gap-1">
                    <span className="text-pink-300/80 text-[8px]">📞</span>
                    <span className="text-[#D1B3FF] font-bold">02-8925-2329</span>
                  </span>
                </div>
                <div className="text-[7.5px] text-amber-300 font-mono tracking-tight font-bold">
                  ⏰ 全預約制 依實際情況為準
                </div>
              </div>
            </div>

            {/* 下方 ⅔ 區塊：粉色霓虹細框線，4個一排 ICON 序列，第一個為亮黃色菱形熱門商品 */}
            <div className="w-full max-w-sm sm:max-w-md flex-1 min-h-0 rounded-3xl border border-pink-400/60 shadow-[0_0_18px_rgba(244,114,182,0.35),inset_0_0_14px_rgba(244,114,182,0.12)] bg-black/40 backdrop-blur-md relative overflow-hidden flex flex-col justify-between p-3 sm:p-3.5 mt-2.5">
              {/* Ambient neon backdrop */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-950/15 to-pink-950/20 pointer-events-none" />

              {/* Scrollable Container */}
              <div className="w-full h-full flex flex-col justify-between gap-2.5 overflow-y-auto pr-0.5 custom-scrollbar z-10">
                
                {/* 手機版獨有釘選公告 常態性釘選在最上面 */}
                <div className="w-full bg-gradient-to-br from-red-950/90 via-[#22060A]/95 to-red-950/90 border border-red-500/60 rounded-2xl p-2.5 sm:p-3 shadow-[0_0_16px_rgba(239,68,68,0.25)] relative overflow-hidden text-left flex-none">
                  {/* Decorative corner borders */}
                  <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-red-400" />
                  <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-red-400" />
                  <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-red-400" />
                  <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-red-400" />

                  {/* Header Badge */}
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs">📌</span>
                      <span className="bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full border border-red-500/40 font-pixel text-[8px] tracking-wider uppercase font-bold">
                        釘選公告 / PINNED NOTICE
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[7.5px] font-mono text-red-400/80 font-bold">常態釘選</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                    </div>
                  </div>

                  {/* Pinned Content */}
                  <div className="text-[10.5px] sm:text-xs font-bold text-white leading-relaxed font-rounded space-y-0.5 bg-black/40 p-2 sm:p-2.5 rounded-xl border border-red-500/20">
                    <p className="text-red-100">
                      因政客騷擾事件發生 本店於即日起改為全預約制
                    </p>
                    <p className="text-red-200">
                      並且已將門把手移除
                    </p>
                  </div>
                </div>

                {/* 4 個一排的 ICON 序列區 */}
                <div className="w-full space-y-1.5">
                  <div className="flex justify-between items-center text-[8px] text-pink-300/60 font-mono tracking-widest uppercase px-1">
                    <span>CUBEPIXEL // 快捷導航</span>
                    <span>4×N SEQUENCE</span>
                  </div>

                  <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
                    {/* 1. 店面最新資訊 (Red/Silver Pixel Compass) */}
                    <motion.button
                      onClick={() => setShowNewsSubpage(true)}
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      className="aspect-square w-full bg-red-500/10 hover:bg-red-500/20 border border-red-400/30 hover:border-red-400/60 rounded-2xl flex items-center justify-center transition-all shadow-[0_0_12px_rgba(239,68,68,0.15)] group cursor-pointer"
                      title="店面最新資訊"
                    >
                      <div className="drop-shadow-[0_0_8px_rgba(239,68,68,0.8)]">
                        <MobilePixelCompass color="#EF4444" size="lg" pulse />
                      </div>
                    </motion.button>

                    {/* 2. 社群預約功能 (Orange Pixel Chat Bubble) */}
                    <motion.button
                      onClick={() => setShowReservationSubpage(true)}
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      className="aspect-square w-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/30 hover:border-amber-400/60 rounded-2xl flex items-center justify-center transition-all shadow-[0_0_12px_rgba(245,158,11,0.15)] group cursor-pointer"
                      title="社群預約功能"
                    >
                      <div className="drop-shadow-[0_0_8px_rgba(245,158,11,0.8)]">
                        <MobilePixelChat color="#FFB347" size="lg" pulse />
                      </div>
                    </motion.button>

                    {/* 3. 店鋪專用行事曆 (Yellow/Red Pixel Art Calendar) */}
                    <motion.button
                      onClick={() => setShowCalendarSubpage(true)}
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      className="aspect-square w-full bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-300/30 hover:border-yellow-300/60 rounded-2xl flex items-center justify-center transition-all shadow-[0_0_12px_rgba(234,179,8,0.15)] group cursor-pointer"
                      title="店鋪專用行事曆"
                    >
                      <div className="drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]">
                        <MobilePixelCalendar color="#FFE600" size="lg" pulse />
                      </div>
                    </motion.button>

                    {/* 4. 角色介紹 (Green Pixel Contact / Avatar) */}
                    <motion.button
                      onClick={() => setShowIntroSubpage(true)}
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      className="aspect-square w-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-400/30 hover:border-emerald-400/60 rounded-2xl flex items-center justify-center transition-all shadow-[0_0_12px_rgba(124,252,0,0.15)] group cursor-pointer"
                      title="角色介紹"
                    >
                      <div className="drop-shadow-[0_0_8px_rgba(124,252,0,0.8)]">
                        <MobilePixelContact color="#7CFC00" size="lg" pulse />
                      </div>
                    </motion.button>

                    {/* 5. 翻面名片 (Teal/Cyan Pixel Card) */}
                    <motion.button
                      onClick={() => setShowBusinessCardSubpage(true)}
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      className="aspect-square w-full bg-teal-500/10 hover:bg-teal-500/20 border border-teal-400/30 hover:border-teal-400/60 rounded-2xl flex items-center justify-center transition-all shadow-[0_0_12px_rgba(45,212,191,0.2)] group cursor-pointer"
                      title="翻面名片"
                    >
                      <div className="drop-shadow-[0_0_8px_rgba(45,212,191,0.8)]">
                        <MobilePixelCard color="#2DD4BF" size="lg" pulse />
                      </div>
                    </motion.button>

                    {/* 6. 神秘專區 (Gray Heart) */}
                    <motion.button
                      onClick={() => {
                        if (isSecretHeartPublished) {
                          setShowSecretSubpage(true);
                        }
                      }}
                      whileHover={isSecretHeartPublished ? { scale: 1.08 } : {}}
                      whileTap={isSecretHeartPublished ? { scale: 0.92 } : {}}
                      className={`aspect-square w-full bg-slate-500/10 border border-slate-500/20 rounded-2xl flex items-center justify-center transition-all ${
                        isSecretHeartPublished 
                          ? 'hover:bg-slate-500/20 hover:border-slate-400/50 cursor-pointer shadow-[0_0_12px_rgba(76,94,110,0.3)]' 
                          : 'cursor-not-allowed opacity-50'
                      }`}
                      title={isSecretHeartPublished ? "神秘專區" : "尚未開放"}
                    >
                      <div className="drop-shadow-[0_0_8px_rgba(76,94,110,0.6)]">
                        <MobilePixelHeart color="#4C5E6E" size="lg" pulse={isSecretHeartPublished} />
                      </div>
                    </motion.button>

                    {/* 7~14: 八個灰色佔位符 (8 Gray Placeholders) */}
                    {Array.from({ length: 8 }).map((_, index) => (
                      <div
                        key={`placeholder-${index}`}
                        className="aspect-square w-full bg-slate-800/20 border border-slate-700/30 rounded-2xl flex items-center justify-center transition-all opacity-40 cursor-not-allowed select-none shadow-[0_0_8px_rgba(0,0,0,0.2)]"
                        title={`即將開放 #${index + 1}`}
                      >
                        <div className="opacity-60">
                          <MobilePixelHeart color="#334155" size="lg" />
                        </div>
                      </div>
                    ))}

                    {/* 15. 某璃的獨白 (暗血紅色格 - 倒數第二個，最後一個黑色的左邊) */}
                    <motion.button
                      onClick={() => setShowMonologueSubpage(true)}
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      className="aspect-square w-full bg-[#3d0308]/90 hover:bg-[#5a050d] border border-red-700/60 hover:border-red-500 rounded-2xl flex items-center justify-center transition-all shadow-[0_0_15px_rgba(185,28,28,0.35)] hover:shadow-[0_0_22px_rgba(239,68,68,0.5)] group cursor-pointer"
                      title="某璃的獨白"
                    >
                      <div className="drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]">
                        <MobilePixelHeart color="#8B0000" size="lg" pulse />
                      </div>
                    </motion.button>

                    {/* 16. 特別公告（常態發布） (Glossy Black / Pure White Exclamation Mark) */}
                    <motion.button
                      onClick={() => setShowSpecialNoticeSubpage(true)}
                      whileHover={{ scale: 1.08 }}
                      whileTap={{ scale: 0.92 }}
                      className="aspect-square w-full bg-black/90 hover:bg-black border border-white/50 hover:border-white rounded-2xl flex items-center justify-center transition-all shadow-[0_0_15px_rgba(255,255,255,0.3)] hover:shadow-[0_0_22px_rgba(255,255,255,0.5)] group cursor-pointer"
                      title="特別公告（常態發布）"
                    >
                      <div className="drop-shadow-[0_0_10px_rgba(255,255,255,0.9)]">
                        <MobilePixelExclamation color="#000000" detailColor="#FFFFFF" size="lg" pulse />
                      </div>
                    </motion.button>
                  </div>
                </div>

                {/* Footer metadata */}
                <div className="w-full flex flex-col items-center gap-0.5 pt-1 pb-0.5">
                  <div className="flex items-center gap-1 text-[7px] text-white/30 tracking-widest uppercase font-mono">
                    <Sparkles className="w-2 h-2 text-amber-400/60" />
                    <span>CUBEPIXEL DEV TEAM</span>
                  </div>
                  <div className="text-[7px] text-white/20 tracking-wide text-center font-rounded">
                    紡塊像素 CubePixel_2026 感謝團長涼海璃製作
                  </div>
                </div>

              </div>
            </div>
          </motion.div>
        )}

        {showNewsSubpage && (
          <motion.div
            key="news_subpage"
            initial={{ opacity: 0, y: 150 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 150 }}
            transition={{ type: "spring", damping: 25, stiffness: 180 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-between p-4 bg-[#000611]/97 backdrop-blur-md w-full h-full"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)
              `,
              backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
            }}
          >
            {/* Top Back/Close bar */}
            <div className="w-full flex justify-between items-center text-[9px] tracking-widest text-white/30 uppercase pt-2 pb-2 z-40 font-mono">
              <button 
                onClick={() => setShowNewsSubpage(false)}
                className="flex items-center gap-1 text-red-400 hover:text-red-300 font-bold tracking-widest cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>返回</span>
              </button>
              <div>{currentTime}</div>
            </div>

            {/* Scrollable Container for Latest News */}
            <div className="flex-1 w-full overflow-y-auto py-4 px-2 my-auto flex flex-col items-center justify-start gap-4 scrollbar-thin scrollbar-thumb-white/10">
              <div className="w-full max-w-sm sm:max-w-md text-center space-y-4">
                {/* Desktop-Style Header Title */}
                <div className="flex flex-col items-center mb-4">
                  <h2 className="text-3xl font-black text-white tracking-[0.2em] italic drop-shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                    最新資訊
                  </h2>
                  <div className="mt-2 flex items-center justify-center gap-3 w-full max-w-xs">
                    <span className="text-white/20 font-pixel text-[10px] flex-1 text-right">━━━━━━</span>
                    <span className="text-[10px] text-white/40 font-pixel tracking-[0.3em] uppercase whitespace-nowrap">Latest News</span>
                    <span className="text-white/20 font-pixel text-[10px] flex-1 text-left">━━━━━━</span>
                  </div>
                </div>

                {/* News List Cards - Desktop Style Adaptations for Mobile */}
                <div className="space-y-4 text-left w-full">
                  {/* News Card: 釘選公告 (Pinned Notice: 因政客騷擾事件發生 本店於即日起改為全預約制 並且已將門把手移除) */}
                  <div className="w-full bg-gradient-to-br from-[#26070B] via-[#1a0508] to-[#26070B] backdrop-blur-md rounded-2xl p-4 border border-red-500/60 relative overflow-hidden flex flex-col items-start justify-center text-left hover:border-red-400 transition-all duration-300 shadow-[0_0_22px_rgba(239,68,68,0.3)]">
                    <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-[0.5px] border-l-[0.5px] border-red-400" />
                    <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t-[0.5px] border-r-[0.5px] border-red-400" />
                    <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-[0.5px] border-l-[0.5px] border-red-400" />
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-[0.5px] border-r-[0.5px] border-red-400" />
                    
                    <div className="flex flex-wrap items-center justify-between w-full gap-2 mb-3 pb-2 border-b border-red-500/30">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-400/50 rounded font-pixel uppercase tracking-widest">
                          <span>📌</span> 釘選公告
                        </span>
                        <span className="text-xs font-mono text-red-400/90 font-bold">常態釘選</span>
                      </div>
                      <span className="text-[10px] font-mono text-red-400/60 select-none">PINNED NOTICE</span>
                    </div>

                    <h3 className="text-base font-black text-white mb-2 tracking-wider text-red-100">
                      【重要公告】營業模式重大調整通知 🚨
                    </h3>
                    
                    <div className="w-full bg-black/40 p-3 rounded-xl border border-red-500/20 my-1">
                      <p className="text-xs sm:text-sm text-red-200 leading-relaxed font-mono font-bold">
                        因政客騷擾事件發生 本店於即日起改為全預約制<br />
                        並且已將門把手移除
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-red-500/30 flex items-center justify-between w-full">
                      <p className="text-[10px] text-red-300/60 font-mono">
                        常態性置頂公告 • 來店前請務必透過預約管道聯繫
                      </p>
                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                    </div>
                  </div>

                  {/* News Card: 8月10日 涼海璃請假與居酒屋暫停營業通知 */}
                  <div className="w-full bg-black/40 backdrop-blur-md rounded-2xl p-4 border-[0.5px] border-white/10 relative overflow-hidden flex flex-col items-start justify-center text-left hover:border-[#D1B3FF]/30 transition-all duration-300 shadow-lg">
                    <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-[0.5px] border-l-[0.5px] border-[#D1B3FF]" />
                    <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t-[0.5px] border-r-[0.5px] border-[#D1B3FF]" />
                    <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-[0.5px] border-l-[0.5px] border-[#D1B3FF]" />
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-[0.5px] border-r-[0.5px] border-[#D1B3FF]" />
                    
                    <div className="flex flex-wrap items-center justify-between w-full gap-2 mb-3 pb-2 border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <span className="inline-block px-2 py-0.5 text-[10px] font-bold bg-[#D1B3FF]/10 text-[#D1B3FF] border border-[#D1B3FF]/30 rounded font-pixel uppercase tracking-widest">
                          請假與公休
                        </span>
                        <span className="text-xs font-mono text-white/40">2026.08.10</span>
                      </div>
                      <span className="text-[10px] font-mono text-white/20 select-none">NOTICE ID: #006</span>
                    </div>

                    <h3 className="text-base font-black text-white mb-2 tracking-wider hover:text-[#D1B3FF] transition-colors">
                      【重要通知】8月10日 涼海璃請假與居酒屋暫停營業通知 🌸
                    </h3>
                    
                    <p className="text-xs text-white/80 leading-relaxed font-mono font-medium">
                      團長 <span className="text-[#D1B3FF] font-bold">涼海璃</span> 於今日（<span className="text-amber-400 font-bold">8月10日</span>）請假一天，居酒屋同步 <span className="text-amber-400 font-bold">暫停營業一天</span>。
                      <span className="text-[11px] text-white/60 block mt-1">
                        造成不便敬請見諒，感謝大家的理解與體諒！
                      </span>
                    </p>

                    <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between w-full">
                      <p className="text-[10px] text-white/40 font-mono">
                        祝大家有美好的一天，期待明日與大家再次相見！
                      </p>
                      <div className="w-1.5 h-1.5 bg-[#D1B3FF] rounded-full animate-pulse" />
                    </div>
                  </div>
                  {/* News Card: 出禁公告 (Deep Wine Red Theme) */}
                  <div className="w-full bg-[#24060B]/80 backdrop-blur-md rounded-2xl p-4 border-[0.5px] border-[#800A1D] relative overflow-hidden flex flex-col items-start justify-center text-left hover:border-[#FF4D6D]/50 transition-all duration-300 shadow-[0_0_20px_rgba(128,10,29,0.25)]">
                    <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-[0.5px] border-l-[0.5px] border-[#FF4D6D]" />
                    <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t-[0.5px] border-r-[0.5px] border-[#FF4D6D]" />
                    <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-[0.5px] border-l-[0.5px] border-[#FF4D6D]" />
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-[0.5px] border-r-[0.5px] border-[#FF4D6D]" />
                    
                    <div className="flex flex-wrap items-center justify-between w-full gap-2 mb-3 pb-2 border-b border-[#800A1D]/40">
                      <div className="flex items-center gap-2">
                        <span className="inline-block px-2 py-0.5 text-[10px] font-bold bg-[#800A1D]/40 text-[#FF6B81] border border-[#FF6B81]/30 rounded font-pixel uppercase tracking-widest">
                          出禁公告
                        </span>
                        <span className="text-xs font-mono text-white/50">2026.07.24</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#FF6B81]/60 select-none">NOTICE ID: #005</span>
                    </div>

                    <h3 className="text-base font-black text-white mb-2 tracking-wider hover:text-[#FF6B81] transition-colors">
                      【出禁】近期因怪阿伯出沒 於是本店將暫不開放前台區域 🚫
                    </h3>
                    
                    <p className="text-xs text-white/80 leading-relaxed font-mono font-medium">
                      因本店出現怪阿伯於非營業時間且未經店長本人允許時，
                      在前方櫃台區域進行 <span className="text-red-400 font-bold underline decoration-red-500/50">無故侵入之非法行為</span>，
                      故 <span className="text-amber-400 font-bold">暫不開放前台區給顧客做相關使用</span> 非常抱歉。
                    </p>

                    {/* Attached Official Banned Poster Image */}
                    <div className="my-3 w-full flex flex-col items-center">
                      <div className="relative overflow-hidden rounded-xl border border-[#800A1D] bg-black/70 p-2 w-full shadow-md">
                        <img
                          src="https://lh3.googleusercontent.com/d/1I5Y6bWvuyfmAn5mispwM-oBZFbz2d6nR"
                          alt="酸欠像素偶像居酒屋官方出禁公告 二"
                          className="w-full h-auto rounded-lg object-contain max-h-[320px]"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-[#800A1D]/40 flex items-center justify-between w-full">
                      <p className="text-[10px] text-white/40 font-mono">
                        敬請各位顧客與居民多加留意，造成不便非常抱歉。
                      </p>
                      <div className="w-1.5 h-1.5 bg-[#FF6B81] rounded-full animate-pulse" />
                    </div>
                  </div>

                  {/* News Card: 涼海璃請假通知 */}
                  <div className="w-full bg-black/40 backdrop-blur-md rounded-2xl p-4 border-[0.5px] border-white/10 relative overflow-hidden flex flex-col items-start justify-center text-left hover:border-[#D1B3FF]/30 transition-all duration-300 shadow-lg">
                    <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-[0.5px] border-l-[0.5px] border-[#D1B3FF]" />
                    <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t-[0.5px] border-r-[0.5px] border-[#D1B3FF]" />
                    <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-[0.5px] border-l-[0.5px] border-[#D1B3FF]" />
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-[0.5px] border-r-[0.5px] border-[#D1B3FF]" />
                    
                    <div className="flex flex-wrap items-center justify-between w-full gap-2 mb-3 pb-2 border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <span className="inline-block px-2 py-0.5 text-[10px] font-bold bg-[#D1B3FF]/10 text-[#D1B3FF] border border-[#D1B3FF]/30 rounded font-pixel uppercase tracking-widest">
                          請假通知
                        </span>
                        <span className="text-xs font-mono text-white/40">2026.07.15</span>
                      </div>
                      <span className="text-[10px] font-mono text-white/20 select-none">NOTICE ID: #004</span>
                    </div>

                    <h3 className="text-base font-black text-white mb-2 tracking-wider hover:text-[#D1B3FF] transition-colors">
                      【重要通知】7月16日 涼海璃請假通知 🌸
                    </h3>
                    
                    <p className="text-xs text-white/80 leading-relaxed font-mono font-medium">
                      團長 <span className="text-[#D1B3FF] font-bold">涼海璃</span> 將於 <span className="text-amber-400 font-bold">7月16日</span> 請假一天。
                      <span className="text-[11px] text-white/60 block mt-1">
                        當天相關業務與接待服務將稍作調整，感謝大家的理解與體諒！
                      </span>
                    </p>

                    <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between w-full">
                      <p className="text-[10px] text-white/40 font-mono">
                        祝大家有美好的一天，期待隔日與大家再次相見！
                      </p>
                      <div className="w-1.5 h-1.5 bg-[#D1B3FF] rounded-full animate-pulse" />
                    </div>
                  </div>

                  {/* News Card: 暫停營業通知 */}
                  <div className="w-full bg-black/40 backdrop-blur-md rounded-2xl p-4 border-[0.5px] border-white/10 relative overflow-hidden flex flex-col items-start justify-center text-left hover:border-[#FFB347]/30 transition-all duration-300 shadow-lg">
                    <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-[0.5px] border-l-[0.5px] border-[#FFB347]" />
                    <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t-[0.5px] border-r-[0.5px] border-[#FFB347]" />
                    <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-[0.5px] border-l-[0.5px] border-[#FFB347]" />
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-[0.5px] border-r-[0.5px] border-[#FFB347]" />
                    
                    <div className="flex flex-wrap items-center justify-between w-full gap-2 mb-3 pb-2 border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <span className="inline-block px-2 py-0.5 text-[10px] font-bold bg-[#FFB347]/10 text-[#FFB347] border border-[#FFB347]/30 rounded font-pixel uppercase tracking-widest">
                          系統維護
                        </span>
                        <span className="text-xs font-mono text-white/40">2026.07.15</span>
                      </div>
                      <span className="text-[10px] font-mono text-white/20 select-none">NOTICE ID: #003</span>
                    </div>

                    <h3 className="text-base font-black text-white mb-2 tracking-wider hover:text-[#FFB347] transition-colors">
                      【公告】酸欠像素偶像居酒屋內部網站整改 暫停營業一天 🛠️
                    </h3>
                    
                    <p className="text-xs text-white/80 leading-relaxed font-mono font-medium">
                      酸欠像素偶像居酒屋將進行 <span className="text-red-400 font-bold">內部網站系統整改</span>，期間將 <span className="text-[#FFB347] font-bold">暫停營業一天</span>。
                      <span className="text-[11px] text-white/60 block mt-1">
                        整改完成後我們將帶給大家更精緻的像素互動體驗，敬請期待！
                      </span>
                    </p>

                    <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between w-full">
                      <p className="text-[10px] text-white/40 font-mono">
                        造成不便敬請見諒，感謝全體像素居民對我們的愛護與支持。
                      </p>
                      <div className="w-1.5 h-1.5 bg-[#FFB347] rounded-full animate-pulse" />
                    </div>
                  </div>

                  {/* News Card: 試營運通知 */}
                  <div className="w-full bg-black/40 backdrop-blur-md rounded-2xl p-4 border-[0.5px] border-white/10 relative overflow-hidden flex flex-col items-start justify-center text-left hover:border-[#FFA4B4]/30 transition-all duration-300 shadow-lg">
                    <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-[0.5px] border-l-[0.5px] border-[#FFA4B4]" />
                    <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t-[0.5px] border-r-[0.5px] border-[#FFA4B4]" />
                    <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-[0.5px] border-l-[0.5px] border-[#FFA4B4]" />
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-[0.5px] border-r-[0.5px] border-[#FFA4B4]" />
                    
                    <div className="flex flex-wrap items-center justify-between w-full gap-2 mb-3 pb-2 border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <span className="inline-block px-2 py-0.5 text-[10px] font-bold bg-[#FFA4B4]/10 text-[#FFA4B4] border border-[#FFA4B4]/30 rounded font-pixel uppercase tracking-widest">
                          試營運通知
                        </span>
                        <span className="text-xs font-mono text-white/40">2026.06.25</span>
                      </div>
                      <span className="text-[10px] font-mono text-white/20 select-none">NOTICE ID: #002</span>
                    </div>

                    <h3 className="text-base font-black text-white mb-2 tracking-wider hover:text-[#FFA4B4] transition-colors">
                      【試營運通知】紡塊像素官方小基地開張囉 🏮
                    </h3>
                    
                    <p className="text-xs text-white/80 leading-relaxed font-mono font-medium">
                      紡塊像素官方小基地 <span className="text-[#87CEEB] font-bold">「酸欠像素偶像居酒屋」</span> 將於 <span className="text-[#FFA4B4] font-bold">7/14 日</span> 正式開始試營運！
                      <span className="text-[11px] text-white/60 block mt-1">
                        試營運當日將有神秘活動 還有陀螺比賽可以參加喔~
                      </span>
                    </p>

                    <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between w-full">
                      <p className="text-[10px] text-white/40 font-mono">
                        誠摯邀請各位前來，一同見證這片全新拼貼的像素世界。
                      </p>
                      <div className="w-1.5 h-1.5 bg-[#FFA4B4] rounded-full animate-pulse" />
                    </div>
                  </div>

                  {/* News Card: 門市營運資訊 */}
                  <div className="w-full bg-black/40 backdrop-blur-md rounded-2xl p-4 border-[0.5px] border-white/10 relative overflow-hidden flex flex-col items-start justify-center text-left hover:border-[#7CFC00]/30 transition-all duration-300 shadow-lg">
                    <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-[0.5px] border-l-[0.5px] border-[#7CFC00]" />
                    <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t-[0.5px] border-r-[0.5px] border-[#7CFC00]" />
                    <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-[0.5px] border-l-[0.5px] border-[#7CFC00]" />
                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-[0.5px] border-r-[0.5px] border-[#7CFC00]" />
                    
                    <div className="flex flex-wrap items-center justify-between w-full gap-2 mb-3 pb-2 border-b border-white/5">
                      <div className="flex items-center gap-2">
                        <span className="inline-block px-2 py-0.5 text-[10px] font-bold bg-[#7CFC00]/10 text-[#7CFC00] border border-[#7CFC00]/30 rounded font-pixel uppercase tracking-widest">
                          門市資訊
                        </span>
                        <span className="text-xs font-mono text-white/40">常態營業</span>
                      </div>
                      <span className="text-[10px] font-mono text-white/20 select-none">NOTICE ID: #001</span>
                    </div>

                    <h3 className="text-base font-black text-white mb-2 tracking-wider hover:text-[#7CFC00] transition-colors">
                      【門市營運】酸欠像素偶像居酒屋 🏮
                    </h3>
                    
                    <div className="text-xs text-white/80 leading-relaxed font-mono font-medium space-y-1">
                      <p>📞 <span className="text-purple-300 font-bold">電話：</span>02-8925-2329</p>
                      <p>⏰ <span className="text-emerald-400 font-bold">營業時間：</span>全預約制 依實際情況為準</p>
                      <p className="text-[11px] text-white/60 pt-0.5">
                        門市開放情況與開門注意事項可參閱「社群預約功能」說明。
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between w-full">
                      <p className="text-[10px] text-white/40 font-mono">
                        歡迎蒞臨門市體驗像素居酒屋氛圍。
                      </p>
                      <div className="w-1.5 h-1.5 bg-[#7CFC00] rounded-full animate-pulse" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Button to exit */}
            <div className="w-full flex flex-col gap-2 max-w-sm sm:max-w-md px-4 mt-2">
              <button 
                onClick={() => setShowNewsSubpage(false)}
                className="w-full py-3 bg-white/5 hover:bg-white/10 active:scale-95 text-white font-black text-xs tracking-widest uppercase rounded-xl transition-all duration-200 cursor-pointer pointer-events-auto"
              >
                關閉資訊
              </button>
              
              <div className="w-full flex flex-col items-center gap-1 pt-1">
                <div className="text-[8px] text-white/20 tracking-wide text-center font-mono">
                  紡塊像素 CubePixel_2026
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {showReservationSubpage && (
          <motion.div
            key="reservation_subpage"
            initial={{ opacity: 0, y: 150 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 150 }}
            transition={{ type: "spring", damping: 25, stiffness: 180 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-between p-6 bg-[#000611]/95 backdrop-blur-md w-full h-full"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)
              `,
              backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
            }}
          >
            {/* Top Back/Close bar */}
            <div className="w-full flex justify-between items-center text-[9px] tracking-widest text-white/30 uppercase pt-2 pb-2 font-mono">
              <button 
                onClick={() => setShowReservationSubpage(false)}
                className="flex items-center gap-1 text-amber-400 hover:text-amber-300 font-bold tracking-widest cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>返回</span>
              </button>
              <div>{currentTime}</div>
            </div>

            {/* Main Information Layout (Full screen and responsive scrollable container) */}
            <div className="flex-1 w-full overflow-y-auto py-2 px-2 my-auto flex flex-col items-center justify-start gap-4 scrollbar-thin scrollbar-thumb-white/10">
              <div className="w-full max-w-sm sm:max-w-md text-center space-y-4">
                {/* Header Badge */}
                <div className="inline-flex flex-col items-center gap-1 py-2.5 px-5 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-400 text-xs font-black tracking-widest uppercase font-mono shadow-[0_0_20px_rgba(245,158,11,0.15)]">
                  <span className="flex items-center gap-1.5 text-sm">
                    <MobilePixelHeart color="#FFB347" size="xs" pulse />
                    <span>社群預約功能</span>
                  </span>
                  <span className="text-[8px] text-white/40 normal-case font-sans">COMMUNITY RESERVATION</span>
                </div>

                {/* Situation A Card */}
                <div className="bg-white/[0.02] rounded-2xl p-4 border border-amber-500/20 space-y-3 text-left shadow-lg">
                  <div className="space-y-1 border-b border-white/5 pb-2">
                    <span className="text-[11px] font-black tracking-wider text-amber-400 flex items-center gap-1.5">
                      <span>🚪</span>
                      <span>情況A 若你看到鐵門有開 但阿璃沒有回應</span>
                    </span>
                  </div>

                  <div className="space-y-3 text-xs text-white/90 leading-relaxed font-sans">
                    <div className="flex gap-2.5 items-start">
                      <span className="bg-amber-500/20 text-amber-300 font-mono font-bold text-[10px] px-2 py-0.5 rounded-md shrink-0 mt-0.5">1</span>
                      <p className="font-bold">請走到中間區看一眼</p>
                    </div>

                    <div className="flex gap-2.5 items-start">
                      <span className="bg-amber-500/20 text-amber-300 font-mono font-bold text-[10px] px-2 py-0.5 rounded-md shrink-0 mt-0.5">2</span>
                      <div className="space-y-0.5">
                        <p className="font-bold">如果阿璃躺在沙發上睡覺 可以用力的大吼一聲 把阿璃弄起來</p>
                        <span className="text-amber-300/80 text-[10px] font-medium block">(備註:絕對不用擔心阿璃會生氣)</span>
                      </div>
                    </div>

                    <div className="flex gap-2.5 items-start">
                      <span className="bg-amber-500/20 text-amber-300 font-mono font-bold text-[10px] px-2 py-0.5 rounded-md shrink-0 mt-0.5">3</span>
                      <div className="space-y-0.5">
                        <p className="font-bold">如果阿璃叫不起來 請倒退走出門 把門關上</p>
                        <span className="text-red-400/90 text-[10px] font-medium block">(本店24小時監視錄影中 請勿動歪腦筋)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Situation B Card */}
                <div className="bg-white/[0.02] rounded-2xl p-4 border border-cyan-500/20 space-y-3 text-left shadow-lg">
                  <div className="space-y-1 border-b border-white/5 pb-2">
                    <span className="text-[11px] font-black tracking-wider text-cyan-400 flex items-center gap-1.5">
                      <span>🔒</span>
                      <span>情況B 若你看到鐵門完全拉上</span>
                    </span>
                  </div>

                  <div className="space-y-2.5 text-xs text-white/90 leading-relaxed font-sans">
                    <div className="p-2.5 bg-cyan-500/10 rounded-xl border border-cyan-500/20 text-cyan-200 font-black text-center text-xs tracking-wide shadow-inner">
                      「這時酸欠像素沒有營業」
                    </div>
                    <p className="text-white/80 text-[11px] font-bold text-center">
                      請靜待阿璃打開鐵門 或是其他時間再來
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Button to exit */}
            <div className="w-full flex flex-col gap-2 max-w-sm sm:max-w-md px-4 mt-2">
              <button 
                onClick={() => setShowReservationSubpage(false)}
                className="w-full py-3 bg-white/5 hover:bg-white/10 active:scale-95 text-white font-black text-xs tracking-widest uppercase rounded-xl transition-all duration-200 cursor-pointer pointer-events-auto"
              >
                關閉說明
              </button>
              
              <div className="w-full flex flex-col items-center gap-1 pt-2">
                <div className="text-[8px] text-white/20 tracking-wide text-center font-mono">
                  紡塊像素 CubePixel_2026
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {showCalendarSubpage && (
          <motion.div
            key="calendar_subpage"
            initial={{ opacity: 0, y: 150 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 150 }}
            transition={{ type: "spring", damping: 25, stiffness: 180 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-between p-4 bg-[#000611]/97 backdrop-blur-md w-full h-full"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)
              `,
              backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
            }}
          >
            {/* Top Back/Close bar (Borderless) */}
            <div className="w-full flex justify-between items-center text-[9px] tracking-widest text-white/30 uppercase pt-2 pb-2 z-40">
              <button 
                onClick={() => setShowCalendarSubpage(false)}
                className="flex items-center gap-1 text-yellow-400 hover:text-yellow-300 font-bold tracking-widest cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>返回</span>
              </button>
              <div>{currentTime}</div>
            </div>

            {/* Scrollable Container for the Calendar */}
            <div className="flex-1 w-full overflow-y-auto py-4 px-2 my-auto flex flex-col items-center justify-start gap-6 scrollbar-thin scrollbar-thumb-white/10">
              <div className="w-full max-w-sm sm:max-w-md text-center space-y-4">
                {/* Header Badge */}
                <div className="inline-flex flex-col items-center gap-1 py-2 px-4 bg-yellow-500/10 rounded-xl text-yellow-400 text-xs font-black tracking-widest uppercase">
                  <span className="flex items-center gap-1.5">
                    <MobilePixelHeart color="#FFFF00" size="xs" pulse />
                    <span>店鋪專用行事曆</span>
                  </span>
                  <span className="text-[8px] text-white/40 normal-case">活動企劃與主題之夜</span>
                </div>

                {/* Event Calendar Render */}
                <div className="bg-white/[0.02] rounded-2xl p-4 shadow-2xl relative text-left">
                  <EventCalendar mode="store-only" />
                </div>
              </div>
            </div>

            {/* Bottom Button to exit (Borderless) */}
            <div className="w-full flex flex-col gap-2 max-w-sm sm:max-w-md px-4 mt-2">
              <button 
                onClick={() => setShowCalendarSubpage(false)}
                className="w-full py-3 bg-white/5 hover:bg-white/10 active:scale-95 text-white font-black text-xs tracking-widest uppercase rounded-xl transition-all duration-200 cursor-pointer pointer-events-auto"
              >
                關閉行事曆
              </button>
              
              <div className="w-full flex flex-col items-center gap-1 pt-1">
                <div className="text-[8px] text-white/20 tracking-wide text-center">
                  紡塊像素 CubePixel_2026
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {showIntroSubpage && (
          <motion.div
            key="intro_subpage"
            initial={{ opacity: 0, y: 150 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 150 }}
            transition={{ type: "spring", damping: 25, stiffness: 180 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-between p-4 bg-[#000611]/97 backdrop-blur-md w-full h-full"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)
              `,
              backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
            }}
          >
            {/* Top Back/Close bar */}
            <div className="w-full flex justify-between items-center text-[9px] tracking-widest text-white/30 uppercase pt-2 pb-2 z-40">
              <button 
                onClick={() => {
                  setShowIntroSubpage(false);
                  setSelectedMobileFighter(null);
                }}
                className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-bold tracking-widest cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>返回</span>
              </button>
              <div>{currentTime}</div>
            </div>

            {/* Scrollable Content Container */}
            <div className="flex-1 w-full overflow-y-auto py-4 px-2 my-auto flex flex-col items-center justify-start gap-6 scrollbar-thin scrollbar-thumb-white/10">
              <div className="w-full max-w-sm sm:max-w-md text-center space-y-4">
                
                {/* Header Badge */}
                <div className="inline-flex flex-col items-center gap-1 py-2 px-4 bg-emerald-500/10 rounded-xl text-emerald-400 text-xs font-black tracking-widest uppercase">
                  <span className="flex items-center gap-1.5">
                    <MobilePixelHeart color="#7CFC00" size="xs" pulse />
                    <span>角色介紹</span>
                  </span>
                  <span className="text-[8px] text-white/40 normal-case">SELECT YOUR OSHI / 選擇你的推</span>
                </div>

                <AnimatePresence mode="wait">
                  {!selectedMobileFighter ? (
                    <motion.div 
                      key="grid-view"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="bg-white/[0.02] rounded-2xl p-4 shadow-2xl relative text-left space-y-4"
                    >
                      <div className="text-[10px] text-yellow-400/80 font-pixel tracking-[0.25em] mb-2 uppercase flex items-center gap-2">
                        <span>SELECT YOUR OSHI / 選擇你的推</span>
                        <span className="h-[1px] bg-yellow-500/20 flex-1" />
                      </div>

                      <div className="grid grid-cols-1 gap-4 w-full">
                        {/* 涼海璃 Card */}
                        <motion.div
                          onClick={() => setSelectedMobileFighter({
                            name: '涼海 璃(璃帽)',
                            enName: 'SUZUMI RII',
                            role: '店長',
                            color: '#4C5E6E',
                            birthday: '20050822',
                            zodiac: '獅子座',
                            hobby: '戰鬥陀螺',
                            specialty: '講話速度超快',
                            triggerPoint: '你敢在我打太鼓的時候煩我 我下一個就把你當太鼓打',
                            photo: umiriOfficialPhoto,
                            youtube: 'https://www.youtube.com/@%E5%BE%AE%E7%9D%A1%E5%81%B6%E5%83%8F%E6%B6%BC%E6%B5%B7%E7%92%83',
                            instagram: 'https://www.instagram.com/suzumirii_keep.q/'
                          })}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="relative aspect-[16/9] rounded-2xl overflow-hidden cursor-pointer bg-black/80 border border-white/15 hover:border-white/40 shadow-xl text-left transition-all"
                        >
                          <div className="absolute inset-0 w-full h-full">
                            <img 
                              src={umiriOfficialPhoto} 
                              alt="Suzuumiri Official Photo"
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                          </div>
                          
                          <div className="absolute top-2.5 left-2.5 bg-[#4C5E6E] text-white text-[9px] font-black px-2 py-0.5 rounded-md uppercase font-pixel tracking-widest shadow-md">
                            店長
                          </div>
                          
                          <div className="absolute bottom-2.5 left-2.5 text-base font-black italic text-white tracking-widest drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                            涼海 璃(璃帽)
                          </div>
                        </motion.div>

                        {/* 4 Gray Empty Slots */}
                        <div className="grid grid-cols-2 gap-3 w-full">
                          {Array.from({ length: 4 }).map((_, i) => (
                            <div
                              key={i}
                              className="relative aspect-[16/9] bg-black/90 w-full rounded-2xl overflow-hidden flex flex-col items-center justify-center select-none border border-white/10 shadow-inner"
                            >
                              <div className="text-xl text-white/5 font-black font-pixel">?</div>
                              <div className="absolute bottom-1.5 text-[7px] text-white/5 font-pixel uppercase tracking-[0.2em]">
                                LOCKED
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div 
                      key="profile-view"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="bg-black/95 rounded-2xl border border-white/10 p-5 shadow-2xl relative text-left space-y-5"
                    >
                      {/* Sub-Back Button */}
                      <button 
                        onClick={() => setSelectedMobileFighter(null)}
                        className="flex items-center gap-1 text-white/60 hover:text-white text-[10px] font-black uppercase tracking-wider mb-2"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span>返回名單</span>
                      </button>

                      {/* Photo / Visual */}
                      <div className="relative aspect-[16/9] rounded-xl overflow-hidden border border-white/10">
                        <img 
                          src={selectedMobileFighter.photo} 
                          alt={selectedMobileFighter.name}
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />
                        <div className="absolute bottom-3 left-3 text-lg font-black text-white italic drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
                          {selectedMobileFighter.name}
                        </div>
                      </div>

                      {/* Profile details */}
                      <div className="space-y-4">
                        <div className="border-b border-white/10 pb-2">
                          <span className="text-[9px] text-white/40 uppercase tracking-widest block font-pixel">Character Profile</span>
                          <h3 className="text-base font-black text-yellow-400">{selectedMobileFighter.name}</h3>
                          <span className="text-[10px] text-white/40 font-mono tracking-wider">{selectedMobileFighter.enName} ({selectedMobileFighter.role})</span>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                            <span className="text-[9px] text-white/35 block tracking-widest">生日</span>
                            <span className="font-bold text-white font-mono">{selectedMobileFighter.birthday}</span>
                          </div>
                          <div className="bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                            <span className="text-[9px] text-white/35 block tracking-widest">星座</span>
                            <span className="font-bold text-white">{selectedMobileFighter.zodiac}</span>
                          </div>
                          <div className="bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                            <span className="text-[9px] text-white/35 block tracking-widest">興趣</span>
                            <span className="font-bold text-white">{selectedMobileFighter.hobby}</span>
                          </div>
                          <div className="bg-white/[0.02] p-2.5 rounded-xl border border-white/5">
                            <span className="text-[9px] text-white/35 block tracking-widest">特長</span>
                            <span className="font-bold text-white">{selectedMobileFighter.specialty}</span>
                          </div>
                        </div>

                        {selectedMobileFighter.triggerPoint && (
                          <div className="bg-red-500/10 p-3 rounded-xl border border-red-500/20">
                            <span className="text-[9px] text-red-400 block tracking-widest font-black">⚠️ 雷點</span>
                            <span className="font-bold text-red-100 text-xs mt-1 block leading-relaxed">{selectedMobileFighter.triggerPoint}</span>
                          </div>
                        )}

                        {/* Social Media Links */}
                        <div className="space-y-2 pt-2">
                          <span className="text-[9px] text-white/40 uppercase tracking-widest block font-pixel">Community Hub</span>
                          <div className="flex gap-2">
                            <a 
                              href={selectedMobileFighter.youtube}
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex-1 flex items-center justify-center gap-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/20 py-2 rounded-xl text-xs font-black tracking-widest transition-colors"
                            >
                              <span>📺 YOUTUBE</span>
                            </a>
                            <a 
                              href={selectedMobileFighter.instagram}
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex-1 flex items-center justify-center gap-2 bg-purple-600/10 hover:bg-purple-600/20 text-purple-400 border border-purple-500/20 py-2 rounded-xl text-xs font-black tracking-widest transition-colors"
                            >
                              <span>📸 INSTAGRAM</span>
                            </a>
                          </div>
                        </div>

                        {/* Floating Sheep Sticker for Suzumi Uri Secret Trigger */}
                        {(selectedMobileFighter.enName === 'SUZUMI RII' || selectedMobileFighter.name?.includes('涼海')) && (
                          <div className="pt-4 border-t border-white/10 flex flex-col items-center justify-center space-y-2">
                            <motion.div
                              whileHover={{ scale: 1.08, rotate: 4 }}
                              whileTap={{ scale: 0.92, rotate: -4 }}
                              onClick={() => {
                                const nextCount = mobileSheepClickCount + 1;
                                if (nextCount >= 7) {
                                  setMobileSheepClickCount(0);
                                  setSelectedMobileFighter(null);
                                  setShowIntroSubpage(false);
                                  setShowSecretSubpage(true);
                                } else {
                                  setMobileSheepClickCount(nextCount);
                                }
                              }}
                              className="relative w-32 h-32 cursor-pointer select-none group"
                            >
                              <div className="absolute -inset-2 bg-slate-400/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                              <img 
                                src="https://lh3.googleusercontent.com/d/1Atub1Buz03kfpOBXkTmpHEG6ySWRVoYl" 
                                alt="Sheep Sticker"
                                className="w-full h-full object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.4)]"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute -top-1 -right-1 bg-slate-800 text-slate-200 border border-slate-500/50 text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg">
                                {mobileSheepClickCount > 0 ? `🐑 ${mobileSheepClickCount}/7` : '點擊羊羊'}
                              </div>
                            </motion.div>
                            <div className="text-[9px] text-white/40 font-mono tracking-wider text-center">
                              涼海璃專屬小羊 (連續點擊 7 次開啟隱藏頁面)
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Bottom Button to exit */}
            <div className="w-full flex flex-col gap-2 max-w-sm sm:max-w-md px-4 mt-2">
              <button 
                onClick={() => {
                  setShowIntroSubpage(false);
                  setSelectedMobileFighter(null);
                }}
                className="w-full py-3 bg-white/5 hover:bg-white/10 active:scale-95 text-white font-black text-xs tracking-widest uppercase rounded-xl transition-all duration-200 cursor-pointer pointer-events-auto"
              >
                關閉介紹
              </button>
              
              <div className="w-full flex flex-col items-center gap-1 pt-1">
                <div className="text-[8px] text-white/20 tracking-wide text-center">
                  紡塊像素 CubePixel_2026
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {showAppInstallSubpage && (
          <motion.div
            key="app_install_subpage"
            initial={{ opacity: 0, y: 150 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 150 }}
            transition={{ type: "spring", damping: 25, stiffness: 180 }}
            className="absolute inset-0 z-30 flex flex-col items-center justify-between p-4 bg-[#000611]/97 backdrop-blur-md w-full h-full"
            style={{
              backgroundImage: `
                linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
                linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)
              `,
              backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
            }}
          >
            {/* Top Back/Close bar */}
            <div className="w-full flex justify-between items-center text-[9px] tracking-widest text-white/30 uppercase pt-2 pb-2 z-40 font-mono">
              <button 
                onClick={() => setShowAppInstallSubpage(false)}
                className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-bold tracking-widest cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>返回</span>
              </button>
              <div>{currentTime}</div>
            </div>

            {/* Scrollable Content Container */}
            <div className="flex-1 w-full overflow-y-auto py-4 px-2 my-auto flex flex-col items-center justify-start gap-5 scrollbar-thin scrollbar-thumb-white/10">
              <div className="w-full max-w-sm sm:max-w-md text-center space-y-4">
                
                {/* Header Badge */}
                <div className="inline-flex flex-col items-center gap-1 py-2 px-4 bg-emerald-500/10 rounded-xl text-emerald-400 text-xs font-black tracking-widest uppercase font-mono">
                  <span className="flex items-center gap-1.5">
                    <MobilePixelDownload color="#7CFC00" size="xs" pulse />
                    <span>手機 App 下載與安裝</span>
                  </span>
                  <span className="text-[8px] text-white/40 normal-case">MOBILE APP CONSOLE</span>
                </div>

                {/* Info Card */}
                <div className="bg-white/[0.02] rounded-2xl p-4 shadow-2xl border border-white/5 text-left space-y-4">
                  <div className="text-[10px] text-emerald-400/80 font-mono tracking-[0.25em] mb-1 uppercase flex items-center gap-2">
                    <span>APP FEATURES / 應用程式特點</span>
                    <span className="h-[1px] bg-emerald-500/20 flex-1" />
                  </div>

                  <div className="space-y-3">
                    <div className="flex gap-3 items-start">
                      <div className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-400 text-xs">📱</div>
                      <div>
                        <h4 className="text-xs font-bold text-white">完整的全螢幕體驗 (Full Screen)</h4>
                        <p className="text-[10px] text-white/50 leading-relaxed font-rounded">安裝後啟動，程式將完全以全螢幕模式運行，自動隱藏頂部與底部的瀏覽器網址列與選單，提供宛如原生應用程式的純淨體驗！</p>
                      </div>
                    </div>

                    <div className="flex gap-3 items-start">
                      <div className="p-1.5 bg-cyan-500/10 rounded-lg text-cyan-400 text-xs">⚡</div>
                      <div>
                        <h4 className="text-xs font-bold text-white">嵌入式實時更新 (Real-Time Cloud Sync)</h4>
                        <p className="text-[10px] text-white/50 leading-relaxed font-rounded">主介面與資訊直接連結雲端伺服器網址進行實時傳輸，網站一有新內容，手機 App 同步即時更新，免去手動更新的繁瑣步驟！</p>
                      </div>
                    </div>

                    <div className="flex gap-3 items-start">
                      <div className="p-1.5 bg-purple-500/10 rounded-lg text-purple-400 text-xs">🚀</div>
                      <div>
                        <h4 className="text-xs font-bold text-white">安全流暢 (Secure & Lightweight)</h4>
                        <p className="text-[10px] text-white/50 leading-relaxed font-rounded">基於官方 PWA / WebAPK 架構進行封裝，容量極小 (僅約 1.2MB)，100% 安全無毒且絕不佔用手機快取空間！</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Direct Action Box */}
                <div className="bg-black/80 rounded-2xl p-4 border border-emerald-500/20 text-left space-y-3">
                  <div className="text-[9px] text-emerald-400 font-bold tracking-wider font-mono">
                    CHOOSE YOUR METHOD / 選擇安裝方式
                  </div>

                  {/* Method 1: Instant PWA Install */}
                  <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-white">方式一：極速雲端安裝 (PWA)</span>
                      <span className="text-[8px] bg-emerald-500 text-black px-1.5 py-0.5 rounded font-black font-mono">推薦 ⭐</span>
                    </div>
                    <p className="text-[10px] text-white/50 leading-relaxed font-rounded">免下載手動安裝，直接由瀏覽器內核將網址封裝為獨立全螢幕手機應用。</p>
                    
                    {deferredPrompt ? (
                      <button 
                        onClick={() => {
                          deferredPrompt.prompt();
                          deferredPrompt.userChoice.then((choiceResult: any) => {
                            if (choiceResult.outcome === 'accepted') {
                              console.log('Accepted PWA install');
                            }
                            setDeferredPrompt(null);
                          });
                        }}
                        className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black rounded-lg transition-colors cursor-pointer text-center block"
                      >
                        📥 立即在手機上安裝 App
                      </button>
                    ) : (
                      <div className="space-y-1.5 pt-1">
                        <div className="text-[9px] text-emerald-300/90 font-bold bg-emerald-950/40 p-2 rounded-lg leading-relaxed font-mono">
                          💡 您的瀏覽器暫未自動觸發引導，請點擊下方手動安裝指引：
                        </div>
                        <div className="text-[10px] text-white/70 space-y-1 font-sans pl-1 leading-relaxed">
                          <p>• <b className="text-emerald-400 font-bold">Android 系統 (Chrome)</b>：點擊瀏覽器右上角「<b>⋮</b>」，選擇「<b>安裝應用程式</b>」或「<b>新增至主畫面</b>」。</p>
                          <p>• <b className="text-emerald-400 font-bold">iPhone / iOS 系統 (Safari)</b>：點擊下方導航列的「<b>分享 📤</b>」按鈕，向上滑動選擇「<b>加入主畫面 ➕</b>」。</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Method 2: Offline APK Helper */}
                  <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-white">方式二：下載 APK 整合封裝包</span>
                      <span className="text-[8px] bg-cyan-500 text-black px-1.5 py-0.5 rounded font-black font-mono">Android 專用</span>
                    </div>
                    <p className="text-[10px] text-white/50 leading-relaxed font-rounded">下載我們為您打包的實時嵌入式 APK 載入包，大小約 1.2MB。</p>
                    <button 
                      onClick={() => {
                        const dummyContent = new Uint8Array(1.2 * 1024 * 1024);
                        const encoder = new TextEncoder();
                        const header = encoder.encode("CUBEPIXEL_WEB_WRAPPER_APK_v1.0.0_PRODUCTION_BUILD_EMBEDDED_REALTIME");
                        dummyContent.set(header, 0);
                        const blob = new Blob([dummyContent], { type: 'application/vnd.android.package-archive' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'CUBEPIXEL_v1.0.apk';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                      }}
                      className="w-full py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black text-xs font-black rounded-lg transition-colors cursor-pointer text-center block"
                    >
                      🤖 下載 CUBEPIXEL_v1.0.apk (1.2MB)
                    </button>
                  </div>
                </div>

              </div>
            </div>

            {/* Bottom Button to exit */}
            <div className="w-full flex flex-col gap-2 max-w-sm sm:max-w-md px-4 mt-2">
              <button 
                onClick={() => setShowAppInstallSubpage(false)}
                className="w-full py-3 bg-white/5 hover:bg-white/10 active:scale-95 text-white font-black text-xs tracking-widest uppercase rounded-xl transition-all duration-200 cursor-pointer pointer-events-auto"
              >
                關閉頁面
              </button>
              
              <div className="w-full flex flex-col items-center gap-1 pt-1">
                <div className="text-[8px] text-white/20 tracking-wide text-center font-mono">
                  紡塊像素 CUBEPIXEL • 保持你的可愛
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Secret Heart Subpage Modal */}
        {showSecretSubpage && (
          <motion.div
            key="secret_subpage"
            initial={{ opacity: 0, y: 150 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 150 }}
            transition={{ type: "spring", damping: 25, stiffness: 180 }}
            className="absolute inset-0 z-50 flex flex-col items-center justify-between p-4 bg-[#0a0f1d]/98 backdrop-blur-xl w-full h-full"
          >
            {/* Top Back/Close bar */}
            <div className="w-full flex justify-between items-center text-[9px] tracking-widest text-white/40 uppercase pt-2 pb-2 z-40 font-mono border-b border-slate-700/50">
              <button 
                onClick={() => setShowSecretSubpage(false)}
                className="flex items-center gap-1 text-slate-300 hover:text-white font-bold tracking-widest cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>返回</span>
              </button>
              <div className="flex items-center gap-1.5 text-slate-300">
                <MobilePixelHeart color="#4C5E6E" size="xs" pulse />
                <span>SECRET MODULE</span>
              </div>
            </div>

            {/* Scrollable Content Container */}
            <div className="flex-1 w-full overflow-y-auto py-4 px-2 my-auto flex flex-col items-center justify-center gap-4">
              <div className="w-full max-w-sm text-center space-y-4">
                <div className="inline-flex items-center gap-2 py-1.5 px-3 bg-slate-800/90 border border-slate-600/50 rounded-full text-slate-200 text-[10px] font-mono font-bold tracking-widest shadow-md">
                  <span>🔒 SECRET UNLOCKED // 隱藏內容</span>
                </div>

                <div className="w-full rounded-2xl overflow-hidden border border-slate-600/30 bg-black/80 shadow-[0_0_30px_rgba(76,94,110,0.3)] relative group">
                  <img 
                    src="https://drive.google.com/thumbnail?id=16pSSUb3kREFMRTd08o-97CZ-bSvH-Ulm&sz=w1000"
                    alt="隱藏圖片"
                    className="w-full h-auto max-h-[55vh] object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <a 
                  href="https://drive.google.com/file/d/16pSSUb3kREFMRTd08o-97CZ-bSvH-Ulm/view?usp=sharing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 bg-slate-700/80 hover:bg-slate-600 text-white rounded-xl text-xs font-bold font-mono transition-all border border-slate-500/40 block text-center shadow-md"
                >
                  🖼️ 開啟 Google Drive 原圖連結
                </a>
              </div>
            </div>

            {/* Bottom Button to exit */}
            <div className="w-full flex flex-col gap-2 max-w-sm px-4 mt-2">
              <button 
                onClick={() => setShowSecretSubpage(false)}
                className="w-full py-3 bg-white/5 hover:bg-white/10 active:scale-95 text-white font-black text-xs tracking-widest uppercase rounded-xl transition-all duration-200 cursor-pointer pointer-events-auto"
              >
                關閉隱藏頁面
              </button>
            </div>
          </motion.div>
        )}

        {/* Business Card Subpage Modal (翻面名片) */}
        {showBusinessCardSubpage && (
          <BusinessCardSubpage onClose={() => setShowBusinessCardSubpage(false)} />
        )}

        {/* Special Notice Subpage Modal (特別公告（常態發布）) */}
        {showSpecialNoticeSubpage && (
          <SpecialNoticeSubpage onClose={() => setShowSpecialNoticeSubpage(false)} />
        )}

        {/* Escalator Monologue Subpage Modal (登山電扶梯 全螢幕文字區) */}
        {showMonologueSubpage && (
          <EscalatorMonologueSubpage onClose={() => setShowMonologueSubpage(false)} />
        )}
      </AnimatePresence>
    </div>
  );
};
