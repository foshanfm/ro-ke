import { reactive } from 'vue'
import { Maps } from './maps.js'
import { getMonster } from './monsters.js'
import { player } from './player.js'

export const mapState = reactive({
    currentMapId: null,
    monsters: [], // 当前地图上的怪物实例列表 { guid, id, name, x, y, hp, maxHp ... }
    width: 0,
    height: 0,
    activeWarps: [] // 当前地图的传送点列表
})

// 全局刷怪数据 - 将由 dataLoader 填充
let spawnData = {}
let warpData = {}

let guidCounter = 0

/**
 * 设置刷怪数据 (由 dataLoader 调用)
 */
export function setSpawnData(newSpawnData) {
    spawnData = newSpawnData
    console.log('[MapManager] 刷怪数据已更新')
}

/**
 * 设置传送点数据 (由 App.vue 调用)
 */
export function setWarpData(newWarpData) {
    warpData = newWarpData
    console.log('[MapManager] 传送点数据已更新')
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

    // 加载当前地图的传送点
    mapState.activeWarps = warpData[mapId] || []
    if (mapState.activeWarps.length > 0) {
        console.log(`[MapManager] 地图 ${mapId} 加载了 ${mapState.activeWarps.length} 个传送点`)
    }

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
        // 使用刷怪数据系统
        fillMonstersFromSpawnData(spawnInfo)
    } else {
        // 没有刷怪数据，打印警告
        console.warn(`[MapManager] 地图 ${mapState.currentMapId} 没有刷怪数据`)
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
 * 生成单个怪物 (按 ID)
 */
function spawnSingleMonsterById(mobId) {
    const template = getMonster(mobId)
    const instance = {
        guid: ++guidCounter,
        templateId: mobId,           // 关联模板 ID
        x: Math.floor(Math.random() * mapState.width),
        y: Math.floor(Math.random() * mapState.height),
        hp: template.hp,             // 实例化的当前血量
        maxHp: template.hp,
        // 运行时状态
        isAggressive: false,
        lastAttackTime: 0
    }

    mapState.monsters.push(instance)
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
        player.x = Math.max(0, Math.min(mapState.width, tx))
        player.y = Math.max(0, Math.min(mapState.height, ty))
        return true // 到达目的地
    } else {
        player.x = Math.max(0, Math.min(mapState.width, player.x + (dx / dist) * speed))
        player.y = Math.max(0, Math.min(mapState.height, player.y + (dy / dist) * speed))
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

/**
 * 检查玩家是否触碰传送点
 * @param {number} playerX - 玩家 X 坐标
 * @param {number} playerY - 玩家 Y 坐标
 * @returns {Object|null} 如果触碰返回传送点信息，否则返回 null
 */
export function checkWarpCollision(playerX, playerY) {
    for (const warp of mapState.activeWarps) {
        const dx = Math.abs(playerX - warp.x)
        const dy = Math.abs(playerY - warp.y)

        // 检查是否在传送点范围内
        if (dx <= warp.spanX && dy <= warp.spanY) {
            return {
                targetMap: warp.targetMap,
                targetX: warp.targetX,
                targetY: warp.targetY,
                name: warp.name
            }
        }
    }
    return null
}
