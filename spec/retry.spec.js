import retry from "../src/retry.js"
import {TimeoutControl} from "../src/timeout.js"
import wait from "../src/wait.js"

describe("retry", () => {
  it("retries until the callback succeeds", async () => {
    let attempts = 0

    await expectAsync(retry({tries: 3, wait: 10}, async () => {
      attempts += 1
      if (attempts < 2) throw new Error("not yet")
      return "ok"
    })).toBeResolvedTo("ok")

    expect(attempts).toBe(2)
  })

  it("throws the last error when tries are exhausted", async () => {
    let attempts = 0

    await expectAsync(retry({tries: 2, wait: 5}, async () => {
      attempts += 1
      throw new Error("nope")
    })).toBeRejectedWithError("nope")

    expect(attempts).toBe(2)
  })

  it("honors timeout for each attempt", async () => {
    await expectAsync(retry({tries: 1, timeout: 30}, async () => {
      await wait(50)
      return "slow"
    })).toBeRejectedWithError(/Timeout while trying/)
  })

  it("passes custom timeout error messages to timeout", async () => {
    await expectAsync(retry({tries: 1, timeout: 30, timeoutErrorMessage: "custom timeout"}, async () => {
      await wait(50)
      return "slow"
    })).toBeRejectedWithError("custom timeout")
  })

  it("waits between retries", async () => {
    const waitTime = 30
    /** @type {number[]} */
    const attemptTimes = []

    await expectAsync(retry({tries: 3, wait: waitTime}, async () => {
      attemptTimes.push(performance.now())
      if (attemptTimes.length < 3) throw new Error("nope")
      return "ok"
    })).toBeResolvedTo("ok")

    expect(attemptTimes).toHaveSize(3)
    expect(attemptTimes[1] - attemptTimes[0]).toBeGreaterThanOrEqual(waitTime)
    expect(attemptTimes[2] - attemptTimes[1]).toBeGreaterThanOrEqual(waitTime)
  })

  it("passes a TimeoutControl to the callback when a timeout is set", async () => {
    let received

    await retry({tries: 1, timeout: 100}, ({control}) => {
      received = control
      return "ok"
    })

    expect(received).toBeInstanceOf(TimeoutControl)
  })

  it("lets the callback bail via control.check() once the timeout is exceeded", async () => {
    let checked = false

    await expectAsync(retry({tries: 1, timeout: 20}, ({control}) => {
      const deadline = Date.now() + 40

      // Keep the event loop busy past the timeout so control.check() is the thing that throws.
      while (Date.now() < deadline) { /* busy wait */ }

      checked = true
      control.check()

      return "unreached"
    })).toBeRejectedWithError(/Timeout while trying/)

    expect(checked).toBe(true)
  })

  it("reports control.timedOut as true after the deadline passes", async () => {
    let captured

    await retry({tries: 1, timeout: 40}, ({control}) => {
      captured = control
      return "ok"
    })

    expect(captured.timedOut).toBe(false)

    await wait(60)

    expect(captured.timedOut).toBe(true)
  })
})
