import SubProcess from '../src/SubProcess'

export async function runEventsExample() {
  console.log('\n🎭 Example 5: Events')
  console.log('-'.repeat(40))

  try {
    // Basic event listening
    console.log('🔹 Basic event monitoring')
    const eventProcess = new SubProcess({
      command: 'node',
      args: [
        '-e',
        '\'console.log("Starting process..."); setTimeout(() => { console.log("Process working..."); setTimeout(() => { console.log("Process completed!"); }, 500); }, 500);\''
      ],
      captureStreams: true
    })

    // Listen to lifecycle events
    eventProcess.on('running', () => {
      console.log('   📋 Event: Process started running')
    })

    eventProcess.on('succeeded', () => {
      console.log('   ✅ Event: Process completed successfully')
    })

    eventProcess.on('failed', (event) => {
      console.log('   ❌ Event: Process failed:', event.payload)
    })

    eventProcess.on('error', (event) => {
      console.log('   💥 Event: Process error:', event.payload)
    })

    await eventProcess.run()
    console.log(`   Final status: ${eventProcess.status}`)

    // Stdout/stderr events
    console.log('\n🔹 Monitoring stdout and stderr events')
    const streamEventProcess = new SubProcess({
      command: 'node',
      args: ['-e', 'console.log("This goes to stdout"); console.error("This goes to stderr"); console.log("More stdout"); console.error("More stderr");'],
      captureStreams: true
    })

    const stdoutChunks: string[] = []
    const stderrChunks: string[] = []

    streamEventProcess.on('stdout', (event) => {
      const data = event.payload.data
      stdoutChunks.push(data)
      console.log(`   📤 STDOUT: ${data.trim()}`)
    })

    streamEventProcess.on('stderr', (event) => {
      const data = event.payload.data
      stderrChunks.push(data)
      console.log(`   📥 STDERR: ${data.trim()}`)
    })

    await streamEventProcess.run()
    console.log(`   Total stdout chunks: ${stdoutChunks.length}`)
    console.log(`   Total stderr chunks: ${stderrChunks.length}`)

    // Wildcard event listener
    console.log('\n🔹 Using wildcard event listener')
    const wildcardProcess = new SubProcess({
      command: 'echo',
      args: ['Wildcard event test'],
      captureStreams: true
    })

    const events: string[] = []
    wildcardProcess.on('*' as any, (event) => {
      events.push(event.event)
      console.log(`   🌟 Event: ${event.event}`)
    })

    await wildcardProcess.run()
    console.log(`   Total events captured: ${events.length}`)
    console.log(`   Events: ${events.join(', ')}`)

    // Process that will be killed
    console.log('\n🔹 Monitoring kill events')
    const killProcess = new SubProcess({
      command: 'node',
      args: ['-e', 'console.log("Long running process started..."); setInterval(() => { console.log("Still running..."); }, 200);'],
      captureStreams: true
    })

    killProcess.on('running', () => {
      console.log('   🚀 Kill test process started')
      // Kill the process after a short delay
      setTimeout(async () => {
        if (killProcess.status === 'running') {
          console.log('   🔪 Sending kill signal...')
          await killProcess.kill('SIGTERM')
        }
      }, 800)
    })

    killProcess.on('stopped', (event) => {
      console.log('   ☠️  Process was killed')
    })

    killProcess.on('stopped', () => {
      console.log('   🛑 Process stopped')
    })

    try {
      await killProcess.run()
    } catch (error) {
      console.log(`   Expected error from killed process: ${error instanceof Error ? error.message : String(error)}`)
    }

    // Event timing
    console.log('\n🔹 Event timing demonstration')
    const timingProcess = new SubProcess({
      command: 'node',
      args: ['-e', 'setTimeout(() => console.log("Done"), 300);'],
      captureStreams: true
    })

    const startTime = Date.now()
    const eventTimes: Array<{ event: string; time: number }> = []

    timingProcess.on('*' as any, (event) => {
      eventTimes.push({
        event: event.event,
        time: Date.now() - startTime
      })
    })

    await timingProcess.run()

    console.log('   Event timeline:')
    eventTimes.forEach(({ event, time }) => {
      console.log(`   ${time.toString().padStart(4)}ms: ${event}`)
    })

    console.log('\n✅ Events example completed!')
  } catch (error) {
    console.error('❌ Error in events example:', error instanceof Error ? error.message : String(error))
    throw error
  }
}
