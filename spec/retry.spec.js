import retry from "../src/retry.js"
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
      attemptTimes.push(Date.now())
      if (attemptTimes.length < 3) throw new Error("nope")
      return "ok"
    })).toBeResolvedTo("ok")

    expect(attemptTimes).toHaveSize(3)
    expect(attemptTimes[1] - attemptTimes[0]).toBeGreaterThanOrEqual(waitTime)
    expect(attemptTimes[2] - attemptTimes[1]).toBeGreaterThanOrEqual(waitTime)
  })
})
