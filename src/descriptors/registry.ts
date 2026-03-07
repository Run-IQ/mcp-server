import type {
  PluginDescriptor,
  RuleFieldDescriptor,
  InputFieldDescriptor,
  RuleExample,
} from '@run-iq/plugin-sdk';

export class DescriptorRegistry {
  private readonly descriptors: PluginDescriptor[] = [];

  register(descriptor: PluginDescriptor): void {
    this.descriptors.push(descriptor);
  }

  getAll(): readonly PluginDescriptor[] {
    return this.descriptors;
  }

  getRuleExtensions(): readonly RuleFieldDescriptor[] {
    return this.descriptors.flatMap((d) => d.ruleExtensions);
  }

  getInputFields(): readonly InputFieldDescriptor[] {
    const seen = new Set<string>();
    const fields: InputFieldDescriptor[] = [];
    for (const d of this.descriptors) {
      for (const f of d.inputFields) {
        if (!seen.has(f.name)) {
          seen.add(f.name);
          fields.push(f);
        }
      }
    }
    return fields;
  }

  getExamples(): readonly RuleExample[] {
    return this.descriptors.flatMap((d) => d.examples);
  }

  isEmpty(): boolean {
    return this.descriptors.length === 0;
  }
}
