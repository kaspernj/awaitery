# Awaitery

## Usage

## retry

```js
import retry from "awaitery/src/retry.js"

await retry({wait: 1000, timeout: 4000}, async () => {
  const submitButton = await systemTest.findByTestID("signInButton")

  await systemTest.click(submitButton)
})
```

## timeout
import timeout from "awaitery/src/timeout.js"

await timeout({timeout: 4000}, async () => {
  const submitButton = await systemTest.findByTestID("signInButton")

  await systemTest.click(submitButton)
})

## wait

```js
import wait from "awaitery/src/wait.js"

await wait(1000)
```

## waitFor

```js
import waitFor from "awaitery/src/wait-for.js"

await waitFor(async () => {
  if (await fileExists(targetPath)) throw new Error("Target file exists")
})
```
