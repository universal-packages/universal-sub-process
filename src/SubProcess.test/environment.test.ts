import { TestsRunner } from '@universal-packages/tests-runner'

import SubProcess from '../SubProcess'
import { evaluateTestResults } from '../utils.test'

export async function environmentTest() {
  const testsRunner = new TestsRunner({ runOrder: 'parallel' })

  testsRunner.describe('SubProcess - Environment', () => {
    testsRunner.test('should pass environment variables to process', async () => {
      const subProcess = new SubProcess({
        command: 'node -e "console.log(process.env.TEST_VAR)"',
        env: { TEST_VAR: 'Hello from env' },
        captureStreams: true,
        engine: 'exec' // Use exec engine for shell command parsing
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout.trim()).toBe('Hello from env')
    })

    testsRunner.test('should handle multiple environment variables', async () => {
      const subProcess = new SubProcess({
        command: "node -e \"console.log(process.env.VAR1 + '-' + process.env.VAR2 + '-' + process.env.VAR3)\"",
        env: {
          VAR1: 'first',
          VAR2: 'second',
          VAR3: 'third'
        },
        captureStreams: true,
        engine: 'exec'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout.trim()).toBe('first-second-third')
    })

    testsRunner.test('should handle environment variables with special characters', async () => {
      const subProcess = new SubProcess({
        command: 'node -e "console.log(process.env.SPECIAL_VAR)"',
        env: { SPECIAL_VAR: 'Hello! @#$%^&*()_+{}|:"<>?`~' },
        captureStreams: true,
        engine: 'exec'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout.trim()).toBe('Hello! @#$%^&*()_+{}|:"<>?`~')
    })

    testsRunner.test('should handle empty environment variables', async () => {
      const subProcess = new SubProcess({
        command: "node -e \"console.log('[' + process.env.EMPTY_VAR + ']')\"",
        env: { EMPTY_VAR: '' },
        captureStreams: true,
        engine: 'exec'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout.trim()).toBe('[]')
    })

    testsRunner.test('should handle undefined environment variables', async () => {
      const subProcess = new SubProcess({
        command: 'node -e "console.log(process.env.UNDEFINED_VAR === undefined ? \'undefined\' : process.env.UNDEFINED_VAR)"',
        env: {},
        captureStreams: true,
        engine: 'exec'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout.trim()).toBe('undefined')
    })

    testsRunner.test('should work without environment variables', async () => {
      const subProcess = new SubProcess({
        command: 'echo no env vars',
        captureStreams: true,
        engine: 'exec'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout.trim()).toBe('no env vars')
    })

    testsRunner.test('should handle numeric environment variables', async () => {
      const subProcess = new SubProcess({
        command: 'node -e "console.log(typeof process.env.NUMBER_VAR, process.env.NUMBER_VAR)"',
        env: { NUMBER_VAR: '12345' },
        captureStreams: true,
        engine: 'exec'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout.trim()).toBe('string 12345')
    })

    testsRunner.test('should handle boolean-like environment variables', async () => {
      const subProcess = new SubProcess({
        command: 'node -e "console.log(process.env.BOOL_TRUE, process.env.BOOL_FALSE)"',
        env: {
          BOOL_TRUE: 'true',
          BOOL_FALSE: 'false'
        },
        captureStreams: true,
        engine: 'exec'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout.trim()).toBe('true false')
    })

    testsRunner.test('should handle working directory changes', async () => {
      const subProcess = new SubProcess({
        command: 'pwd',
        workingDirectory: '/tmp',
        captureStreams: true,
        engine: 'exec'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('succeeded')
      // On macOS, /tmp is often a symlink to /private/tmp
      testsRunner.expect(subProcess.stdout.trim()).toMatch(/^\/(?:private\/)?tmp$/)
    })

    testsRunner.test('should handle relative working directory', async () => {
      const subProcess = new SubProcess({
        command: 'pwd',
        workingDirectory: '.',
        captureStreams: true,
        engine: 'exec'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout.trim()).toBeDefined()
      testsRunner.expect(subProcess.stdout.trim().length).toBeGreaterThan(0)
    })

    testsRunner.test('should combine environment variables and working directory', async () => {
      const subProcess = new SubProcess({
        command: 'node -e "console.log(process.env.TEST_VAR + \' in \' + process.cwd())"',
        env: { TEST_VAR: 'Environment test' },
        workingDirectory: '/tmp',
        captureStreams: true,
        engine: 'exec'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('succeeded')
      // On macOS, /tmp is often a symlink to /private/tmp
      testsRunner.expect(subProcess.stdout.trim()).toMatch(/^Environment test in \/(?:private\/)?tmp$/)
    })

    testsRunner.test('should handle large environment variables', async () => {
      const largeValue = 'A'.repeat(10000) // 10KB string
      const subProcess = new SubProcess({
        command: 'node -e "console.log(process.env.LARGE_VAR.length)"',
        env: { LARGE_VAR: largeValue },
        captureStreams: true,
        engine: 'exec'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout.trim()).toBe('10000')
    })

    testsRunner.test('should handle environment variables with newlines', async () => {
      const subProcess = new SubProcess({
        command: 'node -e "console.log(JSON.stringify(process.env.MULTILINE_VAR))"',
        env: { MULTILINE_VAR: 'Line 1\nLine 2\nLine 3' },
        captureStreams: true,
        engine: 'exec'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout.trim()).toBe('"Line 1\\nLine 2\\nLine 3"')
    })

    testsRunner.test('should handle Unicode in environment variables', async () => {
      const subProcess = new SubProcess({
        command: 'node -e "console.log(process.env.UNICODE_VAR)"',
        env: { UNICODE_VAR: '🚀 Hello 世界 ñoño' },
        captureStreams: true,
        engine: 'exec'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout.trim()).toBe('🚀 Hello 世界 ñoño')
    })

    testsRunner.test('should handle JSON in environment variables', async () => {
      const jsonValue = JSON.stringify({ key: 'value', number: 42, array: [1, 2, 3] })
      const subProcess = new SubProcess({
        command: 'node -e "const obj = JSON.parse(process.env.JSON_VAR); console.log(obj.key + \'-\' + obj.number)"',
        env: { JSON_VAR: jsonValue },
        captureStreams: true,
        engine: 'exec'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout.trim()).toBe('value-42')
    })
  })

  await testsRunner.run()

  evaluateTestResults(testsRunner)
}
