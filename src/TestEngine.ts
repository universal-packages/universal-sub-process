import { Readable } from 'stream'

import { EngineInterface } from './SubProcess.types'
import TestEngineProcess from './TestEngineProcess'

let TEST_ID = 0

interface HistoryEntry {
  command: string
  args: string[]
  input: string | Buffer | string[] | Buffer[] | Readable
  env: Record<string, string>
  workingDirectory: string
}

export default class TestEngine implements EngineInterface {
  public static readonly commandHistory: HistoryEntry[] = []

  public static errorCommand = 'error'
  public static failureCommand = 'failure'

  run(command: string, args: string[], input: Readable, env: Record<string, string>, workingDirectory: string): TestEngineProcess {
    TestEngine.commandHistory.push({ command, args, input, env, workingDirectory })

    let stdoutInterval: NodeJS.Timeout
    let closeTimeout: NodeJS.Timeout

    const testProcess = new TestEngineProcess(++TEST_ID, {
      kill: () => {
        clearInterval(stdoutInterval)
        clearTimeout(closeTimeout)
      }
    })

    if (TestEngine.errorCommand && command === TestEngine.errorCommand) {
      throw new Error('Command error')
    }

    if (TestEngine.failureCommand && command === TestEngine.failureCommand) {
      setTimeout(() => {
        testProcess.emit('stderr', Buffer.from('Command failure'))
        testProcess.emit('failure', 1)
      }, 100)

      return testProcess
    }

    stdoutInterval = setInterval(() => testProcess.emit('stdout', Buffer.from('Command stdout')), 200)
    closeTimeout = setTimeout(() => {
      clearInterval(stdoutInterval)
      testProcess.emit('success')
    }, 1000)

    return testProcess
  }
}
