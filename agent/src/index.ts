import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import * as readline from "readline";
import { createProvider, validateProviderEnv, type ProviderName } from "./providers/index.js";
import { toolDefinitions, executeTool } from "./tools.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env");
try {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^\s*([^#=]+?)\s*=\s*(.*?)\s*$/);
    if (match) process.env[match[1]] = match[2];
  }
} catch {}

const providerName = (process.env.AI_PROVIDER || "claude") as ProviderName;
const modelOverride = process.env.AI_MODEL;

validateProviderEnv(providerName);
const provider = createProvider(providerName, toolDefinitions, modelOverride);

async function runAgent(userMessage: string): Promise<string> {
  let response = await provider.sendMessage(userMessage);

  while (!response.done) {
    for (const tc of response.toolCalls) {
      console.log(`  → ${tc.name}(${JSON.stringify(tc.input).slice(0, 120)}...)`);
    }

    const results = response.toolCalls.map((tc) => ({
      toolCallId: tc.id,
      output: executeTool(tc.name, tc.input).slice(0, 50000),
    }));

    response = await provider.sendToolResults(results);
  }

  return response.text || "(no response)";
}

async function main() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("AdSpawn Developer Agent");
  console.log("=======================");
  console.log(`Provider: ${provider.name} | Model: ${modelOverride || "default"}`);
  console.log("I can help you debug, add features, run tests, and understand the codebase.");
  console.log('Type "exit" to quit.\n');

  const ask = () => {
    rl.question("you> ", async (input) => {
      const trimmed = input.trim();
      if (!trimmed) return ask();
      if (trimmed.toLowerCase() === "exit") {
        console.log("Bye!");
        rl.close();
        return;
      }

      try {
        const response = await runAgent(trimmed);
        console.log(`\nagent> ${response}\n`);
      } catch (error: any) {
        console.error(`Error: ${error.message}`);
      }

      ask();
    });
  };

  ask();
}

main();
