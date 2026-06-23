import * as fs from 'fs';

let raw = fs.readFileSync('temp/custom/dashboard_deep.json', 'utf8');
if (raw.charCodeAt(0) === 0xFEFF) {
  raw = raw.slice(1);
}
const data = JSON.parse(raw);

// Helper to decode double encoded strings if any
const cp1251Table: { [key: number]: string } = {
  0x80: 'Ђ', 0x81: 'Ѓ', 0x82: '‚', 0x83: 'ѓ', 0x84: '„', 0x85: '…', 0x86: '†', 0x87: '‡', 0x88: '€', 0x89: '‰', 0x8A: 'Љ', 0x8B: '‹', 0x8C: 'Њ', 0x8D: 'Ќ', 0x8E: 'Ћ', 0x8F: 'Џ',
  0x90: 'ђ', 0x91: '‘', 0x92: '’', 0x93: '“', 0x94: '”', 0x95: '•', 0x96: '–', 0x97: '—', 0x98: '˜', 0x99: '™', 0x9A: 'љ', 0x9B: '›', 0x9C: 'њ', 0x9D: 'ќ', 0x9E: 'ћ', 0x9F: 'џ',
  0xA0: ' ', 0xA1: 'Ў', 0xA2: 'ў', 0xA3: 'Ј', 0xA4: '¤', 0xA5: 'Ґ', 0xA6: '¦', 0xA7: '§', 0xA8: 'Ё', 0xA9: '©', 0xAA: 'Є', 0xAB: '«', 0xAC: '¬', 0xAD: '­', 0xAE: '®', 0xAF: 'Ї',
  0xB0: '°', 0xB1: '±', 0xB2: 'І', 0xB3: 'і', 0xB4: 'ґ', 0xB5: 'µ', 0xB6: '¶', 0xB7: '·', 0xB8: 'ё', 0xB9: '№', 0xBA: 'є', 0xBB: '»', 0xBC: 'ј', 0xBD: 'Ѕ', 0xBE: 'ѕ', 0xBF: 'ї',
  0xC0: 'А', 0xC1: 'Б', 0xC2: 'В', 0xC3: 'Г', 0xC4: 'Д', 0xC5: 'Е', 0xC6: 'Ж', 0xC7: 'З', 0xC8: 'И', 0xC9: 'Й', 0xCA: 'К', 0xCB: 'Л', 0xCC: 'М', 0xCD: 'Н', 0xCE: 'О', 0xCF: 'П',
  0xD0: 'Р', 0xD1: 'С', 0xD2: 'Т', 0xD3: 'У', 0xD4: 'Ф', 0xD5: 'Х', 0xD6: 'Ц', 0xD7: 'Ч', 0xD8: 'Ш', 0xD9: 'Щ', 0xDA: 'Ъ', 0xDB: 'Ы', 0xDC: 'Ь', 0xDD: 'Э', 0xDE: 'Ю', 0xDF: 'Я',
  0xE0: 'а', 0xE1: 'б', 0xE2: 'в', 0xE3: 'г', 0xE4: 'д', 0xE5: 'е', 0xE6: 'ж', 0xE7: 'з', 0xE8: 'и', 0xE9: 'й', 0xEA: 'к', 0xEB: 'л', 0xEC: 'м', 0xED: 'н', 0xEE: 'о', 0xEF: 'п',
  0xF0: 'р', 0xF1: 'с', 0xF2: 'т', 0xF3: 'у', 0xF4: 'ф', 0xF5: 'х', 0xF6: 'ц', 0xF7: 'ч', 0xF8: 'ш', 0xF9: 'щ', 0xFA: 'ъ', 0xFB: 'ы', 0xFC: 'ь', 0xFD: 'э', 0xFE: 'ю', 0xFF: 'я'
};

const cp1251Rev: { [key: string]: number } = {};
for (const [byteStr, char] of Object.entries(cp1251Table)) {
  cp1251Rev[char] = Number(byteStr);
}

function decodeKrako(krako: string): string {
  if (!krako) return krako;
  const bytes: number[] = [];
  for (let i = 0; i < krako.length; i++) {
    const char = krako[i];
    const code = char.charCodeAt(0);
    if (cp1251Rev[char] !== undefined) {
      bytes.push(cp1251Rev[char]);
    } else if (code <= 127) {
      bytes.push(code);
    } else {
      bytes.push(code & 0xFF);
    }
  }
  return Buffer.from(bytes).toString('utf-8');
}

// Inspect screens as separate frames
const canvas = data.nodes['0:1'].document;
const desktops = canvas.children.filter((n: any) => n.type === 'FRAME' && n.name.toLowerCase().includes('desktop'));

desktops.forEach((desk: any) => {
  const deskName = decodeKrako(desk.name);
  console.log(`\n======================================================`);
  console.log(`SCREEN FRAME: ${deskName} (Id: ${desk.id})`);
  console.log(`Styles/Background: ${JSON.stringify(desk.backgroundColor || desk.fills)}`);
  console.log(`Bounding Box: ${JSON.stringify(desk.absoluteBoundingBox)}`);
  console.log(`======================================================`);
  
  function inspectNode(node: any, depth = 0) {
    const spaces = '  '.repeat(depth);
    const decodedName = decodeKrako(node.name || '');
    let details = '';
    
    if (node.type === 'RECTANGLE' || node.type === 'ELLIPSE' || node.type === 'VECTOR') {
      const fills = node.fills ? node.fills.map((f: any) => {
        if (f.type === 'SOLID') {
          const r = Math.round(f.color.r * 255);
          const g = Math.round(f.color.g * 255);
          const b = Math.round(f.color.b * 255);
          const a = f.opacity !== undefined ? f.opacity : (f.color.a !== undefined ? f.color.a : 1);
          return `Solid(${r}, ${g}, ${b}, ${a})`;
        }
        return f.type;
      }).join(', ') : 'No Fills';
      
      const strokes = node.strokes ? node.strokes.map((s: any) => {
        if (s.type === 'SOLID') {
          return `Solid(${Math.round(s.color.r * 255)}, ${Math.round(s.color.g * 255)}, ${Math.round(s.color.b * 255)})`;
        }
        return s.type;
      }).join(', ') : 'No Strokes';

      details = `fills=[${fills}] strokes=[${strokes}] r=${node.cornerRadius || 0} box=${JSON.stringify(node.absoluteBoundingBox)}`;
    } else if (node.type === 'TEXT') {
      const chars = decodeKrako(node.characters || '');
      const color = node.fills && node.fills[0] && node.fills[0].color ? 
        `rgb(${Math.round(node.fills[0].color.r * 255)}, ${Math.round(node.fills[0].color.g * 255)}, ${Math.round(node.fills[0].color.b * 255)})` : 'N/A';
      details = `chars="${chars.replace(/\n/g, '\\n')}" font=${node.style?.fontFamily} px=${node.style?.fontSize} color=${color} box=${JSON.stringify(node.absoluteBoundingBox)}`;
    } else if (node.type === 'FRAME' || node.type === 'GROUP') {
      details = `box=${JSON.stringify(node.absoluteBoundingBox)}`;
    }
    
    console.log(`${spaces}- [${node.type}] "${decodedName}" : ${details}`);
    
    if (node.children) {
      node.children.forEach((child: any) => inspectNode(child, depth + 1));
    }
  }

  desk.children.forEach((child: any) => inspectNode(child));
});
