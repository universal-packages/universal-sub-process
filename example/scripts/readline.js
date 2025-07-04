#!/usr/bin/env node
import readline from 'readline'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

rl.question('What is your name? ', (name) => {
  console.log('Nice to meet you, ' + name + '!')
  rl.question('What is your favorite color? ', (color) => {
    console.log('Great! ' + color + ' is a beautiful color!')
    rl.close()
  })
})
