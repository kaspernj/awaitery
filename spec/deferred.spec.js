// @ts-check

import deferred from "../src/deferred.js"

describe("deferred", () => {
  it("resolves with the provided value", async () => {
    /** @type {import("../src/deferred.js").Deferred<string>} */
    const result = deferred()

    result.resolve("done")

    await expectAsync(result.promise).toBeResolvedTo("done")
  })

  it("resolves void synchronization gates without a value", async () => {
    const gate = deferred()

    gate.resolve()

    await expectAsync(gate.promise).toBeResolved()
  })

  it("rejects with the provided reason", async () => {
    const result = deferred()
    const error = new Error("not ready")

    result.reject(error)

    await expectAsync(result.promise).toBeRejectedWith(error)
  })
})
