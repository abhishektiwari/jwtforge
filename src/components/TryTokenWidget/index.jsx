import React, { useMemo, useState } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './styles.module.css';

const defaultStructuredClaims = {
  sub: 'user123',
  scope: 'openid profile email',
  roles: ['admin', 'user'],
};

const defaultHeader = {
  alg: 'RS256',
  typ: 'JWT',
  kid: 'rsa-key-1',
};

const vulnerabilityPresets = [
  '',
  'alg_none',
  'rs_hs_confusion',
  'kid_traversal',
  'jku_injection',
  'embedded_jwk',
];

function getApiBaseUrl(configuredApiBaseUrl) {
  if (typeof configuredApiBaseUrl === 'string' && configuredApiBaseUrl) {
    return configuredApiBaseUrl;
  }

  if (typeof window === 'undefined') {
    return 'http://localhost:8787';
  }

  const isLocalDocs =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  if (isLocalDocs && window.location.port !== '8787') {
    return 'http://localhost:8787';
  }

  return window.location.origin;
}

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function prettyJson(value) {
  return JSON.stringify(value, null, 2);
}

function decodeJwtPart(value) {
  if (!value) return null;
  try {
    let base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const remainder = base64.length % 4;
    if (remainder === 2) base64 += '==';
    if (remainder === 3) base64 += '=';
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

function decodeJwt(token) {
  if (!token || typeof token !== 'string') {
    return { header: null, body: null, signature: '' };
  }

  const [header, body, signature = ''] = token.split('.');
  return {
    header: decodeJwtPart(header),
    body: decodeJwtPart(body),
    signature,
  };
}

function buildPayload({ mode, vulnerability, headerJson, bodyJson, signatureMode, literalSignature }) {
  const header = safeJsonParse(headerJson, defaultHeader);
  const body = safeJsonParse(bodyJson, defaultStructuredClaims);

  const payload = {
    mode,
    header,
    body,
  };

  if (vulnerability) {
    payload.vulnerability = vulnerability;
  }
  if (signatureMode === 'unsigned') {
    payload.signature = false;
  } else if (signatureMode === 'literal') {
    payload.signature = literalSignature;
  }

  return payload;
}

export default function TryTokenWidget() {
  const { siteConfig } = useDocusaurusContext();
  const configuredApiBaseUrl = siteConfig.customFields?.jwtforgeApiBaseUrl;
  const [mode, setMode] = useState('fake');
  const [vulnerability, setVulnerability] = useState('');
  const [signatureMode, setSignatureMode] = useState('normal');
  const [literalSignature, setLiteralSignature] = useState('literal-signature');
  const [headerJson, setHeaderJson] = useState(prettyJson(defaultHeader));
  const [bodyJson, setBodyJson] = useState(prettyJson(defaultStructuredClaims));
  const [response, setResponse] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const payload = useMemo(() => buildPayload({
    mode,
    vulnerability,
    headerJson,
    bodyJson,
    signatureMode,
    literalSignature,
  }), [mode, vulnerability, headerJson, bodyJson, signatureMode, literalSignature]);

  const token = response?.access_token || response?.id_token || '';
  const decoded = useMemo(() => decodeJwt(token), [token]);
  const baseUrl = useMemo(
    () => getApiBaseUrl(configuredApiBaseUrl),
    [configuredApiBaseUrl]
  );
  const endpoint = `${baseUrl.replace(/\/$/, '')}/token`;
  const curl = `curl -X POST ${endpoint} \\
  -H "Content-Type: application/json" \\
  -d '${prettyJson(payload)}'`;

  async function generateToken() {
    setLoading(true);
    setError('');
    setResponse(null);

    try {
      const result = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await result.json();
      if (!result.ok) {
        throw new Error(json.message || json.error_description || json.error || `HTTP ${result.status}`);
      }
      setResponse(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function copyCurl() {
    await navigator.clipboard.writeText(curl);
  }

  return (
    <section className={styles.widget} aria-label="JWTForge token generator">
      <div className={styles.controls}>
        <label className={styles.field}>
          <span>Mode</span>
          <select value={mode} onChange={(event) => setMode(event.target.value)}>
            <option value="fake">fake</option>
            <option value="fuzz">fuzz</option>
            <option value="malicious">malicious</option>
            <option value="grammar">grammar</option>
          </select>
        </label>

        <label className={styles.field}>
          <span>Vulnerability</span>
          <select
            value={vulnerability}
            onChange={(event) => setVulnerability(event.target.value)}
          >
            {vulnerabilityPresets.map((preset) => (
              <option key={preset || 'none'} value={preset}>{preset || 'none'}</option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span>Signature</span>
          <select value={signatureMode} onChange={(event) => setSignatureMode(event.target.value)}>
            <option value="normal">normal</option>
            <option value="unsigned">false</option>
            <option value="literal">literal</option>
          </select>
        </label>

        {signatureMode === 'literal' && (
          <label className={styles.field}>
            <span>Literal signature</span>
            <input value={literalSignature} onChange={(event) => setLiteralSignature(event.target.value)} />
          </label>
        )}
      </div>

      <div className={styles.editors}>
        <label className={styles.editor}>
          <span>Header JSON</span>
          <textarea value={headerJson} onChange={(event) => setHeaderJson(event.target.value)} spellCheck="false" />
        </label>
        <label className={styles.editor}>
          <span>Body JSON</span>
          <textarea value={bodyJson} onChange={(event) => setBodyJson(event.target.value)} spellCheck="false" />
        </label>
      </div>

      <div className={styles.actions}>
        <button className={styles.primaryButton} onClick={generateToken} disabled={loading}>
          {loading ? 'Generating...' : 'Generate token'}
        </button>
        <button className={styles.secondaryButton} onClick={copyCurl}>Copy curl</button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.outputGrid}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>Request</div>
          <pre>{prettyJson(payload)}</pre>
        </div>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>Response</div>
          <pre>{response ? prettyJson(response) : 'No response yet'}</pre>
        </div>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>Decoded header</div>
          <pre>{decoded.header ? prettyJson(decoded.header) : 'No token yet'}</pre>
        </div>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>Decoded body</div>
          <pre>{decoded.body ? prettyJson(decoded.body) : 'No token yet'}</pre>
        </div>
      </div>
    </section>
  );
}
