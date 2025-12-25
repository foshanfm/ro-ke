import { reactive } from 'vue'
import { player, addExp, addItem } from './player' 
import { spawnMonster } from './monsters'
import { getItemInfo } from './items'

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

function getDelay() {
  // 防止 AGI 过高导致 delay 变成负数
  // 最低延迟 200ms
  const delay = Math.max(2000 - ((player.agi || 1) * 40), 200) 
  return delay
}

// --- 战斗循环控制 ---
let loopId = null

export function startBot() {
  if (gameState.isAuto) return

  // --- 自动复活机制 (Auto-Resurrection) ---
  if (player.hp <= 0) {
    log('检测到玩家已死亡。正在执行紧急复苏协议...', 'warning')
    player.hp = player.maxHp
    player.sp = player.maxSp
    log('生命体征恢复。状态：满血。', 'system')
  }

  gameState.isAuto = true
  log('AI Initiated. Auto-attack mode engaged.', 'system')
  
  // 防止重复调用
  if (loopId) clearTimeout(loopId)
  
  gameLoop()
}

export function stopBot() {
  gameState.isAuto = false
  if (loopId) clearTimeout(loopId)
  loopId = null
  log('AI Suspended.', 'system')
}

// --- 自然回复循环 (Recovery Loop) ---
let recoveryTimer = null

export function startRecovery() {
  if (recoveryTimer) return
  // 启动时静默开启回复循环
  recoveryLoop()
}

function recoveryLoop() {
  const TICK_RATE = 5000 // 5秒一跳
  
  if (player.hp > 0) {
      // 1. HP Recovery
      // 基础公式 (简化): 1 + Vit/5 + MaxHP/200
      let hpRegen = 1 + Math.floor((player.vit || 1) / 5) + Math.floor(player.maxHp / 200)
      
      // 技能修正: Increase HP Recovery (Swordman)
      const hpRecLv = player.skills['hp_recovery'] || 0
      if (hpRecLv > 0) {
           // Skill: 5 + 3*Lv + 0.002*MaxHP*Lv (Per 10s)
           // We run per 5s, so divide by 2
           const skillBonus = 5 + (hpRecLv * 3) + (player.maxHp * 0.002 * hpRecLv)
           hpRegen += Math.floor(skillBonus / 2)
      }

      if (player.hp < player.maxHp) {
          const oldHp = player.hp
          player.hp = Math.min(player.maxHp, player.hp + hpRegen)
          
          // 如果开启了挂机，且回血量 > 0，在日志里显示一下(或者只显示技能效果?)
          // 为了不刷屏，这里暂时保持静默，除非是调试模式
          // const diff = player.hp - oldHp
          // if (gameState.isAuto && diff > 0) log(`HP Recovered +${diff}`, 'dim')
      }

      // 2. SP Recovery
      // 基础公式 (简化): 1 + Int/6 + MaxSP/100
      let spRegen = 1 + Math.floor((player.int || 1) / 6) + Math.floor(player.maxSp / 100)
      
      // 技能修正: Increase SP Recovery (Mage/Priest) - 暂未实装
      
      if (player.sp < player.maxSp) {
           player.sp = Math.min(player.maxSp, player.sp + spRegen)
      }
  }

  recoveryTimer = setTimeout(recoveryLoop, TICK_RATE)
}


async function gameLoop() {
  if (!gameState.isAuto) return

  try {
    // 0. 死亡检查
    if (player.hp <= 0) {
        log('You have died. AI stopping.', 'error')
        stopBot()
        return
    }

    // 1. 索敌
    if (!gameState.currentMonster) {
      log('Scanning for targets...', 'dim')
      
      // 等待期间如果被停止，直接退出
      await sleep(800) 
      if (!gameState.isAuto) return 

      gameState.currentMonster = spawnMonster()
      log(`Monster ${gameState.currentMonster.name} appeared! (HP: ${gameState.currentMonster.hp})`, 'warning')
    }

    // 2. 战斗处理
    const target = gameState.currentMonster
    if (!target) {
        // 异常情况保护
        loopId = setTimeout(gameLoop, 1000)
        return
    }
    
    // --- 玩家攻击 ---
    // 确保属性都是数值
    const pDex = player.dex || 1
    const pAtk = player.atk || 1
    const pStr = player.str || 1
    const pVit = player.vit || 1
    const pAgi = player.agi || 1
    const pLv = player.lv || 1

    const targetAgi = (target.hp || 50) / 5 
    const hitRate = (pDex + 80) - targetAgi
    const isHit = Math.random() * 100 < hitRate

    if (isHit) {
      const variance = (Math.random() * 0.4) + 0.8
      const damage = Math.floor((pAtk + pStr) * variance)
      
      target.hp -= damage
      log(`You attack ${target.name} for ${damage} damage.`, 'default')

      if (target.hp <= 0) {
        monsterDead(target)
        loopId = setTimeout(gameLoop, 500)
        return 
      }
    } else {
      log(`You miss ${target.name}!`, 'dim')
    }

    // 3. 怪物反击
    if (target && target.hp > 0) {
        const playerFlee = pLv + pAgi + 100
        const monsterHit = 80 + (target.hp / 5) 

        const monsterHitChance = monsterHit - playerFlee + 80 
        
        const isMonsterHit = Math.random() * 100 < monsterHitChance

        if (isMonsterHit) {
            const dmg = Math.max(1, target.atk - Math.floor(pVit / 2))
            player.hp -= dmg
            log(`${target.name} attacks you for ${dmg} damage!`, 'error')
            
            if (player.hp <= 0) {
                log('You died!', 'error')
                player.hp = 0
                gameState.currentMonster = null
                stopBot()
                return
            }
        } else {
            log(`${target.name} missed you!`, 'success')
        }
    }

    // 4. Loop
    if (gameState.isAuto) {
      loopId = setTimeout(gameLoop, getDelay())
    }

  } catch (err) {
    console.error(err)
    log(`Runtime Error: ${err.message}`, 'error')
    stopBot()
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
        addItem(drop.id, 1)
        const info = getItemInfo(drop.id)
        log(`Item Added: ${info.name} x 1`, 'success')
      }
    })
  }

  gameState.currentMonster = null
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
