import timeout, {TimeoutControl, TimeoutError} from "../src/timeout.js"
import wait from "../src/wait.js"

describe("timeout", () => {
  it("returns the callback result when it resolves before the timeout", async () => {
    await expectAsync(timeout({timeout: 300}, async () => {
      await wait(50)
      return "done"
    })).toBeResolvedTo("done")
  })

  it("uses the default timeout when no options are provided", async () => {
    await expectAsync(timeout(async () => {
      await wait(10)
      return "done"
    })).toBeResolvedTo("done")
  })

  it("throws a TimeoutError when the timeout is exceeded", async () => {
    await expectAsync(timeout({timeout: 30}, async () => {
      await wait(60)
    })).toBeRejectedWithError(/Timeout while trying/)
  })

  it("exports TimeoutError so callers can distinguish timeout failures", async () => {
    const error = await timeout({timeout: 30}, async () => {
      await wait(60)
    }).catch((caughtError) => caughtError)

    expect(error.constructor).toBe(TimeoutError)
  })

  it("uses a custom error message when provided", async () => {
    await expectAsync(timeout({timeout: 30, errorMessage: "too slow"}, async () => {
      await wait(60)
    })).toBeRejectedWithError("too slow")
  })

  it("propagates callback errors immediately", async () => {
    await expectAsync(timeout({timeout: 300}, async () => {
      throw new Error("boom")
    })).toBeRejectedWithError("boom")
  })

  it("supports callbacks that take no arguments (backward compatibility)", async () => {
    await expectAsync(timeout({timeout: 300}, async () => "done")).toBeResolvedTo("done")
  })

  it("passes a TimeoutControl instance to the callback", async () => {
    let received

    await timeout({timeout: 300}, ({control}) => {
      received = control

      return "done"
    })

    expect(received).toBeInstanceOf(TimeoutControl)
  })

  it("check() throws a TimeoutError once the timeout has fired", async () => {
    const error = await timeout({timeout: 30}, async ({control}) => {
      await wait(60)
      control.check()

      return "done"
    }).catch((caughtError) => caughtError)

    expect(error.constructor).toBe(TimeoutError)
  })

  it("check() throws even when the event loop hasn't processed the timer yet", async () => {
    await expectAsync(timeout({timeout: 5}, async ({control}) => {
      // Busy-wait past the deadline without yielding
      const deadline = Date.now() + 10
      while (Date.now() < deadline) {
        // Intentionally spin without yielding to the event loop.
      }
      control.check()

      return "done"
    })).toBeRejectedWithError(/Timeout while trying/)
  })

  it("check() throws the external abort reason immediately when the composed signal aborted before the deadline", () => {
    const controller = new AbortController()
    const reason = new Error("cancelled")

    controller.abort(reason)

    // Substantial deadline time remains, but the composed signal is already aborted externally.
    const control = new TimeoutControl(controller.signal, Date.now() + 10000, "Timeout while trying")

    expect(() => control.check()).toThrow(reason)
  })

  it("check() does not throw when called before the timeout fires", async () => {
    await expectAsync(timeout({timeout: 300}, async ({control}) => {
      await wait(10)
      control.check()

      return "done"
    })).toBeResolvedTo("done")
  })

  it("aborts the signal when the timeout fires", async () => {
    let control

    await timeout({timeout: 30}, async ({control: givenControl}) => {
      control = givenControl
      await wait(60)
    }).catch(() => {})

    expect(control.signal.aborted).toBe(true)
  })

  it("timedOut returns true after the timeout fires", async () => {
    let control

    await timeout({timeout: 30}, async ({control: givenControl}) => {
      control = givenControl
      await wait(60)
    }).catch(() => {})

    // The race rejects right at the deadline, so wait past it before reading timedOut.
    await wait(10)

    expect(control.timedOut).toBe(true)
  })

  it("timedOut returns false before the timeout fires", async () => {
    await timeout({timeout: 300}, ({control}) => {
      expect(control.timedOut).toBe(false)
    })
  })

  it("remaining() returns a positive number before the timeout fires", async () => {
    await timeout({timeout: 300}, ({control}) => {
      expect(control.remaining()).toBeGreaterThan(0)
    })
  })

  it("remaining() returns 0 after the timeout fires", async () => {
    let control

    await timeout({timeout: 30}, async ({control: givenControl}) => {
      control = givenControl
      await wait(60)
    }).catch(() => {})

    // The race rejects right at the deadline, so wait past it before reading remaining().
    await wait(20)

    expect(control.remaining()).toBe(0)
  })

  it("rejects immediately with the external reason when the signal is already aborted", async () => {
    const controller = new AbortController()
    const reason = new Error("cancelled")

    controller.abort(reason)

    let callbackRan = false
    const caught = await timeout({timeout: 300, signal: controller.signal}, async () => {
      callbackRan = true

      return "done"
    }).catch((error) => error)

    expect(caught).toBe(reason)
    expect(callbackRan).toBe(false)
  })

  it("rejects with the external reason and aborts control.signal with it when cancelled first", async () => {
    const controller = new AbortController()
    const reason = new Error("cancelled")
    let captured

    const promise = timeout({timeout: 1000, signal: controller.signal}, async ({control}) => {
      captured = control
      await wait(1000, {signal: control.signal})

      return "done"
    })

    setTimeout(() => controller.abort(reason), 20)

    const caught = await promise.catch((error) => error)

    expect(caught).toBe(reason)
    expect(captured.signal.aborted).toBe(true)
    expect(captured.signal.reason).toBe(reason)
  })

  it("rejects with a TimeoutError when the deadline wins the race against the external signal", async () => {
    const controller = new AbortController()
    let captured

    const error = await timeout({timeout: 20, signal: controller.signal}, async ({control}) => {
      captured = control
      await wait(200)

      return "done"
    }).catch((caughtError) => caughtError)

    expect(error.constructor).toBe(TimeoutError)
    expect(captured.signal.reason.constructor).toBe(TimeoutError)
  })

  it("clears the timeout timer on success so control.signal never aborts", async () => {
    let captured

    await timeout({timeout: 30}, ({control}) => {
      captured = control

      return "done"
    })

    // Wait past the original deadline; a leaked timer would abort here.
    await wait(60)

    expect(captured.signal.aborted).toBe(false)
  })

  it("removes the external abort listener on success", async () => {
    const controller = new AbortController()
    let captured

    await timeout({timeout: 300, signal: controller.signal}, ({control}) => {
      captured = control

      return "done"
    })

    // The listener must be gone, so aborting the external signal must not abort control.signal.
    controller.abort(new Error("late"))

    expect(captured.signal.aborted).toBe(false)
  })

  it("bails out of a loop that checks check() on every iteration when the timeout fires", async () => {
    let iterations = 0

    const error = await timeout({timeout: 30}, async ({control}) => {
      for (let i = 0; i < 100; i++) {
        control.check()
        iterations++
        await wait(10)
      }

      return "done"
    }).catch((caughtError) => caughtError)

    expect(error.constructor).toBe(TimeoutError)
    expect(iterations).toBeLessThan(100)
  })
})

