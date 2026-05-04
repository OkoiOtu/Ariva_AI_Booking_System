import { getClient } from './pbService.js';

/**
 * calculatePrice
 *
 * Looks up pricing_rules and returns the best matching price
 * for a given booking. Returns null if no rules are configured.
 *
 * Priority:
 *   1. Fixed route match (pickup + dropoff keywords)
 *   2. Vehicle-specific hourly rate
 *   3. Default hourly rate (vehicle_type = "any")
 *
 * @param {object} params
 * @param {string} params.pickupAddress
 * @param {string} params.dropoffAddress
 * @param {number} params.durationHours
 * @param {string} params.vehicleType
 * @returns {{ price: number, ruleName: string, ruleType: string, currency: string } | null}
 */
export async function calculatePrice({ pickupAddress, dropoffAddress, durationHours, vehicleType = 'any' }) {
  try {
    const pb = await getClient();

    const result = await pb.collection('pricing_rules').getFullList({
      filter: 'active = true',
      sort:   'created',
      requestKey: null,
    });

    if (!result.length) return null;

    const pickup  = (pickupAddress  || '').toLowerCase();
    const dropoff = (dropoffAddress || '').toLowerCase();
    const vtype   = (vehicleType    || 'any').toLowerCase();

    // ── 1. Fixed route match ──────────────────────────────────────────────
    const fixedRules = result.filter(r => r.type === 'fixed_route');
    for (const rule of fixedRules) {
      const pkw = (rule.pickup_keyword  || '').toLowerCase();
      const dkw = (rule.dropoff_keyword || '').toLowerCase();

      const pickupMatch  = !pkw || pickup.includes(pkw);
      const dropoffMatch = !dkw || dropoff.includes(dkw);

      if (pickupMatch && dropoffMatch) {
        return {
          price:    rule.fixed_price,
          ruleName: rule.name,
          ruleType: 'fixed_route',
          currency: rule.currency || 'NGN',
        };
      }
    }

    // ── 2. Vehicle-specific hourly rate ───────────────────────────────────
    const hourlyRules = result.filter(r => r.type === 'hourly');

    const vehicleRule = hourlyRules.find(r =>
      r.vehicle_type && r.vehicle_type !== 'any' &&
      r.vehicle_type.toLowerCase() === vtype
    );

    if (vehicleRule) {
      return {
        price:    Number(vehicleRule.price_per_hour) * durationHours,
        ruleName: vehicleRule.name,
        ruleType: 'hourly',
        currency: vehicleRule.currency || 'NGN',
      };
    }

    // ── 3. Default hourly rate ────────────────────────────────────────────
    const defaultRule = hourlyRules.find(r => !r.vehicle_type || r.vehicle_type === 'any');

    if (defaultRule) {
      return {
        price:    Number(defaultRule.price_per_hour) * durationHours,
        ruleName: defaultRule.name,
        ruleType: 'hourly',
        currency: defaultRule.currency || 'NGN',
      };
    }

    return null;
  } catch (err) {
    console.error('[pricingService] calculatePrice error:', err.message);
    return null;
  }
}

/**
 * formatPrice — formats a number as currency string
 * e.g. 25000 → "₦25,000"
 */
export function formatPrice(amount, currency = 'NGN') {
  if (!amount && amount !== 0) return 'TBC';
  const symbols = { NGN: '₦', USD: '$', GBP: '£', EUR: '€' };
  const symbol  = symbols[currency] ?? currency + ' ';
  return `${symbol}${Number(amount).toLocaleString()}`;
}
