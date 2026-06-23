import * as fs from 'fs';

let raw = fs.readFileSync('temp/custom/dashboard_deep.json', 'utf8');
if (raw.charCodeAt(0) === 0xFEFF) {
  raw = raw.slice(1);
}
const data = JSON.parse(raw);

function decodeKrako(str: string): string {
  try {
    return Buffer.from(str, 'binary').toString('utf-8');
  } catch(e) {
    return str;
  }
}

const textNodes: any[] = [];
const frames: any[] = [];

function findNodes(obj: any, parentFrame: string = '') {
  if (!obj || typeof obj !== 'object') return;
  
  let currentFrame = parentFrame;
  if (obj.type === 'FRAME') {
    currentFrame = obj.name;
    frames.push({ id: obj.id, name: decodeKrako(obj.name), box: obj.absoluteBoundingBox });
  }
  
  if (obj.type === 'TEXT') {
    textNodes.push({
      id: obj.id,
      name: decodeKrako(obj.name),
      characters: decodeKrako(obj.characters || ''),
      parentFrame,
      box: obj.absoluteBoundingBox,
      style: obj.style
    });
  }
  
  if (obj.children) {
    for (const child of obj.children) {
      findNodes(child, currentFrame);
    }
  }
}

findNodes(data.nodes['0:1'].document);

console.log('=== FRAMES ===');
for (const f of frames) {
  console.log(`Frame [${f.id}] name: "${f.name}" box: ${JSON.stringify(f.box)}`);
}

console.log('\n=== ALL TEXTS ===');
for (const t of textNodes) {
  console.log(`[${t.parentFrame}] [${t.id}] "${t.name}" -> characters: "${t.characters.replace(/\r?\n/g, '\\n')}"`);
}
