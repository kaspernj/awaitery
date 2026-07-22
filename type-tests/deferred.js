// @ts-check

import deferred from "../src/deferred.js"

/** @type {import("../src/deferred.js").Deferred<string>} */
const result = deferred()

result.resolve(Promise.resolve("done"))
