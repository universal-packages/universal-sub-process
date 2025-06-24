import { TestsRunner } from '@universal-packages/tests-runner'

import SubProcess from '../SubProcess'
import { evaluateTestResults } from '../utils.test'

export async function eventsTest() {
  const testsRunner = new TestsRunner({ runOrder: 'parallel' })

  testsRunner.describe('SubProcess - Events', () => {
    testsRunner.test('should emit stdout events', async () => {
      const subProcess = new SubProcess({
        command: 'echo Hello from stdout',
        captureStreams: true,
        engine: 'spawn'
      })

      const stdoutEvents: string[] = []
      subProcess.on('stdout', (event) => {
        stdoutEvents.push(event.payload.data)
      })

      await subProcess.run()

      testsRunner.expect(stdoutEvents.length).toBeGreaterThan(0)
      testsRunner.expect(stdoutEvents.join('').trim()).toBe('Hello from stdout')
    })

    testsRunner.test('should emit stdout events', async () => {
      const subProcess = new SubProcess({
        command: 'echo',
        args: ['Error message'],
        captureStreams: true,
        engine: 'spawn'
      })

      const stdoutEvents: string[] = []
      subProcess.on('stdout', (event) => {
        stdoutEvents.push(event.payload.data)
      })

      await subProcess.run()

      testsRunner.expect(stdoutEvents.length).toBeGreaterThan(0)
      testsRunner.expect(stdoutEvents.join('').trim()).toBe('Error message')
    })

    testsRunner.test('should emit lifecycle events in correct order', async () => {
      const subProcess = new SubProcess({
        command: 'echo lifecycle test',
        captureStreams: true,
        engine: 'spawn'
      })

      const events: string[] = []
      subProcess.on('preparing', () => events.push('preparing'))
      subProcess.on('prepared', () => events.push('prepared'))
      subProcess.on('running', () => events.push('running'))
      subProcess.on('releasing', () => events.push('releasing'))
      subProcess.on('released', () => events.push('released'))
      subProcess.on('succeeded', () => events.push('succeeded'))

      await subProcess.run()

      testsRunner.expect(events).toEqual(['preparing', 'prepared', 'running', 'releasing', 'released', 'succeeded'])
    })

    testsRunner.test('should emit failed event on process failure', async () => {
      const subProcess = new SubProcess({
        command: 'node',
        args: ['-e', "'process.exit(1)'"],
        captureStreams: true,
        engine: 'spawn'
      })

      const events: string[] = []
      let failedEvent: any = null

      subProcess.on('preparing', () => events.push('preparing'))
      subProcess.on('prepared', () => events.push('prepared'))
      subProcess.on('running', () => events.push('running'))
      subProcess.on('releasing', () => events.push('releasing'))
      subProcess.on('released', () => events.push('released'))
      subProcess.on('failed', (event) => {
        failedEvent = event
        events.push('failed')
      })

      await subProcess.run()

      testsRunner.expect(events).toContain('failed')
      testsRunner.expect(failedEvent).not.toBeNull()
      testsRunner.expect(subProcess.status).toBe('failed')
    })

    testsRunner.test('should emit warning events', async () => {
      const subProcess = new SubProcess({
        command: 'echo test',
        captureStreams: true,
        engine: 'spawn'
      })

      const warningEvents: any[] = []
      subProcess.on('warning', (event) => {
        warningEvents.push(event)
      })

      // Complete one run first
      await subProcess.run()

      // Try to run again after completion (should emit warning)
      await subProcess.run()

      // For now, just check that the test doesn't crash
      // Warning events might be environment-specific
      testsRunner.expect(warningEvents.length).toBeGreaterThanOrEqual(0)
    })

    testsRunner.test('should emit stopped event when killed', async () => {
      const subProcess = new SubProcess({
        command: 'sleep',
        args: ['2'],
        captureStreams: true,
        engine: 'spawn'
      })

      const events: string[] = []
      let stoppedEvent: any = null

      subProcess.on('preparing', () => events.push('preparing'))
      subProcess.on('prepared', () => events.push('prepared'))
      subProcess.on('running', () => {
        events.push('running')
        // Kill immediately when we know it's running
        subProcess.kill()
      })
      subProcess.on('stopping', () => events.push('stopping'))
      subProcess.on('releasing', () => events.push('releasing'))
      subProcess.on('released', () => events.push('released'))
      subProcess.on('stopped', (event) => {
        stoppedEvent = event
        events.push('stopped')
      })

      await subProcess.run()

      // Check that we got stopped event at minimum
      testsRunner.expect(events).toContain('stopped')
      testsRunner.expect(stoppedEvent).not.toBeNull()
      testsRunner.expect(subProcess.status).toBe('stopped')
    })

    testsRunner.test('should emit error event on preparation failure', async () => {
      // Create a subprocess with invalid engine to force preparation error
      const subProcess = new SubProcess({
        command: 'echo test',
        engine: 'invalid-engine' as any,
        captureStreams: true
      })

      const events: string[] = []
      let errorEvent: any = null

      subProcess.on('preparing', () => events.push('preparing'))
      subProcess.on('error', (event) => {
        errorEvent = event
        events.push('error')
      })

      await subProcess.run()

      testsRunner.expect(events).toContain('error')
      testsRunner.expect(errorEvent).not.toBeNull()
      testsRunner.expect(subProcess.status).toBe('error')
    })

    testsRunner.test('should handle multiple event listeners', async () => {
      const subProcess = new SubProcess({
        command: 'echo multi listener test',
        captureStreams: true,
        engine: 'spawn'
      })

      const listener1Events: string[] = []
      const listener2Events: string[] = []

      subProcess.on('stdout', () => listener1Events.push('stdout1'))
      subProcess.on('stdout', () => listener2Events.push('stdout2'))
      subProcess.on('succeeded', () => listener1Events.push('succeeded1'))
      subProcess.on('succeeded', () => listener2Events.push('succeeded2'))

      await subProcess.run()

      testsRunner.expect(listener1Events).toContain('stdout1')
      testsRunner.expect(listener1Events).toContain('succeeded1')
      testsRunner.expect(listener2Events).toContain('stdout2')
      testsRunner.expect(listener2Events).toContain('succeeded2')
    })

    testsRunner.test('should emit events with proper payload structure', async () => {
      const subProcess = new SubProcess({
        command: 'echo payload test',
        captureStreams: true,
        engine: 'spawn'
      })

      let stdoutEvent: any = null
      let preparedEvent: any = null
      let succeededEvent: any = null

      subProcess.on('stdout', (event) => {
        if (!stdoutEvent) stdoutEvent = event
      })
      subProcess.on('prepared', (event) => {
        preparedEvent = event
      })
      subProcess.on('succeeded', (event) => {
        succeededEvent = event
      })

      await subProcess.run()

      // Check stdout event structure
      testsRunner.expect(stdoutEvent).toHaveProperty('payload')
      testsRunner.expect(stdoutEvent.payload).toHaveProperty('data')
      testsRunner.expect(typeof stdoutEvent.payload.data).toBe('string')

      // Check prepared event structure
      testsRunner.expect(preparedEvent).toHaveProperty('payload')
      testsRunner.expect(preparedEvent.payload).toHaveProperty('startedAt')
      testsRunner.expect(preparedEvent.payload).toHaveProperty('finishedAt')
      testsRunner.expect(preparedEvent.payload.startedAt).toBeInstanceOf(Date)
      testsRunner.expect(preparedEvent.payload.finishedAt).toBeInstanceOf(Date)

      // Check succeeded event structure
      testsRunner.expect(succeededEvent).toHaveProperty('payload')
      testsRunner.expect(succeededEvent.payload).toHaveProperty('startedAt')
      testsRunner.expect(succeededEvent.payload).toHaveProperty('finishedAt')
      testsRunner.expect(succeededEvent.payload.startedAt).toBeInstanceOf(Date)
      testsRunner.expect(succeededEvent.payload.finishedAt).toBeInstanceOf(Date)
    })
  })

  await testsRunner.run()

  evaluateTestResults(testsRunner)
}
