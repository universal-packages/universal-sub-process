import { Orchestration } from '../src/Orchestration'

export async function runOrchestrationExample() {
  console.log('\n🎭 Example 10: Orchestration')
  console.log('-'.repeat(40))

  try {
    await basicConcurrency()
    await processIndexes()
    await stopOnFailure()
    await continueOnFailure()
    await dynamicProcessAddition()
    await processMessaging()
    await eventMonitoring()

    console.log('\n✅ Orchestration example completed!')
  } catch (error) {
    console.error('❌ Error in orchestration example:', error instanceof Error ? error.message : String(error))
    throw error
  }
}

async function basicConcurrency() {
  console.log('\n📊 Basic Concurrency Control')
  console.log('Running 6 processes with maxConcurrency = 3')

  const orchestration = new Orchestration({
    maxConcurrency: 3
  })

  // Add 6 processes that will run in batches of 3
  for (let i = 1; i <= 6; i++) {
    orchestration.addProcess({
      command: `echo "Task ${i} completed"`,
      captureStreams: true
    })
  }

  const start = Date.now()
  await orchestration.run()
  const duration = Date.now() - start

  console.log(`✅ Completed 6 processes in ${duration}ms`)
}

async function processIndexes() {
  console.log('\n🏷️  Process Index Management')
  console.log('Each process gets a unique index (1-based), reused when processes complete')

  const orchestration = new Orchestration({
    maxConcurrency: 2
  })

  // Add processes that will show their process index
  for (let i = 1; i <= 4; i++) {
    orchestration.addProcess({
      command: 'sh',
      args: ['-c', 'echo "Process $PROCESS_INDEX: Task ' + i + '"'],
      captureStreams: true
    })
  }

  orchestration.on('process:stdout', (event) => {
    console.log(`📤 ${event.payload.data.trim()}`)
  })

  await orchestration.run()
  console.log('✅ Notice how indexes 1-2 were reused for processes 3-4')
}

async function stopOnFailure() {
  console.log('\n🛑 Stop on Failure')
  console.log('When stopOnFailure=true, all processes stop if one fails')

  const orchestration = new Orchestration({
    maxConcurrency: 2,
    stopOnFailure: true
  })

  orchestration.addProcess({
    command: 'echo "Task 1: Success"',
    captureStreams: true
  })

  orchestration.addProcess({
    command: 'echo "Task 2: Will fail" && exit 1',
    captureStreams: true
  })

  orchestration.addProcess({
    command: 'echo "Task 3: Should not run"',
    captureStreams: true
  })

  let succeeded = 0
  let failed = 0
  let stopped = 0

  orchestration.on('process:succeeded', () => succeeded++)
  orchestration.on('process:failed', () => failed++)
  orchestration.on('process:stopped', () => stopped++)

  await orchestration.run()
  console.log(`✅ Results: ${succeeded} succeeded, ${failed} failed, ${stopped} stopped`)
}

async function continueOnFailure() {
  console.log('\n🔄 Continue on Failure')
  console.log('When stopOnFailure=false, processes continue even if some fail')

  const orchestration = new Orchestration({
    maxConcurrency: 2,
    stopOnFailure: false // Default behavior
  })

  orchestration.addProcess({
    command: 'echo "Task 1: Success"',
    captureStreams: true
  })

  orchestration.addProcess({
    command: 'echo "Task 2: Will fail" && exit 1',
    captureStreams: true
  })

  orchestration.addProcess({
    command: 'echo "Task 3: Will run despite failure"',
    captureStreams: true
  })

  let succeeded = 0
  let failed = 0

  orchestration.on('process:succeeded', () => succeeded++)
  orchestration.on('process:failed', () => failed++)

  await orchestration.run()
  console.log(`✅ Results: ${succeeded} succeeded, ${failed} failed (all processes ran)`)
}

