// src/game/jobs.js

export const JobType = {
    NOVICE: 'Novice',
    SWORDMAN: 'Swordman',
    MAGE: 'Mage',
    ARCHER: 'Archer',
    THIEF: 'Thief',
    ACOLYTE: 'Acolyte'
}
  
export const JobConfig = {
    [JobType.NOVICE]: {
        name: 'Novice',
        maxJobLv: 10,
        hpMod: 1.0, // HP 系数
        spMod: 1.0, // SP 系数
        aspdBonus: 0
    },
    [JobType.SWORDMAN]: {
        name: 'Swordman',
        maxJobLv: 50,
        hpMod: 1.5,
        spMod: 0.8,
        aspdBonus: 2
    },
    [JobType.MAGE]: {
        name: 'Mage',
        maxJobLv: 50,
        hpMod: 0.8,
        spMod: 1.8,
        aspdBonus: 0
    },
    [JobType.ARCHER]: {
        name: 'Archer',
        maxJobLv: 50,
        hpMod: 0.9,
        spMod: 1.0,
        aspdBonus: 5
    },
    [JobType.THIEF]: {
        name: 'Thief',
        maxJobLv: 50,
        hpMod: 1.1,
        spMod: 0.9,
        aspdBonus: 10
    },
    [JobType.ACOLYTE]: {
        name: 'Acolyte',
        maxJobLv: 50,
        hpMod: 1.0,
        spMod: 1.5,
        aspdBonus: 0
    }
}

// 简单的经验曲线公式
export function getNextBaseExp(lv) {
    // 简单的指数增长: 100 * (1.5 ^ (lv - 1))
    return Math.floor(100 * Math.pow(1.5, lv - 1))
}

export function getNextJobExp(lv) {
    // Job 经验通常比 Base 少一点，但也指数增长
    return Math.floor(50 * Math.pow(1.4, lv - 1))
}
