import { createPublicKey } from 'node:crypto';
import { createVerifier } from 'fast-jwt';
import jsonwebtoken from 'jsonwebtoken';
import { importJWK, jwtVerify } from 'jose';

function protectedHeader(token) {
  const encoded = token.split('.')[0];
  return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
}

function enforceJkuPolicy(token, policy) {
  const { jku } = protectedHeader(token);
  if (jku !== undefined && jku !== policy.allowed_jku) {
    const error = new Error(`jku is not allowlisted: ${jku}`);
    error.name = 'ConfiguredJkuPolicyError';
    throw error;
  }
}

function documentedValidationException(library, error) {
  if (error?.name === 'ConfiguredJkuPolicyError') return true;
  if (library === 'jose') return typeof error?.code === 'string' && error.code.startsWith('ERR_J');
  if (library === 'jsonwebtoken') {
    return ['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError'].includes(error?.name);
  }
  if (library === 'fast-jwt') {
    return typeof error?.code === 'string' && error.code.startsWith('FAST_JWT_');
  }
  return false;
}

function errorClassification(library, error) {
  if (error?.name === 'TimeoutError' || error?.name === 'AbortError') return 'timeout';
  if (error?.name === 'ProcessCrashError') return 'crash';
  return documentedValidationException(library, error)
    ? 'documented-validation-exception'
    : 'other-exception';
}

async function withTimeout(operation, timeoutMs = 5000) {
  let timeout;
  const expired = new Promise((_, reject) => {
    timeout = setTimeout(() => {
      const error = new Error(`verification exceeded ${timeoutMs} ms`);
      error.name = 'TimeoutError';
      reject(error);
    }, timeoutMs);
  });
  try {
    return await Promise.race([operation(), expired]);
  } finally {
    clearTimeout(timeout);
  }
}

export async function runJavaScriptAdapters(corpus) {
  const jwk = corpus.jwks.keys.find(key => key.kty === 'RSA');
  if (!jwk) throw new Error('JWTForge JWKS does not contain an RSA key');

  const policy = corpus.configured_policy;
  const joseKey = await importJWK(jwk);
  const nodeKey = createPublicKey({ key: jwk, format: 'jwk' });
  const publicKeyPem = nodeKey.export({ type: 'spki', format: 'pem' });
  const verifyFastJwtDefault = createVerifier({ key: publicKeyPem });
  const verifyFastJwtConfigured = createVerifier({
    key: publicKeyPem,
    algorithms: policy.algorithms,
    allowedIss: policy.issuer,
    allowedAud: policy.audience,
  });
  const adapters = [
    {
      library: 'jose',
      'policy-unconfigured': async token => (await jwtVerify(token, joseKey)).payload,
      configured: async token => (await jwtVerify(token, joseKey, {
        algorithms: policy.algorithms, issuer: policy.issuer, audience: policy.audience,
      })).payload,
    },
    {
      library: 'jsonwebtoken',
      'policy-unconfigured': async token => jsonwebtoken.verify(token, nodeKey),
      configured: async token => jsonwebtoken.verify(token, nodeKey, {
        algorithms: policy.algorithms, issuer: policy.issuer, audience: policy.audience,
      }),
    },
    {
      library: 'fast-jwt',
      'policy-unconfigured': async token => verifyFastJwtDefault(token),
      configured: async token => verifyFastJwtConfigured(token),
    },
  ];

  const results = [];
  for (const testCase of corpus.cases) {
    for (const adapter of adapters) {
      for (const profile of ['policy-unconfigured', 'configured']) {
        if (typeof testCase.token !== 'string') {
          results.push({
            case_id: testCase.id, experiment_id: testCase.profile_case_ids?.[profile] || testCase.id,
            library: adapter.library, language: 'JavaScript', profile, status: 'unsupported',
            verification_attempted: false, verification_decision: 'not-attempted',
            error_classification: null, interface_classification: 'compact-jwt-only-precheck',
            error_class: 'UnsupportedSerialization', message: 'JWT decoder accepts compact serialization only',
          });
          continue;
        }
        try {
          // The compared libraries do not expose one consistent jku allowlist
          // option. This application-level precheck is used only by the
          // configured profile and never dereferences the URL.
          if (profile === 'configured') enforceJkuPolicy(testCase.token, policy);
          const payload = await withTimeout(() => adapter[profile](testCase.token));
          results.push({
            case_id: testCase.id, experiment_id: testCase.profile_case_ids?.[profile] || testCase.id,
            library: adapter.library, language: 'JavaScript', profile,
            status: 'accepted', verification_attempted: true, verification_decision: 'accepted',
            error_classification: null, subject: payload.sub,
          });
        } catch (error) {
          results.push({
            case_id: testCase.id, experiment_id: testCase.profile_case_ids?.[profile] || testCase.id,
            library: adapter.library, language: 'JavaScript', profile, status: 'rejected',
            verification_attempted: true, verification_decision: 'rejected',
            error_classification: errorClassification(adapter.library, error),
            error_class: error?.code || error?.name || 'Error', message: error?.message || String(error),
          });
        }
      }
    }
  }
  return results;
}
