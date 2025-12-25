// src/game/monsters.js

export const monstersDB = [
    { 
      id: 1001, name: '波利', hp: 50, exp: 5, atk: 2,
      drops: [
        { id: 909, rate: 0.7 },   // 杰勒比结晶 70% (为了测试写高点)
        { id: 938, rate: 0.1 },   // 粘稠液体 10%
        { id: 1202, rate: 0.05 }, // 短刀 5%
        { id: 4001, rate: 0.01 }  // 波利卡片 1% (欧皇检测)
      ]
    },
    { 
      id: 1002, name: '疯兔', hp: 60, exp: 8, atk: 4,
      drops: [
        { id: 519, rate: 0.5 },   // 三叶草 50%
        { id: 904, rate: 0.2 },   // 加勒结晶 20%
        { id: 4005, rate: 0.01 }  // 疯兔卡片 1%
      ]
    },
    { 
      id: 1003, name: '绿棉虫', hp: 80, exp: 12, atk: 3,
      drops: [
        { id: 909, rate: 0.6 }, 
        { id: 4002, rate: 0.01 } 
      ]
    }
  ]
  
  export function spawnMonster() {
    // 随机生成一只怪物 (波利/疯兔/绿棉虫 随机)
    const randomIndex = Math.floor(Math.random() * monstersDB.length)
    const template = monstersDB[randomIndex]
    return {
      ...template,
      maxHp: template.hp
    }
  }