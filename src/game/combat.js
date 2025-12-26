import { reactive } from 'vue'
import { player, addExp, addItem, useItem, saveGame } from './player' 
import { spawnMonster } from './monsters'
import { getItemInfo } from './items'
import { calcAspdDelay, calculateDamageFlow } from './formulas' 
import { calculateDrops } from './drops' // 引入新掉落系统

// 游戏循环状态
export const gameState = reactive({
  isAuto: false, 
  currentMonster: null, 
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
let playerLoopId = null
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

  log(`AI Initiated (Session ${currentSession}).`, 'system')
  clearLoops()
  playerActionLoop(currentSession)
}

export function stopBot() {
  gameState.isAuto = false
  clearLoops()
  combatSessionId++ 
  log('AI Suspended.', 'system')
}

function clearLoops() {
    if (playerLoopId) clearTimeout(playerLoopId)
    if (monsterLoopId) clearTimeout(monsterLoopId)
    playerLoopId = null
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

// --- 异步双轨循环 ---

async function playerActionLoop(sessionId) {
    if (!gameState.isAuto || sessionId !== combatSessionId) return

    try {
        if (player.hp <= 0) {
            log('You have died. AI stopping.', 'error')
            stopBot()
            return
        }

        checkAutoPotion()

        if (!gameState.currentMonster) {
            log('Searching for target...', 'dim')
            await sleep(800) 
            if (!gameState.isAuto || sessionId !== combatSessionId) return 

            const mapId = player.currentMap || 'prt_fild08'
            gameState.currentMonster = spawnMonster(mapId)
            log(`Monster ${gameState.currentMonster.name} appeared! (HP: ${gameState.currentMonster.hp})`, 'warning')
            
            if (!monsterLoopId) {
                setTimeout(() => monsterActionLoop(sessionId), Math.random() * 500)
            }
        }

        const target = gameState.currentMonster
        
        if (target && target.hp > 0) {
             // 1. 调用新的伤害公式
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
                 if (res.type === 'crit') {
                     log(`CRITICAL! You deal ${damage} damage to ${target.name}.`, 'warning')
                 } else {
                     log(`You attack ${target.name} for ${damage} damage.`, 'default')
                 }
                 
                 // Double Attack (独立判定，还是作为 Bonus 伤害？RO里是两次黄字，这里简单做成一次大伤害)
                 // 修正：Double Attack 其实是技能，应该在 formula 外面判断，或者传入 formula
                 // 这里保持现状
                 const doubleAttackLv = player.skills['double_attack'] || 0
                 if (doubleAttackLv > 0 && Math.random() * 100 < (doubleAttackLv * 5)) {
                     log(`Double Attack! You deal ${damage} damage.`, 'warning')
                     target.hp -= damage
                 }

                 target.hp -= damage

                 if (target.hp <= 0) {
                     monsterDead(target)
                     if (monsterLoopId) {
                         clearTimeout(monsterLoopId)
                         monsterLoopId = null
                     }
                     saveGame() 
                     playerLoopId = setTimeout(() => playerActionLoop(sessionId), 500)
                     return 
                 }
             }
        }

        if (gameState.isAuto && sessionId === combatSessionId) {
            playerLoopId = setTimeout(() => playerActionLoop(sessionId), getPlayerDelay())
        }

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
        // 2. 怪物攻击调用公式
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

  // 3. 调用新的掉落系统
  const drops = calculateDrops(target.id)
  
  drops.forEach(drop => {
      addItem(drop.id, drop.count)
      const info = getItemInfo(drop.id)
      const typeStr = drop.type === 'rare' ? '[RARE] ' : ''
      const style = drop.type === 'rare' ? 'warning' : 'success'
      log(`Loot: ${typeStr}${info.name} x ${drop.count}`, style)
  })

  gameState.currentMonster = null
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
