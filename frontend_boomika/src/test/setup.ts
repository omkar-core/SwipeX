import '@testing-library/jest-dom/vitest';

// Polyfill window.matchMedia if undefined
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// Polyfill scrollTo
if (typeof window !== 'undefined' && !window.scrollTo) {
  window.scrollTo = () => {};
}
