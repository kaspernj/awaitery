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

    await timeout({timeout: 300}, (control) => {
      received = control

      return "done"
    })

    expect(received).toBeInstanceOf(TimeoutControl)
  })

  it("check() throws a TimeoutError once the timeout has fired", async () => {
    const error = await timeout({timeout: 30}, async (control) => {
      await wait(60)
      control.check()

      return "done"
    }).catch((caughtError) => caughtError)

    expect(error.constructor).toBe(TimeoutError)
  })

  it("check() does not throw when called before the timeout fires", async () => {
    await expectAsync(timeout({timeout: 300}, async (control) => {
      await wait(10)
      control.check()

      return "done"
    })).toBeResolvedTo("done")
  })

  it("aborts the signal when the timeout fires", async () => {
    let control

    await timeout({timeout: 30}, async (givenControl) => {
      control = givenControl
      await wait(60)
    }).catch(() => {})

    expect(control.signal.aborted).toBe(true)
  })

  it("timedOut returns true after the timeout fires", async () => {
    let control

    await timeout({timeout: 30}, async (givenControl) => {
      control = givenControl
      await wait(60)
    }).catch(() => {})

    expect(control.timedOut).toBe(true)
  })

  it("timedOut returns false before the timeout fires", async () => {
    await timeout({timeout: 300}, (control) => {
      expect(control.timedOut).toBe(false)
    })
  })

  it("remaining() returns a positive number before the timeout fires", async () => {
    await timeout({timeout: 300}, (control) => {
      expect(control.remaining()).toBeGreaterThan(0)
    })
  })

  it("remaining() returns 0 after the timeout fires", async () => {
    let control

    await timeout({timeout: 30}, async (givenControl) => {
      control = givenControl
      await wait(60)
    }).catch(() => {})

    // The race rejects right at the deadline, so wait past it before reading remaining().
    await wait(20)

    expect(control.remaining()).toBe(0)
  })

  it("bails out of a loop that checks check() on every iteration when the timeout fires", async () => {
    let iterations = 0

    const error = await timeout({timeout: 30}, async (control) => {
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
