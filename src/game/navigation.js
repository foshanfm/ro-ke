
import { Maps } from './maps.js'

// 简单的 BFS 寻路
// 需要 warpDB 数据，但 warpDB 由 dataLoader 加载并注入到 mapManager 中
// 这里我们最好让 mapManager 暴露一个获取所有 warps 的接口，或者直接传入 warpData

let globalWarpGraph = {}

/**
 * 构建全地图连接图 (在游戏初始化后调用)
 * @param {Object} warpDB - 从 dataLoader 加载的原始 warpDB
 */
export function buildNavigationGraph(warpDB) {
    globalWarpGraph = {}

    // warpDB 结构: { 'prontera': [ { targetMap: 'prt_fild08', ... }, ... ] }
    for (const [mapId, warps] of Object.entries(warpDB)) {
        if (!globalWarpGraph[mapId]) globalWarpGraph[mapId] = []

        warps.forEach(w => {
            // 添加单向边
            if (!globalWarpGraph[mapId].includes(w.targetMap)) {
                globalWarpGraph[mapId].push(w.targetMap)
            }
        })
    }

    console.log(`[Navigation] 已构建导航图，包含 ${Object.keys(globalWarpGraph).length} 个节点`)
}

/**
 * 寻找路径
 * @param {string} startMap 
 * @param {string} targetMap 
 * @returns {Array<string>|null} 路径数组 (包括起点和终点)，例如 ['prontera', 'prt_fild08']
 */
export function findPath(startMap, targetMap) {
    if (startMap === targetMap) return [startMap]
    if (!globalWarpGraph[startMap]) return null

    const queue = [[startMap]]
    const visited = new Set([startMap])

    while (queue.length > 0) {
        const path = queue.shift()
        const currentMap = path[path.length - 1]

        if (currentMap === targetMap) {
            return path
        }

        const neighbors = globalWarpGraph[currentMap] || []
        for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) {
                visited.add(neighbor)
                const newPath = [...path, neighbor]
                queue.push(newPath)
            }
        }
    }

    return null // 无法到达
}
