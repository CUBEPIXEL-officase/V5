const fs = require('fs');
const { execSync } = require('child_process');

function loadImageRGBA(pngPath) {
  const [w, h] = execSync(`identify -format '%w %h' ${pngPath}`).toString().trim().split(' ').map(Number);
  const raw = execSync(`convert ${pngPath} -depth 8 rgba:-`, { maxBuffer: 64 * 1024 * 1024 });
  return { w, h, data: raw };
}

function saveImageRGBA(w, h, data, outPath, maxHeight = 1024) {
  const tmpRaw = outPath + '.raw';
  fs.writeFileSync(tmpRaw, data);
  execSync(`convert -size ${w}x${h} -depth 8 rgba:${tmpRaw} -trim +repage -resize x${maxHeight} -alpha on ${outPath}`);
  fs.unlinkSync(tmpRaw);
}

function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], yi = poly[i][1];
    const xj = poly[j][0], yj = poly[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-9) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function distToPoly(x, y, poly) {
  let minD2 = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const ax = poly[j][0], ay = poly[j][1];
    const bx = poly[i][0], by = poly[i][1];
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy + 1e-9;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / len2));
    const px = ax + t * dx, py = ay + t * dy;
    const d2 = (x - px) * (x - px) + (y - py) * (y - py);
    if (d2 < minD2) minD2 = d2;
  }
  return Math.sqrt(minD2);
}

function applyPolyMask(img, poly, feather = 2.0, postPixelFn = null) {
  const { w, h, data } = img;
  const out = Buffer.from(data);
  let minX = w, maxX = 0, minY = h, maxY = 0;
  for (const [px, py] of poly) {
    if (px < minX) minX = Math.floor(px - feather - 2);
    if (px > maxX) maxX = Math.ceil(px + feather + 2);
    if (py < minY) minY = Math.floor(py - feather - 2);
    if (py > maxY) maxY = Math.ceil(py + feather + 2);
  }
  minX = Math.max(0, minX); maxX = Math.min(w - 1, maxX);
  minY = Math.max(0, minY); maxY = Math.min(h - 1, maxY);

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const idx = (y * w + x) * 4;
      if (x < minX || x > maxX || y < minY || y > maxY) {
        out[idx + 3] = 0;
        continue;
      }
      const inside = pointInPoly(x, y, poly);
      const d = distToPoly(x, y, poly);
      let alpha = 0;
      if (inside) {
        alpha = d >= feather ? 255 : Math.round(255 * Math.min(1, 0.5 + (d / feather) * 0.5));
      } else {
        alpha = d < feather ? Math.round(255 * Math.max(0, 0.5 - (d / feather) * 0.5)) : 0;
      }
      out[idx + 3] = alpha;
      if (alpha > 0 && postPixelFn) {
        postPixelFn(x, y, out, idx);
      }
    }
  }
  return { w, h, data: out };
}

// 1. Stand 1: "FAV IDOL" Pink Tracksuit Suzumi Su (tightened around hair/shoulders/legs)
console.log('Processing Stand 1...');
const s1 = loadImageRGBA('.tmp_refs/crop_stand1.png');
const poly1 = [
  [126, 126], [150, 126], [178, 174], [228, 286], [280, 392], [318, 444],
  [368, 434], [386, 368], [454, 332], [510, 344], [546, 392], [574, 474],
  [596, 540], [628, 566], [674, 630], [712, 706], [724, 756], [674, 818],
  [598, 854], [576, 896], [562, 956], [576, 1050], [596, 1140], [622, 1300],
  [664, 1480], [708, 1650], [716, 1692], [726, 1738], [708, 1768], [652, 1775],
  [594, 1756], [614, 1694], [552, 1500], [478, 1320], [425, 1175], [398, 1340],
  [378, 1520], [364, 1680], [366, 1750], [326, 1772], [274, 1762], [262, 1720],
  [272, 1670], [254, 1490], [244, 1290], [248, 1120], [276, 980], [286, 864],
  [266, 820], [312, 745], [312, 675], [278, 576], [266, 480], [216, 354],
  [152, 224], [116, 165], [116, 136]
];
const out1 = applyPolyMask(s1, poly1, 2.5, (x, y, buf, idx) => {
  // Trim blue base rim bleed right around very bottom of shoes
  if (y > 1730) {
    const r = buf[idx], g = buf[idx + 1], b = buf[idx + 2];
    if (b - r > 28 && lum(r, g, b) > 105) {
      buf[idx + 3] = 0;
    }
  }
});
function lum(r, g, b) { return 0.299 * r + 0.587 * g + 0.114 * b; }
saveImageRGBA(out1.w, out1.h, out1.data, 'public/assets/acry_su_favidol.png', 1024);

