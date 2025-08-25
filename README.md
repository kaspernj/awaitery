# Awaitery

## Usage

## waitFor

```js
import waitFor from "awaitery/src/wait-for.js"

await waitFor(async () => {
  if (await fileExists(targetPath)) throw new Error("Target file exists")
})
```
