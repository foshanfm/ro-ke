import { player, increaseStat, learnSkill, equipItem, unequipItem, useItem, setConfig, warp, sellItem, buyItem, getShopList, changeJob, insertCard, setSavePoint, saveGame } from './player.js'
import { getItemInfo, ItemType } from './items.js'
import { startBot, stopBot, gameState, moveTo } from './combat.js'
import { JobConfig, JobType } from './jobs.js'
import { Skills } from './skills.js'
import { getEquipInfo, EquipType } from './equipment.js'
import { Maps } from './maps.js'
import { runSimulation } from './simulator.js'
import { castSkill } from './skillEngine.js'
import { mapState } from './mapManager.js'

const commands = {}

/**
 * 注册一个命令。
 * @param {Object} def - 命令定义
 * @param {string} def.name - 主命令名
 * @param {string[]} [def.aliases] - 别名列表
 * @param {string} [def.description] - 帮助文本
 * @param {string} [def.usage] - 用法示例
 * @param {function(string[], Object): void} def.execute - 执行逻辑。args: string[], context: { log: fn, clear: fn }
 * @param {function(string): Array<{text: string, hint?: string, type: string}>} [def.suggest] - 智能提示函数。接收参数字符串，返回提示项数组
 */
export function registerCommand(def) {
    commands[def.name] = def
    if (def.aliases) {
        def.aliases.forEach(alias => {
            commands[alias] = def
        })
    }
}

export function getCommandList() {
    // Return unique command definitions
    const unique = new Set(Object.values(commands))
    return Array.from(unique)
}

export function getCommandNames() {
    return Object.keys(commands)
}

export function executeGameCommand(cmdName, args, context) {
    const cmd = commands[cmdName]
    if (!cmd) {
        // 尝试作为技能名直接执行
        const skillId = cmdName.toLowerCase()
        if (Skills[skillId] && player.skills[skillId]) {
            if (!gameState.currentMonster) {
                context.log('当前没有目标。', 'error')
                return true
            }
            castSkill(skillId, gameState.currentMonster, context.log).then(res => {
                if (res.msg) context.log(res.msg, res.type)
            })
            return true
        }
        return false
    }
    cmd.execute(args, context)
    return true
}

/**
 * 获取命令的智能提示列表
 * @param {string} rawInput - 用户输入的原始字符串
 * @returns {Array<{text: string, hint?: string, type: string}>} 提示项数组
 */
export function getCommandSuggestions(rawInput) {
    if (!rawInput) return []

    const parts = rawInput.split(/\s+/)
    const cmdName = parts[0].toLowerCase()
    const arg = parts.length > 1 ? parts.slice(1).join(' ').toLowerCase() : ''

    // 第一段：命令名补全
    if (parts.length === 1) {
        return getCommandNames()
            .filter(c => c.startsWith(cmdName))
            .map(c => ({ text: c, type: 'cmd' }))
    }

    // 第二段及以后：参数补全
    const cmd = commands[cmdName]
    if (cmd && cmd.suggest) {
        return cmd.suggest(arg)
    }

    return []
}

// --- Command Definitions ---

registerCommand({
    name: 'move',
    aliases: ['m'],
    description: '移动到指定坐标 (用法: move <x> <y>)',
    execute: (args, { log }) => {
        if (args.length < 2) {
            log('用法: move <x> <y>', 'error')
            return
        }
        const x = parseInt(args[0]) * 10
        const y = parseInt(args[1]) * 10
        if (isNaN(x) || isNaN(y)) {
            log('无效的坐标。', 'error')
            return
        }

        // 边界检查
        if (x < 0 || x > mapState.width || y < 0 || y > mapState.height) {
            log(`超出地图边界！当前地图大小为: ${Math.floor(mapState.width / 10)}x${Math.floor(mapState.height / 10)}`, 'error')
            return
        }

        log(`正在移动向 (${args[0]}, ${args[1]})...`, 'system')
        moveTo(x, y)
    }
})

