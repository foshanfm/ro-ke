// src/game/monsters.js
import { Maps } from './maps' // 引入地图数据

// 全局怪物数据库 - 将由 dataLoader 填充
let monstersDB = {}

// 静态怪物数据库 (保留作为后备)
const fallbackMonstersDB = {
  1001: {
    id: 1001, name: '波利', lv: 1, hp: 50, exp: 2, jobExp: 1,
    atk: 8, def: 0, hit: 10, flee: 1, attackDelay: 2000,
    drops: [
      { id: 909, rate: 0.7 },   // 杰勒比结晶
      { id: 1201, rate: 0.01 }, // 短剑
      { id: 501, rate: 0.05 },  // 红色药水
      { id: 4001, rate: 0.001 } // 波利卡片
    ]
  },
  1002: {
    id: 1002, name: '绿棉虫', lv: 2, hp: 63, exp: 3, jobExp: 2,
    atk: 10, def: 0, hit: 15, flee: 3, attackDelay: 1800,
    drops: [
      { id: 909, rate: 0.6 },   // 杰勒比结晶
      { id: 519, rate: 0.1 },   // 三叶草
      { id: 1201, rate: 0.02 }, // 短剑
      { id: 4002, rate: 0.001 } // 绿棉虫卡片
    ]
  }
}

/**
 * 设置怪物数据库 (由 dataLoader 调用)
 */
export function setMonstersDB(newMonstersDB) {
  // 将数组转换为对象映射
  if (Array.isArray(newMonstersDB)) {
    monstersDB = {}
    newMonstersDB.forEach(mob => {
      monstersDB[mob.id] = mob
    })
  } else {
    monstersDB = newMonstersDB
  }
  console.log('[Monsters] 怪物数据库已更新')
}

/**
 * 获取怪物信息
 */
export function getMonster(id) {
  // 1. 查询加载的怪物库
  if (monstersDB[id]) {
    return monstersDB[id]
  }

  // 2. 查询后备怪物库
  if (fallbackMonstersDB[id]) {
    return fallbackMonstersDB[id]
  }

  // 3. 返回未知怪物
  return {
    id,
    name: `未知怪物 (${id})`,
    lv: 1,
    hp: 50,
    maxHp: 50,
    exp: 1,
    jobExp: 1,
    atk: 5,
    def: 0,
    hit: 10,
    flee: 1,
    attackDelay: 2000,
    drops: []
  }
}

/**
 * 生成怪物实例 (基于地图配置)
 */
export function spawnMonster(mapId) {
  // 1. 获取地图配置
  const map = Maps[mapId] || Maps['prt_fild08']

  // 2. 根据权重随机选择怪物
  let totalRate = 0
  map.monsters.forEach(m => totalRate += m.rate)

  const rng = Math.random() * totalRate
  let currentRate = 0
  let targetId = map.monsters[0].id

  for (const m of map.monsters) {
    currentRate += m.rate
    if (rng <= currentRate) {
      targetId = m.id
      break
    }
  }

  // 3. 从数据库查找怪物模板
  const template = getMonster(targetId)

  // 4. 返回实例
  return {
    ...template,
    maxHp: template.hp
  }
}

/**
 * 检查怪物数据库是否已加载
 */
export function isMonstersDBLoaded() {
  return Object.keys(monstersDB).length > 0
}