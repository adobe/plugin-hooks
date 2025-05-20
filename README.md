# Hooks Plugin

Hooks allow you to invoke composable local or remote function on a targeted node.

Some use cases for the Hooks include:

+ Authenticating a user before all operations
+ Checking for an authorization token before making a request

## Usage

Local and remote functions must return an object that conforms to the `HookResponse` interface.

```typescript
interface HookResponse {
  status: "ERROR" | "SUCCESS",
  message: string,
  data?: {
    headers?: {
        [headerName: string]: string
    }
  }
}
```

Local and remote functions are defined in your configuration. Local functions are packaged with and run on the server,
while remote functions run elsewhere, such as on your own server or compute environment. Local and remote functions have
different advantages and limitations.

> **_NOTE:_** Hooks increase processing time when blocking with duration based on their complexity. Use them sparingly
> if processing time is important.

Return values from both local and remote functions should conform to the following interface:

### Local Functions

Avoid using local functions if:
+ The entire operation will take more than 30 seconds.
+ The function needs to make network calls.
+ The function has complex or nested loops.
+ The function uses restricted constructs, such as `setTimeout`, `setInterval`, `process`, or `global`.

> **_NOTE:_** Composable local functions are limited to a duration of 30 seconds.

### Remote Functions

If a local function does not work or causes timeout errors, consider using a remote function.

You are free to use any language, framework, or library with remote functions, as long as they return a valid response.
A remote function must be served with the `HTTPS` protocol and be accessible from the internet. Requests to remote
functions use the `POST` HTTP method. Remote functions can increase latency due to the additional network hop involved.

Remote functions can use the `params`, `context`, and `document` arguments over the network. However, serialization and
deserialization of JSON data means that any complex fields or references will be lost. If the composer depends on
complex fields or references, consider using a local function instead.

### Configuration

Hooks are plugins that accept the following arguments:

Syntax:
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

> **_NOTE:_** Hooks are executed in the order provided, with blocking hooks running before non-blocking ones. Errors from non-blocking
hooks are ignored.

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

The output build will be in the `dist` folder.