registerCommand({
    name: 'auto',
    aliases: ['start'],
    description: '开始自动战斗 (用法: auto [mapId])',
    suggest: (arg) => {
        return Object.entries(Maps)
            .filter(([id, m]) => id.includes(arg) || m.name.includes(arg))
            .map(([id, m]) => ({ text: id, hint: m.name, type: 'arg' }))
    },
    execute: (args, { log }) => {
        if (args.length > 0) {
            const mapId = args[0].toLowerCase()
            if (Maps[mapId]) {
                gameState.goalMap = mapId
                log(`目标地图设定为: ${Maps[mapId].name} (${mapId})`, 'system')
            } else {
                log(`未知地图: ${mapId}`, 'error')
                return
            }
        }
        startBot()
    }
})

registerCommand({
    name: 'stop',
    description: '停止自动战斗',
    execute: (args, { log }) => {
        stopBot()
    }
})

registerCommand({
    name: 'job',
    description: '转职系统 (用法: job change <职业名>)',
    execute: (args, { log }) => {
        if (args[0] === 'change') {
            const newJob = args[1]
            if (!newJob) {
                log('请指定职业: Swordman, Mage, Archer, Thief, Acolyte', 'error')
                return
            }
            // 查找职业 ID
            const targetJob = Object.keys(JobType).find(k => k.toLowerCase() === newJob.toLowerCase())
            const res = changeJob(JobType[targetJob] || newJob)
            if (res.success) {
                log(res.msg, 'success')
            } else {
                log(res.msg, 'error')
            }
        } else {
            log('用法: job change <职业名>', 'error')
        }
    }
})

registerCommand({
    name: 'card',
    description: '插卡系统 (用法: card <卡片名> <装备部位>)',
    execute: (args, { log }) => {
        if (args.length < 2) {
            log('用法: card <卡片名> <装备部位 (weapon/shield/armor/head/accessory)>', 'error')
            return
        }
        const cardName = args[0]
        const slotName = args[1].toLowerCase()

        let type = null
        if (slotName === 'weapon' || slotName === 'w') type = EquipType.WEAPON
        if (slotName === 'shield' || slotName === 's') type = EquipType.SHIELD
        if (slotName === 'armor' || slotName === 'a') type = EquipType.ARMOR
        if (slotName === 'head' || slotName === 'h') type = EquipType.HEAD
        if (slotName === 'accessory' || slotName === 'acc') type = EquipType.ACCESSORY

        if (!type) {
            log('无效的装备部位。', 'error')
            return
        }

        const res = insertCard(cardName, type)
        if (res.success) {
            log(res.msg, 'success')
        } else {
            log(res.msg, 'error')
        }
    }
})

