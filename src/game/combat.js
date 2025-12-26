import { reactive } from 'vue'
import { player, addExp, addItem, useItem, saveGame } from './player' 
import { spawnMonster } from './monsters'
import { getItemInfo } from './items'
import { calcAspdDelay, calculateDamageFlow } from './formulas' 
import { calculateDrops } from './drops' 
import { PassiveHooks } from './skillEngine'
import { mapState, initMap, findNearestMonster, movePlayerToward, randomWalk, removeMonster } from './mapManager'

// 游戏循环状态
export const gameState = reactive({
  isAuto: false, 
  currentMonster: null, // 当前锁定的目标
  status: 'IDLE' // IDLE, MOVING, ATTACKING, SEARCHING
})

let logCallback = null
export function setLogCallback(fn) {
  logCallback = fn
}

function log(msg, type = 'info') {
  if (logCallback) logCallback(msg, type)
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
    log('检测到玩家已死亡。正在执行紧急复苏协议...', 'warning')
    player.hp = player.maxHp
    player.sp = player.maxSp
    log('生命体征恢复。状态：满血。', 'system')
  }

  gameState.isAuto = true
  combatSessionId++
  const currentSession = combatSessionId

  // 初始化地图
  initMap(player.currentMap)

  log(`AI Initiated (Session ${currentSession}) on ${player.currentMap}.`, 'system')
  
  clearLoops()
  aiTick(currentSession)
}

export function stopBot() {
  gameState.isAuto = false
  gameState.status = 'IDLE'
  gameState.currentMonster = null
  clearLoops()
  combatSessionId++ 
  log('AI Suspended.', 'system')
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
            log('You have died. AI stopping.', 'error')
            stopBot()
            return
        }

        checkAutoPotion()

        // 1. 如果没有目标，则寻怪
        if (!gameState.currentMonster) {
            gameState.status = 'SEARCHING'
            const { monster, distance } = findNearestMonster(player.config.viewRange)
            
            if (monster) {
                gameState.currentMonster = monster
                log(`Monster ${monster.name} detected at distance ${Math.floor(distance)}!`, 'dim')
            } else {
                // 没怪，随机走动
                randomWalk()
                mainLoopId = setTimeout(() => aiTick(sessionId), 1000)
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
        const attackRange = player.config.attackRange || 40

        if (dist > attackRange) {
            // 距离太远，追击
            gameState.status = 'MOVING'
            movePlayerToward(target.x, target.y, 15) // 追击速度快一点
            mainLoopId = setTimeout(() => aiTick(sessionId), 100)
            return
        }

        // 3. 开始攻击逻辑
        gameState.status = 'ATTACKING'
        
        // 攻击逻辑 (保持原有的 formulas)
        const passiveRes = PassiveHooks.onNormalAttack(target)
        const res = calculateDamageFlow({
            attackerAtk: player.atk,
            attackerHit: player.hit,
            attackerCrit: player.crit,
            defenderDef: target.def || 0,
            defenderFlee: target.flee || 1,
            isPlayerAttacking: true
        })

        if (res.type === 'miss') {
            log(`You miss ${target.name}!`, 'dim')
        } else {
            let damage = res.damage
            if (passiveRes.damageMod !== 1.0) damage = Math.floor(damage * passiveRes.damageMod)
            
            if (res.type === 'crit') log(`CRITICAL! You deal ${damage} damage.`, 'warning')
            else log(`You attack ${target.name} for ${damage} damage.`, 'default')
            
            passiveRes.logs.forEach(l => log(l.msg, l.type))

            target.hp -= damage

            // 怪物反击 (简易版：怪物被攻击时开始攻击玩家)
            if (!monsterLoopId) {
                monsterLoopId = setTimeout(() => monsterActionLoop(sessionId), 500)
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

async function monsterActionLoop(sessionId) {
    if (!gameState.isAuto || !gameState.currentMonster || sessionId !== combatSessionId) {
        monsterLoopId = null
        return
    }

    const target = gameState.currentMonster

    if (target.hp > 0 && player.hp > 0) {
        const res = calculateDamageFlow({
            attackerAtk: target.atk,
            attackerHit: target.hit || 50,
            attackerCrit: 0,
            defenderDef: player.def,
            defenderFlee: player.flee,
            isPlayerAttacking: false
        })

        if (res.type === 'miss') {
            log(`${target.name} missed you!`, 'success')
        } else {
            player.hp -= res.damage
            log(`${target.name} attacks you for ${res.damage} damage!`, 'error')
            checkAutoPotion()

            if (player.hp <= 0) {
                log('You died!', 'error')
                player.hp = 0
                gameState.currentMonster = null
                saveGame()
                stopBot() 
                return
            }
        }
    }

    if (gameState.isAuto && gameState.currentMonster && gameState.currentMonster.hp > 0 && sessionId === combatSessionId) {
        const delay = target.attackDelay || 2000 
        monsterLoopId = setTimeout(() => monsterActionLoop(sessionId), delay)
    } else {
        monsterLoopId = null
    }
}

function monsterDead(target) {
  log(`${target.name} died.`, 'success')
  
  const jobExp = target.jobExp || Math.ceil(target.exp * 0.6)
  const { leveledUp, jobLeveledUp } = addExp(target.exp, jobExp)
  
  log(`Base Exp + ${target.exp} | Job Exp + ${jobExp}`, 'info')
  
  if (leveledUp) log(`Level Up! Base Lv ${player.lv}`, 'levelup')
  if (jobLeveledUp) log(`Job Up! Job Lv ${player.jobLv}`, 'levelup')

  const drops = calculateDrops(target.id)
  drops.forEach(drop => {
      addItem(drop.id, drop.count)
      const info = getItemInfo(drop.id)
      const typeStr = drop.type === 'rare' ? '[RARE] ' : ''
      const style = drop.type === 'rare' ? 'warning' : 'success'
      log(`Loot: ${typeStr}${info.name} x ${drop.count}`, style)
  })

  // 从地图移除怪物
  removeMonster(target.guid)
  gameState.currentMonster = null
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
