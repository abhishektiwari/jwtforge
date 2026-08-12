const TEMPLATE_TYPES = new Set(['literal', 'timestamp', 'url', 'jwk', 'attack_string', 'faker']);
let fakerProvider = null;

const HOST_ALIASES = {
  trusted: 'example.com',
  auth: 'auth.example.com',
  attacker: 'attacker.example.com',
  metadata_service: '169.254.169.254',
  localhost: 'localhost'
};

function isTemplate(value) {
  return value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    TEMPLATE_TYPES.has(value.type);
}

function cloneLiteral(value) {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(cloneLiteral);
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, entryValue]) => [key, cloneLiteral(entryValue)])
  );
}

function resolveTimestamp(template) {
  const now = Math.floor(Date.now() / 1000);
  return now + (template.offsetSeconds || 0);
}

function resolveUrl(template) {
  if (template.value !== undefined) {
    return template.value;
  }

  const scheme = template.scheme || 'https';
  const host = HOST_ALIASES[template.host] || template.host || HOST_ALIASES.trusted;
  const port = template.port ? `:${template.port}` : '';
  const path = template.path || '/';
  return `${scheme}://${host}${port}${path}`;
}

function resolveJwk(template) {
  if (template.value !== undefined) {
    return cloneLiteral(template.value);
  }

  const kty = template.kty || 'RSA';
  const jwk = {
    kty,
    use: template.use || 'sig',
    kid: template.kid || 'embedded-key',
    alg: template.alg || (kty === 'EC' ? 'ES256' : 'RS256')
  };

  if (kty === 'RSA') {
    jwk.n = template.n || 'test';
    jwk.e = template.e || 'AQAB';
  } else if (kty === 'EC') {
    jwk.crv = template.crv || 'P-256';
    jwk.x = template.x || 'test';
    jwk.y = template.y || 'test';
  }

  return jwk;
}

export function setGrammarFaker(provider) {
  fakerProvider = provider;
}

function fallbackFaker(kind) {
  switch (kind) {
    case 'full_name':
      return 'Test User';
    case 'first_name':
      return 'Test';
    case 'last_name':
      return 'User';
    case 'username':
      return `user_${Math.random().toString(36).slice(2, 10)}`;
    case 'email':
      return `user_${Math.random().toString(36).slice(2, 10)}@example.com`;
    case 'url':
      return 'https://example.com';
    case 'avatar':
      return 'https://example.com/avatar.png';
    case 'phone_number':
      return '+1-201-555-0123';
    case 'country_code':
      return 'US';
    case 'locale':
      return 'en-US';
    case 'timezone':
      return 'America/New_York';
    case 'birthdate':
      return '1990-01-01';
    case 'street_address':
      return '123 Main St';
    case 'city':
      return 'Anytown';
    case 'state':
      return 'CA';
    case 'zip_code':
      return '90210';
    case 'boolean':
      return Math.random() < 0.5;
    case 'uuid':
      return crypto.randomUUID ? crypto.randomUUID() : '550e8400-e29b-41d4-a716-446655440000';
    default:
      throw new Error(`Unsupported faker template kind: ${kind}`);
  }
}

function resolveFaker(template) {
  const faker = fakerProvider;
  if (!faker) {
    return fallbackFaker(template.kind);
  }

  switch (template.kind) {
    case 'full_name':
      return faker.person.fullName();
    case 'first_name':
      return faker.person.firstName();
    case 'last_name':
      return faker.person.lastName();
    case 'username':
      return faker.internet.username();
    case 'email':
      return faker.internet.email();
    case 'url':
      return faker.internet.url();
    case 'avatar':
      return faker.image.avatar();
    case 'phone_number':
      return faker.phone.number();
    case 'country_code':
      return faker.location.countryCode('alpha-2');
    case 'locale':
      return `${faker.location.countryCode('alpha-2')}-${faker.location.countryCode('alpha-2')}`;
    case 'timezone':
      return faker.location.timeZone();
    case 'birthdate':
      return faker.date.birthdate({ mode: 'age', min: 18, max: 80 }).toISOString().split('T')[0];
    case 'street_address':
      return faker.location.streetAddress();
    case 'city':
      return faker.location.city();
    case 'state':
      return faker.location.state();
    case 'zip_code':
      return faker.location.zipCode();
    case 'boolean':
      return faker.datatype.boolean();
    case 'uuid':
      return faker.string.uuid();
    default:
      throw new Error(`Unsupported faker template kind: ${template.kind}`);
  }
}

/**
 * Resolve grammar templates to actual JWT header/payload values.
 * Non-template literals pass through unchanged.
 */
export function resolveGrammarValue(value) {
  if (!isTemplate(value)) {
    return cloneLiteral(value);
  }

  switch (value.type) {
    case 'literal':
    case 'attack_string':
      return cloneLiteral(value.value);
    case 'timestamp':
      return resolveTimestamp(value);
    case 'url':
      return resolveUrl(value);
    case 'jwk':
      return resolveJwk(value);
    case 'faker':
      return resolveFaker(value);
    default:
      return cloneLiteral(value);
  }
}
