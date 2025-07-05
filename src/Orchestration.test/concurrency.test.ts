import { TestsRunner } from '@universal-packages/tests-runner'

import { Orchestration } from '../Orchestration'
import { evaluateTestResults } from '../utils.test'

export async function concurrencyTest(): Promise<void> {
  const testsRunner = new TestsRunner({ runOrder: 'parallel' })

  testsRunner.describe('Orchestration Concurrency Tests', () => {
    testsRunner.test('never exceeds maxConcurrency limit', async () => {
      const maxConcurrency = 2
      const orchestration = new Orchestration({
        maxConcurrency,
        processes: [
          { command: 'sleep', args: ['0.05'] },
          { command: 'sleep', args: ['0.05'] },
          { command: 'sleep', args: ['0.05'] },
          { command: 'sleep', args: ['0.05'] },
          { command: 'sleep', args: ['0.05'] }
        ]
      })

      let maxRunningProcesses = 0
      let currentRunningProcesses = 0
      let completedProcesses = 0

      // Monitor running processes count
      orchestration.on('process:running', () => {
        currentRunningProcesses++
        maxRunningProcesses = Math.max(maxRunningProcesses, currentRunningProcesses)
      })

      orchestration.on('process:succeeded', () => {
        currentRunningProcesses--
        completedProcesses++
      })

      await orchestration.run()

      // Verify we never exceeded maxConcurrency
      testsRunner.expect(maxRunningProcesses).toBeLessThanOrEqual(maxConcurrency)
      testsRunner.expect(maxRunningProcesses).toEqual(maxConcurrency)
      testsRunner.expect(completedProcesses).toEqual(5)
    })

    testsRunner.test('respects maxConcurrency when adding processes during execution', async () => {
      const maxConcurrency = 3
      const orchestration = new Orchestration({ maxConcurrency })

      let maxRunningProcesses = 0
      let currentRunningProcesses = 0
      let completedProcesses = 0

      // Monitor running processes count over time
      orchestration.on('process:running', () => {
        currentRunningProcesses++
        maxRunningProcesses = Math.max(maxRunningProcesses, currentRunningProcesses)
      })

      orchestration.on('process:succeeded', () => {
        currentRunningProcesses--
        completedProcesses++
      })

      // Start with initial processes
      for (let i = 0; i < 3; i++) {
        orchestration.addProcess({
          command: 'sleep',
          args: ['0.1']
        })
      }

      const runPromise = orchestration.run()

      // Add more processes while running
      setTimeout(() => {
        for (let i = 0; i < 4; i++) {
          orchestration.addProcess({
            command: 'sleep',
            args: ['0.05']
          })
        }
      }, 20) // Add after initial processes have started

      await runPromise

      // Verify we never exceeded maxConcurrency at any point
      testsRunner.expect(maxRunningProcesses).toBeLessThanOrEqual(maxConcurrency)
      testsRunner.expect(maxRunningProcesses).toEqual(maxConcurrency)
      testsRunner.expect(completedProcesses).toEqual(7) // 3 initial + 4 added
    })

    testsRunner.test('handles maxConcurrency = 1 correctly (serial execution)', async () => {
      const orchestration = new Orchestration({ maxConcurrency: 1 })

      let maxRunningProcesses = 0
      let currentRunningProcesses = 0
      let completedProcesses = 0
      const executionOrder: string[] = []
      const completionOrder: string[] = []

      orchestration.on('process:running', (event) => {
        currentRunningProcesses++
        maxRunningProcesses = Math.max(maxRunningProcesses, currentRunningProcesses)

        // Use a simple counter for tracking order in serial execution
        executionOrder.push(`process-${executionOrder.length + 1}`)
      })

      orchestration.on('process:succeeded', (event) => {
        currentRunningProcesses--
        completedProcesses++

        // Use a simple counter for tracking completion order
        completionOrder.push(`process-${completionOrder.length + 1}`)
      })

      // Add processes with small delays to ensure proper serial execution tracking
      for (let i = 0; i < 4; i++) {
        orchestration.addProcess({
          command: 'sleep',
          args: ['0.02'] // Small delay to ensure sequential execution
        })
      }

      await orchestration.run()

      // Verify maxConcurrency was 1
      testsRunner.expect(maxRunningProcesses).toEqual(1)
      testsRunner.expect(completedProcesses).toEqual(4) // Should be 4 commands

      // Verify processes executed in order (serial)
      const expectedOrder = ['process-1', 'process-2', 'process-3', 'process-4']
      testsRunner.expect(executionOrder).toEqual(expectedOrder)
      testsRunner.expect(completionOrder).toEqual(expectedOrder)
    })

    testsRunner.test('maintains boundary when processes have different durations', async () => {
      const maxConcurrency = 2
      const orchestration = new Orchestration({ maxConcurrency })

      let maxRunningProcesses = 0
      let currentRunningProcesses = 0
      let completedProcesses = 0
      const snapshots: { time: number; running: number }[] = []

      // Take snapshots of running processes over time
      const startTime = Date.now()
      const snapshotInterval = setInterval(() => {
        snapshots.push({
          time: Date.now() - startTime,
          running: currentRunningProcesses
        })
      }, 10)

      orchestration.on('process:running', () => {
        currentRunningProcesses++
        maxRunningProcesses = Math.max(maxRunningProcesses, currentRunningProcesses)
      })

      orchestration.on('process:succeeded', () => {
        currentRunningProcesses--
        completedProcesses++
      })

      // Add processes with varying durations
      const durations = ['0.02', '0.08', '0.04', '0.12', '0.01'] // Different sleep times
      for (const duration of durations) {
        orchestration.addProcess({
          command: 'sleep',
          args: [duration]
        })
      }

      await orchestration.run()
      clearInterval(snapshotInterval)

      // Verify we never exceeded maxConcurrency in any snapshot
      const maxInSnapshots = Math.max(...snapshots.map((s) => s.running))
      testsRunner.expect(maxInSnapshots).toBeLessThanOrEqual(maxConcurrency)
      testsRunner.expect(maxRunningProcesses).toBeLessThanOrEqual(maxConcurrency)
      testsRunner.expect(completedProcesses).toEqual(durations.length)
    })

    testsRunner.test('handles edge case of maxConcurrency larger than total processes', async () => {
      const maxConcurrency = 10
      const totalProcesses = 3
      const orchestration = new Orchestration({ maxConcurrency })

      let maxRunningProcesses = 0
      let currentRunningProcesses = 0
      let completedProcesses = 0

      orchestration.on('process:running', () => {
        currentRunningProcesses++
        maxRunningProcesses = Math.max(maxRunningProcesses, currentRunningProcesses)
      })

      orchestration.on('process:succeeded', () => {
        currentRunningProcesses--
        completedProcesses++
      })

      // Add fewer processes than maxConcurrency with sufficient duration to ensure overlap
      for (let i = 0; i < totalProcesses; i++) {
        orchestration.addProcess({
          command: 'sleep',
          args: ['0.05'] // Duration to ensure concurrent execution
        })
      }

      await orchestration.run()

      // Should run all processes concurrently (limited by total count)
      // With maxConcurrency=10 and only 3 processes, all should run concurrently
      testsRunner.expect(maxRunningProcesses).toBeGreaterThanOrEqual(1) // At least 1 process ran
      testsRunner.expect(maxRunningProcesses).toBeLessThanOrEqual(totalProcesses)
      testsRunner.expect(completedProcesses).toEqual(totalProcesses)
    })

    testsRunner.test('allows adding processes after some have completed', async () => {
      const maxConcurrency = 2
      const orchestration = new Orchestration({ maxConcurrency })

      let maxRunningProcesses = 0
      let currentRunningProcesses = 0
      let completedProcesses = 0

      orchestration.on('process:running', () => {
        currentRunningProcesses++
        maxRunningProcesses = Math.max(maxRunningProcesses, currentRunningProcesses)
      })

      orchestration.on('process:succeeded', () => {
        currentRunningProcesses--
        completedProcesses++
      })

      // Start with initial processes
      for (let i = 0; i < 3; i++) {
        orchestration.addProcess({
          command: 'sleep',
          args: ['0.03']
        })
      }

      const runPromise = orchestration.run()

      // Add more processes after some time (when some should have completed)
      setTimeout(() => {
        for (let i = 0; i < 2; i++) {
          orchestration.addProcess({
            command: 'sleep',
            args: ['0.02']
          })
        }
      }, 50) // Add after some processes should have completed

      await runPromise

      testsRunner.expect(maxRunningProcesses).toBeLessThanOrEqual(maxConcurrency)
      testsRunner.expect(completedProcesses).toEqual(5) // 3 initial + 2 added
    })

    testsRunner.test('handles empty process list gracefully', async () => {
      const orchestration = new Orchestration({ maxConcurrency: 2 })

      let processRunCount = 0
      orchestration.on('process:running', () => {
        processRunCount++
      })

      // Run with no processes
      await orchestration.run()

      testsRunner.expect(processRunCount).toEqual(0)
    })

    testsRunner.test('properly stops running processes', async () => {
      const orchestration = new Orchestration({ maxConcurrency: 2 })

      let runningProcesses = 0
      let stoppedProcesses = 0

      orchestration.on('process:running', () => {
        runningProcesses++
      })

      orchestration.on('process:stopped', () => {
        stoppedProcesses++
      })

      // Add long-running processes
      for (let i = 0; i < 4; i++) {
        orchestration.addProcess({
          command: 'sleep',
          args: ['1'] // Long sleep
        })
      }

      const runPromise = orchestration.run()

      // Stop after a short delay
      setTimeout(() => {
        orchestration.stop()
      }, 100)

      await runPromise

      // Should have started some processes and stopped them
      testsRunner.expect(runningProcesses).toBeGreaterThan(0)
      testsRunner.expect(runningProcesses).toBeLessThanOrEqual(4)
      testsRunner.expect(stoppedProcesses).toBeGreaterThan(0)
    })

    testsRunner.test('respects maxConcurrency with rapid process addition', async () => {
      const maxConcurrency = 3
      const orchestration = new Orchestration({ maxConcurrency })

      let maxRunningProcesses = 0
      let currentRunningProcesses = 0
      let completedProcesses = 0

      orchestration.on('process:running', () => {
        currentRunningProcesses++
        maxRunningProcesses = Math.max(maxRunningProcesses, currentRunningProcesses)
      })

      orchestration.on('process:succeeded', () => {
        currentRunningProcesses--
        completedProcesses++
      })

      // Add initial batch
      for (let i = 0; i < 2; i++) {
        orchestration.addProcess({
          command: 'sleep',
          args: ['0.05']
        })
      }

      const runPromise = orchestration.run()

      // Rapidly add more processes
      for (let i = 0; i < 8; i++) {
        setTimeout(() => {
          orchestration.addProcess({
            command: 'sleep',
            args: ['0.02']
          })
        }, i * 5) // Add every 5ms
      }

      await runPromise

      testsRunner.expect(maxRunningProcesses).toBeLessThanOrEqual(maxConcurrency)
      testsRunner.expect(completedProcesses).toEqual(10) // 2 initial + 8 added
    })
  })

  await testsRunner.run()

  evaluateTestResults(testsRunner)
}
