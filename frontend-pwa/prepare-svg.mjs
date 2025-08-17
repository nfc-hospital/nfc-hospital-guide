import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

const inputFile = process.argv[2];
const outputFile = process.argv[3];

if (!inputFile || !outputFile) {
  console.error('Usage: node prepare-svg.mjs <input_file> <output_file>');
  process.exit(1);
}

const inputPath = path.resolve(inputFile);
const outputPath = path.resolve(outputFile);

try {
  const svgContent = fs.readFileSync(inputPath, 'utf8');
  const $ = cheerio.load(svgContent, { xmlMode: true });

  let counter = 0;
  
  // 클릭 가능한 영역일 가능성이 높은 요소들을 대상으로 합니다
  // path, rect, circle 태그 중 fill 속성이 있는 것들
  $('path[fill], rect[fill], circle[fill]').each(function() {
    const element = $(this);
    const currentId = element.attr('id');
    
    // 이미 ID가 있다면 건너뜁니다
    if (!currentId) {
      counter++;
      const newId = `shape-${counter}`;
      element.attr('id', newId);
      element.attr('data-name', `구역 ${counter}`);
      element.attr('data-interactive', 'true');
    }
  });

  // rect 태그도 처리 (방을 나타낼 가능성이 높음)
  $('rect').each(function() {
    const element = $(this);
    const currentId = element.attr('id');
    
    if (!currentId && !element.attr('data-interactive')) {
      counter++;
      const newId = `rect-${counter}`;
      element.attr('id', newId);
      element.attr('data-name', `방 ${counter}`);
      element.attr('data-interactive', 'true');
    }
  });

  // circle 태그도 처리 (특별한 구역을 나타낼 수 있음)
  $('circle').each(function() {
    const element = $(this);
    const currentId = element.attr('id');
    
    if (!currentId && !element.attr('data-interactive')) {
      counter++;
      const newId = `circle-${counter}`;
      element.attr('id', newId);
      element.attr('data-name', `원형구역 ${counter}`);
      element.attr('data-interactive', 'true');
    }
  });

  fs.writeFileSync(outputPath, $.xml(), 'utf8');
  console.log(`✅ Successfully processed SVG file`);
  console.log(`   Input: ${inputPath}`);
  console.log(`   Output: ${outputPath}`);
  console.log(`   Added IDs to ${counter} elements`);
  
} catch (error) {
  console.error('❌ Error processing SVG file:', error.message);
  process.exit(1);
}