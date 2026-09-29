// @ts-check

import withTimeout from "../src/with-timeout.js"

const result = withTimeout(Promise.resolve("done"), "the thing", {timeout: 100})

result.catch(() => {})
