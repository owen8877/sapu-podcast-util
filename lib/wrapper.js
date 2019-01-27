'use strict'

const fs_legacy = require('fs')
const exec_legacy = require('child_process').exec
const util = require('util')

async function readFileWrapper(content_path, CONSOLE) {
  const readFile = util.promisify(fs_legacy.readFile)
  try {
    return await readFile(content_path, 'utf8')
  } catch (e) {
    CONSOLE.ERROR(`Cannot find content file ${content_path}`)
    throw e
  }
}

async function writeFileWrapper(content_path, payload, CONSOLE) {
  const writeFile = util.promisify(fs_legacy.writeFile)
  try {
    return await writeFile(content_path, payload, 'utf8')
  } catch (e) {
    CONSOLE.ERROR(`Cannot write to file ${content_path}`)
    throw e
  }
}

async function exec(command, CONSOLE) {
  const result = await new Promise((res, rej) => exec_legacy(command, (error, stdout, stderr) => error ? rej(error) : res({stdout, stderr})))
  CONSOLE.VERBOSE(`Stdout:\n${result.stdout}\nStderr:\n${result.stderr}`)
  return result
}

module.exports = {readFileWrapper, writeFileWrapper, exec}