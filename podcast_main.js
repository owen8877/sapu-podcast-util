#!/usr/bin/env node

'use strict'
require('console-info')
require('console-warn')
require('console-error')
const yaml = require('js-yaml')
const fs_legacy = require('fs')
const fs = require('fs-extra')
const util = require('util')
const moment = require('moment')
const parse = require('csv-parse/lib/sync')
const exec_legacy = require('child_process').exec
const yargs = require('yargs')

const STAGES = Object.freeze({"INIT": 1, "GENERATED": 2, "DEPLOYED": 3})

const argv = yargs
  .command(['generate [episode_n]', 'g'], 'Generate post file.',
    args => args.positional('episode_n', {type: 'number'}),
    generate)
  .command(['init [episode_n]', 'i'], 'Initiate pre_post file.',
    args => args.positional('episode_n', {type: 'number'}),
    init)
  .command(['deploy [episode_n]', 'd'], 'Deploy static files.',
    args => args.positional('episode_n', {type: 'number'}),
    deploy)
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
const VERBOSE_LEVEL = argv.verbose

/* wrapped lib functions */
function ERROR()   {                      console.error.apply(console, arguments); }
function WARN()    { VERBOSE_LEVEL >= 0 && console.warn.apply(console, arguments); }
function INFO()    { VERBOSE_LEVEL >= 0 && console.info.apply(console, arguments); }
function VERBOSE() { VERBOSE_LEVEL >= 1 &&  console.log.apply(console, arguments); }
function DEBUG()   { VERBOSE_LEVEL >= 2 &&  console.log.apply(console, arguments); }

async function readFileWrapper(content_path) {
  const readFile = util.promisify(fs_legacy.readFile)
  try {
    return await readFile(content_path, 'utf8')
  } catch (e) {
    ERROR(`Cannot find content file ${content_path}`)
    throw e
  }
}

async function writeFileWrapper(content_path, payload) {
  const writeFile = util.promisify(fs_legacy.writeFile)
  try {
    return await writeFile(content_path, payload, 'utf8')
  } catch (e) {
    ERROR(`Cannot write to file ${content_path}`)
    throw e
  }
}

async function exec(command) {
  const result = await new Promise((res, rej) => exec_legacy(command, (error, stdout, stderr) => error ? rej(error) : res({stdout, stderr})))
  VERBOSE(`Stdout:\n${result.stdout}\nStderr:\n${result.stderr}`)
  return result
}

/* lib functions */
async function get_progress(ENV) {
  const dir_pre_post_tmp = `${ENV.DIR.PRE_POST}/.tmp`
  await fs.ensureDir(dir_pre_post_tmp)
  const progress_path = `${dir_pre_post_tmp}/progress.json`

  const progress_exist = await fs.pathExists(progress_path)
  if (progress_exist) {
    const progress = await fs.readJson(progress_path)
    VERBOSE(`Progress: ${JSON.stringify(progress)}`)
    return progress
  } else {
    throw new Error(`Progress file ${progress_path} does not exist; please run init command!`)
  }
}

async function update_progress(progress, ENV) {
  const progress_path = `${ENV.DIR.PRE_POST}/.tmp/progress.json`
  await fs.ensureFile(progress_path)
  await fs.writeJSON(progress_path, progress)
}

async function get_meta_data(ENV) {
  return yaml.safeLoad(await readFileWrapper(`${ENV.DIR.PRE_POST}/meta.yaml`))
}

async function get_content_data(ENV) {
  return await readFileWrapper(`${ENV.DIR.PRE_POST}/main.md`)
}

