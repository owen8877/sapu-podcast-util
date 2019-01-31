'use strict'

const fs = require('fs-extra')
const moment = require('moment')

const get_ENV = require('../lib/get_ENV')
const {get_progress} = require('../lib/progress')
const {exec} = require('../lib/wrapper')
const {get_meta_data} = require('../lib/get_data')

const STAGES = Object.freeze(require('../lib/stages.json'))

async function generate_qrcode(meta_data, ENV, CONSOLE) {
  const n_dashed_title = `${ENV.episode_n}-${meta_data.title.replace(/ /g, '-')}`
  const template_path = `${ENV.MEDIA.PIC}/template.xcf`
  const image_working_path = `${ENV.MEDIA.PIC}/${ENV.episode_n}`
  const image_path = `${ENV.MEDIA.PIC}/${ENV.episode_n}/${ENV.episode_n}.xcf`
  
  await fs.ensureDir(image_working_path)
  await fs.copy(template_path, image_path)
  CONSOLE.INFO('Copied template file.')

  const date = moment(meta_data.date)

  const qr_command = `cd ${image_working_path}; qrencode -l L -t PNG -o qr.png ${ENV.CONFIG.URL}/${date.year()}/${date.month()+1}/${date.date()}/${n_dashed_title}/`
  CONSOLE.INFO(qr_command)
  const qr_result = await exec(qr_command, CONSOLE)
}

async function qrcode(argv, CONSOLE) {
  const ENV = await get_ENV(argv, CONSOLE)
  const progress = await get_progress(ENV, CONSOLE)

  const meta_data = await get_meta_data(ENV, CONSOLE)

  generate_qrcode(meta_data, ENV, CONSOLE)
}

module.exports = qrcode