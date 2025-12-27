import { reactive } from 'vue'
import { player, addExp, addItem, useItem, saveGame, warp, respawn } from './player'
import { spawnMonster, getMonster } from './monsters'
import { getItemInfo } from './items'
import { calcAspdDelay, calculateDamageFlow, calcMoveSpeed } from './formulas'
import { calculateDrops } from './drops'
import { PassiveHooks } from './skillEngine'
import { mapState, initMap, findNearestMonster, movePlayerToward, randomWalk, removeMonster, checkWarpCollision } from './mapManager'
import { findPath } from './navigation' // Import findPath

// 游戏循环状态
export const gameState = reactive({
    isAuto: false,
    goalMap: null, // 目标挂机地图
    currentMonster: null, // 当前锁定的目标
    manualTarget: null, // 手动移动目标 { x, y }
    status: 'IDLE', // IDLE, MOVING, ATTACKING, SEARCHING, RETURNING
    lastActionLog: '' // 防止重复打日志
})

let logCallback = null
export function setLogCallback(fn) {
    logCallback = fn
}

function log(msg, type = 'info') {
    if (logCallback) logCallback(msg, type)
}

/**
 * 获取怪物模板数据（工具函数）
 */
function getMobTemplate(monsterInstance) {
    return getMonster(monsterInstance.templateId)
}

function getPlayerDelay() {
    const aspd = player.aspd || 150
    return calcAspdDelay(aspd)
}

// --- 循环控制 ---
let mainLoopId = null
let monsterLoopId = null
let recoveryTimer = null
let combatSessionId = 0

export function startBot() {
    if (gameState.isAuto) return

    if (player.hp <= 0) {
        log('检测到玩家处于死亡状态。正在返回存储点复活...', 'warning')
        const res = respawn()
        log(res.msg, 'system')
    }

    gameState.isAuto = true
    combatSessionId++
    const currentSession = combatSessionId

    // 初始化地图
    initMap(player.currentMap)

    // 设置目标地图为当前地图(如果未设置或刚启动)
    if (!gameState.goalMap) gameState.goalMap = (player.currentMap || '').toLowerCase()
    else gameState.goalMap = gameState.goalMap.toLowerCase()

    log(`AI Initiated (Session ${currentSession}). Target: ${gameState.goalMap}.`, 'system')

    clearLoops()
    aiTick(currentSession)
}

export function stopBot() {
    gameState.isAuto = false
    gameState.status = 'IDLE'
    gameState.goalMap = null // 停止时清除目标
    gameState.manualTarget = null // 停止时清除手动移动目标
    // 注意：不清除 currentMonster，不清除 Loops，不增加 sessionId
    // 这样 aiTick 会因为 isAuto=false 而停止，但 monsterActionLoop 会继续执行直到战斗结束
    log('AI Suspended. (Combat may continue)', 'system')
}

/**
 * 设置手动移动目标
 */
export function moveTo(x, y) {
    gameState.manualTarget = { x, y }

    // 如果 bot 没开，启动它
    if (!gameState.isAuto) {
        startBot()
    } else {
        // 如果 bot 开着，我们可能需要立即刷新 aiTick 以响应移动，
        // 而不是等待当前的 attackDelay 结束
        clearLoops() // 清除当前的 setTimeout
        aiTick(combatSessionId) // 重新触发一个 Tick
    }
}

function clearLoops() {
    if (mainLoopId) clearTimeout(mainLoopId)
    if (monsterLoopId) clearTimeout(monsterLoopId)
    mainLoopId = null
    monsterLoopId = null
}

export function startRecovery() {
    if (recoveryTimer) return
    recoveryLoop()
}

function recoveryLoop() {
    const TICK_RATE = 5000
    if (player.hp > 0) {
        let hpRegen = 1 + Math.floor((player.vit || 1) / 5) + Math.floor(player.maxHp / 200)
        const hpRecLv = player.skills['hp_recovery'] || 0
        if (hpRecLv > 0) {
            const skillBonus = 5 + (hpRecLv * 3) + (player.maxHp * 0.002 * hpRecLv)
            hpRegen += Math.floor(skillBonus / 2)
        }
        if (player.hp < player.maxHp) player.hp = Math.min(player.maxHp, player.hp + hpRegen)

        let spRegen = 1 + Math.floor((player.int || 1) / 6) + Math.floor(player.maxSp / 100)
        if (player.sp < player.maxSp) player.sp = Math.min(player.maxSp, player.sp + spRegen)
    }
    recoveryTimer = setTimeout(recoveryLoop, TICK_RATE)
}

