import { ThumbnailConfig, ThumbnailAspectRatio } from './types';

export function getThumbnailResolution(ratio: ThumbnailAspectRatio): { width: number; height: number } {
  switch (ratio) {
    case '16:9':
      return { width: 1920, height: 1080 };
    case '9:16':
      return { width: 1080, height: 1920 };
    case '1:1':
    default:
      return { width: 1200, height: 1200 };
  }
}

/**
 * Procedural Viral YouTube / Social Thumbnail Engine
 * Generates broadcast-grade 1080p thumbnails locally with zero APIs.
 */
export function renderThumbnailToCanvas(
  canvas: HTMLCanvasElement,
  config: ThumbnailConfig
): void {
  const { width, height } = getThumbnailResolution(config.aspectRatio);
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Clear
  ctx.clearRect(0, 0, width, height);

  // 1. Draw Background & Lighting
  drawThumbnailBackground(ctx, config, width, height);

  // 2. Draw Optional Hero Character / Motif
  if (config.heroCharacter && config.heroCharacter !== 'none') {
    drawThumbnailHero(ctx, config, width, height);
  }

  // 3. Draw High-Impact Viral Typography & Badges
  drawThumbnailTypography(ctx, config, width, height);

  // 4. Draw Sticker / Emoji Badge
  if (config.stickerEmoji) {
    drawStickerBadge(ctx, config, width, height);
  }

  // 5. Draw Cinematic Vignette & Outer Glow
  if (config.showVignette) {
    drawVignette(ctx, width, height);
  }
  if (config.showBorderGlow) {
    drawBorderGlow(ctx, config, width, height);
  }
}

export function renderThumbnailToDataUrl(config: ThumbnailConfig): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  renderThumbnailToCanvas(canvas, config);
  return canvas.toDataURL('image/png', 0.95);
}

/* ========================================================================= */
/* BACKGROUND DRAWING                                                        */
/* ========================================================================= */
function drawThumbnailBackground(
  ctx: CanvasRenderingContext2D,
  config: ThumbnailConfig,
  width: number,
  height: number
) {
  const { template, primaryColor, accentColor } = config;

  if (template === 'sports-gold') {
    // Stadium Floodlights & Golden Pitch Atmosphere
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, '#061A12');
    bg.addColorStop(0.6, '#0B291D');
    bg.addColorStop(1, '#020D08');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Glowing stadium floodlights left & right
    drawLightBeam(ctx, 120, 0, width * 0.45, height, '#FDE047', 0.35);
    drawLightBeam(ctx, width - 120, 0, width * 0.55, height, '#38BDF8', 0.3);

    // Golden ambient center glow
    const orb = ctx.createRadialGradient(width * 0.65, height * 0.4, 20, width * 0.65, height * 0.4, width * 0.45);
    orb.addColorStop(0, 'rgba(250, 204, 21, 0.4)');
    orb.addColorStop(1, 'transparent');
    ctx.fillStyle = orb;
    ctx.fillRect(0, 0, width, height);
    return;
  }

  if (template === 'gospel-divine') {
    // Sacred Heavenly Dawn & Divine Sunburst
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, '#1E1B4B');
    bg.addColorStop(0.5, '#312E81');
    bg.addColorStop(1, '#0F0E2A');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Golden divine rays
    const rays = 18;
    ctx.fillStyle = 'rgba(251, 191, 36, 0.12)';
    for (let i = 0; i < rays; i++) {
      const a1 = (i / rays) * Math.PI * 2;
      const a2 = ((i + 0.5) / rays) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(width * 0.7, height * 0.35);
      ctx.lineTo(width * 0.7 + Math.cos(a1) * width * 1.5, height * 0.35 + Math.sin(a1) * height * 1.5);
      ctx.lineTo(width * 0.7 + Math.cos(a2) * width * 1.5, height * 0.35 + Math.sin(a2) * height * 1.5);
      ctx.closePath();
      ctx.fill();
    }
    return;
  }

  if (template === 'shock-youtube' || template === 'bold-gamer') {
    // High-energy split contrast (Dark Noir vs Shock Red/Cyan)
    const bg = ctx.createRadialGradient(width * 0.65, height * 0.45, 50, width * 0.5, height * 0.5, width * 0.8);
    bg.addColorStop(0, accentColor);
    bg.addColorStop(0.5, primaryColor);
    bg.addColorStop(1, '#05070E');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Action speed lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 3;
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(width * 0.65 + Math.cos(angle) * 100, height * 0.45 + Math.sin(angle) * 100);
      ctx.lineTo(width * 0.65 + Math.cos(angle) * width, height * 0.45 + Math.sin(angle) * width);
      ctx.stroke();
    }
    return;
  }

  if (template === 'comic-pop') {
    // Comic Halftone Dots & Starburst
    ctx.fillStyle = primaryColor;
    ctx.fillRect(0, 0, width, height);

    // Halftone dots in background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.06)';
    const spacing = 36;
    for (let x = 0; x < width; x += spacing) {
      for (let y = 0; y < height; y += spacing) {
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    return;
  }

  // Default Documentary Noir & Ancient Mystery
  const bg = ctx.createRadialGradient(width * 0.6, height * 0.4, 30, width * 0.5, height * 0.5, width * 0.7);
  bg.addColorStop(0, accentColor + '44');
  bg.addColorStop(0.5, primaryColor);
  bg.addColorStop(1, '#020306');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);
}

