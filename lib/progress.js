'use strict'

const fs = require('fs-extra')

async function get_progress(ENV, CONSOLE) {
  const dir_pre_post_tmp = `${ENV.DIR.PRE_POST}/.tmp`
  await fs.ensureDir(dir_pre_post_tmp)
  const progress_path = `${dir_pre_post_tmp}/progress.json`

  const progress_exist = await fs.pathExists(progress_path)
  if (progress_exist) {
    const progress = await fs.readJson(progress_path)
    CONSOLE.VERBOSE(`Progress: ${JSON.stringify(progress)}`)
    return progress
  } else {
    throw new Error(`Progress file ${progress_path} does not exist; please run init command!`)
  }
}

async function update_progress(progress, ENV, CONSOLE) {
  const progress_path = `${ENV.DIR.PRE_POST}/.tmp/progress.json`
  await fs.ensureFile(progress_path)
  await fs.writeJSON(progress_path, progress)
}

module.exports = {get_progress, update_progress}