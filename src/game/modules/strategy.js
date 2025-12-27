// src/game/modules/strategy.js
// 机器人策略模块 - 处理补给检查、自动拣货/售卖逻辑

import { getItemInfo, ItemType } from '../items.js'

/**
 * 检查玩家是否需要补给
 * @param {Object} player - 玩家对象
 * @returns {Object} { needsRestock: boolean, reason: string }
 */
export function checkNeedsRestock(player) {
    const config = player.config.strategies.supply
    if (!config) return { needsRestock: false }

    const inventory = player.inventory

    // 1. 检查药水
    const hpItemCount = inventory.reduce((total, slot) => {
        const info = getItemInfo(slot.id)
        if (info.name === config.restock_hp_item) {
            return total + slot.count
        }
        return total
    }, 0)

    if (hpItemCount <= config.restock_hp_trigger) {
        return {
            needsRestock: true,
            reason: `补给不足: ${config.restock_hp_item} 剩余 ${hpItemCount} (阈值 ${config.restock_hp_trigger})`
        }
    }

    // 2. 检查箭矢 (如果有弓)
    // 假设玩家装备了箭矢槽位
    const ammoSlot = player.equipment['Ammo'] // EquipType.AMMO
    if (ammoSlot) {
        const arrowCount = inventory.reduce((total, slot) => {
            if (slot.id === ammoSlot.id) return total + slot.count
            return total
        }, 0)

        if (arrowCount <= config.restock_arrow_trigger) {
            return {
                needsRestock: true,
                reason: `补给不足: ${getItemInfo(ammoSlot.id).name} 剩余 ${arrowCount} (阈值 ${config.restock_arrow_trigger})`
            }
        }
    }

    return { needsRestock: false }
}

/**
 * 判断一件物品是否应该卖出
 * @param {Object} itemSlot - 背包物品项 { id, count }
 * @param {Object} lootConfig - 拾取策略配置
 * @returns {boolean} 是否应该卖出
 */
export function shouldSellItem(itemSlot, lootConfig) {
    const info = getItemInfo(itemSlot.id)
    if (!info) return false

    // 1. 黑名单强制卖出
    if (lootConfig.blacklist && lootConfig.blacklist.includes(itemSlot.id)) {
        return true
    }

    // 2. 白名单强制保留
    if (lootConfig.whitelist && lootConfig.whitelist.includes(itemSlot.id)) {
        return false
    }

    // 3. 卡片处理
    if (info.type === ItemType.CARD && lootConfig.keep_cards) {
        return false
    }

    // 4. 稀有物品处理 (假设 sellPrice 极高或有特殊标记)
    if (lootConfig.keep_rares && info.sellPrice > 5000) {
        return false
    }

    // 5. 杂物处理
    if (info.type === ItemType.ETC && lootConfig.sell_all_etc) {
        return true
    }

    return false
}

/**
 * 获取需要购买的补给清单
 * @param {Object} player - 玩家对象
 * @returns {Array} 清单 [{ id, count }]
 */
export function getRequiredSupplies(player) {
    const config = player.config.strategies.supply
    const inventory = player.inventory
    const supplies = []

    // 药水
    const currentHpItems = inventory.reduce((total, slot) => {
        const info = getItemInfo(slot.id)
        if (info.name === config.restock_hp_item) return total + slot.count
        return total
    }, 0)

    if (currentHpItems < config.restock_hp_amount) {
        // 查找映射 ID（需要从 dealer 数据中找，或者简单根据名字反推）
        // 这里需要导入 DealerData 或者通过 getItemInfo 查找
        // 简单处理：我们假设玩家配置的是名字，我们在买的时候根据名字搜
        supplies.push({
            name: config.restock_hp_item,
            count: config.restock_hp_amount - currentHpItems
        })
    }

    // 箭矢
    const ammoSlot = player.equipment['Ammo']
    if (ammoSlot) {
        const arrowCount = inventory.reduce((total, slot) => {
            if (slot.id === ammoSlot.id) return total + slot.count
            return total
        }, 0)

        if (arrowCount < config.restock_arrow_amount) {
            supplies.push({
                name: getItemInfo(ammoSlot.id).name,
                count: config.restock_arrow_amount - arrowCount
            })
        }
    }

    return supplies
}
