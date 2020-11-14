#!/bin/bash

# Updates or creates a package with the given name (idempotent).
# The name is the directory it will be housed in.
# The name will have @agoric/ in package.json by default, if the package is
# new.
#
# Usage: scripts/repackage.sh NAME
# Example: scripts/repackage.sh console

set -ueo pipefail

DIR=$(dirname -- "${BASH_SOURCE[0]}")
cd "$DIR/.."

NAME=$1
PKGJSON=packages/$NAME/package.json

mkdir -p "packages/$NAME/"{src,dist,test}

NEWPKGJSONHASH=$(
  if [ -f "$PKGJSON" ]; then
    cat "$PKGJSON"
  else
    echo {}
  fi | jq --arg name "$NAME" '{
    name: null,
    version: null,
    description: "Description forthcoming.",
    author: "Agoric",
    license: "Apache-2.0",
    type: null,
    main: null,
    module: null,
    browser: null,
    unpkg: null,
    exports: {},
    scripts: {},
    dependencies: {},
    devDependencies: {},
    files: [],
    publishConfig: {
      access: "public"
    },
  } + . + {
    name: (.name // "@agoric/\($name)"),
    version: (.version // "0.0.0+1-dev"),
    type: "module",
    main: "./dist/\($name).cjs",
    module: "./src/main.js",
    browser: "./dist/\($name).umd.js",
    unpkg: "./dist/\($name).umd.js",
    exports: ((.exports // {}) + {
      import: "./src/main.js",
      require: "./dist/\($name).cjs",
      browser: "./dist/\($name).umd.js",
    }),
    scripts: ((.scripts // {}) + {
      prepublish: "yarn clean && yarn build",
      clean: "rm -rf dist",
      build: "rollup --config rollup.config.js",
      test: "ava",
      "test:nyc": "nyc ava",
      "lint-check": "eslint '"'**/*.js'"'",
      "lint-fix": "eslint --fix '"'**/*.js'"'",
    }) | to_entries | sort_by(.key) | from_entries,
    devDependencies: ((.devDependencies // {}) + {
      "@rollup/plugin-node-resolve": "^6.1.0",
      "ava": "^3.12.1",
      "babel-eslint": "^10.0.3",
      "eslint": "^6.8.0",
      "eslint-config-airbnb-base": "^14.0.0",
      "eslint-config-prettier": "^6.9.0",
      "eslint-plugin-eslint-comments": "^3.1.2",
      "eslint-plugin-import": "^2.19.1",
      "eslint-plugin-prettier": "^3.1.2",
      "nyc": "^15.1.0",
      "prettier": "^1.19.1",
      "rollup": "1.31.0",
      "rollup-plugin-terser": "^5.1.3",
    }) | to_entries | sort_by(.key) | from_entries,
    files: ((.files // []) + [
      "src",
      "dist",
      "LICENSE*"
    ]) | sort | unique,
    "eslintConfig": {
      "extends": [
        "airbnb-base",
        "plugin:prettier/recommended"
      ],
      "env": {
        "es6": true
      },
      "rules": {
        "implicit-arrow-linebreak": "off",
        "function-paren-newline": "off",
        "arrow-parens": "off",
        "strict": "off",
        "prefer-destructuring": "off",
        "no-else-return": "off",
        "no-console": "off",
        "no-unused-vars": [
          "error",
          {
            "argsIgnorePattern": "^_",
            "varsIgnorePattern": "^_"
          }
        ],
        "no-return-assign": "off",
        "no-param-reassign": "off",
        "no-restricted-syntax": [
          "off",
          "ForOfStatement"
        ],
        "no-unused-expressions": "off",
        "no-loop-func": "off",
        "no-inner-declarations": "off",
        "import/no-extraneous-dependencies": [
          "error",
          {
            "devDependencies": [
              "test/**/*.js",
              "scripts/**/*.js"
            ]
          }
        ],
        "import/prefer-default-export": "off",
        "import/extensions": "off"
      },
      "ignorePatterns": [
        "**/dist/**"
      ]
    },
    "prettier": {
      "trailingComma": "all",
      "singleQuote": true
    },
    "ava": {
      "files": [
        "test/**/test-*.js"
      ],
      "timeout": "2m"
    },
  }' | git hash-object -w --stdin
)

git cat-file blob "$NEWPKGJSONHASH" > "$PKGJSON"

# cp packages/import-bundle/rollup.config.js packages/"$NAME"/rollup.config.js
cp packages/import-bundle/LICENSE packages/"$NAME"/LICENSE
touch packages/"$NAME"/README.md
touch packages/"$NAME"/NEWS.md

if ! grep -F dist packages/"$NAME"/.gitignore 2>&1 >/dev/null; then
  echo dist >> packages/"$NAME"/.gitignore
fi
