export type ThumbnailTemplate =
  | 'bold-gamer'
  | 'documentary-noir'
  | 'sports-gold'
  | 'gospel-divine'
  | 'stickman-action'
  | 'shock-youtube'
  | 'comic-pop';

export type ThumbnailAspectRatio = '16:9' | '9:16' | '1:1';

export interface ThumbnailConfig {
  headline: string;
  subheadline?: string;
  badgeText?: string;
  template: ThumbnailTemplate;
  aspectRatio: ThumbnailAspectRatio;
  primaryColor: string;
  accentColor: string;
  textColor: string;
  stickerEmoji?: string;
  heroCharacter?: 'stickman' | 'soccer' | 'warrior' | 'preacher' | 'detective' | 'shocked' | 'none';
  showVignette: boolean;
  showBorderGlow: boolean;
  fontSizeMultiplier: number;
}
