# dispatch-cli

Command-line tool for running safety checks and deploying to Dispatch platform.

## Installation

```bash
npm install
npm run build
```

## Usage

### Safety Checks

```bash
# Run safety checks on current directory
node dist/cli.js check

# Specify a project directory
node dist/cli.js check --project ./my-api
```

### Deploy to Production

```bash
# Deploy your API
node dist/cli.js deploy

# Dry run (safety checks only)
node dist/cli.js deploy --dry-run

# Specify project directory
node dist/cli.js deploy --project ./my-api
```

## Project Configuration

Create a `dispatch.yaml` in your project root:

```yaml
project: my-api-name
runtime: nodejs18
region: eu-west-1
```

If not present, defaults will be used.

## Requirements

- Node.js >= 16
- OpenAPI v3.x specification in your project

## How it Works

The CLI will:
1. Locate your OpenAPI spec (searches for `openapi.yaml`, `openapi.json`, etc.)
2. Normalize all API operations
3. Check for unsafe patterns (e.g., write operations without authentication)
4. Report any issues found

Exit code 0 means deployment is safe, exit code 1 means issues were found.

## Development

```bash
npm run dev    # Watch mode
npm run lint   # Check code
npm run format # Format code
```
