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
})
