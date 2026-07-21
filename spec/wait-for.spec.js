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
})
