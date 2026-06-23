export type TabType = 'vector' | 'blob' | 'wave' | 'color' | 'chart' | 'case';

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
