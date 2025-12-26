// src/game/dataLoader.js
// 数据加载器 - 负责解析外部数据文件并转换为游戏内部格式

/**
 * 解析物品数据库文件 (item_db.txt)
 * 格式: ID,AegisName,Name,Type,Buy,Sell,Weight,ATK[:MATK],DEF,Range,Slots,Job,Class,Gender,Location,wLV,eLV[:maxLevel],Refineable,View,{ Script },{ OnEquip_Script },{ OnUnequip_Script }
 */
export async function loadItemDB() {
  try {
    const response = await fetch('/src/game/data/item_db.txt')
    const text = await response.text()
    const lines = text.split('\n')

    const itemsDB = {}

    for (const line of lines) {
      // 跳过注释和空行
      if (line.trim().startsWith('//') || line.trim() === '') continue

      const parts = line.split(',')
      if (parts.length < 5) continue // 至少需要基本字段

      const id = parseInt(parts[0])
      const aegisName = parts[1]
      const name = parts[2]
      const type = parseInt(parts[3])
      const buyPrice = parseInt(parts[4]) || 0
      const sellPrice = parseInt(parts[5]) || Math.floor(buyPrice / 2)
      const weight = parseInt(parts[6]) || 0

      // 解析 ATK 字段 (可能包含 ATK:MATK)
      let atk = 0
      let matk = 0
      if (parts[7]) {
        const atkParts = parts[7].split(':')
        atk = parseInt(atkParts[0]) || 0
        matk = parseInt(atkParts[1]) || 0
      }

      const def = parseInt(parts[8]) || 0
      const range = parseInt(parts[9]) || 0
      const slots = parseInt(parts[10]) || 0

      // 构建物品对象
      itemsDB[id] = {
        id,
        aegisName,
        name,
        type: mapItemType(type),
        price: buyPrice,
        sellPrice,
        weight,
        atk,
        matk,
        def,
        range,
        slots
      }
    }

    console.log(`[DataLoader] 已加载 ${Object.keys(itemsDB).length} 个物品`)
    return itemsDB
  } catch (error) {
    console.error('[DataLoader] 加载物品数据库失败:', error)
    return {}
  }
}

/**
 * 解析怪物数据库文件 (mob_db.txt)
 * 格式: ID,Sprite_Name,kName,iName,LV,HP,SP,EXP,JEXP,Range1,ATK1,ATK2,DEF,MDEF,STR,AGI,VIT,INT,DEX,LUK,Range2,Range3,Scale,Race,Element,Mode,Speed,aDelay,aMotion,dMotion,MEXP,MVP1id,MVP1per,MVP2id,MVP2per,MVP3id,MVP3per,Drop1id,Drop1per,Drop2id,Drop2per,Drop3id,Drop3per,Drop4id,Drop4per,Drop5id,Drop5per,Drop6id,Drop6per,Drop7id,Drop7per,Drop8id,Drop8per,Drop9id,Drop9per,DropCardid,DropCardper
 */
