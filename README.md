# Sub SubProcess

[![npm version](https://badge.fury.io/js/@universal-packages%2Fprocesses.svg)](https://www.npmjs.com/package/@universal-packages/sub-process)
[![Testing](https://github.com/universal-packages/universal-sub-process/actions/workflows/testing.yml/badge.svg)](https://github.com/universal-packages/universal-sub-process/actions/workflows/testing.yml)
[![codecov](https://codecov.io/gh/universal-packages/universal-sub-process/branch/main/graph/badge.svg?token=CXPJSN8IGL)](https://codecov.io/gh/universal-packages/universal-sub-process)

Sub process encapsulation for different exec technics.

## Install

```shell
npm install @universal-packages/sub-process
```

## SubProcess

SubProcess is the main interface to setup a process to run at whenever time and only once.

```js
import { SubProcess } from '@universal-packages/sub-process'

const subProcess = new SubProcess({ command: 'echo', args: ['$VARIABLE'], env: { VARIABLE: 'value' } })

await subProcess.run()

console.log(subProcess.stdout.toString())
```

### Options

- **`args`** `string[]`
  Arguments to pass to the command.
- **`command`** `string`
  Command to run.
- **`engine`** `Engine | 'spawn' | 'exec' | 'fork' | 'test'` `default: spawn`
  Instance of the engine to be used to execute the process or a string identifying the engine adapter.
- **`engineOptions`** `Object`
  Options to pass to the engine if resolved as adapter.
- **`env`** `Object`
  Environment variables to pass to the process.
- **`input`** `string | Buffer | string[] | Buffer[] | Readable`
  Input to pass to the process. For example when a process requires any kind of input like a yes/no question.
- **`timeout`** `number`
  Time to wait in milliseconds before killing the process.
- **`workingDirectory`** `string`
  Working directory to run the process in.

### Instance methods

#### **`prepare()`** **`async`**

Initialize the internal engine in case it needs preparation.

#### **`release()`** **`async`**

Releases the engine resources in case they need to be disposed after finishing the process.

#### **`run()`** **`async`**

Runs the process and waits for it to finish.

#### **`kill([signal: string])`** **`async`**

Kills the process if it is running.

#### **`waitForStatus(status: string)`** **`async`**

Waits for the process to reach a specific status or an status in the same level, for example `success` or `failure` will wait for the process to finish with any of those statuses.

### Instance properties

#### **`stdout`** **`Buffer`**

Buffer containing the stdout of the process.

#### **`stderr`** **`Buffer`**

Buffer containing the stderr of the process.

#### **`exitCode`** **`number`**

Exit code of the process.

#### **`signal`** **`string`**

Signal that killed the process.

#### **`processId`** **`number`**

Process id of the process.

#### **`status`** **`idle | running | success | error | failure | killed | stopped | killing | stopping`**

Status of the process.

### Events

`SubProcess` will emit events regarding execution status and output.

```js
subProcess.on('*', (event) => console.log(event))
subProcess.on('running', (event) => console.log(event))
subProcess.on('stdout', (event) => console.log(event))
subProcess.on('stderr', (event) => console.log(event))
subProcess.on('success', (event) => console.log(event))
subProcess.on('failure', (event) => console.log(event))
subProcess.on('stopping', (event) => console.log(event))
subProcess.on('stopped', (event) => console.log(event))
subProcess.on('end', (event) => console.log(event))
subProcess.on('timeout', (event) => console.log(event))
subProcess.on('error', (event) => console.log(event))
subProcess.on('warning', (event) => console.log(event))
```

## Engine

To create an engine that suits your requirements you just need to implement new classes and use them as the following:

```js
import MyEngine from './MyEngine'

const subProcess = new SubProcess({ engine: new MyEngine() })
```

You need to implement a engine process representation by subclassify the `EngineProcess` class to provide a way to kill yur custom process.

```js
import { EngineProcess } from '@universal-packages/sub-process'

export default class MyEngineProcess extends EngineProcess {
  killObject(signal) {
    this.object.sendKillSignal(signal)
  }
}
```

The run method of the engine will be called with the command, args, input and env to execute the process and return an `EngineProcess` instance.

```js
export default class MyEngine {
  constructor(options) {
    // Options passed through the adapters sub system
  }

  prepare() {
    // Initialize any connection using options
  }

  release() {
    // Release any resources or close any connection
  }

  run(command, args, input, env) {
    const myExecutableObject = myExecutionMethod.exec(command, args, input, env)
    const engineProcess = new MyEngineProcess(myExecutableObject.processId, myExecutableObject)

    // Now the SubProcess instance knows how to kill the process when needed as well as the process id.
    return engineProcess
  }
}
```

### EngineInterface

If you are using TypeScript just implement the `EngineInterface` in your class to ensure the right implementation.

```ts
import { EngineInterface } from '@universal-packages/sub-process'

export default class MyEngine implements EngineInterface {}
```

## Typescript

This library is developed in TypeScript and shipped fully typed.

## Contributing

The development of this library happens in the open on GitHub, and we are grateful to the community for contributing bugfixes and improvements. Read below to learn how you can take part in improving this library.

- [Code of Conduct](./CODE_OF_CONDUCT.md)
- [Contributing Guide](./CONTRIBUTING.md)

### License

[MIT licensed](./LICENSE).
