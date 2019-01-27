'use strict'

const fs = require('fs-extra')

const get_ENV = require('../lib/get_ENV')
const {update_progress} = require('../lib/progress')
const {writeFileWrapper} = require('../lib/wrapper')

const STAGES = Object.freeze(require('../lib/stages.json'))

async function init(argv, CONSOLE) {
  const ENV = await get_ENV(argv, CONSOLE)

  /* create progress file */
  const progress = {stage: STAGES.INIT}
  await update_progress(progress, ENV)

  /* create main.md file */
  const main_md_path = `${ENV.DIR.PRE_POST}/main.md`
  await fs.ensureFile(main_md_path)
  await writeFileWrapper(main_md_path, 
`## About

<!--more-->

## Misc
`)

  /* create meta.yaml file */
  const meta_yaml_path = `${ENV.DIR.PRE_POST}/meta.yaml`
  await fs.ensureFile(meta_yaml_path)
  await writeFileWrapper(meta_yaml_path, 
`title:
date: YYYY-MM-DD
subtitle:
tags:
  - [tag1]
  - [tag2]
`)

  CONSOLE.INFO("Files have been successfully initiated!")
}

module.exports = init