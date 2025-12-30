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

  it("supports the legacy signature with a deprecation warning", async () => {
    let attempts = 0
    const warnSpy = spyOn(console, "warn").and.stub()

    await expectAsync(waitFor(() => {
      attempts += 1
      if (attempts < 2) throw new Error("nope")
      return "ok"
    }, {timeout: 40, wait: 10})).toBeResolvedTo("ok")

    expect(warnSpy).toHaveBeenCalledWith("waitFor(callback, opts) is deprecated; use waitFor(opts, callback) instead.")
  })

  it("throws on unknown options", async () => {
    await expectAsync(waitFor({nope: true}, async () => {
      return "ignored"
    })).toBeRejectedWithError(/Unknown arguments given to waitFor: nope/)
  })
})
