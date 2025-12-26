// src/game/formulas.js
import { WeaponType } from './equipment'

// --- 素质点消耗 ---
export function getStatPointCost(currentVal) {
    if (currentVal < 11) return 2
    if (currentVal < 21) return 3
    if (currentVal < 31) return 4
    if (currentVal < 41) return 5
    if (currentVal < 51) return 6
    if (currentVal < 61) return 7
    if (currentVal < 71) return 8
    if (currentVal < 81) return 9
    if (currentVal < 91) return 10
    return 11 
}

// --- 基础属性 ---

export function calcMaxHp(baseLv, vit, jobMod) {
    const base = 100 + (baseLv * 10)
    return Math.floor((base + vit * 5) * jobMod)
}

export function calcMaxSp(baseLv, int, jobMod) {
    const base = 20 + (baseLv * 2)
    return Math.floor((base + int * 2) * jobMod)
}

// --- 战斗属性 ---

export function calcAtk(baseLv, str, dex, luk, weaponAtk = 0, masteryAtk = 0) {
    const strBonus = Math.floor(Math.pow(Math.floor(str / 10), 2))
    const statusAtk = Math.floor(baseLv / 4 + str + strBonus + dex / 5 + luk / 3)
    return statusAtk + weaponAtk + masteryAtk
}

export function calcMatk(baseLv, int, dex, luk) {
    const intBonus = Math.floor(Math.pow(Math.floor(int / 10), 2)) 
    const statusMatk = Math.floor(baseLv / 4 + int * 1.5 + intBonus + dex / 5 + luk / 3)
    return statusMatk
}

export function calcDef(baseLv, vit, agi, equipDef = 0) {
    const softDef = Math.floor(vit / 2 + agi / 5 + baseLv / 2)
    return equipDef + softDef
}

export function calcMdef(baseLv, int, vit, dex, equipMdef = 0) {
    const softMdef = Math.floor(int / 2 + vit / 5 + dex / 5 + baseLv / 4)
    return equipMdef + softMdef
}

export function calcHit(baseLv, dex, luk) {
    return 175 + baseLv + dex + Math.floor(luk / 3)
}

export function calcFlee(baseLv, agi, luk, skillBonus = 0) {
    return 100 + baseLv + agi + Math.floor(luk / 5) + skillBonus
}

export function calcCrit(luk, equipCrit = 0) {
    return 1 + Math.floor(luk / 3) + equipCrit
}

// 基础攻速表
const BaseAspdTable = {
    [WeaponType.NONE]: 160,   // 空手
    [WeaponType.DAGGER]: 150, // 短剑
    [WeaponType.SWORD]: 145,  // 单手剑
    [WeaponType.BOW]: 140,    // 弓 (未实装)
    [WeaponType.ROD]: 140     // 杖
}

export function calcAspd(weaponType, agi, dex, jobBonus = 0, equipBonus = 0) {
    // 1. 获取基础攻速
    const base = BaseAspdTable[weaponType] || 150
    
    // 2. 计算属性加成 (削弱 AGI 收益)
    // 旧公式: 150 + 0.8*Agi -> 50 Agi 满速
    // 新公式: Base + (Agi * 0.4) + (Dex * 0.1)
    // 假设空手 160: 需要 75 Agi 才能满速 (190)
    // 假设单手剑 145: 需要 100+ Agi 才能满速
    // 这更符合 99 级满属性的设计
    const statBonus = (agi * 0.4) + (dex * 0.1)
    
    const rawAspd = base + statBonus + jobBonus + equipBonus
    
    // ASPD 上限 190
    return Math.min(190, parseFloat(rawAspd.toFixed(1)))
}

// --- 战斗逻辑辅助 ---

export function calcAspdDelay(aspd) {
    // RO: Delay = (200 - ASPD) * 20
    const delay = (200 - aspd) * 20
    // 限制最低延迟 100ms
    return Math.max(100, delay)
}

export function calcHitRate(attackerHit, defenderFlee) {
    const rate = 80 + (attackerHit - defenderFlee)
    return Math.max(5, Math.min(100, rate))
}