registerCommand({
    name: 'stat',
    aliases: ['s', 'st'],
    description: '查看角色状态',
    execute: (args, { log }) => {
        const jobName = JobConfig[player.job] ? JobConfig[player.job].name : player.job
        const mapId = (player.currentMap || '').toLowerCase()
        const mapName = Maps[mapId] ? Maps[mapId].name : mapId

        log(`----------------[ 角色状态 ]----------------`, 'system')
        log(`名字: ${player.name} | 职业: ${jobName}`, 'system')
        log(`位置: ${mapName} (${player.currentMap}) [${Math.floor(player.x / 10)}, ${Math.floor(player.y / 10)}]`, 'system')
        log(`Base Lv: ${player.lv} | Exp: ${player.exp}/${player.nextExp} (${((player.exp / player.nextExp) * 100).toFixed(2)}%)`, 'system')
        log(`Job  Lv: ${player.jobLv} | Exp: ${player.jobExp}/${player.nextJobExp} (${((player.jobExp / player.nextJobExp) * 100).toFixed(2)}%)`, 'system')
        log(`HP: ${player.hp}/${player.maxHp} | SP: ${player.sp}/${player.maxSp}`, 'system')

        log(`[战斗属性]`, 'dim')
        log(`Atk: ${player.atk} | Matk: ${player.matk} | Aspd: ${player.aspd}`, 'system')
        log(`Def: ${player.def} | Mdef: ${player.mdef}`, 'system')
        log(`Hit: ${player.hit} | Flee: ${player.flee} | Crit: ${player.crit}`, 'system')

        log(`[基础属性] (剩余素质点: ${player.statPoints})`, 'dim')
        log(`Str: ${player.str} | Agi: ${player.agi} | Dex: ${player.dex}`, 'system')
        log(`Vit: ${player.vit} | Int: ${player.int} | Luk: ${player.luk}`, 'system')

        if (player.equipment) {
            const w = player.equipment[EquipType.WEAPON]
            const s = player.equipment[EquipType.SHIELD]
            const a = player.equipment[EquipType.ARMOR]

            const getEquipName = (inst) => {
                if (!inst) return '(无)'
                const info = getEquipInfo(inst.id)
                const cardNames = inst.cards && inst.cards.filter(c => c).map(c => getItemInfo(c).name).join(', ')
                return cardNames ? `${info.name} [${cardNames}]` : info.name
            }

            log(`[装备] 武器: ${getEquipName(w)}`, 'dim')
            log(`[装备] 副手: ${getEquipName(s)}`, 'dim')
            log(`[装备] 身体: ${getEquipName(a)}`, 'dim')
        }

        log(`[资产] Zeny: ${player.zeny}`, 'warning')

        if (player.config) {
            const autoBuy = player.config.auto_buy_potion ? '开启' : '关闭'
            log(`[配置] AutoHP: < ${player.config.auto_hp_percent}% (Use: ${player.config.auto_hp_item})`, 'dim')
            log(`[配置] AutoBuy: ${autoBuy}`, 'dim')
        }

        const learnedSkills = Object.entries(player.skills).map(([id, lv]) => {
            const s = Skills[id]
            return s ? `${s.name} Lv.${lv}` : `${id} Lv.${lv}`
        }).join(', ')
        if (learnedSkills) {
            log(`[技能] (剩余技能点: ${player.skillPoints})`, 'dim')
            log(`${learnedSkills}`, 'dim')
        }
        log(`--------------------------------------------`, 'system')
    }
})

registerCommand({
    name: 'add',
    description: '分配素质点 (用法: add <属性> <点数>)',
    suggest: (arg) => {
        const stats = ['str', 'agi', 'vit', 'int', 'dex', 'luk']
        return stats.filter(s => s.startsWith(arg)).map(s => ({ text: s, type: 'arg' }))
    },
    execute: (args, { log }) => {
        if (args.length < 2) {
            log('用法: add <属性> <点数>', 'error')
        } else {
            const statName = args[0]
            const amount = parseInt(args[1])
            if (isNaN(amount) || amount <= 0) {
                log('请输入有效的点数。', 'error')
            } else {
                const res = increaseStat(statName, amount)
                if (res.success) {
                    log(res.msg, 'success')
                } else {
                    log(res.msg, 'error')
                }
            }
        }
    }
})

registerCommand({
    name: 'skill',
    aliases: ['sk'],
    description: '查看/学习技能',
    execute: (args, { log }) => {
        if (args.length === 0) {
            const jobName = JobConfig[player.job] ? JobConfig[player.job].name : player.job
            log(`[${jobName}] 可学习技能:`, 'system')
            for (const [id, skill] of Object.entries(Skills)) {
                if (skill.req.job === player.job || skill.req.job === 'Novice') {
                    const curLv = player.skills[id] || 0
                    log(`  ${id} : ${skill.name} (Lv.${curLv}/${skill.maxLv}) - ${skill.desc}`, 'dim')
                }
            }
            log(`输入 'skill <id> <Lv>' 进行学习。`, 'system')
        } else {
            const skillId = args[0]
            const level = parseInt(args[1]) || 1
            const res = learnSkill(skillId, level)
            if (res.success) {
                log(res.msg, 'success')
            } else {
                log(res.msg, 'error')
            }
        }
    }
})

