import { reactive, watch } from 'vue'
import { JobType, JobConfig, getNextBaseExp, getNextJobExp } from './jobs'
import { Skills, canLearnSkill } from './skills'

// 默认初始数据
const defaultStats = {
  name: 'Novice',
  job: JobType.NOVICE,
  
  // Base Level
  lv: 1,
  exp: 0,
  nextExp: 100, 

  // Job Level
  jobLv: 1,
  jobExp: 0,
  nextJobExp: 50, 
  
  // Points
  statPoints: 0, // 素质点
  skillPoints: 0, // 技能点
  
  // Skills
  skills: {}, // 已学习技能 { 'bash': 1, 'heal': 0 }

  // Stats
  hp: 100,
  maxHp: 100,
  sp: 20,
  maxSp: 20,
  
  atk: 10,
  str: 1,
  agi: 1,
  dex: 1, 
  vit: 1,
  int: 1,
  luk: 1,
  
  inventory: [] 
}

export const player = reactive({ ...defaultStats })

// --- 辅助计算 ---
function recalculateMaxStats() {
    const jobCfg = JobConfig[player.job] || JobConfig.Novice
    
    // 确保基础属性是数值
    const vit = player.vit || 1
    const int = player.int || 1

    // 简易 HP/SP 公式
    // BaseHP + Vit * 5 * JobMod
    const baseHp = 100 + (player.lv * 10)
    player.maxHp = Math.floor((baseHp + vit * 5) * jobCfg.hpMod)

    // BaseSP + Int * 2 * JobMod
    const baseSp = 20 + (player.lv * 2)
    player.maxSp = Math.floor((baseSp + int * 2) * jobCfg.spMod)

    // 修正当前 HP/SP
    if (isNaN(player.hp) || player.hp < 0) player.hp = player.maxHp
    if (player.hp > player.maxHp) player.hp = player.maxHp
    
    if (isNaN(player.sp) || player.sp < 0) player.sp = player.maxSp
    if (player.sp > player.maxSp) player.sp = player.maxSp
}

// --- 存档功能 ---
const SAVE_KEY = 'ro_ke_save_v2' 

export function saveGame() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(player))
}

export function loadGame() {
    const savedData = localStorage.getItem(SAVE_KEY)
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData)
        Object.assign(player, parsed)
        
        // --- 兼容性修复 ---
        if (!player.inventory) player.inventory = []
        if (!player.job) player.job = JobType.NOVICE
        if (!player.jobLv) player.jobLv = 1
        if (player.jobExp === undefined) player.jobExp = 0
        if (!player.nextJobExp) player.nextJobExp = getNextJobExp(player.jobLv)
        if (!player.skillPoints) player.skillPoints = 0
        if (player.statPoints === undefined) player.statPoints = 0
        if (!player.skills) player.skills = {}

        // 确保所有基础属性存在 (关键修复)
        const keys = ['str', 'agi', 'dex', 'vit', 'int', 'luk']
        keys.forEach(k => {
            if (player[k] === undefined || player[k] === null || isNaN(player[k])) {
                player[k] = 1
            }
        })

        // 重新计算衍生属性
        player.nextExp = getNextBaseExp(player.lv)
        player.nextJobExp = getNextJobExp(player.jobLv)
        recalculateMaxStats()

        console.log('[System] Save loaded successfully.')
        return true
      } catch (e) {
        console.error('[System] Save file corrupted, resetting.', e)
        return false
      }
    }
    return false
  }


export function resetGame() {
  Object.assign(player, defaultStats)
  player.nextExp = getNextBaseExp(1)
  player.nextJobExp = getNextJobExp(1)
  saveGame()
}

export function addItem(itemId, count = 1) {
    if (!player.inventory) player.inventory = []
    const existingItem = player.inventory.find(i => i.id === itemId)
    
    if (existingItem) {
      existingItem.count += count
    } else {
      player.inventory.push({ id: itemId, count: count })
    }
    saveGame()
}

// 获得经验 (Base & Job)
export function addExp(baseAmount, jobAmount) {
    let leveledUp = false
    let jobLeveledUp = false

    // Base Level Logic
    player.exp += baseAmount
    if (player.exp >= player.nextExp) {
        player.lv++
        player.exp -= player.nextExp
        player.nextExp = getNextBaseExp(player.lv)
        
        // 升级奖励：素质点
        player.statPoints += 5 

        // 升级全回复
        recalculateMaxStats()
        player.hp = player.maxHp
        player.sp = player.maxSp
        
        leveledUp = true
    }

    // Job Level Logic
    const currentJobCfg = JobConfig[player.job]
    if (player.jobLv < currentJobCfg.maxJobLv) {
        player.jobExp += jobAmount
        if (player.jobExp >= player.nextJobExp) {
            player.jobLv++
            player.jobExp -= player.nextJobExp
            player.nextJobExp = getNextJobExp(player.jobLv)
            player.skillPoints++ // 获得技能点
            
            jobLeveledUp = true
        }
    }

    return { leveledUp, jobLeveledUp }
}

// --- 加点逻辑 ---
export function increaseStat(stat, amount = 1) {
  const s = stat.toLowerCase()
  const validStats = ['str', 'agi', 'vit', 'int', 'dex', 'luk']
  
  if (!validStats.includes(s)) {
    return { success: false, msg: `未知属性: ${stat}` }
  }
  
  // 检查点数是否足够
  if (player.statPoints < amount) {
    return { success: false, msg: `素质点不足 (剩余: ${player.statPoints})` }
  }
  
  player[s] += amount
  player.statPoints -= amount
  
  // 属性变化可能影响 MaxHP/SP/Atk 等
  recalculateMaxStats()
  
  return { success: true, msg: `${s.toUpperCase()} 提升了 ${amount} 点 (当前: ${player[s]})` }
}

// --- 技能学习逻辑 ---
export function learnSkill(skillId, levels = 1) {
  const skill = Skills[skillId]
  if (!skill) return { success: false, msg: `技能不存在: ${skillId}` }

  // 1. 检查技能点
  if (player.skillPoints < levels) {
    return { success: false, msg: `技能点不足 (剩余: ${player.skillPoints})` }
  }

  // 2. 检查前置条件
  const check = canLearnSkill(player, skillId)
  if (!check.ok) {
    return { success: false, msg: check.msg }
  }

  // 3. 检查等级上限
  const currentLv = player.skills[skillId] || 0
  if (currentLv + levels > skill.maxLv) {
    return { success: false, msg: `${skill.name} 已达上限或超过上限 (Lv.${skill.maxLv})` }
  }

  // 4. 执行升级
  player.skills[skillId] = currentLv + levels
  player.skillPoints -= levels
  
  // 触发保存
  saveGame()

  return { success: true, msg: `Learned skill: ${skill.name} Lv.${player.skills[skillId]}` }
}
