// src/game/drops.js
import { getItemInfo } from './items'

// 软保底状态 (怪物ID -> { rareCounter: 0 })
const pityState = {}

function getPity(mobId) {
    if (!pityState[mobId]) pityState[mobId] = { rareCounter: 0 }
    return pityState[mobId]
}

// 掉落表定义 (Monster ID -> Table)
export const DropTables = {
    // 波利
    1001: {
        normal: [
            { id: 909, rate: 7000 },  // 杰勒比结晶 70%
            { id: 501, rate: 1500 },  // 红色药水 15%
        ],
        rare: [
            { id: 1201, rate: 500 },  // 短剑 5%
            { id: 4001, rate: 10 }    // 波利卡片 0.1%
        ]
    },
    // 绿棉虫
    1002: {
        normal: [
            { id: 909, rate: 6000 },
            { id: 519, rate: 1000 },
        ],
        rare: [
            { id: 1201, rate: 200 },
            { id: 4002, rate: 10 }
        ]
    },
    // 疯兔
    1004: {
        normal: [
            { id: 519, rate: 5000 },
            { id: 904, rate: 2000 },
        ],
        rare: [
            { id: 4005, rate: 10 }
        ]
    },
    // 小鸡
    1005: {
        normal: [
            { id: 909, rate: 4000 },
            { id: 501, rate: 2000 }, // 药多
        ],
        rare: [
            { id: 2301, rate: 500 } // 棉衬衫 5%
        ]
    },
    // 苍蝇
    1006: {
        normal: [
            { id: 909, rate: 5000 },
            { id: 904, rate: 1000 },
        ],
        rare: []
    },
    // 树木精
    1007: {
        normal: [
            { id: 938, rate: 5000 }, // 树脂
        ],
        rare: [
            { id: 2301, rate: 200 }
        ]
    },
    // 小野猪
    1008: {
        normal: [
            { id: 501, rate: 2000 }
        ],
        rare: []
    },
    // 秃鹰
    1009: {
        normal: [
            { id: 904, rate: 3000 }
        ],
        rare: []
    },
    // 盗虫
    1010: {
        normal: [
            { id: 909, rate: 5000 }
        ],
        rare: []
    },
    // 大嘴鸟蛋
    1011: {
        normal: [],
        rare: []
    }
}

// 核心掉落计算
import { getMonster } from './monsters'

export function calculateDrops(monsterId) {
    const results = []
    const pity = getPity(monsterId)
    const template = getMonster(monsterId)

    // 优先使用数据库加载的掉落数据
    if (template && template.drops && template.drops.length > 0) {
        template.drops.forEach(drop => {
            // RO 数据库中的概率通常是 0-1 (或者 10000 = 100%)
            // 已经在 dataLoader 中转换为 0-1 了
            if (Math.random() < drop.rate) {
                // 简单判定 rare: 概率小于 1% 的视为 rare
                const type = drop.rate < 0.01 ? 'rare' : 'normal'
                results.push({ id: drop.id, count: 1, type: type })
            }
        })
        return results
    }

    // 后备：使用硬编码的掉落表
    const table = DropTables[monsterId]
    if (!table) return []

    // 1. Normal Drops (无保底，受倍率影响)
    if (table.normal) {
        for (const drop of table.normal) {
            let rate = drop.rate
            if (Math.random() * 10000 < rate) {
                results.push({ id: drop.id, count: 1, type: 'normal' })
            }
        }
    }

    // 2. Rare Drops (软保底)
    if (table.rare) {
        let hasRare = false
        for (const drop of table.rare) {
            let baseRate = drop.rate
            let effectiveRate = baseRate + (pity.rareCounter * 5)
            effectiveRate = Math.min(effectiveRate, baseRate * 10)

            if (Math.random() * 10000 < effectiveRate) {
                results.push({ id: drop.id, count: 1, type: 'rare' })
                hasRare = true
            }
        }

        if (hasRare) {
            pity.rareCounter = 0
        } else {
            pity.rareCounter++
        }
    }

    return results
}

// 辅助：检查物品是否是"垃圾" (Normal Drop)
export function isNormalDrop(itemId) {
    // 遍历所有表的 normal 组
    for (const key in DropTables) {
        const table = DropTables[key]
        if (table.normal && table.normal.find(d => d.id === itemId)) {
            return true
        }
    }
    return false
}
