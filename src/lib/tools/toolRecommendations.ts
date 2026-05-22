// src/lib/tools/toolRecommendations.ts
// Internal link and next-action generator. Pure functions.
// Only generates links for guides with available: true — never dead links.

import type { ToolBreed, ToolNextAction } from './toolTypes';

export function buildNextAction(
  label: string,
  href: string,
  type: ToolNextAction['type'],
  eventName?: string
): ToolNextAction {
  return { label, href, type, eventName };
}

export function getBreedNextActions(breed: ToolBreed): ToolNextAction[] {
  const actions: ToolNextAction[] = [
    buildNextAction(`View ${breed.name} breed guide`, `/breeds/${breed.slug}`, 'breed', 'rec_breed_guide'),
  ];

  if (breed.flags.hasCostCalculator) {
    actions.push(buildNextAction(`${breed.name} cost calculator`, `/cost-calculator/${breed.slug}`, 'cost', 'rec_cost_calc'));
  }

  const namesLink = breed.guideLinks.find((g) => g.key === 'names' && g.available);
  if (namesLink) {
    actions.push(buildNextAction(`${breed.name} dog names`, namesLink.href, 'guide', 'rec_names'));
  }

  const foodLink = breed.guideLinks.find((g) => g.key === 'food' && g.available);
  if (foodLink) {
    actions.push(buildNextAction(`Best food for ${breed.name}`, foodLink.href, 'guide', 'rec_food'));
  }

  const healthLink = breed.guideLinks.find((g) => g.key === 'health' && g.available);
  if (healthLink) {
    actions.push(buildNextAction(`${breed.name} health guide`, healthLink.href, 'guide', 'rec_health'));
  }

  const trainingLink = breed.guideLinks.find((g) => g.key === 'training' && g.available);
  if (trainingLink) {
    actions.push(buildNextAction(`${breed.name} training tips`, trainingLink.href, 'guide', 'rec_training'));
  }

  return actions;
}

export function getToolNextActions(toolKey: string): ToolNextAction[] {
  const allTools: ToolNextAction[] = [
    buildNextAction('Find your breed match', '/tools/breed-match', 'tool', 'nav_breed_match'),
    buildNextAction('Compare breeds', '/tools/compare', 'tool', 'nav_compare'),
    buildNextAction('Puppy cost planner', '/tools/puppy-cost', 'tool', 'nav_puppy_cost'),
    buildNextAction('Supplies checklist', '/tools/puppy-supplies', 'tool', 'nav_supplies'),
    buildNextAction('Full cost calculator', '/cost-calculator', 'cost', 'nav_cost_calc'),
  ];

  // Exclude the current tool from cross-tool recommendations
  return allTools.filter((a) => !a.href.endsWith(toolKey)).slice(0, 4);
}
