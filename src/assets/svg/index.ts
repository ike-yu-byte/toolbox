/**
 * 图标注册表。
 * 每个图标是 ./ 下的一个 .svg 文件（可单独打开预览、直接改路径数据），
 * 这里用 ?raw 读入源码，由 <IconSprite /> 编译成 <symbol> 精灵图供 <Icon> 引用。
 * 新增图标：放一个 .svg 文件 + 在下面加一行 import 与一行映射。
 */
import homeSource from './home.svg?raw'
import fontSource from './font.svg?raw'
import bracesSource from './braces.svg?raw'
import gridSource from './grid.svg?raw'
import sunSource from './sun.svg?raw'
import moonSource from './moon.svg?raw'
import globeSource from './globe.svg?raw'
import copySource from './copy.svg?raw'
import downloadSource from './download.svg?raw'
import uploadSource from './upload.svg?raw'
import trashSource from './trash.svg?raw'
import searchSource from './search.svg?raw'
import checkSource from './check.svg?raw'
import checkCircleSource from './check-circle.svg?raw'
import closeSource from './close.svg?raw'
import alertSource from './alert.svg?raw'
import infoSource from './info.svg?raw'
import chevronDownSource from './chevron-down.svg?raw'
import chevronRightSource from './chevron-right.svg?raw'
import panelSource from './panel.svg?raw'
import sparklesSource from './sparkles.svg?raw'
import listSource from './list.svg?raw'
import refreshSource from './refresh.svg?raw'
import plusSource from './plus.svg?raw'
import minusSource from './minus.svg?raw'
import externalSource from './external.svg?raw'
import fileSource from './file.svg?raw'
import configSource from './config.svg?raw'

export const ICON_SOURCES = {
  home: homeSource,
  font: fontSource,
  braces: bracesSource,
  grid: gridSource,
  sun: sunSource,
  moon: moonSource,
  globe: globeSource,
  copy: copySource,
  download: downloadSource,
  upload: uploadSource,
  trash: trashSource,
  search: searchSource,
  check: checkSource,
  'check-circle': checkCircleSource,
  close: closeSource,
  alert: alertSource,
  info: infoSource,
  'chevron-down': chevronDownSource,
  'chevron-right': chevronRightSource,
  panel: panelSource,
  sparkles: sparklesSource,
  list: listSource,
  refresh: refreshSource,
  plus: plusSource,
  minus: minusSource,
  external: externalSource,
  file: fileSource,
  config: configSource,
} as const

/** 图标名（即 .svg 的文件名，多单词用连字符） */
export type IconName = keyof typeof ICON_SOURCES
