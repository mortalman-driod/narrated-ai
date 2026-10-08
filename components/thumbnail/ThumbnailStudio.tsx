'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ThumbnailConfig, ThumbnailTemplate, ThumbnailAspectRatio } from '@/lib/thumbnail/types';
import { renderThumbnailToCanvas, renderThumbnailToDataUrl, downloadDataUrl } from '@/lib/thumbnail/thumbnailRenderer';
import { Scene } from '@/lib/generator/types';

interface ThumbnailStudioProps {
  initialTitle?: string;
  initialNiche?: string;
  activeScenes?: Scene[];
}

const PRESET_NICHES = [
  {
    id: 'sports',
    name: '⚽ Soccer / Sports History',
    headline: 'THE GREATEST GOAL EVER',
    subheadline: 'The Story They Kept Hidden',
    badge: 'NEW RECORD',
    template: 'sports-gold' as ThumbnailTemplate,
    hero: 'soccer' as const,
    accent: '#FDE047',
    primary: '#0B291D',
    emoji: '⚽'
  },
  {
    id: 'bible',
    name: '📖 Bible & Gospel Revivals',
    headline: 'WHEN GOD MOVED',
    subheadline: 'The Untold Revival History',
    badge: 'FAITH & POWER',
    template: 'gospel-divine' as ThumbnailTemplate,
    hero: 'preacher' as const,
    accent: '#FBBF24',
    primary: '#1E1B4B',
    emoji: '🔥'
  },
  {
    id: 'history',
    name: '🏺 Ancient Mysteries & Lore',
    headline: 'THE LOST REALM EXPOSED',
    subheadline: 'Archaeologists Were Shocked',
    badge: 'UNSOLVED',
    template: 'documentary-noir' as ThumbnailTemplate,
    hero: 'warrior' as const,
    accent: '#38BDF8',
    primary: '#0F172A',
    emoji: '⚔️'
  },
  {
    id: 'horror',
    name: '😱 True Crime & Dark History',
    headline: 'DO NOT GO IN THERE',
    subheadline: 'The Most Terrifying Chapter',
    badge: 'EXPOSED',
    template: 'shock-youtube' as ThumbnailTemplate,
    hero: 'shocked' as const,
    accent: '#EF4444',
    primary: '#18181B',
    emoji: '😱'
  },
  {
    id: 'stickman',
    name: '🏃 Stickman Viral Action',
    headline: 'STICKMAN VS 1000',
    subheadline: 'Can He Survive The Arena?',
    badge: 'EPIC BATTLE',
    template: 'stickman-action' as ThumbnailTemplate,
    hero: 'stickman' as const,
    accent: '#22C55E',
    primary: '#090D16',
    emoji: '⚡'
  },
  {
    id: 'psychology',
    name: '🧠 Psychology & Mind',
    headline: '99% FAIL THIS TEST',
    subheadline: 'Carl Jung’s Dark Secret',
    badge: 'MUST WATCH',
    template: 'bold-gamer' as ThumbnailTemplate,
    hero: 'detective' as const,
    accent: '#A855F7',
    primary: '#1E1B4B',
    emoji: '🚨'
  }
];

