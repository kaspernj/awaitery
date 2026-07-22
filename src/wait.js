// @ts-check

/**
 * @typedef {object} WaitOptions
 * @property {AbortSignal} [signal] - Cancels the wait. When it aborts, the returned promise rejects with `signal.reason` (the platform's `AbortError` DOMException when aborted without an explicit reason).
 */

/**
 * Wait for a specified time, optionally cancellable through an AbortSignal.
 * @param {number} time - The time to wait in milliseconds.
 * @param {WaitOptions} [options] - Optional settings, such as an AbortSignal to cancel the wait.
 * @returns {Promise<void>} Resolves once the time has elapsed, or rejects with `signal.reason` if cancelled.
 */
export default async function wait(time, options = {}) {
  const {signal} = options

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason)

      return
    }

    /** @type {(() => void) | undefined} */
    let onAbort

    const timeoutId = setTimeout(() => {
      if (signal && onAbort) signal.removeEventListener("abort", onAbort)

      resolve()
    }, time)

    if (signal) {
      onAbort = () => {
        clearTimeout(timeoutId)
        if (onAbort) signal.removeEventListener("abort", onAbort)

        reject(signal.reason)
      }

      signal.addEventListener("abort", onAbort)
    }
  })
}
