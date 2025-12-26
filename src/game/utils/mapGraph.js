// src/game/utils/mapGraph.js
// 地图图论分析工具

/**
 * 构建并分析地图连通性
 * @param {Object} warpDB - dataLoader 加载的原始传送数据
 */
export function analyzeConnectivity(warpDB) {
    const allMaps = new Set();
    const adjacencyList = {};

    // 1. 构建邻接表
    for (const [sourceMap, warps] of Object.entries(warpDB)) {
        allMaps.add(sourceMap);
        if (!adjacencyList[sourceMap]) adjacencyList[sourceMap] = new Set();

        warps.forEach(warp => {
            allMaps.add(warp.targetMap);
            adjacencyList[sourceMap].add(warp.targetMap);
        });
    }

    const totalMaps = allMaps.size;
    const startNode = 'prontera'; // 以普隆德拉为中心

    // 2. BFS 寻找从主城可达的所有地图
    const reachable = new Set();
    const queue = [startNode];
    reachable.add(startNode);

    while (queue.length > 0) {
        const current = queue.shift();
        const neighbors = adjacencyList[current] || [];

        for (const neighbor of neighbors) {
            if (!reachable.has(neighbor)) {
                reachable.add(neighbor);
                queue.push(neighbor);
            }
        }
    }

    // 3. 统计死路 (Sink Nodes: 有进无出)
    const deadEnds = [];
    allMaps.forEach(map => {
        if (!adjacencyList[map] || adjacencyList[map].size === 0) {
            deadEnds.push(map);
        }
    });

    // 4. 统计不可达图 (Unreachable: 从主城走不到)
    const unreachable = [];
    allMaps.forEach(map => {
        if (!reachable.has(map)) {
            unreachable.push(map);
        }
    });

    return {
        totalMaps,
        reachableCount: reachable.size,
        connectivityRate: ((reachable.size / totalMaps) * 100).toFixed(2) + '%',
        deadEnds,
        unreachableCount: unreachable.length,
        unreachableList: unreachable
    };
}

/**
 * Dijkstra 算法寻找最短路径
 * (未来可用于自动导航)
 */
export function findShortestPath(warpDB, start, end) {
    const queue = [[start]];
    const visited = new Set([start]);

    while (queue.length > 0) {
        const path = queue.shift();
        const node = path[path.length - 1];

        if (node === end) return path;

        const neighbors = warpDB[node] || [];
        for (const warp of neighbors) {
            if (!visited.has(warp.targetMap)) {
                visited.add(warp.targetMap);
                queue.push([...path, warp.targetMap]);
            }
        }
    }
    return null;
}