export async function loadMobDB(maxLevel = 20) {
  try {
    const response = await fetch('/src/game/data/mob_db.txt')
    const text = await response.text()
    const lines = text.split('\n')

    const mobsDB = {}

    for (const line of lines) {
      // 跳过注释和空行
      if (line.trim().startsWith('//') || line.trim() === '') continue

      const parts = line.split(',')
      if (parts.length < 20) continue // 至少需要基本字段

      const id = parseInt(parts[0])
      const spriteName = parts[1]
      const kName = parts[2]
      const iName = parts[3]
      const lv = parseInt(parts[4])

      // 等级过滤 - 只加载 <= maxLevel 的怪物
      if (lv > maxLevel) continue

      const hp = parseInt(parts[5])
      const sp = parseInt(parts[6]) || 0
      const exp = parseInt(parts[7])
      const jobExp = parseInt(parts[8])
      const range1 = parseInt(parts[9]) || 1
      const atk1 = parseInt(parts[10])
      const atk2 = parseInt(parts[11])
      const def = parseInt(parts[12])
      const mdef = parseInt(parts[13])
      const str = parseInt(parts[14])
      const agi = parseInt(parts[15])
      const vit = parseInt(parts[16])
      const int = parseInt(parts[17])
      const dex = parseInt(parts[18])
      const luk = parseInt(parts[19])

      // 计算命中和闪避 (基于官方公式)
      const hit = lv + dex
      const flee = lv + agi

      // 解析攻击延迟 (aDelay 字段)
      const attackDelay = parseInt(parts[27]) || 2000

      // 解析掉落物品 (Drop1-9 + Card)
      const drops = []
      for (let i = 0; i < 9; i++) {
        const dropIdIndex = 37 + i * 2
        const dropRateIndex = 38 + i * 2
        if (parts[dropIdIndex] && parts[dropRateIndex]) {
          const dropId = parseInt(parts[dropIdIndex])
          const dropRate = parseInt(parts[dropRateIndex]) / 10000 // 转换为 0-1 的概率
          if (dropId > 0 && dropRate > 0) {
            drops.push({ id: dropId, rate: dropRate })
          }
        }
      }

      // 卡片掉落
      if (parts[55] && parts[56]) {
        const cardId = parseInt(parts[55])
        const cardRate = parseInt(parts[56]) / 10000
        if (cardId > 0 && cardRate > 0) {
          drops.push({ id: cardId, rate: cardRate })
        }
      }

      // 构建怪物对象
      mobsDB[id] = {
        id,
        name: kName,
        lv,
        hp,
        maxHp: hp,
        exp,
        jobExp,
        atk: Math.floor((atk1 + atk2) / 2), // 使用平均攻击力
        def,
        mdef,
        hit,
        flee,
        attackDelay,
        // 根据 aDelay 计算直观攻速数值 (方案 B)
        aspd: Math.floor(200 - (attackDelay / 20)),
        // 计算每秒攻击次数 (方案 A)
        aps: parseFloat((1000 / attackDelay).toFixed(2)),
        drops,
        // 额外属性
        str,
        agi,
        vit,
        int,
        dex,
        luk
      }
    }

    console.log(`[DataLoader] 已加载 ${Object.keys(mobsDB).length} 个怪物 (Lv <= ${maxLevel})`)
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

export async function loadSpawnData(mobsDB, maxLevel = 20) {
  const spawnData = {}

  try {
    // 使用 Vite 的 import.meta.glob 自动发现所有刷怪文件
    const modules = import.meta.glob('/src/game/data/mobs/**/*.txt', { query: '?raw', import: 'default', eager: true })

    for (const [path, text] of Object.entries(modules)) {
      const lines = text.split('\n')

      for (const line of lines) {
        // 跳过注释和空行
        if (line.trim().startsWith('//') || line.trim() === '') continue

        // 解析格式: prt_fild00,0,0,0,0      monster Creamy  1018,10,0,0,0
        const parts = line.split(/\s+/)
        if (parts.length < 3) continue

        const mapName = parts[0].split(',')[0]
        const monsterKeyword = parts.find(p => p === 'monster')
        if (!monsterKeyword) continue

        const monsterIndex = parts.indexOf(monsterKeyword)
        const mobName = parts[monsterIndex + 1]
        const mobDataStr = parts[monsterIndex + 2]

        if (!mobDataStr) continue

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
          count
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

          // 强力去重：同一个地图对同一个目的地仅保留一个传送点
          const isDuplicate = existingWarps.some(w => w.targetMap === targetMap)

          if (!isDuplicate) {
            warpDB[sourceMap].push({
              x: parseInt(x),
              y: parseInt(y),
              spanX: parseInt(spanX),
              spanY: parseInt(spanY),
              targetMap,
              targetX: parseInt(targetX),
              targetY: parseInt(targetY),
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
export async function initializeGameData(maxLevel = 20) {
  console.log('[DataLoader] 开始加载游戏数据...')

  const itemsDB = await loadItemDB()
  const mobsDB = await loadMobDB(maxLevel)
  const spawnData = await loadSpawnData(mobsDB, maxLevel)
  // 3. 传送点数据 (rAthena airports)
  // 递归读取 cities, fields, dungeons
  const warpDB = await loadWarpData()
  // 确保 prt_fild08 被加载 (如果递归漏了)
  if (!warpDB['prt_fild08'] && warpDB['prontera']) {
    // 这里只是防止热更加载问题，理论上 loadWarpData 应该已经扫到了
    // console.log('Reloading warps...')
  }

  console.log('[DataLoader] 游戏数据加载完成')

  return {
    itemsDB,
    mobsDB,
    spawnData,
    warpDB
  }
}
