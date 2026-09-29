// @ts-check

import waitUntil from "../src/wait-until.js"

const result = waitUntil(() => true, "ready", {timeout: 100, poll: 10})

result.catch(() => {})
