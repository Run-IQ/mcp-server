import type { CalculationModel, ValidationResult, PPEPlugin, PluginContext, DSLEvaluator } from '@run-iq/core';
import type { PluginBundle, PluginDescriptor } from '@run-iq/plugin-sdk';

export class MockModel implements CalculationModel {
  readonly name: string;
  readonly version = '1.0.0';

  constructor(name: string, private readonly factor: number = 1) {
    this.name = name;
  }

  validateParams(params: unknown): ValidationResult {
    const p = params as Record<string, unknown> | null;
    if (!p || typeof p['rate'] !== 'number') {
      return { valid: false, errors: ['rate must be a number'] };
    }
    if (typeof p['base'] !== 'string') {
      return { valid: false, errors: ['base must be a string'] };
    }
    return { valid: true };
  }

  calculate(
    input: Record<string, unknown>,
    _rule: Readonly<Record<string, unknown>>,
    params: unknown,
  ): number {
    const p = params as Record<string, unknown>;
    const rate = p['rate'] as number;
    const base = p['base'] as string;
    const value = (input[base] as number) ?? 0;
    return value * rate * this.factor;
  }
}

export class MockPlugin implements PPEPlugin {
  readonly name = 'mock-plugin';
  readonly version = '1.0.0';
  readonly models: CalculationModel[];

  constructor(models?: CalculationModel[]) {
    this.models = models ?? [
      new MockModel('MOCK_RATE'),
      new MockModel('MOCK_DOUBLE', 2),
    ];
  }

  onInit(context: PluginContext): void {
    for (const model of this.models) {
      context.modelRegistry.register(model);
    }
  }

  onError(): void { /* noop */ }
}

export const mockDescriptor: PluginDescriptor = {
  name: 'mock-plugin',
  version: '1.0.0',
  description: 'Mock plugin for testing the MCP server',
  domainLabel: 'mock',
  ruleExtensions: [
    { name: 'region', type: 'string', required: true, enum: ['NORTH', 'SOUTH', 'EAST'], description: 'Target region' },
    { name: 'sector', type: 'string', required: true, enum: ['PUBLIC', 'PRIVATE'], description: 'Economic sector' },
  ],
  inputFields: [
    { name: 'revenue', type: 'number', description: 'Total revenue' },
    { name: 'expenses', type: 'number', description: 'Total expenses' },
  ],
  examples: [
    {
      title: 'Basic rate calculation',
      description: 'Apply 10% rate on revenue',
      rule: { model: 'MOCK_RATE', params: { rate: 0.1, base: 'revenue' }, region: 'NORTH', sector: 'PUBLIC' },
    },
  ],
  promptGuidelines: ['Use MOCK_RATE for simple percentage calculations.'],
};

export class MockDSL implements DSLEvaluator {
  readonly dsl = 'mock-dsl';
  readonly version = '1.0.0';

  evaluate(_expression: unknown, _context: Record<string, unknown>): boolean {
    return true;
  }
}

export const mockBundle: PluginBundle = {
  plugin: new MockPlugin(),
  descriptor: mockDescriptor,
  dsls: [new MockDSL()],
};
