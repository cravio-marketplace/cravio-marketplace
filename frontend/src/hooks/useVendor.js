// Centralized vendor state. Persists the access token (so a refresh keeps the
// user signed in) and exposes refreshVendor() to re-fetch the row from the API
// after profile edits, status toggles, etc.

import { useEffect, useState, useCallback } from 'react';
import API from '../api';

const TOKEN_KEY = 'cravio_token';
const VENDOR_KEY = 'cravio_vendor';

function readVendor() {
  try {
    const raw = localStorage.getItem(VENDOR_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function readToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function useVendor() {
  const [vendor, setVendorState] = useState(() => readVendor());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const setVendor = useCallback((next) => {
    setVendorState(next);
    if (next) {
      localStorage.setItem(VENDOR_KEY, JSON.stringify(next));
    } else {
      localStorage.removeItem(VENDOR_KEY);
    }
  }, []);

  const setToken = useCallback((token) => {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  }, []);

  const refreshVendor = useCallback(async () => {
    if (!readToken()) return null;
    setLoading(true);
    setError(null);
    try {
      const res = await API.get('/vendor/me');
      const data = res.data?.data ?? res.data;
      setVendor(data);
      return data;
    } catch (e) {
      setError(e);
      // If 401/403 the token is bad; clear.
      if (e?.response?.status === 401 || e?.response?.status === 403) {
        setVendor(null);
        setToken(null);
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, [setVendor, setToken]);

  // Re-hydrate on first mount
  useEffect(() => {
    if (readToken() && !vendor) {
      refreshVendor();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = useCallback(() => {
    setToken(null);
    setVendor(null);
  }, [setToken, setVendor]);

  return { vendor, setVendor, setToken, refreshVendor, signOut, loading, error };
}

export function getToken() {
  return readToken();
}
