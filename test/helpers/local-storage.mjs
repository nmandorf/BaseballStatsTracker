export function installLocalStorage() {
  const store = new Map();
  const previousWindow = global.window;

  global.window = {
    localStorage: {
      getItem: (key) => store.get(key) ?? null,
      removeItem: (key) => store.delete(key),
      setItem: (key, value) => store.set(key, value),
    },
    addEventListener: () => {},
    dispatchEvent: () => true,
    removeEventListener: () => {},
  };

  return () => {
    if (previousWindow === undefined) {
      delete global.window;
      return;
    }

    global.window = previousWindow;
  };
}
