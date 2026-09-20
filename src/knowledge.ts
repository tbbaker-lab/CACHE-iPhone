export type KnowledgeCard = {
  id: string;
  title: string;
  category: string;
  keywords: string[];
  text: string;
};

export const KNOWLEDGE: KnowledgeCard[] = [
  {
    id: 'cold',
    title: 'Cold exposure',
    category: 'First aid',
    keywords: ['cold', 'freezing', 'hypothermia', 'blanket', 'wet', 'warm'],
    text: 'Get out of wind and wet conditions. Insulate yourself from the ground, replace wet clothing when possible, add dry layers, cover the head and neck, and warm the torso gradually. Confusion, marked drowsiness, clumsiness, or slowed breathing can indicate hypothermia and needs urgent medical help.'
  },
  {
    id: 'water',
    title: 'Emergency water treatment',
    category: 'Water',
    keywords: ['water', 'purify', 'boil', 'drink', 'filter', 'stream'],
    text: 'Clear water can still contain pathogens. When practical, bring water to a rolling boil and let it cool in a clean covered container. Filters vary and may not remove every virus or chemical contaminant. Avoid drinking water that may contain fuel, pesticides, heavy metals, or other chemicals.'
  },
  {
    id: 'bleeding',
    title: 'Severe bleeding',
    category: 'First aid',
    keywords: ['bleed', 'bleeding', 'blood', 'cut', 'wound'],
    text: 'Use firm continuous direct pressure with clean cloth or gauze. Add more material on top if it soaks through rather than repeatedly lifting the first layer. Life-threatening bleeding from a limb may require a commercial tourniquet used according to its instructions. Get emergency help as soon as possible.'
  },
  {
    id: 'burns',
    title: 'Burns',
    category: 'First aid',
    keywords: ['burn', 'burned', 'burnt', 'scald'],
    text: 'Cool a thermal burn with cool running water for about 20 minutes when practical. Remove nearby jewelry or clothing unless stuck to the skin. Do not use ice, butter, toothpaste, or creams on a serious fresh burn. Cover loosely with a clean non-fluffy dressing and seek medical help for significant burns.'
  },
  {
    id: 'antibiotics',
    title: 'Antibiotic safety',
    category: 'Medical',
    keywords: ['penicillin', 'antibiotic', 'antibiotics', 'infection'],
    text: 'Do not try to manufacture, culture, purify, or dose homemade antibiotics. Identity, contamination, potency, allergy risk, and correct dosing cannot be controlled safely. Focus on wound cleaning, hygiene, monitoring for infection, and obtaining regulated medicine and professional care.'
  },
  {
    id: 'navigation',
    title: 'If you are lost',
    category: 'Navigation',
    keywords: ['lost', 'navigation', 'navigate', 'direction', 'map', 'compass'],
    text: 'Stop and assess before moving farther. Preserve phone battery, note landmarks and your last known position, and use a map, compass, or GPS if available. If rescuers know your route, staying in a safe visible place can be better than wandering.'
  },
  {
    id: 'power',
    title: 'Emergency power',
    category: 'Power',
    keywords: ['electricity', 'power', 'battery', 'solar', 'generator', 'charge'],
    text: 'Practical small-scale power sources include charged batteries, solar panels, hand-crank generators, and vehicle electrical systems. Avoid improvised mains-voltage wiring. Keep batteries dry, prevent short circuits, and ventilate fuel-burning generators outdoors well away from openings.'
  },
  {
    id: 'shelter',
    title: 'Emergency shelter',
    category: 'Shelter',
    keywords: ['shelter', 'tent', 'sleep', 'wind', 'rain', 'camp'],
    text: 'Choose ground away from flood channels, unstable trees, cliffs, and obvious hazards. Prioritize protection from wind and rain, then insulation from the ground. Keep ventilation if using an enclosed shelter, and never use fuel-burning heaters in an unventilated space.'
  },
  {
    id: 'fire',
    title: 'Fire safety',
    category: 'Fire',
    keywords: ['fire', 'flame', 'smoke', 'campfire', 'ignite'],
    text: 'Use the smallest fire that meets your need and keep it away from tents, dry vegetation, fuel, and structures. Keep water or soil ready to extinguish it. Never use a charcoal grill, generator, or other combustion source in an enclosed sleeping area because of carbon monoxide.'
  },
  {
    id: 'sanitation',
    title: 'Sanitation',
    category: 'Hygiene',
    keywords: ['toilet', 'waste', 'sanitation', 'hygiene', 'wash'],
    text: 'Keep human waste, washing, and food preparation away from water sources. Wash hands or use an effective sanitizer before handling food and after toileting. Separate clean and dirty containers so treated water is not re-contaminated.'
  },
  {
    id: 'food',
    title: 'Food safety',
    category: 'Food',
    keywords: ['food', 'eat', 'hungry', 'meat', 'spoiled', 'cook'],
    text: 'Prioritize known safe food. Cook perishable animal foods thoroughly when possible, keep raw foods separate from ready-to-eat foods, and discard food with obvious spoilage or unsafe storage history. Do not guess that an unknown wild plant or mushroom is edible.'
  },
  {
    id: 'signals',
    title: 'Signalling for rescue',
    category: 'Rescue',
    keywords: ['rescue', 'signal', 'help', 'sos', 'flare', 'whistle'],
    text: 'Make yourself easy to locate without creating new hazards. Use repeated whistle blasts, bright contrasting material, a flashlight, or other visible signals. Conserve phone battery and send your location when a connection becomes available.'
  },
  {
    id: 'vehicle',
    title: 'Vehicle breakdown',
    category: 'Vehicle',
    keywords: ['car', 'vehicle', 'breakdown', 'stuck', 'battery', 'road'],
    text: 'Move out of active traffic if it is safe to do so, use hazard lights or warning devices, and avoid standing where another vehicle could strike you. In extreme weather, the vehicle may provide useful shelter. Never run an engine in an enclosed space.'
  }
];

export function retrieveLocalKnowledge(query: string, max = 3): KnowledgeCard[] {
  const text = query.toLowerCase();
  return KNOWLEDGE
    .map((card) => ({
      card,
      score: card.keywords.reduce((score, word) => score + (text.includes(word) ? 2 : 0), 0) +
        (text.includes(card.category.toLowerCase()) ? 1 : 0)
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map((item) => item.card);
}
