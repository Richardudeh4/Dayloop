import Storage from 'expo-sqlite/kv-store';

/** Small synchronous key-value store. SQLite-backed on phones. */
export const kv = {
  get: (key: string) => Storage.getItemSync(key),
  set: (key: string, value: string) => Storage.setItemSync(key, value),
};
