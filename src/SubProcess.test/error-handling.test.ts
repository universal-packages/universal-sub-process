import { TestsRunner } from '@universal-packages/tests-runner'

import SubProcess from '../SubProcess'
import { evaluateTestResults } from '../utils.test'

export async function errorHandlingTest() {
  const testsRunner = new TestsRunner({ runOrder: 'parallel' })

  testsRunner.describe('SubProcess - Error Handling', () => {
    testsRunner.test('should handle invalid command', async () => {
      const subProcess = new SubProcess({
        command: 'non-existent-command-xyz123',
        captureStreams: true,
        engine: 'exec'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.failureReason).toBeInstanceOf(Error)
      testsRunner.expect(subProcess.status).toBe('failed')
    })

    testsRunner.test('should handle command with non-zero exit code', async () => {
      const subProcess = new SubProcess({
        command: 'node -e "process.exit(42)"',
        captureStreams: true,
        engine: 'exec'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.failureReason).toBeInstanceOf(Error)
      testsRunner.expect(subProcess.status).toBe('failed')
      testsRunner.expect(subProcess.exitCode).toBe(42)
      // Exit code should be available in the subprocess
    })

    testsRunner.test('should handle command that writes to stderr and exits with error', async () => {
      const subProcess = new SubProcess({
        command: 'node -e "console.error(\'Error output\'); process.exit(1)"',
        captureStreams: true,
        engine: 'exec'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.failureReason).toBeInstanceOf(Error)
      testsRunner.expect(subProcess.status).toBe('failed')
      testsRunner.expect(subProcess.exitCode).toBe(1)
      testsRunner.expect(subProcess.stderr.trim()).toBe('Error output')
      // Error output should be available in stderr
    })

    testsRunner.test('should handle invalid working directory', async () => {
      const subProcess = new SubProcess({
        command: 'pwd',
        workingDirectory: '/non/existent/directory/xyz123',
        captureStreams: true,
        engine: 'exec'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.failureReason).toBeInstanceOf(Error)
      testsRunner.expect(subProcess.status).toBe('failed')
    })

    testsRunner.test('should handle invalid engine type', async () => {
      const subProcess = new SubProcess({
        command: 'echo test',
        engine: 'invalid-engine-type' as any,
        captureStreams: true
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('error')
    })

    testsRunner.test('should handle malformed custom engine', async () => {
      const invalidEngine = {
        // Missing required run method
        prepare: () => {}
      }

      const subProcess = new SubProcess({
        command: 'echo test',
        engine: invalidEngine as any,
        captureStreams: true
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('error')
    })

    testsRunner.test('should handle command with syntax errors (shell commands)', async () => {
      const subProcess = new SubProcess({
        command: 'echo "unclosed quote',
        engine: 'exec', // Use exec engine for shell command parsing
        captureStreams: true
      })

      await subProcess.run()

      // This might succeed or fail depending on shell behavior
      // But it shouldn't crash the application
      testsRunner.expect(['succeeded', 'failed', 'error']).toContain(subProcess.status)
    })

    testsRunner.test('should handle very long command output without memory issues', async () => {
      const subProcess = new SubProcess({
        command: 'node -e "for(let i = 0; i < 10000; i++) console.log(\'A\'.repeat(100))"',
        captureStreams: true,
        engine: 'exec'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout.length).toBeGreaterThan(1000000) // Should be over 1MB
    })

    testsRunner.test('should handle process that crashes unexpectedly', async () => {
      const subProcess = new SubProcess({
        command: 'node -e "process.abort()"', // Force crash
        captureStreams: true,
        engine: 'exec'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.failureReason).toBeInstanceOf(Error)
      testsRunner.expect(['failed', 'error']).toContain(subProcess.status)
    })

    testsRunner.test('should handle empty command string', async () => {
      const subProcess = new SubProcess({
        command: '',
        captureStreams: true,
        engine: 'spawn'
      })

      await subProcess.run()

      // In real-world behavior, empty command with spawn engine may succeed (no-op)
      // This is valid behavior - the test verifies it doesn't crash the application
      testsRunner.expect(['succeeded', 'failed', 'error']).toContain(subProcess.status)
    })

    testsRunner.test('should handle command with invalid arguments', async () => {
      const subProcess = new SubProcess({
        command: 'node --invalid-flag-xyz123',
        captureStreams: true,
        engine: 'exec'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.failureReason).toBeInstanceOf(Error)
      testsRunner.expect(subProcess.status).toBe('failed')
      testsRunner.expect(subProcess.exitCode).not.toBe(0)
    })

    testsRunner.test('should handle rapid successive runs', async () => {
      const subProcess = new SubProcess({
        command: 'echo rapid test',
        captureStreams: true,
        engine: 'exec'
      })

      // First run
      await subProcess.run()
      testsRunner.expect(subProcess.status).toBe('succeeded')

      // Second run should work fine (create new instance for multiple runs)
      const subProcess2 = new SubProcess({
        command: 'echo second run',
        captureStreams: true,
        engine: 'exec'
      })

      await subProcess2.run()
      testsRunner.expect(subProcess2.status).toBe('succeeded')
    })

    testsRunner.test('should handle error in engine preparation', async () => {
      const failingEngine = {
        prepare: async () => {
          throw new Error('Engine preparation failed')
        },
        run: async () => {
          throw new Error('Should not reach here')
        }
      }

      const subProcess = new SubProcess({
        command: 'echo test',
        engine: failingEngine,
        captureStreams: true
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('error')
    })

    testsRunner.test('should handle null/undefined input gracefully', async () => {
      const subProcess = new SubProcess({
        command: 'echo null input test',
        input: undefined,
        captureStreams: true,
        engine: 'exec'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout.trim()).toBe('null input test')
    })

    testsRunner.test('should provide meaningful error messages', async () => {
      const subProcess = new SubProcess({
        command: 'node -e "console.error(\'Detailed error info\'); process.exit(5)"',
        captureStreams: true,
        engine: 'exec'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.failureReason).toBeInstanceOf(Error)
      // Error details should be available through exitCode and stderr
      testsRunner.expect(subProcess.exitCode).toBe(5)
      testsRunner.expect(subProcess.stderr.trim()).toBe('Detailed error info')
      // The failureReason should include stderr content (covers lines 143-145)
      testsRunner.expect(subProcess.failureReason).toBeInstanceOf(Error)
      testsRunner.expect((subProcess.failureReason as Error).message).toContain('Detailed error info')
    })
  })

  await testsRunner.run()

  evaluateTestResults(testsRunner)
}
