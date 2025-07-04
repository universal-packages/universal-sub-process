import { TestsRunner } from '@universal-packages/tests-runner'
import { Readable } from 'stream'

import SpawnEngine from './SpawnEngine'
import { evaluateTestResults } from './utils.test'

export async function spawnEngineTest() {
  const testsRunner = new TestsRunner({ runOrder: 'parallel' })

  testsRunner.describe('SpawnEngine', () => {
    testsRunner.test('should create instance with default options', () => {
      const engine = new SpawnEngine()

      testsRunner.expect(engine).toBeDefined()
      testsRunner.expect(engine.options).toBeDefined()
      testsRunner.expect(engine.options.shell).toBeDefined()
      testsRunner.expect(typeof engine.options.shell).toBe('string')
    })

    testsRunner.test('should create instance with custom options', () => {
      const customOptions = {
        shell: '/bin/bash',
        timeout: 5000,
        env: { CUSTOM_VAR: 'test' }
      }

      const engine = new SpawnEngine(customOptions)

      testsRunner.expect(engine.options.shell).toBe('/bin/bash')
      testsRunner.expect(engine.options.timeout).toBe(5000)
      testsRunner.expect(engine.options.env).toEqual({ CUSTOM_VAR: 'test' })
    })

    testsRunner.test('should merge custom options with defaults', () => {
      const customOptions = {
        timeout: 3000
      }

      const engine = new SpawnEngine(customOptions)

      testsRunner.expect(engine.options.timeout).toBe(3000)
      testsRunner.expect(engine.options.shell).toBeDefined() // Default shell should still be present
    })

    testsRunner.test('should spawn simple command successfully', async () => {
      const engine = new SpawnEngine()
      const input = new Readable()
      input.push(null) // End the stream

      const engineProcess = engine.run('echo', ['hello world'], {}, input)

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
      const engine = new SpawnEngine()
      const input = new Readable()
      input.push(null)

      const env = { TEST_SPAWN_VAR: 'spawn_test_value' }
      const engineProcess = engine.run('env', [], env, input)

      return new Promise((resolve) => {
        let stdout = ''

        engineProcess.on('stdout', (data) => {
          stdout += data.toString()
        })

        engineProcess.on('success', () => {
          testsRunner.expect(stdout).toContain('TEST_SPAWN_VAR=spawn_test_value')
          resolve(undefined)
        })

        engineProcess.on('failure', (code) => {
          throw new Error(`Process failed with code ${code}`)
        })
      })
    })

    testsRunner.test('should handle working directory', async () => {
      const engine = new SpawnEngine()
      const input = new Readable()
      input.push(null)

      const engineProcess = engine.run('pwd', [], {}, input, '/tmp')

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
      const engine = new SpawnEngine({ env: { ENGINE_VAR: 'engine_value' } })
      const input = new Readable()
      input.push(null)

      const runEnv = { RUN_VAR: 'run_value' }
      const engineProcess = engine.run('env', [], runEnv, input)

      return new Promise((resolve) => {
        let stdout = ''

        engineProcess.on('stdout', (data) => {
          stdout += data.toString()
        })

        engineProcess.on('success', () => {
          testsRunner.expect(stdout).toContain('ENGINE_VAR=engine_value')
          testsRunner.expect(stdout).toContain('RUN_VAR=run_value')
          resolve(undefined)
        })

        engineProcess.on('failure', (code) => {
          throw new Error(`Process failed with code ${code}`)
        })
      })
    })

    testsRunner.test('should handle process that exits with non-zero code', async () => {
      const engine = new SpawnEngine({ shell: false })
      const input = new Readable()
      input.push(null)

      const engineProcess = engine.run('node', ['-e', 'process.exit(42)'], {}, input)

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
      const engine = new SpawnEngine({ shell: false })
      const input = new Readable()
      input.push(null)

      const engineProcess = engine.run('node', ['-e', 'console.error("error message"); process.exit(1)'], {}, input)

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

    testsRunner.test('should handle process input stream', async () => {
      const engine = new SpawnEngine()
      const input = new Readable()

      const engineProcess = engine.run('cat', [], {}, input)

      // Send data to the process
      input.push('test input\n')
      input.push(null) // End the stream

      return new Promise((resolve) => {
        let stdout = ''

        engineProcess.on('stdout', (data) => {
          stdout += data.toString()
        })

        engineProcess.on('success', () => {
          testsRunner.expect(stdout.trim()).toBe('test input')
          resolve(undefined)
        })

        engineProcess.on('failure', (code) => {
          throw new Error(`Process failed with code ${code}`)
        })
      })
    })

    testsRunner.test('should handle process killing', async () => {
      const engine = new SpawnEngine({ shell: false })
      const input = new Readable()
      input.push(null)

      const engineProcess = engine.run('node', ['-e', 'setTimeout(() => {}, 10000)'], {}, input)

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
      const engine = new SpawnEngine()
      const input = new Readable()
      input.push(null)

      const engineProcess = engine.run('non-existent-command-xyz789', [], {}, input)

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
      const bashEngine = new SpawnEngine({ shell: '/bin/bash' })
      const zshEngine = new SpawnEngine({ shell: '/bin/zsh' })

      testsRunner.expect(bashEngine.options.shell).toBe('/bin/bash')
      testsRunner.expect(zshEngine.options.shell).toBe('/bin/zsh')
    })

    testsRunner.test('should handle shell commands through shell option', async () => {
      const engine = new SpawnEngine({ shell: true })
      const input = new Readable()
      input.push(null)

      // Test shell command with pipe - but spawn with shell: true should handle this
      const engineProcess = engine.run('echo hello && echo world', [], {}, input)

      return new Promise((resolve) => {
        let stdout = ''

        engineProcess.on('stdout', (data) => {
          stdout += data.toString()
        })

        engineProcess.on('success', () => {
          // Should contain both outputs
          testsRunner.expect(stdout).toContain('hello')
          testsRunner.expect(stdout).toContain('world')
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
