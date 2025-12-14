/**
 * Type definitions for the Dispatch safety engine.
 * These mirror the Python implementation from dispatch-build-system.
 */

/**
 * Normalized operation from OpenAPI spec
 */
export interface NormalizedOperation {
  method: string;
  path: string;
  has_request_body: boolean;
  has_path_params: boolean;
  security: string[];
  is_public_override: boolean;
  public_reason: string | null;
}

/**
 * Safety finding from evaluation
 */
export interface SafetyFinding {
  route: string;
  method: string;
  severity: 'block' | 'warn';
  message: string;
}

/**
 * Summary of safety findings
 */
export interface FindingSummary {
  block: number;
  warn: number;
}

/**
 * OpenAPI specification (simplified)
 */
export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  paths: {
    [path: string]: {
      [method: string]: any;
    };
  };
  security?: Array<{ [key: string]: string[] }>;
  components?: any;
}
