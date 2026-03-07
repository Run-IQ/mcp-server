import type { PPEPlugin, DSLEvaluator } from '@run-iq/core';

export interface RuleFieldDescriptor {
  readonly name: string;
  readonly type: 'string' | 'number' | 'boolean';
  readonly required: boolean;
  readonly description: string;
  readonly enum?: readonly string[];
}

export interface InputFieldDescriptor {
  readonly name: string;
  readonly type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  readonly description: string;
  readonly examples?: readonly unknown[];
}

export interface RuleExample {
  readonly title: string;
  readonly description: string;
  readonly rule: Record<string, unknown>;
  readonly input?: Record<string, unknown>;
}

export interface PluginDescriptor {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly ruleExtensions: readonly RuleFieldDescriptor[];
  readonly inputFields: readonly InputFieldDescriptor[];
  readonly examples: readonly RuleExample[];
}

export interface PluginBundle {
  readonly plugin: PPEPlugin;
  readonly descriptor: PluginDescriptor;
  readonly dsls?: readonly DSLEvaluator[];
}
