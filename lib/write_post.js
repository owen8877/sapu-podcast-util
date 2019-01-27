'use strict'

const fs = require('fs-extra')
const util = require('util')
const fs_legacy = require('fs')

async function write_composed_post(composed_data, n_dashed_title, ENV, CONSOLE) {
  const composed_post_path = `${ENV.DIR.POST}/${n_dashed_title}.md`
  const post_exist = await fs.pathExists(composed_post_path)
  if (post_exist) {
    CONSOLE.WARN(`Post ${composed_post_path} exists and will be overwritten.`)
  }
  const writeFile = util.promisify(fs_legacy.writeFile)
  await writeFile(composed_post_path, composed_data, 'utf8')
  CONSOLE.INFO(`Generated post written to ${composed_post_path}.`)
}

module.exports = {write_composed_post}