'use strict'

const fs = require('fs-extra')

async function get_ENV(argv, CONSOLE) {
  const episode_n = await argv.episode_n
  CONSOLE.INFO(`Now working on Episode [${episode_n}].`)

  const ENV = await fs.readJson('secret.json')
  ENV.DIR.PRE_POST = `${ENV.DIR.PRE_POST}/${episode_n}`
  ENV.episode_n = episode_n

  return ENV
}

module.exports = get_ENV