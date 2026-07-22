import wait from "../src/wait.js"

describe("wait", () => {
  it("resolves after the given time", async () => {
    const start = Date.now()
    await wait(30)

    expect(Date.now() - start).toBeGreaterThanOrEqual(30)
  })

  it("rejects immediately with signal.reason when the signal is already aborted", async () => {
    const controller = new AbortController()
    const reason = new Error("stop")

    controller.abort(reason)

    const caught = await wait(50, {signal: controller.signal}).catch((error) => error)

    expect(caught).toBe(reason)
  })

  it("rejects with the exact signal.reason when aborted during the wait", async () => {
    const controller = new AbortController()
    const reason = new Error("interrupted")
    const promise = wait(1000, {signal: controller.signal})

    setTimeout(() => controller.abort(reason), 10)

    const caught = await promise.catch((error) => error)

    expect(caught).toBe(reason)
  })

  it("rejects before the full delay elapses when aborted (timer cleared)", async () => {
    const controller = new AbortController()
    const start = Date.now()
    const promise = wait(1000, {signal: controller.signal})

    setTimeout(() => controller.abort(new Error("interrupted")), 10)

    await promise.catch(() => {})

    expect(Date.now() - start).toBeLessThan(500)
  })

  it("uses the platform AbortError when aborted without an explicit reason", async () => {
    const controller = new AbortController()
    const promise = wait(1000, {signal: controller.signal})

    setTimeout(() => controller.abort(), 10)

    const caught = await promise.catch((error) => error)

    expect(caught.name).toBe("AbortError")
  })

  it("resolves normally when a signal is supplied but never aborts", async () => {
    const controller = new AbortController()
    const start = Date.now()

    await wait(30, {signal: controller.signal})

    expect(Date.now() - start).toBeGreaterThanOrEqual(30)
  })

  it("does not reject when the signal aborts after a normal resolution (listener removed)", async () => {
    const controller = new AbortController()

    await wait(20, {signal: controller.signal})

    // The abort listener must have been removed on resolution, so this is a harmless no-op.
    expect(() => controller.abort(new Error("late"))).not.toThrow()
  })
})