function checkAutoPotion() {
    if (!player.config || player.config.auto_hp_percent <= 0) return
    const threshold = player.maxHp * (player.config.auto_hp_percent / 100)
    if (player.hp < threshold) {
        const itemToUse = player.config.auto_hp_item || '红色药水'
        const res = useItem(itemToUse)
        if (res.success) log(`[Auto] ${res.msg}`, 'success')
    }
}

// --- 核心 AI 决策树 (Tick-based) ---

async function aiTick(sessionId) {
    if (!gameState.isAuto || sessionId !== combatSessionId) return

    try {
        if (player.hp <= 0) {
            log('你已死亡！AI 停止工作。正在返回存储点...', 'error')
            const res = respawn()
            log(res.msg, 'system')
            stopBot()
            return
        }

        checkAutoPotion()

        // 0. 检查是否在目标地图
        const curMapId = (player.currentMap || '').toLowerCase()
        const goalMapId = (gameState.goalMap || '').toLowerCase()

        if (goalMapId && curMapId !== goalMapId) {
            gameState.status = 'RETURNING'
            // 寻路返回
            const path = findPath(curMapId, goalMapId)

            if (!path || path.length < 2) {
                log(`无法找到返回 ${gameState.goalMap} 的路径!`, 'error')
                stopBot()
                return
            }

            const nextMap = path[1] // path[0] is current

            // 寻找通往 nextMap 的传送点
            // mapState.activeWarps 应该包含所有传送点信息
            // activeWarps: [{x, y, targetMap, name}]
            const warpToNext = mapState.activeWarps.find(w => w.targetMap === nextMap)

            if (warpToNext) {
                if (gameState.lastActionLog !== `return_${nextMap}`) {
                    log(`Returning to ${gameState.goalMap}... Next step: ${nextMap}`, 'system')
                    gameState.lastActionLog = `return_${nextMap}`
                }

                // 移动向传送点
                movePlayerToward(warpToNext.x, warpToNext.y, player.moveSpeed)

                // 检查是否触碰传送点 (复用原有逻辑)
                const warpInfo = checkWarpCollision(player.x, player.y)
                if (warpInfo) {
                    // ... warp logic (reuse existing block via function extraction could be better, but inline works)
                    log(`进入传送点 [${warpInfo.name}]...`, 'warning')
                    // 暂时停止一下让 warp 生效，不要 stopBot，因为我们要跨图
                    // 但目前的 warp 实现是立即生效 + 异步
                    // 我们不需要 stopBot，只需要让这一帧结束，等待 warp 更新 map
                    const res = warp(warpInfo.targetMap)
                    if (res.success) {
                        // Warp successful
                        // Update player pos slightly to avoid immediate re-warp if bidirectional (handled by offset)
                        // But wait, warp() changes map, InitMap will trigger.
                        // On next aiTick, player.currentMap will be new map.
                        return
                    }
                }
            } else {
                // 找不到传送点 (可能是 warp 数据缺失)
                log(`Unknown warp to ${nextMap} on current map!`, 'error')
                stopBot()
            }

            mainLoopId = setTimeout(() => aiTick(sessionId), 100)
            return
        }

        // 1. 优先处理手动移动目标
        if (gameState.manualTarget) {
            gameState.status = 'MOVING'
            const { x, y } = gameState.manualTarget
            const dist = Math.sqrt(Math.pow(x - player.x, 2) + Math.pow(y - player.y, 2))

            if (dist < 5) {
                log(`到达目的地 (${Math.floor(x / 10)}, ${Math.floor(y / 10)})`, 'success')
                gameState.manualTarget = null
                stopBot()
                return
            }

            movePlayerToward(x, y, player.moveSpeed)

            // 检查传送阵触碰
            const warpInfo = checkWarpCollision(player.x, player.y)
            if (warpInfo) {
                log(`进入传送点 [${warpInfo.name}]，传送至 ${warpInfo.targetMap}...`, 'warning')
                stopBot()
                setTimeout(() => {
                    const res = warp(warpInfo.targetMap)
                    if (res.success) {
                        // 添加微小偏移量，防止踩在传送阵动弹不得
                        const offsetX = (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 2)
                        const offsetY = (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 2)
                        player.x = warpInfo.targetX + offsetX
                        player.y = warpInfo.targetY + offsetY
                        log(`已到达 ${warpInfo.targetMap} (${Math.floor(player.x / 10)}, ${Math.floor(player.y / 10)})`, 'success')
                    }
                }, 500)
                return
            }

            mainLoopId = setTimeout(() => aiTick(sessionId), 100)
            return
        }

        // 1. 如果没有目标，则寻怪
        if (!gameState.currentMonster) {
            gameState.status = 'SEARCHING'
            const { monster, distance } = findNearestMonster(player.config.viewRange)

            if (monster) {
                gameState.currentMonster = monster
                const mobTemplate = getMobTemplate(monster)
                log(`[${mobTemplate.name}] detected at (${Math.floor(monster.x / 10)}, ${Math.floor(monster.y / 10)})!`, 'dim')
                gameState.lastActionLog = '' // 重置动作日志
            } else {
                // 没怪，随机漫步 (巡逻)
                const isFirstPatrol = !mapState.patrolTarget
                const arrived = randomWalk()

                if (isFirstPatrol) {
                    log(`No monsters nearby. Patrolling to (${Math.floor(mapState.patrolTarget.x / 10)}, ${Math.floor(mapState.patrolTarget.y / 10)})...`, 'dim')
                }

                mainLoopId = setTimeout(() => aiTick(sessionId), arrived ? 500 : 100) // 如果到达了等久一点
                return
            }
        }

        const target = gameState.currentMonster

        // 校验目标有效性 (是否已死亡)
        if (target.hp <= 0) {
            gameState.currentMonster = null
            mainLoopId = setTimeout(() => aiTick(sessionId), 200)
            return
        }

        // 2. 检查距离
        const dist = Math.sqrt(Math.pow(target.x - player.x, 2) + Math.pow(target.y - player.y, 2))
        const attackRange = player.attackRange || 10

        if (dist > attackRange) {
            // 距离太远，追击
            gameState.status = 'MOVING'
            const mobTemplate = getMobTemplate(target)

            if (gameState.lastActionLog !== `chase_${target.guid}`) {
                log(`Moving toward [${mobTemplate.name}] at (${Math.floor(target.x / 10)}, ${Math.floor(target.y / 10)})...`, 'dim')
                gameState.lastActionLog = `chase_${target.guid}`
            }

            movePlayerToward(target.x, target.y, player.moveSpeed) // 使用计算出的玩家速度

            // 检查是否触碰传送点
            const warpInfo = checkWarpCollision(player.x, player.y)
            if (warpInfo) {
                log(`进入传送点 [${warpInfo.name}]，传送至 ${warpInfo.targetMap}...`, 'warning')
                stopBot()
                setTimeout(() => {
                    const res = warp(warpInfo.targetMap)
                    if (res.success) {
                        // 添加微小偏移量，防止踩在传送阵动弹不得
                        const offsetX = (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 2)
                        const offsetY = (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 2)
                        player.x = warpInfo.targetX + offsetX
                        player.y = warpInfo.targetY + offsetY
                        log(`已到达 ${warpInfo.targetMap} (${Math.floor(player.x / 10)}, ${Math.floor(player.y / 10)})`, 'success')
                    }
                }, 500)
                return
            }

            mainLoopId = setTimeout(() => aiTick(sessionId), 100)
            return
        }

        // 3. 开始攻击逻辑

        // --- AMMO CHECK FOR BOWS ---
        // If weapon is BOW (or based on WeaponType.BOW), verify ammo.
        let weaponType = 'NONE'
        if (player.equipment && player.equipment.Weapon) {
            const wInfo = getItemInfo(player.equipment.Weapon.id)
            if (wInfo) weaponType = wInfo.subType
        }

        // Compatibility: Check both Enum and String 'BOW'
        if (weaponType === 'BOW') {
            const ammo = player.equipment.Ammo
            if (!ammo || ammo.count <= 0) {
                if (gameState.lastActionLog !== 'no_ammo') {
                    log('You need arrows to attack!', 'error')
                    gameState.lastActionLog = 'no_ammo'
                }
                // Do not attack. Stop bot eventually? Or just stand there. 
                // RO behavior: Stand there and fail to attack. 
                // However, we should stop to prevent spam.
                stopBot()
                return
            }

            // Consume Ammo
            ammo.count--
            if (ammo.count <= 0) {
                // Out of ammo
                player.equipment.Ammo = null
                log('Out of arrows!', 'warning')
                stopBot()
                return
            }
        }

        gameState.status = 'ATTACKING'

        // 攻击逻辑 (保持原有的 formulas)
        const passiveRes = PassiveHooks.onNormalAttack(target)
        const targetTemplate = getMobTemplate(target)
        const res = calculateDamageFlow({
            attackerAtk: player.atk,
            attackerHit: player.hit,
            attackerCrit: player.crit,
            defenderDef: targetTemplate.def || 0,
            defenderFlee: targetTemplate.flee || 1,
            isPlayerAttacking: true
        })

        if (res.type === 'miss') {
            log(`You miss [${targetTemplate.name}]!`, 'dim')
        } else {
            let damage = res.damage
            if (passiveRes.damageMod !== 1.0) damage = Math.floor(damage * passiveRes.damageMod)

            if (res.type === 'crit') log(`CRITICAL! You deal ${damage} damage.`, 'warning')
            else log(`You attack [${targetTemplate.name}] for ${damage} damage.`, 'default')

            passiveRes.logs.forEach(l => log(l.msg, l.type))

            target.hp -= damage

            // 怪物被攻击，激活怪物 AI
            if (!monsterLoopId && target.hp > 0) {
                // 延迟启动怪物反击 (模拟反应)
                const startMapId = mapState.currentMapId
                monsterLoopId = setTimeout(() => monsterActionLoop(sessionId, startMapId), 200)
            }

            if (target.hp <= 0) {
                monsterDead(target)
                if (monsterLoopId) {
                    clearTimeout(monsterLoopId)
                    monsterLoopId = null
                }
                saveGame()
                mainLoopId = setTimeout(() => aiTick(sessionId), 500)
                return
            }
        }

        // 攻击间隔
        mainLoopId = setTimeout(() => aiTick(sessionId), getPlayerDelay())

    } catch (err) {
        console.error(err)
        log(`Runtime Error: ${err.message}`, 'error')
        stopBot()
    }
}

