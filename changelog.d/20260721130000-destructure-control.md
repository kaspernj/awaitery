Pass `TimeoutControl` as a destructured object (`{control}`) for future extensibility.

`timeout()`, `retry()`, and `waitFor()` now invoke their callbacks with `{control}` instead of a bare `TimeoutControl` instance:

```js
timeout({timeout: 5000}, ({control}) => {
  control.check()
  fetch(url, {signal: control.signal})
})
```

Existing callbacks that don't use the argument continue to work unchanged.
Callbacks that access `control` directly need to destructure: `({control}) => ...` instead of `(control) => ...`.
