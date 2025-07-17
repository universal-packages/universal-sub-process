# Sub Process

[![npm version](https://badge.fury.io/js/@universal-packages%2Fsub-process.svg)](https://www.npmjs.com/package/@universal-packages/sub-process)
[![Testing](https://github.com/universal-packages/universal-sub-process/actions/workflows/testing.yml/badge.svg)](https://github.com/universal-packages/universal-sub-process/actions/workflows/testing.yml)
[![codecov](https://codecov.io/gh/universal-packages/universal-sub-process/branch/main/graph/badge.svg?token=CXPJSN8IGL)](https://codecov.io/gh/universal-packages/universal-sub-process)

Sub process encapsulation for different exec techniques.

## Install

```shell
npm install @universal-packages/sub-process
```

# Usage

## SubProcess `class`

The `SubProcess` class extends [BaseRunner](https://github.com/universal-packages/universal-base-runner) to provide a unified API for executing system processes with different engines. It handles process lifecycle, stream capture, and provides event-driven monitoring.

```ts
import { SubProcess } from '@universal-packages/sub-process'

const subProcess = new SubProcess({
  command: 'echo "Hello World"',
  args: ['--verbose'],
  env: { NODE_ENV: 'production' },
  captureStreams: true
})

await subProcess.run()

console.log(subProcess.stdout) // "Hello World"
console.log(subProcess.exitCode) // 0
```

### Constructor <small><small>`constructor`</small></small>

```ts
new SubProcess(options: SubProcessOptions)
```

#### SubProcessOptions

Extends [BaseRunnerOptions](https://github.com/universal-packages/universal-base-runner?tab=readme-ov-file#baserunneroptions) with the following additional options:

- **`command`** `string` **required**
  Command to run. Can include arguments as part of the command string.

- **`args`** `string[]` (optional)
  Additional arguments to pass to the command. These will be appended to any arguments already present in the command string.

- **`captureStreams`** `boolean` (default: `false`)
  Whether to capture stdout and stderr streams. When enabled, the output will be available through the `stdout` and `stderr` properties.

- **`engine`** `EngineInterface | 'spawn' | 'exec' | 'fork' | 'test'` (default: `'spawn'`)
  Instance of the engine to be used to execute the process or a string identifying the engine adapter.

  - **`'spawn'`**: Uses Node.js child_process.spawn (default)
  - **`'exec'`**: Uses Node.js child_process.exec
  - **`'fork'`**: Uses Node.js child_process.fork
  - **`'test'`**: Uses a test engine for unit testing

- **`engineOptions`** `Record<string, any>` (optional)
  Options to pass to the engine if resolved as adapter.

- **`env`** `Record<string, string>` (optional)
  Environment variables to pass to the process. These will be merged with the current process environment.

- **`input`** `string | Buffer | string[] | Buffer[] | Readable` (optional)
  Input to pass to the process stdin automatically during the process lifecycle. When provided, all input is made available immediately when the process starts. For manual input control during execution, omit this option and use `pushInput()` and `closeInput()` methods instead. Useful when a process requires user input like yes/no questions or configuration input.

- **`workingDirectory`** `string` (optional)
  Working directory to run the process in. Defaults to the current working directory.

- **`processIndex`** `number` (optional)
  Process index to be used for the process. This is useful when you want to identify the process in an orchestration.

### Instance Methods

In addition to [BaseRunner methods](https://github.com/universal-packages/universal-base-runner?tab=readme-ov-file#instance-methods), SubProcess provides:

#### **`kill(signal?: NodeJS.Signals | number)`** **`async`**

Kills the process if it is running. Optionally specify a signal to send to the process.

```ts
// Kill with default signal
await subProcess.kill()

// Kill with specific signal
await subProcess.kill('SIGTERM')
await subProcess.kill(9) // SIGKILL
```

#### **`pushInput(input: string | Buffer | string[] | Buffer[])`**

Sends input chunks to the running process stdin. This method is used when you want to provide input manually during the process execution rather than providing all input upfront through options.

```ts
const subProcess = new SubProcess({
  command: 'node -e "process.stdin.on(\'data\', d => console.log(d.toString()))"',
  captureStreams: true
})

await subProcess.run()

// Send input chunks manually
subProcess.pushInput('First chunk\n')
subProcess.pushInput('Second chunk\n')
subProcess.closeInput() // Signal end of input
```

#### **`closeInput()`**

Closes the stdin stream to signal that no more input will be provided. This should be called after all input chunks have been sent via `pushInput()`.

### Instance Properties

In addition to [BaseRunner properties](https://github.com/universal-packages/universal-base-runner?tab=readme-ov-file#getters), SubProcess provides:

#### **`stdout`** **`string`**

String containing the stdout output of the process. Only available when `captureStreams` option is enabled.

```ts
const subProcess = new SubProcess({
  command: 'echo "Hello"',
  captureStreams: true
})
await subProcess.run()
console.log(subProcess.stdout) // "Hello\n"
```

#### **`stderr`** **`string`**

String containing the stderr output of the process. Only available when `captureStreams` option is enabled.

#### **`exitCode`** **`number`**

Exit code of the process. `0` indicates success, non-zero values indicate errors.

#### **`signal`** **`string | number`**

Signal that killed the process, if applicable.

#### **`processId`** **`number`**

Process ID of the running or completed process.

#### **`processIndex`** **`number`**

Process index of the running or completed process.

### Events

SubProcess extends [BaseRunner events](https://github.com/universal-packages/universal-base-runner?tab=readme-ov-file#events) with additional process-specific events:

#### **`stdout`**: Emitted when the process writes to stdout

```ts
subProcess.on('stdout', (event) => {
  console.log('Output:', event.payload.data)
})
```

#### **`stderr`**: Emitted when the process writes to stderr

```ts
subProcess.on('stderr', (event) => {
  console.log('Error output:', event.payload.data)
})
```

## Engine System

SubProcess supports different execution engines for various use cases:

### Creating a Custom Engine

```ts
import { EngineInterface } from '@universal-packages/sub-process'

import MyEngine from './MyEngine'

const subProcess = new SubProcess({ engine: new MyEngine() })
```

### Engine Process Implementation

You need to implement an engine process representation by extending the `EngineProcess` class to provide a way to control your custom process.

```ts
import { EngineProcess } from '@universal-packages/sub-process'

export default class MyEngineProcess extends EngineProcess {
  killObject(signal?: NodeJS.Signals | number): void {
    this.object.sendKillSignal(signal)
  }
}
```

### Engine Implementation

The `run` method of the engine will be called with the command, args, input, env, and working directory to execute the process and return an `EngineProcess` instance.

```ts
import { EngineInterface } from '@universal-packages/sub-process'

export default class MyEngine implements EngineInterface {
  constructor(options?: any) {
    // Options passed through the adapter sub-system
  }

  async prepare(): Promise<void> {
    // Initialize any connections or resources using options
  }

  async release(): Promise<void> {
    // Release any resources or close any connections
  }

  async run(command: string, args: string[], input: Readable, env: Record<string, string>, workingDirectory?: string): Promise<EngineProcess> {
    const myExecutableObject = myExecutionMethod.exec(command, args, input, env, workingDirectory)
    const engineProcess = new MyEngineProcess(myExecutableObject.processId, myExecutableObject)

    // Set up event handlers for the process
    myExecutableObject.on('data', (data) => engineProcess.emit('stdout', data))
    myExecutableObject.on('error', (data) => engineProcess.emit('stderr', data))
    myExecutableObject.on('exit', (code) => {
      if (code === 0) {
        engineProcess.emit('success')
      } else {
        engineProcess.emit('failure', code)
      }
    })

    return engineProcess
  }
}
```

### EngineInterface

If you are using TypeScript, implement the `EngineInterface` in your class to ensure the correct implementation.

```ts
import { EngineInterface } from '@universal-packages/sub-process'

export default class MyEngine implements EngineInterface {
  prepare?(): Promise<void> {
    // Optional preparation logic
  }

  release?(): Promise<void> {
    // Optional cleanup logic
  }

  run(command: string, args: string[], input: Readable, env: Record<string, string>, workingDirectory?: string): EngineProcess | Promise<EngineProcess> {
    // Required implementation
  }
}
```

## Usage Examples

### Basic Command Execution

```ts
import { SubProcess } from '@universal-packages/sub-process'

const subProcess = new SubProcess({
  command: 'ls -la',
  captureStreams: true
})

await subProcess.run()
console.log(subProcess.stdout)
```

### Environment Variables

```ts
const subProcess = new SubProcess({
  command: 'node -e "console.log(process.env.MY_VAR)"',
  env: { MY_VAR: 'Hello World' },
  captureStreams: true
})

await subProcess.run()
console.log(subProcess.stdout) // "Hello World"
```

### Process Input

SubProcess supports two methods for providing input to processes:

#### Automatic Input (via options)

When you provide input through the `input` option, all input is automatically provided to the process during its lifecycle:

```ts
const subProcess = new SubProcess({
  command: 'node -e "process.stdin.on(\'data\', d => console.log(d.toString()))"',
  input: 'Hello from input',
  captureStreams: true
})

await subProcess.run()
// All input is provided automatically when the process starts
```

#### Manual Input (via methods)

When you need to control input timing or provide input dynamically, omit the `input` option and use `pushInput()` and `closeInput()` methods:

```ts
const subProcess = new SubProcess({
  command: "node -e \"let data = ''; process.stdin.on('data', d => { data += d; }); process.stdin.on('end', () => console.log('Received:', data));\"",
  captureStreams: true
})

// Start the process
subProcess.run()

// Send input chunks manually during execution
setTimeout(() => subProcess.pushInput('First chunk\n'), 100)
setTimeout(() => subProcess.pushInput('Second chunk\n'), 200)
setTimeout(() => subProcess.closeInput(), 300) // Signal end of input
```

### Working Directory

```ts
const subProcess = new SubProcess({
  command: 'pwd',
  workingDirectory: '/tmp',
  captureStreams: true
})

await subProcess.run()
console.log(subProcess.stdout) // "/tmp"
```

### Event Monitoring

```ts
const subProcess = new SubProcess({
  command: 'ping -c 3 google.com',
  captureStreams: true
})

subProcess.on('stdout', (event) => {
  console.log('Real-time output:', event.payload.data)
})

subProcess.on('succeeded', () => {
  console.log('Ping completed successfully')
})

await subProcess.run()
```

### Error Handling

```ts
const subProcess = new SubProcess({
  command: 'exit 1',
  captureStreams: true
})

try {
  await subProcess.run()
} catch (error) {
  console.log('Exit code:', subProcess.exitCode) // 1
  console.log('Error message:', error.message)
}
```

### Different Engines

```ts
// Spawn engine (default)
const spawnProcess = new SubProcess({
  command: 'echo "Hello"',
  engine: 'spawn'
})

// Exec engine for shell commands
const execProcess = new SubProcess({
  command: 'echo "Current directory: $(pwd)"',
  engine: 'exec'
})

// Fork engine for Node.js scripts
const forkProcess = new SubProcess({
  command: 'node',
  args: ['-e', 'console.log("Fork engine")'],
  engine: 'fork'
})
```

## Typescript

This library is developed in TypeScript and shipped fully typed.

## Contributing

The development of this library happens in the open on GitHub, and we are grateful to the community for contributing bugfixes and improvements. Read below to learn how you can take part in improving this library.

- [Code of Conduct](./CODE_OF_CONDUCT.md)
- [Contributing Guide](./CONTRIBUTING.md)

### License

[MIT licensed](./LICENSE).
