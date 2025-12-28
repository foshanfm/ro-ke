import { reactive } from 'vue'
import { Maps } from './maps.js'
import { getMonster } from './monsters.js'
import { player } from './player.js'
import { CELL_SIZE } from './constants.js'

export const mapState = reactive({
    currentMapId: null,
    monsters: [], // 当前地图上的怪物实例列表 { guid, id, name, x, y, hp, maxHp ... }
    width: 0,
    height: 0,
    activeWarps: [], // 当前地图的传送点列表
    patrolTarget: null // 随机漫步的目标点 { x, y }
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
    const id = (mapId || '').toLowerCase()
    const mapInfo = Maps[id]
    if (!mapInfo) {
        console.error(`[MapManager] 地图数据缺失: ${id}`)
        return
    }

    mapState.currentMapId = id
    mapState.width = mapInfo.width
    mapState.height = mapInfo.height
    mapState.monsters = []
    mapState.patrolTarget = null

    // 加载当前地图的传送点
    mapState.activeWarps = warpData[id] || []
    if (mapState.activeWarps.length > 0) {
        console.log(`[MapManager] 地图 ${id} 加载了 ${mapState.activeWarps.length} 个传送点`)
    }

    // 初始化时刷出第一批怪
    fillMonsters()
}

/**
 * 填充怪物到地图
 */
export function fillMonsters() {
    const id = (mapState.currentMapId || '').toLowerCase()
    const mapInfo = Maps[id]
    if (!mapInfo) return

    // 检查是否有加载的刷怪数据
    const spawnInfo = spawnData[id]

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
            spawnSingleMonsterById(spawn.id, spawn)
        }
    })
}

/**
 * 生成单个怪物 (按 ID) - 优化版：防止堆叠
 */
function spawnSingleMonsterById(mobId, spawnArea = null) {
    const template = getMonster(mobId)
    if (!template) return

    let spawnX, spawnY
    let attempts = 0
    const maxAttempts = 10 // 最大重试次数，防止在极小区域死循环
    let validPosition = false

    // 尝试寻找一个空闲位置
    while (!validPosition && attempts < maxAttempts) {
        attempts++

        if (spawnArea && (spawnArea.x1 !== 0 || spawnArea.x2 !== 0)) {
            // 使用指定的刷怪区域
            const minX = Math.min(spawnArea.x1, spawnArea.x2)
            const maxX = Math.max(spawnArea.x1, spawnArea.x2)
            const minY = Math.min(spawnArea.y1, spawnArea.y2)
            const maxY = Math.max(spawnArea.y1, spawnArea.y2)
            spawnX = minX + Math.floor(Math.random() * (maxX - minX + 1))
            spawnY = minY + Math.floor(Math.random() * (maxY - minY + 1))
        } else {
            // 全地图随机
            spawnX = Math.floor(Math.random() * mapState.width)
            spawnY = Math.floor(Math.random() * mapState.height)
        }

        // 适配逻辑: 如果 x1/x2 很小(旧格式或者格数格式), 乘以 CELL_SIZE
        // 注意：这里需要确保比较基准一致，通常地图宽是像素单位
        if (spawnX < 500 && spawnY < 500 && mapState.width > 1000) {
            spawnX *= CELL_SIZE
            spawnY *= CELL_SIZE
        }

        // 碰撞检测：检查当前坐标是否已有怪物 (距离小于 5 像素视为重叠)
        const isOccupied = mapState.monsters.some(m =>
            Math.abs(m.x - spawnX) < 5 && Math.abs(m.y - spawnY) < 5
        )

        if (!isOccupied) {
            validPosition = true
        }
    }

    // 如果尝试多次仍未找到位置，强制使用最后一次的位置（避免不刷怪）

    const instance = {
        guid: ++guidCounter,
        templateId: mobId,           // 关联模板 ID
        x: spawnX,
        y: spawnY,
        hp: template.maxHp || template.hp, // 确保满血 (兼容性修正: 优先使用 maxHp, 回退到 hp)
        maxHp: template.maxHp || template.hp,
        // 运行时状态
        isAggressive: false,
        lastAttackTime: 0
    }

    mapState.monsters.push(instance)
    // console.log(`[MapManager] 生成怪物 ${template.name} (${instance.guid}) at ${instance.x},${instance.y}`)
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
/**
 * 检查指定坐标是否靠近传送点
 * @param {number} x - X 坐标
 * @param {number} y - Y 坐标
 * @param {number} threshold - 距离阈值 (默认 5 格 = 50 像素)
 */
export function isNearWarp(x, y, threshold = 50) {
    if (!mapState.activeWarps) return false
    return mapState.activeWarps.some(warp => {
        const dist = Math.sqrt(Math.pow(x - warp.x, 2) + Math.pow(y - warp.y, 2))
        return dist <= threshold
    })
}

/**
 * 获取距离玩家最近的怪物
 * @param {number} viewRange - 视野范围
 * @param {Function} filterFn - (可选) 额外的过滤函数
 */
export function findNearestMonster(viewRange = 100, filterFn = null) {
    let nearest = null
    let minDist = viewRange

    mapState.monsters.forEach(m => {
        // 如果有过滤器且过滤失败，跳过
        if (filterFn && !filterFn(m)) return

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
        const nx = Math.max(0, Math.min(mapState.width, player.x + (dx / dist) * speed))
        const ny = Math.max(0, Math.min(mapState.height, player.y + (dy / dist) * speed))

        player.x = nx
        player.y = ny
        return false // 还在路上
    }
}

/**
 * 随机漫步逻辑 - 不再瞬移，而是设定一个目标点
 */
export function randomWalk() {
    // 如果已经有巡逻目标了，就尝试走过去
    if (mapState.patrolTarget) {
        const { x, y } = mapState.patrolTarget
        const arrived = movePlayerToward(mapState.patrolTarget.x, mapState.patrolTarget.y, player.moveSpeed)
        if (arrived) {
            mapState.patrolTarget = null // 到达，清空目标
        }
        return arrived
    }

    // 设定一个新的随机巡逻点 (尝试 3 次以避开传送点)
    for (let i = 0; i < 3; i++) {
        const angle = Math.random() * Math.PI * 2
        const dist = 200 + Math.random() * 400
        const tx = Math.max(20, Math.min(mapState.width - 20, player.x + Math.cos(angle) * dist))
        const ty = Math.max(20, Math.min(mapState.height - 20, player.y + Math.sin(angle) * dist))

        // 检查新目标点是否安全 (远离传送点 80px)
        if (!isNearWarp(tx, ty, 80)) {
            mapState.patrolTarget = { x: tx, y: ty }
            return false
        }
    }

    // 如果尝试失败，这次先不动，或者就在原地附近微调，避免强行去危险区域
    return false
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
/**
 * 检查地图是否有刷怪数据
 */
export function hasMapSpawns(mapId) {
    const id = (mapId || '').toLowerCase()
    return !!(spawnData[id] && spawnData[id].spawns && spawnData[id].spawns.length > 0)
}
