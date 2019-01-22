#!/usr/bin/env node

'use strict'
require('console-info')
require('console-warn')
require('console-error')
const fs = require('fs-extra')

// Get episode number
if (process.argv.length < 3) {
  console.warn('Too few input argument. Want the episode number!')
  process.exit(1)
}
let episode_n = Number(process.argv[2])
console.info(`Now working on Episode [${episode_n}].`)

const DIR_ROOT = '~/repo/sapu-podcast'
const DIR_PRE_POST = `${DIR_ROOT}/source/_pre_posts/${episode_n}`
const DIR_POST = `${DIR_ROOT}/source/_posts`

async function get_progress() {
  const DIR_PRE_POST_TMP = `${DIR_PRE_POST}/.tmp`
  await fs.ensureDir(DIR_PRE_POST_TMP)
  console.info(DIR_PRE_POST_TMP)
  const FILE_PROGRESS = `${DIR_PRE_POST_TMP}/progress.json`
  await fs.ensureFile(FILE_PROGRESS)

  try {
    const progress = await fs.readJson(FILE_PROGRESS)
    console.info(progress)
  } catch (err) {
    console.error(err)
  }
}

get_progress()