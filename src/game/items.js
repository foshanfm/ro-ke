// src/game/items.js
import { EquipDB } from './equipment'

// 物品类型枚举
export const ItemType = {
  ETC: 'Etc',
  USABLE: 'Usable',
  EQUIP: 'Equip',
  CARD: 'Card'
}

// 全局物品数据库 - 将由 dataLoader 填充
let itemsDB = {}

// 静态物品数据库 (保留作为后备)
const fallbackItemsDB = {
  // --- Usable ---
  501: {
    name: '红色药水',
    type: ItemType.USABLE,
    price: 50,
    desc: '恢复少量 HP (约45点)。',
    effect: (player) => {
      const healAmount = Math.floor(40 + Math.random() * 20)
      const oldHp = player.hp
      player.hp = Math.min(player.maxHp, player.hp + healAmount)
      return { type: 'hp', value: player.hp - oldHp }
    }
  },
  502: {
    name: '橙色药水',
    type: ItemType.USABLE,
    price: 200,
    desc: '中量恢复 HP (约105点)。',
    effect: (player) => {
      const healAmount = Math.floor(90 + Math.random() * 30)
      const oldHp = player.hp
      player.hp = Math.min(player.maxHp, player.hp + healAmount)
      return { type: 'hp', value: player.hp - oldHp }
    }
  },
  503: {
    name: '黄色药水',
    type: ItemType.USABLE,
    price: 550,
    desc: '较大量恢复 HP (约175点)。',
    effect: (player) => {
      const healAmount = Math.floor(150 + Math.random() * 50)
      const oldHp = player.hp
      player.hp = Math.min(player.maxHp, player.hp + healAmount)
      return { type: 'hp', value: player.hp - oldHp }
    }
  },
  504: {
    name: '白色药水',
    type: ItemType.USABLE,
    price: 1200,
    desc: '大量恢复 HP (约400点)。',
    effect: (player) => {
      const healAmount = Math.floor(350 + Math.random() * 100)
      const oldHp = player.hp
      player.hp = Math.min(player.maxHp, player.hp + healAmount)
      return { type: 'hp', value: player.hp - oldHp }
    }
  },
  505: {
    name: '蓝色药水',
    type: ItemType.USABLE,
    price: 5000,
    desc: '恢复少量 SP (约60点)。',
    effect: (player) => {
      const healAmount = Math.floor(50 + Math.random() * 20)
      const oldSp = player.sp
      player.sp = Math.min(player.maxSp, player.sp + healAmount)
      return { type: 'sp', value: player.sp - oldSp }
    }
  },

  // --- Etc ---
  909: { name: '杰勒比结晶', type: ItemType.ETC, price: 3 }, // Jellopy
  938: { name: '粘稠液体', type: ItemType.ETC, price: 4 }, // Sticky Mucus
  519: { name: '三叶草', type: ItemType.ETC, price: 2 }, // Clover
  904: { name: '加勒结晶', type: ItemType.ETC, price: 5 }, // Garlet

  // --- Cards ---
  4001: { name: '波利卡片', type: ItemType.CARD, desc: 'Luk +2' }, // Poring Card
  4002: { name: '绿棉虫卡片', type: ItemType.CARD, desc: 'Vit +1, HP +100' }, // Fabre Card
  4005: { name: '疯兔卡片', type: ItemType.CARD, desc: 'Luk +2, Crit +2' } // Lunatic Card
}

/**
 * 设置物品数据库 (由 dataLoader 调用)
 */
export function setItemsDB(newItemsDB) {
  itemsDB = newItemsDB
  console.log('[Items] 物品数据库已更新')
}

/**
 * 获取物品信息
 */
export function getItemInfo(id) {
  // 1. 先查装备库
  const equip = EquipDB[id]
  if (equip) {
    return { ...equip, type: ItemType.EQUIP }
  }

  // 2. 查询加载的物品库
  if (itemsDB[id]) {
    return itemsDB[id]
  }

  // 3. 查询后备物品库
  if (fallbackItemsDB[id]) {
    return fallbackItemsDB[id]
  }

  // 4. 返回未知物品
  return { name: `未知物品 (${id})`, type: ItemType.ETC }
}

/**
 * 检查物品数据库是否已加载
 */
export function isItemsDBLoaded() {
  return Object.keys(itemsDB).length > 0
}
/**
 * 根据名称获取物品 (模糊查询)
 */
export function getItemByName(name) {
  const cleanName = name.toLowerCase()

  // 1. 查加载库
  for (const item of Object.values(itemsDB)) {
    if (item.name.toLowerCase() === cleanName) return item
  }
  for (const item of Object.values(itemsDB)) {
    if (item.name.toLowerCase().includes(cleanName)) return item
  }

  // 2. 查后备库
  for (const item of Object.values(fallbackItemsDB)) {
    if (item.name.toLowerCase().includes(cleanName)) return item
  }

  // 3. 查装备库
  for (const id in EquipDB) {
    if (EquipDB[id].name.toLowerCase().includes(cleanName)) {
      return { ...EquipDB[id], type: ItemType.EQUIP }
    }
  }

  return null
}
