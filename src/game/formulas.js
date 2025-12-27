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

/**
 * 计算最大 HP (支持 RO 数据库)
 * @param {number} baseLv 等级
 * @param {number} vit VIT 素质点
 * @param {Array} hpTable 基础 HP 表 (可选)
 * @param {number} hpMulti HPMultiplicator (可选, 默认 500)
 */
export function calcMaxHp(baseLv, vit, jobModOrTable, hpMulti = 500) {
    let base = 0
    if (Array.isArray(jobModOrTable)) {
        // 使用数据库表
        base = jobModOrTable[baseLv - 1] || (100 + baseLv * 10)
    } else {
        // 后向兼容: 使用旧的简易公式 (jobModOrTable 为 jobMod)
        const jobMod = jobModOrTable || 1.0
        base = (100 + (baseLv * 10)) * jobMod
    }

    // VIT 加成 (1% per VIT)
    const vitBonus = 1 + (vit * 0.01)
    // Multiplicator (官方标准 500 为 100%)
    const multiBonus = hpMulti / 500

    return Math.floor(base * vitBonus * multiBonus)
}

/**
 * 计算最大 SP (支持 RO 数据库)
 * @param {number} baseLv 等级
 * @param {number} int INT 素质点
 * @param {Array} spTable 基础 SP 表 (可选)
 */
export function calcMaxSp(baseLv, int, jobModOrTable) {
    let base = 0
    if (Array.isArray(jobModOrTable)) {
        // 使用数据库表
        base = jobModOrTable[baseLv - 1] || (20 + baseLv * 2)
    } else {
        // 后向兼容
        const jobMod = jobModOrTable || 1.0
        base = (20 + (baseLv * 2)) * jobMod
    }

    // INT 加成 (1% per INT)
    const intBonus = 1 + (int * 0.01)

    return Math.floor(base * intBonus)
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
    return baseLv + dex + Math.floor(luk / 3)
}

export function calcFlee(baseLv, agi, luk, skillBonus = 0) {
    return baseLv + agi + Math.floor(luk / 5) + skillBonus
}

export function calcCrit(luk, equipCrit = 0) {
    return 1 + Math.floor(luk / 3) + equipCrit
}

/**
 * 计算移动速度 (RO 标准: 150 为 100%, 数值越小越快)
 * @param {number} roSpeed - RO 原始速度值 (如 150, 112, 200)
 * @param {number} cellSize - 每个格子的像素 (默认 20)
 * @param {number} tickMs - 游戏循环的毫秒数 (默认 100, 即战斗 AI 的间隔)
 * @returns {number} 最终每 tick 移动的像素数
 */
export function calcMoveSpeed(roSpeed, cellSize = 10, tickMs = 100) {
    // 逻辑：每毫秒走 (cellSize / roSpeed) 像素
    // 每一 tick 走 (cellSize / roSpeed) * tickMs 像素
    const pixelsPerTick = (cellSize / roSpeed) * tickMs
    return parseFloat(pixelsPerTick.toFixed(2))
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

/**
 * 计算等级差导致的经验/掉率惩罚 (Renewal)
 * @param {number} playerLv 玩家等级
 * @param {number} monsterLv 怪物等级
 * @returns {number} 收益倍率 (1.0 = 100%)
 */
export function calcLevelDiffRate(playerLv, monsterLv) {
    const diff = monsterLv - playerLv

    // 怪物等级远高于玩家 (越级打怪惩罚)
    if (diff >= 15) return 0.40  // 15级以上：40%
    if (diff >= 10) return 1.40  // 10-14级：140% (高风险高回报)
    if (diff >= 3) return 1.15  // 3-9级：115%

    // 等级相仿 (正常收益区)
    if (diff >= -5) return 1.00  // -5 到 +2 级：100%

    // 玩家等级远高于怪物 (割草惩罚)
    if (diff >= -10) return 0.95 // 低 6-10级：95%
    if (diff >= -15) return 0.90 // 低 11-15级：90%
    if (diff >= -30) return 0.35 // 低 21-30级：35%
    return 0.10                  // 低 31级以上：10%
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
    // Apply damage variance (RO standard: ±5% for dynamic combat)
    let baseDmg = attackerAtk
    const variance = 0.95 + Math.random() * 0.1 // 95% to 105%
    baseDmg = Math.floor(baseDmg * variance)

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
