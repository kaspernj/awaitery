// @ts-check

/**
 * Node fires timers on a coarsened monotonic clock and `Date.now()` only has
 * millisecond resolution, so a `wait(30)` can be measured as 29 milliseconds of
 * wall clock — on a loaded CI host at least as easily as on an idle laptop.
 * Asserting the exact requested delay as a lower bound therefore fails for a
 * reason that has nothing to do with the behaviour under test: "Expected 29 to
 * be greater than or equal 30" while the delay was awaited correctly.
 *
 * Every "the delay was really awaited" assertion allows this documented slack
 * instead, and keeps proving the stronger thing it cares about: the promise did
 * not resolve immediately.
 */
export const TIMER_MEASUREMENT_SLACK_MS = 2

/**
 * @param {number} delayMs The delay the code under test was asked to wait.
 * @returns {number} The smallest measured duration that still proves the delay ran.
 */
export function minimumTimerElapsedMs(delayMs) {
  return delayMs - TIMER_MEASUREMENT_SLACK_MS
}
