import wait from "../src/wait.js"

describe("wait", () => {
  it("resolves after the given time", async () => {
    const start = Date.now()
    await wait(30)

    expect(Date.now() - start).toBeGreaterThanOrEqual(30)
  })
})
