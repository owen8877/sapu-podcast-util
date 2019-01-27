'use strict'

const yaml = require('js-yaml')
const fs_legacy = require('fs')
const parse = require('csv-parse/lib/sync')
const util = require('util')

const {readFileWrapper, exec} = require('./wrapper')

async function get_meta_data(ENV, CONSOLE) {
  return yaml.safeLoad(await readFileWrapper(`${ENV.DIR.PRE_POST}/meta.yaml`, CONSOLE))
}

async function get_content_data(ENV, CONSOLE) {
  return await readFileWrapper(`${ENV.DIR.PRE_POST}/main.md`, CONSOLE)
}

async function get_media_data(n_title, n_dashed_title, publish_date, ENV, CONSOLE) {
  /* test if audio exists and is writable */
  const audio_file = `${ENV.MEDIA.AUDIO}/${n_title}/${n_dashed_title}.mp3`
  const testFileStat = file_path => new Promise((res, rej) => {
    fs_legacy.access(file_path, fs_legacy.constants.F_OK | fs_legacy.constants.W_OK, err => err ? rej(err): res())
  })
  await testFileStat(audio_file)

  /* run id3tag */
  const year = publish_date.year()
  const id3tag_command = `id3tag -A "${ENV.CONFIG.ALBUM_NAME}" -a "${ENV.CONFIG.ARTIST}" -g "${ENV.CONFIG.GENRE}" -s "${n_title}" -y "${year}" "${audio_file}"`
  const id3tag_result = await exec(id3tag_command, CONSOLE)

  /***/
  const audio_stat = await util.promisify(fs_legacy.stat)(audio_file)
  const ffprobe_command = `ffprobe -i "${audio_file}"`
  const ffprobe_result = await exec(ffprobe_command, CONSOLE)
  const duration_result = ffprobe_result.stderr.match(/Duration: (\d*:\d*:\d*)\.\d*,/)
  if (!duration_result) {
    throw new Error(`Cannot properly read the duration of file ${audio_file}!\nOutput of ffprobe:\n${ffprobe_result.stderr}`)
  }
  return {length_str: `${audio_stat.size}`, duration_str: duration_result[1]}
}

async function get_chapter_data(n_title, ENV, CONSOLE) {
  const chapter_file = await readFileWrapper(`${ENV.MEDIA.AUDIO}/${n_title}/${ENV.episode_n}.csv`, CONSOLE)
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

module.exports = {get_chapter_data, get_media_data, get_content_data, get_meta_data}