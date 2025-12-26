// src/game/formulas.js
import { WeaponType } from './equipment'
import { aspdCalculator } from './modules/aspd'

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

/**
 * 计算 ASPD (使用新的复杂计算模块)
 * @param {string} jobType - 职业类型 (如 'NOVICE', 'SWORDMAN')
 * @param {string} weaponType - 武器类型 (如 'SWORD', 'DAGGER')
 * @param {boolean} hasShield - 是否装备盾牌
 * @param {number} agi - AGI 素质点 (包含装备加成)
 * @param {number} dex - DEX 素质点 (包含装备加成)
 * @param {Object} modifiers - 修正值对象
 * @param {number} modifiers.potionRate - 药水攻速加成百分比
 * @param {number} modifiers.skillRate - 技能攻速加成百分比
 * @param {number} modifiers.equipRate - 装备攻速加成百分比
 * @param {number} modifiers.flatBonus - 固定攻速加成
 * @returns {number} 最终 ASPD 数值
 */
export function calcAspd(jobType, weaponType, hasShield, agi, dex, modifiers = {}) {
    return aspdCalculator.calculate({
        jobType,
        weaponType,
        hasShield,
        agi,
        dex,
        potionRate: modifiers.potionRate || 0,
        skillRate: modifiers.skillRate || 0,
        equipRate: modifiers.equipRate || 0,
        flatBonus: modifiers.flatBonus || 0
    })
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
    // 1. 命中判定 (RO 经典公式: 80 + AttackerHit - DefenderFlee)
    const chance = 80 + attackerHit - defenderFlee
    const hitRate = Math.max(5, Math.min(100, chance)) // 至少 5% 命中，至多 100%

    const isHit = Math.random() * 100 <= hitRate

    if (!isHit) {
        return { damage: 0, type: 'miss' }
    }

    // 2. 暴击判定 (暴击无视回避，这里假设暴击受防御减免，倍率为 1.4)
    // 注意：根据用户需求，这里不再扣除 DefenderLuk
    const isCrit = Math.random() * 100 <= attackerCrit

    // 3. 基础伤害计算
    let baseDmg = attackerAtk
    if (isCrit) {
        baseDmg = Math.floor(baseDmg * 1.4)
    }

    // 4. 防御减免 (Renewal 公式: Damage * (600 / (600 + DEF)))
    const defReduction = 600 / (600 + defenderDef)
    const finalDamage = Math.max(1, Math.floor(baseDmg * defReduction))

    return {
        damage: finalDamage,
        type: isCrit ? 'crit' : 'hit',
        hitRate: hitRate
    }
}
