/**
 * Fora do ambiente de Artifacts do Claude.ai não existe `window.storage`.
 * Este shim expõe a mesma interface (get/set/delete assíncronos),
 * mas persiste os dados no localStorage do navegador.
 */
const storage = {
  async get(key) {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return null;
      return { key, value: raw, shared: false };
    } catch {
      return null;
    }
  },
  async set(key, value) {
    try {
      window.localStorage.setItem(key, value);
      return { key, value, shared: false };
    } catch {
      return null;
    }
  },
  async delete(key) {
    try {
      window.localStorage.removeItem(key);
      return { key, deleted: true, shared: false };
    } catch {
      return null;
    }
  },
};

export default storage;