async function get_media_data(n_title, n_dashed_title, publish_date, ENV) {
  /* test if audio exists and is writable */
  const audio_file = `${ENV.MEDIA.AUDIO}/${n_title}/${n_dashed_title}.mp3`
  const testFileStat = file_path => new Promise((res, rej) => {
    fs_legacy.access(file_path, fs_legacy.constants.F_OK | fs_legacy.constants.W_OK, err => err ? rej(err): res())
  })
  await testFileStat(audio_file)

  /* run id3tag */
  const year = publish_date.year()
  const id3tag_command = `id3tag -A "${ENV.CONFIG.ALBUM_NAME}" -a "${ENV.CONFIG.ARTIST}" -g "${ENV.CONFIG.GENRE}" -s "${n_title}" -y "${year}" "${audio_file}"`
  const id3tag_result = await exec(id3tag_command)

  /***/
  const audio_stat = await util.promisify(fs_legacy.stat)(audio_file)
  const ffprobe_command = `ffprobe -i "${audio_file}"`
  const ffprobe_result = await exec(ffprobe_command)
  const duration_result = ffprobe_result.stderr.match(/Duration: (\d*:\d*:\d*)\.\d*,/)
  if (!duration_result) {
    throw new Error(`Cannot properly read the duration of file ${audio_file}!\nOutput of ffprobe:\n${ffprobe_result.stderr}`)
  }
  return {length_str: `${audio_stat.size}`, duration_str: duration_result[1]}
}

async function get_chapter_data(n_title, ENV) {
  const chapter_file = await readFileWrapper(`${ENV.MEDIA.AUDIO}/${n_title}/${ENV.episode_n}.csv`)
  const records = parse(chapter_file, {
    delimiter: '\t',
    // columns: true,
    skip_empty_lines: true
  })
  records.shift()

  const padding = (str, line_n) => {
    const pad1 = N => {
      let N_str = String(N)
      if (N_str.length <= 1) {
        N_str = `0${N_str}`
      }
      return N_str
    }
    let result = str.match(/^(\d*):(\d*).\d*$/)
    if (result) {
      str = `00:${pad1(result[1])}:${result[2]}`
    } else {
      result = str.match(/^(\d*):(\d*):(\d*).\d*$/)
      if (!result) {
        throw new Error(`Cannot parse timestamp ${str} at Line ${line_n+1}.`)
      }
      str = `${pad1(result[1])}:${result[2]}:${result[3]}`
    }
    return str
  }
  return records.map((record, line_n) => {return {content: record[0], timestamp: record[1], timeline: padding(record[1], line_n)}})
}

async function write_composed_post(composed_data, n_dashed_title, ENV) {
  const composed_post_path = `${ENV.DIR.POST}/${n_dashed_title}.md`
  const post_exist = await fs.pathExists(composed_post_path)
  if (post_exist) {
    WARN(`Post ${composed_post_path} exists and will be overwritten.`)
  }
  const writeFile = util.promisify(fs_legacy.writeFile)
  await writeFile(composed_post_path, composed_data, 'utf8')
  INFO(`Generated post written to ${composed_post_path}.`)
}

async function get_ENV(argv) {
  const episode_n = await argv.episode_n
  INFO(`Now working on Episode [${episode_n}].`)

  const ENV = await fs.readJson('secret.json')
  ENV.DIR.PRE_POST = `${ENV.DIR.PRE_POST}/${episode_n}`
  ENV.episode_n = episode_n

  return ENV
}

