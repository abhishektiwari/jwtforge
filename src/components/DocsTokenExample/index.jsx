import React, { useMemo, useState } from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import CodeBlock from '@theme/CodeBlock';
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

function prettyJson(value) {
  return JSON.stringify(value, null, 2);
}

function JsonOutput({ value, emptyText }) {
  if (!value) {
    return <pre className={styles.emptyOutput}>{emptyText}</pre>;
  }

  return (
    <CodeBlock language="json" className={styles.codeBlock}>
      {prettyJson(value)}
    </CodeBlock>
  );
}

function decodeJwtPart(value) {
  if (!value) return null;
  try {
    let base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const remainder = base64.length % 4;
    if (remainder === 2) base64 += '==';
    if (remainder === 3) base64 += '=';
    const bytes = Uint8Array.from(atob(base64), character => character.charCodeAt(0));
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    return null;
  }
}

function decodeJoseToken(token) {
  if (!token) {
    return { header: null, body: null, signature: '' };
  }

  if (typeof token === 'string') {
    const [header, body, signature = ''] = token.split('.');
    return {
      header: decodeJwtPart(header),
      body: decodeJwtPart(body),
      signature,
    };
  }

  if (typeof token === 'object' && token.payload) {
    const signatures = Array.isArray(token.signatures) ? token.signatures : [token];
    const firstSignature = signatures[0] || {};
    return {
      header: Array.isArray(token.signatures)
        ? signatures.map((entry, index) => ({ signature_index: index, protected: decodeJwtPart(entry.protected), unprotected: entry.header || null }))
        : decodeJwtPart(firstSignature.protected),
      body: decodeJwtPart(token.payload),
      signature: Array.isArray(token.signatures)
        ? signatures.map((entry, index) => ({
            index,
            header: entry.header || null,
            signature: entry.signature || '',
          }))
        : token.signature || '',
    };
  }

  return { header: null, body: null, signature: '' };
}

export default function DocsTokenExample({ request, endpoint: endpointPath = '/token' }) {
  const { siteConfig } = useDocusaurusContext();
  const configuredApiBaseUrl = siteConfig.customFields?.jwtforgeApiBaseUrl;
  const baseUrl = useMemo(
    () => getApiBaseUrl(configuredApiBaseUrl),
    [configuredApiBaseUrl]
  );
  const endpoint = `${baseUrl.replace(/\/$/, '')}${endpointPath}`;
  const [response, setResponse] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedResult, setSelectedResult] = useState(0);
  const token = response?.results?.[selectedResult]?.token ?? response?.access_token ?? response?.id_token ?? '';
  const curl = `curl -X POST ${endpoint} \\
  -H "Content-Type: application/json" \\
  -d '${prettyJson(request)}'`;
  const decoded = useMemo(() => decodeJoseToken(token), [token]);
  const decodedOutput = token
    ? {
        header: decoded.header,
        body: decoded.body,
        signature: decoded.signature,
      }
    : null;

  async function generateToken() {
    setLoading(true);
    setError('');
    setResponse(null);
    setSelectedResult(0);

    try {
      const result = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
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
    <div className={styles.example}>
      <div className={styles.header}>
        <span>POST <code>{endpointPath}</code></span>
        <div className={styles.actions}>
          <button className={styles.button} onClick={generateToken} disabled={loading}>
            {loading ? 'Generating...' : endpointPath === '/mutation' ? 'Generate mutations' : 'Generate token'}
          </button>
          <button className={styles.secondaryButton} onClick={copyCurl}>
            Copy curl
          </button>
        </div>
      </div>
      <div className={styles.grid}>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>Request</div>
          <JsonOutput value={request} emptyText="No request" />
        </div>
        <div className={styles.panel}>
          <div className={styles.panelHeader}>Response</div>
          <JsonOutput value={response} emptyText="No response yet" />
        </div>
      </div>
      <div className={styles.decodedPanel}>
        <div className={styles.panelHeader}>Decoded token</div>
        {response?.results && (
          <label className={styles.resultSelector}>
            <span>Mutation result</span>
            <select value={selectedResult} onChange={event => setSelectedResult(Number(event.target.value))}>
              {response.results.map((result, index) => <option key={result.id} value={index}>{result.id}</option>)}
            </select>
          </label>
        )}
        <JsonOutput value={decodedOutput} emptyText="No token yet" />
      </div>
      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
}