// 2. Stand 2: "Beginning" School Uniform (clean shoulder contour, zero blue-pen SHIKO text, clean tapered legs/socks/shoes)
console.log('Processing Stand 2...');
const s2 = loadImageRGBA('.tmp_refs/crop_stand2.png');
const poly2 = [
  [565, 28], [616, 42], [650, 98], [654, 180], [638, 246], [718, 272],
  [766, 318], [798, 435], [800, 530], [752, 616], [724, 650], [758, 765],
  [770, 916], [748, 1022], [638, 1044], [610, 1150], [590, 1330], [574, 1465],
  [552, 1502], [468, 1502], [454, 1460], [442, 1340], [430, 1200], [434, 1110],
  [398, 1034], [408, 840], [422, 776], [262, 768], [242, 738], [282, 580],
  [344, 420], [362, 326], [420, 286], [492, 260], [462, 225], [456, 140],
  [488, 60], [532, 30]
];
const out2 = applyPolyMask(s2, poly2, 2.5, (x, y, buf, idx) => {
  // Remove blue pen diagonal overlap cleanly from skirt bottom right & right leg
  const penCenterX = 768 - (y - 800) * 0.62;
  if (y > 880 && y < 1435 && x > penCenterX - 58) {
    if (y < 1032) {
      // Plaid gray/cream skirt fill matching neighbors
      const plaid = ((Math.floor(x / 18) + Math.floor(y / 22)) % 2 === 0) ? 202 : 178;
      buf[idx] = plaid; buf[idx + 1] = plaid; buf[idx + 2] = plaid + 4;
    } else if (y < 1225) {
      // Skin thigh tone
      const shade = 1.0 - Math.abs(x - 535) / 140 * 0.12;
      buf[idx] = Math.round(212 * shade); buf[idx + 1] = Math.round(176 * shade); buf[idx + 2] = Math.round(160 * shade);
    } else if (y < 1415) {
      // White knee sock
      const shade = 1.0 - Math.abs(x - 525) / 130 * 0.10;
      buf[idx] = Math.round(224 * shade); buf[idx + 1] = Math.round(228 * shade); buf[idx + 2] = Math.round(236 * shade);
    }
  }
  // Remove any remaining cyan-blue glint on skirt right hem
  if (y > 870 && y < 1050 && x > 620) {
    const r = buf[idx], b = buf[idx + 2];
    if (b - r > 18) {
      buf[idx] = 194; buf[idx + 1] = 192; buf[idx + 2] = 198;
    }
  }
});
saveImageRGBA(out2.w, out2.h, out2.data, 'public/assets/acry_su_beginning.png', 1024);

// 3. Stand 2 Mini Front Standee: tight outline around cloud + blue pen (no skin bleed or black border)
console.log('Processing Stand 2 Nameplate...');
const poly2Name = [
  [104, 1430], [84, 1358], [116, 1286], [202, 1244], [306, 1220], [402, 1252],
  [446, 1284], [472, 1244], [768, 816], [818, 756], [856, 756], [866, 786],
  [824, 848], [520, 1292], [476, 1368], [456, 1428], [358, 1502], [224, 1502], [148, 1472]
];
const out2Name = applyPolyMask(s2, poly2Name, 2.0, (x, y, buf, idx) => {
  const r = buf[idx], g = buf[idx + 1], b = buf[idx + 2];
  if (r > 175 && g > 175 && b > 175 && Math.abs(r - b) < 22) {
    buf[idx] = Math.min(255, Math.round(r * 1.07));
    buf[idx + 1] = Math.min(255, Math.round(g * 1.07));
    buf[idx + 2] = Math.min(255, Math.round(b * 1.07));
  }
});
saveImageRGBA(out2Name.w, out2Name.h, out2Name.data, 'public/assets/acry_su_beginning_name.png', 768);

