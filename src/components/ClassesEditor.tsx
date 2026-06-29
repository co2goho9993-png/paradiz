import React, { useState, useEffect, useRef } from 'react';
import { 
  MousePointer, 
  Square, 
  DoorOpen, 
  Image as ImageIcon, 
  Hand, 
  Maximize, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Download, 
  Compass, 
  Home
} from 'lucide-react';
import { RoomConfig, WallConfig, OpeningConfig, DragState } from '../types';

const SCALE = 50;
const WALL_NAMES = ['Север', 'Восток', 'Юг', 'Запад'];
const PROJ3D_CONFIG = { camDist: 11, focal: 7.5 };

export default function ClassesEditor() {
  const [view, setView] = useState<'2d' | '3d' | 'elev'>('2d');
  const [tool, setTool] = useState<'select' | 'room' | 'window' | 'door' | 'texture' | 'pan'>('select');
  const [zoom, setZoom] = useState<number>(1);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  
  const [room, setRoom] = useState<RoomConfig>({ w: 4.2, d: 3.6, h: 2.7 });
  const [selectedWall, setSelectedWall] = useState<number>(0);
  const [selectedOpening, setSelectedOpening] = useState<number | null>(null);
  
  const [walls, setWalls] = useState<WallConfig[]>([
    { texture: null, openings: [] },
    { texture: null, openings: [] },
    { texture: null, openings: [] },
    { texture: null, openings: [] }
  ]);
  
  const [rot3d, setRot3d] = useState<number>(0.35);
  const [tilt3d, setTilt3d] = useState<number>(0.5);
  const [proj3d, setProj3d] = useState<'perspective' | 'isometric'>('perspective');
  
  const [cursorCoords, setCursorCoords] = useState<string>('—');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const textureInputRef = useRef<HTMLInputElement | null>(null);
  
  // Ref to hold the mutable rendering state to avoid rebinding event listeners on every render
  const renderStateRef = useRef({
    view,
    tool,
    zoom,
    panX,
    panY,
    room,
    selectedWall,
    selectedOpening,
    walls,
    rot3d,
    tilt3d,
    proj3d,
    isExport: false,
    exportUiScale: 1
  });

  // Keep ref in sync
  useEffect(() => {
    renderStateRef.current = {
      view,
      tool,
      zoom,
      panX,
      panY,
      room,
      selectedWall,
      selectedOpening,
      walls,
      rot3d,
      tilt3d,
      proj3d,
      isExport: false,
      exportUiScale: 1
    };
    draw();
  }, [view, tool, zoom, panX, panY, room, selectedWall, selectedOpening, walls, rot3d, tilt3d, proj3d]);

  // Toast notifier
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  // Helper calculation functions
  function wallLength(i: number, currentRoom = room) {
    return (i === 0 || i === 2) ? currentRoom.w : currentRoom.d;
  }

  function clampTilt(v: number) {
    return Math.max(0.12, Math.min(1.35, v));
  }

  // WebGL helper context (cached per instance)
  const glCacheRef = useRef<{
    canvas: HTMLCanvasElement;
    gl: WebGLRenderingContext;
    program: WebGLProgram;
    posBuffer: WebGLBuffer;
    posLoc: number;
    hLoc: WebGLUniformLocation;
    resLoc: WebGLUniformLocation;
    texLoc: WebGLUniformLocation;
    texture: WebGLTexture;
  } | null>(null);

  // Math translation helpers
  function worldToScreen(x: number, y: number, width: number, height: number, customZoom = zoom, customPanX = panX, customPanY = panY) {
    const cx = width / 2 + customPanX;
    const cy = height / 2 + customPanY;
    return { x: cx + x * SCALE * customZoom, y: cy + y * SCALE * customZoom };
  }

  function screenToWorld(sx: number, sy: number, width: number, height: number, customZoom = zoom, customPanX = panX, customPanY = panY) {
    const cx = width / 2 + customPanX;
    const cy = height / 2 + customPanY;
    return {
      x: (sx - cx) / (SCALE * customZoom),
      y: (sy - cy) / (SCALE * customZoom)
    };
  }

  function getWallSegments2d(currentRoom = room) {
    const hw = currentRoom.w / 2;
    const hd = currentRoom.d / 2;
    return [
      { x1: -hw, y1: -hd, x2: hw, y2: -hd, wall: 0, horiz: true },
      { x1: hw, y1: -hd, x2: hw, y2: hd, wall: 1, horiz: false },
      { x1: hw, y1: hd, x2: -hw, y2: hd, wall: 2, horiz: true },
      { x1: -hw, y1: hd, x2: -hw, y2: -hd, wall: 3, horiz: false }
    ];
  }

  function getWallSegment(wallIdx: number, currentRoom = room) {
    const segs = getWallSegments2d(currentRoom);
    return segs.find(s => s.wall === wallIdx) || segs[0];
  }

  function getWallSegment3d(wallIdx: number, currentRoom = room) {
    const hw = currentRoom.w / 2;
    const hd = currentRoom.d / 2;
    const segs = [
      { x1: -hw, y1: -hd, x2: hw, y2: -hd, wall: 0, horiz: true },
      { x1: -hw, y1: hd, x2: -hw, y2: -hd, wall: 1, horiz: false },
      { x1: hw, y1: hd, x2: -hw, y2: hd, wall: 2, horiz: true },
      { x1: hw, y1: -hd, x2: hw, y2: hd, wall: 3, horiz: false }
    ];
    return segs.find(s => s.wall === wallIdx) || segs[0];
  }

  function hitTestWall(wx: number, wy: number, customZoom = zoom, currentRoom = room) {
    const hw = currentRoom.w / 2;
    const hd = currentRoom.d / 2;
    const tol = 0.25 / customZoom;
    if (Math.abs(wy + hd) < tol && Math.abs(wx) <= hw) return 0;
    if (Math.abs(wx - hw) < tol && Math.abs(wy) <= hd) return 1;
    if (Math.abs(wy - hd) < tol && Math.abs(wx) <= hw) return 2;
    if (Math.abs(wx + hw) < tol && Math.abs(wy) <= hd) return 3;
    return -1;
  }

  function hitTestOpening(wx: number, wy: number, customZoom = zoom, currentRoom = room, currentWalls = walls) {
    const segs = getWallSegments2d(currentRoom);
    let best: { wall: number; opening: OpeningConfig } | null = null;
    let bestDist = Infinity;
    
    segs.forEach(seg => {
      const wallObj = currentWalls[seg.wall];
      const len = wallLength(seg.wall, currentRoom);
      wallObj.openings.forEach(op => {
        const t0 = op.offset / len;
        const t1 = t0 + op.width / len;
        const mx = seg.x1 + (seg.x2 - seg.x1) * (t0 + t1) / 2;
        const my = seg.y1 + (seg.y2 - seg.y1) * (t0 + t1) / 2;
        const d = Math.hypot(wx - mx, wy - my);
        if (d < 0.35 / customZoom && d < bestDist) {
          bestDist = d;
          best = { wall: seg.wall, opening: op };
        }
      });
    });
    return best;
  }

  function getWallDefs3d(hw: number, hd: number, h: number) {
    return [
      { wallIdx: 0, corners: [[-hw, -hd, 0], [hw, -hd, 0], [hw, -hd, h], [-hw, -hd, h]] },
      { wallIdx: 1, corners: [[-hw, hd, 0], [-hw, -hd, 0], [-hw, -hd, h], [-hw, hd, h]] },
      { wallIdx: 2, corners: [[hw, hd, 0], [-hw, hd, 0], [-hw, hd, h], [hw, hd, h]] },
      { wallIdx: 3, corners: [[hw, -hd, 0], [hw, hd, 0], [hw, hd, h], [hw, -hd, h]] }
    ];
  }

  function viewSpaceY(x: number, y: number, z: number, currentRot3d = rot3d, currentTilt3d = tilt3d, currentRoom = room) {
    const pivotZ = currentRoom.h * 0.35;
    const cosY = Math.cos(currentRot3d);
    const sinY = Math.sin(currentRot3d);
    const x1 = x * cosY - y * sinY;
    const y1 = x * sinY + y * cosY;
    const z1 = z - pivotZ;
    const cosP = Math.cos(currentTilt3d);
    const sinP = Math.sin(currentTilt3d);
    return y1 * cosP - z1 * sinP;
  }

  function wallViewDepth(def: { wallIdx: number; corners: number[][] }, currentRot3d = rot3d, currentTilt3d = tilt3d, currentRoom = room) {
    let depth = 0;
    def.corners.forEach(c => {
      depth += viewSpaceY(c[0], c[1], c[2], currentRot3d, currentTilt3d, currentRoom);
    });
    return depth / def.corners.length;
  }

  function isWallInteriorVisible(wallIdx: number, currentRot3d = rot3d, currentTilt3d = tilt3d, currentRoom = room) {
    const hw = currentRoom.w / 2;
    const hd = currentRoom.d / 2;
    const defs = getWallDefs3d(hw, hd, currentRoom.h);
    let nearest = defs[0];
    let nearestDepth = wallViewDepth(nearest, currentRot3d, currentTilt3d, currentRoom);
    
    defs.forEach(def => {
      const depth = wallViewDepth(def, currentRot3d, currentTilt3d, currentRoom);
      if (depth < nearestDepth) {
        nearest = def;
        nearestDepth = depth;
      }
    });
    
    if (wallIdx === nearest.wallIdx) return false;

    const viewDir = { x: Math.sin(currentRot3d), y: Math.cos(currentRot3d) };
    const innerNormals = [
      { x: 0, y: 1 },
      { x: 1, y: 0 },
      { x: 0, y: -1 },
      { x: -1, y: 0 }
    ];
    const n = innerNormals[wallIdx];
    if (!n) return true;
    const outsideFacing = n.x * viewDir.x + n.y * viewDir.y;
    return outsideFacing < 0.12;
  }

  function project3d(
    x: number, 
    y: number, 
    z: number, 
    width: number, 
    height: number, 
    currentRot3d = rot3d, 
    currentTilt3d = tilt3d, 
    currentProj3d = proj3d, 
    currentZoom = zoom, 
    currentPanX = panX, 
    currentPanY = panY,
    currentRoom = room
  ) {
    const pivotZ = currentRoom.h * 0.35;
    const cosY = Math.cos(currentRot3d);
    const sinY = Math.sin(currentRot3d);
    const x1 = x * cosY - y * sinY;
    const y1 = x * sinY + y * cosY;
    const z1 = z - pivotZ;

    const cosP = Math.cos(currentTilt3d);
    const sinP = Math.sin(currentTilt3d);
    const x2 = x1;
    const y2 = y1 * cosP - z1 * sinP;
    const z2 = y1 * sinP + z1 * cosP;

    let sx, sy;
    if (currentProj3d === 'perspective') {
      const depth = Math.max(2.5, PROJ3D_CONFIG.camDist + y2);
      const k = (PROJ3D_CONFIG.focal * currentZoom) / depth;
      sx = x2 * k;
      sy = -z2 * k;
    } else {
      sx = x2 * currentZoom;
      sy = (y2 * 0.45 + z2 * 0.55) * currentZoom;
    }
    return worldToScreen(sx, sy, width, height, 1, currentPanX, currentPanY);
  }

  function textureCoverCrop(img: HTMLImageElement, destAspect: number) {
    const imgW = img.naturalWidth || img.width;
    const imgH = img.naturalHeight || img.height;
    const imgAspect = imgW / imgH;
    let srcX = 0, srcY = 0, srcW = imgW, srcH = imgH;
    if (imgAspect > destAspect) {
      srcW = imgH * destAspect;
      srcX = (imgW - srcW) / 2;
    } else if (imgAspect < destAspect) {
      srcH = imgW / destAspect;
      srcY = (imgH - srcH) / 2;
    }
    return { x: srcX, y: srcY, w: srcW, h: srcH };
  }

  function getOpeningWorldBounds(op: OpeningConfig, wallIdx: number, currentRoom = room) {
    const seg = getWallSegment3d(wallIdx, currentRoom);
    const wl = wallLength(wallIdx, currentRoom);
    const t0 = op.offset / wl;
    const t1 = (op.offset + op.width) / wl;
    const h0 = op.sill || 0;
    const h1 = h0 + op.height;
    const dx = seg.x2 - seg.x1;
    const dy = seg.y2 - seg.y1;
    return {
      bx1: seg.x1 + dx * t0,
      by1: seg.y1 + dy * t0,
      bx2: seg.x1 + dx * t1,
      by2: seg.y1 + dy * t1,
      h0,
      h1
    };
  }

  function getOpeningScreenQuad(
    op: OpeningConfig, 
    wallIdx: number, 
    width: number, 
    height: number,
    currentRot3d = rot3d,
    currentTilt3d = tilt3d,
    currentProj3d = proj3d,
    currentZoom = zoom,
    currentPanX = panX,
    currentPanY = panY,
    currentRoom = room
  ) {
    const b = getOpeningWorldBounds(op, wallIdx, currentRoom);
    const seg = getWallSegment3d(wallIdx, currentRoom);
    
    const wallA = project3d(seg.x1, seg.y1, 0, width, height, currentRot3d, currentTilt3d, currentProj3d, currentZoom, currentPanX, currentPanY, currentRoom);
    const wallB = project3d(seg.x2, seg.y2, 0, width, height, currentRot3d, currentTilt3d, currentProj3d, currentZoom, currentPanX, currentPanY, currentRoom);
    
    const p0 = project3d(b.bx1, b.by1, b.h0, width, height, currentRot3d, currentTilt3d, currentProj3d, currentZoom, currentPanX, currentPanY, currentRoom);
    const p1 = project3d(b.bx2, b.by2, b.h0, width, height, currentRot3d, currentTilt3d, currentProj3d, currentZoom, currentPanX, currentPanY, currentRoom);
    const p2 = project3d(b.bx2, b.by2, b.h1, width, height, currentRot3d, currentTilt3d, currentProj3d, currentZoom, currentPanX, currentPanY, currentRoom);
    const p3 = project3d(b.bx1, b.by1, b.h1, width, height, currentRot3d, currentTilt3d, currentProj3d, currentZoom, currentPanX, currentPanY, currentRoom);
    
    const wallDx = wallB.x - wallA.x;
    const wallDy = wallB.y - wallA.y;
    const openDx = p1.x - p0.x;
    const openDy = p1.y - p0.y;
    
    if (wallDx * openDx + wallDy * openDy < 0) {
      return [p1, p0, p3, p2];
    }
    return [p0, p1, p2, p3];
  }

  function solveLinearSystem(a: number[][], b: number[]) {
    const n = b.length;
    for (let i = 0; i < n; i++) {
      let maxRow = i;
      let maxVal = Math.abs(a[i][i]);
      for (let r = i + 1; r < n; r++) {
        const v = Math.abs(a[r][i]);
        if (v > maxVal) { maxVal = v; maxRow = r; }
      }
      if (maxVal < 1e-10) return null;
      if (maxRow !== i) {
        const tmp = a[i]; a[i] = a[maxRow]; a[maxRow] = tmp;
        const tb = b[i]; b[i] = b[maxRow]; b[maxRow] = tb;
      }
      const pivot = a[i][i];
      for (let c = i; c < n; c++) a[i][c] /= pivot;
      b[i] /= pivot;
      for (let rr = 0; rr < n; rr++) {
        if (rr === i) continue;
        const factor = a[rr][i];
        if (Math.abs(factor) < 1e-12) continue;
        for (let cc = i; cc < n; cc++) a[rr][cc] -= factor * a[i][cc];
        b[rr] -= factor * b[i];
      }
    }
    return b;
  }

  function homographyFromQuadToUnit(pts: { x: number; y: number }[]) {
    const uv = [
      { u: 0, v: 0 },
      { u: 1, v: 0 },
      { u: 1, v: 1 },
      { u: 0, v: 1 }
    ];
    const a: number[][] = [];
    const b: number[] = [];
    for (let i = 0; i < 4; i++) {
      const x = pts[i].x;
      const y = pts[i].y;
      const u = uv[i].u;
      const v = uv[i].v;
      a.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
      a.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
    }
    const h = solveLinearSystem(a, b);
    if (!h) return null;
    return [h[0], h[3], h[6], h[1], h[4], h[7], h[2], h[5], 1];
  }

  function makeShader(gl: WebGLRenderingContext, type: number, source: string) {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  function getProjectiveGl(width: number, height: number) {
    if (!glCacheRef.current) {
      const glCanvas = document.createElement('canvas');
      const gl = glCanvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, preserveDrawingBuffer: true });
      if (!gl) return null;
      const vs = makeShader(gl, gl.VERTEX_SHADER,
        'attribute vec2 a_pos;\n' +
        'void main(){ gl_Position = vec4(a_pos, 0.0, 1.0); }');
      const fs = makeShader(gl, gl.FRAGMENT_SHADER,
        'precision mediump float;\n' +
        'uniform sampler2D u_tex;\n' +
        'uniform mat3 u_h;\n' +
        'uniform vec2 u_resolution;\n' +
        'void main(){\n' +
        '  vec2 p = vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y);\n' +
        '  vec3 q = u_h * vec3(p, 1.0);\n' +
        '  vec2 uv = q.xy / q.z;\n' +
        '  if (uv.x < -0.001 || uv.x > 1.001 || uv.y < -0.001 || uv.y > 1.001) discard;\n' +
        '  gl_FragColor = texture2D(u_tex, clamp(uv, 0.0, 1.0));\n' +
        '}');
      if (!vs || !fs) return null;
      const program = gl.createProgram();
      if (!program) return null;
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program));
        return null;
      }
      const posBuffer = gl.createBuffer();
      if (!posBuffer) return null;
      const texture = gl.createTexture();
      if (!texture) return null;

      glCacheRef.current = {
        canvas: glCanvas,
        gl,
        program,
        posBuffer,
        posLoc: gl.getAttribLocation(program, 'a_pos'),
        hLoc: gl.getUniformLocation(program, 'u_h') as WebGLUniformLocation,
        resLoc: gl.getUniformLocation(program, 'u_resolution') as WebGLUniformLocation,
        texLoc: gl.getUniformLocation(program, 'u_tex') as WebGLUniformLocation,
        texture
      };
    }
    if (glCacheRef.current.canvas.width !== width || glCacheRef.current.canvas.height !== height) {
      glCacheRef.current.canvas.width = width;
      glCacheRef.current.canvas.height = height;
    }
    return glCacheRef.current;
  }

  function affineFromTriangle(src: { x: number; y: number }[], dst: { x: number; y: number }[]) {
    const sx0 = src[0].x, sy0 = src[0].y;
    const sx1 = src[1].x, sy1 = src[1].y;
    const sx2 = src[2].x, sy2 = src[2].y;
    const dx0 = dst[0].x, dy0 = dst[0].y;
    const dx1 = dst[1].x, dy1 = dst[1].y;
    const dx2 = dst[2].x, dy2 = dst[2].y;
    const denom = sx0 * (sy1 - sy2) + sx1 * (sy2 - sy0) + sx2 * (sy0 - sy1);
    if (Math.abs(denom) < 1e-8) return null;
    return {
      a: (dx0 * (sy1 - sy2) + dx1 * (sy2 - sy0) + dx2 * (sy0 - sy1)) / denom,
      b: (dy0 * (sy1 - sy2) + dy1 * (sy2 - sy0) + dy2 * (sy0 - sy1)) / denom,
      c: (dx0 * (sx2 - sx1) + dx1 * (sx0 - sx2) + dx2 * (sx1 - sx0)) / denom,
      d: (dy0 * (sx2 - sx1) + dy1 * (sx0 - sx2) + dy2 * (sx1 - sx0)) / denom,
      e: (dx0 * (sx1 * sy2 - sx2 * sy1) + dx1 * (sx2 * sy0 - sx0 * sy2) + dx2 * (sx0 * sy1 - sx1 * sy0)) / denom,
      f: (dy0 * (sx1 * sy2 - sx2 * sy1) + dy1 * (sx2 * sy0 - sx0 * sy2) + dy2 * (sx0 * sy1 - sx1 * sy0)) / denom
    };
  }

  function drawProjectiveImageToQuad(
    ctx: CanvasRenderingContext2D, 
    sourceCanvas: HTMLImageElement | HTMLCanvasElement, 
    pts: { x: number; y: number }[], 
    logicalW: number, 
    logicalH: number, 
    scale: number,
    isExport: boolean
  ) {
    const w = Math.max(1, Math.round(logicalW * scale));
    const h = Math.max(1, Math.round(logicalH * scale));
    const pg = getProjectiveGl(w, h);
    if (!pg) return false;
    const gl = pg.gl;
    const scaledPts = pts.map(pt => ({ x: pt.x * scale, y: pt.y * scale }));
    const hMat = homographyFromQuadToUnit(scaledPts);
    if (!hMat) return false;
    const verts: number[] = [];
    for (let i = 0; i < 4; i++) {
      verts.push(scaledPts[i].x / w * 2 - 1, 1 - scaledPts[i].y / h * 2);
    }
    const triVerts = new Float32Array([
      verts[0], verts[1], verts[2], verts[3], verts[4], verts[5],
      verts[0], verts[1], verts[4], verts[5], verts[6], verts[7]
    ]);
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(pg.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, pg.posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, triVerts, gl.STREAM_DRAW);
    gl.enableVertexAttribArray(pg.posLoc);
    gl.vertexAttribPointer(pg.posLoc, 2, gl.FLOAT, false, 0, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, pg.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 0);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceCanvas);
    gl.uniform1i(pg.texLoc, 0);
    gl.uniformMatrix3fv(pg.hLoc, false, new Float32Array(hMat));
    gl.uniform2f(pg.resLoc, w, h);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.flush();
    
    if (isExport) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(pg.canvas, 0, 0);
      ctx.restore();
    } else {
      ctx.drawImage(pg.canvas, 0, 0, logicalW, logicalH);
    }
    return true;
  }

  function withQuadMap(
    ctx: CanvasRenderingContext2D, 
    pts: { x: number; y: number }[], 
    isExport: boolean, 
    exportUiScale: number,
    drawFn: (w: number, h: number, bCtx: CanvasRenderingContext2D) => void
  ) {
    const p0 = pts[0];
    const p1 = pts[1];
    const p3 = pts[3];
    const w = Math.max(1, Math.hypot(p1.x - p0.x, p1.y - p0.y));
    const h = Math.max(1, Math.hypot(p3.x - p0.x, p3.y - p0.y));
    const exportScale = isExport ? (exportUiScale || 1) : 1;
    const iw = Math.max(1, Math.ceil(w * exportScale));
    const ih = Math.max(1, Math.ceil(h * exportScale));
    
    const buffer = document.createElement('canvas');
    buffer.width = iw;
    buffer.height = ih;
    const bufferCtx = buffer.getContext('2d');
    if (!bufferCtx) return;
    bufferCtx.imageSmoothingEnabled = true;
    
    bufferCtx.setTransform(iw / w, 0, 0, ih / h, 0, 0);
    drawFn(w, h, bufferCtx);
    
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const logicalW = canvasEl.clientWidth;
    const logicalH = canvasEl.clientHeight;

    if (!drawProjectiveImageToQuad(ctx, buffer, pts, logicalW, logicalH, exportScale, isExport)) {
      // Fallback to affine triangle warp
      const triPairs = [
        { src: [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }], dst: [pts[0], pts[1], pts[2]] },
        { src: [{ x: 0, y: 0 }, { x: w, y: h }, { x: 0, y: h }], dst: [pts[0], pts[2], pts[3]] }
      ];
      triPairs.forEach(pair => {
        const m = affineFromTriangle(pair.src, pair.dst);
        if (!m) return;
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(pair.dst[0].x, pair.dst[0].y);
        ctx.lineTo(pair.dst[1].x, pair.dst[1].y);
        ctx.lineTo(pair.dst[2].x, pair.dst[2].y);
        ctx.closePath();
        ctx.clip();
        ctx.transform(m.a, m.b, m.c, m.d, m.e, m.f);
        ctx.drawImage(buffer, 0, 0, w, h);
        ctx.restore();
      });
    }
  }

  // Draw procedures
  function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number, isExport = false, customZoom = zoom, customPanX = panX, customPanY = panY) {
    if (isExport) return;
    const step = SCALE * customZoom;
    if (step < 12) return;
    ctx.save();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.035)';
    ctx.lineWidth = 1;
    const offX = (width / 2 + customPanX) % step;
    const offY = (height / 2 + customPanY) % step;
    for (let x = offX; x < width; x += step) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = offY; y < height; y += step) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }
    ctx.restore();
  }

  function drawOpeningOnWall2d(
    ctx: CanvasRenderingContext2D, 
    p1: { x: number; y: number }, 
    p2: { x: number; y: number }, 
    op: OpeningConfig, 
    wallIdx: number,
    currentRoom = room
  ) {
    const wl = wallLength(wallIdx, currentRoom);
    const t0 = op.offset / wl;
    const t1 = t0 + op.width / wl;
    const tMid = (t0 + t1) / 2;
    const cx = p1.x + (p2.x - p1.x) * tMid;
    const cy = p1.y + (p2.y - p1.y) * tMid;
    const segLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const ow = (op.width / wl) * segLen;
    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    const thick = op.type === 'window' ? 11 : 13;
    const intoLen = 14;
    const swing = Math.min(ow * 0.42, 16);
    const x0 = -ow / 2;
    const y0 = -thick / 2;

    if (op.type === 'window') {
      const sillGrad = ctx.createLinearGradient(0, y0, 0, y0 + thick);
      sillGrad.addColorStop(0, '#f8f8f5');
      sillGrad.addColorStop(0.55, '#e8e6df');
      sillGrad.addColorStop(1, '#d4d0c8');
      ctx.fillStyle = sillGrad;
      ctx.fillRect(x0 - 1, y0 - 1, ow + 2, thick + 2);

      const frameGrad = ctx.createLinearGradient(x0, 0, x0 + ow, 0);
      frameGrad.addColorStop(0, '#ffffff');
      frameGrad.addColorStop(0.5, '#f0f0ec');
      frameGrad.addColorStop(1, '#d8d8d0');
      ctx.fillStyle = frameGrad;
      ctx.fillRect(x0, y0, ow, thick);

      const glassW = ow * 0.86;
      const glassH = thick * 0.62;
      const gx = -glassW / 2;
      const gy = -glassH / 2;
      const glassGrad = ctx.createLinearGradient(gx, gy, gx + glassW, gy + glassH);
      glassGrad.addColorStop(0, 'rgba(190, 225, 255, 0.95)');
      glassGrad.addColorStop(0.45, 'rgba(95, 165, 220, 0.88)');
      glassGrad.addColorStop(1, 'rgba(45, 95, 150, 0.92)');
      ctx.fillStyle = glassGrad;
      ctx.fillRect(gx, gy, glassW, glassH);
      
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(gx + glassW * 0.15, gy + glassH * 0.2);
      ctx.lineTo(gx + glassW * 0.55, gy + glassH * 0.75);
      ctx.stroke();
      
      ctx.strokeStyle = '#8a8a82';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(0, gy + glassH);
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx + glassW, 0);
      ctx.stroke();
      
      ctx.strokeStyle = '#30ABE9'; // Unified theme color instead of dark brutalist black
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x0, y0, ow, thick);

      if (op.rotation === 90) {
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, y0 + thick);
        ctx.lineTo(0, y0 + thick + intoLen);
        ctx.stroke();
      } else {
        ctx.strokeStyle = '#8a8a82';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x0 + ow - 3, y0 + 2);
        ctx.lineTo(x0 + ow - 3, y0 + thick - 2);
        ctx.stroke();
      }
    } else {
      // Door
      const woodGrad = ctx.createLinearGradient(x0, 0, x0 + ow, 0);
      woodGrad.addColorStop(0, '#8B5E34');
      woodGrad.addColorStop(0.25, '#A67C52');
      woodGrad.addColorStop(0.5, '#8B5E34');
      woodGrad.addColorStop(0.75, '#C49A6C');
      woodGrad.addColorStop(1, '#5C3A1E');
      ctx.fillStyle = woodGrad;
      ctx.fillRect(x0 - 1, y0 - 1, ow + 2, thick + 2);

      ctx.fillStyle = 'rgba(40, 24, 10, 0.22)';
      ctx.fillRect(x0 + ow * 0.12, y0 + 2, ow * 0.34, thick - 4);
      ctx.fillRect(x0 + ow * 0.54, y0 + 2, ow * 0.34, thick - 4);

      ctx.strokeStyle = '#2a1810';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x0, y0, ow, thick);

      let hx = x0 + ow * 0.78;
      const hy = 0;
      ctx.fillStyle = '#c0c0c0';
      ctx.beginPath();
      ctx.arc(hx, hy, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#707070';
      ctx.lineWidth = 0.8;
      ctx.stroke();

      ctx.lineWidth = 1.2;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.45)';
      if (op.rotation === 90) {
        hx = x0 + 5;
        ctx.beginPath();
        ctx.moveTo(hx, 0);
        ctx.lineTo(hx, swing);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(hx, 0, swing, Math.PI / 2, Math.PI);
        ctx.stroke();
      } else {
        hx = x0 + 5;
        ctx.beginPath();
        ctx.arc(hx, 0, swing, 0, Math.PI / 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(hx, 0);
        ctx.lineTo(hx + swing * 0.92, 0);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawDimLabel(ctx: CanvasRenderingContext2D, p1: { x: number; y: number }, p2: { x: number; y: number }, text: string) {
    const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    ctx.font = '600 11px system-ui, sans-serif';
    const pad = 6;
    const tw = ctx.measureText(text).width + pad * 2;
    ctx.fillStyle = '#E3F2FD'; // Polished blue highlight
    ctx.fillRect(mid.x - tw / 2, mid.y - 9, tw, 18);
    ctx.strokeStyle = '#30ABE9';
    ctx.lineWidth = 1;
    ctx.strokeRect(mid.x - tw / 2, mid.y - 9, tw, 18);
    ctx.fillStyle = '#0D47A1';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, mid.x, mid.y);
  }

  function drawWallDimension(ctx: CanvasRenderingContext2D, p1: { x: number; y: number }, p2: { x: number; y: number }, wallIdx: number, text: string) {
    const dimOff = 34;
    const extPast = 6;
    let nx = 0, ny = 0;
    if (wallIdx === 0) ny = -1;
    else if (wallIdx === 1) nx = 1;
    else if (wallIdx === 2) ny = 1;
    else if (wallIdx === 3) nx = -1;

    const op1 = { x: p1.x + nx * dimOff, y: p1.y + ny * dimOff };
    const op2 = { x: p2.x + nx * dimOff, y: p2.y + ny * dimOff };

    ctx.save();
    ctx.strokeStyle = '#8D95A5';
    ctx.lineWidth = 1;
    ctx.lineCap = 'square';
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p1.x + nx * (dimOff + extPast), p1.y + ny * (dimOff + extPast));
    ctx.moveTo(p2.x, p2.y);
    ctx.lineTo(p2.x + nx * (dimOff + extPast), p2.y + ny * (dimOff + extPast));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(op1.x, op1.y);
    ctx.lineTo(op2.x, op2.y);
    ctx.stroke();
    ctx.restore();

    drawDimLabel(ctx, op1, op2, text);
  }

  function drawOpeningElevation(ctx: CanvasRenderingContext2D, rect: { wall: number; x: number; y: number; w: number; h: number; k: number }, op: OpeningConfig) {
    const wl = wallLength(rect.wall);
    const x = rect.x + (op.offset / wl) * rect.w;
    const w = (op.width / wl) * rect.w;
    const h = (op.height / room.h) * rect.h;
    const y = rect.y + rect.h - ((op.sill || 0) / room.h) * rect.h - h;
    
    ctx.save();
    ctx.lineWidth = 1.5;
    if (op.type === 'window') {
      ctx.fillStyle = 'rgba(140, 200, 240, 0.4)';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#30ABE9';
      ctx.strokeRect(x, y, w, h);
      ctx.beginPath();
      ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h);
      ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2);
      ctx.stroke();
    } else {
      ctx.fillStyle = 'rgba(139, 94, 52, 0.25)';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#8B5E34';
      ctx.strokeRect(x, y, w, h);
      ctx.beginPath();
      ctx.arc(x + w * 0.82, y + h * 0.52, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#8B5E34';
      ctx.fill();
    }
    ctx.restore();
  }

  function getElevationRects(width: number, height: number) {
    const marginX = 88;
    const gap = 24;
    const titleH = 26;
    const totalWallH = room.h * 4;
    const maxWallW = Math.max(room.w, room.d);
    const scaleX = (width - marginX * 2) / maxWallW;
    const scaleY = (height - 52 - gap * 3 - titleH * 4) / totalWallH;
    const k = Math.max(18, Math.min(scaleX, scaleY));
    
    const rects: { wall: number; x: number; y: number; w: number; h: number; labelY: number; k: number }[] = [];
    let y = 28;
    for (let i = 0; i < 4; i++) {
      const wallW = wallLength(i);
      const rw = wallW * k;
      const rh = room.h * k;
      const x = (width - rw) / 2;
      rects.push({ wall: i, x, y: y + titleH, w: rw, h: rh, labelY: y, k });
      y += titleH + rh + gap;
    }
    return rects;
  }

  function drawElevations(ctx: CanvasRenderingContext2D, width: number, height: number) {
    drawGrid(ctx, width, height);
    const rects = getElevationRects(width, height);
    ctx.save();
    ctx.font = '700 12px system-ui, sans-serif';
    ctx.textAlign = 'left';
    rects.forEach(r => {
      const wallObj = walls[r.wall];
      ctx.fillStyle = '#565C68';
      ctx.fillText(
        `${WALL_NAMES[r.wall]} · ${wallLength(r.wall).toFixed(2)} × ${room.h.toFixed(2)}м`, 
        r.x, 
        r.labelY + 15
      );
      
      ctx.beginPath();
      ctx.rect(r.x, r.y, r.w, r.h);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      
      if (wallObj.texture) {
        const crop = textureCoverCrop(wallObj.texture, wallLength(r.wall) / room.h);
        ctx.save();
        ctx.beginPath();
        ctx.rect(r.x, r.y, r.w, r.h);
        ctx.clip();
        ctx.globalAlpha = 0.9;
        ctx.drawImage(wallObj.texture, crop.x, crop.y, crop.w, crop.h, r.x, r.y, r.w, r.h);
        ctx.globalAlpha = 1;
        ctx.restore();
      }
      
      wallObj.openings.forEach(op => {
        drawOpeningElevation(ctx, r, op);
      });
      
      const isSelected = selectedWall === r.wall;
      ctx.lineWidth = isSelected ? 3 : 1;
      ctx.strokeStyle = isSelected ? '#30ABE9' : '#DBDEE5';
      ctx.strokeRect(r.x, r.y, r.w, r.h);
    });
    ctx.restore();
  }

  function draw2d(ctx: CanvasRenderingContext2D, width: number, height: number, isExport = false) {
    drawGrid(ctx, width, height, isExport);
    const hw = room.w / 2, hd = room.d / 2;
    const corners = [
      worldToScreen(-hw, -hd, width, height),
      worldToScreen(hw, -hd, width, height),
      worldToScreen(hw, hd, width, height),
      worldToScreen(-hw, hd, width, height)
    ];

    ctx.save();
    ctx.fillStyle = isExport ? '#ffffff' : 'rgba(255, 255, 255, 0.9)';
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < 4; i++) ctx.lineTo(corners[i].x, corners[i].y);
    ctx.closePath();
    ctx.fill();

    const segs = getWallSegments2d();
    segs.forEach(seg => {
      const p1 = worldToScreen(seg.x1, seg.y1, width, height);
      const p2 = worldToScreen(seg.x2, seg.y2, width, height);
      const wallObj = walls[seg.wall];
      const isSelected = selectedWall === seg.wall;

      ctx.strokeStyle = isSelected ? '#30ABE9' : '#565C68';
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      if (wallObj.texture) {
        const img = wallObj.texture;
        const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        const stripH = 10;
        ctx.save();
        ctx.translate(p1.x, p1.y);
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.rect(0, -stripH, len, stripH * 2);
        ctx.clip();
        
        ctx.globalAlpha = 0.5;
        const crop = textureCoverCrop(img, len / (stripH * 2));
        ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, -stripH, len, stripH * 2);
        ctx.restore();
      }

      wallObj.openings.forEach(op => {
        drawOpeningOnWall2d(ctx, p1, p2, op, seg.wall);
      });

      if (!isExport) {
        drawWallDimension(ctx, p1, p2, seg.wall, `${wallLength(seg.wall).toFixed(2)}м`);
      }
    });

    // Outer Room Label or visual cue
    ctx.restore();
  }

  function drawOpening3d(
    ctx: CanvasRenderingContext2D, 
    op: OpeningConfig, 
    wallIdx: number, 
    width: number, 
    height: number,
    isExport: boolean,
    exportUiScale: number
  ) {
    const pts = getOpeningScreenQuad(op, wallIdx, width, height);
    if (op.type === 'window') {
      withQuadMap(ctx, pts, isExport, exportUiScale, (w, h, bCtx) => {
        const frame = Math.max(3, Math.min(w, h) * 0.07);
        bCtx.fillStyle = '#f2f2ee';
        bCtx.fillRect(0, 0, w, h);
        
        const glassGrad = bCtx.createLinearGradient(0, 0, w * 0.3, h);
        glassGrad.addColorStop(0, 'rgba(200, 230, 255, 0.92)');
        glassGrad.addColorStop(0.35, 'rgba(110, 175, 230, 0.82)');
        glassGrad.addColorStop(0.7, 'rgba(55, 115, 175, 0.78)');
        glassGrad.addColorStop(1, 'rgba(30, 70, 120, 0.85)');
        bCtx.fillStyle = glassGrad;
        bCtx.fillRect(frame, frame, w - frame * 2, h - frame * 2);
        
        bCtx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        bCtx.beginPath();
        bCtx.moveTo(frame + 4, frame + 6);
        bCtx.lineTo(w * 0.45, h * 0.55);
        bCtx.lineTo(frame + 8, h * 0.55);
        bCtx.closePath();
        bCtx.fill();
        
        bCtx.strokeStyle = '#e8e8e4';
        bCtx.lineWidth = frame * 0.45;
        bCtx.strokeRect(frame * 0.5, frame * 0.5, w - frame, h - frame);
        
        bCtx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        bCtx.lineWidth = 1;
        bCtx.beginPath();
        bCtx.moveTo(w / 2, frame);
        bCtx.lineTo(w / 2, h - frame);
        bCtx.moveTo(frame, h / 2);
        bCtx.lineTo(w - frame, h / 2);
        bCtx.stroke();
        
        bCtx.fillStyle = '#d8d4cc';
        bCtx.fillRect(frame, h - frame * 1.4, w - frame * 2, frame * 0.55);
      });
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < 4; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.closePath();
      ctx.strokeStyle = '#30ABE9';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      // Door
      withQuadMap(ctx, pts, isExport, exportUiScale, (w, h, bCtx) => {
        const frame = Math.max(3, Math.min(w, h) * 0.06);
        const wood = bCtx.createLinearGradient(0, 0, w, 0);
        wood.addColorStop(0, '#5A3820');
        wood.addColorStop(0.2, '#9A7048');
        wood.addColorStop(0.45, '#7A5530');
        wood.addColorStop(0.7, '#B8895A');
        wood.addColorStop(1, '#4A2E18');
        bCtx.fillStyle = wood;
        bCtx.fillRect(0, 0, w, h);
        
        bCtx.fillStyle = 'rgba(30, 18, 8, 0.18)';
        const pw = (w - frame * 3) / 2;
        const ph = (h - frame * 3) / 2;
        bCtx.fillRect(frame, frame, pw, ph);
        bCtx.fillRect(frame * 2 + pw, frame, pw, ph);
        bCtx.fillRect(frame, frame * 2 + ph, pw, ph);
        bCtx.fillRect(frame * 2 + pw, frame * 2 + ph, pw, ph);
        
        bCtx.strokeStyle = 'rgba(20, 10, 5, 0.35)';
        bCtx.lineWidth = 1;
        bCtx.strokeRect(frame, frame, pw, ph);
        bCtx.strokeRect(frame * 2 + pw, frame, pw, ph);
        bCtx.strokeRect(frame, frame * 2 + ph, pw, ph);
        bCtx.strokeRect(frame * 2 + pw, frame * 2 + ph, pw, ph);
        
        bCtx.fillStyle = '#b8b8b8';
        bCtx.beginPath();
        bCtx.arc(w - frame * 2.2, h / 2, frame * 0.55, 0, Math.PI * 2);
        bCtx.fill();
        
        bCtx.fillStyle = '#8a8a8a';
        bCtx.fillRect(w - frame * 2.8, h / 2 - frame * 0.15, frame * 1.4, frame * 0.3);
        
        bCtx.strokeStyle = '#2a1810';
        bCtx.lineWidth = frame * 0.35;
        bCtx.strokeRect(frame * 0.4, frame * 0.4, w - frame * 0.8, h - frame * 0.8);
      });
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < 4; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.closePath();
      ctx.strokeStyle = '#2a1810';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  function strokeLine3d(
    ctx: CanvasRenderingContext2D, 
    x1: number, y1: number, z1: number, 
    x2: number, y2: number, z2: number, 
    width: number, height: number
  ) {
    const a = project3d(x1, y1, z1, width, height);
    const b = project3d(x2, y2, z2, width, height);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }

  function drawRoomSkeleton3d(ctx: CanvasRenderingContext2D, hw: number, hd: number, h: number, width: number, height: number, isExport = false) {
    ctx.save();
    ctx.strokeStyle = '#565C68';
    ctx.lineWidth = 1.2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    strokeLine3d(ctx, -hw, -hd, 0, hw, -hd, 0, width, height);
    strokeLine3d(ctx, hw, -hd, 0, hw, hd, 0, width, height);
    strokeLine3d(ctx, hw, hd, 0, -hw, hd, 0, width, height);
    strokeLine3d(ctx, -hw, hd, 0, -hw, -hd, 0, width, height);

    strokeLine3d(ctx, -hw, -hd, h, hw, -hd, h, width, height);
    strokeLine3d(ctx, hw, -hd, h, hw, hd, h, width, height);
    strokeLine3d(ctx, hw, hd, h, -hw, hd, h, width, height);
    strokeLine3d(ctx, -hw, hd, h, -hw, -hd, h, width, height);

    strokeLine3d(ctx, -hw, -hd, 0, -hw, -hd, h, width, height);
    strokeLine3d(ctx, hw, -hd, 0, hw, -hd, h, width, height);
    strokeLine3d(ctx, hw, hd, 0, hw, hd, h, width, height);
    strokeLine3d(ctx, -hw, hd, 0, -hw, hd, h, width, height);

    if (!isExport && selectedWall >= 0 && selectedWall < 4) {
      const wi = selectedWall;
      ctx.strokeStyle = '#30ABE9'; // Unified theme color instead of yellow
      ctx.lineWidth = 2.5;
      ctx.globalAlpha = 0.65;
      if (wi === 0) {
        strokeLine3d(ctx, -hw, -hd, 0, hw, -hd, 0, width, height);
        strokeLine3d(ctx, -hw, -hd, h, hw, -hd, h, width, height);
        strokeLine3d(ctx, -hw, -hd, 0, -hw, -hd, h, width, height);
        strokeLine3d(ctx, hw, -hd, 0, hw, -hd, h, width, height);
      } else if (wi === 1) {
        strokeLine3d(ctx, hw, -hd, 0, hw, hd, 0, width, height);
        strokeLine3d(ctx, hw, -hd, h, hw, hd, h, width, height);
        strokeLine3d(ctx, hw, -hd, 0, hw, -hd, h, width, height);
        strokeLine3d(ctx, hw, hd, 0, hw, hd, h, width, height);
      } else if (wi === 2) {
        strokeLine3d(ctx, hw, hd, 0, -hw, hd, 0, width, height);
        strokeLine3d(ctx, hw, hd, h, -hw, hd, h, width, height);
        strokeLine3d(ctx, hw, hd, 0, hw, hd, h, width, height);
        strokeLine3d(ctx, -hw, hd, 0, -hw, hd, h, width, height);
      } else {
        strokeLine3d(ctx, -hw, hd, 0, -hw, -hd, 0, width, height);
        strokeLine3d(ctx, -hw, hd, h, -hw, -hd, h, width, height);
        strokeLine3d(ctx, -hw, hd, 0, -hw, hd, h, width, height);
        strokeLine3d(ctx, -hw, -hd, 0, -hw, -hd, h, width, height);
      }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function drawWallQuad3d(
    ctx: CanvasRenderingContext2D, 
    x1: number, y1: number, z1: number, 
    x2: number, y2: number, z2: number, 
    x3: number, y3: number, z3: number, 
    x4: number, y4: number, z4: number, 
    wallIdx: number,
    width: number,
    height: number,
    isExport = false,
    exportUiScale = 1
  ) {
    const p = [
      project3d(x1, y1, z1, width, height),
      project3d(x2, y2, z2, width, height),
      project3d(x3, y3, z3, width, height),
      project3d(x4, y4, z4, width, height)
    ];
    const wallObj = walls[wallIdx];
    ctx.beginPath();
    ctx.moveTo(p[0].x, p[0].y);
    p.slice(1).forEach(pt => ctx.lineTo(pt.x, pt.y));
    ctx.closePath();
    
    const interiorVisible = isWallInteriorVisible(wallIdx);
    const shouldDrawTexture = !!wallObj.texture && interiorVisible;
    
    if (interiorVisible && (wallObj.texture || (!isExport && selectedWall === wallIdx))) {
      ctx.fillStyle = (!isExport && selectedWall === wallIdx) ? 'rgba(48, 171, 233, 0.08)' : '#ffffff';
      ctx.fill();
    }
    
    if (shouldDrawTexture && wallObj.texture) {
      const wallWm = wallLength(wallIdx);
      const wallHm = room.h;
      const img = wallObj.texture;
      const crop = textureCoverCrop(img, wallWm / wallHm);
      
      withQuadMap(ctx, p, isExport, exportUiScale, (w, h, bCtx) => {
        bCtx.globalAlpha = 0.9;
        bCtx.transform(-1, 0, 0, -1, w, h);
        bCtx.drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, 0, w, h);
        bCtx.globalAlpha = 1;
      });
    }
  }

  function drawAllOpenings3d(ctx: CanvasRenderingContext2D, width: number, height: number, isExport = false, exportUiScale = 1) {
    for (let wi = 0; wi < 4; wi++) {
      walls[wi].openings.forEach(op => {
        drawOpening3d(ctx, op, wi, width, height, isExport, exportUiScale);
      });
    }
  }

  function draw3d(ctx: CanvasRenderingContext2D, width: number, height: number, isExport = false, exportUiScale = 1) {
    drawGrid(ctx, width, height, isExport);
    const hw = room.w / 2, hd = room.d / 2, h = room.h;
    const wallDefs = getWallDefs3d(hw, hd, h);
    
    // Depth sort walls
    wallDefs.sort((a, b) => wallViewDepth(b, rot3d, tilt3d, room) - wallViewDepth(a, rot3d, tilt3d, room));
    
    wallDefs.forEach(def => {
      const c = def.corners;
      drawWallQuad3d(
        ctx,
        c[0][0], c[0][1], c[0][2],
        c[1][0], c[1][1], c[1][2],
        c[2][0], c[2][1], c[2][2],
        c[3][0], c[3][1], c[3][2],
        def.wallIdx,
        width,
        height,
        isExport,
        exportUiScale
      );
    });

    // Floor drawing
    const floor = [
      project3d(-hw, -hd, 0, width, height),
      project3d(hw, -hd, 0, width, height),
      project3d(hw, hd, 0, width, height),
      project3d(-hw, hd, 0, width, height)
    ];
    ctx.beginPath();
    ctx.moveTo(floor[0].x, floor[0].y);
    floor.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.fillStyle = isExport ? '#f4f5f7' : 'rgba(240, 242, 245, 0.7)';
    ctx.fill();

    drawAllOpenings3d(ctx, width, height, isExport, exportUiScale);
    drawRoomSkeleton3d(ctx, hw, hd, h, width, height, isExport);

    if (!isExport) {
      ctx.font = '600 11px system-ui, sans-serif';
      ctx.fillStyle = '#565C68';
      ctx.textAlign = 'left';
      ctx.fillText(`Высота помещения: ${h.toFixed(2)}м`, 16, height - 16);
      ctx.fillText(
        `3D Перспектива · зажмите и ведите для поворота`,
        16,
        height - 32
      );
    }
  }

  function draw() {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const ctx = canvasEl.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvasEl.clientWidth;
    const height = canvasEl.clientHeight;

    ctx.clearRect(0, 0, width, height);

    if (view === '2d') {
      draw2d(ctx, width, height);
    } else if (view === 'elev') {
      drawElevations(ctx, width, height);
    } else {
      draw3d(ctx, width, height);
    }
  }

  // Handle window resizing and canvas fitting
  useEffect(() => {
    function handleResize() {
      const canvasEl = canvasRef.current;
      if (!canvasEl) return;
      const wrap = canvasEl.parentElement;
      if (!wrap) return;
      const dpr = window.devicePixelRatio || 1;
      
      canvasEl.width = wrap.clientWidth * dpr;
      canvasEl.height = wrap.clientHeight * dpr;
      canvasEl.style.width = `${wrap.clientWidth}px`;
      canvasEl.style.height = `${wrap.clientHeight}px`;
      
      const ctx = canvasEl.getContext('2d');
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      draw();
    }

    window.addEventListener('resize', handleResize);
    // Trigger initial resize after layout settles
    const timer = setTimeout(handleResize, 150);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, [view]);

  // Texture Loader logic
  function handleTextureUpload(file: File, wallIdx: number) {
    if (!file || !file.type.match(/image\/jpe?g/i)) {
      showToast('Загрузите изображение в формате JPEG!');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const updatedWalls = [...walls];
        updatedWalls[wallIdx] = {
          ...updatedWalls[wallIdx],
          texture: img,
          textureSrc: e.target?.result as string
        };
        setWalls(updatedWalls);
        showToast('Текстура успешно загружена!');
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  // Action methods
  function addOpening(type: 'window' | 'door', wx?: number, wy?: number) {
    if (selectedWall < 0 || selectedWall >= 4) {
      showToast('Сначала выберите стену!');
      return;
    }
    const wl = wallLength(selectedWall);
    const defaults = type === 'window'
      ? { type: 'window' as const, width: 1.20, height: 1.40, sill: 0.90, offset: wl / 2 - 0.60, rotation: 0 }
      : { type: 'door' as const, width: 0.90, height: 2.10, sill: 0, offset: 0.30, rotation: 0 };
    
    if (wx != null && wy != null) {
      const seg = getWallSegment(selectedWall);
      const dx = seg.x2 - seg.x1;
      const dy = seg.y2 - seg.y1;
      const lenSq = dx * dx + dy * dy;
      if (lenSq >= 1e-8) {
        let t = ((wx - seg.x1) * dx + (wy - seg.y1) * dy) / lenSq;
        t = Math.max(defaults.width / (2 * wl), Math.min(1 - defaults.width / (2 * wl), t));
        defaults.offset = Math.round(Math.max(0, Math.min(wl - defaults.width, t * wl - defaults.width / 2)) * 100) / 100;
      }
    }

    const newOpening: OpeningConfig = {
      ...defaults,
      id: Date.now()
    };

    const updatedWalls = [...walls];
    updatedWalls[selectedWall] = {
      ...updatedWalls[selectedWall],
      openings: [...updatedWalls[selectedWall].openings, newOpening]
    };
    setWalls(updatedWalls);
    setSelectedOpening(newOpening.id);
    showToast(`${type === 'window' ? 'Окно' : 'Дверь'} добавлено!`);
  }

  function updateOpeningField(id: number, field: keyof OpeningConfig, value: number) {
    const updatedWalls = [...walls];
    updatedWalls[selectedWall] = {
      ...updatedWalls[selectedWall],
      openings: updatedWalls[selectedWall].openings.map(op => {
        if (op.id === id) {
          return { ...op, [field]: value };
        }
        return op;
      })
    };
    setWalls(updatedWalls);
  }

  function removeOpening(id: number) {
    const updatedWalls = [...walls];
    updatedWalls[selectedWall] = {
      ...updatedWalls[selectedWall],
      openings: updatedWalls[selectedWall].openings.filter(op => op.id !== id)
    };
    setWalls(updatedWalls);
    if (selectedOpening === id) setSelectedOpening(null);
    showToast('Проём удален!');
  }

  // Pointer move handlers
  const dragRef = useRef<DragState | null>(null);

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const rect = canvasEl.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    if (tool === 'pan' || e.button === 1) {
      dragRef.current = { type: 'pan', sx: px, sy: py, px: panX, py: panY };
      canvasEl.classList.add('cursor-grabbing');
      canvasEl.setPointerCapture(e.pointerId);
      return;
    }

    if (view === '3d' && tool !== 'pan' && e.button === 0) {
      dragRef.current = { type: 'rotate', sx: px, sy: py, lastX: px, lastY: py };
      canvasEl.setPointerCapture(e.pointerId);
      return;
    }

    if (view === 'elev') {
      const rects = getElevationRects(canvasEl.clientWidth, canvasEl.clientHeight);
      let elevHit = -1;
      rects.forEach(r => {
        if (px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h) elevHit = r.wall;
      });
      if (elevHit >= 0) {
        setSelectedWall(elevHit);
        setSelectedOpening(null);
      }
      return;
    }

    const w = screenToWorld(px, py, canvasEl.clientWidth, canvasEl.clientHeight);
    if (view === '2d' && tool === 'select') {
      const opHit = hitTestOpening(w.x, w.y, zoom, room, walls);
      if (opHit) {
        setSelectedWall(opHit.wall);
        setSelectedOpening(opHit.opening.id);
        dragRef.current = {
          type: 'opening',
          wall: opHit.wall,
          opening: opHit.opening,
          sx: px,
          sy: py,
          startOffset: opHit.opening.offset
        };
        canvasEl.setPointerCapture(e.pointerId);
        return;
      }
    }

    const hit = hitTestWall(w.x, w.y, zoom, room);
    if (hit >= 0) {
      setSelectedWall(hit);
      setSelectedOpening(null);
      if (tool === 'window') addOpening('window', w.x, w.y);
      else if (tool === 'door') addOpening('door', w.x, w.y);
      else if (tool === 'texture') {
        textureInputRef.current?.click();
      }
    } else if (view === '2d' && tool === 'select') {
      setSelectedOpening(null);
    }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const rect = canvasEl.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;

    const w = screenToWorld(px, py, canvasEl.clientWidth, canvasEl.clientHeight);
    setCursorCoords(view === '2d' ? `${w.x.toFixed(2)}м, ${w.y.toFixed(2)}м` : '3D вид');

    const drag = dragRef.current;
    if (!drag) return;

    if (drag.type === 'pan') {
      setPanX((drag.px || 0) + (px - drag.sx));
      setPanY((drag.py || 0) + (py - drag.sy));
    } else if (drag.type === 'rotate') {
      setRot3d(prev => prev + (px - (drag.lastX || 0)) * 0.01);
      setTilt3d(prev => clampTilt(prev + (py - (drag.lastY || 0)) * 0.008));
      drag.lastX = px;
      drag.lastY = py;
    } else if (drag.type === 'opening' && drag.opening) {
      const seg = getWallSegments2d()[drag.wall || 0];
      const len = wallLength(drag.wall || 0);
      const dx = seg.x2 - seg.x1;
      const dy = seg.y2 - seg.y1;
      const segLenPx = Math.hypot(dx, dy) * SCALE * zoom;
      const deltaM = ((px - drag.sx) / segLenPx) * len;
      const maxOff = len - drag.opening.width;
      
      const computedOffset = Math.round(Math.max(0, Math.min(maxOff, (drag.startOffset || 0) + deltaM)) * 100) / 100;
      updateOpeningField(drag.opening.id, 'offset', computedOffset);
    }
  }

  function handlePointerUp() {
    dragRef.current = null;
    canvasRef.current?.classList.remove('cursor-grabbing');
  }

  function handleWheel(e: React.WheelEvent<HTMLCanvasElement>) {
    e.preventDefault();
    setZoom(prev => Math.max(0.3, Math.min(3, prev * (e.deltaY > 0 ? 0.9 : 1.1))));
  }

  // Export to high-res PNG (300 DPI layout representation)
  function exportPng() {
    const mainCanvas = canvasRef.current;
    if (!mainCanvas) return;
    
    showToast('Подготовка высококачественного экспорта...');
    
    const exportCanvas = document.createElement('canvas');
    const exportCtx = exportCanvas.getContext('2d');
    if (!exportCtx) return;

    exportCtx.imageSmoothingEnabled = true;
    const marginM = 0.5;
    let physW, physH, scaleFactor;

    if (view === '2d') {
      const contentW = room.w + marginM * 2;
      const contentH = room.d + marginM * 2;
      physW = Math.min(16384, Math.ceil(contentW * (300 / 0.0254)));
      physH = Math.min(16384, Math.ceil(contentH * (300 / 0.0254)));
      scaleFactor = physW / (contentW * SCALE);
    } else {
      const aspect = mainCanvas.clientWidth / mainCanvas.clientHeight;
      physW = Math.min(16384, 4000);
      physH = Math.round(physW / aspect);
      scaleFactor = physW / mainCanvas.clientWidth;
    }

    exportCanvas.width = physW;
    exportCanvas.height = physH;
    exportCtx.setTransform(scaleFactor, 0, 0, scaleFactor, 0, 0);

    // Render export contents with transparent background
    exportCtx.clearRect(0, 0, exportCanvas.width / scaleFactor, exportCanvas.height / scaleFactor);

    if (view === '2d') {
      // For export, offset pan temporarily to fit precisely
      draw2d(exportCtx, exportCanvas.width / scaleFactor, exportCanvas.height / scaleFactor, true);
    } else if (view === 'elev') {
      drawElevations(exportCtx, exportCanvas.width / scaleFactor, exportCanvas.height / scaleFactor);
    } else {
      draw3d(exportCtx, exportCanvas.width / scaleFactor, exportCanvas.height / scaleFactor, true, scaleFactor);
    }

    const dataUrl = exportCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `paradiz-classes-${view === '2d' ? 'plan' : '3d'}-hq.png`;
    link.href = dataUrl;
    link.click();
    showToast('HQ Экспорт успешно скачан!');
  }

  const activeWall = selectedWall >= 0 && selectedWall < 4 ? walls[selectedWall] : null;

  return (
    <div id="classes-editor-container" className="grid grid-cols-1 lg:grid-cols-[260px_1fr_320px] gap-4 items-stretch w-full h-full min-h-0">
      
      {/* 1. LEFT PANEL: Tools & Viewing Modes */}
      <div className="bg-white rounded-[20px] p-5 flex flex-col h-full min-h-0 shadow-xs">
        <span className="text-[12px] font-bold text-[#A2AABD] uppercase tracking-widest block font-sans mb-3 flex-shrink-0">
          Инструменты
        </span>
        
        {/* Scrollable controls list */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4 scrollbar-hide">
          {/* View Selection Toggle group */}
          <div className="mb-2">
            <span className="text-[10px] font-bold text-[#A2AABD] uppercase tracking-wider block mb-2 font-sans">Режим отображения</span>
            <div className="flex flex-col gap-1 bg-gray-50 p-1.5 rounded-xl border border-gray-100">
              {[
                { id: '2d', label: '2D План' },
                { id: '3d', label: '3D Обзор' },
                { id: 'elev', label: 'Развёртка' }
              ].map((style) => (
                <button
                  key={style.id}
                  onClick={() => setView(style.id as any)}
                  className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition duration-200 text-left flex items-center justify-between ${
                    view === style.id 
                       ? 'bg-[#30ABE9] text-white shadow-3xs' 
                       : 'text-[#565C68] hover:text-black hover:bg-gray-100'
                  }`}
                >
                  <span>{style.label}</span>
                  {view === style.id && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                </button>
              ))}
            </div>
          </div>



          {/* Canvas Interactive Tools */}
          <div>
            <span className="text-[10px] font-bold text-[#A2AABD] uppercase tracking-wider block mb-2 font-sans">Инструменты</span>
            <div className="flex flex-col gap-1.5">
              {[
                { id: 'select', label: 'Выбор', icon: MousePointer, hint: 'Выбор стен или проёмов' },
                { id: 'window', label: 'Проём: Окно', icon: Square, hint: 'Клик по стене для окна' },
                { id: 'door', label: 'Проём: Дверь', icon: DoorOpen, hint: 'Клик по стене для двери' },
                { id: 'texture', label: 'Текстура JPEG', icon: ImageIcon, hint: 'Клик для загрузки обоев' },
                { id: 'pan', label: 'Панорамирование', icon: Hand, hint: 'Перетаскивание холста' }
              ].map((toolItem) => {
                const Icon = toolItem.icon;
                const isToolActive = tool === toolItem.id;
                return (
                  <button
                    key={toolItem.id}
                    onClick={() => setTool(toolItem.id as any)}
                    className={`w-full py-2.5 px-3 rounded-xl border transition-all duration-200 text-left flex items-start gap-3 ${
                      isToolActive 
                        ? 'bg-[#30ABE9]/10 border-[#30ABE9] text-[#30ABE9]' 
                        : 'bg-white border-gray-100 text-[#565C68] hover:border-gray-300 hover:text-black shadow-3xs'
                    }`}
                  >
                    <Icon size={16} className="mt-0.5 shrink-0" />
                    <div>
                      <div className="text-xs font-bold leading-tight">{toolItem.label}</div>
                      <div className="text-[10px] text-gray-400 font-medium leading-none mt-1">{toolItem.hint}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>


        </div>

        {/* Action button at bottom */}
        <div className="mt-auto pt-3 border-t border-gray-100 flex-shrink-0">
          <button
            onClick={exportPng}
            className="w-full py-2.5 px-4 rounded-xl bg-[#30ABE9] hover:bg-[#1e9bd9] text-white text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Download size={14} /> Экспорт PNG (300 DPI)
          </button>
        </div>
      </div>

      {/* 2. CENTER PANEL: Dynamic Interactive Canvas */}
      <div className="bg-white rounded-[20px] p-5 flex flex-col h-full min-h-0 shadow-xs relative">
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <span className="text-[12px] font-bold text-[#A2AABD] uppercase tracking-widest block font-sans">
            Рабочая область
          </span>
          <div className="flex items-center gap-1.5 text-[11px] font-mono bg-gray-50 px-3 py-1 rounded-full text-gray-500 border border-gray-100">
            <span>Координаты: {cursorCoords}</span>
          </div>
        </div>

        {/* Viewport Canvas wrap */}
        <div className="w-full flex-1 min-h-0 bg-[#F5F7FA] border border-gray-100 rounded-[15px] relative overflow-hidden select-none">
          <canvas 
            ref={canvasRef} 
            className="w-full h-full block cursor-crosshair touch-none select-none"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
          />

          {/* Absolute scale and settings overlay chips */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5 pointer-events-none select-none">
            <span className="bg-white/90 backdrop-blur-xs border border-gray-100 px-3 py-1 rounded-lg text-[10px] font-bold text-gray-600 font-mono shadow-3xs">
              Масштаб: {Math.round(SCALE * zoom)} px/м
            </span>
            <span className="bg-white/90 backdrop-blur-xs border border-gray-100 px-3 py-1 rounded-lg text-[10px] font-bold text-gray-600 font-mono shadow-3xs">
              Стены: {room.w.toFixed(2)} × {room.d.toFixed(2)}м
            </span>
          </div>

          {/* Absolute zoom panel */}
          <div className="absolute bottom-3 right-3 flex gap-1.5 shadow-xs bg-white/90 backdrop-blur-xs p-1 rounded-xl border border-gray-100">
            <button
              onClick={() => setZoom(prev => Math.min(3, prev * 1.2))}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-600 transition cursor-pointer"
              title="Приблизить"
            >
              <ZoomIn size={16} />
            </button>
            <button
              onClick={() => setZoom(prev => Math.max(0.3, prev / 1.2))}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-600 transition cursor-pointer"
              title="Отдалить"
            >
              <ZoomOut size={16} />
            </button>
            <button
              onClick={() => {
                setZoom(1);
                setPanX(0);
                setPanY(0);
                setRot3d(0.35);
                setTilt3d(0.5);
                setProj3d('perspective');
              }}
              className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 text-gray-600 transition cursor-pointer"
              title="Сбросить камеру"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* 3. RIGHT PANEL: Property & Element Parameters */}
      <div className="bg-white rounded-[20px] p-5 flex flex-col h-full min-h-0 shadow-xs">
        <span className="text-[12px] font-bold text-[#A2AABD] uppercase tracking-widest block font-sans mb-3 flex-shrink-0">
          Свойства
        </span>

        {/* Scrollable settings list */}
        <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4 scrollbar-hide">
          {/* Room dimensions parameters */}
          <div>
            <span className="text-[10px] font-bold text-[#A2AABD] uppercase tracking-wider block mb-2 font-sans flex items-center gap-1.5">
              <Home size={12} className="text-[#30ABE9]" /> Габариты комнаты (м)
            </span>
            <div className="grid grid-cols-3 gap-2 bg-gray-50/50 p-2.5 rounded-xl border border-gray-100">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-400 font-bold uppercase">Ширина</label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="20"
                  value={room.w}
                  onChange={(e) => {
                    const val = Math.max(1, Math.min(20, parseFloat(e.target.value) || 1));
                    setRoom(prev => ({ ...prev, w: val }));
                  }}
                  className="w-full bg-white border border-gray-100 rounded-lg py-1 px-2 text-xs font-semibold focus:outline-none focus:border-[#30ABE9] font-mono"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-400 font-bold uppercase">Глубина</label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="20"
                  value={room.d}
                  onChange={(e) => {
                    const val = Math.max(1, Math.min(20, parseFloat(e.target.value) || 1));
                    setRoom(prev => ({ ...prev, d: val }));
                  }}
                  className="w-full bg-white border border-gray-100 rounded-lg py-1 px-2 text-xs font-semibold focus:outline-none focus:border-[#30ABE9] font-mono"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-gray-400 font-bold uppercase">Высота</label>
                <input
                  type="number"
                  step="0.1"
                  min="1.5"
                  max="6"
                  value={room.h}
                  onChange={(e) => {
                    const val = Math.max(1.5, Math.min(6, parseFloat(e.target.value) || 2));
                    setRoom(prev => ({ ...prev, h: val }));
                  }}
                  className="w-full bg-white border border-gray-100 rounded-lg py-1 px-2 text-xs font-semibold focus:outline-none focus:border-[#30ABE9] font-mono"
                />
              </div>
            </div>
          </div>

          {/* List of Walls */}
          <div>
            <span className="text-[10px] font-bold text-[#A2AABD] uppercase tracking-wider block mb-2 font-sans">Список стен</span>
            <div className="flex flex-col gap-1">
              {WALL_NAMES.map((name, idx) => {
                const isSelected = selectedWall === idx;
                const len = wallLength(idx);
                const hasTex = !!walls[idx].texture;
                return (
                  <button
                    key={idx}
                    onClick={() => {
                      setSelectedWall(idx);
                      setSelectedOpening(null);
                    }}
                    className={`w-full py-2 px-3 rounded-xl border flex items-center justify-between text-left transition ${
                      isSelected 
                        ? 'border-[#30ABE9] bg-[#30ABE9]/5 font-bold text-black' 
                        : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 text-[#565C68]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${isSelected ? 'bg-[#30ABE9]' : 'bg-gray-300'}`} />
                      <span className="text-xs">{name}</span>
                      {hasTex && (
                        <span className="text-[9px] bg-[#30ABE9]/15 text-[#30ABE9] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                          <ImageIcon size={9} /> Обои
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-mono text-gray-400 font-semibold">{len.toFixed(2)}м</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detail Wall Panel Options */}
          {activeWall && (
            <div className="bg-gray-50/50 p-3 rounded-xl border border-gray-100 flex flex-col gap-4 animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <span className="text-xs font-bold text-black">Стена: {WALL_NAMES[selectedWall]}</span>
                <span className="text-[10px] text-gray-400 font-semibold font-mono">{wallLength(selectedWall).toFixed(2)}м</span>
              </div>

              {/* Wallpaper / Texture uploader */}
              <div>
                <label className="text-[10px] font-bold text-[#A2AABD] uppercase tracking-wider block mb-1.5 font-sans">Обои стен (JPEG)</label>
                {activeWall.texture ? (
                  <div className="flex items-center gap-2 border border-gray-100 rounded-lg p-1.5 bg-white">
                    <img 
                      src={activeWall.textureSrc} 
                      className="w-10 h-10 object-cover rounded-md border border-gray-100" 
                      alt="Thumbnail" 
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold text-black truncate">Wallpaper.jpg</div>
                      <button
                        onClick={() => {
                          const updatedWalls = [...walls];
                          updatedWalls[selectedWall] = { ...updatedWalls[selectedWall], texture: null, textureSrc: undefined };
                          setWalls(updatedWalls);
                          showToast('Обои удалены!');
                        }}
                        className="text-[10px] text-red-500 font-bold hover:underline"
                      >
                        Удалить текстуру
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => textureInputRef.current?.click()}
                    className="w-full border border-dashed border-gray-200 hover:border-[#30ABE9] bg-white text-[#565C68] hover:text-[#30ABE9] rounded-xl py-3 px-4 text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={14} /> Загрузить JPEG обои
                  </button>
                )}
                <input 
                  type="file" 
                  ref={textureInputRef}
                  accept="image/jpeg,image/jpg" 
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleTextureUpload(file, selectedWall);
                    e.target.value = '';
                  }}
                />
              </div>

              {/* Add openings tools */}
              <div>
                <label className="text-[10px] font-bold text-[#A2AABD] uppercase tracking-wider block mb-1.5 font-sans">Добавить проём</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => addOpening('window')}
                    className="py-1.5 px-3 bg-white border border-gray-100 hover:border-gray-200 hover:bg-gray-50 rounded-lg text-[11px] font-bold text-[#565C68] transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    + Окно
                  </button>
                  <button
                    onClick={() => addOpening('door')}
                    className="py-1.5 px-3 bg-white border border-gray-100 hover:border-gray-200 hover:bg-gray-50 rounded-lg text-[11px] font-bold text-[#565C68] transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    + Дверь
                  </button>
                </div>
              </div>

              {/* Placed Openings parameters detail list */}
              <div>
                <label className="text-[10px] font-bold text-[#A2AABD] uppercase tracking-wider block mb-1.5 font-sans">Установленные проёмы</label>
                {activeWall.openings.length === 0 ? (
                  <div className="text-[10px] text-gray-400 italic text-center py-2">Нет добавленных проёмов</div>
                ) : (
                  <div className="flex flex-col gap-2 max-h-[180px] overflow-y-auto pr-1 scrollbar-hide">
                    {activeWall.openings.map((op) => {
                      const isOpSelected = selectedOpening === op.id;
                      const maxOffset = wallLength(selectedWall) - op.width;
                      const maxHeight = room.h;
                      return (
                        <div 
                          key={op.id}
                          onClick={() => setSelectedOpening(op.id)}
                          className={`p-2.5 rounded-lg border transition ${
                            isOpSelected 
                              ? 'border-[#30ABE9] bg-white shadow-3xs' 
                              : 'border-gray-100 bg-white'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[11px] font-bold text-black flex items-center gap-1">
                              {op.type === 'window' ? <Square size={10} className="text-blue-500" /> : <DoorOpen size={10} className="text-amber-700" />}
                              {op.type === 'window' ? 'Окно' : 'Дверь'}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateOpeningField(op.id, 'rotation', op.rotation === 90 ? 0 : 90);
                                  showToast('Угол створки изменен!');
                                }}
                                className="w-5 h-5 rounded hover:bg-gray-100 text-gray-500 hover:text-black flex items-center justify-center transition"
                                title="Повернуть створку на 90°"
                              >
                                <RefreshCw size={10} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeOpening(op.id);
                                }}
                                className="w-5 h-5 rounded hover:bg-red-50 text-red-500 flex items-center justify-center transition"
                                title="Удалить"
                              >
                                <Trash2 size={10} />
                              </button>
                            </div>
                          </div>

                          {/* Detail fields editing */}
                          <div className="grid grid-cols-2 gap-1.5 text-[9px] font-semibold text-gray-500 mb-1.5">
                            <div>
                              <span className="block mb-0.5">Ширина (м)</span>
                              <input
                                type="number"
                                step="0.05"
                                min="0.2"
                                max={wallLength(selectedWall) - op.offset}
                                value={op.width}
                                onChange={(e) => {
                                  const val = Math.max(0.2, Math.min(wallLength(selectedWall) - op.offset, parseFloat(e.target.value) || 0.2));
                                  updateOpeningField(op.id, 'width', val);
                                }}
                                className="w-full bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5 text-[10px] font-mono focus:outline-none"
                              />
                            </div>
                            <div>
                              <span className="block mb-0.5">Высота (м)</span>
                              <input
                                type="number"
                                step="0.05"
                                min="0.2"
                                max={room.h - op.sill}
                                value={op.height}
                                onChange={(e) => {
                                  const val = Math.max(0.2, Math.min(room.h - op.sill, parseFloat(e.target.value) || 0.2));
                                  updateOpeningField(op.id, 'height', val);
                                }}
                                className="w-full bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5 text-[10px] font-mono focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-1.5 text-[9px] font-semibold text-gray-500">
                            <div>
                              <span className="block mb-0.5">Отступ угла (м)</span>
                              <input
                                type="number"
                                step="0.05"
                                min="0"
                                max={maxOffset}
                                value={op.offset}
                                onChange={(e) => {
                                  const val = Math.max(0, Math.min(maxOffset, parseFloat(e.target.value) || 0));
                                  updateOpeningField(op.id, 'offset', val);
                                }}
                                className="w-full bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5 text-[10px] font-mono focus:outline-none"
                              />
                            </div>
                            {op.type === 'window' && (
                              <div>
                                <span className="block mb-0.5">Подоконник (м)</span>
                                <input
                                  type="number"
                                  step="0.05"
                                  min="0"
                                  max={maxHeight - op.height}
                                  value={op.sill}
                                  onChange={(e) => {
                                    const val = Math.max(0, Math.min(maxHeight - op.height, parseFloat(e.target.value) || 0));
                                    updateOpeningField(op.id, 'sill', val);
                                  }}
                                  className="w-full bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5 text-[10px] font-mono focus:outline-none"
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating toast message notification overlays */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900/90 backdrop-blur-md text-white px-5 py-2.5 rounded-full text-xs font-bold z-50 pointer-events-none transition duration-300 shadow-md flex items-center gap-2">
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
