import { isPlainObject } from './tokenrequest.js';

export const MUTATION_LIMITS = Object.freeze({
  sourceBytes: 64 * 1024,
  groups: 32,
  operations: 16,
  signatures: 8,
  responseBytes: 1024 * 1024,
  requestBytes: 1024 * 1024,
});

const formats = ['compact', 'flattened', 'general'];
const has = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const byteLength = value => new TextEncoder().encode(value).byteLength;
const copy = value => JSON.parse(JSON.stringify(value));

export class MutationError extends Error {
  constructor(message, status = 400, context = {}) {
    super(message);
    this.name = 'MutationError';
    this.status = status;
    this.context = context;
  }
}

function check(condition, message, status = 400) {
  if (!condition) throw new MutationError(message, status);
}

function objectKeys(value, allowed, label) {
  check(isPlainObject(value), `${label} must be an object`);
  const unknown = Object.keys(value).filter(key => !allowed.includes(key));
  check(!unknown.length, `${label} has unsupported field(s): ${unknown.join(', ')}`);
}

function integer(value, minimum, maximum, label) {
  check(Number.isSafeInteger(value) && value >= minimum && value <= maximum,
    `${label} must be an integer from ${minimum} to ${maximum}`);
}

function withContext(group, groupIndex, operationIndex, action) {
  try {
    return action();
  } catch (error) {
    if (error instanceof MutationError) {
      error.context = {
        group_id: group?.id,
        group_index: groupIndex,
        ...(operationIndex === undefined ? {} : { operation_index: operationIndex }),
        ...error.context,
      };
    }
    throw error;
  }
}

function validateOperation(operation) {
  check(isPlainObject(operation), 'operation must be an object');
  const { type, operation: action } = operation;
  let allowed = ['type', 'operation'];
  if (type === 'header' || type === 'body') {
    check(['set', 'remove'].includes(action), `Unsupported ${type} operation: ${action}`);
    allowed.push('field');
    if (type === 'header') allowed.push('signature_index');
    check(typeof operation.field === 'string' && operation.field.length > 0, 'field must be a nonempty string');
    if (action === 'set') {
      allowed.push('value');
      check(has(operation, 'value'), 'set requires value');
    }
  } else if (type === 'signature') {
    allowed.push('signature_index');
    check(['remove', 'replace', 'truncate', 'flip_bit'].includes(action), `Unsupported signature operation: ${action}`);
    if (action === 'replace') {
      allowed.push('value');
      check(typeof operation.value === 'string', 'signature replace requires a string value');
    } else if (action === 'truncate') {
      allowed.push('length');
      integer(operation.length, 0, MUTATION_LIMITS.responseBytes, 'length');
    } else if (action === 'flip_bit') {
      allowed.push('byte_index', 'bit_index');
      integer(operation.byte_index, 0, MUTATION_LIMITS.responseBytes - 1, 'byte_index');
      integer(operation.bit_index, 0, 7, 'bit_index');
    }
  } else if (type === 'format') {
    allowed.push('format');
    check(action === 'convert', `Unsupported format operation: ${action}`);
    check(formats.includes(operation.format), 'format must be compact, flattened, or general');
  } else {
    throw new MutationError(`Unsupported mutation type: ${type}`);
  }
  objectKeys(operation, allowed, 'operation');
  if (has(operation, 'signature_index')) {
    integer(operation.signature_index, 0, MUTATION_LIMITS.signatures - 1, 'signature_index');
  }
}

export function validateMutationRequest(request) {
  check(isPlainObject(request), 'Mutation request must be an object');
  objectKeys(request, ['token', 'source', 'mutations'], 'Mutation request');
  check(has(request, 'token') !== has(request, 'source'), 'Provide exactly one of token or source');
  check(byteLength(JSON.stringify(request)) <= MUTATION_LIMITS.requestBytes, 'Mutation request exceeds 1 MiB', 413);
  if (has(request, 'source')) {
    const generationFields = ['mode', 'header', 'body', 'signature', 'kty', 'format', 'signatures', 'confusion', 'vulnerability', 'alg_none_variant', 'exclude', 'malicious_category', 'grammar_category'];
    objectKeys(request.source, generationFields, 'source');
    if (has(request.source, 'mode')) {
      check(['fake', 'fuzz', 'malicious', 'grammar', 'malcious', 'grammer'].includes(request.source.mode), 'source.mode must be a supported token generation mode');
    }
    if (isPlainObject(request.source.body)) {
      const controls = ['grant_type', 'response_type', 'token', 'source', 'mutations', ...generationFields];
      check(!Object.keys(request.source.body).some(key => controls.includes(key)), 'Generation options belong in source, not source.body');
    }
    if (has(request.source, 'signatures')) {
      check(Array.isArray(request.source.signatures) && request.source.signatures.length > 0 && request.source.signatures.length <= MUTATION_LIMITS.signatures,
        'source.signatures must contain 1 to 8 entries');
    }
  }
  check(Array.isArray(request.mutations) && request.mutations.length > 0 && request.mutations.length <= MUTATION_LIMITS.groups,
    'mutations must contain 1 to 32 groups');
  const ids = new Set();
  request.mutations.forEach((group, groupIndex) => withContext(group, groupIndex, undefined, () => {
    objectKeys(group, ['id', 'operations'], 'Mutation group');
    check(typeof group.id === 'string' && group.id.trim().length > 0, 'Mutation group id must be a nonempty string');
    check(!ids.has(group.id), 'Mutation group ids must be unique');
    ids.add(group.id);
    check(Array.isArray(group.operations) && group.operations.length > 0 && group.operations.length <= MUTATION_LIMITS.operations,
      'operations must contain 1 to 16 entries');
    group.operations.forEach((operation, operationIndex) =>
      withContext(group, groupIndex, operationIndex, () => validateOperation(operation)));
  }));
  return request;
}

