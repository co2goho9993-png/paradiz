export type TabType = 'vector' | 'blob' | 'wave' | 'color' | 'chart' | 'case' | 'qr' | 'classes';

export interface RoomConfig {
  w: number; // width in meters
  d: number; // depth/length in meters
  h: number; // height in meters
}

export interface OpeningConfig {
  id: number;
  type: 'window' | 'door';
  width: number;
  height: number;
  sill: number;
  offset: number;
  rotation: number; // 0 or 90
}

export interface WallConfig {
  texture: HTMLImageElement | null;
  textureSrc?: string; // base64 or URL
  openings: OpeningConfig[];
}

export interface DragState {
  type: 'pan' | 'rotate' | 'opening';
  sx: number;
  sy: number;
  px?: number;
  py?: number;
  lastX?: number;
  lastY?: number;
  wall?: number;
  opening?: OpeningConfig;
  startOffset?: number;
}

export interface GridConfig {
  columns: number;
  rows: number;
  gutter: number;
  margin: number;
}

export interface ColorHsv {
  h: number;
  s: number;
  v: number;
}

export interface ColorRgb {
  r: number;
  g: number;
  b: number;
}

export interface ColorHsl {
  h: number;
  s: number;
  l: number;
}

export interface ColorCmyk {
  c: number;
  m: number;
  y: number;
  k: number;
}

export interface VectorPreset {
  name: string;
  colors: number;
  detail: number;
  blur: number;
  noise: number;
  mode: 'color' | 'mono';
}

export interface WcagPair {
  fg: string;
  bg: string;
  label: string;
  ratio: number;
  pass: string;
}
