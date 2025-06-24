import { TestsRunner } from '@universal-packages/tests-runner'

import SubProcess from '../SubProcess'
import { evaluateTestResults } from '../utils.test'

export async function killTimeoutTest() {
  const testsRunner = new TestsRunner({ runOrder: 'parallel' })

  testsRunner.describe('SubProcess - Kill & Timeout', () => {
    testsRunner.test('should kill running process with default signal', async () => {
      const subProcess = new SubProcess({
        command: 'node',
        args: ['-e', '\'setTimeout(() => console.log("Should not reach here"), 5000)\''],
        captureStreams: true,
        engine: 'spawn'
      })

      let killPromise: Promise<void>
      subProcess.on('running', () => {
        // Kill when we know it's running
        setTimeout(() => {
          killPromise = subProcess.kill()
        }, 100)
      })

      await subProcess.run()
      await killPromise!

      testsRunner.expect(subProcess.status).toBe('stopped')
      testsRunner.expect(subProcess.signal).toBeDefined()
    })

    testsRunner.test('should kill running process with specific signal', async () => {
      const subProcess = new SubProcess({
        command: 'node',
        args: ['-e', '\'setTimeout(() => console.log("Should not reach here"), 5000)\''],
        captureStreams: true,
        engine: 'spawn'
      })

      let killPromise: Promise<void>
      subProcess.on('running', () => {
        // Kill with SIGTERM when we know it's running
        setTimeout(() => {
          killPromise = subProcess.kill('SIGTERM')
        }, 100)
      })

      await subProcess.run()
      await killPromise!

      testsRunner.expect(subProcess.status).toBe('stopped')
      testsRunner.expect(subProcess.signal).toBe('SIGTERM')
    })

    testsRunner.test('should handle timeout option', async () => {
      const subProcess = new SubProcess({
        command: 'node',
        args: ['-e', '\'setTimeout(() => console.log("timeout test"), 2000)\''],
        timeout: 500, // 500ms timeout
        captureStreams: true,
        engine: 'spawn'
      })

      const startTime = Date.now()
      await subProcess.run()
      const endTime = Date.now()

      testsRunner.expect(subProcess.status).toBe('timed-out')
      testsRunner.expect(endTime - startTime).toBeLessThan(1500) // Should timeout before 1.5s
    })

    testsRunner.test('should not timeout for fast processes', async () => {
      const subProcess = new SubProcess({
        command: 'echo',
        args: ['fast process'],
        timeout: 1000, // 1 second timeout
        captureStreams: true,
        engine: 'spawn'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout.trim()).toBe('fast process')
    })

    testsRunner.test('should handle kill on already finished process', async () => {
      const subProcess = new SubProcess({
        command: 'echo',
        args: ['already finished'],
        captureStreams: true,
        engine: 'spawn'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('succeeded')

      // Try to kill finished process (should not error)
      testsRunner.expect(subProcess.kill()).toReject()

      testsRunner.expect(subProcess.status).toBe('succeeded') // Status should remain succeeded
    })

    testsRunner.test('should handle skip before process starts', async () => {
      const subProcess = new SubProcess({
        command: 'echo',
        args: ['should be skipped'],
        captureStreams: true,
        engine: 'spawn'
      })

      await subProcess.skip('Testing skip functionality')

      testsRunner.expect(subProcess.status).toBe('skipped')
      testsRunner.expect(subProcess.skipReason).toBe('Testing skip functionality')
    })

    testsRunner.test('should handle stop method', async () => {
      const subProcess = new SubProcess({
        command: 'node',
        args: ['-e', "'setTimeout(() => {}, 5000)'"],
        captureStreams: true,
        engine: 'spawn'
      })

      subProcess.on('running', () => {
        // Stop with reason when we know it's running
        subProcess.stop('Manual stop')
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('stopped')
      // Note: stop reason might be available through other means
    })

    testsRunner.test('should handle waitForStatus method', async () => {
      const subProcess = new SubProcess({
        command: 'echo',
        args: ['waiting for status'],
        captureStreams: true,
        engine: 'spawn'
      })

      const runPromise = subProcess.run()

      // Wait for success status (using waitForStatusLevel from BaseRunner)
      const waitPromise = subProcess.waitForStatusLevel('succeeded' as any)

      await Promise.all([runPromise, waitPromise])

      testsRunner.expect(subProcess.status).toBe('succeeded')
    })

    testsRunner.test('should handle process that exits with signal', async () => {
      const subProcess = new SubProcess({
        command: 'node',
        args: ['-e', '\'process.kill(process.pid, "SIGTERM")\''],
        captureStreams: true,
        engine: 'spawn'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.signal).toBe('SIGTERM')
    })

    testsRunner.test('should preserve process id after kill', async () => {
      const subProcess = new SubProcess({
        command: 'node',
        args: ['-e', "'setTimeout(() => {}, 5000)'"],
        captureStreams: true,
        engine: 'spawn'
      })

      let processIdDuringRun: number | undefined

      subProcess.on('running', () => {
        setTimeout(() => {
          processIdDuringRun = subProcess.processId
          // Kill immediately when we know it's running
          subProcess.kill()
        }, 100)
      })

      await subProcess.run()

      testsRunner.expect(processIdDuringRun).toBeGreaterThan(0)
      testsRunner.expect(subProcess.processId).toBe(processIdDuringRun)
      testsRunner.expect(subProcess.status).toBe('stopped')
    })
  })

  testsRunner.on('**' as any, (event) => {
    if (event.event === 'test:error') console.log(event)
  })

  await testsRunner.run()

  evaluateTestResults(testsRunner)
}