async function dynamicProcessAddition() {
  console.log('\n➕ Dynamic Process Addition')
  console.log('Adding processes while orchestration is running')

  const orchestration = new Orchestration({
    maxConcurrency: 2
  })

  // Add initial processes
  orchestration.addProcess({
    command: 'echo "Initial task 1"',
    captureStreams: true
  })

  orchestration.addProcess({
    command: 'echo "Initial task 2"',
    captureStreams: true
  })

  // Start orchestration
  const runPromise = orchestration.run()

  // Add more processes after a short delay
  setTimeout(() => {
    console.log('  ➕ Adding dynamic processes...')
    orchestration.addProcess({
      command: 'echo "Dynamic task 1"',
      captureStreams: true
    })
    orchestration.addProcess({
      command: 'echo "Dynamic task 2"',
      captureStreams: true
    })
  }, 100)

  orchestration.on('process:stdout', (event) => {
    console.log(`  📤 ${event.payload.data.trim()}`)
  })

  await runPromise
  console.log('✅ Dynamic process addition completed')
}

async function processMessaging() {
  console.log('\n💬 Inter-Process Communication')
  console.log('Demonstrates messaging between parent and child processes')

  const orchestration = new Orchestration({
    maxConcurrency: 2
  })

  // Add processes that can send messages (simulated)
  orchestration.addProcess({
    command: 'echo "Worker 1 sending message to parent"',
    captureStreams: true
  })

  orchestration.addProcess({
    command: 'echo "Worker 2 sending message to parent"',
    captureStreams: true
  })

  // Simulate sending messages to processes
  setTimeout(() => {
    console.log('  📤 Parent sending message to process 1')
    orchestration.sendMessage({ type: 'work-assignment', task: 'process data' }, 1)
  }, 100)

  setTimeout(() => {
    console.log('  📤 Parent broadcasting message to all processes')
    orchestration.sendMessage({ type: 'status-check' })
  }, 200)

  orchestration.on('process:stdout', (event) => {
    console.log(`  📤 Process ${event.payload.subProcess.processIndex}: ${event.payload.data.trim()}`)
  })

  await orchestration.run()
  console.log('✅ Messaging example completed')
  console.log('  💡 For full messaging, use Orchestration.sendMessageToParent() and')
  console.log('      Orchestration.onParentMessage() in child processes')
}

async function eventMonitoring() {
  console.log('\n📊 Event Monitoring')
  console.log('Comprehensive process lifecycle monitoring')

  const orchestration = new Orchestration({
    maxConcurrency: 2
  })

  // Add various processes
  orchestration.addProcess({
    command: 'echo "Fast task" && sleep 0.2',
    captureStreams: true
  })

  orchestration.addProcess({
    command: 'echo "Slow task" && sleep 0.5',
    captureStreams: true
  })

  orchestration.addProcess({
    command: 'echo "Error task" && exit 1',
    captureStreams: true
  })

  const stats = {
    running: 0,
    succeeded: 0,
    failed: 0,
    maxConcurrent: 0
  }

  orchestration.on('process:running', (event) => {
    stats.running++
    stats.maxConcurrent = Math.max(stats.maxConcurrent, stats.running)
    console.log(`  🚀 Process ${event.payload.subProcess.processIndex} started (${stats.running} running)`)
  })

  orchestration.on('process:succeeded', (event) => {
    stats.running--
    stats.succeeded++
    console.log(`  ✅ Process ${event.payload.subProcess.processIndex} succeeded (${stats.running} running)`)
  })

  orchestration.on('process:failed', (event) => {
    stats.running--
    stats.failed++
    console.log(`  ❌ Process ${event.payload.subProcess.processIndex} failed (${stats.running} running)`)
  })

  orchestration.on('process:stdout', (event) => {
    console.log(`  📤 Process ${event.payload.subProcess.processIndex}: ${event.payload.data.trim()}`)
  })

  await orchestration.run()

  console.log(`✅ Final stats: ${stats.succeeded} succeeded, ${stats.failed} failed, max concurrent: ${stats.maxConcurrent}`)
}
