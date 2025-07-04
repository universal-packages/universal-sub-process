import { TestsRunner } from '@universal-packages/tests-runner'
import { EventEmitter } from 'events'
import { Readable } from 'stream'

import BaseChildProcessEngine from './BaseChildProcessEngine'
import { evaluateTestResults } from './utils.test'

// Create a test implementation that allows us to control error scenarios
class TestChildProcessEngine extends BaseChildProcessEngine {
  protected override createChildProcess(): any {
    const mockChildProcess = new EventEmitter() as any

    // Simulate stdout/stderr streams
    mockChildProcess.stdout = new EventEmitter()
    mockChildProcess.stderr = new EventEmitter()
    mockChildProcess.stdin = new EventEmitter()
    mockChildProcess.pid = 123

    // Add proper pipe method to stdin and end method
    mockChildProcess.stdin.pipe = () => {}
    mockChildProcess.stdin.end = () => {}

    // Simulate an error followed by close to test the error.code path
    setTimeout(() => {
      const error = new Error('Test error') as any
      error.code = 'ENOENT'
      error.errno = -2

      // First emit error (which sets this.error)
      mockChildProcess.emit('error', error)

      // Then emit close with non-zero code to trigger the error.code path
      setTimeout(() => {
        mockChildProcess.emit('close', 1, null)
      }, 10)
    }, 50)

    return mockChildProcess
  }
}

export async function baseChildProcessEngineTest() {
  const testsRunner = new TestsRunner({ runOrder: 'parallel' })

  testsRunner.describe('BaseChildProcessEngine', () => {
    testsRunner.test('should use error.code when error exists and process closes with non-zero code', async () => {
      const engine = new TestChildProcessEngine()
      const input = new Readable()
      input.push(null)

      const engineProcess = engine.run('test-command', [], {}, input)

      return new Promise((resolve) => {
        let errorEmitted = false
        let failureCode: any = null

        engineProcess.on('stderr', () => {
          // This confirms the error event was processed
          errorEmitted = true
        })

        // The first failure event comes from the error handler
        let firstFailureReceived = false

        engineProcess.on('failure', (code) => {
          if (!firstFailureReceived) {
            firstFailureReceived = true
            // This is the first failure event from the error handler (errno)
            testsRunner.expect(errorEmitted).toBe(true)
            testsRunner.expect(code).toBe(-2) // errno value
            return
          }

          // This is the second failure event from the close handler (error.code)
          failureCode = code
          testsRunner.expect(failureCode).toBe('ENOENT')
          resolve(undefined)
        })
      })
    })

    testsRunner.test('should throw error when createChildProcess is not implemented', () => {
      const baseEngine = new BaseChildProcessEngine()
      const input = new Readable()
      input.push(null)

      testsRunner
        .expect(() => {
          baseEngine.run('test', [], {}, input)
        })
        .toThrow('Method createChildProcess not implemented.')
    })

    testsRunner.test('should prepend shell source script when shell is a string', () => {
      const engine = new BaseChildProcessEngine()

      const result = (engine as any).prependShellSourceScript('echo test', 'bash')
      testsRunner.expect(result).toBe('source ~/.bashrc &> /dev/null; echo test')
    })

    testsRunner.test('should not prepend shell source script when shell is not a string', () => {
      const engine = new BaseChildProcessEngine()

      const result1 = (engine as any).prependShellSourceScript('echo test', true)
      const result2 = (engine as any).prependShellSourceScript('echo test', false)

      testsRunner.expect(result1).toBe('echo test')
      testsRunner.expect(result2).toBe('echo test')
    })

    testsRunner.test('should get shell name from environment', () => {
      const engine = new BaseChildProcessEngine()
      const originalShell = process.env.SHELL

      // Test with shell set
      process.env.SHELL = '/bin/zsh'
      let shellName = (engine as any).getShellName()
      testsRunner.expect(shellName).toBe('zsh')

      // Test fallback to bash
      delete process.env.SHELL
      shellName = (engine as any).getShellName()
      testsRunner.expect(shellName).toBe('bash')

      // Restore original
      if (originalShell) {
        process.env.SHELL = originalShell
      }
    })
  })

  await testsRunner.run()

  evaluateTestResults(testsRunner)
}
