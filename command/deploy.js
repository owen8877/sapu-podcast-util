'use strict'

const get_ENV = require('../lib/get_ENV')
const {get_progress, update_progress} = require('../lib/progress')
const {exec} = require('../lib/wrapper')
const {get_meta_data} = require('../lib/get_data')

const STAGES = Object.freeze(require('../lib/stages.json'))

async function upload_audio(n_dashed_title, n_title, ENV, CONSOLE) {
  const audio_file = `${ENV.MEDIA.AUDIO}/${n_title}/${n_dashed_title}.mp3`
  const scp_command = `scp -i ${ENV.SECRET.PRIV_KEY} -o "PasswordAuthentication=no" "${audio_file}" "${ENV.SECRET.SERVER}/podcast/${n_dashed_title}.mp3"`
  const scp_result = await exec(scp_command, CONSOLE)
}

async function upload_image(n_dashed_title, ENV, CONSOLE) {
  const image_file = `${ENV.MEDIA.PIC}/${ENV.episode_n}/${ENV.episode_n}.jpg`
  const scp_command = `scp -i ${ENV.SECRET.PRIV_KEY} -o "PasswordAuthentication=no" "${image_file}" "${ENV.SECRET.SERVER}/image/${n_dashed_title}.jpg"`
  const scp_result = await exec(scp_command, CONSOLE)
}

async function upload_page(ENV, CONSOLE) {
  const hexo_d_command = `cd ${ENV.DIR.ROOT}; hexo d`
  const hexo_d_result = await exec(hexo_d_command, CONSOLE)
}

async function deploy(argv, CONSOLE) {
  const ENV = await get_ENV(argv, CONSOLE)
  const progress = await get_progress(ENV, CONSOLE)

  /* check stage */
  if (progress.stage < STAGES.GENERATED) {
    CONSOLE.WARN('The pages have not been generated yet! Please run generate command.')
    return
  }

  if (progress.stage >= STAGES.DEPLOYED) {
    CONSOLE.WARN('The pages seem to be deployed!')
  }

  /* deploying... */
  const meta_data = await get_meta_data(ENV, CONSOLE)
  const n_dashed_title = `${ENV.episode_n}-${meta_data.title.replace(/ /g, '-')}`,
    n_title = `${ENV.episode_n} ${meta_data.title}`

  if (argv.only.find(item => item === 'audio')) {
    await upload_audio(n_dashed_title, n_title, ENV, CONSOLE)
    CONSOLE.INFO('Audio file has been uploaded!')
  }
  if (argv.only.find(item => item === 'image')) {
    await upload_image(n_dashed_title, ENV, CONSOLE)
    CONSOLE.INFO('Image file has been uploaded!')
  }
  if (argv.only.find(item => item === 'pages')) {
    await upload_page(ENV, CONSOLE)
    CONSOLE.INFO('Page files have been uploaded!')
  }

  /* update progress */
  progress.stage = STAGES.DEPLOYED
  await update_progress(progress, ENV, CONSOLE)
}

module.exports = deploy