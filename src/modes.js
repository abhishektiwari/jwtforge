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
 * Categorized malicious payloads for security testing
 */
const maliciousPayloads = {
  sql_injection: [
    "' OR '1'='1",
    "'; DROP TABLE users; --",
    "admin' --",
    "' UNION SELECT NULL--",
    "1' AND '1'='1",
  ],
  xss: [
    "<script>alert('xss')</script>",
    "<img src=x onerror=alert('xss')>",
    "javascript:alert('xss')",
    "<svg onload=alert('xss')>",
    "'\"><script>alert(String.fromCharCode(88,83,83))</script>",
  ],
  path_traversal: [
    "../../../etc/passwd",
    "..\\..\\..\\windows\\system32\\config\\sam",
    "....//....//....//etc/passwd",
  ],
  command_injection: [
    "; ls -la",
    "| cat /etc/passwd",
    "`whoami`",
    "$(whoami)",
  ],
  ldap_injection: [
    "*)(uid=*))(|(uid=*",
    "admin)(|(password=*))",
  ],
  nosql_injection: [
    "{'$gt':''}",
    "{'$ne':null}",
  ],
  xml_injection: [
    "<?xml version='1.0'?><!DOCTYPE foo [<!ENTITY xxe SYSTEM 'file:///etc/passwd'>]>",
  ],
  template_injection: [
    "{{7*7}}",
    "${7*7}",
    "{{config.items()}}",
  ],
  header_injection: [
    "test\r\nInjected-Header: malicious",
  ],
  buffer_overflow: [
    "A".repeat(1000000),
  ],
};

/**
 * Generate malicious payloads for security testing
 * @param {string} category - Optional specific category (sql_injection, xss, command_injection, etc.)
 * @returns {string} A malicious payload
 */
export function getMaliciousValue(category = null) {
  let payloads;

  if (category && maliciousPayloads[category]) {
    // Return from specific category
    payloads = maliciousPayloads[category];
  } else {
    // Return from all categories (mixed)
    const allPayloads = Object.values(maliciousPayloads).flat();
    return allPayloads[Math.floor(Math.random() * allPayloads.length)];
  }

  return payloads[Math.floor(Math.random() * payloads.length)];
}

/**
 * Get all available malicious categories
 * @returns {Array<string>} List of category names
 */
export function getMaliciousCategories() {
  return Object.keys(maliciousPayloads);
}

/**
 * Apply mode-specific transformations to claims
 * @param {Object} claims - The claims object to transform
 * @param {string} mode - The mode: 'fake' (default), 'fuzz', or 'malicious'
 * @param {Array<string>} exclude - List of claim keys to exclude from transformation (default: [])
 * @returns {Object} Transformed claims
 */
export function applyModeTransformations(claims, mode, exclude = []) {
  const modifiedClaims = { ...claims };

  // Extract malicious category BEFORE removing metadata fields
  const maliciousCategory = modifiedClaims.__maliciousCategory || null;

  // Metadata fields to remove from result
  const metadataFields = ['mode', 'exclude', '__maliciousCategory', 'malicious_category', 'grammar_category'];
  metadataFields.forEach(field => delete modifiedClaims[field]);

  if (mode === 'fuzz' || mode === 'malicious') {
    // Always protect these fields from transformation
    const alwaysProtected = ['iss', 'jti', 'kty', 'response_type'];

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
        if (mode === 'fuzz') {
          modifiedClaims[key] = getFuzzedValue();
        } else {
          // Use maliciousCategory extracted before metadata deletion
          modifiedClaims[key] = getMaliciousValue(maliciousCategory);
        }
      });
    }
  }

  return modifiedClaims;
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
      if (mode === 'fuzz') {
        headerOverrides.kid = getFuzzedValue();
      } else {
        // Use malicious_category if provided for header fields
        const category = requestData.malicious_category || null;
        headerOverrides.kid = getMaliciousValue(category);
      }
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

/**
 * Apply grammar-based transformations to claims
 * Selects values from grammar rules for systematic JWT testing
 * @param {Object} claims - The claims object to transform
 * @param {Object} grammar - The complete grammar object from grammar.js
 * @param {Array<string>} exclude - List of claim keys to exclude from transformation
 * @param {string} grammarCategory - Optional specific grammar category to use (valid, edge_cases, injection, etc.)
 * @returns {Object} Transformed claims with grammar-selected values
 */