// 4. Stand 3: "わたし色に染まれ" Idol Dress (tighter neck/shoulder/waist/arm gaps + natural dual-leg silhouette!)
console.log('Processing Stand 3...');
const s3 = loadImageRGBA('.tmp_refs/crop_stand3.png');
const poly3 = [
  [775, 132], [852, 150], [928, 240], [944, 345], [906, 435], [872, 475],
  [976, 512], [1096, 578], [1144, 695], [1116, 805], [1132, 875], [1135, 958],
  [1092, 1010], [1046, 988], [1062, 1075], [1112, 1265], [1152, 1450], [1155, 1518],
  [916, 1542], [862, 1555], [848, 1745], [826, 1940], [790, 2110], [774, 2185],
  [714, 2185], [728, 1980], [748, 1740], [750, 1565],
  [736, 1740], [716, 1980], [696, 2185], [634, 2185], [624, 2000], [616, 1760],
  [614, 1542], [358, 1516], [356, 1465], [400, 1280], [450, 1075], [430, 1015],
  [422, 915], [442, 795], [432, 675], [478, 578], [608, 510], [708, 475],
  [678, 425], [662, 315], [632, 280], [660, 215], [688, 168], [728, 134]
];
const out3 = applyPolyMask(s3, poly3, 2.5, (x, y, buf, idx) => {
  // Smooth clean thigh/sock/shoe rendering for left leg occluded by crest in photo (y >= 1538, x < 752)
  if (y >= 1538 && x < 752) {
    const legCenterX = 678 - Math.max(0, y - 1650) * 0.015;
    const dxNorm = (x - legCenterX) / 56;
    const cylShade = Math.max(0.84, 1.0 - dxNorm * dxNorm * 0.16);
    if (y < 1685) {
      buf[idx] = Math.round(216 * cylShade);
      buf[idx + 1] = Math.round(178 * cylShade);
      buf[idx + 2] = Math.round(164 * cylShade);
    } else if (y < 2115) {
      buf[idx] = Math.round(230 * cylShade);
      buf[idx + 1] = Math.round(234 * cylShade);
      buf[idx + 2] = Math.round(244 * cylShade);
    } else {
      buf[idx] = Math.round(235 * cylShade);
      buf[idx + 1] = Math.round(238 * cylShade);
      buf[idx + 2] = Math.round(245 * cylShade);
    }
  }
  if (y >= 2115 && x >= 752) {
    buf[idx] = 232;
    buf[idx + 1] = 235;
    buf[idx + 2] = 242;
  }
});
saveImageRGBA(out3.w, out3.h, out3.data, 'public/assets/acry_su_watashi.png', 1024);

// 5. Stand 3 Mini Front Crest Standee: tighter ribbon wing outline + crystal-clear emblem interior
console.log('Processing Stand 3 Crest...');
const poly3Crest = [
  [392, 1622], [458, 1622], [528, 1714], [642, 1806], [744, 1955], [760, 2075],
  [788, 2118], [780, 2218], [692, 2248], [568, 2236], [435, 2224], [302, 2236],
  [184, 2248], [78, 2218], [74, 2118], [102, 2075], [114, 1950], [218, 1800],
  [328, 1716]
];
const out3Crest = applyPolyMask(s3, poly3Crest, 2.0, (x, y, buf, idx) => {
  const r = buf[idx], g = buf[idx + 1], b = buf[idx + 2];
  const L = lum(r, g, b);
  const isBlue = (b - r > 18) && L > 105;
  const isPink = (r - g > 14 && b - g > 10 && L > 145);
  const isWhiteInk = L > 188 && Math.abs(r - b) < 30;
  // Clear out dark background inside emblem AND dark black corners around bottom ribbon
  if (y < 2110) {
    if (!isBlue && !isWhiteInk) {
      if (L < 168) {
        buf[idx + 3] = 0;
      } else {
        buf[idx + 3] = Math.round(255 * Math.min(1, (L - 168) / 22));
      }
    }
  } else {
    // Bottom SUZUMI SU ribbon zone: strip pure dark background corners around ribbon wings
    if (L < 85 && !isBlue && !isPink) {
      buf[idx + 3] = 0;
    }
  }
});
saveImageRGBA(out3Crest.w, out3Crest.h, out3Crest.data, 'public/assets/acry_su_watashi_crest.png', 768);

console.log('All 5 acrylic cutout assets updated!');
