/**
 * src/lib/breeds/breedDecisionEngine.ts
 *
 * Generates soft, hedged decision copy for breed pages.
 * Never uses: "perfect", "guaranteed", "best breed", "safest", "vet-approved".
 * Always uses: "may", "can be", "plan for", "compare carefully".
 */

import type { NormalizedBreed } from './normalizeBreed';
import type { BreedDecisionSignals } from './breedSignals';

export interface BreedVerdict {
  title: string;
  summary: string;
  tone: 'strong-fit' | 'balanced' | 'needs-planning';
  reasons: string[];
  watchouts: string[];
  assumptions: string[];
}

export interface BreedBestFor {
  bestFor: string[];
  notIdealFor: string[];
}

export interface BreedOwnerFitCard {
  label: string;
  value: string;
  tone: 'good' | 'neutral' | 'warning';
  explanation: string;
}

function tone(signals: BreedDecisionSignals): 'strong-fit' | 'balanced' | 'needs-planning' {
  const challenges = [
    signals.activityLoad === 'high',
    signals.groomingLoad === 'high',
    signals.trainingComplexity === 'hard',
    signals.costLoad === 'very-high',
    signals.firstTimeOwnerFit === 'challenging',
    signals.apartmentFit === 'challenging',
  ].filter(Boolean).length;

  if (challenges === 0 && signals.dataConfidence !== 'low') return 'strong-fit';
  if (challenges >= 3) return 'needs-planning';
  return 'balanced';
}

export function buildBreedQuickVerdict(
  breed: NormalizedBreed,
  signals: BreedDecisionSignals,
): BreedVerdict {
  const t = tone(signals);
  const name = breed.name;

  const livingContext =
    signals.apartmentFit === 'strong'
      ? 'apartment or smaller-space living'
      : signals.apartmentFit === 'possible'
        ? 'various living setups with regular outdoor access'
        : 'homes with outdoor space and room to move';

  const ownerContext =
    signals.firstTimeOwnerFit === 'strong'
      ? 'first-time and experienced owners'
      : signals.firstTimeOwnerFit === 'possible'
        ? 'owners with some preparation and consistency'
        : 'experienced dog owners who understand breed-specific needs';

  const title =
    t === 'strong-fit'
      ? `The ${name} can be a strong fit for ${ownerContext} who want ${signals.activityLoad === 'low' ? 'a calmer companion' : 'an active daily routine'}.`
      : t === 'needs-planning'
        ? `The ${name} can suit dedicated owners, but involves meaningful planning around activity, care, and cost.`
        : `The ${name} may suit ${ownerContext} — worth comparing against your lifestyle before deciding.`;

  const summary =
    t === 'strong-fit'
      ? `${name}s are generally known for being ${String(breed.temperament || 'adaptable').slice(0, 80).toLowerCase()}. They can work well for ${livingContext} with consistent routines. Use the tools below to compare costs, prepare a puppy plan, and confirm they match your lifestyle.`
      : t === 'needs-planning'
        ? `${name}s can be rewarding companions, but they require careful planning. Activity needs, grooming commitments, or training complexity may present challenges for some households. Compare carefully and use the cost calculator before deciding.`
        : `${name}s can fit a range of households. Their ${breed.energy.label.toLowerCase()} energy, ${breed.training.label.toLowerCase()} training profile, and ${breed.shedding.label.toLowerCase()} shedding are worth mapping against your daily routine. Use the tools below to compare and plan.`;

  const reasons: string[] = [];
  if (signals.apartmentFit === 'strong') reasons.push(`Can adapt to ${livingContext} with regular exercise`);
  if (signals.firstTimeOwnerFit === 'strong') reasons.push('Generally manageable for first-time owners with consistent training');
  if (signals.activityLoad === 'low') reasons.push('Lower daily exercise demands than many breeds');
  if (signals.sheddingLoad === 'low') reasons.push('Relatively low shedding for easier home management');
  if (signals.groomingLoad === 'low') reasons.push('Lower grooming maintenance compared to many breeds');
  if (signals.familyFit === 'strong') reasons.push('Generally does well with family environments — individual temperament varies');
  if (signals.trainingComplexity === 'easy') reasons.push('Tends to respond well to consistent, positive training');
  if (reasons.length === 0) reasons.push(`${name}s can be rewarding companions for the right household`);

  const watchouts: string[] = [];
  if (signals.activityLoad === 'high') watchouts.push('High daily exercise needs — under-stimulation can lead to problem behaviors');
  if (signals.groomingLoad === 'high') watchouts.push('Significant grooming commitment — plan time and budget before getting a puppy');
  if (signals.trainingComplexity === 'hard') watchouts.push('Training can be challenging — prior experience or professional help is worth considering');
  if (signals.costLoad === 'very-high') watchouts.push('Lifetime ownership costs can be substantial — use the cost calculator to plan ahead');
  if (signals.apartmentFit === 'challenging') watchouts.push('Larger or more active breeds may struggle in small spaces without frequent outdoor access');
  if (signals.firstTimeOwnerFit === 'challenging') watchouts.push('May not be ideal for first-time owners without additional support or research');

  const assumptions: string[] = [
    'Cost estimates are planning ranges — actual costs vary by location, provider, and care choices.',
    'Temperament and fit depend heavily on individual dog, early socialization, and training.',
    'Always meet a breed in person and research reputable breeders or rescues before committing.',
  ];

  return { title, summary, tone: t, reasons, watchouts, assumptions };
}

