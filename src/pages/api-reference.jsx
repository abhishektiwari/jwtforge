import React, { useEffect, useMemo } from 'react';

function getApiBaseUrl() {
  if (typeof window === 'undefined') {
    return '';
  }

  const isLocalDocs =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  if (isLocalDocs && window.location.port !== '8787') {
    return 'http://localhost:8787';
  }

  return '';
}

export default function ApiReference() {
  const apiBaseUrl = useMemo(getApiBaseUrl, []);
  const swaggerUrl = `${apiBaseUrl}/swagger`;

  useEffect(() => {
    window.location.replace(swaggerUrl);
  }, [swaggerUrl]);

  return null;
}
