import js from "@eslint/js"
import {jsdoc} from "eslint-plugin-jsdoc"
import jasminePlugin from "eslint-plugin-jasmine"
import globals from "globals"
import {defineConfig} from "eslint/config"

export default defineConfig([
  {
    name: "global ignores",
    ignores: ["build/**"],
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: {js},
    extends: ["js/recommended"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node
      }
    }
  },
  {
    ...jasminePlugin.configs.recommended,
    files: ["spec/**/*.{js,mjs,cjs}"],
    plugins: {
      jasmine: jasminePlugin
    },
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jasmine
      }
    }
  },
  jsdoc({
    config: "flat/recommended",
    rules: {
      "jsdoc/require-param-description": "off"
    }
  })
])
