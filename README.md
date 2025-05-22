# Hooks Plugin

Hooks allow you to invoke composable local or remote functions on a targeted node.

Some use cases for Hooks include:

+ Authenticating a user before all operations
+ Checking for an authorization token before making a request

> **_NOTE:_** Hooks increase processing time when blocking with duration based on their complexity. Use them sparingly
> if processing time is important.

## Table of Contents
+ [Usage](#usage)
  + [Local Functions](#local-functions)
  + [Remote Functions](#remote-functions)
+ [Development](#development)
  + [Installation](#installation)
  + [Lint](#lint)
  + [Test](#test)
  + [Build](#build)
+ [Contributing](#contributing)
+ [Licensing](#licensing)

## Usage

Local and remote functions are defined in your configuration. Hooks are configured as plugins that accept the following
arguments:

```JSON
{
    "hooks": {
        "beforeAll": {
            "composer": "<Local or Remote file>",
            "blocking": true|false
        }
    }
}
```
+ **composer (string)** - The local or remote file location of the function you want to execute.
+ **blocking (boolean)** - (false by default) Determines whether the query waits for a successful return message before continuing.

> **_NOTE:_** Hooks are executed in the order configured, with blocking hooks running before non-blocking ones. Errors
> from non-blocking hooks are ignored.

Local and remote functions must return an object that conforms to the `HookResponse` interface.

```typescript
interface HookResponse {
  status: "SUCCESS" | "ERROR"
  message: string,
  data?: {
    headers?: {
        [headerName: string]: string
    }
  }
}
```

### Local Functions

Local functions are JavaScript functions that are bundled with and executed on the server. They should be written as
CommonJS functions exported from the referenced hooks module, either a default or named export.

Avoid using local functions if:
+ The entire operation will take more than 30 seconds.
+ The function uses restricted constructs, including `process`, `window`, `debugger`, `alert`, `setTimeout`,
  `setInterval`, `new Function()`, `eval`, or `WebAssembly`.

An example of a local function is shown below:

```javascript
module.exports = {
    /**
     * Hook function to validate headers against context secret.
     * @type {import('@adobe/plugin-hooks').HookFunction} Hook function
     * @param {import('@adobe/plugin-hooks').HookFunctionPayload} Hook payload
     * @returns {Promise<import('@adobe/plugin-hooks').HookResponse>} Hook response
     */
    isAuth: async ({context}) => {
        function test() {}
        const {
            headers,
            secrets,
        } = context;
        test();
        if (headers.authorization !== secrets.TOKEN) {
            return {
                status: 'ERROR',
                message: "Unauthorized",
            };
        } else {
            return {
                status: "SUCCESS",
                message: "Authorized",
            };
        }
    },
}
```

See [examples](examples) for additional examples of local functions.

### Remote Functions

If a local function does not work or causes timeout errors, consider using a remote function.

You are free to use any language, framework, or library with remote functions, as long as they return a valid response.
A remote function must be served with the `HTTPS` protocol and be accessible from the internet. Requests to remote
functions use the `POST` HTTP method. Remote functions can increase latency due to the additional network hop involved.

Remote functions can use the `params`, `context`, and `document` arguments over the network. However, serialization and
deserialization of JSON data means that any complex fields or references will be lost. If the composer depends on
complex fields or references, consider using a local function instead.

## Development

### Installation

#### Prerequisites
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

The build output will be in the `dist` directory.

## Contributing

Please refer to the [contributing guidelines](.github/CONTRIBUTING.md) for more information.

## Licensing

This project is licensed under the Apache V2 License. See [LICENSE](LICENSE) for more information.
