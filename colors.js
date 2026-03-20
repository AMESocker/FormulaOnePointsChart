// File: colors.js

export const teamColors = {
  'Mercedes': '#00D7B6',
  'Ferrari': '#B30E1C',
  'McLaren': '#F47600',
  'Haas F1 Team': '#9f9f9f',
  'Haas': '#9f9f9f',
  'Red Bull': '#0e346eff',
  'RB F1 Team': '#96b5fcff',
  'Alpine F1 Team': '#00A1E8',
  'Audi': '#A71E00',
  'Williams': '#1459b9ff',
  'Cadillac F1 Team': '#7b7b7b',
  'Aston Martin': '#166348',
  'Sauber': '#00E701',
  'AlphaTauri': '#2B4562',
  'Alfa Romeo': '#a21d1d',
  'Racing Point':'#f596c8',
  'Renault':'#009368'
};

export const teamColorsByYear = {
  '2026': {
    'Mercedes': '#00D7B6',
    'Ferrari': '#B30E1C',
    'McLaren': '#F47600',
    'Haas F1 Team': '#9f9f9f',
    'Red Bull': '#0e346eff',
    'RB F1 Team': '#96b5fcff',
    'Alpine F1 Team': '#00A1E8',
    'Audi': '#A71E00',
    'Williams': '#1459b9ff',
    'Cadillac F1 Team': '#7b7b7b',
    'Aston Martin': '#166348',
  },
  '2023': {
    'AlphaTauri': '#2B4562',
    'Alfa Romeo': '#909090'
  }
};

export function getTeamColor(teamName, year) {
  const yearColors = teamColorsByYear[parseInt(year)];
  if (yearColors && yearColors[teamName]) {
    return yearColors[teamName];
  }
  return teamColors[teamName] || null;
}

export const teamSecondaryColors = {
  'Mercedes': '#909090',
  'Ferrari': '#DDDDDD',
  'McLaren': '#686868',
  'Haas F1 Team': '#EB1416',
  'Red Bull': '#E0C245',
  'RB F1 Team': '#D6D6D6',
  'Alpine F1 Team': '#EE7CB5',
  'Audi': '#D8D4D2',
  'Racing Bulls': '#001a5c',
  'Williams': '#157BAA',
  'Sauber': '#003300',
  'Cadillac F1 Team': '#e6e5e5',
  'Aston Martin': '#00c89a',
  'Kick Sauber': '#C1C23E',
};

export const teamSecondaryColorsByYear = {
  '2023': {
    'AlphaTauri': '#2B4562',
    'Alfa Romeo': '#909090'
  }
}

export function getTeamSecondaryColor(teamName, year) {
  const yearColors = teamSecondaryColorsByYear[parseInt(year)];
  if (yearColors && yearColors[teamName]) {
    return yearColors[teamName];
  }
  return teamSecondaryColors[teamName] || '#333';
}