async function monsterActionLoop(sessionId, monsterMapId) {
    if (!gameState.currentMonster || sessionId !== combatSessionId || mapState.currentMapId !== monsterMapId) {
        monsterLoopId = null
        return
    }

    const target = gameState.currentMonster

    const targetTemplate = getMobTemplate(target)

    // 1. 距离检测
    const dist = Math.sqrt(Math.pow(target.x - player.x, 2) + Math.pow(target.y - player.y, 2))

    // 逻辑像素转格子: CELL_SIZE = 10
    const attackRangePx = (targetTemplate.range1 || 1) * 10

    try {
        // 2. 行为分支
        if (dist > attackRangePx) {
            // [追击模式]
            // AI 决策延迟(模拟反应时间)
            const reactDelay = Math.random() * 100 + 50 // 50-150ms 怪物反应快一点

            // 计算在此延迟内应该移动的距离
            const moveSpeed = calcMoveSpeed(targetTemplate.speed || 400, 10, reactDelay)
            const angle = Math.atan2(player.y - target.y, player.x - target.x)

            target.x += Math.cos(angle) * moveSpeed
            target.y += Math.sin(angle) * moveSpeed

            monsterLoopId = setTimeout(() => monsterActionLoop(sessionId, monsterMapId), reactDelay)
        } else {
            // [攻击模式]
            const res = calculateDamageFlow({
                attackerAtk: targetTemplate.atk,
                attackerHit: targetTemplate.hit || 50,
                attackerCrit: 0,
                defenderDef: player.def,
                defenderFlee: player.flee,
                isPlayerAttacking: false
            })

            if (res.type === 'miss') {
                log(`${targetTemplate.name} missed you!`, 'success')
            } else {
                player.hp -= res.damage
                log(`${targetTemplate.name} attacks you for ${res.damage} damage!`, 'error')
                checkAutoPotion()

                if (player.hp <= 0) {
                    log('你被杀死了！', 'error')
                    player.hp = 0
                    gameState.currentMonster = null
                    const respRes = respawn()
                    log(respRes.msg, 'system')
                    stopBot()
                    return
                }
            }

            // 攻击后摇 (Attack Delay)
            const delay = targetTemplate.attackDelay || 2000
            monsterLoopId = setTimeout(() => monsterActionLoop(sessionId, monsterMapId), delay)
        }
    } catch (err) {
        console.error('[MonsterAI] Error:', err)
        // 只有严重错误才打印到 UI，避免刷屏
        // 尝试恢复 loop
        monsterLoopId = setTimeout(() => monsterActionLoop(sessionId, monsterMapId), 1000)
    }
}

function monsterDead(target) {
    const targetTemplate = getMobTemplate(target)
    log(`[${targetTemplate.name}] died.`, 'success')

    const jobExp = targetTemplate.jobExp || Math.ceil(targetTemplate.exp * 0.6)
    const { leveledUp, jobLeveledUp, finalBase, finalJob } = addExp(targetTemplate.exp, jobExp, targetTemplate.lv)

    log(`Base Exp + ${finalBase} | Job Exp + ${finalJob}`, 'info')

    if (leveledUp) log(`Level Up! Base Lv ${player.lv}`, 'levelup')
    if (jobLeveledUp) log(`Job Up! Job Lv ${player.jobLv}`, 'levelup')

    const drops = calculateDrops(target.templateId)
    drops.forEach(drop => {
        addItem(drop.id, drop.count)
        const info = getItemInfo(drop.id)
        const typeStr = drop.type === 'rare' ? '[RARE] ' : ''
        const style = drop.type === 'rare' ? 'warning' : 'success'
        log(`Loot: ${typeStr}[${info.name}] x ${drop.count}`, style)
    })

    // 从地图移除怪物
    removeMonster(target.guid)
    gameState.currentMonster = null
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}
