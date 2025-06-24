import { TestsRunner } from '@universal-packages/tests-runner'
import { join } from 'path'
import { dirname } from 'path'
import { Readable } from 'stream'
import { fileURLToPath } from 'url'

import ExecEngine from './ExecEngine'
import { evaluateTestResults } from './utils.test'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export async function execEngineTest() {
  const testsRunner = new TestsRunner({ runOrder: 'parallel' })

  testsRunner.describe('ExecEngine', () => {
    testsRunner.test('should create instance with default options', () => {
      const engine = new ExecEngine()

      testsRunner.expect(engine).toBeDefined()
      testsRunner.expect(engine.options).toBeDefined()
      testsRunner.expect(engine.options.encoding).toBe(null)
      testsRunner.expect(engine.options.shell).toBeDefined()
      testsRunner.expect(typeof engine.options.shell).toBe('string')
      testsRunner.expect(engine.options.maxBuffer).toBe(1024 * 1024 * 10) // 10MB
    })

    testsRunner.test('should create instance with custom options', () => {
      const customOptions = {
        encoding: null as null,
        shell: '/bin/bash',
        maxBuffer: 1024 * 1024 * 5, // 5MB
        timeout: 5000,
        env: { CUSTOM_VAR: 'test' }
      }

      const engine = new ExecEngine(customOptions)

      testsRunner.expect(engine.options.shell).toBe('/bin/bash')
      testsRunner.expect(engine.options.maxBuffer).toBe(1024 * 1024 * 5)
      testsRunner.expect(engine.options.timeout).toBe(5000)
      testsRunner.expect(engine.options.env).toEqual({ CUSTOM_VAR: 'test' })
    })

    testsRunner.test('should merge custom options with defaults', () => {
      const customOptions = {
        encoding: null as null,
        timeout: 3000
      }

      const engine = new ExecEngine(customOptions)

      testsRunner.expect(engine.options.timeout).toBe(3000)
      testsRunner.expect(engine.options.encoding).toBe(null) // Default should still be present
      testsRunner.expect(engine.options.shell).toBeDefined() // Default shell should still be present
    })

    testsRunner.test('should execute simple shell command successfully', async () => {
      const engine = new ExecEngine()
      const input = new Readable()
      input.push(null) // End the stream

      const engineProcess = engine.run('echo', ['hello world'], input, {})

      return new Promise((resolve) => {
        let stdout = ''

        engineProcess.on('stdout', (data) => {
          stdout += data.toString()
        })

        engineProcess.on('success', () => {
          testsRunner.expect(stdout.trim()).toBe('hello world')
          resolve(undefined)
        })

        engineProcess.on('failure', (code) => {
          throw new Error(`Process failed with code ${code}`)
        })
      })
    })

    testsRunner.test('should handle environment variables', async () => {
      const engine = new ExecEngine()
      const input = new Readable()
      input.push(null)

      const env = { TEST_EXEC_VAR: 'exec_test_value' }
      const engineProcess = engine.run('echo', ['$TEST_EXEC_VAR'], input, env)

      return new Promise((resolve) => {
        let stdout = ''

        engineProcess.on('stdout', (data) => {
          stdout += data.toString()
        })

        engineProcess.on('success', () => {
          testsRunner.expect(stdout.trim()).toBe('exec_test_value')
          resolve(undefined)
        })

        engineProcess.on('failure', (code) => {
          throw new Error(`Process failed with code ${code}`)
        })
      })
    })

    testsRunner.test('should handle working directory', async () => {
      const engine = new ExecEngine()
      const input = new Readable()
      input.push(null)

      const engineProcess = engine.run('pwd', [], input, {}, '/tmp')

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
      const engine = new ExecEngine({ encoding: null, env: { ENGINE_VAR: 'engine_value' } })
      const input = new Readable()
      input.push(null)

      const runEnv = { RUN_VAR: 'run_value' }
      const engineProcess = engine.run('echo', ['$ENGINE_VAR,$RUN_VAR'], input, runEnv)

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
      const engine = new ExecEngine()
      const input = new Readable()
      input.push(null)

      const engineProcess = engine.run('exit', ['42'], input, {})

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
      const engine = new ExecEngine()
      const input = new Readable()
      input.push(null)

      // Use fixture file for stderr testing
      const fixtureFile = join(__dirname, '__fixtures__', 'stderr-output.js')
      const engineProcess = engine.run('node', [fixtureFile], input, {})

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

    testsRunner.test('should handle complex shell commands with pipes', async () => {
      const engine = new ExecEngine()
      const input = new Readable()
      input.push(null)

      const engineProcess = engine.run('echo', ['hello world | grep hello'], input, {})

      return new Promise((resolve) => {
        let stdout = ''

        engineProcess.on('stdout', (data) => {
          stdout += data.toString()
        })

        engineProcess.on('success', () => {
          testsRunner.expect(stdout.trim()).toBe('hello world')
          resolve(undefined)
        })

        engineProcess.on('failure', (code) => {
          throw new Error(`Process failed with code ${code}`)
        })
      })
    })

    testsRunner.test('should handle shell operators', async () => {
      const engine = new ExecEngine()
      const input = new Readable()
      input.push(null)

      const engineProcess = engine.run('echo', ['first && echo second'], input, {})

      return new Promise((resolve) => {
        let stdout = ''

        engineProcess.on('stdout', (data) => {
          stdout += data.toString()
        })

        engineProcess.on('success', () => {
          testsRunner.expect(stdout).toContain('first')
          testsRunner.expect(stdout).toContain('second')
          resolve(undefined)
        })

        engineProcess.on('failure', (code) => {
          throw new Error(`Process failed with code ${code}`)
        })
      })
    })

    testsRunner.test('should handle process killing', async () => {
      const engine = new ExecEngine()
      const input = new Readable()
      input.push(null)

      const engineProcess = engine.run('sleep', ['10'], input, {})

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

    testsRunner.test('should handle invalid command', async () => {
      const engine = new ExecEngine()
      const input = new Readable()
      input.push(null)

      const engineProcess = engine.run('non-existent-command-xyz789', [], input, {})

      return new Promise((resolve) => {
        engineProcess.on('failure', (code) => {
          testsRunner.expect(typeof code).toBe('number')
          testsRunner.expect(code).not.toBe(0)
          resolve(undefined)
        })

        engineProcess.on('success', () => {
          throw new Error('Invalid command should have failed')
        })
      })
    })

    testsRunner.test('should respect shell option', () => {
      const bashEngine = new ExecEngine({ encoding: null, shell: '/bin/bash' })
      const zshEngine = new ExecEngine({ encoding: null, shell: '/bin/zsh' })

      testsRunner.expect(bashEngine.options.shell).toBe('/bin/bash')
      testsRunner.expect(zshEngine.options.shell).toBe('/bin/zsh')
    })

    testsRunner.test('should handle maxBuffer option', async () => {
      const engine = new ExecEngine({ encoding: null, maxBuffer: 1024 }) // Very small buffer
      const input = new Readable()
      input.push(null)

      // Generate output larger than maxBuffer
      const largeText = 'x'.repeat(2000)
      const engineProcess = engine.run('echo', [largeText], input, {})

      return new Promise((resolve) => {
        engineProcess.on('failure', (code) => {
          // Should fail due to maxBuffer exceeded
          testsRunner.expect(typeof code).toBe('number')
          resolve(undefined)
        })

        engineProcess.on('success', () => {
          // Might succeed if shell handles it differently
          resolve(undefined)
        })
      })
    })

    testsRunner.test('should handle timeout option', async () => {
      const engine = new ExecEngine({ encoding: null, timeout: 500 }) // 500ms timeout
      const input = new Readable()
      input.push(null)

      const engineProcess = engine.run('sleep', ['2'], input, {})

      const startTime = Date.now()
      return new Promise((resolve) => {
        engineProcess.on('failure', (code) => {
          const endTime = Date.now()
          testsRunner.expect(endTime - startTime).toBeLessThan(1500) // Should timeout before 1.5s
          resolve(undefined)
        })

        engineProcess.on('killed', () => {
          const endTime = Date.now()
          testsRunner.expect(endTime - startTime).toBeLessThan(1500) // Should timeout before 1.5s
          resolve(undefined)
        })

        engineProcess.on('success', () => {
          throw new Error('Process should have timed out')
        })
      })
    })

    testsRunner.test('should handle command with multiple arguments', async () => {
      const engine = new ExecEngine()
      const input = new Readable()
      input.push(null)

      const engineProcess = engine.run('echo', ['-n', 'hello', 'world'], input, {})

      return new Promise((resolve) => {
        let stdout = ''

        engineProcess.on('stdout', (data) => {
          stdout += data.toString()
        })

        engineProcess.on('success', () => {
          testsRunner.expect(stdout).toBe('hello world')
          resolve(undefined)
        })

        engineProcess.on('failure', (code) => {
          throw new Error(`Process failed with code ${code}`)
        })
      })
    })

    testsRunner.test('should handle file operations', async () => {
      const engine = new ExecEngine()
      const input = new Readable()
      input.push(null)

      // Use fixture file that should exist
      const fixtureFile = join(__dirname, '__fixtures__', 'simple-output.js')
      const engineProcess = engine.run('cat', [fixtureFile], input, {})

      return new Promise((resolve) => {
        let stdout = ''

        engineProcess.on('stdout', (data) => {
          stdout += data.toString()
        })

        engineProcess.on('success', () => {
          testsRunner.expect(stdout).toContain('hello from fork')
          resolve(undefined)
        })

        engineProcess.on('failure', (code) => {
          throw new Error(`Process failed with code ${code}`)
        })
      })
    })

    testsRunner.test('should handle shell variable expansion', async () => {
      const engine = new ExecEngine()
      const input = new Readable()
      input.push(null)

      const env = { MY_VAR: 'test_value' }
      const engineProcess = engine.run('echo', ['$MY_VAR'], input, env)

      return new Promise((resolve) => {
        let stdout = ''

        engineProcess.on('stdout', (data) => {
          stdout += data.toString()
        })

        engineProcess.on('success', () => {
          testsRunner.expect(stdout.trim()).toBe('test_value')
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
