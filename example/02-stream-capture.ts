import { SubProcess } from '../src/SubProcess'

export async function runStreamCaptureExample() {
  console.log('\n📊 Example 2: Stream Capture')
  console.log('-'.repeat(40))

  try {
    // Capture stdout
    console.log('🔹 Capturing stdout')
    const stdoutProcess = new SubProcess({
      command: 'sh',
      args: ['-c', 'echo "Line 1: stdout message"; echo "Line 2: another stdout message"'],
      captureStreams: true
    })

    await stdoutProcess.run()
    console.log(`   Captured stdout:`)
    console.log(
      `   ${stdoutProcess.stdout
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line)
        .join('\n   ')}`
    )

    // Capture stderr
    console.log('\n🔹 Capturing stderr')
    const stderrProcess = new SubProcess({
      command: 'sh',
      args: ['-c', 'echo "This goes to stderr" >&2; echo "Error line 2" >&2'],
      captureStreams: true
    })

    await stderrProcess.run()
    console.log(`   Captured stderr:`)
    console.log(
      `   ${stderrProcess.stderr
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line)
        .join('\n   ')}`
    )

    // Capture both stdout and stderr
    console.log('\n🔹 Capturing both stdout and stderr')
    const bothProcess = new SubProcess({
      command: 'sh',
      args: ['-c', 'echo "Normal output"; echo "Error output" >&2; echo "More normal output"'],
      captureStreams: true
    })

    await bothProcess.run()
    console.log(`   Stdout: ${bothProcess.stdout.trim()}`)
    console.log(`   Stderr: ${bothProcess.stderr.trim()}`)

    // Show what happens without capture
    console.log('\n🔹 Without stream capture (streams go to console)')
    const noCaptureProcess = new SubProcess({
      command: 'echo',
      args: ['This will go directly to console'],
      captureStreams: false // This is the default
    })

    await noCaptureProcess.run()
    console.log(`   Stdout property: "${noCaptureProcess.stdout}" (empty because not captured)`)
    console.log(`   Stderr property: "${noCaptureProcess.stderr}" (empty because not captured)`)

    // Large output example
    console.log('\n🔹 Handling large output')
    const largeProcess = new SubProcess({
      command: 'sh',
      args: ['-c', 'for i in {1..10}; do echo "Line $i: Some content here"; done'],
      captureStreams: true
    })

    await largeProcess.run()
    const lines = largeProcess.stdout.trim().split('\n')
    console.log(`   Captured ${lines.length} lines of output`)
    console.log(`   First line: ${lines[0]}`)
    console.log(`   Last line: ${lines[lines.length - 1]}`)

    console.log('\n✅ Stream capture example completed!')
  } catch (error) {
    console.error('❌ Error in stream capture example:', error instanceof Error ? error.message : String(error))
    throw error
  }
}
