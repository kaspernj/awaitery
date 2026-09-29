import {TimeoutError} from "../src/timeout.js"
import waitUntil from "../src/wait-until.js"

describe("waitUntil", () => {
  it("resolves with the first truthy value", async () => {
    let calls = 0

    const value = await waitUntil(() => {
      calls += 1
      return calls >= 3 ? "ready" : false
    }, "state ready", {poll: 5})

    expect(value).toBe("ready")
    expect(calls).toBe(3)
  })

  it("checks immediately on the first poll", async () => {
    let calls = 0

    await waitUntil(() => {
      calls += 1
      return true
    }, "immediate")

    expect(calls).toBe(1)
  })

  it("rejects with a TimeoutError labelled by the label when the deadline passes", async () => {
    const start = Date.now()

    const caught = await waitUntil(() => false, "state ready", {
      timeout: 50,
      poll: 5
    }).catch((error) => error)

    expect(caught).toBeInstanceOf(TimeoutError)
    expect(caught.message).toBe("Timed out: state ready")
    expect(Date.now() - start).toBeLessThan(500)
  })

  it("accepts a plain number as the total deadline", async () => {
    const caught = await waitUntil(() => false, "x", 30).catch((error) => error)
    expect(caught).toBeInstanceOf(TimeoutError)
  })

  it("accepts a custom error message", async () => {
    const caught = await waitUntil(() => false, "x", {
      timeout: 30,
      errorMessage: "gave up"
    }).catch((error) => error)
    expect(caught.message).toBe("gave up")
  })

  it("rethrows a predicate error", async () => {
    const boom = new Error("predicate exploded")
    await expectAsync(waitUntil(() => {
      throw boom
    }, "x")).toBeRejectedWithError("predicate exploded")
  })

  it("rejects with signal.reason when the external signal aborts", async () => {
    const controller = new AbortController()
    const reason = new Error("aborted externally")
    const promise = waitUntil(() => false, "x", {timeout: 5000, poll: 10, signal: controller.signal})
    setTimeout(() => controller.abort(reason), 15)

    const caught = await promise.catch((error) => error)
    expect(caught).toBe(reason)
  })

  it("rejects immediately when the signal is already aborted", async () => {
    const controller = new AbortController()
    const reason = new Error("pre-aborted")
    controller.abort(reason)

    const caught = await waitUntil(() => false, "x", {poll: 5, signal: controller.signal}).catch((error) => error)
    expect(caught).toBe(reason)
  })

  it("rejects on unknown options", async () => {
    await expectAsync(waitUntil(() => true, "x", {nope: true})).toBeRejectedWithError(
      /Unknown arguments given to waitUntil: nope/
    )
  })
})