registerCommand({
    name: 'equip',
    aliases: ['eq'],
    description: '装备物品 (用法: equip <物品名>)',
    suggest: (arg) => {
        const uniqueItems = new Set()
        player.inventory.forEach(slot => {
            const info = getItemInfo(slot.id)
            if (info.name.toLowerCase().includes(arg)) {
                uniqueItems.add(info.name)
            }
        })
        return Array.from(uniqueItems).map(name => ({ text: name, type: 'arg' }))
    },
    execute: (args, { log }) => {
        if (args.length === 0) {
            log('用法: equip <物品名>', 'error')
        } else {
            const target = args.join(' ')
            const asId = parseInt(target)
            const res = equipItem(isNaN(asId) ? target : asId)

            if (res.success) {
                log(res.msg, 'success')
            } else {
                log(res.msg, 'error')
            }
        }
    }
})

registerCommand({
    name: 'unequip',
    aliases: ['ueq'],
    description: '卸下装备 (用法: unequip <部位>)',
    suggest: (arg) => {
        return ['weapon', 'shield', 'armor'].filter(s => s.startsWith(arg)).map(s => ({ text: s, type: 'arg' }))
    },
    execute: (args, { log }) => {
        if (args.length === 0) {
            log('用法: unequip <部位>', 'error')
        } else {
            const slot = args[0].toLowerCase()
            let type = null
            if (slot === 'weapon' || slot === 'w' || slot === '武器') type = EquipType.WEAPON
            if (slot === 'shield' || slot === 's' || slot === '副手' || slot === '盾牌') type = EquipType.SHIELD
            if (slot === 'armor' || slot === 'a' || slot === '防具') type = EquipType.ARMOR

            if (type) {
                const res = unequipItem(type)
                if (res.success) {
                    log(res.msg, 'success')
                } else {
                    log(res.msg, 'error')
                }
            } else {
                log('未知部位。请使用 weapon, shield 或 armor。', 'error')
            }
        }
    }
})

registerCommand({
    name: 'use',
    description: '使用物品 (用法: use <物品名>)',
    suggest: (arg) => {
        const uniqueItems = new Set()
        player.inventory.forEach(slot => {
            const info = getItemInfo(slot.id)
            if (info.name.toLowerCase().includes(arg)) {
                uniqueItems.add(info.name)
            }
        })
        return Array.from(uniqueItems).map(name => ({ text: name, type: 'arg' }))
    },
    execute: (args, { log }) => {
        if (args.length === 0) {
            log('用法: use <物品名>', 'error')
        } else {
            const target = args.join(' ')
            const asId = parseInt(target)
            const res = useItem(isNaN(asId) ? target : asId)

            if (res.success) {
                log(res.msg, 'success')
            } else {
                log(res.msg, 'error')
            }
        }
    }
})

registerCommand({
    name: 'sell',
    description: '贩卖物品 (用法: sell <物品名> [数量] 或 sell all)',
    suggest: (arg) => {
        const uniqueItems = new Set()
        uniqueItems.add('all')
        player.inventory.forEach(slot => {
            const info = getItemInfo(slot.id)
            if (info.name.toLowerCase().includes(arg)) {
                uniqueItems.add(info.name)
            }
        })
        return Array.from(uniqueItems).map(name => ({ text: name, type: 'arg' }))
    },
    execute: (args, { log }) => {
        if (args.length === 0) {
            log('用法: sell <物品名> [数量] 或 sell all', 'error')
        } else {
            const target = args[0]
            const count = args.length > 1 ? parseInt(args[1]) : 1
            const asId = parseInt(target)
            const res = sellItem(
                isNaN(asId) ? target : asId,
                isNaN(count) ? 1 : count,
                player.currentMap,
                player.x,
                player.y
            )
            if (res.success) {
                log(res.msg, 'success')
            } else {
                log(res.msg, 'error')
            }
        }
    }
})

