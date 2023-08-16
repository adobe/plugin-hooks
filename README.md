# Hooks Plugin

Hooks allow you to invoke a composable local or remote function on a targeted node.

+ Some use cases for the Hooks include:

+ Authenticating a user before all operations

Checking for an authorization token before making a request

Hooks increase processing time. Use them sparingly if processing time is important. Hooks are executed in the order you provide them. However, any blocking hooks execute before non-blocking hooks.

# Hook arguments

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