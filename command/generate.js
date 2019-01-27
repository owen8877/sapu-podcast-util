'use strict'

const moment = require('moment')

const get_ENV = require('../lib/get_ENV')
const {get_chapter_data, get_media_data, get_content_data, get_meta_data} = require('../lib/get_data')
const {get_progress, update_progress} = require('../lib/progress')
const {readFileWrapper, exec} = require('../lib/wrapper')
const {write_composed_post} = require('../lib/write_post')

const STAGES = Object.freeze(require('../lib/stages.json'))

async function generate(argv, CONSOLE) {
  const ENV = await get_ENV(argv, CONSOLE)

  /***/
  const progress = await get_progress(ENV, CONSOLE)
  const meta_data = await get_meta_data(ENV, CONSOLE),
    content_data = await get_content_data(ENV, CONSOLE)

  /* publish date; desired day is Friday */
  const publish_date = moment(meta_data.date, 'YYYY-MM-DD', true).isValid()
    ? moment(meta_data.date).set('hour', 12)
    : moment(meta_data.date)
  if (publish_date.isoWeekday() != 5) {
    CONSOLE.WARN(`The post will be published on ${publish_date.format('dddd')} instead of Friday!`)
  }
  const publish_date_str = publish_date.format('YYYY-MM-DD HH:mm:ss')
  CONSOLE.VERBOSE(`The post is due on ${publish_date_str}.`)

  /* title related */
  const n_dashed_title = `${ENV.episode_n}-${meta_data.title.replace(/ /g, '-')}`,
    n_title = `${ENV.episode_n} ${meta_data.title}`
  const chapter_data = await get_chapter_data(n_title, ENV, CONSOLE),
    media_data = await get_media_data(n_title, n_dashed_title, publish_date, ENV, CONSOLE)

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
  await write_composed_post(composed_data, n_dashed_title, ENV, CONSOLE)

  /* render hexo */
  const hexo_g_command = `cd ${ENV.DIR.ROOT}; hexo g`
  const hexo_g_result = await exec(hexo_g_command, CONSOLE)
  CONSOLE.INFO(`Hexo has rendered the web pages! Hint: use \`hexo s\` to preview.`)

  /* update progress */
  progress.stage = STAGES.GENERATED
  await update_progress(progress, ENV, CONSOLE)
}

module.exports = generate