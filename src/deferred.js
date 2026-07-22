// @ts-check

/**
 * @template T
 * @typedef {object} Deferred
 * @property {Promise<T>} promise - Promise controlled by the exposed resolver functions.
 * @property {(reason?: unknown) => void} reject - Rejects the promise.
 * @property {(value: T | PromiseLike<T>) => void} resolve - Resolves the promise or adopts another promise's state.
 */

/**
 * Creates a promise with resolver functions that can be called outside its executor.
 * @template [T=void]
 * @returns {Deferred<T>} The promise and its resolver functions.
 */
export default function deferred() {
  /** @type {Deferred<T>["resolve"] | undefined} */
  let resolve
  /** @type {Deferred<T>["reject"] | undefined} */
  let reject
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })

  if (!resolve || !reject) throw new Error("Deferred promise resolvers were not initialized")

  return {promise, reject, resolve}
}
