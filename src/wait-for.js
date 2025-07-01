import wait from "./wait.js"

export default async function waitFor(callback, opts) {
  const waitTimeout = opts?.timeout || 5000
  const waitTime = opts?.wait || 50
  const startTime = new Date()
  const endTime = startTime.getTime() + waitTimeout
  let currentTime = new Date().getTime()
  let lastError

  while (currentTime < endTime) {
    currentTime = new Date().getTime()

    try {
      return await callback()
    } catch (error) {
      lastError = error
    }

    await wait(waitTime)
  }

  if (lastError) {
    throw lastError
  }
}
