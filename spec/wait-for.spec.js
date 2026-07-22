import {TimeoutControl, TimeoutError} from "../src/timeout.js"
import wait from "../src/wait.js"
import waitFor from "../src/wait-for.js"

describe("waitFor", () => {
  it("retries until the callback stops throwing", async () => {
    let attempts = 0

    await expectAsync(waitFor({timeout: 200, wait: 10}, () => {
      attempts += 1
      if (attempts < 3) throw new Error(`fail ${attempts}`)
      return "ready"
    })).toBeResolvedTo("ready")

    expect(attempts).toBe(3)
  })

  it("rethrows the last error when the timeout is reached", async () => {
    await expectAsync(waitFor({timeout: 40, wait: 10}, () => {
      throw new Error("still failing")
    })).toBeRejectedWithError("still failing")
  })

  it("throws on unknown options", async () => {
    await expectAsync(waitFor({nope: true}, async () => {
      return "ignored"
    })).toBeRejectedWithError(/Unknown arguments given to waitFor: nope/)
  })

  it("passes a TimeoutControl to the callback", async () => {
    let received

    await waitFor({timeout: 100, wait: 10}, ({control}) => {
      received = control
      return "ready"
    })

    expect(received).toBeInstanceOf(TimeoutControl)
  })

  it("throws from control.check() when work runs past the deadline", async () => {
    await expectAsync(waitFor({timeout: 30, wait: 5}, async ({control}) => {
      // Sleep past the deadline, then let control.check() surface the timeout.
      await wait(50)
      control.check()

      return "unreached"
    })).toBeRejectedWithError(TimeoutError, /Timeout while waiting/)
  })

  it("reports control.timedOut as true after the deadline passes", async () => {
    let captured

    await waitFor({timeout: 40, wait: 5}, ({control}) => {
      captured = control
      return "ready"
    })

    await wait(60)

    expect(captured.timedOut).toBe(true)
  })

  it("reports a positive control.remaining() before the deadline", async () => {
    let remaining

    await waitFor({timeout: 500, wait: 5}, ({control}) => {
      remaining = control.remaining()
      return "ready"
    })

    expect(remaining).toBeGreaterThan(0)
  })

  it("makes no callback and rejects with signal.reason when already aborted", async () => {
    const controller = new AbortController()
    const reason = new Error("cancelled")

    controller.abort(reason)

    let callbackRan = false
    const caught = await waitFor({timeout: 500, wait: 10, signal: controller.signal}, () => {
      callbackRan = true

      return "ready"
    }).catch((error) => error)

    expect(caught).toBe(reason)
    expect(callbackRan).toBe(false)
  })

  it("cancels an in-progress retry delay and starts no further callback", async () => {
    const controller = new AbortController()
    const reason = new Error("cancelled")
    let attempts = 0

    const promise = waitFor({timeout: 5000, wait: 1000, signal: controller.signal}, () => {
      attempts += 1
      throw new Error("still failing")
    })

    setTimeout(() => controller.abort(reason), 20)

    const caught = await promise.catch((error) => error)

    expect(caught).toBe(reason)
    expect(attempts).toBe(1)
  })

  it("reflects external cancellation in control.signal so the callback can observe it", async () => {
    const controller = new AbortController()
    const reason = new Error("cancelled")
    let captured

    const promise = waitFor({timeout: 5000, wait: 10, signal: controller.signal}, async ({control}) => {
      captured = control
      await wait(1000, {signal: control.signal})

      return "unreached"
    })

    setTimeout(() => controller.abort(reason), 20)

    const caught = await promise.catch((error) => error)

    expect(caught).toBe(reason)
    expect(captured.signal.aborted).toBe(true)
    expect(captured.signal.reason).toBe(reason)
  })

  it("rejects with signal.reason when an external abort fires during a callback that later resolves", async () => {
    const controller = new AbortController()
    const reason = new Error("cancelled")

    // The callback ignores its signal and resolves successfully after the external abort.
    const promise = waitFor({timeout: 5000, wait: 10, signal: controller.signal}, async () => {
      await wait(60)

      return "stale success"
    })

    setTimeout(() => controller.abort(reason), 20)

    const caught = await promise.catch((error) => error)

    expect(caught).toBe(reason)
  })

  it("rejects with TimeoutError when the deadline expires during a callback that later resolves", async () => {
    // The callback ignores the deadline and resolves successfully after it has already passed.
    const promise = waitFor({timeout: 30, wait: 10}, async () => {
      await wait(60)

      return "stale success"
    })

    await expectAsync(promise).toBeRejectedWithError(TimeoutError, /Timeout while waiting/)
  })

  it("clears the deadline timer on success so control.signal never aborts", async () => {
    let captured

    await waitFor({timeout: 40, wait: 5}, ({control}) => {
      captured = control

      return "ready"
    })

    // Wait past the original deadline; a leaked timer would abort here.
    await wait(60)

    expect(captured.signal.aborted).toBe(false)
  })

  it("removes the external abort listener on success", async () => {
    const controller = new AbortController()
    let captured

    await waitFor({timeout: 500, wait: 5, signal: controller.signal}, ({control}) => {
      captured = control

      return "ready"
    })

    // The listener must be gone, so aborting the external signal must not abort control.signal.
    controller.abort(new Error("late"))

    expect(captured.signal.aborted).toBe(false)
  })
})
