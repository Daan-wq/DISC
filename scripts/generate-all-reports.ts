#!/usr/bin/env tsx
/**
 * Generate HTML reports for all 16 DISC profiles using test data
 *
 * This script:
 * 1. Loads the test data for each profile
 * 2. Copies the HTML template for each profile
 * 3. Fills in the placeholders with test data
 * 4. Saves the filled HTML reports
 */

import fs from 'fs';
import path from 'path';

// Load test data
const testDataPath = path.resolve(__dirname, '../test-data/disc-test-answers.json');
const testData = JSON.parse(fs.readFileSync(testDataPath, 'utf-8'));

// Template and output paths
const templatesDir = path.resolve(__dirname, '../apps/quiz/public/report-templates');
const outputDir = path.resolve(__dirname, '../test-data/generated-reports');

// Ensure output directory exists
fs.mkdirSync(outputDir, { recursive: true });

// Copy cover-dynamic.js to output directory
const coverDynamicSrc = path.join(templatesDir, 'cover-dynamic.js');
const coverDynamicDest = path.join(outputDir, 'cover-dynamic.js');
if (fs.existsSync(coverDynamicSrc)) {
  fs.copyFileSync(coverDynamicSrc, coverDynamicDest);
}

// All 16 profiles
const profiles = ['D', 'I', 'S', 'C', 'DI', 'DC', 'DS', 'ID', 'IC', 'IS', 'SD', 'SI', 'SC', 'CD', 'CI', 'CS'];

// Format date as dd-mm-yyyy
function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

