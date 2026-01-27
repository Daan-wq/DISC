import { Insight, ProfileCode } from '../types';

export const INSIGHTS_BY_PROFILE: Record<string, Insight[]> = {
  'D': [
    { title: 'Besluitvaardig', description: 'Neemt snel beslissingen en houdt van actie.', category: 'strength' },
    { title: 'Resultaatgericht', description: 'Focust op doelen en uitkomsten.', category: 'strength' },
    { title: 'Direct', description: 'Communiceert to-the-point en windt er geen doekjes om.', category: 'communication' },
  ],
  'I': [
    { title: 'Enthousiast', description: 'Brengt energie en optimisme in het team.', category: 'strength' },
    { title: 'Overtuigend', description: 'Kan anderen goed motiveren en meenemen.', category: 'strength' },
    { title: 'Expressief', description: 'Communiceert met emotie en verhalen.', category: 'communication' },
  ],
  'S': [
    { title: 'Geduldig', description: 'Luistert goed en neemt de tijd voor anderen.', category: 'strength' },
    { title: 'Loyal', description: 'Is betrouwbaar en ondersteunend.', category: 'strength' },
    { title: 'Attent', description: 'Heeft oog voor de gevoelens van anderen.', category: 'communication' },
  ],
  'C': [
    { title: 'Nauwkeurig', description: 'Let op details en kwaliteit.', category: 'strength' },
    { title: 'Analytisch', description: 'Denkt logisch en systematisch.', category: 'strength' },
    { title: 'Feitelijk', description: 'Communiceert op basis van feiten en data.', category: 'communication' },
  ],
  // Combinations
  'DI': [
    { title: 'Inspirerende Leider', description: 'Combineert daadkracht met charisma.', category: 'strength' },
    { title: 'Snelle Schakelaar', description: 'Past zich snel aan en neemt initiatief.', category: 'strength' },
  ],
  // ... Add other combinations as needed for the prototype
};

export function getInsightsForProfile(code: ProfileCode): Insight[] {
  // Fallback to single letter insights if exact code match not found (simplified logic)
  return INSIGHTS_BY_PROFILE[code] || INSIGHTS_BY_PROFILE[code.charAt(0)] || [];
}
