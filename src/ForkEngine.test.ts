import { TestsRunner } from '@universal-packages/tests-runner'
import { join } from 'path'
import { dirname } from 'path'
import { Readable } from 'stream'
import { fileURLToPath } from 'url'

import ForkEngine from './ForkEngine'
import { evaluateTestResults } from './utils.test'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export async function forkEngineTest() {
  const testsRunner = new TestsRunner({ runOrder: 'parallel' })

  testsRunner.describe('ForkEngine', () => {
    testsRunner.test('should create instance with default options', () => {
      const engine = new ForkEngine()

      testsRunner.expect(engine).toBeDefined()
      testsRunner.expect(engine.options).toBeDefined()
      testsRunner.expect(engine.options.silent).toBe(true)
    })

    testsRunner.test('should create instance with custom options', () => {
      const customOptions = {
        silent: false,
        execArgv: ['--max-old-space-size=4096'],
        env: { CUSTOM_VAR: 'test' }
      }

      const engine = new ForkEngine(customOptions)

      testsRunner.expect(engine.options.silent).toBe(false)
      testsRunner.expect(engine.options.execArgv).toEqual(['--max-old-space-size=4096'])
      testsRunner.expect(engine.options.env).toEqual({ CUSTOM_VAR: 'test' })
    })

    testsRunner.test('should merge custom options with defaults', () => {
      const customOptions = {
        execArgv: ['--inspect']
      }

      const engine = new ForkEngine(customOptions)

      testsRunner.expect(engine.options.execArgv).toEqual(['--inspect'])
      testsRunner.expect(engine.options.silent).toBe(true) // Default should still be present
    })

    testsRunner.test('should fork simple Node.js module successfully', async () => {
      const fixtureFile = join(__dirname, '__fixtures__', 'simple-output.js')

      const engine = new ForkEngine()
      const input = new Readable()
      input.push(null) // End the stream

      const engineProcess = engine.run(fixtureFile, [], {}, input)

      return new Promise((resolve) => {
        let stdout = ''

        engineProcess.on('stdout', (data) => {
          stdout += data.toString()
        })

        engineProcess.on('success', () => {
          testsRunner.expect(stdout.trim()).toBe('hello from fork')
          resolve(undefined)
        })

        engineProcess.on('failure', (code) => {
          throw new Error(`Process failed with code ${code}`)
        })
      })
    })

    testsRunner.test('should handle environment variables', async () => {
      const fixtureFile = join(__dirname, '__fixtures__', 'env-reader.js')

      const engine = new ForkEngine()
      const input = new Readable()
      input.push(null)

      const env = { TEST_FORK_VAR: 'fork_test_value' }
      const engineProcess = engine.run(fixtureFile, [], env, input)

      return new Promise((resolve) => {
        let stdout = ''

        engineProcess.on('stdout', (data) => {
          stdout += data.toString()
        })

        engineProcess.on('success', () => {
          testsRunner.expect(stdout.trim()).toBe('fork_test_value')
          resolve(undefined)
        })

        engineProcess.on('failure', (code) => {
          throw new Error(`Process failed with code ${code}`)
        })
      })
    })

    testsRunner.test('should handle working directory', async () => {
      const fixtureFile = join(__dirname, '__fixtures__', 'cwd-reporter.js')

      const engine = new ForkEngine()
      const input = new Readable()
      input.push(null)

      const engineProcess = engine.run(fixtureFile, [], {}, input, '/tmp')

      return new Promise((resolve) => {
        let stdout = ''

        engineProcess.on('stdout', (data) => {
          stdout += data.toString()
        })

        engineProcess.on('success', () => {
          // On macOS, /tmp is often a symlink to /private/tmp
          testsRunner.expect(stdout.trim()).toMatch(/^\/(?:private\/)?tmp$/)
          resolve(undefined)
        })

        engineProcess.on('failure', (code) => {
          throw new Error(`Process failed with code ${code}`)
        })
      })
    })

    testsRunner.test('should merge environment variables correctly', async () => {
      const fixtureFile = join(__dirname, '__fixtures__', 'env-merger.js')

      const engine = new ForkEngine({ env: { ENGINE_VAR: 'engine_value' } })
      const input = new Readable()
      input.push(null)

      const runEnv = { RUN_VAR: 'run_value' }
      const engineProcess = engine.run(fixtureFile, [], runEnv, input)

      return new Promise((resolve) => {
        let stdout = ''

        engineProcess.on('stdout', (data) => {
          stdout += data.toString()
        })

        engineProcess.on('success', () => {
          testsRunner.expect(stdout.trim()).toBe('engine_value,run_value')
          resolve(undefined)
        })

        engineProcess.on('failure', (code) => {
          throw new Error(`Process failed with code ${code}`)
        })
      })
    })

    testsRunner.test('should handle process that exits with non-zero code', async () => {
      const fixtureFile = join(__dirname, '__fixtures__', 'exit-code.js')

      const engine = new ForkEngine()
      const input = new Readable()
      input.push(null)

      const engineProcess = engine.run(fixtureFile, [], {}, input)

      return new Promise((resolve) => {
        engineProcess.on('failure', (code) => {
          testsRunner.expect(code).toBe(42)
          resolve(undefined)
        })

        engineProcess.on('success', () => {
          throw new Error('Process should have failed')
        })
      })
    })

    testsRunner.test('should capture stderr output', async () => {
      const fixtureFile = join(__dirname, '__fixtures__', 'stderr-output.js')

      const engine = new ForkEngine()
      const input = new Readable()
      input.push(null)

      const engineProcess = engine.run(fixtureFile, [], {}, input)

      return new Promise((resolve) => {
        let stderr = ''

        engineProcess.on('stderr', (data) => {
          stderr += data.toString()
        })

        engineProcess.on('failure', (code) => {
          testsRunner.expect(code).toBe(1)
          testsRunner.expect(stderr.trim()).toBe('error message')
          resolve(undefined)
        })

        engineProcess.on('success', () => {
          throw new Error('Process should have failed')
        })
      })
    })

    testsRunner.test('should handle process arguments', async () => {
      const fixtureFile = join(__dirname, '__fixtures__', 'args-reader.js')

      const engine = new ForkEngine()
      const input = new Readable()
      input.push(null)

      const engineProcess = engine.run(fixtureFile, ['arg1', 'arg2', 'arg3'], {}, input)

      return new Promise((resolve) => {
        let stdout = ''

        engineProcess.on('stdout', (data) => {
          stdout += data.toString()
        })

        engineProcess.on('success', () => {
          testsRunner.expect(stdout.trim()).toBe('Args: arg1,arg2,arg3')
          resolve(undefined)
        })

        engineProcess.on('failure', (code) => {
          throw new Error(`Process failed with code ${code}`)
        })
      })
    })

    testsRunner.test('should handle process killing', async () => {
      const fixtureFile = join(__dirname, '__fixtures__', 'kill-me.js')

      const engine = new ForkEngine()
      const input = new Readable()
      input.push(null)

      const engineProcess = engine.run(fixtureFile, [], {}, input)

      // Kill the process after a short delay
      setTimeout(() => {
        engineProcess.kill('SIGTERM')
      }, 100)

      return new Promise((resolve) => {
        engineProcess.on('killed', (signal) => {
          testsRunner.expect(signal).toBe('SIGTERM')
          resolve(undefined)
        })

        engineProcess.on('success', () => {
          throw new Error('Process should have been killed')
        })
      })
    })

    testsRunner.test('should handle invalid module path', async () => {
      const engine = new ForkEngine()
      const input = new Readable()
      input.push(null)

      const engineProcess = engine.run('non-existent-module.js', [], {}, input)

      return new Promise((resolve) => {
        engineProcess.on('failure', (code) => {
          testsRunner.expect(typeof code).toBe('number')
          testsRunner.expect(code).not.toBe(0)
          resolve(undefined)
        })

        engineProcess.on('success', () => {
          throw new Error('Invalid module should have failed')
        })
      })
    })

    testsRunner.test('should respect silent option', () => {
      const silentEngine = new ForkEngine({ silent: true })
      const nonSilentEngine = new ForkEngine({ silent: false })

      testsRunner.expect(silentEngine.options.silent).toBe(true)
      testsRunner.expect(nonSilentEngine.options.silent).toBe(false)
    })

    testsRunner.test('should handle execArgv option', () => {
      const engine = new ForkEngine({ execArgv: ['--max-old-space-size=2048', '--inspect'] })

      testsRunner.expect(engine.options.execArgv).toEqual(['--max-old-space-size=2048', '--inspect'])
    })

    testsRunner.test('should handle IPC communication', async () => {
      const fixtureFile = join(__dirname, '__fixtures__', 'ipc-handler.js')

      const engine = new ForkEngine()
      const input = new Readable()
      input.push(null)

      const engineProcess = engine.run(fixtureFile, [], {}, input)

      return new Promise((resolve) => {
        let stdout = ''

        engineProcess.on('stdout', (data) => {
          stdout += data.toString()
          // Once we see the ready message, kill the process (simplified test)
          if (stdout.includes('IPC ready')) {
            setTimeout(() => {
              engineProcess.kill('SIGTERM')
            }, 50)
          }
        })

        engineProcess.on('killed', () => {
          testsRunner.expect(stdout.trim()).toBe('IPC ready')
          resolve(undefined)
        })

        engineProcess.on('success', () => {
          testsRunner.expect(stdout.trim()).toBe('IPC ready')
          resolve(undefined)
        })

        engineProcess.on('failure', (code) => {
          throw new Error(`Process failed with code ${code}`)
        })
      })
    })
  })

  await testsRunner.run()

  evaluateTestResults(testsRunner)
}
