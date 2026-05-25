import { execSync } from "child_process";
import { readFileSync, existsSync, writeFileSync, readdirSync, statSync } from "fs";
import { join, resolve } from "path";
import type { ToolDefinition } from "./providers/base.js";

const PROJECT_ROOT = resolve(join(import.meta.dirname, "../.."));
const BACKEND_DIR = join(PROJECT_ROOT, "backend");
const FRONTEND_DIR = join(PROJECT_ROOT, "frontend");

function safeExec(command: string, cwd: string = PROJECT_ROOT, timeoutMs = 30000): string {
  try {
    return execSync(command, {
      cwd,
      encoding: "utf-8",
      timeout: timeoutMs,
      maxBuffer: 1024 * 1024 * 5,
    }).trim();
  } catch (error: any) {
    return `ERROR: ${error.stderr || error.message}`;
  }
}

export const toolDefinitions: ToolDefinition[] = [
  {
    name: "read_file",
    description:
      "Read a file from the project. Path is relative to project root (e.g. 'backend/src/services/draft/MetaFieldRegistry.ts'). " +
      "Returns the file contents with line numbers. Optionally specify startLine and endLine to read a range.",
    parameters: {
      type: "object" as const,
      properties: {
        path: { type: "string", description: "Relative path from project root" },
        startLine: { type: "number", description: "Start line (1-based, optional)" },
        endLine: { type: "number", description: "End line (1-based, optional)" },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description:
      "Write content to a file. Path is relative to project root. Creates parent directories if needed. " +
      "WARNING: This overwrites the entire file. For targeted edits, use edit_file instead.",
    parameters: {
      type: "object" as const,
      properties: {
        path: { type: "string", description: "Relative path from project root" },
        content: { type: "string", description: "Full file content to write" },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "edit_file",
    description:
      "Make a targeted edit to a file by replacing an exact string match. " +
      "old_string must match exactly (including whitespace). " +
      "If old_string appears multiple times, the edit will fail — provide more context to make it unique.",
    parameters: {
      type: "object" as const,
      properties: {
        path: { type: "string", description: "Relative path from project root" },
        old_string: { type: "string", description: "Exact string to find and replace" },
        new_string: { type: "string", description: "Replacement string" },
      },
      required: ["path", "old_string", "new_string"],
    },
  },
  {
    name: "list_directory",
    description:
      "List files and directories at a path. Path is relative to project root. " +
      "Returns files with type indicators (/ for directories).",
    parameters: {
      type: "object" as const,
      properties: {
        path: { type: "string", description: "Relative path from project root (default: '.')" },
      },
      required: [],
    },
  },
  {
    name: "search_code",
    description:
      "Search for a pattern across the codebase using grep. Returns matching lines with file paths and line numbers. " +
      "Searches backend/src and frontend/src by default. Supports regex.",
    parameters: {
      type: "object" as const,
      properties: {
        pattern: { type: "string", description: "Search pattern (grep regex)" },
        path: {
          type: "string",
          description: "Subdirectory to search in (relative to project root, default: searches backend/src and frontend/src)",
        },
        include: {
          type: "string",
          description: "File glob pattern to include (e.g. '*.ts', '*.tsx')",
        },
      },
      required: ["pattern"],
    },
  },
  {
    name: "run_shell",
    description:
      "Execute a shell command in the project directory. Use for: running tests (cd backend && npm test), " +
      "git commands, checking TypeScript compilation (cd backend && npx tsc --noEmit), etc. " +
      "Commands run from the project root by default. Timeout: 60 seconds.",
    parameters: {
      type: "object" as const,
      properties: {
        command: { type: "string", description: "Shell command to execute" },
        cwd: {
          type: "string",
          description: "Working directory relative to project root (default: project root)",
        },
      },
      required: ["command"],
    },
  },
  {
    name: "run_tests",
    description:
      "Run the backend test suite. Options: all tests, specific test file, or drift tests. " +
      "Returns pass/fail status and any failures.",
    parameters: {
      type: "object" as const,
      properties: {
        testFile: {
          type: "string",
          description: "Specific test file to run (e.g. 'tests/unit/meta-field-matrix.test.ts'). Omit for all tests.",
        },
        drift: {
          type: "boolean",
          description: "Run drift tests instead (requires META_ACCESS_TOKEN in backend/.env)",
        },
      },
      required: [],
    },
  },
  {
    name: "get_meta_field_info",
    description:
      "Get information about Meta API fields, objectives, and constraints from the MetaFieldRegistry. " +
      "Useful for understanding what fields are valid, required, or incompatible for a given objective.",
    parameters: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description:
            "What to look up: 'objectives' (list all), 'campaign_fields', 'adset_fields', 'ad_fields', " +
            "'field:<name>' (details about a specific field), 'objective:<name>' (valid config for an objective)",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "git_status",
    description:
      "Get git status, diff, log, or blame. Useful for understanding recent changes and current state.",
    parameters: {
      type: "object" as const,
      properties: {
        command: {
          type: "string",
          enum: ["status", "diff", "log", "blame"],
          description: "Git command to run",
        },
        args: {
          type: "string",
          description: "Additional arguments (e.g. file path for blame, '--staged' for diff, '-n 10' for log)",
        },
      },
      required: ["command"],
    },
  },
];

export function executeTool(
  name: string,
  input: Record<string, unknown>
): string {
  switch (name) {
    case "read_file": {
      const filePath = resolve(PROJECT_ROOT, input.path as string);
      if (!existsSync(filePath)) return `ERROR: File not found: ${input.path}`;
      const content = readFileSync(filePath, "utf-8");
      const lines = content.split("\n");
      const start = ((input.startLine as number) || 1) - 1;
      const end = (input.endLine as number) || lines.length;
      return lines
        .slice(start, end)
        .map((line, i) => `${start + i + 1}\t${line}`)
        .join("\n");
    }

    case "write_file": {
      const filePath = resolve(PROJECT_ROOT, input.path as string);
      const dir = join(filePath, "..");
      execSync(`mkdir -p "${dir}"`);
      writeFileSync(filePath, input.content as string, "utf-8");
      return `Written: ${input.path}`;
    }

    case "edit_file": {
      const filePath = resolve(PROJECT_ROOT, input.path as string);
      if (!existsSync(filePath)) return `ERROR: File not found: ${input.path}`;
      const content = readFileSync(filePath, "utf-8");
      const oldStr = input.old_string as string;
      const occurrences = content.split(oldStr).length - 1;
      if (occurrences === 0) return `ERROR: old_string not found in ${input.path}`;
      if (occurrences > 1)
        return `ERROR: old_string found ${occurrences} times in ${input.path}. Provide more context to make it unique.`;
      writeFileSync(filePath, content.replace(oldStr, input.new_string as string), "utf-8");
      return `Edited: ${input.path}`;
    }

    case "list_directory": {
      const dirPath = resolve(PROJECT_ROOT, (input.path as string) || ".");
      if (!existsSync(dirPath)) return `ERROR: Directory not found: ${input.path}`;
      const entries = readdirSync(dirPath);
      return entries
        .map((e) => {
          const full = join(dirPath, e);
          const isDir = statSync(full).isDirectory();
          return isDir ? `${e}/` : e;
        })
        .join("\n");
    }

    case "search_code": {
      const pattern = input.pattern as string;
      const include = input.include ? `--include='${input.include}'` : "--include='*.ts' --include='*.tsx'";
      const searchPath = input.path
        ? resolve(PROJECT_ROOT, input.path as string)
        : "";
      const paths = searchPath || `${BACKEND_DIR}/src ${FRONTEND_DIR}/src`;
      const cmd = `grep -rn ${include} -e '${pattern.replace(/'/g, "'\\''")}' ${paths} 2>/dev/null | head -80`;
      return safeExec(cmd) || "No matches found.";
    }

    case "run_shell": {
      const cwd = input.cwd
        ? resolve(PROJECT_ROOT, input.cwd as string)
        : PROJECT_ROOT;
      return safeExec(input.command as string, cwd, 60000);
    }

    case "run_tests": {
      const testFile = input.testFile as string | undefined;
      const drift = input.drift as boolean | undefined;
      let cmd: string;
      if (drift) {
        cmd = "npm run test:drift 2>&1";
      } else if (testFile) {
        cmd = `npx vitest run ${testFile} 2>&1`;
      } else {
        cmd = "npm test 2>&1";
      }
      return safeExec(cmd, BACKEND_DIR, 60000);
    }

    case "get_meta_field_info": {
      const query = input.query as string;
      const registryPath = join(BACKEND_DIR, "src/services/draft/MetaFieldRegistry.ts");
      const content = readFileSync(registryPath, "utf-8");

      if (query === "objectives") {
        const match = content.match(/enumValues:\s*\[([^\]]+)\]/);
        return match ? `Supported objectives: ${match[1]}` : "Could not parse objectives";
      }
      if (query === "campaign_fields") {
        const match = content.match(/export const CAMPAIGN_FIELDS[\s\S]*?^}/m);
        return match ? match[0].slice(0, 3000) : "Could not parse campaign fields";
      }
      if (query === "adset_fields") {
        const match = content.match(/export const ADSET_FIELDS[\s\S]*?^}/m);
        return match ? match[0].slice(0, 5000) : "Could not parse adset fields";
      }
      if (query === "ad_fields") {
        const match = content.match(/export const AD_FIELDS[\s\S]*?^}/m);
        return match ? match[0].slice(0, 3000) : "Could not parse ad fields";
      }
      if (query.startsWith("field:")) {
        const fieldName = query.split(":")[1];
        const regex = new RegExp(`${fieldName}:\\s*\\{[^}]+\\}`, "m");
        const match = content.match(regex);
        return match ? match[0] : `Field '${fieldName}' not found in registry`;
      }
      if (query.startsWith("objective:")) {
        const objective = query.split(":")[1];
        const lines = content.split("\n");
        const results: string[] = [];
        for (const line of lines) {
          if (line.includes(objective)) results.push(line.trim());
        }
        return results.length > 0 ? results.join("\n") : `No references to ${objective}`;
      }
      return `Unknown query: ${query}. Try: objectives, campaign_fields, adset_fields, ad_fields, field:<name>, objective:<name>`;
    }

    case "git_status": {
      const gitCmd = input.command as string;
      const args = (input.args as string) || "";
      const cmdMap: Record<string, string> = {
        status: "git status",
        diff: `git diff ${args}`,
        log: `git log --oneline ${args || "-n 15"}`,
        blame: `git blame ${args}`,
      };
      return safeExec(cmdMap[gitCmd] || `git ${gitCmd} ${args}`);
    }

    default:
      return `Unknown tool: ${name}`;
  }
}