registerCommand({
    name: 'buy',
    description: '购买物品 (用法: buy <物品名>)',
    suggest: (arg) => {
        // 智能提示时不检查位置，显示所有可能的商品
        const shop = getShopList(player.currentMap, player.x, player.y)
        return shop.filter(item => {
            const info = getItemInfo(item.id)
            return info.name.toLowerCase().includes(arg)
        }).map(item => {
            const info = getItemInfo(item.id)
            return { text: info.name, hint: `${item.price}z`, type: 'arg' }
        })
    },
    execute: (args, { log }) => {
        if (args.length === 0) {
            const list = getShopList(player.currentMap, player.x, player.y)
            if (list.length === 0) {
                log('附近没有商人 NPC。请靠近道具商人后再查看商店。', 'error')
                return
            }
            log('[ 商店列表 ]', 'system')
            list.forEach(item => {
                const info = getItemInfo(item.id)
                log(`  ${info.name} - ${item.price}z`, 'dim')
            })
            log('输入 buy <物品名> [数量] 进行购买。', 'system')
        } else {
            const target = args[0]
            const count = args.length > 1 ? parseInt(args[1]) : 1
            const res = buyItem(target, isNaN(count) ? 1 : count, player.currentMap, player.x, player.y)
            if (res.success) {
                log(res.msg, 'success')
            } else {
                log(res.msg, 'error')
            }
        }
    }
})

registerCommand({
    name: 'conf',
    aliases: ['config'],
    description: '修改配置 (用法: conf <key> <value>)',
    suggest: (arg) => {
        return ['auto_hp_percent', 'auto_hp_item', 'auto_buy_potion'].filter(s => s.startsWith(arg)).map(s => ({ text: s, type: 'arg' }))
    },
    execute: (args, { log }) => {
        if (args.length < 2) {
            log('用法: conf <key> <value>', 'error')
        } else {
            const key = args[0]
            const val = args[1]
            const res = setConfig(key, val)
            if (res.success) {
                log(res.msg, 'success')
            } else {
                log(res.msg, 'error')
            }
        }
    }
})

registerCommand({
    name: 'map',
    description: '查看地图/移动 (用法: map [id])',
    suggest: (arg) => {
        return Object.entries(Maps)
            .filter(([id, m]) => id.includes(arg) || m.name.includes(arg))
            .map(([id, m]) => ({ text: id, hint: `${m.name} (Lv.${m.minLv}-${m.maxLv})`, type: 'arg' }))
    },
    execute: (args, { log }) => {
        if (args.length === 0) {
            log(`=== 世界地图一览 ===`, 'system')
            const list = Object.entries(Maps)
            list.forEach(([id, m]) => {
                log(`  ${id.padEnd(14)} : ${m.name} (Lv.${m.minLv}-${m.maxLv})`, 'info')
            })
            log(`====================`, 'system')

            log(`[当前位置: ${Maps[player.currentMap]?.name || player.currentMap}]`, 'system')
            const warps = mapState.activeWarps || []
            if (warps.length === 0) {
                log('  (周围没有检测到传送阵)', 'dim')
            } else {
                warps.forEach(w => {
                    const targetName = Maps[w.targetMap]?.name || w.targetMap
                    log(`  >>> 前往 [${targetName}]`, 'success')
                    log(`      位置: (${Math.floor(w.x / 10)}, ${Math.floor(w.y / 10)}) - 靠近自动传送`, 'dim')
                })
            }
            log(`提示: 使用 'move <x> <y>' 走向传送点，或直接点右上角按钮。`, 'system')
            if (warps.length === 0) {
                log('  (无已知传送点)', 'dim')
            } else {
                warps.forEach(w => {
                    log(`  -> ${w.targetMap} 位于 (${Math.floor(w.x / 10)}, ${Math.floor(w.y / 10)}) - ${w.name}`, 'dim')
                })
            }
            log(`输入 'map <id>' 进行跳转,或 'move <x> <y>' 走向传送点。`, 'system')
        } else {
            const mapId = (args[0] || '').toLowerCase()
            // 如果正在挂机，先停止
            if (gameState.isAuto) {
                stopBot()
                log('正在停止战斗以进行移动...', 'warning')
                setTimeout(() => {
                    const res = warp(mapId)
                    if (res.success) {
                        log(res.msg, 'success')
                        log('移动完毕。', 'system')
                    } else {
                        log(res.msg, 'error')
                    }
                }, 1000)
            } else {
                const res = warp(mapId)
                if (res.success) {
                    log(res.msg, 'success')
                } else {
                    log(res.msg, 'error')
                }
            }
        }
    }
})

