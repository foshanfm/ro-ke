import { reactive } from 'vue'
import { Maps } from './maps.js'
import { getMonster } from './monsters.js'
import { player } from './player.js'

export const mapState = reactive({
    currentMapId: null,
    monsters: [], // 当前地图上的怪物实例列表 { guid, id, name, x, y, hp, maxHp ... }
    width: 0,
    height: 0
})

// 全局刷怪数据 - 将由 dataLoader 填充
let spawnData = {}

let guidCounter = 0

/**
 * 设置刷怪数据 (由 dataLoader 调用)
 */
export function setSpawnData(newSpawnData) {
    spawnData = newSpawnData
    console.log('[MapManager] 刷怪数据已更新')
}

/**
 * 初始化地图
 */
export function initMap(mapId) {
    const mapInfo = Maps[mapId]
    if (!mapInfo) return

    mapState.currentMapId = mapId
    mapState.width = mapInfo.width
    mapState.height = mapInfo.height
    mapState.monsters = []

    // 初始化时刷出第一批怪
    fillMonsters()
}

/**
 * 填充怪物到地图
 */
export function fillMonsters() {
    const mapInfo = Maps[mapState.currentMapId]
    if (!mapInfo) return

    // 检查是否有加载的刷怪数据
    const spawnInfo = spawnData[mapState.currentMapId]

    if (spawnInfo && spawnInfo.spawns && spawnInfo.spawns.length > 0) {
        // 使用新的刷怪数据系统
        fillMonstersFromSpawnData(spawnInfo)
    } else {
        // 使用旧的权重系统 (后备方案)
        fillMonstersLegacy(mapInfo)
    }
}

/**
 * 使用刷怪数据填充怪物 (新系统)
 */
function fillMonstersFromSpawnData(spawnInfo) {
    // 计算当前地图上各怪物的数量
    const currentCounts = {}
    mapState.monsters.forEach(m => {
        currentCounts[m.id] = (currentCounts[m.id] || 0) + 1
    })

    // 根据刷怪数据补充怪物
    spawnInfo.spawns.forEach(spawn => {
        const currentCount = currentCounts[spawn.id] || 0
        const targetCount = spawn.count

        // 补充不足的怪物
        for (let i = currentCount; i < targetCount; i++) {
            spawnSingleMonsterById(spawn.id)
        }
    })
}

/**
 * 使用权重系统填充怪物 (旧系统 - 后备方案)
 */
function fillMonstersLegacy(mapInfo) {
    const targetCount = mapInfo.spawnRate
    while (mapState.monsters.length < targetCount) {
        spawnSingleMonsterWeighted(mapInfo)
    }
}

/**
 * 生成单个怪物 (按 ID)
 */
function spawnSingleMonsterById(mobId) {
    const proto = getMonster(mobId)
    const monster = {
        ...proto,
        guid: ++guidCounter,
        x: Math.floor(Math.random() * mapState.width),
        y: Math.floor(Math.random() * mapState.height),
        hp: proto.hp,
        maxHp: proto.hp
    }

    mapState.monsters.push(monster)
}

/**
 * 生成单个怪物 (按权重)
 */
function spawnSingleMonsterWeighted(mapInfo) {
    // 1. 根据权重选择怪
    const rand = Math.random()
    let cumulative = 0
    let selectedId = mapInfo.monsters[0].id
    for (const m of mapInfo.monsters) {
        cumulative += m.rate
        if (rand < cumulative) {
            selectedId = m.id
            break
        }
    }

    // 2. 生成实例
    spawnSingleMonsterById(selectedId)
}

/**
 * 移除怪物
 */
export function removeMonster(guid) {
    const idx = mapState.monsters.findIndex(m => m.guid === guid)
    if (idx !== -1) {
        mapState.monsters.splice(idx, 1)
        // 怪物死亡后，稍后自动补充
        setTimeout(fillMonsters, 2000)
    }
}

/**
 * 获取距离玩家最近的怪物
 */
export function findNearestMonster(viewRange = 100) {
    let nearest = null
    let minDist = viewRange

    mapState.monsters.forEach(m => {
        const dist = Math.sqrt(Math.pow(m.x - player.x, 2) + Math.pow(m.y - player.y, 2))
        if (dist < minDist) {
            minDist = dist
            nearest = m
        }
    })

    return { monster: nearest, distance: minDist }
}

/**
 * 玩家移动
 */
export function movePlayerToward(tx, ty, speed = 5) {
    const dx = tx - player.x
    const dy = ty - player.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist <= speed) {
        player.x = tx
        player.y = ty
        return true // 到达目的地
    } else {
        player.x += (dx / dist) * speed
        player.y += (dy / dist) * speed
        return false // 还在路上
    }
}

/**
 * 随机漫步逻辑
 */
export function randomWalk() {
    const angle = Math.random() * Math.PI * 2
    const dist = 30 + Math.random() * 50
    const tx = Math.max(0, Math.min(mapState.width, player.x + Math.cos(angle) * dist))
    const ty = Math.max(0, Math.min(mapState.height, player.y + Math.sin(angle) * dist))

    player.x = tx
    player.y = ty
}

/**
 * 检查刷怪数据是否已加载
 */
export function isSpawnDataLoaded() {
    return Object.keys(spawnData).length > 0
}
