import { TestsRunner } from '@universal-packages/tests-runner'

import { Orchestration } from '../Orchestration'
import { evaluateTestResults } from '../utils.test'

export async function messagingTest(): Promise<void> {
  const testsRunner = new TestsRunner()

  testsRunner.describe('Orchestration Messaging Tests', () => {
    testsRunner.test('handle complex data structures in messages', async () => {
      const orchestration = new Orchestration()
      const messages: Record<string, any>[] = []

      orchestration.addProcess({
        command: 'tsx',
        args: ['./src/Orchestration.test/__fixtures__/complex-messaging-child.ts']
      })

      orchestration.on('process:message', (event) => {
        messages.push(event.payload.data)
      })

      setTimeout(() => {
        orchestration.sendMessage({
          type: 'ping',
          metadata: {
            timestamp: Date.now(),
            nested: { value: 42, array: [1, 2, 3] }
          }
        })

        setTimeout(() => {
          orchestration.sendMessage({ type: 'stop' })
        }, 100)
      }, 200)

      await orchestration.run()

      testsRunner.expect(messages).toHaveLength(2)
      testsRunner.expect(messages[0].type).toEqual('pong')
      testsRunner.expect(messages[0].originalData.metadata.nested.value).toEqual(42)
      testsRunner.expect(messages[1].type).toEqual('stopping')
    })

    testsRunner.test('handle echo mode messaging', async () => {
      const orchestration = new Orchestration()
      const messages: Record<string, any>[] = []

      orchestration.addProcess({
        command: 'tsx',
        args: ['./src/Orchestration.test/__fixtures__/complex-messaging-child.ts']
      })

      orchestration.on('process:message', (event) => {
        messages.push(event.payload.data)
      })

      setTimeout(() => {
        orchestration.sendMessage({ type: 'echo' })

        setTimeout(() => {
          orchestration.sendMessage({ type: 'echo-data', payload: 'Hello World' })
          orchestration.sendMessage({ type: 'echo-data', payload: { key: 'value' } })

          setTimeout(() => {
            orchestration.sendMessage({ type: 'stop' })
          }, 100)
        }, 100)
      }, 200)

      await orchestration.run()

      testsRunner.expect(messages).toHaveLength(4)
      testsRunner.expect(messages[0].type).toEqual('echo-enabled')
      testsRunner.expect(messages[1].type).toEqual('echoed')
      testsRunner.expect(messages[1].data).toEqual('Hello World')
      testsRunner.expect(messages[2].type).toEqual('echoed')
      testsRunner.expect(messages[2].data).toEqual({ key: 'value' })
      testsRunner.expect(messages[3].type).toEqual('stopping')
    })

    testsRunner.test('handle batch messaging', async () => {
      const orchestration = new Orchestration()
      const messages: Record<string, any>[] = []

      orchestration.addProcess({
        command: 'tsx',
        args: ['./src/Orchestration.test/__fixtures__/complex-messaging-child.ts']
      })

      orchestration.on('process:message', (event) => {
        messages.push(event.payload.data)
      })

      setTimeout(() => {
        orchestration.sendMessage({ type: 'batch-start', size: 3 })

        setTimeout(() => {
          orchestration.sendMessage({ type: 'batch-data', payload: 'item1' })
          orchestration.sendMessage({ type: 'batch-data', payload: 'item2' })
          orchestration.sendMessage({ type: 'batch-data', payload: 'item3' })

          setTimeout(() => {
            orchestration.sendMessage({ type: 'stop' })
          }, 100)
        }, 100)
      }, 200)

      await orchestration.run()

      testsRunner.expect(messages).toHaveLength(3)
      testsRunner.expect(messages[0].type).toEqual('batch-ready')
      testsRunner.expect(messages[1].type).toEqual('batch-complete')
      testsRunner.expect(messages[1].batch).toEqual(['item1', 'item2', 'item3'])
      testsRunner.expect(messages[2].type).toEqual('stopping')
    })

    testsRunner.test('handle large data messages', async () => {
      const orchestration = new Orchestration()
      const messages: Record<string, any>[] = []

      orchestration.addProcess({
        command: 'tsx',
        args: ['./src/Orchestration.test/__fixtures__/complex-messaging-child.ts']
      })

      orchestration.on('process:message', (event) => {
        messages.push(event.payload.data)
      })

      setTimeout(() => {
        const largeData = {
          checksum: 'abc123',
          data: Array(1000)
            .fill(0)
            .map((_, i) => ({ index: i, value: `item-${i}` }))
        }

        orchestration.sendMessage({ type: 'large-data', payload: largeData })

        setTimeout(() => {
          orchestration.sendMessage({ type: 'stop' })
        }, 200)
      }, 200)

      await orchestration.run()

      testsRunner.expect(messages).toHaveLength(2)
      testsRunner.expect(messages[0].type).toEqual('large-data-processed')
      testsRunner.expect(messages[0].checksum).toEqual('abc123')
      testsRunner.expect(messages[0].originalSize).toBeGreaterThan(10000)
      testsRunner.expect(messages[1].type).toEqual('stopping')
    })

    testsRunner.test('handle burst messaging', async () => {
      const orchestration = new Orchestration()
      const messages: Record<string, any>[] = []

      orchestration.addProcess({
        command: 'tsx',
        args: ['./src/Orchestration.test/__fixtures__/complex-messaging-child.ts']
      })

      orchestration.on('process:message', (event) => {
        messages.push(event.payload.data)
      })

      setTimeout(() => {
        orchestration.sendMessage({ type: 'burst-response', count: 5 })

        setTimeout(() => {
          orchestration.sendMessage({ type: 'stop' })
        }, 200)
      }, 200)

      await orchestration.run()

      testsRunner.expect(messages).toHaveLength(6)

      const burstMessages = messages.filter((m) => m.type === 'burst-message')
      testsRunner.expect(burstMessages).toHaveLength(5)
      testsRunner.expect(burstMessages.map((m) => m.index)).toEqual([0, 1, 2, 3, 4])
    })

    testsRunner.test('handle error scenarios in messaging', async () => {
      const orchestration = new Orchestration()
      const messages: Record<string, any>[] = []

      orchestration.addProcess({
        command: 'tsx',
        args: ['./src/Orchestration.test/__fixtures__/complex-messaging-child.ts']
      })

      orchestration.on('process:message', (event) => {
        messages.push(event.payload.data)
      })

      setTimeout(() => {
        orchestration.sendMessage({ type: 'error-test' })

        setTimeout(() => {
          orchestration.sendMessage({ type: 'stop' })
        }, 100)
      }, 200)

      await orchestration.run()

      testsRunner.expect(messages).toHaveLength(2)
      testsRunner.expect(messages[0].type).toEqual('error-caught')
      testsRunner.expect(messages[0].error).toEqual('Test error')
      testsRunner.expect(messages[1].type).toEqual('stopping')
    })

    testsRunner.test('handle unknown message types', async () => {
      const orchestration = new Orchestration()
      const messages: Record<string, any>[] = []

      orchestration.addProcess({
        command: 'tsx',
        args: ['./src/Orchestration.test/__fixtures__/complex-messaging-child.ts']
      })

      orchestration.on('process:message', (event) => {
        messages.push(event.payload.data)
      })

      setTimeout(() => {
        orchestration.sendMessage({ type: 'unknown-message-type', data: 'test' })

        setTimeout(() => {
          orchestration.sendMessage({ type: 'stop' })
        }, 100)
      }, 200)

      await orchestration.run()

      testsRunner.expect(messages).toHaveLength(2)
      testsRunner.expect(messages[0].type).toEqual('unknown-message')
      testsRunner.expect(messages[0].receivedType).toEqual('unknown-message-type')
      testsRunner.expect(messages[1].type).toEqual('stopping')
    })

    testsRunner.test('send targeted messages to specific process indexes', async () => {
      const orchestration = new Orchestration({ maxConcurrency: 2 })
      const messages: Record<string, any>[] = []

      orchestration.addProcess({
        command: 'tsx',
        args: ['./src/Orchestration.test/__fixtures__/complex-messaging-child.ts']
      })

      orchestration.addProcess({
        command: 'tsx',
        args: ['./src/Orchestration.test/__fixtures__/complex-messaging-child.ts']
      })

      orchestration.on('process:message', (event) => {
        messages.push(event.payload.data)
      })

      setTimeout(() => {
        orchestration.sendMessage({ type: 'ping', target: 'process-1' }, 1)

        setTimeout(() => {
          orchestration.sendMessage({ type: 'ping', target: 'process-2' }, 2)

          setTimeout(() => {
            orchestration.sendMessage({ type: 'stop' })
          }, 500)
        }, 500)
      }, 300)

      await orchestration.run()

      testsRunner.expect(messages).toHaveLength(4)

      const pongMessages = messages.filter((m) => m.type === 'pong')
      testsRunner.expect(pongMessages).toHaveLength(2)
      testsRunner.expect(pongMessages[0].originalData.target).toEqual('process-1')
      testsRunner.expect(pongMessages[1].originalData.target).toEqual('process-2')
    })

    testsRunner.test('handle delayed responses', async () => {
      const orchestration = new Orchestration()
      const messages: Record<string, any>[] = []
      const timestamps: number[] = []

      orchestration.addProcess({
        command: 'tsx',
        args: ['./src/Orchestration.test/__fixtures__/delayed-response-child.ts']
      })

      orchestration.on('process:message', (event) => {
        messages.push(event.payload.data)
        timestamps.push(Date.now())
      })

      const startTime = Date.now()
      setTimeout(() => {
        orchestration.sendMessage({ type: 'delayed-ping', delay: 150 })

        setTimeout(() => {
          orchestration.sendMessage({ type: 'stop' })
        }, 1000)
      }, 200)

      await orchestration.run()

      testsRunner.expect(messages).toHaveLength(2)
      testsRunner.expect(messages[0].type).toEqual('delayed-pong')
      testsRunner.expect(messages[0].delay).toEqual(150)
      testsRunner.expect(messages[1].type).toEqual('stopping')

      const delayedResponseTime = timestamps[0] - startTime
      testsRunner.expect(delayedResponseTime).toBeGreaterThan(300)
    })

    testsRunner.test('handle sequence messaging', async () => {
      const orchestration = new Orchestration()
      const messages: Record<string, any>[] = []

      orchestration.addProcess({
        command: 'tsx',
        args: ['./src/Orchestration.test/__fixtures__/delayed-response-child.ts']
      })

      orchestration.on('process:message', (event) => {
        messages.push(event.payload.data)
      })

      setTimeout(() => {
        orchestration.sendMessage({ type: 'sequence-start', count: 4, interval: 30 })

        setTimeout(() => {
          orchestration.sendMessage({ type: 'stop' })
        }, 300)
      }, 200)

      await orchestration.run()

      testsRunner.expect(messages).toHaveLength(5)

      const sequenceMessages = messages.filter((m) => m.type === 'sequence-item')
      testsRunner.expect(sequenceMessages).toHaveLength(4)
      testsRunner.expect(sequenceMessages.map((m) => m.index)).toEqual([0, 1, 2, 3])
      testsRunner.expect(sequenceMessages.every((m) => m.total === 4)).toBe(true)
    })

    testsRunner.test('handle concurrent messaging with multiple processes', async () => {
      const orchestration = new Orchestration({ maxConcurrency: 3 })
      const messages: Record<string, any>[] = []
      const processIndexes: Set<string> = new Set()

      for (let i = 0; i < 3; i++) {
        orchestration.addProcess({
          command: 'tsx',
          args: ['./src/Orchestration.test/__fixtures__/complex-messaging-child.ts']
        })
      }

      orchestration.on('process:message', (event) => {
        messages.push(event.payload.data)
        if (event.payload.data.processIndex) {
          processIndexes.add(event.payload.data.processIndex)
        }
      })

      setTimeout(() => {
        orchestration.sendMessage({ type: 'status' })

        setTimeout(() => {
          orchestration.sendMessage({ type: 'stop' })
        }, 200)
      }, 500)

      await orchestration.run()

      testsRunner.expect(messages).toHaveLength(6)
      testsRunner.expect(processIndexes.size).toEqual(3)

      const statusMessages = messages.filter((m) => m.type === 'status-report')
      testsRunner.expect(statusMessages).toHaveLength(3)
      testsRunner.expect(statusMessages.every((m) => m.messageCount >= 1)).toBe(true)
    })

    testsRunner.test('handle message ordering', async () => {
      const orchestration = new Orchestration()
      const messages: Record<string, any>[] = []

      orchestration.addProcess({
        command: 'tsx',
        args: ['./src/Orchestration.test/__fixtures__/complex-messaging-child.ts']
      })

      orchestration.on('process:message', (event) => {
        messages.push(event.payload.data)
      })

      setTimeout(() => {
        for (let i = 0; i < 5; i++) {
          orchestration.sendMessage({ type: 'ping', sequence: i })
        }

        setTimeout(() => {
          orchestration.sendMessage({ type: 'stop' })
        }, 200)
      }, 200)

      await orchestration.run()

      testsRunner.expect(messages).toHaveLength(6)

      const pongMessages = messages.filter((m) => m.type === 'pong')
      testsRunner.expect(pongMessages).toHaveLength(5)

      const sequences = pongMessages.map((m) => m.originalData.sequence)
      testsRunner.expect(sequences).toEqual([0, 1, 2, 3, 4])
    })

    testsRunner.test('handle empty and null messages', async () => {
      const orchestration = new Orchestration()
      const messages: Record<string, any>[] = []

      orchestration.addProcess({
        command: 'tsx',
        args: ['./src/Orchestration.test/__fixtures__/complex-messaging-child.ts']
      })

      orchestration.on('process:message', (event) => {
        messages.push(event.payload.data)
      })

      setTimeout(() => {
        orchestration.sendMessage({})
        orchestration.sendMessage({ type: 'ping', data: null })
        orchestration.sendMessage({ type: 'ping', data: '' })

        setTimeout(() => {
          orchestration.sendMessage({ type: 'stop' })
        }, 100)
      }, 200)

      await orchestration.run()

      testsRunner.expect(messages).toHaveLength(4)

      testsRunner.expect(messages[0].type).toEqual('unknown-message')
      testsRunner.expect(messages[1].type).toEqual('pong')
      testsRunner.expect(messages[2].type).toEqual('pong')
      testsRunner.expect(messages[3].type).toEqual('stopping')
    })

    testsRunner.test('handle message buffering during high load', async () => {
      const orchestration = new Orchestration()
      const messages: Record<string, any>[] = []

      orchestration.addProcess({
        command: 'tsx',
        args: ['./src/Orchestration.test/__fixtures__/complex-messaging-child.ts']
      })

      orchestration.on('process:message', (event) => {
        messages.push(event.payload.data)
      })

      setTimeout(() => {
        for (let i = 0; i < 20; i++) {
          orchestration.sendMessage({ type: 'ping', batch: i })
        }

        setTimeout(() => {
          orchestration.sendMessage({ type: 'stop' })
        }, 300)
      }, 200)

      await orchestration.run()

      testsRunner.expect(messages).toHaveLength(21)

      const pongMessages = messages.filter((m) => m.type === 'pong')
      testsRunner.expect(pongMessages).toHaveLength(20)

      const batches = pongMessages.map((m) => m.originalData.batch).sort((a, b) => a - b)
      testsRunner.expect(batches).toEqual(Array.from({ length: 20 }, (_, i) => i))
    })

    testsRunner.test('handle messaging with process failures', async () => {
      const orchestration = new Orchestration({ maxConcurrency: 2, stopOnFailure: false })
      const messages: Record<string, any>[] = []
      const processEvents: string[] = []

      orchestration.addProcess({
        command: 'tsx',
        args: ['./src/Orchestration.test/__fixtures__/complex-messaging-child.ts']
      })

      orchestration.addProcess({
        command: 'nonexistent-command', // This will fail
        args: ['arg']
      })

      orchestration.on('process:message', (event) => {
        messages.push(event.payload.data)
      })

      orchestration.on('process:succeeded', () => {
        processEvents.push('succeeded')
      })

      orchestration.on('process:failed', () => {
        processEvents.push('failed')
      })

      setTimeout(() => {
        orchestration.sendMessage({ type: 'ping' })

        setTimeout(() => {
          orchestration.sendMessage({ type: 'stop' })
        }, 100)
      }, 200)

      await orchestration.run()

      // Should only get messages from the successful process
      testsRunner.expect(messages).toHaveLength(2) // ping response + stop response
      testsRunner.expect(messages[0].type).toEqual('pong')
      testsRunner.expect(messages[1].type).toEqual('stopping')
      testsRunner.expect(processEvents).toContain('succeeded')
      testsRunner.expect(processEvents).toContain('failed')
    })

    testsRunner.test('handle messaging during process lifecycle', async () => {
      const orchestration = new Orchestration()
      const messages: Record<string, any>[] = []
      const lifecycleEvents: string[] = []

      orchestration.addProcess({
        command: 'tsx',
        args: ['./src/Orchestration.test/__fixtures__/complex-messaging-child.ts']
      })

      orchestration.on('process:message', (event) => {
        messages.push(event.payload.data)
      })

      orchestration.on('process:preparing', () => {
        lifecycleEvents.push('preparing')
      })

      orchestration.on('process:running', () => {
        lifecycleEvents.push('running')
        // Send message immediately when process starts running
        setTimeout(() => {
          orchestration.sendMessage({ type: 'ping', immediate: true })
        }, 50)
      })

      orchestration.on('process:succeeded', () => {
        lifecycleEvents.push('succeeded')
      })

      setTimeout(() => {
        orchestration.sendMessage({ type: 'stop' })
      }, 300)

      await orchestration.run()

      testsRunner.expect(messages).toHaveLength(2)
      testsRunner.expect(messages[0].type).toEqual('pong')
      testsRunner.expect(messages[0].originalData.immediate).toBe(true)
      testsRunner.expect(messages[1].type).toEqual('stopping')
      testsRunner.expect(lifecycleEvents).toContain('preparing')
      testsRunner.expect(lifecycleEvents).toContain('running')
      testsRunner.expect(lifecycleEvents).toContain('succeeded')
    })

    testsRunner.test('handle messaging with no processes', async () => {
      const orchestration = new Orchestration()
      const messages: Record<string, any>[] = []

      orchestration.on('process:message', (event) => {
        messages.push(event.payload.data)
      })

      // Send message to empty orchestration
      orchestration.sendMessage({ type: 'ping' })

      await orchestration.run()

      // Should complete without errors and no messages
      testsRunner.expect(messages).toHaveLength(0)
    })

    testsRunner.test('handle messaging with process that never responds', async () => {
      const orchestration = new Orchestration()
      const messages: Record<string, any>[] = []
      const processEvents: string[] = []

      orchestration.addProcess({
        command: 'sleep',
        args: ['0.5'], // Process that doesn't handle messages
        timeout: 200
      })

      orchestration.on('process:message', (event) => {
        messages.push(event.payload.data)
      })

      orchestration.on('process:timed-out', () => {
        processEvents.push('timed-out')
      })

      setTimeout(() => {
        orchestration.sendMessage({ type: 'ping' })
      }, 50)

      await orchestration.run()

      // Should complete with timeout, no messages received
      testsRunner.expect(messages).toHaveLength(0)
      testsRunner.expect(processEvents).toContain('timed-out')
    })

    testsRunner.test('handle messaging with Unicode and special characters', async () => {
      const orchestration = new Orchestration()
      const messages: Record<string, any>[] = []

      orchestration.addProcess({
        command: 'tsx',
        args: ['./src/Orchestration.test/__fixtures__/complex-messaging-child.ts']
      })

      orchestration.on('process:message', (event) => {
        messages.push(event.payload.data)
      })

      setTimeout(() => {
        orchestration.sendMessage({
          type: 'ping',
          unicode: '🎉✨🌌',
          special: '!@#$%^&*()[]{}|\\:";\'<>?,./',
          emoji: '🚀💫⭐',
          japanese: 'こんにちは世界',
          arabic: 'مرحبا بالعالم'
        })

        setTimeout(() => {
          orchestration.sendMessage({ type: 'stop' })
        }, 100)
      }, 200)

      await orchestration.run()

      testsRunner.expect(messages).toHaveLength(2)
      testsRunner.expect(messages[0].type).toEqual('pong')
      testsRunner.expect(messages[0].originalData.unicode).toEqual('🎉✨🌌')
      testsRunner.expect(messages[0].originalData.special).toEqual('!@#$%^&*()[]{}|\\:";\'<>?,./')
      testsRunner.expect(messages[0].originalData.emoji).toEqual('🚀💫⭐')
      testsRunner.expect(messages[0].originalData.japanese).toEqual('こんにちは世界')
      testsRunner.expect(messages[0].originalData.arabic).toEqual('مرحبا بالعالم')
      testsRunner.expect(messages[1].type).toEqual('stopping')
    })

    testsRunner.test('handle messaging with deeply nested objects', async () => {
      const orchestration = new Orchestration()
      const messages: Record<string, any>[] = []

      orchestration.addProcess({
        command: 'tsx',
        args: ['./src/Orchestration.test/__fixtures__/complex-messaging-child.ts']
      })

      orchestration.on('process:message', (event) => {
        messages.push(event.payload.data)
      })

      setTimeout(() => {
        const deepObject = {
          type: 'ping',
          level1: {
            level2: {
              level3: {
                level4: {
                  level5: {
                    value: 'deep value',
                    array: [1, 2, { nested: 'item' }],
                    boolean: true,
                    null: null,
                    undefined: undefined
                  }
                }
              }
            }
          }
        }

        orchestration.sendMessage(deepObject)

        setTimeout(() => {
          orchestration.sendMessage({ type: 'stop' })
        }, 100)
      }, 200)

      await orchestration.run()

      testsRunner.expect(messages).toHaveLength(2)
      testsRunner.expect(messages[0].type).toEqual('pong')
      testsRunner.expect(messages[0].originalData.level1.level2.level3.level4.level5.value).toEqual('deep value')
      testsRunner.expect(messages[0].originalData.level1.level2.level3.level4.level5.array[2].nested).toEqual('item')
      testsRunner.expect(messages[1].type).toEqual('stopping')
    })
  })

  await testsRunner.run()

  evaluateTestResults(testsRunner)
}
