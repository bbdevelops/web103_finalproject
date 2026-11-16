const locks = new WeakMap();
export const registerActionLock = (element, lock) => {
  locks.set(element, lock);
  return () => locks.delete(element);
};
export const beginActionLock = (element) => locks.get(element)?.begin();
export const releaseActionLock = (element) => locks.get(element)?.release();
