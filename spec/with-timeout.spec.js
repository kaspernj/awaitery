import {TimeoutError} from "../src/timeout.js"
import withTimeout from "../src/with-timeout.js"

describe("withTimeout", () => {
  it("resolves with the promise's result when it settles first", async () => {
    await expectAsync(
      withTimeout(new Promise((resolve) => setTimeout(() => resolve("done"), 5)), "work")
    ).toBeResolvedTo("done")
  })

  it("rejects with a TimeoutError labelled by the label when the deadline is reached", async () => {
    const start = Date.now()
    const promise = withTimeout(new Promise(() => {}), "the slow thing", 40)

    const caught = await promise.catch((error) => error)

    expect(caught).toBeInstanceOf(TimeoutError)
    expect(caught.message).toBe("Timed out: the slow thing")
    expect(Date.now() - start).toBeLessThan(500)
  })

  it("accepts a plain number as the timeout", async () => {
    const caught = await withTimeout(new Promise(() => {}), "x", 30).catch((error) => error)
    expect(caught).toBeInstanceOf(TimeoutError)
  })

  it("accepts a custom error message", async () => {
    const caught = await withTimeout(new Promise(() => {}), "x", {
      timeout: 30,
      errorMessage: "gave up"
    }).catch((error) => error)
    expect(caught.message).toBe("gave up")
  })

  it("rejects with signal.reason when the external signal aborts first", async () => {
    const controller = new AbortController()
    const reason = new Error("aborted externally")
    const promise = withTimeout(new Promise(() => {}), "x", {
      timeout: 5000,
      signal: controller.signal
    })
    setTimeout(() => controller.abort(reason), 10)

    const caught = await promise.catch((error) => error)
    expect(caught).toBe(reason)
  })

  it("rejects immediately when the signal is already aborted", async () => {
    const controller = new AbortController()
    const reason = new Error("pre-aborted")
    controller.abort(reason)

    const caught = await withTimeout(new Promise(() => {}), "x", {
      timeout: 5000,
      signal: controller.signal
    }).catch((error) => error)
    expect(caught).toBe(reason)
  })

  it("rejects on unknown options", async () => {
    await expectAsync(
      withTimeout(Promise.resolve("ignored"), "x", {nope: true})
    ).toBeRejectedWithError(/Unknown arguments given to withTimeout: nope/)
  })

  it("does not deliver a late result after the deadline", async () => {
    let resolved = false

    const promise = withTimeout(new Promise((resolve) => setTimeout(() => {
      resolved = true
      resolve("late")
    }, 60)), "x", 20)

    const caught = await promise.catch((error) => error)
    expect(caught).toBeInstanceOf(TimeoutError)
    expect(resolved).toBe(false)

    await new Promise((resolve) => setTimeout(resolve, 90))
    expect(resolved).toBe(true)
  })
})
