# @run-iq/mcp-server

MCP (Model Context Protocol) server that exposes the **Parametric Policy Engine (PPE)** to LLMs. Connects to Claude Desktop, Cursor, VS Code, and any MCP-compatible client via stdio.

Plugin-aware: the server dynamically adapts its tools, resources, and prompts to whatever plugins are loaded — zero hardcoding required.

## Installation

```bash
npm install -g @run-iq/mcp-server
```

Or run directly with npx:

```bash
npx @run-iq/mcp-server
```

## Configuration

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "run-iq": {
      "command": "npx",
      "args": ["@run-iq/mcp-server"]
    }
  }
}
```

### Cursor / VS Code

```json
{
  "mcpServers": {
    "run-iq": {
      "command": "npx",
      "args": ["@run-iq/mcp-server"]
    }
  }
}
```

### Custom Plugins

The server is 100% domain-agnostic by default. You MUST attach plugins to give the AI engine capabilities. You can load plugins from NPM packages or from a local directory.

**Option 1: Load from NPM (Recommended)**
Provides dynamic imports directly from `node_modules` or global installations.

```json
{
  "mcpServers": {
    "run-iq": {
      "command": "npx",
      "args": ["@run-iq/mcp-server", "--plugin", "@run-iq/plugin-fiscal", "--plugin", "@my-org/payroll"]
    }
  }
}
```

**Option 2: Load local bundles**
Load compiled javascript files from a local directory:

```json
{
  "mcpServers": {
    "run-iq": {
      "command": "npx",
      "args": ["@run-iq/mcp-server", "--plugins-dir", "/path/to/plugins"]
    }
  }
}
```

Each `.js` or `.mjs` file in the directory must export a `PluginBundle`:

```typescript
import type { PluginBundle } from '@run-iq/plugin-sdk';

const bundle: PluginBundle = {
  plugin: new MyPlugin(),
  descriptor: myDescriptor,
  dsls: [new MyDslEvaluator()],
};

export default bundle;
```

## Tools (8)

| Tool | Description |
|------|-------------|
| `evaluate` | Evaluate rules against input data (always dry-run) |
| `simulate` | Compare N scenarios side-by-side with the same rules |
| `validate_rules` | Verify rule structure, checksum, model params, and plugin fields |
| `create_rule` | Generate a valid Rule JSON with auto-computed SHA-256 checksum |
| `inspect_rule` | Analyze a single rule in detail (validity, active status, errors) |
| `explain_result` | Human-readable explanation of an EvaluationResult |
| `list_models` | List available calculation models with parameter schemas |
| `create_checksum` | Compute SHA-256 checksum for a params object |

All tools with plugin-specific fields (e.g. `create_rule`, `validate_rules`) dynamically adapt their schemas based on loaded plugins.

## Resources (3)

| URI | Description |
|-----|-------------|
| `schema://rules` | Complete rule schema: base fields, plugin extensions, model params, input variables, JSONLogic syntax, and examples |
| `models://catalog` | Markdown documentation of all calculation models with parameters and usage examples |
| `plugins://loaded` | Information about loaded plugins, DSL evaluators, and descriptor status |

## Prompts (2)

| Prompt | Description |
|--------|-------------|
| `domain-expert` | Domain-specific expertise adapted to loaded plugins: scenario comparison, result explanation, recommendations |
| `analyze-text` | Translate regulatory/policy text into Run-IQ rule definitions with all required plugin fields |

Both prompts dynamically inject plugin metadata, guidelines, and examples.

## Plugin-aware architecture

The server adapts to any loaded plugin through the `PluginDescriptor` contract (from `@run-iq/plugin-sdk`):

```
Plugin loads → descriptor provides metadata → server adapts everything
```

- **Tools**: `create_rule` adds plugin-required fields to its Zod schema. `validate_rules` checks plugin-specific constraints.
- **Resources**: `schema://rules` documents plugin extension fields, input variables, and examples.
- **Prompts**: `domain-expert` becomes a fiscal/social/payroll expert based on what's loaded. `analyze-text` injects plugin-specific model guidance and examples.

### Default behavior

By default, the server loads an empty engine. You must specify `--plugin` (NPM package) or `--plugins-dir` (local folder) to inject calculation models and rules. For example, passing `--plugin @run-iq/plugin-fiscal` provides the 6 standard tax calculation models.

### Writing a custom plugin

A plugin describes itself via `PluginDescriptor`:

```typescript
import type { PluginDescriptor } from '@run-iq/plugin-sdk';

export const socialDescriptor: PluginDescriptor = {
  name: '@run-iq/plugin-social',
  version: '0.1.0',
  domainLabel: 'social',
  description: 'Social benefits calculation plugin',
  ruleExtensions: [
    { name: 'benefitType', type: 'string', required: true,
      enum: ['ALLOCATION', 'AIDE', 'EXONERATION'], description: '...' },
  ],
  inputFields: [
    { name: 'householdIncome', type: 'number', description: '...', examples: [150000] },
  ],
  examples: [/* concrete rule examples */],
  promptGuidelines: [
    'Consider household composition when creating rules',
    'Use THRESHOLD model for means-tested benefits',
  ],
};
```

The MCP server will automatically expose `benefitType` in `create_rule`, validate it in `validate_rules`, document it in `schema://rules`, and inject the guidelines into prompts.

## Safety

- **Always dry-run**: the engine never persists snapshots — safe for AI experimentation
- **Read-only**: no mutations to external state
- **Checksum verification**: SHA-256 integrity checks on rule params

## Requirements

- Node.js >= 20

## License

MIT — Abdou-Raouf ATARMLA
