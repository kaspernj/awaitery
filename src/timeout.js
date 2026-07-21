// @ts-check

export class TimeoutError extends Error {}

/**
 * Cooperative cancellation handle passed to the timeout callback. Lets the callback
 * observe and react to the timeout firing between async operations.
 */
export class TimeoutControl {
  /**
   * @param {AbortSignal} signal - Aborted when the timeout fires.
   * @param {number} deadline - Date.now() timestamp when the timeout expires.
   */
  constructor(signal, deadline) {
    /**
     * An AbortSignal that is aborted when the timeout fires. Pass to fetch(), setTimeout, streams, etc.
     * @type {AbortSignal}
     */
    this.signal = signal

    /** @type {number} */
    this._deadline = deadline
  }

  /** Throws TimeoutError if the timeout has fired. Call this between async operations to bail early. */
  check() {
    this.signal.throwIfAborted()
  }

  /**
   * True if the timeout has already fired.
   * @returns {boolean} Whether the timeout has fired.
   */
  get timedOut() {
    return this.signal.aborted
  }

  /**
   * Milliseconds remaining until the deadline, or 0 if already past.
   * @returns {number} Milliseconds remaining until the deadline.
   */
  remaining() {
    return Math.max(0, this._deadline - Date.now())
  }
}

/**
 * @typedef {object} TimeoutArgs
 * @property {number} [timeout] - The timeout in milliseconds (default: 5000).
 * @property {string} [errorMessage] - The error message when timing out.
 */

/**
 * Runs a callback with a timeout.
 * @template T
 * @overload
 * @param {(control: TimeoutControl) => (T | Promise<T>)} callback - The callback to run.
 * @returns {Promise<T>} Resolves with the callback result.
 */
/**
 * Runs a callback with a timeout.
 * @template T
 * @overload
 * @param {TimeoutArgs} args - The arguments.
 * @param {(control: TimeoutControl) => (T | Promise<T>)} callback - The callback to run.
 * @returns {Promise<T>} Resolves with the callback result.
 */
/**
 * Runs a callback with a timeout.
 * @template T
 * @param {TimeoutArgs | ((control: TimeoutControl) => (T | Promise<T>))} arg1 - The arguments or the callback.
 * @param {(control: TimeoutControl) => (T | Promise<T>)} [arg2] - The callback when arguments are provided.
 * @returns {Promise<T>} Resolves with the callback result.
 */
export default async function timeout(arg1, arg2) {
  /** @type {TimeoutArgs | undefined} */
  let args

  /** @type {((control: TimeoutControl) => (T | Promise<T>)) | undefined} */
  let callback

  if (typeof arg1 == "function" && arg2 === undefined) {
    args = {timeout: 5000}
    callback = arg1
  } else if (typeof arg1 == "object" && typeof arg2 == "function") {
    args = arg1
    callback = arg2
  }

  if (callback == undefined) throw new Error("Somehow callback is undefined")
  if (args == null || typeof args !== "object") throw new Error("Somehow args isn't an object")

  const {timeout: timeoutNumber = 5000, errorMessage = "Timeout while trying", ...restArgs} = args
  const restArgsKeys = Object.keys(restArgs)

  if (restArgsKeys.length > 0) throw new Error(`Unknown arguments given to timeout: ${restArgsKeys.join(", ")}`)

  const controller = new AbortController()
  const control = new TimeoutControl(controller.signal, Date.now() + timeoutNumber)

  let timeoutId
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const timeoutError = new TimeoutError(errorMessage)

      controller.abort(timeoutError)
      reject(timeoutError)
    }, timeoutNumber)
  })

  try {
    return await Promise.race([Promise.resolve().then(() => callback(control)), timeoutPromise])
  } finally {
    clearTimeout(timeoutId)
  }
}
