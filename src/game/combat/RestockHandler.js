// src/game/combat/RestockHandler.js
// 机器人自动补给处理器 - 实现从野外返回城市、寻找商人、补给并返回的 FSM

import { getNearestNPC, NPCType } from '../npcs.js'
import { buyItem, sellItem } from '../player.js'
import { shouldSellItem, getRequiredSupplies } from '../modules/strategy.js'
import { useItem } from '../player.js'

/**
 * 处理自动补给逻辑 (FSM)
 * @returns {Object} { done: boolean, delay: number }
 */
export function handleRestock(player, gameState, log) {
    const curMap = (player.currentMap || '').toLowerCase()
    const saveMap = (player.savePoint.map || 'prontera').toLowerCase()
    const lootConfig = player.config.strategies.loot

    // 状态初始化
    if (!gameState.restockState) {
        gameState.restockState = 'START'
    }

    switch (gameState.restockState) {
        case 'START':
            log('开始自动补给流程...', 'system')
            // 检查是否有蝴蝶翅膀
            const bwing = player.inventory.find(i => i.id === 602)
            if (bwing && player.config.strategies.supply.use_butterfly_wing) {
                log('使用蝴蝶翅膀返回存储点...', 'success')
                useItem(602)
                gameState.restockState = 'FIND_NPC'
                return { done: false, delay: 1500 }
            } else {
                log('正在步行返回城市...', 'system')
                gameState.restockState = 'WALK_TO_TOWN'
                return { done: false, delay: 100 }
            }

        case 'WALK_TO_TOWN':
            // 如果已经在主城
            if (curMap === saveMap) {
                gameState.restockState = 'FIND_NPC'
                return { done: false, delay: 100 }
            }
            // 使用现有的返回逻辑 (由 aiTick 外部处理跳转，或者在此处调用 MovementHandler)
            // 为了简单，我们让 aiTick 知道我们在返回。
            // 这里我们返回一个指令让外部处理地图跳转
            return { done: false, walkTo: saveMap, delay: 100 }

        case 'FIND_NPC':
            if (curMap !== saveMap) {
                gameState.restockState = 'WALK_TO_TOWN'
                return { done: false, delay: 100 }
            }

            const npc = getNearestNPC(curMap, player.x, player.y, NPCType.MERCHANT)
            if (!npc) {
                log(`在 ${curMap} 找不到商人 NPC！补给失败。`, 'error')
                gameState.restockState = null
                return { done: true } // 强制结束
            }

            // 检查距离 (5 格内)
            const dist = Math.sqrt(Math.pow(npc.x * 10 - player.x, 2) + Math.pow(npc.y * 10 - player.y, 2))
            if (dist > 5 * 10) {
                log(`正在走向 ${npc.name}...`, 'system')
                // 移动到 NPC
                player.x = npc.x * 10
                player.y = npc.y * 10
                return { done: false, delay: 1000 }
            }

            gameState.restockState = 'TRADING'
            return { done: false, delay: 500 }

        case 'TRADING':
            log('正在进行交易...', 'system')

            // 1. 卖出垃圾
            let soldAny = false
            for (let i = player.inventory.length - 1; i >= 0; i--) {
                const slot = player.inventory[i]
                if (shouldSellItem(slot, lootConfig)) {
                    const res = sellItem(slot.id, slot.count, curMap, player.x, player.y)
                    if (res.success) {
                        log(`[补给] ${res.msg}`, 'success')
                        soldAny = true
                    }
                }
            }

            // 2. 买入补给
            const needed = getRequiredSupplies(player)
            for (const item of needed) {
                const res = buyItem(item.name, item.count, curMap, player.x, player.y)
                if (res.success) {
                    log(`[补给] ${res.msg}`, 'success')
                } else {
                    log(`[补给] 购买 ${item.name} 失败: ${res.msg}`, 'error')
                }
            }

            log('补给执行完毕，准备返回战场。', 'success')
            gameState.restockState = 'DONE'
            return { done: false, delay: 1000 }

        case 'DONE':
            gameState.restockState = null
            return { done: true }
    }

    return { done: true }
}
