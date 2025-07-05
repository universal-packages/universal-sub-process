import { TestsRunner } from '@universal-packages/tests-runner'

import { Orchestration } from '../Orchestration'
import { evaluateTestResults } from '../utils.test'

export async function stopOnFailureTest(): Promise<void> {
  const testsRunner = new TestsRunner({ runOrder: 'parallel' })

  testsRunner.describe('Orchestration Stop On Failure Tests', () => {
    testsRunner.test('should stop all processes when one fails and stopOnFailure is true', async () => {
      const orchestration = new Orchestration({
        maxConcurrency: 3,
        stopOnFailure: true
      })

      let succeededCount = 0
      let failedCount = 0
      let stoppedCount = 0
      let runningCount = 0

      orchestration.on('process:running', () => {
        runningCount++
      })

      orchestration.on('process:succeeded', () => {
        succeededCount++
      })

      orchestration.on('process:failed', () => {
        failedCount++
      })

      orchestration.on('process:stopped', () => {
        stoppedCount++
      })

      orchestration.addProcess({
        command: 'sleep',
        args: ['0.5'] // This should stopped before completing
      })

      orchestration.addProcess({
        command: 'sleep',
        args: ['0.5'] // This should be stopped before completing
      })

      orchestration.addProcess({
        command: 'nonexistent-command', // This will fail
        args: ['arg']
      })

      orchestration.addProcess({
        command: 'sleep',
        args: ['0.2'] // This should be stopped before completing
      })

      await orchestration.run()

      testsRunner.expect(failedCount).toEqual(1)
      testsRunner.expect(stoppedCount).toEqual(2)
      testsRunner.expect(succeededCount).toEqual(0)
      // Last process should not ran because of stopOnFailure
      testsRunner.expect(runningCount).toBe(3)
    })

    testsRunner.test('should continue running when one fails and stopOnFailure is false', async () => {
      const orchestration = new Orchestration({
        maxConcurrency: 3,
        stopOnFailure: false // Default behavior
      })

      let succeededCount = 0
      let failedCount = 0
      let stoppedCount = 0

      orchestration.on('process:succeeded', () => {
        succeededCount++
      })

      orchestration.on('process:failed', () => {
        failedCount++
      })

      orchestration.on('process:stopped', () => {
        stoppedCount++
      })

      // Add processes with one that will fail
      orchestration.addProcess({
        command: 'echo',
        args: ['success1']
      })

      orchestration.addProcess({
        command: 'nonexistent-command', // This will fail
        args: ['arg']
      })

      orchestration.addProcess({
        command: 'echo',
        args: ['success2']
      })

      await orchestration.run()

      // Should have failures but continue running
      testsRunner.expect(failedCount).toBe(1)
      testsRunner.expect(succeededCount).toBe(2)
      testsRunner.expect(stoppedCount).toBe(0) // No processes should be stopped
    })

    testsRunner.test('should stop immediately when first process fails with stopOnFailure', async () => {
      const orchestration = new Orchestration({
        maxConcurrency: 1, // Serial execution
        stopOnFailure: true
      })

      let succeededCount = 0
      let failedCount = 0
      let stoppedCount = 0
      const eventOrder: string[] = []

      orchestration.on('process:running', () => {
        eventOrder.push('running')
      })

      orchestration.on('process:succeeded', () => {
        succeededCount++
        eventOrder.push('succeeded')
      })

      orchestration.on('process:failed', () => {
        failedCount++
        eventOrder.push('failed')
      })

      orchestration.on('process:stopped', () => {
        stoppedCount++
        eventOrder.push('stopped')
      })

      // First process fails, second should never run
      orchestration.addProcess({
        command: 'nonexistent-command', // This will fail immediately
        args: ['arg']
      })

      orchestration.addProcess({
        command: 'echo',
        args: ['should-not-run']
      })

      await orchestration.run()

      testsRunner.expect(failedCount).toBe(1)
      testsRunner.expect(succeededCount).toBe(0)
      testsRunner.expect(stoppedCount).toBe(0) // The second process shouldn't even start
    })

    testsRunner.test('should handle timeout failures with stopOnFailure', async () => {
      const orchestration = new Orchestration({
        maxConcurrency: 2,
        stopOnFailure: true
      })

      let succeededCount = 0
      let timedOutCount = 0
      let stoppedCount = 0

      orchestration.on('process:succeeded', () => {
        succeededCount++
      })

      orchestration.on('process:timed-out', () => {
        timedOutCount++
      })

      orchestration.on('process:stopped', () => {
        stoppedCount++
      })

      // Add a process that will timeout
      orchestration.addProcess({
        command: 'sleep',
        args: ['10'], // Long sleep
        timeout: 50 // Very short timeout
      })

      orchestration.addProcess({
        command: 'sleep',
        args: ['0.2'] // Should be stopped due to timeout of first process
      })

      await orchestration.run()

      testsRunner.expect(timedOutCount).toBe(1)
      testsRunner.expect(stoppedCount).toBeGreaterThan(0)
      testsRunner.expect(succeededCount).toBe(0)
    })

    testsRunner.test('should handle multiple concurrent failures with stopOnFailure', async () => {
      const orchestration = new Orchestration({
        maxConcurrency: 3,
        stopOnFailure: true
      })

      let failedCount = 0
      let stoppedCount = 0
      let runningCount = 0

      orchestration.on('process:running', () => {
        runningCount++
      })

      orchestration.on('process:failed', () => {
        failedCount++
      })

      orchestration.on('process:stopped', () => {
        stoppedCount++
      })

      // Add multiple processes that will fail at different times
      orchestration.addProcess({
        command: 'sh',
        args: ['-c', 'sleep 0.05; exit 1'] // Fail after short delay
      })

      orchestration.addProcess({
        command: 'sh',
        args: ['-c', 'sleep 0.1; exit 1'] // Fail after longer delay
      })

      orchestration.addProcess({
        command: 'sleep',
        args: ['0.3'] // Should be stopped
      })

      await orchestration.run()

      // Should have at least one failure
      testsRunner.expect(failedCount).toBeGreaterThan(0)

      // Should have stopped some processes
      testsRunner.expect(stoppedCount).toBeGreaterThan(0)

      // All processes should have been started
      testsRunner.expect(runningCount).toBe(3)
    })

    testsRunner.test('should handle stopOnFailure with processes added during execution', async () => {
      const orchestration = new Orchestration({
        maxConcurrency: 2,
        stopOnFailure: true
      })

      let succeededCount = 0
      let failedCount = 0
      let stoppedCount = 0

      orchestration.on('process:succeeded', () => {
        succeededCount++
      })

      orchestration.on('process:failed', () => {
        failedCount++
      })

      orchestration.on('process:stopped', () => {
        stoppedCount++
      })

      // Add initial processes
      orchestration.addProcess({
        command: 'sleep',
        args: ['0.1']
      })

      orchestration.addProcess({
        command: 'nonexistent-command', // This will fail
        args: ['arg']
      })

      const runPromise = orchestration.run()

      // Add more processes after starting
      setTimeout(() => {
        orchestration.addProcess({
          command: 'echo',
          args: ['late-addition']
        })
      }, 25)

      await runPromise

      // Should have failures and stops
      testsRunner.expect(failedCount).toBeGreaterThan(0)
      testsRunner.expect(stoppedCount).toBeGreaterThan(0)
    })

    testsRunner.test('should work correctly when all processes succeed with stopOnFailure', async () => {
      const orchestration = new Orchestration({
        maxConcurrency: 2,
        stopOnFailure: true
      })

      let succeededCount = 0
      let failedCount = 0
      let stoppedCount = 0

      orchestration.on('process:succeeded', () => {
        succeededCount++
      })

      orchestration.on('process:failed', () => {
        failedCount++
      })

      orchestration.on('process:stopped', () => {
        stoppedCount++
      })

      // Add only successful processes
      orchestration.addProcess({
        command: 'echo',
        args: ['success1']
      })

      orchestration.addProcess({
        command: 'echo',
        args: ['success2']
      })

      orchestration.addProcess({
        command: 'echo',
        args: ['success3']
      })

      await orchestration.run()

      // All should succeed, none should fail or be stopped
      testsRunner.expect(succeededCount).toBe(3)
      testsRunner.expect(failedCount).toBe(0)
      testsRunner.expect(stoppedCount).toBe(0)
    })

    testsRunner.test('should respect stopOnFailure default value (false)', async () => {
      const orchestration = new Orchestration({ maxConcurrency: 2 })

      let succeededCount = 0
      let failedCount = 0
      let stoppedCount = 0

      orchestration.on('process:succeeded', () => {
        succeededCount++
      })

      orchestration.on('process:failed', () => {
        failedCount++
      })

      orchestration.on('process:stopped', () => {
        stoppedCount++
      })

      // Add processes with failures
      orchestration.addProcess({
        command: 'echo',
        args: ['success']
      })

      orchestration.addProcess({
        command: 'nonexistent-command',
        args: ['arg']
      })

      orchestration.addProcess({
        command: 'echo',
        args: ['success-after-failure']
      })

      await orchestration.run()

      // Should continue despite failure
      testsRunner.expect(succeededCount).toBe(2)
      testsRunner.expect(failedCount).toBe(1)
      testsRunner.expect(stoppedCount).toBe(0)
    })

    testsRunner.test('should handle manual stop during execution with stopOnFailure', async () => {
      const orchestration = new Orchestration({
        maxConcurrency: 2,
        stopOnFailure: true
      })

      let stoppedCount = 0
      let runningCount = 0

      orchestration.on('process:running', () => {
        runningCount++
      })

      orchestration.on('process:stopped', () => {
        stoppedCount++
      })

      // Add long-running processes
      orchestration.addProcess({
        command: 'sleep',
        args: ['1']
      })

      orchestration.addProcess({
        command: 'sleep',
        args: ['1']
      })

      const runPromise = orchestration.run()

      // Manually stop after a short delay
      setTimeout(() => {
        orchestration.stop()
      }, 100)

      await runPromise

      // Should have stopped running processes
      testsRunner.expect(runningCount).toBe(2)
      testsRunner.expect(stoppedCount).toBe(2)
    })
  })

  await testsRunner.run()
  evaluateTestResults(testsRunner)
}
