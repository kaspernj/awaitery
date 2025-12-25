import waitFor from "../src/wait-for.js"

describe("waitFor", () => {
  it("retries until the callback stops throwing", async () => {
    let attempts = 0

    await expectAsync(waitFor(() => {
      attempts += 1
      if (attempts < 3) throw new Error(`fail ${attempts}`)
      return "ready"
    }, {timeout: 200, wait: 10})).toBeResolvedTo("ready")

    expect(attempts).toBe(3)
  })

  it("rethrows the last error when the timeout is reached", async () => {
    await expectAsync(waitFor(() => {
      throw new Error("still failing")
    }, {timeout: 40, wait: 10})).toBeRejectedWithError("still failing")
  })
})
