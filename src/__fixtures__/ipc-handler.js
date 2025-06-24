process.on('message', (msg) => {
  if (msg === 'ping') {
    process.send('pong')
  }
})

console.log('IPC ready')
