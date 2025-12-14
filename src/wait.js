// @ts-check

/**
 * Wait for a specified time.
 * @param {number} time - The time to wait.
 */
export default async function wait(time) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(undefined)
    }, time)
  })
}