registerCommand({
    name: 'conf',
    description: '设置配置项 (用法: conf <key> <value> 或 conf strategy <type> <key> <value>)',
    suggest: (arg) => {
        const keys = [
            { text: 'auto_hp_percent', hint: '自动喝药 HP%', type: 'arg' },
            { text: 'auto_hp_item', hint: '自动喝药物品名', type: 'arg' },
            { text: 'strategy', hint: '自动补给/拣货策略', type: 'arg' }
        ]
        return keys.filter(k => k.text.includes(arg))
    },
    execute: (args, { log }) => {
        if (args.length < 2) {
            log('当前配置:', 'system')
            log(`  auto_hp_percent: ${player.config.auto_hp_percent}%`, 'dim')
            log(`  auto_hp_item: ${player.config.auto_hp_item}`, 'dim')
            log(`  攻击范围: ${player.config.attackRange}`, 'dim')
            log('策略配置 (使用 conf strategy 查看详情):', 'system')
            log(`  补给: ${player.config.strategies.supply.restock_hp_item} x ${player.config.strategies.supply.restock_hp_amount}`, 'dim')
            log(`  售卖杂物: ${player.config.strategies.supply.sell_all_etc ? '是' : '否'}`, 'dim')
            return
        }

        const key = args[0]

        // 处理 strategy 子命令
        if (key === 'strategy') {
            const type = args[1] // supply 或 loot
            const subKey = args[2]
            const val = args[3]

            if (!type || !subKey || val === undefined) {
                log('用法: conf strategy <supply|loot> <key> <value>', 'error')
                log('示例: conf strategy supply hp_item 白色药水', 'dim')
                log('示例: conf strategy loot sell_all_etc true', 'dim')
                return
            }

            if (!player.config.strategies[type]) {
                log(`无效的策略类型: ${type} (仅限 supply, loot)`, 'error')
                return
            }

            // 映射 key 名 (为了更友好的命令输入)
            let configKey = subKey
            if (type === 'supply') {
                if (subKey === 'hp_item') configKey = 'restock_hp_item'
                if (subKey === 'hp_cnt') configKey = 'restock_hp_amount'
                if (subKey === 'hp_trig') configKey = 'restock_hp_trigger'
                if (subKey === 'arr_item') configKey = 'restock_arrow_item'
                if (subKey === 'arr_cnt') configKey = 'restock_arrow_amount'
                if (subKey === 'arr_trig') configKey = 'restock_arrow_trigger'
                if (subKey === 'use_bwing') configKey = 'use_butterfly_wing'
            }

            if (player.config.strategies[type][configKey] === undefined) {
                log(`无效的配置项: ${subKey}`, 'error')
                return
            }

            // 转换类型
            let finalVal = val
            if (val === 'true') finalVal = true
            else if (val === 'false') finalVal = false
            else if (!isNaN(parseInt(val)) && val.match(/^\d+$/)) finalVal = parseInt(val)

            player.config.strategies[type][configKey] = finalVal
            saveGame()
            log(`策略更新: [${type}] ${configKey} = ${finalVal}`, 'success')
            return
        }

        const value = args[1]
        if (key === 'auto_hp_percent') {
            player.config.auto_hp_percent = parseInt(value)
        } else if (key === 'auto_hp_item') {
            player.config.auto_hp_item = value
        } else {
            log(`未知配置项: ${key}`, 'error')
            return
        }

        saveGame()
        log(`配置已更新: ${key} = ${value}`, 'success')
    }
})

