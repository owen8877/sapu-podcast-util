#!/usr/bin/env node

'use strict'
require('console-info')
require('console-warn')
require('console-error')
const yargs = require('yargs')

const generate = require('./command/generate')
const deploy = require('./command/deploy')
const init = require('./command/init')

const CONSOLE = {
  VERBOSE_LEVEL: 0,
  ERROR:   function () {                              console.error.apply(console, arguments) },
  WARN:    function () { CONSOLE.VERBOSE_LEVEL >= 0 && console.warn.apply(console, arguments) },
  INFO:    function () { CONSOLE.VERBOSE_LEVEL >= 0 && console.info.apply(console, arguments) },
  VERBOSE: function () { CONSOLE.VERBOSE_LEVEL >= 1 &&  console.log.apply(console, arguments) },
  DEBUG:   function () { CONSOLE.VERBOSE_LEVEL >= 2 &&  console.log.apply(console, arguments) },
}

const argv = yargs
  .command(['generate [episode_n]', 'g'], 'Generate post file.',
    args => args.positional('episode_n', {type: 'number'}),
    argv => generate(argv, CONSOLE))
  .command(['init [episode_n]', 'i'], 'Initiate pre_post file.',
    args => args.positional('episode_n', {type: 'number'}),
    argv => init(argv, CONSOLE))
  .command(['deploy [episode_n]', 'd'], 'Deploy static files.',
    args => args.positional('episode_n', {type: 'number'}),
    argv => deploy(argv, CONSOLE))
  .count('verbose')
    .alias('v', 'verbose')
  .option('only', {
    describe: 'choose target when deploying',
    choices: ['audio', 'image', 'pages'],
    default: ['audio', 'image', 'pages'],
    type: 'array',
  })
  .help()
  .argv
CONSOLE.VERBOSE_LEVEL = argv.verbose