export const ThumbnailStudio: React.FC<ThumbnailStudioProps> = ({
  initialTitle,
  initialNiche,
  activeScenes = []
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Thumbnail Config States
  const [headline, setHeadline] = useState<string>(
    initialTitle ? initialTitle.toUpperCase().slice(0, 32) : 'THE GREATEST STORY EVER'
  );
  const [subheadline, setSubheadline] = useState<string>('What Really Happened Behind The Scenes');
  const [badgeText, setBadgeText] = useState<string>('MUST WATCH');
  const [template, setTemplate] = useState<ThumbnailTemplate>('sports-gold');
  const [aspectRatio, setAspectRatio] = useState<ThumbnailAspectRatio>('16:9');
  const [heroCharacter, setHeroCharacter] = useState<'stickman' | 'soccer' | 'warrior' | 'preacher' | 'detective' | 'shocked' | 'none'>('soccer');
  const [accentColor, setAccentColor] = useState<string>('#FDE047');
  const [primaryColor, setPrimaryColor] = useState<string>('#0B291D');
  const [textColor, setTextColor] = useState<string>('#FFFFFF');
  const [stickerEmoji, setStickerEmoji] = useState<string>('🔥');
  const [fontSizeMultiplier, setFontSizeMultiplier] = useState<number>(1.0);
  const [showVignette, setShowVignette] = useState<boolean>(true);
  const [showBorderGlow, setShowBorderGlow] = useState<boolean>(true);

  // Active Configuration
  const currentConfig: ThumbnailConfig = {
    headline,
    subheadline,
    badgeText,
    template,
    aspectRatio,
    heroCharacter,
    primaryColor,
    accentColor,
    textColor,
    stickerEmoji,
    fontSizeMultiplier,
    showVignette,
    showBorderGlow
  };

  // Re-render whenever parameters update
  useEffect(() => {
    if (canvasRef.current) {
      renderThumbnailToCanvas(canvasRef.current, currentConfig);
    }
  }, [headline, subheadline, badgeText, template, aspectRatio, heroCharacter, primaryColor, accentColor, textColor, stickerEmoji, fontSizeMultiplier, showVignette, showBorderGlow]);

  // Load Preset
  const handleApplyPreset = (p: typeof PRESET_NICHES[0]) => {
    setTemplate(p.template);
    setHeroCharacter(p.hero);
    setAccentColor(p.accent);
    setPrimaryColor(p.primary);
    setStickerEmoji(p.emoji);
    setBadgeText(p.badge);
    if (!initialTitle) {
      setHeadline(p.headline);
      setSubheadline(p.subheadline);
    }
  };

  // Auto-Fill from active storyboard
  const handleAutoFillFromStory = () => {
    if (!initialTitle) return;
    const words = initialTitle.toUpperCase().split(/\s+/);
    setHeadline(words.slice(0, 5).join(' '));
    setSubheadline(words.length > 5 ? words.slice(5, 12).join(' ') : 'Full Documentary Breakdown');
    setBadgeText('VIRAL SPECIAL');
  };

  // Download Action
  const handleDownloadThumbnail = () => {
    const dataUrl = renderThumbnailToDataUrl(currentConfig);
    const cleanName = headline.slice(0, 20).replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    downloadDataUrl(dataUrl, `thumbnail_${cleanName}_1080p.png`);
  };

  return (
    <div className="bg-[#FAF7F2] text-[#1C1917] min-h-[85vh] rounded-2xl p-6 sm:p-10 space-y-8 border border-[#E8E2D9] shadow-sm font-sans">
      {/* Studio Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E8E2D9] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-[4px] bg-[#B4532A]/10 text-[#B4532A] font-bold border border-[#B4532A]/30">
              Viral Growth Suite
            </span>
            <span className="text-[11px] font-mono text-[#4D7C0F] font-semibold">
              ● 1080p Full HD • Zero API
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-[#1C1917] tracking-tight mt-1">
            YouTube & Social Thumbnail Studio
          </h1>
          <p className="text-xs text-[#6B6259] mt-0.5">
            Design high-CTR click-worthy thumbnails with high-impact typography, hero graphics, and viral badges.
          </p>
        </div>

        {/* Quick Auto-Fill */}
        {initialTitle && (
          <button
            type="button"
            onClick={handleAutoFillFromStory}
            className="px-4 py-2 bg-white hover:bg-[#FAF7F2] text-[#1C1917] border border-[#1C1917] text-xs font-semibold rounded-[6px] transition-colors shadow-xs"
          >
            ⚡ Auto-Fill from Current Story
          </button>
        )}
      </div>

      {/* Main Grid: Controls Left, Live Thumbnail Canvas Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Controls & Presets (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* 1. Niche Presets */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#1C1917] uppercase tracking-wider block">
              1. Viral Niche Templates
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PRESET_NICHES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleApplyPreset(p)}
                  className={`p-2.5 rounded-lg border text-left transition-all text-xs font-semibold ${
                    template === p.template
                      ? 'border-[#B4532A] bg-[#B4532A]/5 ring-1 ring-[#B4532A] text-[#1C1917]'
                      : 'border-[#E8E2D9] bg-white text-[#6B6259] hover:border-[#1C1917]'
                  }`}
                >
                  <div className="truncate">{p.name}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 2. Headline & Typography */}
          <div className="bg-white p-4 rounded-xl border border-[#E8E2D9] space-y-3 shadow-xs">
            <label className="text-xs font-bold text-[#1C1917] uppercase tracking-wider block">
              2. Headline & Text Overlays
            </label>

            <div>
              <label className="text-[11px] font-semibold text-[#6B6259] block mb-1">
                Main Punchy Headline (2–4 Words Recommended)
              </label>
              <input
                type="text"
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="e.g. THE GREATEST GOAL"
                className="w-full text-xs font-mono font-bold p-2.5 rounded-[6px] border border-[#E8E2D9] focus:outline-none focus:border-[#B4532A] text-[#1C1917]"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#6B6259] block mb-1">
                Secondary Subtitle / Hook
              </label>
              <input
                type="text"
                value={subheadline}
                onChange={(e) => setSubheadline(e.target.value)}
                placeholder="e.g. What really happened behind closed doors"
                className="w-full text-xs p-2.5 rounded-[6px] border border-[#E8E2D9] focus:outline-none focus:border-[#B4532A] text-[#1C1917]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-[#6B6259] block mb-1">
                  Viral Pill Badge
                </label>
                <input
                  type="text"
                  value={badgeText}
                  onChange={(e) => setBadgeText(e.target.value)}
                  placeholder="MUST WATCH"
                  className="w-full text-xs font-bold p-2 rounded-[6px] border border-[#E8E2D9] text-[#1C1917]"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-[#6B6259] block mb-1">
                  Sticker Emoji
                </label>
                <select
                  value={stickerEmoji}
                  onChange={(e) => setStickerEmoji(e.target.value)}
                  className="w-full text-xs p-2 rounded-[6px] border border-[#E8E2D9] bg-white font-bold"
                >
                  <option value="🔥">🔥 Fire Trend</option>
                  <option value="😱">😱 Shocked Face</option>
                  <option value="⚽">⚽ Soccer Ball</option>
                  <option value="⚔️">⚔️ Crossed Swords</option>
                  <option value="🏆">🏆 Champion Trophy</option>
                  <option value="📖">📖 Sacred Bible</option>
                  <option value="🚨">🚨 Siren / Alert</option>
                  <option value="👑">👑 Royal Crown</option>
                  <option value="⚡">⚡ Lightning Bolt</option>
                </select>
              </div>
            </div>
          </div>

          {/* 3. Hero Visual & Aspect Ratio */}
          <div className="bg-white p-4 rounded-xl border border-[#E8E2D9] space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#1C1917] uppercase tracking-wider">
                3. Hero Figure & Framing
              </label>
              <div className="flex items-center gap-1">
                {(['16:9', '9:16', '1:1'] as ThumbnailAspectRatio[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setAspectRatio(r)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                      aspectRatio === r ? 'bg-[#1C1917] text-white' : 'bg-[#FAF7F2] text-[#6B6259]'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-[#6B6259] block mb-1">
                Hero Figure Pose
              </label>
              <select
                value={heroCharacter}
                onChange={(e) => setHeroCharacter(e.target.value as any)}
                className="w-full text-xs font-semibold p-2 rounded-[6px] border border-[#E8E2D9] bg-white"
              >
                <option value="soccer">⚽ Soccer Striker (Dynamic Kick)</option>
                <option value="warrior">⚔️ Combat Warrior (Gleaming Sword)</option>
                <option value="preacher">📖 Preacher (Holy Golden Rays)</option>
                <option value="stickman">🏃 Iconic Stickman (Action Stance)</option>
                <option value="detective">🤔 Thinking Mind (Detective Noir)</option>
                <option value="shocked">😱 Shock & Horror Figure</option>
                <option value="none">🚫 No Hero Figure (Text-Only Focus)</option>
              </select>
            </div>

            {/* Colors */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[10px] font-bold text-[#6B6259] block mb-1">Accent Glow:</label>
                <div className="flex items-center gap-1.5">
                  {['#FDE047', '#EF4444', '#38BDF8', '#F59E0B', '#22C55E', '#A855F7'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setAccentColor(c)}
                      className={`w-5 h-5 rounded-full border ${accentColor === c ? 'scale-125 border-black' : 'border-white'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-[#6B6259] block mb-1">Background Hue:</label>
                <div className="flex items-center gap-1.5">
                  {['#0B291D', '#1E1B4B', '#0F172A', '#18181B', '#381428', '#060B14'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setPrimaryColor(c)}
                      className={`w-5 h-5 rounded-full border ${primaryColor === c ? 'scale-125 border-black' : 'border-white'}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Live 1080p Canvas Preview & Download (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white p-5 rounded-2xl border-2 border-[#E8E2D9] shadow-sm flex flex-col items-center">
            <div className="w-full flex items-center justify-between pb-3 border-b border-[#E8E2D9] mb-4 text-xs">
              <span className="font-mono text-[#B4532A] font-bold">
                ● Live 1080p Viewport (Instant Render)
              </span>
              <span className="font-mono text-[#6B6259]">
                {aspectRatio === '16:9' ? '1920 × 1080 Full HD' : aspectRatio === '9:16' ? '1080 × 1920 Shorts Cover' : '1200 × 1200 Square'}
              </span>
            </div>

            {/* Live Canvas Element */}
            <div className="max-w-full overflow-hidden flex items-center justify-center p-2 rounded-xl bg-black shadow-inner">
              <canvas
                ref={canvasRef}
                className="max-h-[460px] w-auto h-auto object-contain rounded-lg shadow-2xl border border-slate-800"
              />
            </div>

            {/* Download Button */}
            <div className="w-full pt-4 mt-3 border-t border-[#E8E2D9] flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleDownloadThumbnail}
                className="px-5 py-2.5 bg-[#B4532A] hover:bg-[#9A4524] text-white text-xs font-semibold rounded-[6px] transition-all flex items-center gap-2 shadow-sm"
              >
                <span>⬇ Download 1080p Thumbnail (.PNG)</span>
              </button>

              <span className="text-[11px] text-[#6B6259] font-mono">
                YouTube Standard 16:9 • High-CTR
              </span>
            </div>
          </div>

          {/* Viral Thumbnail Pro-Tip */}
          <div className="bg-[#FAF7F2] border border-[#E8E2D9] p-4 rounded-xl text-xs space-y-1">
            <h4 className="font-bold text-[#1C1917] flex items-center gap-1.5">
              <span>🎯 Viral Retention Tip</span>
            </h4>
            <p className="text-[#6B6259] leading-relaxed text-[11px]">
              Keep your thumbnail headline to <strong>3 or 4 powerful words</strong> with contrasting colors (e.g. White on Yellow). Ensure the hero visual is placed on the right so it doesn't get obscured by YouTube's timestamp pill in the bottom-right corner!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
