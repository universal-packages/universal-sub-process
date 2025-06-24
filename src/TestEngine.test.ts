import { TestsRunner } from '@universal-packages/tests-runner'
import { Readable } from 'stream'

import TestEngine from './TestEngine'
import { evaluateTestResults } from './utils.test'

export async function testEngineTest() {
  const testsRunner = new TestsRunner({ runOrder: 'sequence' })

  testsRunner.describe('TestEngine', () => {
    testsRunner.beforeEach(() => {
      TestEngine.reset()
    })

    testsRunner.test('should record command history', async () => {
      const engine = new TestEngine()
      const input = new Readable()
      input.push(null)

      const engineProcess = engine.run('echo', ['hello'], input, { TEST_VAR: 'value' }, '/test/dir')

      return new Promise((resolve) => {
        engineProcess.on('success', () => {
          // Check the most recent entry, not the total length since other tests may have run
          const lastEntry = TestEngine.commandHistory[TestEngine.commandHistory.length - 1]
          testsRunner.expect(lastEntry.command).toBe('echo')
          testsRunner.expect(lastEntry.args).toEqual(['hello'])
          testsRunner.expect(lastEntry.env).toEqual({ TEST_VAR: 'value' })
          testsRunner.expect(lastEntry.workingDirectory).toBe('/test/dir')
          testsRunner.expect(lastEntry.events).toBeDefined()

          resolve(undefined)
        })
      })
    })

    testsRunner.test('should reset command history', () => {
      const initialLength = TestEngine.commandHistory.length
      const engine = new TestEngine()
      const input = new Readable()
      input.push(null)

      // Add some history
      engine.run('echo', ['test'], input, {})
      testsRunner.expect(TestEngine.commandHistory).toHaveLength(initialLength + 1)

      // Reset should clear history
      TestEngine.reset()
      testsRunner.expect(TestEngine.commandHistory).toHaveLength(0)
    })

    testsRunner.test('should handle built-in echo command', async () => {
      const engine = new TestEngine()
      const input = new Readable()
      input.push(null)

      const engineProcess = engine.run('echo', ['hello', 'world'], input, {})

      return new Promise((resolve) => {
        let stdout = ''

        engineProcess.on('stdout', (data) => {
          stdout += data.toString()
        })

        engineProcess.on('success', () => {
          testsRunner.expect(stdout.trim()).toBe('hello world')
          resolve(undefined)
        })
      })
    })

    testsRunner.test('should handle built-in sleep command', async () => {
      const engine = new TestEngine()
      const input = new Readable()
      input.push(null)

      const startTime = Date.now()
      const engineProcess = engine.run('sleep', ['200'], input, {}) // 200ms / 100 = 2ms actual sleep

      return new Promise((resolve) => {
        engineProcess.on('success', () => {
          const endTime = Date.now()
          testsRunner.expect(endTime - startTime).toBeGreaterThan(100) // Should have waited
          resolve(undefined)
        })
      })
    })

    testsRunner.test('should handle built-in failure command', async () => {
      const engine = new TestEngine()
      const input = new Readable()
      input.push(null)

      const engineProcess = engine.run('failure', ['Custom error message'], input, {})

      return new Promise((resolve) => {
        let stderr = ''

        engineProcess.on('stderr', (data) => {
          stderr += data.toString()
        })

        engineProcess.on('failure', (code) => {
          testsRunner.expect(code).toBe(1)
          testsRunner.expect(stderr).toBe('Custom error message')
          resolve(undefined)
        })
      })
    })

    testsRunner.test('should handle mocked process events - stdout', async () => {
      const engine = new TestEngine()
      const input = new Readable()
      input.push(null)

      // Mock events for a specific command
      TestEngine.mockProcessEvents({
        command: 'test-command',
        args: ['arg1'],
        env: { TEST: 'value' },
        events: [
          { type: 'stdout', data: 'mocked output' },
          { type: 'exit', code: 0 }
        ]
      })

      const engineProcess = engine.run('test-command', ['arg1'], input, { TEST: 'value' })

      return new Promise((resolve) => {
        let stdout = ''

        engineProcess.on('stdout', (data) => {
          stdout += data.toString()
        })

        engineProcess.on('success', () => {
          testsRunner.expect(stdout).toBe('mocked output')
          resolve(undefined)
        })
      })
    })

    testsRunner.test('should handle mocked process events - stderr', async () => {
      const engine = new TestEngine()
      const input = new Readable()
      input.push(null)

      TestEngine.mockProcessEvents({
        command: 'test-command',
        args: ['arg1'],
        env: {},
        events: [
          { type: 'stderr', data: 'error output' },
          { type: 'exit', code: 1 }
        ]
      })

      const engineProcess = engine.run('test-command', ['arg1'], input, {})

      return new Promise((resolve) => {
        let stderr = ''

        engineProcess.on('stderr', (data) => {
          stderr += data.toString()
        })

        engineProcess.on('failure', (code) => {
          testsRunner.expect(code).toBe(1)
          testsRunner.expect(stderr).toBe('error output')
          resolve(undefined)
        })
      })
    })

    testsRunner.test('should handle mocked process events - signal exit', async () => {
      const engine = new TestEngine()
      const input = new Readable()
      input.push(null)

      TestEngine.mockProcessEvents({
        command: 'test-command',
        args: [],
        env: {},
        events: [{ type: 'exit', signal: 'SIGTERM' }]
      })

      const engineProcess = engine.run('test-command', [], input, {})

      return new Promise((resolve) => {
        engineProcess.on('killed', (signal) => {
          testsRunner.expect(signal).toBe('SIGTERM')
          resolve(undefined)
        })
      })
    })

    testsRunner.test('should handle mocked process events with wait times', async () => {
      const engine = new TestEngine()
      const input = new Readable()
      input.push(null)

      TestEngine.mockProcessEvents({
        command: 'slow-command',
        args: [],
        env: {},
        events: [
          { type: 'stdout', data: 'first', wait: 50 },
          { type: 'stdout', data: 'second', wait: 50 },
          { type: 'exit', code: 0 }
        ]
      })

      const startTime = Date.now()
      const engineProcess = engine.run('slow-command', [], input, {})

      return new Promise((resolve) => {
        let stdout = ''

        engineProcess.on('stdout', (data) => {
          stdout += data.toString()
        })

        engineProcess.on('success', () => {
          const endTime = Date.now()
          testsRunner.expect(stdout).toBe('firstsecond')
          testsRunner.expect(endTime - startTime).toBeGreaterThan(100) // Should have waited
          resolve(undefined)
        })
      })
    })

    testsRunner.test('should handle process killing during mocked events', async () => {
      const engine = new TestEngine()
      const input = new Readable()
      input.push(null)

      TestEngine.mockProcessEvents({
        command: 'killable-command',
        args: [],
        env: {},
        events: [
          { type: 'stdout', data: 'before kill', wait: 50 },
          { type: 'stdout', data: 'after kill', wait: 100 } // This should not be reached
        ]
      })

      const engineProcess = engine.run('killable-command', [], input, {})

      // Kill the process after 75ms
      setTimeout(() => {
        engineProcess.kill('SIGTERM')
      }, 75)

      return new Promise((resolve) => {
        let stdout = ''

        engineProcess.on('stdout', (data) => {
          stdout += data.toString()
        })

        engineProcess.on('killed', (signal) => {
          testsRunner.expect(signal).toBe('SIGTERM')
          testsRunner.expect(stdout).toBe('before kill')
          resolve(undefined)
        })
      })
    })

    testsRunner.test('should handle mocked error events', async () => {
      const engine = new TestEngine()
      const input = new Readable()
      input.push(null)

      const testError = new Error('Mocked error')
      TestEngine.mockProcessEvents({
        command: 'error-command',
        args: [],
        env: {},
        events: [{ type: 'error', error: testError }]
      })

      testsRunner
        .expect(() => {
          engine.run('error-command', [], input, {})
        })
        .toThrow('Mocked error')
    })

    testsRunner.test('should match commands with exact environment and working directory', async () => {
      const engine = new TestEngine()
      const input1 = new Readable()
      const input2 = new Readable()
      input1.push(null)
      input2.push(null)

      // Mock for specific environment
      TestEngine.mockProcessEvents({
        command: 'env-test',
        args: [],
        env: { ENV1: 'value1' },
        workingDirectory: '/dir1',
        events: [
          { type: 'stdout', data: 'first mock' },
          { type: 'exit', code: 0 }
        ]
      })

      // Mock for different environment
      TestEngine.mockProcessEvents({
        command: 'env-test',
        args: [],
        env: { ENV2: 'value2' },
        workingDirectory: '/dir2',
        events: [
          { type: 'stdout', data: 'second mock' },
          { type: 'exit', code: 0 }
        ]
      })

      const process1 = engine.run('env-test', [], input1, { ENV1: 'value1' }, '/dir1')
      const process2 = engine.run('env-test', [], input2, { ENV2: 'value2' }, '/dir2')

      return Promise.all([
        new Promise<string>((resolve) => {
          let stdout = ''
          process1.on('stdout', (data) => (stdout += data.toString()))
          process1.on('success', () => resolve(stdout))
        }),
        new Promise<string>((resolve) => {
          let stdout = ''
          process2.on('stdout', (data) => (stdout += data.toString()))
          process2.on('success', () => resolve(stdout))
        })
      ]).then(([output1, output2]) => {
        testsRunner.expect(output1).toBe('first mock')
        testsRunner.expect(output2).toBe('second mock')
      })
    })

    testsRunner.test('should handle multiple mock events for same command', async () => {
      const engine = new TestEngine()

      // Add multiple mock sets for the same command
      TestEngine.mockProcessEvents({
        command: 'repeat-command',
        args: [],
        env: {},
        events: [
          { type: 'stdout', data: 'first run' },
          { type: 'exit', code: 0 }
        ]
      })

      TestEngine.mockProcessEvents({
        command: 'repeat-command',
        args: [],
        env: {},
        events: [
          { type: 'stdout', data: 'second run' },
          { type: 'exit', code: 0 }
        ]
      })

      // First run
      const input1 = new Readable()
      input1.push(null)
      const process1 = engine.run('repeat-command', [], input1, {})

      const firstResult = await new Promise<string>((resolve) => {
        let stdout = ''
        process1.on('stdout', (data) => (stdout += data.toString()))
        process1.on('success', () => resolve(stdout))
      })

      // Second run
      const input2 = new Readable()
      input2.push(null)
      const process2 = engine.run('repeat-command', [], input2, {})

      const secondResult = await new Promise<string>((resolve) => {
        let stdout = ''
        process2.on('stdout', (data) => (stdout += data.toString()))
        process2.on('success', () => resolve(stdout))
      })

      testsRunner.expect(firstResult).toBe('first run')
      testsRunner.expect(secondResult).toBe('second run')
    })

    testsRunner.test('should record events in command history', async () => {
      const engine = new TestEngine()
      const input = new Readable()
      input.push(null)

      TestEngine.mockProcessEvents({
        command: 'history-test',
        args: ['arg'],
        env: {},
        events: [
          { type: 'stdout', data: 'output' },
          { type: 'exit', code: 0 }
        ]
      })

      const engineProcess = engine.run('history-test', ['arg'], input, {})

      return new Promise((resolve) => {
        engineProcess.on('success', () => {
          const historyEntry = TestEngine.commandHistory[TestEngine.commandHistory.length - 1]
          testsRunner.expect(historyEntry.events).toHaveLength(2)
          testsRunner.expect(historyEntry.events![0].type).toBe('stdout')
          testsRunner.expect(historyEntry.events![0].data).toBe('output')
          testsRunner.expect(historyEntry.events![1].type).toBe('exit')
          testsRunner.expect(historyEntry.events![1].code).toBe(0)
          resolve(undefined)
        })
      })
    })

    testsRunner.test('should handle quote removal in echo command', async () => {
      const engine = new TestEngine()
      const input = new Readable()
      input.push(null)

      const engineProcess = engine.run('echo', ['"hello world"'], input, {})

      return new Promise((resolve) => {
        let stdout = ''

        engineProcess.on('stdout', (data) => {
          stdout += data.toString()
        })

        engineProcess.on('success', () => {
          testsRunner.expect(stdout.trim()).toBe('hello world')
          resolve(undefined)
        })
      })
    })

    testsRunner.test('should handle single quote removal in echo command', async () => {
      const engine = new TestEngine()
      const input = new Readable()
      input.push(null)

      const engineProcess = engine.run('echo', ["'hello world'"], input, {})

      return new Promise((resolve) => {
        let stdout = ''

        engineProcess.on('stdout', (data) => {
          stdout += data.toString()
        })

        engineProcess.on('success', () => {
          testsRunner.expect(stdout.trim()).toBe('hello world')
          resolve(undefined)
        })
      })
    })

    testsRunner.test('should handle default failure message', async () => {
      const engine = new TestEngine()
      const input = new Readable()
      input.push(null)

      const engineProcess = engine.run('failure', [], input, {})

      return new Promise((resolve) => {
        let stderr = ''

        engineProcess.on('stderr', (data) => {
          stderr += data.toString()
        })

        engineProcess.on('failure', (code) => {
          testsRunner.expect(code).toBe(1)
          testsRunner.expect(stderr).toBe('Command failed')
          resolve(undefined)
        })
      })
    })

    testsRunner.test('should handle kill during mocked stdout emission', async () => {
      const engine = new TestEngine()
      const input = new Readable()
      input.push(null)

      TestEngine.mockProcessEvents({
        command: 'kill-stdout-test',
        args: [],
        env: {},
        events: [
          { type: 'stdout', data: 'output before kill' },
          { type: 'stdout', data: 'this should not be seen' }
        ]
      })

      const engineProcess = engine.run('kill-stdout-test', [], input, {})

      // Kill the process after a short delay
      setTimeout(() => {
        engineProcess.kill('SIGTERM')
      }, 50)

      return new Promise((resolve) => {
        let stdout = ''

        engineProcess.on('stdout', (data) => {
          stdout += data.toString()
        })

        engineProcess.on('killed', (signal) => {
          testsRunner.expect(signal).toBe('SIGTERM')
          testsRunner.expect(stdout).toBe('output before kill')
          resolve(undefined)
        })
      })
    })

    testsRunner.test('should handle kill during mocked stderr emission', async () => {
      const engine = new TestEngine()
      const input = new Readable()
      input.push(null)

      TestEngine.mockProcessEvents({
        command: 'kill-stderr-test',
        args: [],
        env: {},
        events: [
          { type: 'stderr', data: 'error before kill' },
          { type: 'stderr', data: 'this should not be seen' }
        ]
      })

      const engineProcess = engine.run('kill-stderr-test', [], input, {})

      // Kill the process after a short delay
      setTimeout(() => {
        engineProcess.kill('SIGINT')
      }, 50)

      return new Promise((resolve) => {
        let stderr = ''

        engineProcess.on('stderr', (data) => {
          stderr += data.toString()
        })

        engineProcess.on('killed', (signal) => {
          testsRunner.expect(signal).toBe('SIGINT')
          testsRunner.expect(stderr).toBe('error before kill')
          resolve(undefined)
        })
      })
    })

    testsRunner.test('should handle kill during failure command execution', async () => {
      const engine = new TestEngine()
      const input = new Readable()
      input.push(null)

      const engineProcess = engine.run('failure', ['error message'], input, {})

      // Kill the process after a short delay
      setTimeout(() => {
        engineProcess.kill('SIGKILL')
      }, 50)

      return new Promise((resolve) => {
        let stderr = ''

        engineProcess.on('stderr', (data) => {
          stderr += data.toString()
        })

        engineProcess.on('killed', (signal) => {
          testsRunner.expect(signal).toBe('SIGKILL')
          testsRunner.expect(stderr).toBe('error message')
          resolve(undefined)
        })
      })
    })

    testsRunner.test('should handle kill during echo command execution', async () => {
      const engine = new TestEngine()
      const input = new Readable()
      input.push(null)

      const engineProcess = engine.run('echo', ['hello world'], input, {})

      // Kill the process after a short delay
      setTimeout(() => {
        engineProcess.kill('SIGUSR1')
      }, 50)

      return new Promise((resolve) => {
        let stdout = ''

        engineProcess.on('stdout', (data) => {
          stdout += data.toString()
        })

        engineProcess.on('killed', (signal) => {
          testsRunner.expect(signal).toBe('SIGUSR1')
          testsRunner.expect(stdout.trim()).toBe('hello world')
          resolve(undefined)
        })
      })
    })

    testsRunner.test('should handle kill right away', async () => {
      const engine = new TestEngine()
      const input = new Readable()
      input.push(null)

      const engineProcess = engine.run('echo', ['hello'], input, { TEST_VAR: 'value' }, '/test/dir')

      engineProcess.kill('SIGKILL')

      return new Promise((resolve) => {
        engineProcess.on('killed', () => {
          // Check the most recent entry, not the total length since other tests may have run
          const lastEntry = TestEngine.commandHistory[TestEngine.commandHistory.length - 1]
          testsRunner.expect(lastEntry.command).toBe('echo')
          testsRunner.expect(lastEntry.args).toEqual(['hello'])
          testsRunner.expect(lastEntry.env).toEqual({ TEST_VAR: 'value' })
          testsRunner.expect(lastEntry.workingDirectory).toBe('/test/dir')
          testsRunner.expect(lastEntry.events).toBeDefined()

          resolve(undefined)
        })
      })
    })
  })

  await testsRunner.run()

  evaluateTestResults(testsRunner)
}
