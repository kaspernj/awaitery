import timeout from "../src/timeout.js"
import wait from "../src/wait.js"

describe("timeout", () => {
  it("returns the callback result when it resolves before the timeout", async () => {
    await expectAsync(timeout({timeout: 300}, async () => {
      await wait(50)
      return "done"
    })).toBeResolvedTo("done")
  })

  it("throws a TimeoutError when the timeout is exceeded", async () => {
    await expectAsync(timeout({timeout: 30}, async () => {
      await wait(60)
    })).toBeRejectedWithError(/Timeout while trying/)
  })

  it("propagates callback errors immediately", async () => {
    await expectAsync(timeout({timeout: 300}, async () => {
      throw new Error("boom")
    })).toBeRejectedWithError("boom")
  })
})
