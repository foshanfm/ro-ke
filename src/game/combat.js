import { reactive } from 'vue'
import { player, addExp, addItem, useItem, saveGame } from './player' // 引入 saveGame
import { spawnMonster } from './monsters'
import { getItemInfo } from './items'
import { calcAspdDelay, calcHitRate } from './formulas' 

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

// --- 循环控制与会话锁 ---
let playerLoopId = null
let monsterLoopId = null
let recoveryTimer = null

// 核心改动：战斗会话 ID
// 每次 startBot 时 +1，所有 async loop 必须持有并在执行时校验此 ID
let combatSessionId = 0 

export function startBot() {
  if (gameState.isAuto) return

  // Auto-Resurrection
  if (player.hp <= 0) {
    log('检测到玩家已死亡。正在执行紧急复苏协议...', 'warning')
    player.hp = player.maxHp
    player.sp = player.maxSp
    log('生命体征恢复。状态：满血。', 'system')
  }

  gameState.isAuto = true
  
  // 1. 递增会话 ID，立即使所有旧的 loop 失效
  combatSessionId++
  const currentSession = combatSessionId

  log(`AI Initiated (Session ${currentSession}). Auto-attack mode engaged.`, 'system')
  
  clearLoops()
  
  // 启动玩家循环，传入当前 Session ID
  playerActionLoop(currentSession)
}

export function stopBot() {
  gameState.isAuto = false
  clearLoops()
  // 增加 session id 防止停止后旧 loop 还在跑
  combatSessionId++ 
  log('AI Suspended.', 'system')
}

function clearLoops() {
    if (playerLoopId) clearTimeout(playerLoopId)
    if (monsterLoopId) clearTimeout(monsterLoopId)
    playerLoopId = null
    monsterLoopId = null
}

// --- 独立回复循环 (始终运行) ---
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

      if (player.hp < player.maxHp) {
          player.hp = Math.min(player.maxHp, player.hp + hpRegen)
      }

      let spRegen = 1 + Math.floor((player.int || 1) / 6) + Math.floor(player.maxSp / 100)
      
      if (player.sp < player.maxSp) {
           player.sp = Math.min(player.maxSp, player.sp + spRegen)
      }
  }

  // 回复循环通常不需要 session lock，因为它不依赖战斗状态，
  // 但为了防止组件卸载后还在跑，可以加个全局开关检查（这里简化处理，一直跑）
  recoveryTimer = setTimeout(recoveryLoop, TICK_RATE)
}

function checkAutoPotion() {
    if (!player.config || player.config.auto_hp_percent <= 0) return

    const threshold = player.maxHp * (player.config.auto_hp_percent / 100)
    
    if (player.hp < threshold) {
        const itemToUse = player.config.auto_hp_item || '红色药水'
        const res = useItem(itemToUse)
        if (res.success) {
            log(`[Auto] ${res.msg}`, 'success')
        }
    }
}

// --- 异步双轨循环系统 ---

// 轨道 1: 玩家行动循环
async function playerActionLoop(sessionId) {
    // 🔒 会话锁校验：如果当前全局 session 不等于传入的 session，说明这已经是“旧时代的残党”了
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
            
            // 🔒 再次校验：await 之后世界可能已经变了
            if (!gameState.isAuto || sessionId !== combatSessionId) return 

            const mapId = player.currentMap || 'prt_fild08'
            gameState.currentMonster = spawnMonster(mapId)
            
            log(`Monster ${gameState.currentMonster.name} appeared! (HP: ${gameState.currentMonster.hp})`, 'warning')
            
            if (!monsterLoopId) {
                // 启动怪物循环，传入相同的 Session ID
                setTimeout(() => monsterActionLoop(sessionId), Math.random() * 500)
            }
        }

        const target = gameState.currentMonster
        
        if (target && target.hp > 0) {
             const isCrit = Math.random() * 100 < player.crit
             let isHit = false
             
             if (isCrit) {
                 isHit = true
             } else {
                 const monsterFlee = target.flee || 1
                 const hitRate = calcHitRate(player.hit, monsterFlee)
                 isHit = Math.random() * 100 < hitRate
             }

             if (isHit) {
                 const variance = (Math.random() * 0.2) + 0.9
                 let damage = Math.floor(player.atk * variance)
                 
                 const monsterDef = target.def || 0
                 damage = Math.max(1, damage - monsterDef)

                 if (isCrit) {
                     let rawDmg = Math.floor(player.atk * variance)
                     damage = Math.floor(rawDmg * 1.4)
                     log(`CRITICAL! You deal ${damage} damage to ${target.name}.`, 'warning')
                 } else {
                     log(`You attack ${target.name} for ${damage} damage.`, 'default')
                 }
                 
                 const doubleAttackLv = player.skills['double_attack'] || 0
                 if (doubleAttackLv > 0 && Math.random() * 100 < (doubleAttackLv * 5)) {
                     log(`Double Attack! You deal ${damage} damage.`, 'warning')
                     target.hp -= damage
                 }

                 target.hp -= damage

                 if (target.hp <= 0) {
                     monsterDead(target)
                     // 怪物死，清除旧的 monster loop
                     if (monsterLoopId) {
                         clearTimeout(monsterLoopId)
                         monsterLoopId = null
                     }
                     // 此时是存档的最佳时机：战斗结束，结算完毕
                     saveGame() 
                     
                     playerLoopId = setTimeout(() => playerActionLoop(sessionId), 500)
                     return 
                 }
             } else {
                 log(`You miss ${target.name}!`, 'dim')
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

// 轨道 2: 怪物行动循环
async function monsterActionLoop(sessionId) {
    // 🔒 会话锁校验
    if (!gameState.isAuto || !gameState.currentMonster || sessionId !== combatSessionId) {
        monsterLoopId = null
        return
    }

    const target = gameState.currentMonster

    if (target.hp > 0 && player.hp > 0) {
        const monsterHit = target.hit || 50
        const hitRate = calcHitRate(monsterHit, player.flee)
        const isMonsterHit = Math.random() * 100 < hitRate

        if (isMonsterHit) {
            let dmg = Math.max(1, target.atk - player.def)
            player.hp -= dmg
            log(`${target.name} attacks you for ${dmg} damage!`, 'error')
            
            checkAutoPotion()

            if (player.hp <= 0) {
                log('You died!', 'error')
                player.hp = 0
                gameState.currentMonster = null
                saveGame() // 死亡也存档
                stopBot() 
                return
            }
        } else {
            log(`${target.name} missed you!`, 'success')
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
  
  if (leveledUp) {
      log(`Congratulations! You reached Base Level ${player.lv}!`, 'levelup')
  }
  if (jobLeveledUp) {
      log(`Job Up! You reached Job Level ${player.jobLv}!`, 'levelup')
  }

  if (target.drops) {
    target.drops.forEach(drop => {
      if (Math.random() < drop.rate) {
        addItem(drop.id, 1) // addItem 内部也会 saveGame，但这里我们稍后在外部统一 save
        const info = getItemInfo(drop.id)
        log(`Item Added: ${info.name} x 1`, 'success')
      }
    })
  }

  gameState.currentMonster = null
  // 注意：这里我们不再依赖 addItem 的 saveGame，而是在调用者那里统一 saveGame，防止多次写入
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
