import fs from 'fs';
import path from 'path';

const tempDir = './temp';
const files = fs.readdirSync(tempDir).filter(f => f.endsWith('.png'));

files.forEach(f => {
  const filePath = path.join(tempDir, f);
  const buffer = fs.readFileSync(filePath);
  
  // Extract all printable ASCII strings of length >= 3
  let currentString = '';
  const strings: string[] = [];
  
  for (let i = 0; i < Math.min(buffer.length, 2048); i++) {
    const char = buffer[i];
    if (char >= 32 && char <= 126) {
      currentString += String.fromCharCode(char);
    } else {
      if (currentString.length >= 3) {
        strings.push(currentString);
      }
      currentString = '';
    }
  }
  if (currentString.length >= 3) {
    strings.push(currentString);
  }
  
  console.log(`\n--- File: ${f} ---`);
  console.log('ASCII strings in header:', strings.filter(s => s.toLowerCase().includes('png') || s.toLowerCase().includes('adobe') || s.toLowerCase().includes('paint') || s.toLowerCase().includes('meta') || s.length > 5).slice(0, 10));
});
