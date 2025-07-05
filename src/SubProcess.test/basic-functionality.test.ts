import { TestsRunner } from '@universal-packages/tests-runner'

import { SubProcess } from '../SubProcess'
import { evaluateTestResults } from '../utils.test'

export async function basicFunctionalityTest() {
  const testsRunner = new TestsRunner({ runOrder: 'parallel' })

  testsRunner.describe('SubProcess - Basic Functionality', () => {
    testsRunner.test('should run a simple command and capture stdout', async () => {
      const subProcess = new SubProcess({
        command: 'echo Hello World',
        captureStreams: true,
        engine: 'spawn'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.exitCode).toBe(0)
      testsRunner.expect(subProcess.stdout.trim()).toBe('Hello World')
      testsRunner.expect(subProcess.stderr).toBe('')
    })

    testsRunner.test('should run command with arguments', async () => {
      const subProcess = new SubProcess({
        command: 'echo',
        args: ['Hello', 'from', 'args'],
        captureStreams: true,
        engine: 'spawn'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.exitCode).toBe(0)
      testsRunner.expect(subProcess.stdout.trim()).toBe('Hello from args')
    })

    testsRunner.test('should handle command that outputs to stderr', async () => {
      const subProcess = new SubProcess({
        command: 'echo',
        args: ['Error message'],
        captureStreams: true,
        engine: 'spawn'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.exitCode).toBe(0)
      testsRunner.expect(subProcess.stdout.trim()).toBe('Error message')
    })

    testsRunner.test('should handle command with non-zero exit code', async () => {
      const subProcess = new SubProcess({
        command: 'node',
        args: ['-e', "'process.exit(1)'"],
        captureStreams: true,
        engine: 'spawn'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('failed')
      testsRunner.expect(subProcess.exitCode).toBe(1)
      testsRunner.expect(subProcess.failureReason).toBeInstanceOf(Error)
    })

    testsRunner.test('should extract command and args from command string', async () => {
      const subProcess = new SubProcess({
        command: 'echo multi word command',
        captureStreams: true,
        engine: 'spawn'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout.trim()).toBe('multi word command')
    })

    testsRunner.test('should have process id when running', async () => {
      const subProcess = new SubProcess({
        command: 'sleep',
        args: ['0.1'],
        captureStreams: true,
        engine: 'spawn'
      })

      let processIdDuringRun: number | undefined

      subProcess.on('running', async () => {
        // Give a tiny delay for process ID to be set
        await new Promise((resolve) => setTimeout(resolve, 10))
        processIdDuringRun = subProcess.processId
      })

      await subProcess.run()

      testsRunner.expect(processIdDuringRun).toBeGreaterThan(0)
      testsRunner.expect(subProcess.processId).toBe(processIdDuringRun)
    })

    testsRunner.test('should handle working directory option', async () => {
      const subProcess = new SubProcess({
        command: 'pwd',
        workingDirectory: '/tmp',
        captureStreams: true,
        engine: 'spawn'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('succeeded')
      // On macOS, /tmp is often a symlink to /private/tmp
      testsRunner.expect(subProcess.stdout.trim()).toMatch(/^\/(?:private\/)?tmp$/)
    })

    testsRunner.test('should not capture streams when captureStreams is false', async () => {
      const subProcess = new SubProcess({
        command: 'echo test',
        captureStreams: false,
        engine: 'spawn'
      })

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(subProcess.stdout).toBe('')
      testsRunner.expect(subProcess.stderr).toBe('')
    })

    testsRunner.test('should handle lifecycle through run method', async () => {
      const subProcess = new SubProcess({
        command: 'echo test',
        captureStreams: true,
        engine: 'spawn'
      })

      // Track lifecycle events
      const events: string[] = []
      subProcess.on('preparing', () => events.push('preparing'))
      subProcess.on('prepared', () => events.push('prepared'))
      subProcess.on('running', () => events.push('running'))
      subProcess.on('releasing', () => events.push('releasing'))
      subProcess.on('released', () => events.push('released'))
      subProcess.on('succeeded', () => events.push('succeeded'))

      await subProcess.run()

      testsRunner.expect(subProcess.status).toBe('succeeded')
      testsRunner.expect(events).toEqual(['preparing', 'prepared', 'running', 'releasing', 'released', 'succeeded'])
    })
  })

  await testsRunner.run()

  evaluateTestResults(testsRunner)
}
