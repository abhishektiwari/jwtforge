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
      default: async token => (await jwtVerify(token, joseKey)).payload,
      configured: async token => (await jwtVerify(token, joseKey, {
        algorithms: policy.algorithms, issuer: policy.issuer, audience: policy.audience,
      })).payload,
    },
    {
      library: 'jsonwebtoken',
      default: async token => jsonwebtoken.verify(token, nodeKey),
      configured: async token => jsonwebtoken.verify(token, nodeKey, {
        algorithms: policy.algorithms, issuer: policy.issuer, audience: policy.audience,
      }),
    },
    {
      library: 'fast-jwt',
      default: async token => verifyFastJwtDefault(token),
      configured: async token => verifyFastJwtConfigured(token),
    },
  ];

  const results = [];
  for (const testCase of corpus.cases) {
    for (const adapter of adapters) {
      for (const profile of ['default', 'configured']) {
        if (typeof testCase.token !== 'string') {
          results.push({
            case_id: testCase.id, experiment_id: testCase.profile_case_ids?.[profile] || testCase.id,
            library: adapter.library, language: 'JavaScript', profile, status: 'unsupported',
            error_class: 'UnsupportedSerialization', message: 'JWT decoder accepts compact serialization only',
          });
          continue;
        }
        try {
          // The compared libraries do not expose one consistent jku allowlist
          // option. This application-level precheck is used only by the
          // configured profile and never dereferences the URL.
          if (profile === 'configured') enforceJkuPolicy(testCase.token, policy);
          const payload = await adapter[profile](testCase.token);
          results.push({
            case_id: testCase.id, experiment_id: testCase.profile_case_ids?.[profile] || testCase.id,
            library: adapter.library, language: 'JavaScript', profile,
            status: 'accepted', subject: payload.sub,
          });
        } catch (error) {
          results.push({
            case_id: testCase.id, experiment_id: testCase.profile_case_ids?.[profile] || testCase.id,
            library: adapter.library, language: 'JavaScript', profile, status: 'rejected',
            error_class: error?.code || error?.name || 'Error', message: error?.message || String(error),
          });
        }
      }
    }
  }
  return results;
}
