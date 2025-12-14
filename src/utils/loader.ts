/**
 * OpenAPI specification loader.
 * Mirrors the Python implementation from dispatch-build-system.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { OpenAPISpec } from '../types';

/**
 * Ordered list of file names to search for OpenAPI specification
 */
const OPENAPI_FILE_CANDIDATES = [
  'openapi.json',
  'openapi.yaml',
  'openapi.yml',
  'swagger.json',
  'swagger.yaml',
  'swagger.yml',
];

/**
 * Discover OpenAPI specification file in project root directory.
 */
export function discoverOpenAPIFile(projectRoot: string): string | null {
  const rootPath = path.resolve(projectRoot);

  if (!fs.existsSync(rootPath)) {
    throw new Error(`Project root directory does not exist: ${projectRoot}`);
  }

  if (!fs.statSync(rootPath).isDirectory()) {
    throw new Error(`Project root is not a directory: ${projectRoot}`);
  }

  for (const candidate of OPENAPI_FILE_CANDIDATES) {
    const filePath = path.join(rootPath, candidate);
    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return filePath;
    }
  }

  return null;
}

/**
 * Parse OpenAPI specification file (JSON or YAML).
 */
export function parseOpenAPIFile(filePath: string): OpenAPISpec {
  const extension = path.extname(filePath).toLowerCase();
  const content = fs.readFileSync(filePath, 'utf-8');

  try {
    if (extension === '.json') {
      return JSON.parse(content) as OpenAPISpec;
    } else if (extension === '.yaml' || extension === '.yml') {
      return yaml.load(content) as OpenAPISpec;
    } else {
      throw new Error(
        `Unsupported file extension '${extension}'. Expected .json, .yaml, or .yml`
      );
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to parse OpenAPI file '${filePath}': ${error.message}`);
    }
    throw error;
  }
}

/**
 * Validate that the spec is OpenAPI v3.x
 */
export function validateOpenAPISpec(spec: OpenAPISpec): void {
  if (!spec.openapi) {
    throw new Error(
      "Invalid OpenAPI specification: missing required top-level field 'openapi'."
    );
  }

  if (typeof spec.openapi !== 'string') {
    throw new Error(
      `Invalid OpenAPI specification: 'openapi' field must be a string, got ${typeof spec.openapi}.`
    );
  }

  if (!spec.openapi.startsWith('3.')) {
    throw new Error(
      `Invalid OpenAPI specification: OpenAPI v2 / Swagger 2.0 is not supported. ` +
        `Found version '${spec.openapi}', but Dispatch requires OpenAPI v3.x.`
    );
  }

  if (!spec.info) {
    throw new Error(
      "Invalid OpenAPI specification: missing required top-level field 'info'."
    );
  }

  if (!spec.paths) {
    throw new Error(
      "Invalid OpenAPI specification: missing required top-level field 'paths'."
    );
  }
}

/**
 * Load and validate OpenAPI specification from a project directory.
 */
export function loadOpenAPISpec(projectRoot: string = '.'): OpenAPISpec {
  // Step 1: Discover the OpenAPI file
  const filePath = discoverOpenAPIFile(projectRoot);

  if (!filePath) {
    throw new Error(
      'No OpenAPI specification found. ' +
        'Dispatch requires an OpenAPI v3 contract to verify API safety.'
    );
  }

  // Step 2: Parse the file
  const spec = parseOpenAPIFile(filePath);

  // Step 3: Validate the specification
  validateOpenAPISpec(spec);

  // Step 4: Return the validated specification
  return spec;
}
