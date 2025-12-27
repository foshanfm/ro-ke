import { reactive, ref } from 'vue'
import { player, addExp, addItem, useItem, saveGame, warp, respawn } from './player'
import { spawnMonster, getMonster } from './monsters'
import { getItemInfo } from './items'
import { calcAspdDelay, calculateDamageFlow, calcMoveSpeed } from './formulas'
import { calculateDrops } from './drops'
import { PassiveHooks } from './skillEngine'
import { mapState, initMap, removeMonster } from './mapManager'
import { findPath } from './navigation'
import { addLog } from './modules/logger.js'
import * as MovementHandler from './combat/MovementHandler.js'
import * as TargetingHandler from './combat/TargetingHandler.js'
import * as CombatHandler from './combat/CombatHandler.js'

// 游戏循环状态
export const gameState = reactive({
    isAuto: false,
    goalMap: null,
    currentMonster: null,
    manualTarget: null,
    status: 'IDLE',
    lastActionLog: ''
})

// Use ref for lastActionLog to pass by reference to handlers
const lastActionLogRef = ref('')

// Backward compatibility: keep setLogCallback for external modules
let logCallback = null
export function setLogCallback(fn) {
    logCallback = fn
}

function log(msg, type = 'info') {
    addLog(msg, type)
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

        // 0. Check if on goal map
        const curMapId = (player.currentMap || '').toLowerCase()
        const goalMapId = (gameState.goalMap || '').toLowerCase()

        if (goalMapId && curMapId !== goalMapId) {
            gameState.status = 'RETURNING'
            lastActionLogRef.value = gameState.lastActionLog
            const result = MovementHandler.handleReturnToGoalMap(
                curMapId,
                goalMapId,
                findPath,
                log,
                lastActionLogRef
            )
            gameState.lastActionLog = lastActionLogRef.value

            if (result.error) {
                log(result.error, 'error')
                stopBot()
                return
            }

            mainLoopId = setTimeout(() => aiTick(sessionId), result.delay || 100)
            return
        }

        // 1. Handle manual movement
        if (gameState.manualTarget) {
            gameState.status = 'MOVING'
            const result = MovementHandler.handleManualMovement(gameState.manualTarget, log)

            if (result.arrived) {
                gameState.manualTarget = null
                stopBot()
                return
            }

            if (result.warped) {
                return
            }

            mainLoopId = setTimeout(() => aiTick(sessionId), result.delay || 100)
            return
        }

        // 2. Search for target
        if (!gameState.currentMonster) {
            gameState.status = 'SEARCHING'
            const result = TargetingHandler.searchForTarget(
                player.config.viewRange,
                log,
                getMobTemplate
            )

            if (result.monster) {
                gameState.currentMonster = result.monster
                gameState.lastActionLog = ''
            } else if (result.shouldPatrol) {
                mainLoopId = setTimeout(() => aiTick(sessionId), result.delay || 100)
                return
            }
        }

        const target = gameState.currentMonster

        // Validate target
        if (!TargetingHandler.isTargetValid(target)) {
            gameState.currentMonster = null
            mainLoopId = setTimeout(() => aiTick(sessionId), 200)
            return
        }

        // 3. Check distance and chase if needed
        const dist = Math.sqrt(Math.pow(target.x - player.x, 2) + Math.pow(target.y - player.y, 2))
        const attackRange = player.attackRange || 10

        if (dist > attackRange) {
            gameState.status = 'MOVING'
            lastActionLogRef.value = gameState.lastActionLog
            const result = MovementHandler.handleChaseTarget(
                target,
                log,
                lastActionLogRef,
                getMobTemplate
            )
            gameState.lastActionLog = lastActionLogRef.value

            if (result.warped) {
                return
            }

            mainLoopId = setTimeout(() => aiTick(sessionId), result.delay || 100)
            return
        }

        // 4. Attack logic
        gameState.status = 'ATTACKING'

        // Check ammo for ranged weapons
        const weaponType = CombatHandler.getWeaponType()
        lastActionLogRef.value = gameState.lastActionLog
        const ammoCheck = CombatHandler.checkAmmo(weaponType, log, lastActionLogRef)
        gameState.lastActionLog = lastActionLogRef.value

        if (!ammoCheck.hasAmmo) {
            if (ammoCheck.shouldStop) {
                stopBot()
            }
            return
        }

        // Consume ammo if using bow
        if (weaponType === 'BOW') {
            const consumed = CombatHandler.consumeAmmo(log)
            if (!consumed) {
                stopBot()
                return
            }
        }

        // Execute attack
        const attackResult = CombatHandler.executeAttack(target, getMobTemplate, log)

        // Activate monster AI if hit and alive
        if (attackResult.type !== 'miss' && !attackResult.killed && !monsterLoopId) {
            const startMapId = mapState.currentMapId
            monsterLoopId = setTimeout(() => monsterActionLoop(sessionId, startMapId), 200)
        }

        // Handle monster death
        if (attackResult.killed) {
            monsterDead(target)
            if (monsterLoopId) {
                clearTimeout(monsterLoopId)
                monsterLoopId = null
            }
            saveGame()
            mainLoopId = setTimeout(() => aiTick(sessionId), 500)
            return
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
