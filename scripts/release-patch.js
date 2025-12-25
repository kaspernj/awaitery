import {execSync} from "node:child_process"

/**
 * Run a shell command and inherit stdio.
 * @param {string} command
 * @param {import("node:child_process").ExecSyncOptions} [options]
 * @returns {void}
 */
function run(command, options = {}) {
  execSync(command, {stdio: "inherit", ...options})
}

/**
 * Get the current git branch name.
 * @returns {string} Current branch name.
 */
function currentBranch() {
  return execSync("git rev-parse --abbrev-ref HEAD", {encoding: "utf8"}).trim()
}

/**
 * Ensure releases are only executed from master.
 * @returns {void}
 */
function ensureMasterBranch() {
  const branch = currentBranch()
  if (branch !== "master") {
    throw new Error(`Release must be run on master (current: ${branch})`)
  }
}

/**
 * Ensure there are no uncommitted changes before releasing.
 * @returns {void}
 */
function ensureCleanWorktree() {
  const status = execSync("git status --porcelain", {encoding: "utf8"}).trim()
  if (status.length > 0) {
    throw new Error("Release requires a clean working tree (no uncommitted changes).")
  }
}

/** Run the release flow. */
function main() {
  ensureMasterBranch()
  ensureCleanWorktree()

  run("npm version patch --no-git-tag-version")
  run("npm install")
  run("git add package.json package-lock.json")
  run('git commit -m "chore: bump patch version"')
  run("git push origin master")
  run("npm publish")
}

try {
  main()
} catch (error) {
  console.error(error?.message || error)
  process.exit(1)
}
