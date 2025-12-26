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
        name: '初学者', // Novice
        maxJobLv: 10,
        hpMod: 1.0, 
        spMod: 1.0, 
        aspdBonus: 0
    },
    [JobType.SWORDMAN]: {
        name: '剑士', // Swordman
        maxJobLv: 50,
        hpMod: 1.5,
        spMod: 0.8,
        aspdBonus: 2
    },
    [JobType.MAGE]: {
        name: '法师', // Mage
        maxJobLv: 50,
        hpMod: 0.8,
        spMod: 1.8,
        aspdBonus: 0
    },
    [JobType.ARCHER]: {
        name: '弓箭手', // Archer
        maxJobLv: 50,
        hpMod: 0.9,
        spMod: 1.0,
        aspdBonus: 5
    },
    [JobType.THIEF]: {
        name: '盗贼', // Thief
        maxJobLv: 50,
        hpMod: 1.1,
        spMod: 0.9,
        aspdBonus: 10
    },
    [JobType.ACOLYTE]: {
        name: '服事', // Acolyte
        maxJobLv: 50,
        hpMod: 1.0,
        spMod: 1.5,
        aspdBonus: 0
    }
}

export function getNextBaseExp(lv) {
    return Math.floor(100 * Math.pow(1.5, lv - 1))
}

export function getNextJobExp(lv) {
    return Math.floor(50 * Math.pow(1.4, lv - 1))
}
