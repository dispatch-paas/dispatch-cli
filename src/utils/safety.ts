/**
 * Safety rules evaluator.
 * Mirrors the Python implementation from dispatch-build-system.
 */

import { NormalizedOperation, SafetyFinding, FindingSummary } from '../types';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Determine if an operation is state-mutating
 */
function isWriteOperation(operation: NormalizedOperation): boolean {
  return WRITE_METHODS.has(operation.method);
}

/**
 * Determine if an operation is read-only
 */
function isReadOperation(operation: NormalizedOperation): boolean {
  return READ_METHODS.has(operation.method);
}

/**
 * Determine if an operation has authentication
 */
function hasAuthentication(operation: NormalizedOperation): boolean {
  // Has declared security schemes
  if (operation.security.length > 0) {
    return true;
  }

  // Has explicit public override
  if (operation.is_public_override) {
    return true;
  }

  return false;
}

/**
 * Determine if an operation has a request surface
 */
function hasRequestSurface(operation: NormalizedOperation): boolean {
  return operation.has_request_body || operation.has_path_params;
}

/**
 * Determine if an operation is public but lacks a documented reason
 */
function isPublicWithoutReason(operation: NormalizedOperation): boolean {
  return operation.is_public_override && operation.public_reason === null;
}

/**
 * Determine if an operation requires authentication to be safe
 */
function needsAuthentication(operation: NormalizedOperation): boolean {
  return (
    isWriteOperation(operation) &&
    hasRequestSurface(operation) &&
    !hasAuthentication(operation)
  );
}

/**
 * Evaluate a single operation against all safety rules
 */
function evaluateOperation(operation: NormalizedOperation): SafetyFinding[] {
  const findings: SafetyFinding[] = [];
  const route = operation.path;
  const method = operation.method;

  // BLOCKING RULE: Write operation without authentication
  if (needsAuthentication(operation)) {
    findings.push({
      route,
      method,
      severity: 'block',
      message:
        `Write operation ${method} ${route} must declare authentication. ` +
        `Add a security scheme or use x-public with a documented reason.`,
    });
  }

  // WARNING: Public override without reason
  if (isPublicWithoutReason(operation)) {
    findings.push({
      route,
      method,
      severity: 'warn',
      message:
        `Public operation ${method} ${route} should include x-reason ` +
        `to document why authentication is not required.`,
    });
  }

  // WARNING: Read-only route without authentication
  if (isReadOperation(operation) && !hasAuthentication(operation)) {
    // Only warn if this looks like a sensitive path
    if (operation.has_path_params) {
      findings.push({
        route,
        method,
        severity: 'warn',
        message:
          `Read operation ${method} ${route} with path parameters ` +
          `has no authentication. Consider if this exposes sensitive data.`,
      });
    }
  }

  return findings;
}

/**
 * Evaluate all operations against safety rules
 */
export function evaluateOperations(operations: NormalizedOperation[]): SafetyFinding[] {
  const allFindings: SafetyFinding[] = [];

  // Evaluate each operation independently
  for (const operation of operations) {
    const findings = evaluateOperation(operation);
    allFindings.push(...findings);
  }

  // Sort findings deterministically by route then method
  allFindings.sort((a, b) => {
    if (a.route !== b.route) {
      return a.route.localeCompare(b.route);
    }
    return a.method.localeCompare(b.method);
  });

  return allFindings;
}

/**
 * Determine if deployment should proceed based on findings
 */
export function isDeploymentSafe(findings: SafetyFinding[]): boolean {
  return !findings.some((f) => f.severity === 'block');
}

/**
 * Get a summary of findings by severity
 */
export function getFindingSummary(findings: SafetyFinding[]): FindingSummary {
  const summary: FindingSummary = { block: 0, warn: 0 };

  for (const finding of findings) {
    if (finding.severity === 'block') {
      summary.block++;
    } else if (finding.severity === 'warn') {
      summary.warn++;
    }
  }

  return summary;
}
