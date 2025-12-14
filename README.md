# dispatch-cli

Command-line tool for running safety checks on Dispatch API projects.

## Installation

```bash
npm install
npm run build
```

## Usage

```bash
# Run safety checks on current directory
node dist/cli.js check

# Specify a project directory
node dist/cli.js check --project ./my-api
```

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
