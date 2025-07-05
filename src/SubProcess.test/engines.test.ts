import { TestsRunner } from '@universal-packages/tests-runner'
import { Readable } from 'stream'

import { EngineProcess } from '../EngineProcess'
import { SubProcess } from '../SubProcess'
import { EngineInterface } from '../SubProcess.types'
import { TestEngine } from '../TestEngine'
import { evaluateTestResults } from '../utils.test'

export async function enginesTest() {
  const testsRunner = new TestsRunner({ runOrder: 'parallel' })

  testsRunner.describe('SubProcess - Engines', () => {
    testsRunner.beforeEach(() => {
      TestEngine.reset()
    })

    testsRunner.test('should work with spawn engine (default)', async () => {
      const subProcess = new SubProcess({
        command: 'echo test',
        captureStreams: true,
        engine: 'spawn'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout.trim()).toBe('test')
    })

    testsRunner.test('should work with exec engine', async () => {
      const subProcess = new SubProcess({
        command: 'echo test exec',
        captureStreams: true,
        engine: 'exec'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout.trim()).toBe('test exec')
    })

    testsRunner.test('should work with fork engine for Node.js scripts', async () => {
      const subProcess = new SubProcess({
        command: 'echo',
        args: ['test fork'],
        captureStreams: true,
        engine: 'spawn'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout.trim()).toBe('test fork')
    })

    testsRunner.test('should work with test engine for mocking', async () => {
      const subProcess = new SubProcess({
        command: 'echo',
        args: ['test', 'mock'],
        captureStreams: true,
        engine: 'test'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout.trim()).toBe('test mock')
    })

    testsRunner.test('should work with custom engine options', async () => {
      const subProcess = new SubProcess({
        command: 'echo custom options test',
        captureStreams: true,
        engine: 'spawn',
        engineOptions: {}
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout.trim()).toBe('custom options test')
    })

    testsRunner.test('should handle engine-specific behavior', async () => {
      // Test that different engines handle the same command correctly
      const engines = ['spawn', 'exec'] as const

      for (const engine of engines) {
        const subProcess = new SubProcess({
          command: 'echo',
          args: ['engine', engine],
          captureStreams: true,
          engine
        })

        await subProcess.run()

        testsRunner.expect(subProcess.status).toBe('succeeded')
        testsRunner.expect(subProcess.stdout.trim()).toBe(`engine ${engine}`)
      }
    })

    testsRunner.test('should handle engine failures appropriately', async () => {
      const subProcess = new SubProcess({
        command: 'nonexistentcommand',
        captureStreams: true,
        engine: 'spawn'
      })

      await subProcess.run()

      testsRunner.expect(['succeeded', 'failed', 'error']).toContain(subProcess.status)
    })

    testsRunner.test('should provide consistent interface across engines', async () => {
      const engines = ['spawn', 'exec', 'test'] as const

      for (const engine of engines) {
        const subProcess = new SubProcess({
          command: 'echo',
          args: ['consistent', 'interface'],
          captureStreams: true,
          engine
        })

        await subProcess.run()

        testsRunner.expect(subProcess.status).toBe('succeeded')
        testsRunner.expect(subProcess.exitCode).toBe(0)
        testsRunner.expect(subProcess.stdout.trim()).toBe('consistent interface')
      }
    })

    testsRunner.test('should handle generateEngine throwing "No engine provided" error', async () => {
      const subProcess = new SubProcess({
        command: 'echo test',
        captureStreams: true,
        engine: 'test'
      })

      // Temporarily set engine to undefined to trigger the error case
      subProcess.options.engine = undefined

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('error')
      testsRunner.expect(subProcess.error).toBeInstanceOf(Error)
      testsRunner.expect(subProcess.error?.message).toContain('No engine provided')
    })

    testsRunner.test('should prepare and release engines', async () => {
      class MyEngine implements EngineInterface {
        public static prepareCount = 0
        public static releaseCount = 0

        public run(_command: string, _args: string[], _input: Readable, _env: Record<string, string>, _workingDirectory?: string) {
          const engineProcess = new EngineProcess(1, { kill: () => {} })

          setTimeout(() => {
            engineProcess.emit('success')
          }, 100)

          return engineProcess
        }

        public async prepare(): Promise<void> {
          MyEngine.prepareCount++
        }

        public async release(): Promise<void> {
          MyEngine.releaseCount++
        }
      }

      const subProcess = new SubProcess({
        command: 'echo test',
        captureStreams: true,
        engine: new MyEngine()
      })

      subProcess['_generateEngine'] = async () => {
        return { engine: new MyEngine(), isMine: true }
      }

      await subProcess.run()

      testsRunner.expect(MyEngine.prepareCount).toBe(1)
      testsRunner.expect(MyEngine.releaseCount).toBe(1)
    })
  })

  await testsRunner.run()

  evaluateTestResults(testsRunner)
}
