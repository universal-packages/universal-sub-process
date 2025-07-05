import { TestsRunner } from '@universal-packages/tests-runner'

import { Orchestration } from '../Orchestration'
import { evaluateTestResults } from '../utils.test'

export async function processIndexesTest(): Promise<void> {
  const testsRunner = new TestsRunner({ runOrder: 'parallel' })

  testsRunner.describe('Orchestration Process Indexes', () => {
    testsRunner.test('should assign index 1 to a single process', async () => {
      const orchestration = new Orchestration()
      const stdout: string[] = []

      orchestration.addProcess({
        command: 'echo',
        args: ['$PROCESS_INDEX']
      })

      orchestration.on('process:stdout', (event) => {
        stdout.push(event.payload.data)
      })

      await orchestration.run()

      testsRunner.expect(stdout).toEqual(['1\n'])
    })

    testsRunner.test('should assign unique sequential indexes to multiple processes', async () => {
      const orchestration = new Orchestration({ maxConcurrency: 3 })
      const processIndexes: number[] = []

      // Add 3 processes that will run concurrently
      for (let i = 0; i < 3; i++) {
        orchestration.addProcess({
          command: 'sleep 0.1 && echo',
          args: ['$PROCESS_INDEX']
        })
      }

      orchestration.on('process:stdout', (event) => {
        processIndexes.push(parseInt(event.payload.data.trim()))
      })

      await orchestration.run()

      // Should have indexes 1, 2, 3 in some order
      processIndexes.sort()
      testsRunner.expect(processIndexes).toEqual([1, 2, 3])
    })

    testsRunner.test('should respect maxConcurrency boundaries', async () => {
      const orchestration = new Orchestration({ maxConcurrency: 2 })
      const processIndexes: number[] = []

      // Add 4 processes but only 2 can run concurrently
      for (let i = 0; i < 4; i++) {
        orchestration.addProcess({
          command: 'echo',
          args: ['$PROCESS_INDEX']
        })
      }

      orchestration.on('process:stdout', (event) => {
        processIndexes.push(parseInt(event.payload.data.trim()))
      })

      await orchestration.run()

      // All indexes should be within bounds (1 or 2)
      testsRunner.expect(processIndexes.every((index) => index >= 1 && index <= 2)).toBe(true)
      testsRunner.expect(processIndexes.length).toBe(4)
    })

    testsRunner.test('should reuse indexes when processes complete', async () => {
      const orchestration = new Orchestration({ maxConcurrency: 2 })
      const processIndexes: number[] = []
      const processRunOrder: number[] = []
      let completedCount = 0

      // Add 4 processes - first 2 run concurrently, then next 2 reuse indexes
      for (let i = 0; i < 4; i++) {
        orchestration.addProcess({
          command: 'echo',
          args: ['$PROCESS_INDEX']
        })
      }

      orchestration.on('process:stdout', (event) => {
        const processIndex = parseInt(event.payload.data.trim())
        processIndexes.push(processIndex)
        processRunOrder.push(processIndex)
      })

      orchestration.on('process:succeeded', () => {
        completedCount++
      })

      await orchestration.run()

      // Should have collected 4 process indexes total
      testsRunner.expect(processIndexes.length).toBe(4)
      // All indexes should be within bounds
      testsRunner.expect(processIndexes.every((index) => index >= 1 && index <= 2)).toBe(true)
      // Should have reused indexes (will see 1 and 2 appear twice)
      const indexCounts = processIndexes.reduce(
        (acc, index) => {
          acc[index] = (acc[index] || 0) + 1
          return acc
        },
        {} as Record<number, number>
      )
      testsRunner.expect(indexCounts[1]).toBe(2)
      testsRunner.expect(indexCounts[2]).toBe(2)
    })

    testsRunner.test('should handle single maxConcurrency correctly', async () => {
      const orchestration = new Orchestration({ maxConcurrency: 1 })
      const processIndexes: number[] = []

      // Add 3 processes that will run sequentially
      for (let i = 0; i < 3; i++) {
        orchestration.addProcess({
          command: 'echo',
          args: ['$PROCESS_INDEX']
        })
      }

      orchestration.on('process:stdout', (event) => {
        processIndexes.push(parseInt(event.payload.data.trim()))
      })

      await orchestration.run()

      // All should have index 1 (reused)
      testsRunner.expect(processIndexes).toEqual([1, 1, 1])
    })

    testsRunner.test('should handle high maxConcurrency correctly', async () => {
      const orchestration = new Orchestration({ maxConcurrency: 10 })
      const processIndexes: number[] = []

      // Add 5 processes with high concurrency limit
      for (let i = 0; i < 5; i++) {
        orchestration.addProcess({
          command: 'echo',
          args: ['$PROCESS_INDEX']
        })
      }

      orchestration.on('process:stdout', (event) => {
        processIndexes.push(parseInt(event.payload.data.trim()))
      })

      await orchestration.run()

      // Should get sequential indexes 1-5
      processIndexes.sort()
      testsRunner.expect(processIndexes).toEqual([1, 2, 3, 4, 5])
    })

    testsRunner.test('should maintain index uniqueness during concurrent execution', async () => {
      const orchestration = new Orchestration({ maxConcurrency: 3 })
      const runningProcesses: Set<number> = new Set()
      const maxConcurrentIndexes: number[] = []
      let maxConcurrentCount = 0

      // Add processes with slight delays to observe concurrency
      for (let i = 0; i < 6; i++) {
        orchestration.addProcess({
          command: 'sh',
          args: ['-c', 'echo $PROCESS_INDEX; sleep 0.1; echo "done $PROCESS_INDEX"']
        })
      }

      orchestration.on('process:stdout', (event) => {
        const output = event.payload.data.trim()
        if (output.startsWith('done')) {
          const processIndex = parseInt(output.split(' ')[1])
          runningProcesses.delete(processIndex)
        } else {
          const processIndex = parseInt(output)
          runningProcesses.add(processIndex)

          // Track maximum concurrent processes
          if (runningProcesses.size > maxConcurrentCount) {
            maxConcurrentCount = runningProcesses.size
            maxConcurrentIndexes.push(...Array.from(runningProcesses))
          }
        }
      })

      await orchestration.run()

      // Should never exceed maxConcurrency
      testsRunner.expect(maxConcurrentCount).toBeLessThanOrEqual(3)
    })

    testsRunner.test('should handle default maxConcurrency (CPU cores - 1)', async () => {
      const orchestration = new Orchestration() // Uses default maxConcurrency
      const processIndexes: number[] = []

      // Add 2 processes to test default behavior
      orchestration.addProcess({
        command: 'echo',
        args: ['$PROCESS_INDEX']
      })
      orchestration.addProcess({
        command: 'echo',
        args: ['$PROCESS_INDEX']
      })

      orchestration.on('process:stdout', (event) => {
        processIndexes.push(parseInt(event.payload.data.trim()))
      })

      await orchestration.run()

      // Should have valid indexes within the default maxConcurrency
      testsRunner.expect(processIndexes.length).toBe(2)
      testsRunner.expect(processIndexes.every((index) => index >= 1)).toBe(true)
      // Default maxConcurrency should be at least 1
      testsRunner.expect(Math.max(...processIndexes)).toBeGreaterThanOrEqual(1)
    })

    testsRunner.test('should handle edge case of maxConcurrency 0 (should be corrected to 1)', async () => {
      const orchestration = new Orchestration({ maxConcurrency: 0 })
      const processIndexes: number[] = []

      orchestration.addProcess({
        command: 'echo',
        args: ['$PROCESS_INDEX']
      })

      orchestration.on('process:stdout', (event) => {
        processIndexes.push(parseInt(event.payload.data.trim()))
      })

      await orchestration.run()

      // Should be corrected to use index 1
      testsRunner.expect(processIndexes).toEqual([1])
    })

    testsRunner.test('should handle negative maxConcurrency (should be corrected to 1)', async () => {
      const orchestration = new Orchestration({ maxConcurrency: -5 })
      const processIndexes: number[] = []

      orchestration.addProcess({
        command: 'echo',
        args: ['$PROCESS_INDEX']
      })

      orchestration.on('process:stdout', (event) => {
        processIndexes.push(parseInt(event.payload.data.trim()))
      })

      await orchestration.run()

      // Should be corrected to use index 1
      testsRunner.expect(processIndexes).toEqual([1])
    })
  })

  await testsRunner.run()

  evaluateTestResults(testsRunner)
}
