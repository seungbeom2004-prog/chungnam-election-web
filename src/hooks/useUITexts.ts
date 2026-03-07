"use client";

import { useState, useEffect } from "react";
import { type UITexts, DEFAULT_UI_TEXTS } from "@/lib/ui-texts";

let cache: UITexts | null = null;
let fetchPromise: Promise<UITexts> | null = null;

async function fetchUITexts(): Promise<UITexts> {
  if (cache) return cache;
  if (fetchPromise) return fetchPromise;
  fetchPromise = fetch("/api/site-texts")
    .then((r) => r.json())
    .then((json) => {
      cache = json.data ?? DEFAULT_UI_TEXTS;
      return cache!;
    })
    .catch(() => DEFAULT_UI_TEXTS);
  return fetchPromise;
}

/** Returns the site-wide UI text overrides set by the admin. Falls back
 *  to DEFAULT_UI_TEXTS instantly and updates once the fetch resolves. */
export function useUITexts(): UITexts {
  const [texts, setTexts] = useState<UITexts>(cache ?? DEFAULT_UI_TEXTS);

  useEffect(() => {
    if (cache) { setTexts(cache); return; }
    fetchUITexts().then(setTexts);
  }, []);

  return texts;
}

/** Call this to invalidate the client-side cache (e.g. after admin saves). */
export function invalidateUITextsCache() {
  cache = null;
  fetchPromise = null;
}
