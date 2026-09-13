const both = expectation => ({ 'policy-unconfigured': expectation, configured: expectation });

const audienceProfileCaseIds = {
  'scalar-audience': {
    'policy-unconfigured': 'scalar-audience-without-expected-audience-config',
    configured: 'scalar-audience-with-expected-audience-config',
  },
  'array-audience': {
    'policy-unconfigured': 'array-audience-without-expected-audience-config',
    configured: 'array-audience-with-expected-audience-config',
  },
  'unexpected-audience': {
    'policy-unconfigured': 'unexpected-audience-without-expected-audience-config',
    configured: 'unexpected-audience-with-expected-audience-config',
  },
};

function caseRecord(id, category, expectations, description, token, generationRequest, metadata = {}) {
  return {
    id, category, expectations, description, generation_request: generationRequest, token,
    ...metadata,
    ...(audienceProfileCaseIds[id] ? { profile_case_ids: audienceProfileCaseIds[id] } : {}),
  };
}

export async function buildCorpus({ jwtforgeUrl, corpusParameters, generatorRevision }) {
  const generationRequests = {};
  const configuredPolicy = {
    algorithms: ['RS256'],
    issuer: corpusParameters.issuer,
    audience: corpusParameters.audience,
    allowed_jku: `${jwtforgeUrl}/.well-known/jwks.json`,
  };

  async function requestJson(endpoint, body) {
    const response = await fetch(`${jwtforgeUrl}${endpoint}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: body === undefined ? {} : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(`${endpoint} returned HTTP ${response.status} with a non-JSON body`);
    }
    if (!response.ok) {
      throw new Error(`${endpoint} returned HTTP ${response.status}: ${JSON.stringify(data)}`);
    }
    return data;
  }

  async function issue(id, body = {}, options = {}) {
    const request = {
      mode: 'fake',
      ...options,
      body: {
        sub: 'differential-subject',
        jti: `differential-${id}`,
        iss: corpusParameters.issuer,
        // JWTForge always emits aud. A known-good value prevents audience
        // validation from confounding experiments about another dimension.
        aud: corpusParameters.audience,
        scope: 'read:example',
        ...body,
      },
    };
    generationRequests[id] = { endpoint: '/token', method: 'POST', body: request };
    const response = await requestJson('/token', request);
    if (response.access_token === undefined) {
      throw new Error('/token response did not contain access_token');
    }
    return response.access_token;
  }

  const generatedAt = Math.floor(Date.now() / 1000);
  const common = { iat: generatedAt, nbf: generatedAt - 5, exp: generatedAt + 3600 };
  const baseline = await issue('valid-baseline', common);

  const directDefinitions = [
    {
      id: 'scalar-audience',
      category: 'audience', expectations: { 'policy-unconfigured': 'observe', configured: 'accept' },
      description: 'Token contains the expected scalar audience; the policy-unconfigured profile supplies no expected audience.',
      body: { ...common, aud: corpusParameters.audience },
    },
    {
      id: 'array-audience',
      category: 'audience', expectations: { 'policy-unconfigured': 'observe', configured: 'accept' },
      description: 'Token contains an audience array including the expected value; the policy-unconfigured profile supplies no expected audience.',
      body: { ...common, aud: [corpusParameters.audience, 'https://secondary.example'] },
    },
    {
      id: 'unexpected-audience',
      category: 'audience', expectations: { 'policy-unconfigured': 'observe', configured: 'reject' },
      description: 'Token contains an unexpected audience; only the configured profile supplies the expected audience.',
      body: { ...common, aud: 'https://unexpected-audience.example' },
    },
    {
      id: 'alternate-issuer', category: 'issuer', expectations: { 'policy-unconfigured': 'observe', configured: 'reject' },
      description: 'Token contains a different issuer; only the configured profile supplies the expected issuer.',
      body: { ...common, iss: 'https://wrong-issuer.example' },
    },
    {
      id: 'expired', category: 'time', expectations: both('reject'),
      description: 'Expiration is in the past.', body: { ...common, exp: generatedAt - 60 },
    },
    {
      id: 'future-not-before', category: 'time', expectations: both('reject'),
      description: 'Not-before time is in the future.', body: { ...common, nbf: generatedAt + 3600 },
    },
    {
      id: 'null-expiration', category: 'claims', expectations: both('reject'),
      description: 'exp is explicitly encoded as JSON null rather than a NumericDate.', body: { ...common, exp: null },
    },
    {
      id: 'string-expiration', category: 'claims', expectations: both('observe'),
      description: 'exp is encoded as a JSON string rather than a NumericDate.', body: { ...common, exp: String(generatedAt + 3600) },
    },
    {
      id: 'string-issued-at', category: 'claims', expectations: both('observe'),
      description: 'iat is encoded as a JSON string rather than a NumericDate.', body: { ...common, iat: String(generatedAt) },
    },
    {
      id: 'numeric-subject', category: 'claims', expectations: both('observe'),
      description: 'sub is encoded as a JSON number rather than a string.', body: { ...common, sub: 12345 },
    },
    {
      id: 'numeric-jwt-id', category: 'claims', expectations: both('observe'),
      description: 'jti is encoded as a JSON number rather than a string.', body: { ...common, jti: 12345 },
    },
    {
      id: 'algorithm-none', category: 'algorithm', expectations: both('reject'),
      description: 'Unsigned token declares alg=none.', body: common, options: { vulnerability: 'alg_none' },
    },
    {
      id: 'rsa-signature-with-hs256-header', category: 'algorithm', expectations: both('reject'),
      description: 'Header declares HS256 while JWTForge signs with the RSA key.', body: common,
      options: { vulnerability: 'rs_hs_confusion' },
    },
    {
      id: 'untrusted-jku-header', category: 'key-reference', expectations: { 'policy-unconfigured': 'observe', configured: 'reject' },
      description: 'Correctly signed token includes a jku outside the configured allowlist; no adapter fetches it.',
      body: common, options: { vulnerability: 'jku_injection' },
    },
    {
      id: 'trusted-jku-header', category: 'key-reference', expectations: both('accept'),
      description: 'Correctly signed token includes the configured JWTForge JWKS URL in jku.',
      body: common, options: { header: { jku: configuredPolicy.allowed_jku } },
    },
  ];

  const directCases = await Promise.all(directDefinitions.map(async definition => {
    const token = await issue(definition.id, definition.body, definition.options);
    return caseRecord(definition.id, definition.category, definition.expectations, definition.description, token, definition.id);
  }));

  const mutationRequest = {
    token: baseline,
    mutations: [
      { id: 'signature-removed', operations: [{ type: 'signature', operation: 'remove' }] },
      { id: 'signature-replaced', operations: [{ type: 'signature', operation: 'replace', value: 'AQID' }] },
      { id: 'signature-truncated', operations: [{ type: 'signature', operation: 'truncate', length: 16 }] },
      { id: 'signature-bit-flip', operations: [{ type: 'signature', operation: 'flip_bit', byte_index: 0, bit_index: 0 }] },
      { id: 'payload-tampered', operations: [{ type: 'body', operation: 'set', field: 'sub', value: 'administrator' }] },
      { id: 'flattened-jws', operations: [{ type: 'format', operation: 'convert', format: 'flattened' }] },
      { id: 'general-jws', operations: [{ type: 'format', operation: 'convert', format: 'general' }] },
    ],
  };
  generationRequests['mutation-batch'] = { endpoint: '/mutation', method: 'POST', body: mutationRequest };
  const mutation = await requestJson('/mutation', mutationRequest);
  const mutationMetadata = {
    'signature-removed': ['signature', both('reject'), 'Signature is removed from the compact token.'],
    'signature-replaced': ['signature', both('reject'), 'Signature bytes are replaced.'],
    'signature-truncated': ['signature', both('reject'), 'Signature is truncated to 16 bytes.'],
    'signature-bit-flip': ['signature', both('reject'), 'One bit in the signature is flipped.'],
    'payload-tampered': ['payload', both('reject'), 'Subject is changed without re-signing.'],
    'flattened-jws': ['serialization', both('reject-or-unsupported'), 'Valid signing segments use JWS Flattened JSON Serialization.'],
    'general-jws': ['serialization', both('reject-or-unsupported'), 'Valid signing segments use JWS General JSON Serialization.'],
  };
  const mutationCases = mutation.results.map(result => {
    const [category, expectations, description] = mutationMetadata[result.id];
    const { token, ...recordedMutationMetadata } = result;
    return caseRecord(result.id, category, expectations, description, token, 'mutation-batch', {
      mutation_metadata: recordedMutationMetadata,
    });
  });

  generationRequests.jwks = { endpoint: '/.well-known/jwks.json', method: 'GET' };
  return {
    schema_version: 4,
    generated_at: new Date(generatedAt * 1000).toISOString(),
    generator: { name: 'JWTForge', url: jwtforgeUrl, ...generatorRevision },
    reference_clock: {
      epoch_seconds: generatedAt,
      iso8601: new Date(generatedAt * 1000).toISOString(),
      verifier_clock_tolerance_seconds: 0,
      strategy: 'Timing cases are regenerated relative to each run; retained tokens exactly preserve the evaluated artifacts.',
    },
    corpus_parameters: corpusParameters,
    configured_policy: configuredPolicy,
    generation_requests: generationRequests,
    jwks: await requestJson('/.well-known/jwks.json'),
    cases: [
      caseRecord('valid-baseline', 'baseline', both('accept'), 'Compact RS256 signed control with the expected issuer and audience.', baseline, 'valid-baseline'),
      ...directCases,
      ...mutationCases,
    ],
  };
}
