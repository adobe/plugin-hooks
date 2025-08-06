# Hooks Plugin

Hooks allow you to invoke composable local or remote functions on a targeted node.

Some use cases for Hooks include:

+ Authenticating a user before all operations
+ Checking for an authorization token before making a request
+ Modifying request headers before fetching from a source
+ Modifying response headers after fetching from a source
+ Logging execution results after GraphQL operations

> **_NOTE:_** Hooks increase processing time when blocking with duration based on their complexity. Use them sparingly
> if processing time is important.

## Table of Contents
+ [Usage](#usage)
  + [Configuration](#configuration)
  + [BeforeAll Hook](#beforeall-hook)
  + [BeforeSource Hook](#beforesource-hook)
  + [AfterSource Hook](#aftersource-hook)
  + [AfterAll Hook](#afterall-hook)
  + [Local Functions](#local-functions)
  + [Remote Functions](#remote-functions)
+ [Migration Guide](#migration-guide)
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

### Configuration

```json
{
  "hooks": {
    "beforeAll": {
      "composer": "<Local or Remote file>",
      "blocking": true|false
    },
    "beforeSource": {
      "sourceName": [
        {
          "composer": "<Local or Remote file>",
          "blocking": true|false
        }
      ]
    },
    "afterSource": {
      "sourceName": [
        {
          "composer": "<Local or Remote file>",
          "blocking": true|false
        }
      ]
    },
    "afterAll": {
      "composer": "<Local or Remote file>",
      "blocking": true|false
    }
  }
}
```

+ **composer (string)** - The local or remote file location of the function you want to execute.
+ **blocking (boolean)** - (false by default) Determines whether the query waits for a successful return message before continuing.
+ **sourceName (string)** - For source hooks, the name of the source to target (e.g., "users", "products").

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

### BeforeAll Hook

The `beforeAll` hook executes once before any GraphQL operation. It has access to the request context and can modify headers.

**Hook Function Signature:**
```typescript
interface BeforeAllHookFunctionPayload {
  context: {
    request: Request;
    params: GraphQLParams;
    secrets?: Record<string, string>;
    state?: StateApi;
    logger?: YogaLogger;
  };
  document?: unknown;
}

interface BeforeAllHookResponse extends HookResponse {
  data?: {
    headers?: {
      [headerName: string]: string;
    };
  };
}
```

**Example:**
```javascript
module.exports = {
  addAuthHeader: async ({ context }) => {
    const { headers, secrets } = context;
    
    if (!headers.authorization) {
      return {
        status: 'ERROR',
        message: 'Authorization header required'
      };
    }
    
    return {
      status: 'SUCCESS',
      message: 'Authorization validated',
      data: {
        headers: {
          'X-Auth-Validated': 'true'
        }
      }
    };
  }
};
```

### BeforeSource Hook

The `beforeSource` hook executes once before fetching data from a named source. It has access to the request object, allowing you to modify request headers, body, or other request properties.

**Hook Function Signature:**
```typescript
interface BeforeSourceHookFunctionPayload {
  context: {
    request: Request;
    params: GraphQLParams;
    secrets?: Record<string, string>;
    state?: StateApi;
    logger?: YogaLogger;
  };
  request: RequestInit; // Can be modified
  document?: unknown;
  sourceName: string;
}

interface BeforeSourceHookResponse extends HookResponse {
  data?: {
    request?: RequestInit | {
      body?: string | ReadableStream<Uint8Array>;
      headers?: Record<string, string>;
      method?: string;
      url?: string;
    };
  };
}
```

**Example:**
```javascript
module.exports = {
  modifyRequest: async ({ context, request, sourceName }) => {
    // Add authentication header to request
    const modifiedRequest = {
      ...request,
      headers: {
        ...request.headers,
        'Authorization': `Bearer ${context.secrets.API_TOKEN}`
      }
    };
    
    return {
      status: 'SUCCESS',
      message: 'Request modified successfully',
      data: {
        request: modifiedRequest
      }
    };
  }
};
```

### AfterSource Hook

The `afterSource` hook executes once after fetching data from a named source. It has access to the response object, allowing you to modify response headers, body, or other response properties.

**Hook Function Signature:**
```typescript
interface AfterSourceHookFunctionPayload {
  context: {
    request: Request;
    params: GraphQLParams;
    secrets?: Record<string, string>;
    state?: StateApi;
    logger?: YogaLogger;
  };
  document?: unknown;
  sourceName: string;
  response?: Response; // Can be modified
}

interface AfterSourceHookResponse extends HookResponse {
  data?: {
    response?: Response | {
      body?: string | ReadableStream<Uint8Array>;
      headers?: Record<string, string>;
      status?: number;
      statusText?: string;
    };
  };
}
```

**Example:**
```javascript
module.exports = {
  modifyResponse: async ({ context, response, sourceName }) => {
    // Add custom header to response
    const modifiedResponse = new Response(response.body, {
      ...response,
      headers: {
        ...response.headers,
        'X-Custom-Header': 'modified-by-hook'
      }
    });
    
    return {
      status: 'SUCCESS',
      message: 'Response modified successfully',
      data: {
        response: modifiedResponse
      }
    };
  }
};
```

### AfterAll Hook

The `afterAll` hook executes once after GraphQL execution is complete, but before the final response is sent to the client. It has access to the execution result, allowing you to modify the final response or perform cleanup operations.

**Hook Function Signature:**
```typescript
interface AfterAllHookFunctionPayload {
  context: {
    request: Request;
    params: GraphQLParams;
    secrets?: Record<string, string>;
    state?: StateApi;
    logger?: YogaLogger;
  };
  document?: unknown;
  result?: GraphQLResult; // The final execution result
}

interface AfterAllHookResponse extends HookResponse {
  data?: {
    result?: GraphQLResult; // Can be modified
  };
}
```

**Example:**
```javascript
module.exports = {
  logExecution: async ({ context, result }) => {
    // Log execution result
    context.logger.info('GraphQL execution completed', {
      hasErrors: result.errors && result.errors.length > 0,
      dataKeys: result.data ? Object.keys(result.data) : []
    });
    
    return {
      status: 'SUCCESS',
      message: 'Execution logged successfully'
    };
  }
};
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

## Migration Guide

### Breaking Changes

#### 1. Module Structure
The package now provides both ESM and CommonJS outputs:
- **ESM**: `dist/esm/index.js`
- **CommonJS**: `dist/cjs/index.js`
- **TypeScript declarations**: `dist/types/index.d.ts`

#### 2. Import Changes
**Before:**
```javascript
const hooksPlugin = require('@adobe/plugin-hooks');
```

**After:**
```javascript
// CommonJS
const hooksPlugin = require('@adobe/plugin-hooks');

// ESM
import hooksPlugin from '@adobe/plugin-hooks';
```

#### 3. Hook Function Signatures
Hook functions now receive properly typed payloads. The basic structure remains the same, but TypeScript users will get better type safety.

**Before:**
```javascript
module.exports = {
  myHook: async (payload) => {
    // payload structure was loosely defined
  }
};
```

**After:**
```javascript
module.exports = {
  myHook: async (payload) => {
    // payload is now properly typed
    const { context, document } = payload;
    const { headers, secrets, state } = context;
  }
};
```

#### 4. Error Handling
Errors now use GraphQL error codes for better integration:

**Before:**
```javascript
return {
  status: 'ERROR',
  message: 'Unauthorized'
};
```

**After:**
```javascript
// Errors are automatically wrapped with GraphQL error codes
return {
  status: 'ERROR',
  message: 'Unauthorized'
};
// Results in GraphQLError with proper error code
```

### New Features

#### 1. Source Hooks
You can now target specific sources with `beforeSource` and `afterSource` hooks:

```json
{
  "hooks": {
    "beforeSource": {
      "users": [
        {
          "composer": "./hooks/authHook.js",
          "blocking": true
        }
      ]
    }
  }
}
```

#### 2. AfterAll Hooks
Execute code after GraphQL execution:

```json
{
  "hooks": {
    "afterAll": {
      "composer": "./hooks/loggingHook.js",
      "blocking": false
    }
  }
}
```

#### 3. State API
Access persistent state in your hooks:

```javascript
module.exports = {
  myHook: async ({ context }) => {
    const { state } = context;
    
    // Store data
    await state.put('user-session', 'session-data', { ttl: 3600 });
    
    // Retrieve data
    const session = await state.get('user-session');
    
    // Delete data
    await state.delete('user-session');
  }
};
```

### TypeScript Support

If you're using TypeScript, you can now import types for better development experience:

```typescript
import type { 
  HookFunction, 
  HookFunctionPayload, 
  HookResponse,
  BeforeSourceHookFunctionPayload,
  AfterSourceHookFunctionPayload,
  AfterAllHookFunctionPayload
} from '@adobe/plugin-hooks';

const myHook: HookFunction = async (payload: HookFunctionPayload) => {
  // Fully typed payload
};
```

### Testing

The package now includes comprehensive test coverage. You can run tests locally:

```bash
yarn test
yarn test --coverage
```

### Performance Considerations

- **Source hooks** are more efficient than global hooks as they only run for specific sources
- **Non-blocking hooks** don't affect response time
- **State API** provides persistent storage but has TTL limitations
- **Memoization** is automatically applied for better performance

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
