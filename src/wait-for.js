// @ts-check

import {TimeoutControl, TimeoutError} from "./timeout.js"
import wait from "./wait.js"

/**
 * @typedef {object} WaitForOptions
 * @property {number} [timeout] The timeout in milliseconds (default: 5000).
 * @property {number} [wait] The wait time in milliseconds (default: 50).
 * @property {AbortSignal} [signal] External AbortSignal composed with the deadline. When it aborts, `control.signal` aborts with `signal.reason`, retry delays are cancelled, no further callback starts, and the run rejects with that reason.
 */

/**
 * Waits for a callback to run without throwing an error and retries until the timeout is reached.
 * @template T
 * @overload
 * @param {(args: {control: TimeoutControl}) => (T | Promise<T>)} callback The callback.
 * @returns {Promise<T>} Resolves with the callback result.
 */
/**
 * Waits for a callback to run without throwing an error and retries until the timeout is reached.
 * @template T
 * @overload
 * @param {WaitForOptions} opts Options.
 * @param {(args: {control: TimeoutControl}) => (T | Promise<T>)} callback The callback.
 * @returns {Promise<T>} Resolves with the callback result.
 */
/**
 * Waits for a callback to run without throwing an error and retries until the timeout is reached.
 * @template T
 * @param {WaitForOptions | ((args: {control: TimeoutControl}) => (T | Promise<T>))} opts Options or the callback when no options are provided.
 * @param {(args: {control: TimeoutControl}) => (T | Promise<T>)} [callback] The callback.
 * @returns {Promise<T>} Resolves with the callback result.
 */
export default async function waitFor(opts, callback) {
  /** @type {WaitForOptions | undefined} */
  let options

  /** @type {((args: {control: TimeoutControl}) => (T | Promise<T>)) | undefined} */
  let resolvedCallback = callback

  if (typeof opts === "function") {
    resolvedCallback = opts
  } else {
    options = opts
  }

  if (resolvedCallback == undefined) throw new Error("Somehow callback is undefined")

  const {timeout: waitTimeout = 5000, wait: waitTime = 50, signal, ...restOpts} = options || {}
  const restOptsKeys = Object.keys(restOpts)

  if (restOptsKeys.length > 0) throw new Error(`Unknown arguments given to waitFor: ${restOptsKeys.join(", ")}`)
  const startTime = Date.now()
  const endTime = startTime + waitTimeout

  const controller = new AbortController()
  const control = new TimeoutControl(controller.signal, endTime, "Timeout while waiting")
  const deadlineError = new TimeoutError("Timeout while waiting")
  const timeoutId = setTimeout(() => controller.abort(deadlineError), waitTimeout)

  // Compose the external signal into control.signal so callbacks observe external cancellation too.
  /** @type {(() => void) | undefined} */
  let onExternalAbort

  if (signal) {
    if (signal.aborted) {
      controller.abort(signal.reason)
    } else {
      onExternalAbort = () => controller.abort(signal.reason)

      signal.addEventListener("abort", onExternalAbort)
    }
  }

  let lastError

  try {
    if (signal?.aborted) throw signal.reason

    while (Date.now() < endTime) {
      // Don't start a new callback after cancellation.
      if (signal?.aborted) throw signal.reason

      try {
        const result = await resolvedCallback({control})

        // The callback resolved, but it may have ignored cancellation or the deadline and resolved
        // anyway. A now-stale success must not win: external cancellation and the deadline take
        // precedence. control.check() throws the composed abort reason or a TimeoutError.
        control.check()
        if (signal?.aborted) throw signal.reason

        return result
      } catch (error) {
        control.check()
        if (signal?.aborted) throw signal.reason

        lastError = error

        if (control.timedOut) control.check()
      }
      // The composed signal bounds the delay at the deadline. A deadline between attempts keeps
      // the legacy last-error result; external cancellation still surfaces its own reason.
      try {
        await wait(waitTime, {signal: control.signal})
      } catch (error) {
        if (error === deadlineError && lastError) throw lastError

        throw error
      }
    }

    if (lastError) {
      throw lastError
    }
  } finally {
    clearTimeout(timeoutId)
    if (signal && onExternalAbort) signal.removeEventListener("abort", onExternalAbort)
  }
}
