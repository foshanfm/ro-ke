// src/game/items.js
import { EquipDB } from './equipment'

// 物品类型枚举
export const ItemType = {
  ETC: 'Etc',
  USABLE: 'Usable',
  EQUIP: 'Equip',
  CARD: 'Card'
}

// 静态物品数据库
const itemsDB = {
  // --- Usable ---
  501: { 
      name: '红色药水', 
      type: ItemType.USABLE, 
      price: 50, 
      desc: '恢复少量 HP (约45点)。',
      effect: (player) => {
          // 恢复 30 ~ 60 点 HP
          const healAmount = Math.floor(30 + Math.random() * 30)
          const oldHp = player.hp
          player.hp = Math.min(player.maxHp, player.hp + healAmount)
          return player.hp - oldHp // 返回实际恢复量
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

export function getItemInfo(id) {
  // 1. 先查装备库
  const equip = EquipDB[id]
  if (equip) {
      return { ...equip, type: ItemType.EQUIP }
  }
  
  // 2. 再查普通物品库
  return itemsDB[id] || { name: `未知物品 (${id})`, type: ItemType.ETC }
}