function drawLightBeam(
  ctx: CanvasRenderingContext2D,
  x1: number, y1: number,
  x2: number, y2: number,
  color: string,
  alpha: number
) {
  ctx.save();
  const grad = ctx.createLinearGradient(x1, y1, x2, y2);
  grad.addColorStop(0, color);
  grad.addColorStop(1, 'transparent');
  ctx.fillStyle = grad;
  ctx.globalAlpha = alpha;

  ctx.beginPath();
  ctx.moveTo(x1 - 30, y1);
  ctx.lineTo(x1 + 30, y1);
  ctx.lineTo(x2 + 200, y2);
  ctx.lineTo(x2 - 200, y2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/* ========================================================================= */
/* HERO CHARACTER DRAWING                                                    */
/* ========================================================================= */
function drawThumbnailHero(
  ctx: CanvasRenderingContext2D,
  config: ThumbnailConfig,
  width: number,
  height: number
) {
  const { heroCharacter, accentColor } = config;
  const isLandscape = config.aspectRatio === '16:9';
  const hx = isLandscape ? width * 0.72 : width * 0.5;
  const hy = isLandscape ? height * 0.55 : height * 0.62;
  const scale = (isLandscape ? height : width) * 0.0022;

  ctx.save();

  // Hero Backdrop Glow Ring
  const aura = ctx.createRadialGradient(hx, hy - 40 * scale, 30 * scale, hx, hy - 40 * scale, 180 * scale);
  aura.addColorStop(0, accentColor + '88');
  aura.addColorStop(0.6, accentColor + '22');
  aura.addColorStop(1, 'transparent');
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(hx, hy - 40 * scale, 180 * scale, 0, Math.PI * 2);
  ctx.fill();

  // Draw Figure Outline
  ctx.strokeStyle = '#FFFFFF';
  ctx.fillStyle = '#FFFFFF';
  ctx.lineWidth = 14 * scale;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const headRadius = 38 * scale;
  const headY = hy - 170 * scale;
  const hipY = hy - 30 * scale;

  if (heroCharacter === 'soccer') {
    // Dynamic Striker
    // Body
    ctx.beginPath();
    ctx.moveTo(hx, headY + headRadius);
    ctx.lineTo(hx - 30 * scale, hipY);
    ctx.stroke();

    // Kick leg
    ctx.beginPath();
    ctx.moveTo(hx - 30 * scale, hipY);
    ctx.lineTo(hx + 80 * scale, hy - 80 * scale);
    ctx.stroke();

    // Plant leg
    ctx.beginPath();
    ctx.moveTo(hx - 30 * scale, hipY);
    ctx.lineTo(hx - 70 * scale, hy + 70 * scale);
    ctx.stroke();

    // Head
    ctx.beginPath();
    ctx.arc(hx, headY, headRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Flaming Soccer Ball
    const bx = hx + 160 * scale;
    const by = hy - 110 * scale;
    const br = 32 * scale;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Ball Fire Trail
    ctx.fillStyle = '#F59E0B';
    ctx.beginPath();
    ctx.moveTo(bx - br, by);
    ctx.lineTo(bx - 120 * scale, by - 20 * scale);
    ctx.lineTo(bx - 70 * scale, by);
    ctx.lineTo(bx - 130 * scale, by + 20 * scale);
    ctx.lineTo(bx - br, by + br * 0.5);
    ctx.closePath();
    ctx.fill();
  } else if (heroCharacter === 'warrior') {
    // Combat Warrior with Sword
    ctx.beginPath();
    ctx.moveTo(hx, headY + headRadius);
    ctx.lineTo(hx, hipY);
    ctx.stroke();

    // Legs
    ctx.beginPath();
    ctx.moveTo(hx, hipY);
    ctx.lineTo(hx - 70 * scale, hy + 70 * scale);
    ctx.moveTo(hx, hipY);
    ctx.lineTo(hx + 70 * scale, hy + 70 * scale);
    ctx.stroke();

    // Head
    ctx.beginPath();
    ctx.arc(hx, headY, headRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Sword in hand
    ctx.strokeStyle = '#FBBF24';
    ctx.lineWidth = 10 * scale;
    ctx.beginPath();
    ctx.moveTo(hx + 60 * scale, headY - 10 * scale);
    ctx.lineTo(hx + 120 * scale, headY - 140 * scale);
    ctx.stroke();
  } else if (heroCharacter === 'preacher') {
    // Raised hands with divine light
    ctx.beginPath();
    ctx.moveTo(hx, headY + headRadius);
    ctx.lineTo(hx, hipY);
    ctx.stroke();

    // Arms reaching to heaven
    ctx.beginPath();
    ctx.moveTo(hx, headY + headRadius + 20 * scale);
    ctx.lineTo(hx - 70 * scale, headY - 40 * scale);
    ctx.moveTo(hx, headY + headRadius + 20 * scale);
    ctx.lineTo(hx + 70 * scale, headY - 40 * scale);
    ctx.stroke();

    // Head
    ctx.beginPath();
    ctx.arc(hx, headY, headRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  } else {
    // Default Iconic Stickman Pose
    ctx.beginPath();
    ctx.moveTo(hx, headY + headRadius);
    ctx.lineTo(hx, hipY);
    ctx.moveTo(hx, hipY);
    ctx.lineTo(hx - 50 * scale, hy + 70 * scale);
    ctx.moveTo(hx, hipY);
    ctx.lineTo(hx + 50 * scale, hy + 70 * scale);
    ctx.moveTo(hx, headY + headRadius + 20 * scale);
    ctx.lineTo(hx - 60 * scale, hy - 40 * scale);
    ctx.moveTo(hx, headY + headRadius + 20 * scale);
    ctx.lineTo(hx + 60 * scale, hy - 40 * scale);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(hx, headY, headRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

/* ========================================================================= */
/* VIRAL TYPOGRAPHY & BADGES                                                 */
/* ========================================================================= */
function drawThumbnailTypography(
  ctx: CanvasRenderingContext2D,
  config: ThumbnailConfig,
  width: number,
  height: number
) {
  const { headline, subheadline, badgeText, accentColor, textColor, fontSizeMultiplier = 1 } = config;
  const isLandscape = config.aspectRatio === '16:9';

  ctx.save();

  const startX = isLandscape ? 80 : 60;
  let currentY = isLandscape ? height * 0.28 : height * 0.18;

  // 1. Viral Pill Badge (e.g. "EXPOSED", "UNSOLVED", "NEW RECORD")
  if (badgeText) {
    ctx.font = 'bold 32px system-ui, -apple-system, sans-serif';
    const badgeMetrics = ctx.measureText(badgeText.toUpperCase());
    const badgeW = badgeMetrics.width + 44;
    const badgeH = 54;

    ctx.fillStyle = '#EF4444'; // Red viral badge
    ctx.beginPath();
    ctx.roundRect(startX, currentY - 40, badgeW, badgeH, 12);
    ctx.fill();

    // Inner highlight border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(badgeText.toUpperCase(), startX + 22, currentY - 13);

    currentY += 65;
  }

  // 2. High-Impact Headline
  // Split headline into 2-3 punchy lines
  const words = headline.toUpperCase().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';

  const maxWordsPerLine = isLandscape ? 3 : 2;
  for (const w of words) {
    if ((cur + ' ' + w).trim().split(' ').length > maxWordsPerLine && cur) {
      lines.push(cur.trim());
      cur = w;
    } else {
      cur = cur ? `${cur} ${w}` : w;
    }
  }
  if (cur) lines.push(cur.trim());

  const baseFontSize = Math.round((isLandscape ? 96 : 84) * fontSizeMultiplier);
  ctx.font = `900 ${baseFontSize}px Impact, "Arial Black", sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Heavy Black Drop Shadow & Stroke
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 18;
    ctx.lineJoin = 'miter';
    ctx.miterLimit = 2;
    ctx.strokeText(line, startX, currentY);

    // Glow / Secondary outline
    ctx.strokeStyle = '#050505';
    ctx.lineWidth = 10;
    ctx.strokeText(line, startX, currentY);

    // Text Fill Color: alternate yellow and white for maximum viral CTR
    ctx.fillStyle = i === 1 ? '#FDE047' : i === 2 ? accentColor : textColor || '#FFFFFF';
    ctx.fillText(line, startX, currentY);

    currentY += baseFontSize * 1.05;
  }

  // 3. Subheadline Pill / Ribbon
  if (subheadline) {
    currentY += 15;
    ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
    const subMetrics = ctx.measureText(subheadline);
    const subW = subMetrics.width + 36;
    const subH = 56;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.roundRect(startX, currentY, subW, subH, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#F8FAFC';
    ctx.textBaseline = 'middle';
    ctx.fillText(subheadline, startX + 18, currentY + subH / 2);
  }

  ctx.restore();
}

/* ========================================================================= */
/* VIRAL STICKER BADGE                                                       */
/* ========================================================================= */
function drawStickerBadge(
  ctx: CanvasRenderingContext2D,
  config: ThumbnailConfig,
  width: number,
  height: number
) {
  const { stickerEmoji = '🔥', accentColor } = config;
  const isLandscape = config.aspectRatio === '16:9';
  const sx = isLandscape ? width - 130 : width - 110;
  const sy = isLandscape ? 130 : 120;
  const r = 70;

  ctx.save();
  // Circular Glow Badge
  const glow = ctx.createRadialGradient(sx, sy, 20, sx, sy, r * 1.5);
  glow.addColorStop(0, accentColor + 'CC');
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(sx, sy, r * 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Badge Base
  ctx.fillStyle = '#0F172A';
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(sx, sy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Emoji
  ctx.font = '64px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(stickerEmoji, sx, sy + 4);

  ctx.restore();
}

/* ========================================================================= */
/* VIGNETTE & BORDER GLOW                                                    */
/* ========================================================================= */
function drawVignette(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.save();
  const vig = ctx.createRadialGradient(width / 2, height / 2, width * 0.35, width / 2, height / 2, width * 0.75);
  vig.addColorStop(0, 'transparent');
  vig.addColorStop(1, 'rgba(0, 0, 0, 0.75)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function drawBorderGlow(ctx: CanvasRenderingContext2D, config: ThumbnailConfig, width: number, height: number) {
  ctx.save();
  ctx.strokeStyle = config.accentColor;
  ctx.lineWidth = 12;
  ctx.strokeRect(6, 6, width - 12, height - 12);
  ctx.restore();
}

/**
 * Downloads a data URL as an image file in the browser
 */
export function downloadDataUrl(dataUrl: string, filename: string): void {
  if (typeof document === 'undefined') return;
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
