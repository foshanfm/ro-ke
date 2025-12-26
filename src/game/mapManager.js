import { reactive } from 'vue'
import { Maps } from './maps.js'
import { spawnMonster } from './monsters.js'
import { player } from './player.js'

export const mapState = reactive({
    currentMapId: null,
    monsters: [], // 当前地图上的怪物实例列表 { guid, id, name, x, y, hp, maxHp ... }
    width: 0,
    height: 0
})

let guidCounter = 0

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

export function fillMonsters() {
    const mapInfo = Maps[mapState.currentMapId]
    if (!mapInfo) return

    const targetCount = mapInfo.spawnRate
    while (mapState.monsters.length < targetCount) {
        spawnSingleMonster(mapInfo)
    }
}

function spawnSingleMonster(mapInfo) {
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
    const proto = spawnMonster(selectedId) // 获取怪物的属性模板
    const monster = {
        ...proto,
        guid: ++guidCounter,
        x: Math.floor(Math.random() * mapState.width),
        y: Math.floor(Math.random() * mapState.height)
    }
    
    mapState.monsters.push(monster)
}

export function removeMonster(guid) {
    const idx = mapState.monsters.findIndex(m => m.guid === guid)
    if (idx !== -1) {
        mapState.monsters.splice(idx, 1)
        // 怪物死亡后，稍后自动补充（这里简单处理，立即补充）
        setTimeout(fillMonsters, 2000)
    }
}

// 获取距离玩家最近的怪物
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

// 玩家移动
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

// 随机漫步逻辑
export function randomWalk() {
    const angle = Math.random() * Math.PI * 2
    const dist = 30 + Math.random() * 50
    const tx = Math.max(0, Math.min(mapState.width, player.x + Math.cos(angle) * dist))
    const ty = Math.max(0, Math.min(mapState.height, player.y + Math.sin(angle) * dist))
    
    player.x = tx
    player.y = ty
}
