import { reactive } from 'vue'

// 默认初始数据
const defaultStats = {
  name: 'Novice',
  lv: 1,
  job: 'Novice',
  hp: 100,
  maxHp: 100,
  sp: 20,
  maxSp: 20,
  atk: 10,
  str: 1,
  agi: 1,
  dex: 1, // 增加 dex 属性
  vit: 1,
  int: 1,
  luk: 1,
  exp: 0,
  nextExp: 100,
  inventory: [] // 确保默认有 inventory
}

export const player = reactive({ ...defaultStats })

// --- 存档功能 ---
const SAVE_KEY = 'ro_ke_save_v1'

export function saveGame() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(player))
}

export function loadGame() {
    const savedData = localStorage.getItem(SAVE_KEY)
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData)
        Object.assign(player, parsed)
        
        // --- 修复补丁：如果存档里缺了 inventory，就补上 ---
        if (!player.inventory) {
          player.inventory = []
        }
        
        // 确保所有基础属性存在 (兼容旧存档)
        const keys = ['str', 'agi', 'dex', 'vit', 'int', 'luk']
        keys.forEach(k => {
            if (player[k] === undefined) player[k] = 1
        })

        console.log('[System] Save loaded successfully.')
        return true
      } catch (e) {
        console.error('[System] Save file corrupted, resetting.')
        return false
      }
    }
    return false
  }


export function resetGame() {
  Object.assign(player, defaultStats)
  saveGame()
}

export function addItem(itemId, count = 1) {
    if (!player.inventory) player.inventory = []

    // 1. 查找背包里是否已有该物品
    const existingItem = player.inventory.find(i => i.id === itemId)
    
    if (existingItem) {
      // 2. 如果有，数量 + count
      existingItem.count += count
    } else {
      // 3. 如果没有，push 新对象
      // 注意：这里只存 ID 和 Count，不存 Name，节省存档空间
      player.inventory.push({ id: itemId, count: count })
    }
    
    // 触发保存
    saveGame()
  }

export function addExp(amount) {
    player.exp += amount
    if (player.exp >= player.nextExp) {
        player.lv++
        player.exp -= player.nextExp
        player.nextExp = Math.floor(player.nextExp * 1.5) // 简单升级曲线
        
        // 升级恢复满状态
        player.maxHp += 10 + player.vit * 2
        player.hp = player.maxHp
        player.sp = player.maxSp // 暂未实装 int 影响
        
        return true // 返回 true 表示升级了
    }
    return false
}
