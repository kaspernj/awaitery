export default async function wait(time) {
  return new Promise((resolve) => {
    setTimeout(() => { // eslint-disable-line no-undef
      resolve()
    }, time)
  })
}
