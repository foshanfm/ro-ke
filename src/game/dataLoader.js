// 数据加载器 - 负责解析外部数据文件并转换为游戏内部格式
import { calcHit, calcFlee } from './formulas'
import { buildNavigationGraph } from './navigation.js'

/**
 * 解析物品数据库文件 (Compiled JSON)
 */
export async function loadItemDB() {
  try {
    const response = await fetch('/src/game/data/compiled/items.json')
    const itemsDB = await response.json()

    console.log(`[DataLoader] 已加载 ${Object.keys(itemsDB).length} 个组件化物品`)
    return itemsDB
  } catch (error) {
    console.error('[DataLoader] 加载物品数据库失败:', error)
    return {}
  }
}

/**
 * 解析怪物数据库文件 (Compiled JSON)
 */
export async function loadMobDB(maxLevel = 99) {
  try {
    const response = await fetch('/src/game/data/compiled/mobs.json')
    const allMobs = await response.json()

    // 过滤等级并打平结构以便兼容旧逻辑
    const mobsDB = {}
    Object.values(allMobs).forEach(mob => {
      if (mob.lv <= maxLevel) {
        mobsDB[mob.id] = {
          id: mob.id,
          name: mob.name,
          lv: mob.lv,
          hp: mob.hp,
          maxHp: mob.hp,
          exp: mob.exp,
          jobExp: mob.jobExp,
          element: mob.element || 0, // 属性代码
          atkMin: mob.battleStats.atkMin,
          atkMax: mob.battleStats.atkMax,
          def: mob.battleStats.def,
          mdef: mob.battleStats.mdef,
          hit: mob.battleStats.hit,
          flee: mob.battleStats.flee,
          attackDelay: mob.battleStats.attackDelay,
          aspd: mob.battleStats.aspd,
          range1: mob.battleStats.range,
          drops: mob.drops,
          ...mob.attributes
        }
      }
    })

    console.log(`[DataLoader] 已加载 ${Object.keys(mobsDB).length} 个结构化怪物 (Lv <= ${maxLevel})`)
    return mobsDB
  } catch (error) {
    console.error('[DataLoader] 加载怪物数据库失败:', error)
    return {}
  }
}

/**
 * 解析地图刷怪文件 (mobs/fields/*.txt)
 * 格式: MapName,X,Y,X2,Y2,Type,Name,MobID,Count,SpawnDelay,DeathDelay
 * 实际格式: MapName,0,0,0,0\tmonster\tName\tMobID,Count,SpawnDelay,DeathDelay
 */
import { registerMap } from './maps.js'

export async function loadSpawnData(mobsDB, maxLevel = 99) {
  const spawnData = {}

  try {
    // 使用 Vite 的 import.meta.glob 自动发现所有刷怪文件
    const modules = import.meta.glob('/src/game/data/mobs/**/*.txt', { query: '?raw', import: 'default', eager: true })

    for (const [path, text] of Object.entries(modules)) {
      const lines = text.split('\n')

      for (const line of lines) {
        // 跳过注释和空行
        if (line.trim().startsWith('//') || line.trim() === '') continue

        // 解析格式: MapName,X,Y,X2,Y2    monster|boss_monster    Name    MobID,Count...
        // 使用正则处理多词名称 (如 Roda Frog) 和 boss_monster 关键字
        const spawnRegex = /^([^, \t\s]+),(\d+),(\d+),(\d+),(\d+)\s+(monster|boss_monster)\s+(.+?)\s+([\d,]+)/
        const match = line.match(spawnRegex)
        if (!match) continue

        const [_, mapNameRaw, x1Str, y1Str, x2Str, y2Str, keyword, mobName, mobDataStr] = match
        const mapName = mapNameRaw.toLowerCase()
        const x1 = parseInt(x1Str) || 0
        const y1 = parseInt(y1Str) || 0
        const x2 = parseInt(x2Str) || 0
        const y2 = parseInt(y2Str) || 0

        const mobDataParts = mobDataStr.split(',')
        const mobId = parseInt(mobDataParts[0])
        const count = parseInt(mobDataParts[1]) || 1

        // 检查怪物是否在允许的等级范围内
        const mobInfo = mobsDB[mobId]
        if (!mobInfo || mobInfo.lv > maxLevel) continue

        // 初始化地图数据
        if (!spawnData[mapName]) {
          spawnData[mapName] = {
            mapId: mapName,
            spawns: []
          }
          // 自动注册未知地图
          registerMap(mapName, { name: mapName })
        }

        // 添加刷怪点
        spawnData[mapName].spawns.push({
          id: mobId,
          name: mobName,
          count,
          x1, y1, x2, y2
        })
      }
    }

    console.log(`[DataLoader] 已加载 ${Object.keys(spawnData).length} 个地图的刷怪数据`)
    return spawnData
  } catch (error) {
    console.error('[DataLoader] 加载刷怪数据失败:', error)
    return {}
  }
}

