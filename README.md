# Hooks Plugin

Hooks allow you to invoke a composable local or remote function on a targeted node.

Some use cases for the Hooks include:
+ Authenticating a user before all operations
+ Checking for an authorization token before making a request

Hooks increase processing time. Use them sparingly if processing time is important. Hooks are executed in the order you provide them. However, any blocking hooks execute before non-blocking hooks.

## Usage

Hooks are plugins that accept the following arguments:

Syntax:
```JSON
"hooks": {
    "beforeAll": {
        "composer": "<Local or Remote file>",
        "blocking": true|false
    }
}
```

+ composer (string) - The local or remote file location of the function you want to execute.
+ blocking (boolean) - (false by default) Determines if the query waits for a successful return message before continuing the query.

## Development

### Installation

#### Pre-requisites
- [Node.js](https://nodejs.org/en/download/) (v18 or later)

### Lint
Run the linting script to check for errors:

```bash
yarn lint
```

### Test
Run the test script to execute all tests:

```bash
yarn test
```

For test coverage include the `--coverage` flag:

```bash
yarn test --coverage
```

### Build
Run the build script to compile the TypeScript code into ESM/CJS:

```bash
yarn build
```

The output build will be in the `dist` folder.
