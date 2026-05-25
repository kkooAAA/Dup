# AdSpawn Developer Agent

An AI-powered developer assistant that works with **Claude**, **GPT**, or **Gemini**. Helps you debug issues, add features, run tests, and navigate the AdSpawn codebase.

## Setup

```bash
cd agent
npm install
```

Create a `.env` file with your provider and API key:

```bash
# Pick one: claude, openai, or gemini
AI_PROVIDER=claude
ANTHROPIC_API_KEY=sk-ant-...

# --- OR ---
AI_PROVIDER=openai
OPENAI_API_KEY=sk-...

# --- OR ---
AI_PROVIDER=gemini
GOOGLE_API_KEY=AIza...
```

Optionally override the model:

```bash
AI_MODEL=gpt-4o-mini  # or claude-opus-4-6, gemini-2.5-pro, etc.
```

## Run

```bash
npm run dev        # Development (tsx)
npm run build      # Compile TypeScript
npm start          # Run compiled version
```

## Default Models

| Provider | Default Model | API Key Env Var |
|----------|--------------|-----------------|
| Claude | `claude-sonnet-4-6` | `ANTHROPIC_API_KEY` |
| OpenAI | `gpt-4o` | `OPENAI_API_KEY` |
| Gemini | `gemini-2.5-flash` | `GOOGLE_API_KEY` |

## Tools

| Tool | Description |
|------|-------------|
| `read_file` | Read project files with optional line ranges |
| `write_file` | Create or overwrite files |
| `edit_file` | Targeted string replacement in files |
| `list_directory` | Browse project structure |
| `search_code` | Grep across backend/frontend source |
| `run_shell` | Execute shell commands |
| `run_tests` | Run vitest suite (all, specific file, or drift) |
| `get_meta_field_info` | Query MetaFieldRegistry for field/objective details |
| `git_status` | Git status, diff, log, blame |

## Example Prompts

```
you> Why is the publish failing for OUTCOME_SALES campaigns?
you> Add a new field 'campaign_group_id' to the campaign registry
you> Run the tests and fix any failures
you> What destination_type should OUTCOME_ENGAGEMENT use?
you> Show me everywhere promoted_object is validated
```