export async function readMutationRequest(request) {
  check(request.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase() === 'application/json', '/mutation requires application/json');
  check(Boolean(request.body), 'Mutation request body is required');
  const reader = request.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let bytes = 0;
  let text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > MUTATION_LIMITS.requestBytes) {
        await reader.cancel();
        throw new MutationError('Mutation request exceeds 1 MiB', 413);
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return validateMutationRequest(JSON.parse(text));
  } catch (error) {
    if (error instanceof MutationError) throw error;
    throw new MutationError('Mutation request must contain valid UTF-8 JSON');
  } finally {
    reader.releaseLock();
  }
}

function decodeBytes(segment, label) {
  check(typeof segment === 'string' && /^[A-Za-z0-9_-]*$/.test(segment) && segment.length % 4 !== 1,
    `${label} must be unpadded Base64url`);
  const binary = atob(segment.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

function encodeBytes(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeObject(segment, label) {
  const bytes = decodeBytes(segment, label);
  let result;
  try {
    result = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    throw new MutationError(`${label} must encode a UTF-8 JSON object`);
  }
  check(isPlainObject(result), `${label} must encode a JSON object`);
  return result;
}

const encodeObject = value => encodeBytes(new TextEncoder().encode(JSON.stringify(value)));

function parseSource(source) {
  check(typeof source === 'string' || isPlainObject(source), 'token must be a compact JWS string or JWS JSON object');
  check(byteLength(typeof source === 'string' ? source : JSON.stringify(source)) <= MUTATION_LIMITS.sourceBytes,
    'Source token exceeds 64 KiB', 413);
  let state;
  if (typeof source === 'string') {
    const parts = source.split('.');
    check(parts.length === 3, 'Compact source must have three segments; JWE is not supported');
    check(parts[0].length > 0, 'Compact source requires a protected header');
    state = { format: 'compact', payload: parts[1], signatures: [{ protected: parts[0], signature: parts[2] }], extra: {} };
  } else {
    const general = has(source, 'signatures');
    if (general) {
      check(!['protected', 'signature', 'header'].some(key => has(source, key)), 'Cannot mix flattened and general JWS fields');
      check(Array.isArray(source.signatures) && source.signatures.length > 0 && source.signatures.length <= MUTATION_LIMITS.signatures,
        'Source must contain 1 to 8 signatures');
    } else {
      check(has(source, 'signature'), 'Flattened source requires signature');
    }
    const { payload, signatures, ...rest } = copy(source);
    state = {
      format: general ? 'general' : 'flattened',
      payload,
      signatures: general ? signatures : [Object.fromEntries(Object.entries(rest).filter(([key]) => ['protected', 'signature', 'header'].includes(key)))],
      extra: general ? rest : Object.fromEntries(Object.entries(rest).filter(([key]) => !['protected', 'signature', 'header'].includes(key))),
    };
  }
  check(typeof state.payload === 'string' && state.payload.length > 0, 'Source requires an encoded payload; detached payloads are not supported');
  decodeObject(state.payload, 'payload');
  state.signatures.forEach((entry, index) => {
    check(isPlainObject(entry) && typeof entry.signature === 'string', `signatures[${index}] requires a string signature`);
    check(!has(entry, 'header') || isPlainObject(entry.header), `signatures[${index}].header must be an object`);
    check(!has(entry, 'protected') || typeof entry.protected === 'string', `signatures[${index}].protected must be a string`);
    const header = entry.protected ? decodeObject(entry.protected, 'protected header') : {};
    check(header.b64 !== false && entry.header?.b64 !== false, 'Unencoded payloads are not supported');
    check(!has(header, 'enc') && !has(entry.header || {}, 'enc'), 'JWE is not supported');
  });
  return state;
}

function serialize(state) {
  if (state.format === 'compact') {
    const entry = state.signatures[0];
    return `${entry.protected || ''}.${state.payload}.${entry.signature}`;
  }
  if (state.format === 'flattened') {
    return { ...state.extra, payload: state.payload, ...state.signatures[0] };
  }
  return { ...state.extra, payload: state.payload, signatures: state.signatures };
}

function selectSignature(state, operation) {
  check(state.format !== 'general' || has(operation, 'signature_index'), 'General JWS header/signature operations require signature_index');
  const index = operation.signature_index ?? 0;
  check(index < state.signatures.length, 'signature_index is out of range');
  return index;
}

function convert(state, format) {
  if (state.format === format) return;
  if (format !== 'general') check(state.signatures.length === 1, 'Conversion would discard signatures');
  if (format === 'compact') {
    check(!Object.keys(state.extra).length && !Object.keys(state.signatures[0]).some(key => !['protected', 'signature'].includes(key)),
      'Compact conversion would discard unprotected headers or extension fields');
    check(Boolean(state.signatures[0].protected), 'Compact conversion requires a protected header');
  } else if (format === 'flattened') {
    check(!Object.keys(state.signatures[0]).some(key => ['payload', 'signatures'].includes(key) || has(state.extra, key)),
      'Flattened conversion would overwrite extension fields');
  } else {
    check(!['protected', 'signature', 'header'].some(key => has(state.extra, key)), 'General conversion has conflicting extension fields');
  }
  state.format = format;
}

function applyOperation(state, operation) {
  const { type, operation: action, field } = operation;
  if (type === 'format') {
    const previous = state.format;
    convert(state, operation.format);
    return { type, operation: action, changed: previous !== state.format };
  }
  const index = type === 'body' ? undefined : selectSignature(state, operation);
  const entry = index === undefined ? undefined : state.signatures[index];
  const change = { type, operation: action, ...(index === undefined ? {} : { signature_index: index }) };
  if (type === 'header' || type === 'body') {
    const previous = type === 'body' ? state.payload : entry.protected;
    const value = previous ? decodeObject(previous, type) : {};
    check(action !== 'remove' || has(value, field), `${type}.${field} does not exist`);
    const unchanged = action === 'set' && has(value, field) && JSON.stringify(value[field]) === JSON.stringify(operation.value);
    if (!unchanged) {
      if (action === 'remove') delete value[field];
      // Computed properties also preserve literal __proto__ claims without mutating prototypes.
      const updated = action === 'set' ? { ...value, [field]: operation.value } : value;
      if (type === 'body') state.payload = encodeObject(updated);
      else entry.protected = encodeObject(updated);
    }
    return { ...change, field, changed: !unchanged };
  }
  const previous = entry.signature;
  if (action === 'remove') entry.signature = '';
  else if (action === 'replace') entry.signature = operation.value;
  else {
    const bytes = decodeBytes(entry.signature, 'signature');
    if (action === 'truncate') {
      check(operation.length <= bytes.length, 'length exceeds signature byte length');
      entry.signature = operation.length === bytes.length ? previous : encodeBytes(bytes.slice(0, operation.length));
    } else {
      check(operation.byte_index < bytes.length, 'byte_index exceeds signature byte length');
      bytes[operation.byte_index] ^= 1 << operation.bit_index;
      entry.signature = encodeBytes(bytes);
    }
  }
  return { ...change, changed: previous !== entry.signature };
}

export function mutateToken(source, groups) {
  validateMutationRequest({ token: source, mutations: groups });
  const original = parseSource(source);
  const response = { count: groups.length, results: [] };
  groups.forEach((group, groupIndex) => withContext(group, groupIndex, undefined, () => {
    const state = copy(original);
    const changes = group.operations.map((operation, operationIndex) => withContext(group, groupIndex, operationIndex, () => {
      const change = applyOperation(state, operation);
      check(byteLength(JSON.stringify(serialize(state))) <= MUTATION_LIMITS.responseBytes, 'Mutated token exceeds 1 MiB', 413);
      return change;
    }));
    response.results.push({
      id: group.id,
      format: state.format,
      token: serialize(state),
      operations: copy(group.operations),
      changes,
      signatures: state.signatures.map((entry, index) => ({
        signature_index: index,
        signing_input_changed: (entry.protected || '') !== (original.signatures[index].protected || '') || state.payload !== original.payload,
        signature_action: entry.signature === original.signatures[index].signature ? 'preserved' : entry.signature === '' ? 'removed' : 'modified',
      })),
    });
    check(byteLength(JSON.stringify(response)) <= MUTATION_LIMITS.responseBytes, 'Mutation response exceeds 1 MiB', 413);
  }));
  return response;
}