/* generate */
async function generate(argv) {
  const ENV = await get_ENV(argv)

  /***/
  const progress = await get_progress(ENV)
  const meta_data = await get_meta_data(ENV),
    content_data = await get_content_data(ENV)

  /* publish date; desired day is Friday */
  const publish_date = moment(meta_data.date, 'YYYY-MM-DD', true).isValid()
    ? moment(meta_data.date).set('hour', 12)
    : moment(meta_data.date)
  if (publish_date.isoWeekday() != 5) {
    WARN(`The post will be published on ${publish_date.format('dddd')} instead of Friday!`)
  }
  const publish_date_str = publish_date.format('YYYY-MM-DD HH:mm:ss')
  VERBOSE(`The post is due on ${publish_date_str}.`)

  /* title related */
  const n_dashed_title = `${ENV.episode_n}-${meta_data.title.replace(/ /g, '-')}`,
    n_title = `${ENV.episode_n} ${meta_data.title}`
  const chapter_data = await get_chapter_data(n_title, ENV),
    media_data = await get_media_data(n_title, n_dashed_title, publish_date, ENV)

  /* chapter marks */
  const chapters_array = JSON.stringify(chapter_data.map(record => [record.timestamp, record.content]), null, ' ')
  const timeline_content = chapter_data.map(record => `- ${record.timeline} ${record.content}`).join('\n')
  const timeline_array = `### Timeline\n${timeline_content}`

  /* appending timeline */
  const content_data_with_timeline = content_data.match(/## Misc/)
    ? `${content_data}\n${timeline_array}`
    : `${content_data}\n\n## Misc\n${timeline_array}`

  /* tag items */
  const tags_str = meta_data.tags.map(tag => `  - ${tag}`).join('\n')

  /* render post file */
  const composed_data =
`---
title: ${n_title}
category: podcast
media: /podcast/${n_dashed_title}.mp3
image: /image/${n_dashed_title}.jpg
mediatype: audio/mpeg
chapters: ${chapters_array}
date: ${publish_date_str}
subtitle: ${meta_data.subtitle}
tags: \n${tags_str}
length: ${media_data.length_str}
duration: ${media_data.duration_str}
---
${content_data_with_timeline}
`
  await write_composed_post(composed_data, n_dashed_title, ENV)

  /* render hexo */
  const hexo_g_command = `cd ${ENV.DIR.ROOT}; hexo g`
  const hexo_g_result = await exec(hexo_g_command)
  INFO(`Hexo has rendered the web pages! Hint: use \`hexo s\` to preview.`)

  /* update progress */
  progress.stage = STAGES.GENERATED
  await update_progress(progress, ENV)
}

/* init */
async function init(argv) {
  const ENV = await get_ENV(argv)

  const progress = {stage: STAGES.INIT}
  await update_progress(progress, ENV)

  const main_md_path = `${ENV.DIR.PRE_POST}/main.md`
  await fs.ensureFile(main_md_path)
  await writeFileWrapper(main_md_path, 
`## About

<!--more-->

## Misc
`)

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

  INFO("Files have been successfully initiated!")
}

/* deploy */
async function upload_audio(n_dashed_title, n_title, ENV) {
  const audio_file = `${ENV.MEDIA.AUDIO}/${n_title}/${n_dashed_title}.mp3`
  const scp_command = `scp -i ${ENV.SECRET.PRIV_KEY} -o "PasswordAuthentication=no" "${audio_file}" "${ENV.SECRET.SERVER}/podcast/${n_dashed_title}.mp3"`
  const scp_result = await exec(scp_command)
}

async function upload_image(n_dashed_title, ENV) {
  const image_file = `${ENV.MEDIA.PIC}/${ENV.episode_n}/${ENV.episode_n}.jpg`
  const scp_command = `scp -i ${ENV.SECRET.PRIV_KEY} -o "PasswordAuthentication=no" "${image_file}" "${ENV.SECRET.SERVER}/image/${n_dashed_title}.jpg"`
  INFO(scp_command)
  const scp_result = await exec(scp_command)
}

async function upload_page(ENV) {
  const hexo_d_command = `cd ${ENV.DIR.ROOT}; hexo d`
  const hexo_d_result = await exec(hexo_d_command)
}

async function deploy(argv) {
  const ENV = await get_ENV(argv)
  const progress = await get_progress(ENV)

  /* check stage */
  if (progress.stage < STAGES.GENERATED) {
    WARN('The pages have not been generated yet! Please run generate command.')
    return
  }

  if (progress.stage >= STAGES.DEPLOYED) {
    WARN('The pages seem to be deployed!')
  }

  /* deploying... */
  const meta_data = await get_meta_data(ENV)
  const n_dashed_title = `${ENV.episode_n}-${meta_data.title.replace(/ /g, '-')}`,
    n_title = `${ENV.episode_n} ${meta_data.title}`

  if (argv.only.find(item => item === 'audio')) {
    await upload_audio(n_dashed_title, n_title, ENV)
    INFO('Audio file has been uploaded!')
  }
  if (argv.only.find(item => item === 'image')) {
    await upload_image(n_dashed_title, ENV)
    INFO('Image file has been uploaded!')
  }
  if (argv.only.find(item => item === 'pages')) {
    await upload_page(ENV)
    INFO('Page files have been uploaded!')
  }

  /* update progress */
  progress.stage = STAGES.DEPLOYED
  await update_progress(progress, ENV)
}