// src/game/items.js

// 物品类型定义
export const ItemType = {
    ETC: 'etc',     // 杂物 (卖钱/任务)
    USABLE: 'use',  // 消耗品 (药水/翅膀)
    EQUIP: 'equip', // 装备 (武器/防具)
    CARD: 'card'    // 卡片 (核心)
  }
  
  // 物品总表 (ID建议参考RO原版，方便以后扩展)
  export const itemsDB = {
    // --- 杂物 ---
    909: { name: '杰勒比结晶 (Jellopy)', type: ItemType.ETC, price: 3 },
    904: { name: '加勒结晶 (Garlet)', type: ItemType.ETC, price: 5 },
    938: { name: '粘稠液体 (Sticky Mucus)', type: ItemType.ETC, price: 6 },
    519: { name: '三叶草 (Clover)', type: ItemType.ETC, price: 2 },
    
    // --- 消耗品 ---
    501: { name: '红色药水 (Red Potion)', type: ItemType.USABLE, price: 50 },
    
    // --- 装备 ---
    1202: { name: '短刀 (Knife)', type: ItemType.EQUIP, price: 50 },
    
    // --- 卡片 (大奖) ---
    4001: { name: '波利卡片 (Poring Card)', type: ItemType.CARD, price: 10 },
    4002: { name: '绿棉虫卡片 (Fabre Card)', type: ItemType.CARD, price: 10 },
    4005: { name: '疯兔卡片 (Lunatic Card)', type: ItemType.CARD, price: 10 }
  }
  
  // 获取物品信息的辅助函数
  export function getItemInfo(id) {
    return itemsDB[id] || { name: 'Unknown Item', type: ItemType.ETC, price: 0 }
  }