export function applyGrammarTransformations(claims, grammar, exclude = [], grammarCategory = null) {
  if (!grammar || !grammar.standardClaims) {
    return claims;
  }

  const modifiedClaims = { ...claims };
  const alwaysProtected = ['iss', 'jti', 'kty', 'response_type', 'mode', 'exclude', 'grammar_category', 'malicious_category'];
  const protectedFields = [...alwaysProtected, ...exclude];

  // Iterate through claims and apply grammar rules where available
  Object.keys(modifiedClaims).forEach(claimKey => {
    // Skip protected fields
    if (protectedFields.includes(claimKey)) {
      return;
    }

    let grammarRule = null;

    // Look up grammar rule for this claim
    if (grammar.standardClaims && grammar.standardClaims[claimKey]) {
      grammarRule = grammar.standardClaims[claimKey];
    } else if (grammar.oidcClaims && grammar.oidcClaims[claimKey]) {
      grammarRule = grammar.oidcClaims[claimKey];
    } else if (grammar.authClaims && grammar.authClaims[claimKey]) {
      grammarRule = grammar.authClaims[claimKey];
    }

    // Apply grammar rule if found
    if (grammarRule) {
      modifiedClaims[claimKey] = selectRandomFromGrammar(grammarRule, grammarCategory);
    }
  });

  return modifiedClaims;
}

/**
 * Apply grammar-based transformations to JWT header
 * @param {Object} requestData - The request data
 * @param {Object} grammar - The complete grammar object
 * @param {Array<string>} exclude - Header fields to exclude
 * @param {string} grammarCategory - Optional specific grammar category to use
 * @returns {Object} Header overrides
 */
export function applyGrammarHeaderTransformations(requestData, grammar, exclude = [], grammarCategory = null) {
  if (!grammar || !grammar.header) {
    return {};
  }

  const headerOverrides = {};

  // Apply grammar to header_alg if provided and not excluded
  if (requestData.header_alg !== undefined && !exclude.includes('header_alg')) {
    const algRule = grammar.header.alg;
    if (algRule) {
      headerOverrides.alg = selectRandomFromGrammar(algRule, grammarCategory);
    }
  } else if (requestData.header_alg !== undefined) {
    headerOverrides.alg = requestData.header_alg;
  }

  // Apply grammar to header_kid if provided and not excluded
  if (requestData.header_kid !== undefined && !exclude.includes('header_kid')) {
    const kidRule = grammar.header.kid;
    if (kidRule) {
      headerOverrides.kid = selectRandomFromGrammar(kidRule, grammarCategory);
    }
  } else if (requestData.header_kid !== undefined) {
    headerOverrides.kid = requestData.header_kid;
  }

  return headerOverrides;
}

/**
 * Select a random value from a grammar rule
 * Randomly picks from one of the rule categories (valid, edge_cases, injection, type_variations, etc.)
 * @param {Object} rule - A grammar rule object with various categories
 * @param {string} specificCategory - Optional specific category to select from (valid, edge_cases, injection, etc.)
 * @returns {*} A random value from the rule
 */
function selectRandomFromGrammar(rule, specificCategory = null) {
  // If specific category requested, try to use it
  if (specificCategory && rule[specificCategory] && Array.isArray(rule[specificCategory]) && rule[specificCategory].length > 0) {
    const values = rule[specificCategory];
    return values[Math.floor(Math.random() * values.length)];
  }

  // Available categories in order of preference (if no specific category)
  const categories = [
    'valid',
    'valid_values',
    'edge_cases',
    'type_variations',
    'injection',
    'invalid',
    'vulnerable',
    'variations',
    'single',
    'array',
    'single_string',
    'invalid_types',
    'common',
    'custom'
  ];

  // Try categories in order
  for (const category of categories) {
    if (rule[category] && Array.isArray(rule[category]) && rule[category].length > 0) {
      const values = rule[category];
      return values[Math.floor(Math.random() * values.length)];
    }
  }

  // Fallback: if rule has a single value property
  if (rule.value !== undefined) {
    return rule.value;
  }

  // Last resort: return null
  return null;
}
