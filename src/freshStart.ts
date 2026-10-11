// Test deployments (built with VITE_FRESH_EACH_TAB=1): nothing is kept past
// the tab. Every store that persists reads window.localStorage, so it is
// pointed at this tab's sessionStorage instead: a reload keeps your place,
// closing the tab throws it away, and each new tab (or new tester) starts from
// the same defaults. Uploaded PDFs kept in IndexedDB go with each new tab.
// Imported first in main.tsx, before any store reads its saved state.

if (import.meta.env.VITE_FRESH_EACH_TAB === '1') {
  try {
    const tab = window.sessionStorage
    if (!tab.getItem('mochee-tab')) {
      tab.setItem('mochee-tab', '1')
      window.indexedDB?.deleteDatabase('tutor-files') // fileStore.ts
    }
    Object.defineProperty(window, 'localStorage', { configurable: true, get: () => tab })
  } catch {
    // Storage blocked (private mode, sandbox): the stores already fall back to memory.
  }
}

export {}
