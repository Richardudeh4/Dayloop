/** Web build: localStorage (the web view only needs light persistence). */
export const kv = {
  get: (key: string) => (typeof localStorage === 'undefined' ? null : localStorage.getItem(key)),
  set: (key: string, value: string) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  },
};