export function buildBreedBestFor(
  breed: NormalizedBreed,
  signals: BreedDecisionSignals,
): BreedBestFor {
  const bestFor: string[] = [];
  const notIdealFor: string[] = [];
  const name = breed.name;

  if (signals.apartmentFit === 'strong') bestFor.push('Apartment or smaller-home living with daily walks');
  else if (signals.apartmentFit === 'possible') bestFor.push('Various home types with consistent outdoor access');
  if (signals.activityLoad === 'high') bestFor.push('Active owners who enjoy daily outdoor exercise');
  else if (signals.activityLoad === 'low') bestFor.push('Owners looking for a calmer, lower-exercise companion');
  if (signals.firstTimeOwnerFit === 'strong') bestFor.push('First-time dog owners who are prepared to invest in training');
  if (signals.familyFit === 'strong') bestFor.push('Family environments — individual introductions and supervision still recommended');
  if (signals.sheddingLoad === 'low') bestFor.push('Owners who prefer lower-shedding breeds for home management');
  if (signals.trainingComplexity === 'easy') bestFor.push('Owners who want a breed that responds well to routine training');

  if (signals.apartmentFit === 'challenging') notIdealFor.push('Small apartments without nearby outdoor space');
  if (signals.activityLoad === 'high') notIdealFor.push('Very low-activity households that cannot meet daily exercise needs');
  if (signals.firstTimeOwnerFit === 'challenging') notIdealFor.push(`First-time owners without additional training support — ${name}s tend to benefit from experienced handling`);
  if (signals.groomingLoad === 'high') notIdealFor.push('Owners who cannot commit to regular, frequent grooming sessions');
  if (signals.costLoad === 'very-high') notIdealFor.push('Tight budgets — lifetime costs for this breed can be significant');
  if (signals.familyFit === 'needs-care') notIdealFor.push('Households with very young children unless carefully introduced and supervised');

  if (bestFor.length === 0) bestFor.push(`Owners who have researched the ${name} thoroughly and prepared for their specific needs`);
  if (notIdealFor.length === 0) notIdealFor.push('Households that cannot meet the exercise, training, or care requirements described above');

  return { bestFor: bestFor.slice(0, 5), notIdealFor: notIdealFor.slice(0, 5) };
}

