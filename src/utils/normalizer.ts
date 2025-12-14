/**
 * OpenAPI specification normalizer.
 * Mirrors the Python implementation from dispatch-build-system.
 */

import { OpenAPISpec, NormalizedOperation } from '../types';

const SUPPORTED_HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'options', 'head']);

/**
 * Extract security scheme names from a security object
 */
function extractSecuritySchemes(securityObj: Array<{ [key: string]: string[] }>): string[] {
  if (!securityObj || securityObj.length === 0) {
    return [];
  }

  const schemeNames: string[] = [];
  for (const securityRequirement of securityObj) {
    if (typeof securityRequirement === 'object') {
      schemeNames.push(...Object.keys(securityRequirement));
    }
  }

  return schemeNames;
}

/**
 * Check if a path or operation has path parameters
 */
function hasPathParameters(pathStr: string, operation: any): boolean {
  // Check if path contains parameter syntax
  if (pathStr.includes('{') && pathStr.includes('}')) {
    return true;
  }

  // Check operation-level parameters
  const parameters = operation.parameters || [];
  for (const param of parameters) {
    if (typeof param === 'object' && param.in === 'path') {
      return true;
    }
  }

  return false;
}

/**
 * Check if an operation has a request body
 */
function hasRequestBody(operation: any): boolean {
  return 'requestBody' in operation;
}

/**
 * Extract public override information from vendor extensions
 */
function extractPublicOverride(operation: any): { isPublic: boolean; reason: string | null } {
  const isPublic = operation['x-public'] === true;
  const reason = isPublic ? (operation['x-reason'] || null) : null;

  return { isPublic, reason };
}

/**
 * Normalize a single OpenAPI operation into the canonical format
 */
function normalizeOperation(
  pathStr: string,
  method: string,
  operation: any,
  globalSecurity: Array<{ [key: string]: string[] }>
): NormalizedOperation {
  // Extract security (operation-level overrides global)
  let securitySchemes: string[];
  if ('security' in operation) {
    securitySchemes = extractSecuritySchemes(operation.security);
  } else {
    securitySchemes = extractSecuritySchemes(globalSecurity);
  }

  // Extract public override information
  const { isPublic, reason } = extractPublicOverride(operation);

  return {
    method: method.toUpperCase(),
    path: pathStr,
    has_request_body: hasRequestBody(operation),
    has_path_params: hasPathParameters(pathStr, operation),
    security: securitySchemes,
    is_public_override: isPublic,
    public_reason: reason,
  };
}

/**
 * Normalize an OpenAPI v3.x specification into a list of operations.
 */
export function normalizeOpenAPISpec(spec: OpenAPISpec): NormalizedOperation[] {
  // Extract global security (used as default)
  const globalSecurity = spec.security || [];

  // Extract all operations from paths
  const operations: NormalizedOperation[] = [];
  const paths = spec.paths || {};

  for (const [pathStr, pathItem] of Object.entries(paths)) {
    if (typeof pathItem !== 'object' || pathItem === null) {
      continue;
    }

    // Iterate through all HTTP methods in this path
    for (const [method, operation] of Object.entries(pathItem)) {
      // Only process supported HTTP methods
      if (!SUPPORTED_HTTP_METHODS.has(method.toLowerCase())) {
        continue;
      }

      if (typeof operation !== 'object' || operation === null) {
        continue;
      }

      // Normalize this operation
      const normalizedOp = normalizeOperation(pathStr, method, operation, globalSecurity);
      operations.push(normalizedOp);
    }
  }

  // Sort deterministically by path then method
  operations.sort((a, b) => {
    if (a.path !== b.path) {
      return a.path.localeCompare(b.path);
    }
    return a.method.localeCompare(b.method);
  });

  return operations;
}
