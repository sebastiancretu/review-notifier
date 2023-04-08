# EmptyTS

This project is a simple starter for TypeScript with some good start settings.

:!: Note: Settings/this file is configured for use in Windows, you might need to modify slashes in order to make it work.

## Beginners tip

The code is checked in without `node_modules`, so before running the code execute:

```bash
npm install
```

## Starting the program

There are several ways to run the code.

### Inside vscode

* Just press F5 in vscode
* Press ctrl-shift-p and choose "Debug: Select and start debugging"
* Using the UI


### Directly running .ts from command line

Use one of the following (depends on what you like)

```bash
node --transpile-only ./src/index.ts   # This one is faster!
npm start
```

### Compile to javascript and then run it

```bash
tsc -b -v
node dist/index.js
```

## eslint

Eslint is configured, run linting by executing:

```bash
npm run lint
```