/**
 * 映射物品类型
 */
function mapItemType(typeCode) {
  const typeMap = {
    0: 'Usable',    // 消耗品
    3: 'Etc',       // 杂物
    4: 'Equip',     // 武器
    5: 'Equip',     // 防具
    6: 'Card',      // 卡片
    7: 'Etc',       // 宠物蛋
    8: 'Etc',       // 宠物装备
    10: 'Etc'       // 箭矢
  }
  return typeMap[typeCode] || 'Etc'
}

/**
 * 解析传送点数据库文件 (airports 目录)
 * 格式: MapName,X,Y,Facing  warp  NpcName  SpanX,SpanY,TargetMap,TargetX,TargetY
 */
export async function loadWarpData() {
  try {
    const warpDB = {}

    // 使用 Vite 的 import.meta.glob 自动发现所有传送点文件 (递归扫描 cities, fields, dungeons)
    const modules = import.meta.glob('/src/game/data/airports/**/*.txt', { query: '?raw', import: 'default', eager: true })

    for (const [path, text] of Object.entries(modules)) {
      const lines = text.split('\n')

      for (const line of lines) {
        // 跳过注释和空行
        if (line.trim().startsWith('//') || line.trim() === '') continue

        // 解析格式: mapname,x,y,facing  warp  name  spanX,spanY,targetMap,targetX,targetY
        const warpRegex = /^([a-zA-Z0-9_]+),(\d+),(\d+),\d+\s+warp\s+(\S+)\s+(\d+),(\d+),([a-zA-Z0-9_]+),(\d+),(\d+)/
        const match = line.match(warpRegex)

        if (match) {
          const [_, sourceMapRaw, x, y, npcName, spanX, spanY, targetMapRaw, targetX, targetY] = match

          const sourceMap = sourceMapRaw.toLowerCase()
          const targetMap = targetMapRaw.toLowerCase()

          // 初始化源地图的传送点数组
          if (!warpDB[sourceMap]) {
            warpDB[sourceMap] = []
            registerMap(sourceMap, { name: sourceMap })
          }

          // 也可以注册目标地图 (防止跳转到黑洞)
          registerMap(targetMap, { name: targetMap })

          // 获取当前地图已有的传送点，进行精细去重
          const existingWarps = warpDB[sourceMap]

          // 更加精细的去重：同一出口地图且坐标非常接近（< 5 unit）时才视为重复
          const isDuplicate = existingWarps.some(w =>
            w.targetMap === targetMap &&
            Math.abs(w.x - parseInt(x) * 10) < 50 &&
            Math.abs(w.y - parseInt(y) * 10) < 50
          )

          if (!isDuplicate) {
            warpDB[sourceMap].push({
              x: parseInt(x) * 10,
              y: parseInt(y) * 10,
              spanX: parseInt(spanX) * 10,
              spanY: parseInt(spanY) * 10,
              targetMap,
              targetX: parseInt(targetX) * 10,
              targetY: parseInt(targetY) * 10,
              name: npcName
            })
          }
        }
      }
    }

    const totalWarps = Object.values(warpDB).reduce((sum, arr) => sum + arr.length, 0)
    console.log(`[DataLoader] 已加载 ${totalWarps} 个传送点,覆盖 ${Object.keys(warpDB).length} 张地图`)
    return warpDB
  } catch (error) {
    console.error('[DataLoader] 加载传送点数据失败:', error)
    return {}
  }
}

/**
 * 初始化所有数据
 */
export async function initializeGameData(maxLevel = 99) {
  console.log('[DataLoader] 开始加载游戏数据...')

  const itemsDB = await loadItemDB()
  const mobsDB = await loadMobDB(99) // Unlock to Level 99
  const spawnData = await loadSpawnData(mobsDB, 99) // Unlock to Level 99
  // 3. 传送点数据 (rAthena airports)
  // 递归读取 cities, fields, dungeons
  const warpDB = await loadWarpData()
  // 确保 prt_fild08 被加载 (如果递归漏了)
  if (!warpDB['prt_fild08'] && warpDB['prontera']) {
    // 这里只是防止热更加载问题，理论上 loadWarpData 应该已经扫到了
    // console.log('Reloading warps...')
  }

  // 构建导航图
  buildNavigationGraph(warpDB)

  console.log('[DataLoader] 游戏数据加载完成')

  return {
    itemsDB,
    mobsDB,
    spawnData,
    warpDB
  }
}
