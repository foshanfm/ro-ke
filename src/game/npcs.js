// src/game/npcs.js
// NPC 系统 - 定义游戏中的各类 NPC（商人、治疗师等）

import DealerData from './data/system/dealer.json'

/**
 * NPC 类型枚举
 */
export const NPCType = {
    MERCHANT: 'MERCHANT',
    HEALER: 'HEALER',
    KAFRA: 'KAFRA'
}

/**
 * NPC 定义列表
 * 每个 NPC 包含：
 * - id: 唯一标识符
 * - name: NPC 名称
 * - map: 所在地图 ID
 * - x, y: 坐标（格子单位）
 * - type: NPC 类型
 * - shop: 商店物品 ID 列表（仅 MERCHANT 类型）
 * - speech: NPC 对话文本
 */
export const NPCs = [
    // ===== 普隆德拉 (Prontera) =====
    {
        id: 'prt_merchant',
        name: '道具商人',
        map: 'prontera',
        x: 156,
        y: 180,
        type: NPCType.MERCHANT,
        shop: DealerData.map(item => item.id), // 所有官方售卖物品
        speech: '欢迎光临普隆德拉道具商店！'
    },

    // ===== 吉芬 (Geffen) =====
    {
        id: 'gef_merchant',
        name: '道具商人',
        map: 'geffen',
        x: 120,
        y: 120,
        type: NPCType.MERCHANT,
        shop: DealerData.map(item => item.id),
        speech: '欢迎来到吉芬的魔法之都！需要什么吗？'
    },

    // ===== 梦罗克 (Morocc) =====
    {
        id: 'moc_merchant',
        name: '道具商人',
        map: 'morocc',
        x: 150,
        y: 100,
        type: NPCType.MERCHANT,
        shop: DealerData.map(item => item.id),
        speech: '沙漠商队为您服务！'
    },

    // ===== 斐扬 (Payon) =====
    {
        id: 'pay_merchant',
        name: '道具商人',
        map: 'payon',
        x: 180,
        y: 104,
        type: NPCType.MERCHANT,
        shop: DealerData.map(item => item.id),
        speech: '斐扬村的道具店，应有尽有！'
    }
]

/**
 * 根据地图 ID 查找该地图上的所有 NPC
 * @param {string} mapId - 地图 ID
 * @returns {Array} NPC 列表
 */
export function getNPCsByMap(mapId) {
    const normalizedMapId = (mapId || '').toLowerCase()
    return NPCs.filter(npc => npc.map === normalizedMapId)
}

/**
 * 根据 NPC ID 查找 NPC
 * @param {string} npcId - NPC ID
 * @returns {Object|null} NPC 对象
 */
export function getNPCById(npcId) {
    return NPCs.find(npc => npc.id === npcId) || null
}

/**
 * 查找玩家附近的 NPC
 * @param {string} mapId - 当前地图 ID
 * @param {number} playerX - 玩家 X 坐标（像素）
 * @param {number} playerY - 玩家 Y 坐标（像素）
 * @param {number} range - 搜索范围（格子数，默认 5）
 * @param {string} type - NPC 类型过滤（可选）
 * @returns {Array} 附近的 NPC 列表
 */
export function getNearbyNPCs(mapId, playerX, playerY, range = 5, type = null) {
    const CELL_SIZE = 10 // 每格 10 像素
    const normalizedMapId = (mapId || '').toLowerCase()
    const npcsOnMap = getNPCsByMap(normalizedMapId)

    return npcsOnMap.filter(npc => {
        // 类型过滤
        if (type && npc.type !== type) return false

        // 距离计算（格子单位）
        const npcPxX = npc.x * CELL_SIZE
        const npcPxY = npc.y * CELL_SIZE
        const distanceInCells = Math.sqrt(
            Math.pow((npcPxX - playerX) / CELL_SIZE, 2) +
            Math.pow((npcPxY - playerY) / CELL_SIZE, 2)
        )

        return distanceInCells <= range
    })
}

/**
 * 查找最近的指定类型 NPC
 * @param {string} mapId - 当前地图 ID
 * @param {number} playerX - 玩家 X 坐标（像素）
 * @param {number} playerY - 玩家 Y 坐标（像素）
 * @param {string} type - NPC 类型
 * @returns {Object|null} 最近的 NPC 或 null
 */
export function getNearestNPC(mapId, playerX, playerY, type) {
    const CELL_SIZE = 10
    const normalizedMapId = (mapId || '').toLowerCase()
    const npcsOnMap = getNPCsByMap(normalizedMapId).filter(npc => npc.type === type)

    if (npcsOnMap.length === 0) return null

    let nearest = null
    let minDistance = Infinity

    npcsOnMap.forEach(npc => {
        const npcPxX = npc.x * CELL_SIZE
        const npcPxY = npc.y * CELL_SIZE
        const distance = Math.sqrt(
            Math.pow(npcPxX - playerX, 2) +
            Math.pow(npcPxY - playerY, 2)
        )

        if (distance < minDistance) {
            minDistance = distance
            nearest = npc
        }
    })

    return nearest
}

/**
 * 获取 NPC 的商店列表（带价格信息）
 * @param {string} npcId - NPC ID
 * @returns {Array} 商店物品列表，包含 ID 和价格
 */
export function getNPCShop(npcId) {
    const npc = getNPCById(npcId)
    if (!npc || npc.type !== NPCType.MERCHANT || !npc.shop) {
        return []
    }

    // 从 dealer.json 中获取物品信息
    return npc.shop.map(itemId => {
        const dealerItem = DealerData.find(item => item.id === itemId)
        return {
            id: itemId,
            price: dealerItem ? dealerItem.price : 0,
            name: dealerItem ? dealerItem.name_cn : `物品${itemId}`
        }
    })
}
