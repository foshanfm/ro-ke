// src/game/jobs.js

export const JobType = {
    NOVICE: 'NOVICE',
    SWORDMAN: 'SWORDMAN',
    MAGICIAN: 'MAGICIAN',  // 统一为 MAGICIAN 以匹配数据表
    ARCHER: 'ARCHER',
    THIEF: 'THIEF',
    ACOLYTE: 'ACOLYTE'
}

export const JobConfig = {
    [JobType.NOVICE]: {
        id: 0,
        name: '初学者', // Novice
        maxJobLv: 10,
        hpMod: 1.0,
        spMod: 1.0,
        aspdBonus: 0
    },
    [JobType.SWORDMAN]: {
        id: 1,
        name: '剑士', // Swordman
        maxJobLv: 50,
        hpMod: 1.5,
        spMod: 0.8,
        aspdBonus: 2
    },
    [JobType.MAGICIAN]: {
        id: 2,
        name: '法师', // Magician
        maxJobLv: 50,
        hpMod: 0.8,
        spMod: 1.8,
        aspdBonus: 0
    },
    [JobType.ARCHER]: {
        id: 3,
        name: '弓箭手', // Archer
        maxJobLv: 50,
        hpMod: 0.9,
        spMod: 1.0,
        aspdBonus: 5
    },
    [JobType.THIEF]: {
        id: 6,
        name: '盗贼', // Thief
        maxJobLv: 50,
        hpMod: 1.1,
        spMod: 0.9,
        aspdBonus: 10
    },
    [JobType.ACOLYTE]: {
        id: 4,
        name: '服事', // Acolyte
        maxJobLv: 50,
        hpMod: 1.0,
        spMod: 1.5,
        aspdBonus: 0
    }
}

import BaseExpTable from './data/base_exp.json'
import JobExpTable from './data/job_exp.json'

export function getNextBaseExp(lv) {
    if (lv >= 99) return 999999999
    // Table is 0-indexed, but Lv 1 needs exp to reach Lv 2, which is index 0 in our array?
    // Usually Array[0] is Exp for Lv 2.
    // Let's assume input lv is CURRENT level.
    // If table is [50, 100...], index 0 is 50.
    // If I am Lv 1, I need 50 exp to reach Lv 2.
    // So Array[lv - 1] should be correct if array starts with exp for next level.
    // My wrote array: [0, 50, ...] -> Index 1 is 50.
    // If I am Lv 1, I need Array[1] (50).
    return BaseExpTable[lv] || 999999999
}

export function getNextJobExp(lv, jobType = JobType.NOVICE) {
    // Determine which table to use
    let tableToCheck = JobExpTable.NOVICE // Default
    if (jobType === JobType.NOVICE) {
        tableToCheck = JobExpTable.NOVICE
    } else {
        // Assume 1st class for now as we don't have detailed 2nd class logic in this snippet yet
        tableToCheck = JobExpTable['1ST_CLASS']
    }

    // Table format: [10, 18...] (Exp needed for next level)
    // If I am Job Lv 1, I need table[0] (10) to reach Job Lv 2.
    if (lv < 1) return 1
    const idx = lv - 1
    if (idx >= tableToCheck.length) return 999999999
    return tableToCheck[idx]
}