export function buildBreedOwnerFitCards(
  breed: NormalizedBreed,
  signals: BreedDecisionSignals,
): BreedOwnerFitCard[] {
  const cards: BreedOwnerFitCard[] = [];

  cards.push({
    label: 'Living situation',
    value:
      signals.apartmentFit === 'strong' ? 'Apartment-friendly'
      : signals.apartmentFit === 'possible' ? 'Flexible'
      : 'Space needed',
    tone:
      signals.apartmentFit === 'strong' ? 'good'
      : signals.apartmentFit === 'possible' ? 'neutral'
      : 'warning',
    explanation:
      signals.apartmentFit === 'strong'
        ? `${breed.name}s can adapt to apartment living with consistent daily walks.`
        : signals.apartmentFit === 'possible'
          ? `${breed.name}s can manage various living setups when exercise needs are consistently met.`
          : `${breed.name}s tend to do better with access to outdoor space — plan accordingly.`,
  });

  cards.push({
    label: 'Daily activity',
    value:
      signals.activityLoad === 'high' ? 'High exercise' : signals.activityLoad === 'low' ? 'Moderate exercise' : 'Regular exercise',
    tone: signals.activityLoad === 'high' ? 'warning' : signals.activityLoad === 'low' ? 'good' : 'neutral',
    explanation:
      signals.activityLoad === 'high'
        ? `Active breed — plan at least 60–90 minutes of meaningful exercise daily.`
        : signals.activityLoad === 'low'
          ? `Lower energy breed — 30–45 minutes of daily activity is generally sufficient.`
          : `Moderate exercise needs — 45–60 minutes of daily activity suits most schedules.`,
  });

  cards.push({
    label: 'Owner experience',
    value:
      signals.firstTimeOwnerFit === 'strong' ? 'Beginner-friendly'
      : signals.firstTimeOwnerFit === 'possible' ? 'Some prep helps'
      : 'Experienced owners',
    tone:
      signals.firstTimeOwnerFit === 'strong' ? 'good'
      : signals.firstTimeOwnerFit === 'possible' ? 'neutral'
      : 'warning',
    explanation:
      signals.firstTimeOwnerFit === 'strong'
        ? `${breed.name}s can work well for first-time owners who invest in basic training.`
        : signals.firstTimeOwnerFit === 'possible'
          ? `Some preparation and consistent training goes a long way with ${breed.name}s.`
          : `${breed.name}s tend to benefit from owners with prior dog experience or professional training support.`,
  });

  cards.push({
    label: 'Family compatibility',
    value:
      signals.familyFit === 'strong' ? 'Family-friendly'
      : signals.familyFit === 'possible' ? 'Generally adaptable'
      : 'Supervision advised',
    tone:
      signals.familyFit === 'strong' ? 'good'
      : signals.familyFit === 'possible' ? 'neutral'
      : 'warning',
    explanation:
      signals.familyFit === 'strong'
        ? `Generally does well with families — early socialisation and introductions are still important.`
        : signals.familyFit === 'possible'
          ? `Can adapt to family life with proper introductions and consistent routines.`
          : `Young children and this breed should be introduced carefully and supervised. Temperament varies by individual dog.`,
  });

  cards.push({
    label: 'Grooming',
    value:
      signals.groomingLoad === 'high' ? 'High maintenance'
      : signals.groomingLoad === 'low' ? 'Low maintenance'
      : 'Moderate upkeep',
    tone:
      signals.groomingLoad === 'high' ? 'warning'
      : signals.groomingLoad === 'low' ? 'good'
      : 'neutral',
    explanation:
      signals.groomingLoad === 'high'
        ? `${breed.name}s require frequent grooming — budget time and professional grooming costs.`
        : signals.groomingLoad === 'low'
          ? `${breed.name}s are relatively low-maintenance on grooming. Regular brushing is still recommended.`
          : `Moderate grooming commitment — regular brushing and occasional professional grooming applies.`,
  });

  cards.push({
    label: 'Budget planning',
    value:
      signals.costLoad === 'very-high' ? 'Higher cost breed'
      : signals.costLoad === 'high' ? 'Significant budget'
      : signals.costLoad === 'medium' ? 'Moderate budget'
      : 'Lower running cost',
    tone:
      signals.costLoad === 'very-high' || signals.costLoad === 'high' ? 'warning'
      : signals.costLoad === 'medium' ? 'neutral'
      : 'good',
    explanation: `Use the PupWiki cost calculator for a personalised estimate covering food, vet care, grooming, and supplies for a ${breed.name}.`,
  });

  return cards;
}
