export const ref_categories = [
  'PATHWAY',
  'ROAD',
  'VILLAGE',
  'CITY',
  'TOWN',
  'RIVER',
  'PISTE',
  'LAKE',
  'RESERVOIR',
  'COL',
  'PEAK',
  'POWERLINE',
  'SKILIFT',
];

export const tree = {
  CITIES: ['TOWN', 'CITY', 'VILLAGE'],
  RELIEF: ['PEAK', 'COL'],
  HYDRO: ['RIVER', 'LAKE', 'RESERVOIR'],
  'ROADS-PATHS-PISTES': ['ROAD', 'PATHWAY', 'PISTE'],
  INSTHUMAN: ['POWERLINE', 'SKILIFT'],
  // OSO: [],
};


/**
* Default colors for OSM items (used when the tree is hovered
* and also as default color when opening the clue box).
*/
export const default_tree_colors = new Map([
  ['PEAK', '#FF4500'], // OrangeRed
  ['COL', '#FF4500'], // OrangeRed
  ['LAKE', '#4169E1'], // RoyalBlue
  ['RESERVOIR', '#4169E1'], // RoyalBlue
  ['RIVER', '#483D8B'], // DarkSlateBlue
  ['PATHWAY', '#F4a460'], // SandyBrown
  ['PISTE', '#2F4F4F'], // DarkSlateGray
  ['ROAD', '#696969'], // DimGray
  ['SKILIFT', '#808080'], // Gray
  ['POWER', '#2F4F4F'], // DarkSlateGray
  ['CITY', '#FF0000'], // Red
  ['TOWN', '#FF0000'], // Red
  ['VILLAGE', '#FF0000'], // Red
]);

export const trad_tree_concept = {
  CITIES: 'Villes et villages',
  TOWN: 'Grandes villes',
  CITY: 'Villes moyennes',
  VILLAGE: 'Villages',
  HYDRO: 'Hydrologie',
  RELIEF: 'Reliefs',
  'ROADS-PATHS-PISTES': 'Routes, sentiers et pistes',
  INSTHUMAN: 'Installations humaines',
  RIVER: 'Rivières et ruisseaux',
  LAKE: 'Lacs et plans d\'eaux',
  RESERVOIR: 'Réservoirs',
  PEAK: 'Sommets',
  COL: 'Cols',
  ROAD: 'Routes',
  PATHWAY: 'Sentiers de randonnée',
  PISTE: 'Pistes de ski',
  POWERLINE: 'Lignes électriques',
  SKILIFT: 'Cables de remontées mécaniques',
  // OSO: 'Occupation du sol',
};

export const trad_tree_concept_singular = {
  CITIES: 'villes et villages',
  TOWN: 'Une grande ville',
  CITY: 'Une ville moyenne',
  VILLAGE: 'Un village',
  RIVER: 'Une rivière ou un ruisseau',
  LAKE: 'Un lac ou un plan d\'eau',
  RESERVOIR: 'Un réservoir',
  PEAK: 'Un sommet',
  COL: 'Un col',
  ROAD: 'Une route',
  PATHWAY: 'Un sentier de randonnée',
  PISTE: 'Une piste de ski',
  POWERLINE: 'Une ligne électrique',
  SKILIFT: 'Une cable de remontées mécaniques',
};

export const all_activities = [
  'Aucune',
  'Ski',
  'VTT',
  'Escalade',
  'Randonnée Pédestre',
  'Canyoning',
  'Spéléologie',
  'Parapente',
  'Autre Activité',
];
