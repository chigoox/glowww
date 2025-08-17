// Lightweight tax code mapping + geo localization helper.
// NOTE: Placeholder logic; replace with real tax service (e.g., TaxJar, Avalara) later.

export const TAX_CODE_RATES = {
  default: { base: 0.08 }, // 8%
  food: { base: 0.02, regions: { 'US-CA': 0.015, 'US-NY': 0.01 } },
  clothing: { base: 0.05, regions: { 'US-NJ': 0.0 } }, // NJ exempts many clothing items
  digital: { base: 0.00, regions: { EU: 0.20 } }, // Illustrative VAT for EU digital goods
  books: { base: 0.04, regions: { 'US-NY': 0.00 } },
};

function resolveRate(taxCode = 'default', country, region) {
  const cfg = TAX_CODE_RATES[taxCode] || TAX_CODE_RATES.default;
  const { base, regions } = cfg;
  if (!regions) return base;
  const countryKey = country?.toUpperCase();
  const regionKey = region ? `${countryKey}-${region.toUpperCase()}` : undefined;
  if (regionKey && regions[regionKey] != null) return regions[regionKey];
  if (countryKey && regions[countryKey] != null) return regions[countryKey];
  // Fallback special grouping keys (e.g., EU)
  if (countryKey && regions['EU'] && ['DE','FR','ES','IT','NL','BE','LU','AT','FI','SE','DK','IE','PT','PL','CZ','SK','SI','EE','LV','LT','GR','HR','RO','BG','HU'].includes(countryKey)) {
    return regions['EU'];
  }
  return base;
}

// lineItems: [{ amount (cents, per unit), quantity, taxCode }]
// address: { country, region }  (region = state/province code)
export function computeTaxes({ lineItems = [], address = {} }) {
  const { country, region } = address || {};
  const breakdown = {}; // taxCode -> { rate, taxable, tax }
  let taxTotal = 0;
  for (const item of lineItems) {
    if (!item) continue;
    const qty = typeof item.quantity === 'number' ? item.quantity : 1;
    const lineTotal = Math.max(0, (item.amount || 0) * qty);
    const taxCode = item.taxCode || 'default';
    const rate = resolveRate(taxCode, country, region);
    const tax = Math.round(lineTotal * rate);
    if (!breakdown[taxCode]) breakdown[taxCode] = { rate, taxable: 0, tax: 0 };
    breakdown[taxCode].taxable += lineTotal;
    breakdown[taxCode].tax += tax;
    taxTotal += tax;
  }
  return { taxTotal, breakdown };
}

// Utility to transform a simplified request body into line items if only subtotal provided.
export function fabricateLineItemsFromSubtotal({ subtotal = 0, discountAmount = 0, taxCodes = [] }) {
  const net = Math.max(0, subtotal - discountAmount);
  if (!net) return [];
  if (!Array.isArray(taxCodes) || taxCodes.length === 0) return [{ amount: net, quantity: 1, taxCode: 'default' }];
  const per = Math.floor(net / taxCodes.length);
  const items = taxCodes.map(code => ({ amount: per, quantity: 1, taxCode: code || 'default' }));
  // Distribute remainder to first item
  let used = per * taxCodes.length;
  if (used < net) items[0].amount += (net - used);
  return items;
}
