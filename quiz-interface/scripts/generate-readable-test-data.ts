#!/usr/bin/env tsx
import fs from 'fs';
import path from 'path';

// Statement ID to question text mapping (from quiz page)
const statements: Record<number, string> = {
  1: "Ik houd rekening met anderen",
  2: "Ik ben levendig",
  3: "Ik leg de lat hoog voor mezelf",
  4: "Ik houd van uitdagingen",
  5: "Ik werk graag samen",
  6: "Ik ben bedachtzaam",
  7: "Ik ben vastbesloten",
  8: "Ik ben vriendelijk tegen anderen",
  9: "Ik weet wat mensen willen",
  10: "Ik ben een durfal",
  11: "Ik ben meelevend, empathisch",
  12: "Ik overtuig anderen met mijn charme",
  13: "Ik houd van nieuwe ideeën en plannen",
  14: "Ik ga conflicten uit de weg",
  15: "Ik blijf bij mijn beslissing",
  16: "Ik werk het liefst door tot een taak af is",
  17: "Ik ben enthousiast",
  18: "Ik doe dingen zorgvuldig",
  19: "Ik heb moed en lef",
  20: "Ik word niet snel boos",
  21: "Ik houd van competitie en wil winnen",
  22: "Ik denk aan de gevoelens van andere mensen",
  23: "Ik ben zorgeloos in mijn handelen",
  24: "Ik ben soms gereserveerd",
  25: "Ik ben nauwkeurig",
  26: "Ik ben volgzaam",
  27: "Ik wil graag de beste zijn",
  28: "Ik maak graag plezier bij de dingen die ik doe",
  29: "Ik ben volhardend, vasthoudend, dapper",
  30: "Ik kan anderen goed overtuigen",
  31: "Ik ga niet snel in discussie",
  32: "Ik stel vaak vragen, ben bedachtzaam",
  33: "Ik ben hartelijk en gezellig",
  34: "Ik ben rustig en geduldig",
  35: "Ik ben onafhankelijk",
  36: "Ik ben nauwkeurig en analytisch",
  37: "Ik daag mezelf graag uit",
  38: "Ik beslis nadat ik alle feiten ken",
  39: "Ik kan me laten beïnvloeden door andere meningen",
  40: "Ik doe dingen op een rustige manier",
  41: "Ik houd van interactie met anderen",
  42: "Ik zeg niet snel wat mijn gevoelens zijn",
  43: "Ik wil details en feiten horen",
  44: "Ik besluit snel",
  45: "Ik ben een entertainer",
  46: "Ik neem gemakkelijk risico's",
  47: "Ik ben discreet",
  48: "Ik help anderen graag",
  49: "Ik ben krachtig in mijn handelen",
  50: "Ik ben extravert",
  51: "Ik kan goed samenwerken",
  52: "Ik wil geen fouten maken",
  53: "Ik werk met een planning",
  54: "Ik doe dingen op mijn manier",
  55: "Ik houd graag iedereen tevreden",
  56: "Ik ben vriendelijk en geduldig",
  57: "Ik ondersteun anderen graag",
  58: "Ik ben gericht op actie",
  59: "Ik ben tactvol",
  60: "Ik toon mijn gevoelens makkelijk",
  61: "Ik vertrouw anderen snel",
  62: "Ik ben begripvol naar mijn omgeving",
  63: "Ik ben een rationele denker",
  64: "Ik heb veel zelfvertrouwen",
  65: "Ik houd van logische methodes",
  66: "Ik volg bewezen werkwijzen",
  67: "Ik ben actief, levenslustig",
  68: "Ik ben een doorzetter",
  69: "Ik ben veeleisend voor mezelf en anderen",
  70: "Ik werk gemakkelijk samen",
  71: "Ik ben communicatief",
  72: "Ik heb een duidelijke eigen mening",
  73: "Ik ben nieuwsgierig naar zaken",
  74: "Ik ben resultaat- en doelgericht",
  75: "Ik ben optimistisch van aard",
  76: "Ik ben tolerant en makkelijk in de omgang",
  77: "Ik spreek anderen tegen als ik het er niet mee eens ben",
  78: "Ik ga moeilijkheden het liefst uit de weg",
  79: "Ik kom introvert over",
  80: "Ik ben spontaan",
  81: "Ik krijg energie door contact met anderen",
  82: "Ik houd van voorspelbaarheid",
  83: "Ik ben zelfverzekerd",
  84: "Ik maak me snel zorgen",
  85: "Ik wil graag mensen om me heen",
  86: "Ik ben nauwkeurig, correct en precies",
  87: "Ik kom krachtig over",
  88: "Ik ben gemakkelijk, meegaand",
  89: "Ik ben open en direct in mijn communicatie",
  90: "Ik maak analyses en zoek zaken uit",
  91: "Ik zorg dat anderen zich fijn en comfortabel voelen",
  92: "Ik ben ingetogen en sta open voor andere meningen",
  93: "Ik ben gericht op resultaten en oplossingen",
  94: "Ik doe graag taken zelf",
  95: "Ik vind het belangrijk dat anderen me aardig vinden",
  96: "Ik deel mijn persoonlijke gedachten niet snel"
};

// Load JSON data
const jsonPath = path.resolve(__dirname, '../test-data/disc-test-answers.json');
const testData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

// Generate markdown with new layout format
// Format: statement ID followed by text, with 3 empty lines between each answer
let markdown = `## Alle antwoorden:\n`;

// First, list all 96 statements for reference
for (let i = 1; i <= 96; i++) {
  markdown += `${i}) ${statements[i]}\n`;
}
markdown += `\n\n`;

const profiles = ['D', 'I', 'S', 'C', 'DI', 'DC', 'DS', 'ID', 'IC', 'IS', 'SD', 'SI', 'SC', 'CD', 'CI', 'CS'];

for (const profile of profiles) {
  const data = testData[profile];
  const { D, I, S, C } = data.percentages;
  
  markdown += `## Profiel: ${profile}\n`;
  markdown += `Verwacht: ${profile} | Resultaat: ${data.actualProfile} (D=${D}%, I=${I}%, S=${S}%, C=${C}%)\n\n`;
  
  // Show BOTH most and least for each question pair (48 total answers)
  // Format: statement ID followed by text, with 3 empty lines between each
  for (let i = 0; i < data.answers.length; i++) {
    const answer = data.answers[i];
    
    // First show MOST
    const mostId = answer.most;
    const mostText = statements[mostId];
    markdown += `${mostId}) ${mostText}\n`;
    markdown += `\n\n\n`;
    
    // Then show LEAST
    const leastId = answer.least;
    const leastText = statements[leastId];
    markdown += `${leastId}) ${leastText}\n`;
    
    // Add 3 empty lines between question pairs (except after the last one)
    if (i < data.answers.length - 1) {
      markdown += `\n\n\n`;
    }
  }
  
  markdown += `\n\n`;
}

// Save
const outputPath = path.resolve(__dirname, '../test-data/DISC-TEST-ANTWOORDEN.md');
fs.writeFileSync(outputPath, markdown, 'utf-8');

console.log(`✅ Leesbaar test document gegenereerd!`);
console.log(`📁 ${outputPath}`);
