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
  events?: MockEvent[]
}

interface MockEvent {
  type: 'stdout' | 'stderr' | 'exit' | 'error'
  data?: string
  code?: number
  signal?: NodeJS.Signals | number
  error?: Error
  wait?: number
}

export default class TestEngine implements EngineInterface {
  public static readonly commandHistory: HistoryEntry[] = []

  public static reset() {
    TestEngine.commandHistory.length = 0
    TestEngine.mockEvents = {}
  }

  public static mockProcessEvents(command: string, events: MockEvent[]) {
    if (!TestEngine.mockEvents[command]) TestEngine.mockEvents[command] = []
    TestEngine.mockEvents[command].push(events)
  }

  private static mockEvents: Record<string, MockEvent[][]> = {}

  run(command: string, args: string[], input: Readable, env: Record<string, string>, workingDirectory: string): TestEngineProcess {
    TestEngine.commandHistory.push({ command, args, input, env, workingDirectory, events: [] })

    let killWithSignal = null

    const commandEvents = TestEngine.mockEvents[command]
    const nextEvents = commandEvents && commandEvents.shift()

    if (nextEvents) {
      const errorEvent = nextEvents.find((event): boolean => event.type === 'error')

      if (errorEvent) {
        TestEngine.commandHistory[TestEngine.commandHistory.length - 1].events.push(errorEvent)

        throw errorEvent.error
      }
    }

    const testProcess = new TestEngineProcess(++TEST_ID, { kill: (signal: NodeJS.Signals | number) => (killWithSignal = signal) })

    // Wait for tests to kill the process if they want to
    setTimeout(async (): Promise<void> => {
      if (nextEvents) {
        for (let i = 0; i < nextEvents.length; i++) {
          const currentEvent = nextEvents[i]

          TestEngine.commandHistory[TestEngine.commandHistory.length - 1].events.push(currentEvent)

          if (currentEvent.wait) await new Promise((resolve) => setTimeout(resolve, currentEvent.wait))

          switch (currentEvent.type) {
            case 'stdout':
              testProcess.emit('stdout', Buffer.from(currentEvent.data))

              if (killWithSignal) {
                testProcess.emit('killed', killWithSignal)
                return
              }
              break
            case 'stderr':
              testProcess.emit('stderr', Buffer.from(currentEvent.data))

              if (killWithSignal) {
                testProcess.emit('killed', killWithSignal)
                return
              }
              break
            case 'exit':
              if (currentEvent.signal) {
                testProcess.emit('killed', currentEvent.signal)
              } else if (currentEvent.code) {
                testProcess.emit('failure', currentEvent.code)
              } else {
                testProcess.emit('success')
              }
              return
          }
        }

        if (killWithSignal) {
          testProcess.emit('killed', killWithSignal)
        } else {
          testProcess.emit('success')
        }
      } else {
        if (killWithSignal) {
          testProcess.emit('killed', killWithSignal)
        } else {
          testProcess.emit('success')
        }
      }
    }, 100)

    return testProcess
  }
}
