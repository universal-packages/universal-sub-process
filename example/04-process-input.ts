import { Readable } from 'stream'

import { SubProcess } from '../src/SubProcess'

export async function runProcessInputExample() {
  console.log('\n⌨️  Example 4: Process Input')
  console.log('-'.repeat(40))

  try {
    // String input
    console.log('🔹 Providing string input')
    const stringInputProcess = new SubProcess({
      command: 'node',
      args: ['-e', 'process.stdin.setEncoding("utf8"); process.stdin.on("data", (data) => { console.log("Received:", data.toString().trim()); });'],
      input: 'Hello from string input!',
      captureStreams: true
    })

    await stringInputProcess.run()
    console.log(`   Output: ${stringInputProcess.stdout.trim()}`)

    // Buffer input
    console.log('\n🔹 Providing buffer input')
    const bufferInputProcess = new SubProcess({
      command: 'node',
      args: ['-e', 'process.stdin.on("data", (data) => { console.log("Buffer received, length:", data.length); console.log("Content:", data.toString()); });'],
      input: Buffer.from('Hello from buffer!', 'utf8'),
      captureStreams: true
    })

    await bufferInputProcess.run()
    console.log(`   Output: ${bufferInputProcess.stdout.trim()}`)

    // Array of strings input
    console.log('\n🔹 Providing array of strings as input')
    const arrayInputProcess = new SubProcess({
      command: 'node',
      args: [
        '-e',
        'let inputData = ""; process.stdin.setEncoding("utf8"); process.stdin.on("data", (data) => { inputData += data; }); process.stdin.on("end", () => { console.log("Complete input:", inputData.trim()); });'
      ],
      input: ['Line 1', 'Line 2', 'Line 3'],
      captureStreams: true
    })

    await arrayInputProcess.run()
    console.log(`   Output: ${arrayInputProcess.stdout.trim()}`)

    // Readable stream input
    console.log('\n🔹 Providing readable stream as input')
    const readable = new Readable()
    readable.push('Stream line 1\n')
    readable.push('Stream line 2\n')
    // Don't push null here, let the SubProcess handle it

    const streamInputProcess = new SubProcess({
      command: 'node',
      args: [
        '-e',
        'let lines = []; process.stdin.setEncoding("utf8"); process.stdin.on("data", (data) => { lines.push(...data.split("\\n").filter(line => line.trim())); }); process.stdin.on("end", () => { console.log("Stream lines received:", lines.length); lines.forEach((line, i) => console.log("Line " + (i + 1) + ": " + line)); });'
      ],
      input: readable,
      captureStreams: true
    })

    await streamInputProcess.run()
    console.log(`   Output:`)
    streamInputProcess.stdout
      .trim()
      .split('\n')
      .forEach((line) => {
        console.log(`   ${line}`)
      })

    // Interactive-style input simulation
    console.log('\n🔹 Simulating interactive input')
    const interactiveProcess = new SubProcess({
      command: 'node',
      args: [
        '-e',
        'process.stdin.setEncoding("utf8"); let questionIndex = 0; const questions = ["What is your name?", "What is your age?"]; console.log(questions[questionIndex]); process.stdin.on("data", (data) => { const answer = data.toString().trim(); console.log("You answered:", answer); questionIndex++; if (questionIndex < questions.length) { console.log(questions[questionIndex]); } else { console.log("Thank you for your answers!"); process.exit(0); } });'
      ],
      input: ['John Doe', '25'],
      captureStreams: true
    })

    await interactiveProcess.run()
    console.log(`   Interactive output:`)
    interactiveProcess.stdout
      .trim()
      .split('\n')
      .forEach((line) => {
        console.log(`   ${line}`)
      })

    // No input (default behavior)
    console.log('\n🔹 Process with no input (default)')
    const noInputProcess = new SubProcess({
      command: 'node',
      args: ['-e', 'console.log("Process started"); setTimeout(() => { console.log("Process finished"); }, 100);'],
      // No input specified - will use default empty input
      captureStreams: true
    })

    await noInputProcess.run()
    console.log(`   Output: ${noInputProcess.stdout.trim()}`)

    console.log('\n✅ Process input example completed!')
  } catch (error) {
    console.error('❌ Error in process input example:', error instanceof Error ? error.message : String(error))
    throw error
  }
}