// Helper call chain mirroring the production pattern: an outer async caller awaits
// an intermediate async function that is the direct timeout() call site (e.g.
// runner-service -> eligibility-service -> timeout).

/**
 * Outer async caller that awaits the direct timeout() call site and returns the
 * thrown error, mirroring an async parent frame above the direct call site.
 * @returns {Promise<Error>} The TimeoutError thrown by the direct call site.
 */
async function timeoutOuterCaller() {
  try {
    return await timeoutDirectCaller()
  } catch (error) {
    return error
  }
}

/**
 * Direct timeout() call site whose callback outlives the deadline, so the timer
 * fires and the returned error is the fired TimeoutError.
 * @returns {Promise<Error | "done">} The fired TimeoutError (callback always times out).
 */
async function timeoutDirectCaller() {
  return await timeout({timeout: 30, errorMessage: "probe timed out"}, async () => {
    await wait(60)
  })
}

/**
 * Drives control.check() to throw its own TimeoutError (event loop starved past
 * the deadline) from an async caller chain.
 * @returns {Promise<Error | "done">} The TimeoutError thrown by control.check().
 */
async function checkBusyWaitCaller() {
  try {
    return await timeout({timeout: 5, errorMessage: "check timed out"}, async ({control}) => {
      // Starve the event loop past the deadline so check() throws its own TimeoutError
      // rather than the timer callback aborting the signal first.
      const spinUntil = Date.now() + 10

      while (Date.now() < spinUntil) {
        // Intentionally spin without yielding to the event loop.
      }
      control.check()

      return "done"
    })
  } catch (error) {
    return error
  }
}

describe("timeout caller stack capture", () => {
  it("carries the call site as .cause on the fired TimeoutError", async () => {
    const error = await timeoutOuterCaller()

    expect(error.constructor).toBe(TimeoutError)
    expect(error.cause).toBeInstanceOf(Error)
    expect(error.message).toBe("probe timed out")
  })

  it("recovers the direct caller frame and the awaited parent in the fired error's stack", async () => {
    const error = await timeoutOuterCaller()

    // The direct timeout() call site is a synchronous frame at capture time, so it
    // must always be present.
    expect(error.stack).toContain("timeoutDirectCaller")

    // The awaited caller above the direct site is recovered via Node's async stack
    // traces, which is exactly the context that used to be lost.
    expect(error.stack).toContain("timeoutOuterCaller")
  })

  it("also carries the caller frames on the TimeoutError thrown by control.check()", async () => {
    const error = await checkBusyWaitCaller()

    expect(error.constructor).toBe(TimeoutError)
    expect(error.cause).toBeInstanceOf(Error)
    expect(error.stack).toContain("checkBusyWaitCaller")
  })
})