// Generate chart SVG
function generateChartSVG(natural: Record<string, number>, response: Record<string, number>): string {
  const width = 400;
  const height = 320;
  const margin = { top: 20, right: 130, left: 40, bottom: 50 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  const categories = ['D', 'I', 'S', 'C'];
  const colors: Record<string, string> = { D: '#cb1517', I: '#ffcb04', S: '#029939', C: '#2665ae' };
  const categoryWidth = chartWidth / categories.length;
  const barWidth = categoryWidth * 0.36;

  // Generate bars
  let bars = '';
  categories.forEach((category, index) => {
    const x = margin.left + index * categoryWidth + (categoryWidth - barWidth) / 2;
    const naturalHeight = (natural[category] / 100) * chartHeight;
    bars += `<rect x="${x}" y="${margin.top + chartHeight - naturalHeight}" width="${barWidth}" height="${naturalHeight}" fill="${colors[category]}"/>`;
  });

  // Generate line graph for response
  let linePoints = '';
  let lineMarkers = '';
  categories.forEach((category, index) => {
    const x = margin.left + index * categoryWidth + categoryWidth / 2;
    const responseHeight = (response[category] / 100) * chartHeight;
    const y = margin.top + chartHeight - responseHeight;
    linePoints += `${index === 0 ? 'M' : 'L'} ${x} ${y} `;
    lineMarkers += `<rect x="${x - 3}" y="${y - 3}" width="6" height="6" fill="#ffffff" stroke="#9ca3af" stroke-width="1.5"/>`;
  });

  const plotLeft = margin.left;
  const plotWidth = chartWidth;
  const y50 = margin.top + chartHeight - (50 / 100) * chartHeight;

  // Y-axis labels and grid lines
  let yAxisLabels = '';
  let gridLines = '';
  [0, 20, 40, 60, 80, 100].forEach(tick => {
    const y = margin.top + chartHeight - (tick / 100) * chartHeight;
    if (tick !== 0) {
      gridLines += `<line x1="${margin.left}" y1="${y}" x2="${margin.left + chartWidth}" y2="${y}" stroke="#e5e7eb" stroke-width="1"/>`;
    }
    yAxisLabels += `<text x="${margin.left - 10}" y="${y + 4}" text-anchor="end" font-size="10" fill="#666">${tick}%</text>`;
  });

  // X-axis labels
  const xLabels = categories.map((dim, index) => {
    const x = margin.left + (index + 0.5) * categoryWidth;
    return `<text x="${x}" y="${margin.top + chartHeight + 18}" text-anchor="middle" font-size="12" fill="#374151">${dim}</text>`;
  }).join('');

  // Legend
  const legendX = margin.left + chartWidth + 12;
  const legendY = margin.top + 6;
  const legend = `
    <g transform="translate(${legendX}, ${legendY})">
      <rect x="0" y="0" width="14" height="10" fill="#9ca3af"/>
      <text x="20" y="9" font-size="11" fill="#333">Natuurlijke stijl</text>
      <line x1="0" y1="26" x2="14" y2="26" stroke="#9ca3af" stroke-width="1.5"/>
      <rect x="6" y="23" width="6" height="6" fill="#ffffff" stroke="#9ca3af" stroke-width="1.5"/>
      <text x="20" y="28" font-size="11" fill="#333">Respons stijl</text>
    </g>
  `;

  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs><style>text { font-family: 'PT Sans', Arial, sans-serif; }</style></defs>
    <rect width="${width}" height="${height}" fill="white"/>
    <rect x="${margin.left}" y="${margin.top}" width="${chartWidth}" height="${chartHeight}" fill="none" stroke="#e5e7eb" stroke-width="1"/>
    ${yAxisLabels}
    ${gridLines}
    <line x1="${plotLeft}" x2="${plotLeft + plotWidth}" y1="${y50}" y2="${y50}" stroke="rgba(0,0,0,0.35)" stroke-width="1.25" stroke-dasharray="4 4"/>
    ${bars}
    <path d="${linePoints}" stroke="#9ca3af" stroke-width="1.5" fill="none"/>
    ${lineMarkers}
    ${xLabels}
    ${legend}
  </svg>`;
}

// Fill placeholders in HTML
function fillPlaceholders(html: string, data: {
  name: string;
  date: string;
  profileCode: string;
  natural: Record<string, number>;
  response: Record<string, number>;
  chartDataUri: string;
}): string {
  let result = html;

  // Replace name placeholders
  result = result.replace(/<<Naam>>/g, data.name);
  result = result.replace(/&lt;&lt;Naam&gt;&gt;/g, data.name);
  result = result.replace(/<<Voornaam>>/g, data.name.split(' ')[0]);
  result = result.replace(/&lt;&lt;Voornaam&gt;&gt;/g, data.name.split(' ')[0]);

  // Replace date placeholder
  result = result.replace(/<<Datum>>/g, data.date);

  // Replace style placeholder
  result = result.replace(/<<Stijl>>/g, data.profileCode);

  // Replace percentage values (8 total: 4 natural + 4 response)
  const percentageValues = [
    `${Math.round(data.natural.D)}%`,
    `${Math.round(data.natural.I)}%`,
    `${Math.round(data.natural.S)}%`,
    `${Math.round(data.natural.C)}%`,
    `${Math.round(data.response.D)}%`,
    `${Math.round(data.response.I)}%`,
    `${Math.round(data.response.S)}%`,
    `${Math.round(data.response.C)}%`
  ];

  let percentageIndex = 0;
  result = result.replace(/\b0%/g, (match) => {
    if (percentageIndex < percentageValues.length) {
      return percentageValues[percentageIndex++];
    }
    return match;
  });

  return result;
}

// Copy directory recursively
function copyDirSync(src: string, dest: string): void {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('Generating DISC reports for all 16 profiles...\n');

for (const profile of profiles) {
  console.log(`Generating report for profile: ${profile}`);

  const profileData = testData[profile];
  if (!profileData) {
    console.log(`  No test data found for ${profile}, skipping`);
    continue;
  }

  const templateDir = path.join(templatesDir, profile);
  const reportDir = path.join(outputDir, profile);

  if (!fs.existsSync(templateDir)) {
    console.log(`  Template not found for ${profile}, skipping`);
    continue;
  }

  // Copy template directory
  copyDirSync(templateDir, reportDir);

  // Read publication.html
  const publicationPath = path.join(reportDir, 'publication-web-resources', 'html', 'publication.html');
  if (!fs.existsSync(publicationPath)) {
    console.log(`  publication.html not found for ${profile}`);
    continue;
  }

  let html = fs.readFileSync(publicationPath, 'utf-8');

  // Generate chart SVG and convert to data URI
  const natural = profileData.percentages;
  // For testing, use same values for response (you can adjust this)
  const response = { D: 50, I: 50, S: 50, C: 50 };
  const chartSvg = generateChartSVG(natural, response);
  const chartDataUri = `data:image/svg+xml;base64,${Buffer.from(chartSvg).toString('base64')}`;

  // Fill placeholders with varying name lengths for testing
  const testNames: Record<string, string> = {
    'D': 'Jan',
    'I': 'Maria de Vries',
    'S': 'Alexander van der Berg',
    'C': 'Maximiliaan Johannes Bartholomeus van den Hoogenband',
    'DI': 'Emma',
    'DC': 'Lucas Jansen',
    'DS': 'Sophie Elizabeth',
    'ID': 'Test ID',
    'IC': 'Test IC met langere naam',
    'IS': 'Korte',
    'SD': 'Een hele lange naam om te testen hoe de centrering werkt',
    'SI': 'Anna',
    'SC': 'Pieter van der Linden',
    'CD': 'Charlotte',
    'CI': 'Willem-Alexander',
    'CS': 'Test CS'
  };

  // Fill placeholders
  html = fillPlaceholders(html, {
    name: testNames[profile] || `Test ${profile}`,
    date: formatDate(new Date()),
    profileCode: profile,
    natural,
    response,
    chartDataUri
  });

  // Save filled HTML
  fs.writeFileSync(publicationPath, html, 'utf-8');

  // Also update index.html to have correct title
  const indexPath = path.join(reportDir, 'index.html');
  let indexHtml = fs.readFileSync(indexPath, 'utf-8');
  indexHtml = indexHtml.replace('<title>', `<title>DISC Rapport - ${profile} - `);
  fs.writeFileSync(indexPath, indexHtml, 'utf-8');

  console.log(`  Report saved to: ${reportDir}`);
}

console.log(`\nAll reports generated!`);
console.log(`Output folder: ${outputDir}`);
console.log(`\nOpen any index.html file in a browser to view the report.`);
console.log(`Use the browser's print function (Ctrl+P) to save as PDF.`);
