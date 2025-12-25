import { reactive } from 'vue'
import { player, addExp, addItem } from './player' 
import { spawnMonster } from './monsters'
import { getItemInfo } from './items'

// 游戏循环状态
export const gameState = reactive({
  isAuto: false, // 是否开启挂机
  currentMonster: null, // 当前正在攻击的怪物
})

// 外部传入的回调，用于在 App.vue 打印日志
let logCallback = null
export function setLogCallback(fn) {
  logCallback = fn
}

function log(msg, type = 'info') {
  if (logCallback) logCallback(msg, type)
}

// 模拟 RO 的攻击延迟 (基于 Agi)
function getDelay() {
  // 简化公式：基础 2秒，每点 AGI 减少 0.04秒，最低 0.2秒
  // RO中攻速 AS PD = 200 - (200-BaseAsdp)... 这里简化模拟
  const delay = Math.max(2000 - (player.agi * 40), 200) 
  return delay
}

// 战斗循环
let loopId = null

export function startBot() {
  if (gameState.isAuto) return
  gameState.isAuto = true
  log('AI Initiated. Auto-attack mode engaged.', 'system')
  gameLoop()
}

export function stopBot() {
  gameState.isAuto = false
  if (loopId) clearTimeout(loopId)
  log('AI Suspended.', 'system')
}

async function gameLoop() {
  if (!gameState.isAuto) return

  // 0. 死亡检查
  if (player.hp <= 0) {
      log('You have died. AI stopping.', 'error')
      stopBot()
      return
  }

  // 1. 索敌 (如果当前没有目标)
  if (!gameState.currentMonster) {
    // 模拟找怪延迟
    log('Scanning for targets...', 'dim')
    await sleep(800) 
    
    if (!gameState.isAuto) return // 防止等待期间停止

    gameState.currentMonster = spawnMonster()
    
    log(`Monster ${gameState.currentMonster.name} appeared! (HP: ${gameState.currentMonster.hp})`, 'warning')
  }

  // 2. 战斗处理
  const target = gameState.currentMonster
  
  // --- 玩家攻击 ---
  // 命中判定 (简化): 
  // 假设怪物 agi 约为 lv * 2 (暂无怪物详细属性，简化处理)
  const targetAgi = target.hp / 5 // 临时糊一个闪避值
  const hitRate = (player.dex + 80) - targetAgi
  // 只要 hitRate > 随机0-100 就算命中
  const isHit = Math.random() * 100 < hitRate

  if (isHit) {
    // 伤害公式 (简化): ATK + STR
    // 浮动伤害 0.8 ~ 1.2
    const variance = (Math.random() * 0.4) + 0.8
    const damage = Math.floor((player.atk + player.str) * variance)
    
    target.hp -= damage
    log(`You attack ${target.name} for ${damage} damage.`, 'default')

    if (target.hp <= 0) {
      monsterDead(target)
      // 怪物死后不需要反击，直接进入下一循环(会有索敌延迟)
      loopId = setTimeout(gameLoop, 500)
      return 
    }
  } else {
    log(`You miss ${target.name}!`, 'dim')
  }

  // 3. 怪物反击 (如果没死)
  if (target && target.hp > 0) {
      // 模拟怪物攻速延迟，这里简单化，玩家打一下，怪打一下
      // 玩家回避判定: Flee = Level + AGI + 100 
      // 怪物命中暂定 80 + Level * 2
      const playerFlee = player.lv + player.agi + 100
      const monsterHit = 80 + (target.hp / 5) // 临时糊一个命中

      const monsterHitChance = monsterHit - playerFlee + 80 // 这是一个命中率百分比
      
      const isMonsterHit = Math.random() * 100 < monsterHitChance

      if (isMonsterHit) {
          const dmg = Math.max(1, target.atk - Math.floor(player.vit / 2))
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

  // 4. 等待下一次心跳 (ASPD)
  if (gameState.isAuto) {
    loopId = setTimeout(gameLoop, getDelay())
  }
}

function monsterDead(target) {
  log(`${target.name} died.`, 'success')
  
  // 结算经验
  const leveledUp = addExp(target.exp)
  log(`Exp + ${target.exp}`, 'info')
  if (leveledUp) {
      log(`Congratulations! You reached Level ${player.lv}!`, 'warning')
  }

  // 结算掉落
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
