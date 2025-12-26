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

export function calcMoveSpeed(agi, jobBonus = 0, equipBonus = 0) {
    // 基础速度: 5
    // Agi加成: 每10点Agi + 0.5 (即 Agi * 0.05)
    // 上限可以设定一个值，比如 20
    const base = 5
    const agiBonus = agi * 0.05
    return parseFloat((base + agiBonus + jobBonus + equipBonus).toFixed(2))
}

const BaseAspdTable = {
    [WeaponType.NONE]: 160,   
    [WeaponType.DAGGER]: 150, 
    [WeaponType.SWORD]: 145,  
    [WeaponType.BOW]: 140,    
    [WeaponType.ROD]: 140     
}

export function calcAspd(weaponType, agi, dex, jobBonus = 0, equipBonus = 0) {
    const base = BaseAspdTable[weaponType] || 150
    const statBonus = (agi * 0.4) + (dex * 0.1)
    const rawAspd = base + statBonus + jobBonus + equipBonus
    return Math.min(190, parseFloat(rawAspd.toFixed(1)))
}

export function calcAspdDelay(aspd) {
    const delay = (200 - aspd) * 20
    return Math.max(100, delay)
}

// --- 核心战斗逻辑 (Behavioral Correctness Template) ---

export function calculateDamageFlow({
    attackerAtk, attackerHit, attackerCrit, 
    defenderDef, defenderFlee, defenderLuk = 1,
    isPlayerAttacking = true 
}) {
    // 1. 暴击判定 (Crit - TargetLuk)
    // 暴击率限制: 1% ~ 50% (玩家)
    // 怪物暂无暴击，或者给予固定低暴击
    let critChance = attackerCrit - defenderLuk
    critChance = Math.max(1, Math.min(50, critChance))
    
    // 怪物攻击时不暴击 (或者以后加)
    const isCrit = isPlayerAttacking ? (Math.random() * 100 < critChance) : false
    
    if (isCrit) {
        // 暴击：1.4倍伤害，无视防御
        // 浮动: 0.9 ~ 1.1
        const variance = (Math.random() * 0.2) + 0.9 
        const rawDamage = Math.floor(attackerAtk * variance)
        const finalDamage = Math.floor(rawDamage * 1.4)
        return { damage: Math.max(1, finalDamage), type: 'crit' }
    }

    // 2. 命中判定 (Hit - Flee + 80)
    // 命中率限制: 5% ~ 95%
    let hitChance = attackerHit - defenderFlee + 80
    hitChance = Math.max(5, Math.min(95, hitChance))
    
    const isHit = Math.random() * 100 < hitChance

    if (!isHit) {
        return { damage: 0, type: 'miss' }
    }

    // 3. 普通伤害计算 ( (Atk - Def) * Variance )
    const variance = (Math.random() * 0.2) + 0.9
    let damage = Math.floor((attackerAtk - defenderDef) * variance)
    
    return { damage: Math.max(1, damage), type: 'hit' }
}
