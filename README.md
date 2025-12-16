# Dispatch CLI

The official command-line interface for [Dispatch](https://github.com/dispatch-paas/dispatch). Deploy your OpenAPI-defined APIs to production with built-in safety checks and tier-based access.

## Installation
```bash
npm install -g dispatch-cli
```

## Quick Start

### 1. Get Your Access Code
Visit [usedp.xyz/dashboard](https://usedp.xyz/dashboard) to:
- Sign up for a Dispatch account
- Choose your tier (Free/Pro/Enterprise)
- Generate your access code

### 2. Login
```bash
dispatch login
# Paste your access code when prompted
```

### 3. Deploy Your API
```bash
cd your-api-project
dispatch deploy
```

## Commands

### `dispatch login`
Authenticate using your access code from the dashboard.

```bash
dispatch login
# Interactive: prompts for access code

dispatch login --code YOUR_ACCESS_CODE
# Non-interactive: provide code directly
```

### `dispatch logout`
Remove local credentials.

```bash
dispatch logout
```

### `dispatch check`
Run safety checks locally without deploying.

```bash
dispatch check
dispatch check --project ./my-api
```

### `dispatch deploy`
Deploy your API to production after passing safety checks.

```bash
dispatch deploy
dispatch deploy --project ./my-api
dispatch deploy --dry-run  # Safety checks only
```

## Authentication

Dispatch uses **access code authentication**:
- Access codes are generated from your dashboard
- Single-use codes for security
- Tier-based access control
- No password storage in CLI

See [Access Code Authentication](../docs/ACCESS_CODE_AUTH.md) for details.

## What this CLI does
* **Safety Checks**: Validates your OpenAPI spec for security issues
* **Builds**: Creates deployment artifacts with proper dependencies
* **Uploads**: Securely uploads artifacts to S3
* **Deploys**: Triggers deployments via the Control Plane
* **Monitors**: Provides real-time deployment status

## Non-Goals
* **Cloud Infrastructure**: The CLI does not touch AWS resources directly
* **Local Emulation**: No local AWS environment emulation
