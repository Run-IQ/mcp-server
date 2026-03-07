import type { PluginDescriptor } from '../types/descriptor.js';

export const fiscalDescriptor: PluginDescriptor = {
  name: '@run-iq/plugin-fiscal',
  version: '0.1.0',
  description:
    'Fiscal domain plugin for tax calculation. Provides 6 calculation models for various tax types: flat rates, progressive brackets, minimum taxes, thresholds, fixed amounts, and composite calculations.',

  ruleExtensions: [
    {
      name: 'jurisdiction',
      type: 'string',
      required: true,
      description:
        'Tax jurisdiction level. Affects rule priority: NATIONAL=3000, REGIONAL=2000, MUNICIPAL=1000',
      enum: ['NATIONAL', 'REGIONAL', 'MUNICIPAL'],
    },
    {
      name: 'scope',
      type: 'string',
      required: true,
      description:
        'Rule application scope. Multiplies priority: GLOBAL=x1.0, ORGANIZATION=x1.1, USER=x1.2',
      enum: ['GLOBAL', 'ORGANIZATION', 'USER'],
    },
    {
      name: 'country',
      type: 'string',
      required: true,
      description:
        'ISO country code (e.g. "TG" for Togo, "FR" for France). Rules are filtered by input.meta.context.country',
    },
    {
      name: 'category',
      type: 'string',
      required: true,
      description:
        'Tax category identifier (e.g. "TVA", "IRPP", "IS", "IMF"). Used in fiscal breakdown grouping by afterEvaluate',
    },
  ],

  inputFields: [
    {
      name: 'revenue',
      type: 'number',
      description: "Business revenue / turnover (chiffre d'affaires)",
      examples: [1_000_000, 5_000_000, 50_000_000],
    },
    {
      name: 'income',
      type: 'number',
      description: 'Taxable income (revenu imposable)',
      examples: [500_000, 2_000_000, 10_000_000],
    },
    {
      name: 'expenses',
      type: 'number',
      description: 'Deductible expenses',
      examples: [200_000, 1_000_000],
    },
    {
      name: 'netProfit',
      type: 'number',
      description: 'Net profit (benefice net)',
      examples: [300_000, 5_000_000],
    },
  ],

  examples: [
    {
      title: 'TVA 18% (Togo)',
      description: 'Value-added tax at 18% on revenue',
      rule: {
        id: 'tg-tva-18',
        model: 'FLAT_RATE',
        params: { rate: 0.18, base: 'revenue' },
        jurisdiction: 'NATIONAL',
        scope: 'GLOBAL',
        country: 'TG',
        category: 'TVA',
        effectiveFrom: '2025-01-01T00:00:00.000Z',
        effectiveUntil: null,
        tags: ['tva'],
      },
      input: { revenue: 1_000_000 },
    },
    {
      title: 'IRPP Progressive Brackets (Togo)',
      description: 'Income tax with progressive brackets per CGI Togo 2025',
      rule: {
        id: 'tg-irpp-2025',
        model: 'PROGRESSIVE_BRACKET',
        params: {
          base: 'income',
          brackets: [
            { from: 0, to: 500_000, rate: 0 },
            { from: 500_000, to: 1_000_000, rate: 0.1 },
            { from: 1_000_000, to: 3_000_000, rate: 0.15 },
            { from: 3_000_000, to: 5_000_000, rate: 0.25 },
            { from: 5_000_000, to: null, rate: 0.35 },
          ],
        },
        jurisdiction: 'NATIONAL',
        scope: 'GLOBAL',
        country: 'TG',
        category: 'IRPP',
        effectiveFrom: '2025-01-01T00:00:00.000Z',
        effectiveUntil: null,
        tags: ['irpp'],
      },
      input: { income: 2_000_000 },
    },
    {
      title: 'Minimum Tax / IMF (Togo)',
      description: 'Impot Minimum Forfaitaire: MAX(revenue * 1%, 50 000 XOF)',
      rule: {
        id: 'tg-imf-2025',
        model: 'MINIMUM_TAX',
        params: { rate: 0.01, base: 'revenue', minimum: 50_000 },
        jurisdiction: 'NATIONAL',
        scope: 'GLOBAL',
        country: 'TG',
        category: 'IMF',
        effectiveFrom: '2025-01-01T00:00:00.000Z',
        effectiveUntil: null,
        tags: ['imf'],
      },
      input: { revenue: 3_000_000 },
    },
  ],
};
