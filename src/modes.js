/**
 * Mode-based claim transformations for security testing
 * Supports: fake (default), fuzz, malicious
 */

import blns from 'blns';

/**
 * Generate fuzzed values for security testing using blns (Big List of Naughty Strings)
 * Includes additional non-string edge cases
 */
export function getFuzzedValue() {
  // Additional edge cases not covered by blns (non-string types)
  const additionalPatterns = [
    Array(1000).fill('x'),                 // Large array
    { nested: { deep: { value: 'test' }}}, // Deep nesting
    true,                                  // Boolean
    false,                                 // Boolean
    0,                                     // Zero
    -1,                                    // Negative
    999999999999,                          // Large number
    -999999999999,                         // Large negative
    null,                                  // Null
    undefined,                             // Undefined
    Number.MAX_SAFE_INTEGER,               // Max safe integer
    Number.MIN_SAFE_INTEGER,               // Min safe integer
    Infinity,                              // Infinity
    -Infinity,                             // Negative infinity
    NaN,                                   // Not a number
  ];

  // Combine blns strings with additional patterns
  const allPatterns = [...blns, ...additionalPatterns];
  return allPatterns[Math.floor(Math.random() * allPatterns.length)];
}

/**
 * Generate fuzzed algorithm values for JWT header testing
 * Includes algorithm confusion attacks
 */
export function getFuzzedAlgorithm() {
  const algPatterns = [
    'none',           // Algorithm confusion attack
    'None',           // Case variant
    'NONE',           // Case variant
    'nOnE',           // Mixed case
    'HS256',          // Symmetric key confusion
    'HS384',          // Symmetric key confusion
    'HS512',          // Symmetric key confusion
    'RS384',          // Different RSA algorithm
    'RS512',          // Different RSA algorithm
    'ES384',          // Different EC algorithm
    'ES512',          // Different EC algorithm
    'PS256',          // RSA-PSS
    '',               // Empty string
    ...blns.slice(0, 20)  // Sample of BLNS patterns
  ];
  return algPatterns[Math.floor(Math.random() * algPatterns.length)];
}

/**
 * Generate malicious payloads for security testing
 */
export function getMaliciousValue() {
  const maliciousPatterns = [
    // SQL Injection
    "' OR '1'='1",
    "'; DROP TABLE users; --",
    "admin' --",
    "' UNION SELECT NULL--",
    "1' AND '1'='1",

    // XSS
    "<script>alert('xss')</script>",
    "<img src=x onerror=alert('xss')>",
    "javascript:alert('xss')",
    "<svg onload=alert('xss')>",
    "'\"><script>alert(String.fromCharCode(88,83,83))</script>",

    // Path Traversal
    "../../../etc/passwd",
    "..\\..\\..\\windows\\system32\\config\\sam",
    "....//....//....//etc/passwd",

    // Command Injection
    "; ls -la",
    "| cat /etc/passwd",
    "`whoami`",
    "$(whoami)",

    // LDAP Injection
    "*)(uid=*))(|(uid=*",
    "admin)(|(password=*))",

    // NoSQL Injection
    "{'$gt':''}",
    "{'$ne':null}",

    // XML Injection
    "<?xml version='1.0'?><!DOCTYPE foo [<!ENTITY xxe SYSTEM 'file:///etc/passwd'>]>",

    // Template Injection
    "{{7*7}}",
    "${7*7}",
    "{{config.items()}}",

    // Header Injection
    "test\r\nInjected-Header: malicious",

    // Overflow
    "A".repeat(1000000),
  ];
  return maliciousPatterns[Math.floor(Math.random() * maliciousPatterns.length)];
}

/**
 * Apply mode-specific transformations to claims
 * @param {Object} claims - The claims object to transform
 * @param {string} mode - The mode: 'fake' (default), 'fuzz', or 'malicious'
 * @param {Array<string>} exclude - List of claim keys to exclude from transformation (default: [])
 * @returns {Object} Transformed claims
 */
export function applyModeTransformations(claims, mode, exclude = []) {
  if (mode === 'fuzz' || mode === 'malicious') {
    const modifiedClaims = { ...claims };

    // Always protect these metadata fields
    const alwaysProtected = ['iss', 'jti', 'kty', 'response_type', 'mode', 'exclude'];

    // Combine always-protected fields with user-specified exclusions
    const protectedFields = [...alwaysProtected, ...exclude];

    // Get modifiable claim keys (excluding protected fields)
    const claimKeys = Object.keys(modifiedClaims).filter(
      key => !protectedFields.includes(key)
    );

    if (claimKeys.length > 0) {
      // Randomly select 1-3 fields to modify
      const numFieldsToModify = Math.min(
        Math.floor(Math.random() * 3) + 1,
        claimKeys.length
      );

      const fieldsToModify = [];
      while (fieldsToModify.length < numFieldsToModify) {
        const randomKey = claimKeys[Math.floor(Math.random() * claimKeys.length)];
        if (!fieldsToModify.includes(randomKey)) {
          fieldsToModify.push(randomKey);
        }
      }

      // Apply transformations
      fieldsToModify.forEach(key => {
        modifiedClaims[key] = mode === 'fuzz' ? getFuzzedValue() : getMaliciousValue();
      });
    }

    return modifiedClaims;
  }

  return claims;
}

/**
 * Apply mode-specific transformations to JWT header fields
 * @param {Object} requestData - The request data that may contain header_alg and header_kid
 * @param {string} mode - The mode: 'fake' (default), 'fuzz', or 'malicious'
 * @param {Array<string>} exclude - List of header fields to exclude from transformation
 * @returns {Object} Header overrides object
 */
export function applyHeaderTransformations(requestData, mode, exclude = []) {
  const headerOverrides = {};

  if (mode === 'fuzz' || mode === 'malicious') {
    // Transform header_alg if provided and not excluded
    if (requestData.header_alg !== undefined && !exclude.includes('header_alg')) {
      if (mode === 'fuzz') {
        headerOverrides.alg = getFuzzedAlgorithm();
      } else {
        // For malicious mode, also use algorithm confusion attacks
        headerOverrides.alg = Math.random() < 0.5 ? 'none' : getMaliciousValue();
      }
    } else if (requestData.header_alg !== undefined) {
      // If excluded, use the provided value
      headerOverrides.alg = requestData.header_alg;
    }

    // Transform header_kid if provided and not excluded
    if (requestData.header_kid !== undefined && !exclude.includes('header_kid')) {
      headerOverrides.kid = mode === 'fuzz' ? getFuzzedValue() : getMaliciousValue();
    } else if (requestData.header_kid !== undefined) {
      // If excluded, use the provided value
      headerOverrides.kid = requestData.header_kid;
    }
  } else {
    // In 'fake' mode, just pass through if provided
    if (requestData.header_alg !== undefined) {
      headerOverrides.alg = requestData.header_alg;
    }
    if (requestData.header_kid !== undefined) {
      headerOverrides.kid = requestData.header_kid;
    }
  }

  return headerOverrides;
}
