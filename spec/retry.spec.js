import retry from "../src/retry.js"
import {TimeoutControl, TimeoutError} from "../src/timeout.js"
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

  it("honors an explicit zero timeout", async () => {
    await expectAsync(retry({tries: 1, timeout: 0}, async ({control}) => {
      if (!control) return "no timeout"

      await wait(10)
      return "slow"
    })).toBeRejectedWithError(TimeoutError, /Timeout while trying/)
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
      attemptTimes.push(Date.now())
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

  it("rethrows the current error without another attempt or delay when shouldRetry returns false", async () => {
    let attempts = 0
    const start = Date.now()

    await expectAsync(retry({tries: 5, wait: 1000, shouldRetry: () => false}, async () => {
      attempts += 1
      throw new Error(`fail ${attempts}`)
    })).toBeRejectedWithError("fail 1")

    expect(attempts).toBe(1)
    expect(Date.now() - start).toBeLessThan(500)
  })

  it("keeps retrying while shouldRetry returns true", async () => {
    let attempts = 0

    await expectAsync(retry({tries: 5, wait: 5, shouldRetry: () => true}, async () => {
      attempts += 1
      if (attempts < 3) throw new Error("not yet")

      return "ok"
    })).toBeResolvedTo("ok")

    expect(attempts).toBe(3)
  })

  it("awaits an async shouldRetry result", async () => {
    let attempts = 0

    await expectAsync(retry({tries: 3, wait: 5, shouldRetry: async () => false}, async () => {
      attempts += 1
      throw new Error("boom")
    })).toBeRejectedWithError("boom")

    expect(attempts).toBe(1)
  })

  it("passes {error, tryNumber, tries} to shouldRetry", async () => {
    /** @type {Array<{error: unknown, tryNumber: number, tries: number}>} */
    const calls = []
    let attempts = 0

    await retry(
      {
        tries: 3,
        wait: 5,
        shouldRetry: (args) => {
          calls.push(args)

          return true
        }
      },
      async () => {
        attempts += 1
        if (attempts < 2) throw new Error(`fail ${attempts}`)

        return "ok"
      }
    )

    expect(calls).toHaveSize(1)
    expect(calls[0].tryNumber).toBe(1)
    expect(calls[0].tries).toBe(3)
    expect(calls[0].error).toBeInstanceOf(Error)
  })

  it("propagates an error thrown by shouldRetry", async () => {
    let attempts = 0

    await expectAsync(retry({tries: 3, wait: 5, shouldRetry: () => { throw new Error("shouldRetry exploded") }}, async () => {
      attempts += 1
      throw new Error("original")
    })).toBeRejectedWithError("shouldRetry exploded")

    expect(attempts).toBe(1)
  })

  it("makes no attempt and rejects with signal.reason when already aborted", async () => {
    const controller = new AbortController()
    const reason = new Error("cancelled")

    controller.abort(reason)

    let attempts = 0
    const caught = await retry({tries: 3, wait: 5, signal: controller.signal}, async () => {
      attempts += 1

      return "ok"
    }).catch((error) => error)

    expect(caught).toBe(reason)
    expect(attempts).toBe(0)
  })

  it("cancels an in-progress retry delay and makes no further attempt", async () => {
    const controller = new AbortController()
    const reason = new Error("cancelled")
    let attempts = 0

    const promise = retry({tries: 3, wait: 1000, signal: controller.signal}, async () => {
      attempts += 1
      throw new Error("nope")
    })

    setTimeout(() => controller.abort(reason), 20)

    const caught = await promise.catch((error) => error)

    expect(caught).toBe(reason)
    expect(attempts).toBe(1)
  })

  it("passes the external signal to a no-timeout callback so it can cancel cooperatively", async () => {
    const controller = new AbortController()
    const reason = new Error("cancelled")

    // Cooperative: the callback waits on the very signal it was handed and rejects with its reason.
    const promise = retry({tries: 3, signal: controller.signal}, async ({signal}) => {
      await wait(1000, {signal})

      return "unreached"
    })

    setTimeout(() => controller.abort(reason), 20)

    const caught = await promise.catch((error) => error)

    expect(caught).toBe(reason)
  })

  it("lets cancellation win over a non-cooperative no-timeout callback that later resolves", async () => {
    const controller = new AbortController()
    const reason = new Error("cancelled")

    // Non-cooperative: ignores cancellation and resolves successfully after the abort fires.
    const promise = retry({tries: 3, signal: controller.signal}, async () => {
      await wait(60)

      return "stale success"
    })

    setTimeout(() => controller.abort(reason), 20)

    const caught = await promise.catch((error) => error)

    expect(caught).toBe(reason)
  })

  it("passes the external signal to shouldRetry so the predicate can cooperate", async () => {
    const controller = new AbortController()
    let receivedSignal
    let attempts = 0

    await retry(
      {
        tries: 3,
        wait: 5,
        signal: controller.signal,
        shouldRetry: ({signal}) => {
          receivedSignal = signal

          return false
        }
      },
      async () => {
        attempts += 1
        throw new Error("nope")
      }
    ).catch(() => {})

    expect(receivedSignal).toBe(controller.signal)
    expect(attempts).toBe(1)
  })

  it("lets cancellation during an async shouldRetry win over rethrowing the attempt error", async () => {
    const controller = new AbortController()
    const reason = new Error("cancelled")
    let attempts = 0

    const promise = retry(
      {
        tries: 3,
        wait: 5,
        signal: controller.signal,
        shouldRetry: async () => {
          // Abort mid-decision; the pending cancellation must win once this settles.
          controller.abort(reason)

          return false
        }
      },
      async () => {
        attempts += 1
        throw new Error("original")
      }
    )

    const caught = await promise.catch((error) => error)

    expect(caught).toBe(reason)
    expect(attempts).toBe(1)
  })

  it("composes the external signal into the per-attempt TimeoutControl", async () => {
    const controller = new AbortController()
    const reason = new Error("cancelled")
    let captured
    let attempts = 0

    const promise = retry({tries: 3, timeout: 1000, wait: 0, signal: controller.signal}, async ({control}) => {
      attempts += 1
      captured = control
      await wait(1000, {signal: control.signal})

      return "unreached"
    })

    setTimeout(() => controller.abort(reason), 20)

    const caught = await promise.catch((error) => error)

    expect(caught).toBe(reason)
    expect(captured.signal.aborted).toBe(true)
    expect(captured.signal.reason).toBe(reason)
    expect(attempts).toBe(1)
  })
})
