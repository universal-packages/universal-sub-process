import SubProcess from '../src/SubProcess'

export async function runBasicCommandsExample() {
  console.log('\n📋 Example 1: Basic Commands')
  console.log('-'.repeat(40))

  try {
    // Simple echo command
    console.log('🔹 Running: echo "Hello World"')
    const echoProcess = new SubProcess({
      command: 'echo "Hello World"',
      captureStreams: true
    })

    await echoProcess.run()
    console.log(`   Output: ${echoProcess.stdout.trim()}`)
    console.log(`   Exit Code: ${echoProcess.exitCode}`)
    console.log(`   Status: ${echoProcess.status}`)

    // Command with arguments
    console.log('\n🔹 Running command with separate args')
    const lsProcess = new SubProcess({
      command: 'ls',
      args: ['-la', '.'],
      captureStreams: true
    })

    await lsProcess.run()
    console.log(`   Exit Code: ${lsProcess.exitCode}`)
    console.log(`   Lines of output: ${lsProcess.stdout.split('\n').length - 1}`)

    // Mixed command and args
    console.log('\n🔹 Mixed command string and additional args')
    const mixedProcess = new SubProcess({
      command: 'echo "First"',
      args: ['&&', 'echo', '"Second"'],
      captureStreams: true
    })

    await mixedProcess.run()
    console.log(`   Output: ${mixedProcess.stdout.trim()}`)

    // Simple node command
    console.log('\n🔹 Running Node.js code')
    const nodeProcess = new SubProcess({
      command: 'node',
      args: ['--version'],
      captureStreams: true
    })

    await nodeProcess.run()
    console.log(`   Output: Node.js ${nodeProcess.stdout.trim()}`)

    console.log('\n✅ Basic commands example completed!')
  } catch (error) {
    console.error('❌ Error in basic commands example:', error instanceof Error ? error.message : String(error))
    throw error
  }
}
