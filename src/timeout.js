// @ts-check

export class TimeoutError extends Error {}

/**
 * Attaches the call-site origin (captured when the timeout was armed) to a fired
 * TimeoutError. The error is constructed inside a setTimeout callback or thrown
 * from TimeoutControl.check(); neither runs in the caller's async context, so its
 * own stack is only timer frames. Recording the origin as `.cause` and appending
 * its frames to `.stack` makes the fired error diagnosable without changing how it
 * is thrown.
 * @param {Error} timeoutError - The fired TimeoutError to enrich.
 * @param {Error | undefined} origin - The Error captured at the timeout() call site.
 */
function attachTimeoutOrigin(timeoutError, origin) {
  if (!origin || typeof origin !== "object") return

  timeoutError.cause = origin

  if (typeof origin.stack === "string") {
    // Keep only the origin's frames (drop its own "Error: ..." message line) and
    // append them so reporters that serialize `.stack` see the caller context.
    const originFrames = origin.stack.replace(/^Error[^\n]*\n/, "")

    timeoutError.stack = `${timeoutError.stack}\n${originFrames}`
  }
}

/**
 * Cooperative cancellation handle passed to the timeout callback. Lets the callback
 * observe and react to the timeout firing between async operations.
 */
export class TimeoutControl {
  /**
   * @param {AbortSignal} signal - Aborted when the timeout fires.
   * @param {number} deadline - Date.now() timestamp when the timeout expires.
   * @param {string} errorMessage - The error message used when the deadline has passed but the signal hasn't aborted yet.
   * @param {Error} [origin] - Call-site Error captured when the timeout was armed, attached to any TimeoutError this control throws.
   */
  constructor(signal, deadline, errorMessage, origin) {
    /**
     * An AbortSignal that is aborted when the timeout fires. Pass to fetch(), setTimeout, streams, etc.
     * @type {AbortSignal}
     */
    this.signal = signal

    /** @type {number} */
    this._deadline = deadline

    /** @type {string} */
    this._errorMessage = errorMessage

    /** @type {Error | undefined} */
    this.origin = origin
  }

  /** Throws if the timeout fired or the composed signal aborted. Call this between async operations to bail early. */
  check() {
    // Honor any abort of the composed signal first — an external signal may abort it well before the
    // deadline, and cancellation must win immediately rather than waiting for the deadline.
    this.signal.throwIfAborted()

    if (Date.now() >= this._deadline) {
      // The deadline passed but the timer callback hasn't aborted the signal yet (synchronous work
      // starved the event loop), so surface our own TimeoutError.
      const timeoutError = new TimeoutError(this._errorMessage)

      attachTimeoutOrigin(timeoutError, this.origin)

      throw timeoutError
    }
  }

  /**
   * True if the timeout has already fired.
   * @returns {boolean} Whether the timeout has fired.
   */
  get timedOut() {
    return Date.now() >= this._deadline
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
 * @property {AbortSignal} [signal] - External AbortSignal composed with the deadline. When it aborts, the run rejects with `signal.reason` and `control.signal` aborts with that same reason.
 */

/**
 * Runs a callback with a timeout.
 * @template T
 * @overload
 * @param {(args: {control: TimeoutControl}) => (T | Promise<T>)} callback - The callback to run.
 * @returns {Promise<T>} Resolves with the callback result.
 */
/**
 * Runs a callback with a timeout.
 * @template T
 * @overload
 * @param {TimeoutArgs} args - The arguments.
 * @param {(args: {control: TimeoutControl}) => (T | Promise<T>)} callback - The callback to run.
 * @returns {Promise<T>} Resolves with the callback result.
 */
/**
 * Runs a callback with a timeout.
 * @template T
 * @param {TimeoutArgs | ((args: {control: TimeoutControl}) => (T | Promise<T>))} arg1 - The arguments or the callback.
 * @param {(args: {control: TimeoutControl}) => (T | Promise<T>)} [arg2] - The callback when arguments are provided.
 * @returns {Promise<T>} Resolves with the callback result.
 */
export default async function timeout(arg1, arg2) {
  // Capture the call site now, while still running synchronously in the caller's
  // context (before the timer fires). Node's async stack traces also record the
  // awaited caller chain on this Error. The TimeoutError created later inside the
  // setTimeout callback has none of that context, so without this capture the
  // fired error is un-diagnosable.
  const origin = new Error()

  /** @type {TimeoutArgs | undefined} */
  let args

  /** @type {((args: {control: TimeoutControl}) => (T | Promise<T>)) | undefined} */
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

  const {timeout: timeoutNumber = 5000, errorMessage = "Timeout while trying", signal, ...restArgs} = args
  const restArgsKeys = Object.keys(restArgs)

  if (restArgsKeys.length > 0) throw new Error(`Unknown arguments given to timeout: ${restArgsKeys.join(", ")}`)

  const controller = new AbortController()
  const control = new TimeoutControl(controller.signal, Date.now() + timeoutNumber, errorMessage, origin)

  // If the external signal already aborted, cancel before starting the callback or timer.
  if (signal?.aborted) {
    controller.abort(signal.reason)

    throw signal.reason
  }

  let timeoutId
  /** @type {(() => void) | undefined} */
  let onExternalAbort

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const timeoutError = new TimeoutError(errorMessage)

      attachTimeoutOrigin(timeoutError, origin)
      controller.abort(timeoutError)
      reject(timeoutError)
    }, timeoutNumber)

    if (signal) {
      onExternalAbort = () => {
        controller.abort(signal.reason)
        reject(signal.reason)
      }

      signal.addEventListener("abort", onExternalAbort)
    }
  })

  try {
    return await Promise.race([Promise.resolve().then(() => callback({control})), timeoutPromise])
  } finally {
    clearTimeout(timeoutId)
    if (signal && onExternalAbort) signal.removeEventListener("abort", onExternalAbort)
  }
}
