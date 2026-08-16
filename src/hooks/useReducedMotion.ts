'use client'

import { useSyncExternalStore } from 'react'

/**
 * The single gate for every animation in the project (R8).
 *
 * `useSyncExternalStore` is the right primitive here: a media query is an
 * external system React subscribes to, not state React owns. It also takes an
 * explicit server snapshot, which removes the hydration mismatch that reading
 * the query during render would otherwise cause.
 */

const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(onStoreChange: () => void): () => void {
  const query = window.matchMedia(QUERY)
  query.addEventListener('change', onStoreChange)
  return () => query.removeEventListener('change', onStoreChange)
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches
}

/**
 * The server cannot know the visitor's preference, so it assumes motion is
 * allowed. The real value applies on hydration, before anything has moved.
 */
function getServerSnapshot(): boolean {
  return false
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
