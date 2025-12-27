// src/game/items.js
import { EquipDB } from './equipment'

// 物品类型枚举
export const ItemType = {
  ETC: 'Etc',
  USABLE: 'Usable',
  EQUIP: 'Equip',
  CARD: 'Card',
  AMMO: 'Ammo'
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
  4005: { name: '疯兔卡片', type: ItemType.CARD, desc: 'Luk +2, Crit +2' }, // Lunatic Card

  // --- Ammo ---
  1750: { name: '箭矢', type: ItemType.AMMO, subType: 'Ammo', atk: 25, price: 1, weight: 0.1, desc: '一般的箭矢。' }
}

/**
 * 注入运行时效果 (如药水恢复逻辑)
 * 因为函数无法存储在 IndexedDB,所以必须在加载后动态注入
 */
function injectRuntimeEffects(db) {
  Object.values(db).forEach(item => {
    // 适配结构化数据 (来自 compiled/items.json)
    if (item.type === 'Usable' && item.effects) {
      item.effects.forEach(eff => {
        if (eff.type === 'heal') {
          item.effect = (player) => {
            let hpHeal = 0
            if (Array.isArray(eff.hp)) {
              hpHeal = Math.floor(eff.hp[0] + Math.random() * (eff.hp[1] - eff.hp[0] + 1))
            } else {
              hpHeal = eff.hp
            }

            const oldHp = player.hp
            player.hp = Math.min(player.maxHp, player.hp + hpHeal)
            return { type: 'hp', value: player.hp - oldHp }
          }
        }
      })
    }
  })
}

/**
 * 设置物品数据库 (由 DataManager 调用)
 */
export function setItemsDB(newItemsDB) {
  // 克隆一份数据，避免修改缓存中的原始数据
  itemsDB = JSON.parse(JSON.stringify(newItemsDB))
  injectRuntimeEffects(itemsDB)
  console.log('[Items] 物品数据库已更新并注入运行时效果')
}

/**
 * 获取物品信息
 */
export function getItemInfo(id) {
  // 1. 获取基础数据 (从加载的 DB 或 后备库)
  const base = itemsDB[id] || fallbackItemsDB[id] || {}

  // 2. 获取装备数据
  const equip = EquipDB[id] || {}

  // 3. 合并数据 (装备数据优先级更高，以保留 JS 中定义的特殊描述或逻辑)
  const merged = { ...base, ...equip }

  // 4. 如果完全没有数据，返回未知物品
  if (Object.keys(merged).length === 0) {
    return { name: `未知物品 (${id})`, type: ItemType.ETC, buyPrice: 0, sellPrice: 0 }
  }

  // 5. 归一化价格
  let buyPrice = 0
  let sellPrice = 0

  if (merged.price && typeof merged.price === 'object') {
    buyPrice = merged.price.buy || 0
    sellPrice = merged.price.sell || 0
  } else {
    buyPrice = merged.buyPrice || merged.price || 0
    sellPrice = merged.sellPrice || Math.floor(buyPrice / 2)
  }

  // 6. 确定最终类型
  let finalType = merged.type || ItemType.ETC
  if (EquipDB[id]) finalType = ItemType.EQUIP
  // Special case: Ammo is technically equipment in some DBs but we handle it as Ammo type
  if (merged.subType === 'Ammo' || merged.type === 'Ammo') finalType = ItemType.AMMO

  return {
    ...merged,
    type: finalType,
    buyPrice,
    sellPrice
  }
}

/**
 * 获取装备的动态名称 (包含插卡前缀)
 * @param {Object} instance 装备实例 { id, cards: [] }
 */
export function getEquippableName(instance) {
  if (!instance) return ''
  const baseInfo = getItemInfo(instance.id)
  if (!baseInfo) return '未知装备'

  if (instance.cards && instance.cards.length > 0) {
    const validCards = instance.cards.filter(id => id !== null)
    if (validCards.length === 0) return baseInfo.name

    // 统计前缀和后缀，并将它们分类
    const activePrefixes = []
    const activeSuffixes = []

    // RO 规则：如果是同一类卡片（同前缀或同后缀），显示倍数。
    // 如果是混合卡片，取最后一张有效卡片的面值。

    // 我们先看是否有统一的倍数前缀/后缀
    const prefixes = []
    const suffixes = []
    validCards.forEach(cardId => {
      const cardInfo = getItemInfo(cardId)
      if (cardInfo) {
        if (cardInfo.isPostfix && cardInfo.prefix) suffixes.push(cardInfo.prefix)
        else if (cardInfo.prefix) prefixes.push(cardInfo.prefix)
      }
    })

    // 倍数逻辑：2:Double, 3:Triple, 4:Quadruple
    const multipliers = { 2: 'Double', 3: 'Triple', 4: 'Quadruple' }

    let finalPrefix = ''
    let finalSuffix = ''

    // 处理前缀倍数
    if (prefixes.length > 0) {
      const unique = [...new Set(prefixes)]
      if (unique.length === 1 && prefixes.length > 1) {
        finalPrefix = (multipliers[prefixes.length] || '') + ' ' + unique[0]
      } else {
        // 混合前缀取最后一张带前缀卡片的前缀
        for (let i = instance.cards.length - 1; i >= 0; i--) {
          const cInfo = getItemInfo(instance.cards[i])
          if (cInfo && cInfo.prefix && !cInfo.isPostfix) {
            finalPrefix = cInfo.prefix
            break
          }
        }
      }
    }

    // 处理后缀倍数 (虽然 RO 很少见后缀倍数，但逻辑上保持一致)
    if (suffixes.length > 0) {
      const unique = [...new Set(suffixes)]
      if (unique.length === 1 && suffixes.length > 1) {
        finalSuffix = (multipliers[suffixes.length] || '') + ' ' + unique[0]
      } else {
        // 混合后缀取最后一张带后缀卡片的后缀
        for (let i = instance.cards.length - 1; i >= 0; i--) {
          const cInfo = getItemInfo(instance.cards[i])
          if (cInfo && cInfo.prefix && cInfo.isPostfix) {
            finalSuffix = cInfo.prefix
            break
          }
        }
      }
    }

    let fullName = baseInfo.name
    if (finalPrefix) fullName = finalPrefix.trim() + ' ' + fullName
    if (finalSuffix) fullName = fullName + ' ' + finalSuffix.trim()

    return fullName.trim()
  }

  return baseInfo.name
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
