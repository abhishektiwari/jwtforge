import React, { useMemo, useState } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { tokenExampleGroups, tokenExampleOptions } from '../../token-examples.js';
import styles from './styles.module.css';

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

function safeJsonParse(value, fallback = null) {
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

const initialExample = tokenExampleOptions[0];

export default function TryTokenWidget() {
  const { siteConfig } = useDocusaurusContext();
  const configuredApiBaseUrl = siteConfig.customFields?.jwtforgeApiBaseUrl;
  const [selectedExample, setSelectedExample] = useState(initialExample.key);
  const [requestJson, setRequestJson] = useState(prettyJson(initialExample.value));
  const [response, setResponse] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const parsedRequest = useMemo(() => safeJsonParse(requestJson), [requestJson]);
  const token = response?.access_token || response?.id_token || '';
  const decoded = useMemo(() => decodeJwt(token), [token]);
  const baseUrl = useMemo(
    () => getApiBaseUrl(configuredApiBaseUrl),
    [configuredApiBaseUrl]
  );
  const endpoint = `${baseUrl.replace(/\/$/, '')}/token`;
  const curl = `curl -X POST ${endpoint} \\
  -H "Content-Type: application/json" \\
  -d '${parsedRequest ? prettyJson(parsedRequest) : requestJson}'`;

  function handleExampleChange(exampleKey) {
    const example = tokenExampleOptions.find((option) => option.key === exampleKey) || initialExample;
    setSelectedExample(example.key);
    setRequestJson(prettyJson(example.value));
    setResponse(null);
    setError('');
  }

  async function generateToken() {
    setLoading(true);
    setError('');
    setResponse(null);

    if (!parsedRequest) {
      setLoading(false);
      setError('Request JSON is invalid.');
      return;
    }

    try {
      const result = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsedRequest),
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
          <span>Example</span>
          <select value={selectedExample} onChange={(event) => handleExampleChange(event.target.value)}>
            {tokenExampleGroups.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.options.map((example) => (
                  <option key={example.key} value={example.key}>{example.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
      </div>

      <div className={styles.editors}>
        <label className={styles.editor}>
          <span>Request JSON</span>
          <textarea value={requestJson} onChange={(event) => setRequestJson(event.target.value)} spellCheck="false" />
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
          <div className={styles.panelHeader}>Response</div>
          <pre>{response ? prettyJson(response) : 'No response yet'}</pre>
        </div>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>Decoded Header</div>
          <pre>{decoded.header ? prettyJson(decoded.header) : 'No token yet'}</pre>
        </div>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>Decoded Body</div>
          <pre>{decoded.body ? prettyJson(decoded.body) : 'No token yet'}</pre>
        </div>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>Signature</div>
          <pre>{token ? (decoded.signature || '(empty signature segment)') : 'No token yet'}</pre>
        </div>
      </div>
    </section>
  );
}
