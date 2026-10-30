# @run-iq/mcp-server

An [MCP](https://modelcontextprotocol.io) server that gives LLM clients (Claude Desktop, Claude Code, Cursor, VS Code...) access to the [Run-IQ](https://github.com/Run-IQ/core) rule engine. The model can write rules, validate them, and evaluate them against test inputs. It runs over stdio.

## Install

The package is published to GitHub Packages. Point the `@run-iq` scope at it in your `~/.npmrc` (GitHub requires a token with `read:packages`):

```
@run-iq:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_TOKEN
```

Then add it to your client's MCP config:

```json
{
  "mcpServers": {
    "run-iq": {
      "command": "npx",
      "args": ["-y", "@run-iq/mcp-server", "--plugins-dir", "/path/to/plugins"]
    }
  }
}
```

Requires Node.js 20 or later.

## Plugins

The server starts with no calculation model. Load plugins with:

| Flag | |
|---|---|
| `--plugins-dir <dir>` | Imports every `.js` / `.mjs` file in the directory |
| `--plugin <package>` | Imports an npm package, resolved from the current directory, then from `~/.run-iq/mcp-plugins`. Missing `@run-iq/*` packages are installed there automatically |

Both flags can be combined, and `--plugin` can be repeated. Each module must default-export a `PluginBundle` from `@run-iq/plugin-sdk`:

```js
// plugins/fiscal.mjs
import { FiscalPlugin, fiscalDescriptor } from '@run-iq/plugin-fiscal';
import { JsonLogicEvaluator } from '@run-iq/dsl-jsonlogic';

export default {
  plugin: new FiscalPlugin(),
  descriptor: fiscalDescriptor,
  dsls: [new JsonLogicEvaluator()],
};
```

The packages it imports must be installed next to the file (for example `npm install @run-iq/plugin-fiscal @run-iq/dsl-jsonlogic` in the parent directory).

The descriptor tells the server which extra fields the plugin's rules need. `create_rule`, `validate_rules`, the `schema://rules` resource and the prompts are built from it. With the fiscal plugin, for example, `create_rule` requires `jurisdiction`, `scope`, `country` and `category`.

## Tools

| Tool | |
|---|---|
| `create_rule` | Build a rule and compute its checksum |
| `validate_rules` | Check structure, checksum, model params and plugin fields |
| `inspect_rule` | Details on one rule: checksum, model, whether it is active at a date |
| `create_checksum` | SHA-256 of a rule or of a params object |
| `list_models` | Models provided by the loaded plugins, with their params |
| `evaluate` | Evaluate rules against an input |
| `simulate` | Evaluate the same rules against up to 20 inputs and compare |
| `explain_result` | Turn an evaluation result into a readable summary |

The engine runs in dry-run, non-strict mode: nothing is persisted and `meta.effectiveDate` is optional. Rules with a wrong checksum are skipped with `CHECKSUM_MISMATCH`.

Pass dates to `create_rule` as full ISO strings (`2025-01-01T00:00:00.000Z`). With a date-only value like `2025-01-01`, the checksum is computed on that string, and `evaluate` later skips the rule because it normalizes the date first.

## Resources and prompts

| | |
|---|---|
| `schema://rules` | Rule schema, plugin fields, model params, input fields and examples |
| `models://catalog` | Documentation of the available models |
| `plugins://loaded` | Loaded plugins, DSLs and descriptors |
| `analyze-text` prompt | Turn a text (law, regulation, policy) into rules. Args: `source_text`, optional `country` |
| `domain-expert` prompt | Answer a `question` using the loaded plugins' domain |

## License

MIT
