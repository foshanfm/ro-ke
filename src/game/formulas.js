// src/game/formulas.js
import { WeaponType } from './equipment'

// ... (之前的属性计算保持不变) ...
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

export function calcHitRate(attackerHit, defenderFlee) {
    const rate = 80 + (attackerHit - defenderFlee)
    return Math.max(5, Math.min(100, rate))
}

// --- 新增：伤害计算核心 (纯函数，方便模拟器调用) ---

export function resolvePlayerDamage(playerAtk, playerCrit, playerDex, targetDef, targetFlee) {
    // 1. 判定暴击
    const isCrit = Math.random() * 100 < playerCrit
    let isHit = false
    
    if (isCrit) {
        isHit = true
    } else {
        // 2. 判定命中
        // 玩家命中判定：如果 Dex 极低，可能有浮动？暂忽略
        const hitRate = calcHitRate(100, targetFlee) // 这里的 playerHit 传入逻辑在外部处理
        // 注意：外部调用时应该把 player.hit 传进来，这里简化了参数，修正如下
        // 我们需要传入 playerHit
    }
    
    // 重新设计函数签名以更通用
    return { damage: 0, isHit: false, isCrit: false, type: 'miss' }
}

// 更好的设计：分别计算 Player vs Monster 和 Monster vs Player
// 返回结果结构: { damage: number, type: 'hit'|'crit'|'miss'|'double' }

export function calculateDamageFlow({
    attackerAtk, attackerHit, attackerCrit, 
    defenderDef, defenderFlee, 
    isPlayerAttacking = true // 用于区分行为 (如玩家有双刀)
}) {
    // 1. 暴击判定 (仅玩家有暴击，怪物暂无暴击)
    const isCrit = isPlayerAttacking ? (Math.random() * 100 < attackerCrit) : false
    
    if (isCrit) {
        // 暴击：1.4倍伤害，无视防御
        const variance = (Math.random() * 0.2) + 0.9 // 0.9~1.1 浮动
        const rawDamage = Math.floor(attackerAtk * variance)
        const finalDamage = Math.floor(rawDamage * 1.4)
        return { damage: finalDamage, type: 'crit' }
    }

    // 2. 命中判定
    const hitRate = calcHitRate(attackerHit, defenderFlee)
    const isHit = Math.random() * 100 < hitRate

    if (!isHit) {
        return { damage: 0, type: 'miss' }
    }

    // 3. 普通伤害计算
    const variance = (Math.random() * 0.2) + 0.9
    let damage = Math.floor(attackerAtk * variance)
    
    // 减防 (简单减算)
    damage = Math.max(1, damage - defenderDef)
    
    return { damage, type: 'hit' }
}
