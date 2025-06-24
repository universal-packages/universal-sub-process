import { TestsRunner } from '@universal-packages/tests-runner'

import EngineProcess from './EngineProcess'
import { evaluateTestResults } from './utils.test'

export async function engineProcessTest() {
  const testsRunner = new TestsRunner({ runOrder: 'parallel' })

  testsRunner.describe('EngineProcess', () => {
    testsRunner.test('should throw error when killObject is not implemented', () => {
      const engineProcess = new EngineProcess(123, {})

      testsRunner
        .expect(() => {
          engineProcess.kill('SIGTERM')
        })
        .toThrow('Not implemented')
    })

    testsRunner.test('should store processId and object correctly', () => {
      const testObject = { test: 'data' }
      const engineProcess = new EngineProcess(456, testObject)

      testsRunner.expect(engineProcess.processId).toBe(456)
      testsRunner.expect(engineProcess.object).toBe(testObject)
    })
  })

  await testsRunner.run()

  evaluateTestResults(testsRunner)
}
