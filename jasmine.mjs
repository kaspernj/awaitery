import Jasmine from "jasmine"

const jasmine = new Jasmine()

jasmine.loadConfig({
  spec_dir: "spec",
  spec_files: ["**/*[sS]pec.js"],
  helpers: [],
  random: true,
  stopSpecOnExpectationFailure: false
})

await jasmine.execute()