registerCommand({
    name: 'sim',
    description: '战斗模拟 (用法: sim <map> [times])',
    suggest: (arg) => {
        return Object.entries(Maps)
            .filter(([id, m]) => id.includes(arg) || m.name.includes(arg))
            .map(([id, m]) => ({ text: id, hint: m.name, type: 'arg' }))
    },
    execute: (args, { log }) => {
        const mapId = args[0] || player.currentMap
        const times = parseInt(args[1]) || 1000
        log(`正在模拟 ${mapId} 战斗 ${times} 次...`, 'system')

        // 异步执行避免卡顿
        setTimeout(() => {
            const res = runSimulation(mapId, times)
            log(`================ [ 模拟报告 ] ================`, 'warning')
            log(`[概况] 胜率: ${(res.wins / res.iterations * 100).toFixed(1)}% | 死亡: ${res.deaths}`, 'system')
            log(`[战斗] DPS: ${res.dps.toFixed(1)} | 击杀: ${res.avgHitsToKill.toFixed(1)}刀`, 'system')
            log(`[命中] Hit: ${res.hitRate.toFixed(1)}% | Crit: ${res.critRate.toFixed(1)}%`, 'dim')

            const hours = res.totalTime / 1000 / 3600
            const zenyPerHour = Math.floor(res.totalLootVal / hours)
            const expPerHour = Math.floor(res.totalExp / hours)
            const potionPerHour = Math.floor(res.potionsUsed / hours)
            const netZeny = zenyPerHour - (potionPerHour * 50) // 假设红药50z

            log(`[效率] Exp: ${expPerHour}/h | 毛利: ${zenyPerHour}z/h`, 'warning')
            log(`[消耗] 药水: ${potionPerHour}/h (成本: ${potionPerHour * 50}z)`, 'dim')

            const color = netZeny > 0 ? 'success' : 'error'
            log(`[净利] ${netZeny} Zeny/h`, color)

            log(`安全线: 战斗结束时最低血量 ${res.minHpEnd}`, 'dim')
            log(`==============================================`, 'warning')
        }, 100)
    }
})

registerCommand({
    name: 'item',
    aliases: ['i'],
    description: '查看背包',
    execute: (args, { log }) => {
        if (!player.inventory || player.inventory.length === 0) {
            log('背包是空的。', 'system')
        } else {
            log('=== 背包物品 ===', 'system')
            player.inventory.forEach((slot, index) => {
                const info = getItemInfo(slot.id)
                let extra = ''
                if (info.type === ItemType.EQUIP) {
                    extra = info.atk ? ` (Atk:${info.atk})` : (info.def ? ` (Def:${info.def})` : '')
                    if (slot.instance && slot.instance.cards) {
                        const cardCount = slot.instance.cards.filter(c => c).length
                        if (cardCount > 0) extra += ` [Cards: ${cardCount}]`
                    }
                }
                log(`${index + 1}. ${info.name} x ${slot.count}${extra}`, 'info')
            })
            log('================', 'system')
        }
    }
})

registerCommand({
    name: 'save',
    description: '设置当前坐标为存储点 (仅限主城)',
    execute: (args, { log }) => {
        const res = setSavePoint()
        if (res.success) {
            log(res.msg, 'success')
        } else {
            log(res.msg, 'error')
        }
    }
})

registerCommand({
    name: 'clear',
    description: '清空日志',
    execute: (args, { clear }) => {
        if (clear) clear()
    }
})

registerCommand({
    name: 'help',
    aliases: ['h', '?'],
    description: '显示帮助信息',
    execute: (args, { log }) => {
        log(`========== [ 帮助手册 ] ==========`, 'system')

        const list = getCommandList()
        list.forEach(cmd => {
            if (cmd.description) {
                const nameStr = [cmd.name, ...(cmd.aliases || [])].join(' / ')
                log(`  ${nameStr.padEnd(12)}: ${cmd.description}`, 'dim')
            }
        })

        log(`[提示] 输入指令时按 Tab 键可智能补全`, 'system')
        log(`==================================`, 'system')
    }
})
