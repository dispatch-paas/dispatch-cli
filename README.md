# Dispatch CLI

The official command-line interface for [Dispatch](https://github.com/dispatch-paas/dispatch). This tool is the primary entry point for developers using the platform.

## What this repo does
* **Builds**: coordinates the local build process using the Build System.
* **Uploads**: Securely uploads artifacts to S3.
* **Deploys**: Triggers deployments via the Control Plane API.
* **Polls**: Provides real-time status feedback during deployment.

## Installation
```bash
npm install -g dispatch-cli
```

## Non-Goals
* **Cloud Infrastructure**: The CLI does not touch AWS resources directly (no Boto3/AWS SDK for infra management). It strictly talks to the Control Plane.
* **Local Emulation**: It does not currently emulate the full AWS environment locally (beyond basic build verification).
