// src/game/monsters.js
import { Maps } from './maps' // 引入地图数据

// 怪物数据库 (Lv 1 - 10)
export const monstersDB = [
    { 
      id: 1001, name: '波利', lv: 1, hp: 50, exp: 2, jobExp: 1, 
      atk: 8, def: 0, hit: 10, flee: 1, attackDelay: 2000,
      drops: [
        { id: 909, rate: 0.7 },   // 杰勒比结晶
        { id: 1201, rate: 0.01 }, // 短剑
        { id: 501, rate: 0.05 },  // 红色药水
        { id: 4001, rate: 0.001 } // 波利卡片
      ]
    },
    { 
      id: 1002, name: '绿棉虫', lv: 2, hp: 63, exp: 3, jobExp: 2, 
      atk: 10, def: 0, hit: 15, flee: 3, attackDelay: 1800,
      drops: [
        { id: 909, rate: 0.6 },   // 杰勒比结晶
        { id: 519, rate: 0.1 },   // 三叶草
        { id: 1201, rate: 0.02 }, // 短剑
        { id: 4002, rate: 0.001 } // 绿棉虫卡片
      ]
    },
    { 
      id: 1003, name: '虫蛹', lv: 2, hp: 300, exp: 4, jobExp: 3, 
      atk: 0, def: 5, hit: 10, flee: 0, attackDelay: 9999, // 不攻击
      drops: [
         { id: 909, rate: 0.5 },
         { id: 938, rate: 0.4 }    // 粘稠液体
      ]
    },
    { 
      id: 1004, name: '疯兔', lv: 3, hp: 60, exp: 5, jobExp: 3, 
      atk: 15, def: 0, hit: 20, flee: 10, attackDelay: 1500,
      drops: [
        { id: 519, rate: 0.5 },   // 三叶草
        { id: 904, rate: 0.2 },   // 加勒结晶
        { id: 4005, rate: 0.001 } // 疯兔卡片
      ]
    },
    {
      id: 1005, name: '小鸡', lv: 4, hp: 75, exp: 7, jobExp: 4, 
      atk: 20, def: 1, hit: 25, flee: 15, attackDelay: 1200, // 较快
      drops: [
        { id: 909, rate: 0.4 },
        { id: 501, rate: 0.1 },   // 红色药水
        { id: 2301, rate: 0.05 }  // 棉衬衫
      ]
    },
    {
      id: 1006, name: '苍蝇', lv: 5, hp: 46, exp: 9, jobExp: 5,
      atk: 22, def: 0, hit: 35, flee: 35, attackDelay: 1000, // 很快，高闪避
      drops: [
        { id: 909, rate: 0.5 },
        { id: 904, rate: 0.1 }
      ]
    },
    {
      id: 1007, name: '树木精', lv: 6, hp: 110, exp: 12, jobExp: 7,
      atk: 25, def: 2, hit: 30, flee: 5, attackDelay: 2200, // 血厚，慢
      drops: [
          { id: 938, rate: 0.5 }, // 树脂(粘稠液体代替)
          { id: 2301, rate: 0.02 } // 偶尔掉衣服
      ]
    },
    {
      id: 1008, name: '小野猪', lv: 7, hp: 132, exp: 15, jobExp: 9,
      atk: 28, def: 3, hit: 32, flee: 12, attackDelay: 1800,
      drops: [
          { id: 501, rate: 0.2 } // 掉红药
      ]
    },
    {
      id: 1009, name: '秃鹰', lv: 8, hp: 95, exp: 18, jobExp: 11,
      atk: 30, def: 0, hit: 45, flee: 40, attackDelay: 1300, // 高闪避
      drops: [
          { id: 904, rate: 0.3 }
      ]
    },
    {
      id: 1010, name: '盗虫', lv: 9, hp: 104, exp: 20, jobExp: 13,
      atk: 35, def: 2, hit: 50, flee: 30, attackDelay: 1100, // 攻守兼备
      drops: [
          { id: 909, rate: 0.5 }
      ]
    },
    {
      id: 1011, name: '大嘴鸟蛋', lv: 10, hp: 480, exp: 25, jobExp: 15,
      atk: 0, def: 0, hit: 10, flee: 0, attackDelay: 9999, // 打桩练习
      drops: []
    }
  ]
  
  export function spawnMonster(mapId) {
    // 1. 获取地图配置
    const map = Maps[mapId] || Maps['prt_fild08']
    
    // 2. 根据权重随机选择怪物
    // 算法：累加权重，生成 0~1 随机数，看落在哪个区间
    // 注意：Maps里的 rate 总和可能不一定是 1，所以我们先算总权重
    let totalRate = 0
    map.monsters.forEach(m => totalRate += m.rate)
    
    const rng = Math.random() * totalRate
    let currentRate = 0
    let targetId = map.monsters[0].id
    
    for (const m of map.monsters) {
        currentRate += m.rate
        if (rng <= currentRate) {
            targetId = m.id
            break
        }
    }
    
    // 3. 从数据库查找怪物模板
    const template = monstersDB.find(m => m.id === targetId) || monstersDB[0]
    
    // 4. 返回实例
    return {
      ...template,
      maxHp: template.hp
    }
  }