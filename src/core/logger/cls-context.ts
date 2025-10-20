// Implements REQ-FN-020: Continuation-Local Storage for correlation ID propagation
// Provides async context management for correlation IDs across async boundaries

import * as cls from 'cls-hooked';

/**
 * CLS namespace for request context
 * Used to propagate correlation IDs through async call chains
 */
const CLS_NAMESPACE = 'laac-request-context';

/**
 * Key for storing correlation ID in CLS context
 */
const CORRELATION_ID_KEY = 'correlationId';

/**
 * Gets or creates the CLS namespace for request context
 * @returns CLS Namespace instance
 */
export function getNamespace(): cls.Namespace {
  return cls.getNamespace(CLS_NAMESPACE) || cls.createNamespace(CLS_NAMESPACE);
}

/**
 * Sets the correlation ID in the current CLS context
 * @param correlationId - The correlation ID to store
 */
export function setCorrelationId(correlationId: string): void {
  const namespace = getNamespace();
  namespace.set(CORRELATION_ID_KEY, correlationId);
}

/**
 * Gets the correlation ID from the current CLS context
 * @returns The correlation ID or undefined if not set
 */
export function getCorrelationId(): string | undefined {
  const namespace = getNamespace();
  return namespace.get(CORRELATION_ID_KEY) as string | undefined;
}

/**
 * Runs a function within a new CLS context
 * @param fn - The function to run in the CLS context
 */
export function runInContext<T>(fn: () => T): T {
  const namespace = getNamespace();
  return namespace.runAndReturn(fn);
}
