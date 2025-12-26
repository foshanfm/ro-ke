import { reactive, ref } from 'vue'
import { player, saveGame } from './player.js'
import { Skills, SkillType } from './skills.js'
import { calculateDamageFlow } from './formulas.js'
import { EquipType, WeaponType } from './equipment.js'
import { EquipDB } from './equipment.js'

// --- 引擎状态 ---
export const skillState = reactive({
    isCasting: false,
    castEndTime: 0,
    castTotalTime: 0,
    currentSkillId: null,
    target: null
})

// --- 辅助：获取武器类型 ---
function getPlayerWeaponType() {
    const wId = player.equipment[EquipType.WEAPON]
    if (!wId) return WeaponType.NONE
    const w = EquipDB[wId]
    return w ? w.subType : WeaponType.NONE
}

// --- 核心：主动技能释放 ---
export async function castSkill(skillId, target, logFn) {
    const skill = Skills[skillId]
    if (!skill) return { success: false, msg: '未知技能' }

    // 1. 基础校验 (等级、SP)
    const lv = player.skills[skillId] || 0
    if (lv <= 0) return { success: false, msg: '未学习该技能' }

    // SP 检查
    let spCost = 0
    if (typeof skill.spCost === 'function') {
        spCost = skill.spCost(lv)
    } else if (typeof skill.spCost === 'number') {
        spCost = skill.spCost
    }

    if (player.sp < spCost) {
        return { success: false, msg: 'SP 不足' }
    }

    // 2. 咏唱逻辑 (Cast Time)
    // 假设 Skills 定义里有 castTime(lv)，没有则为瞬发
    let castTime = 0
    if (skill.castTime) {
        castTime = typeof skill.castTime === 'function' ? skill.castTime(lv) : skill.castTime
    }

    if (castTime > 0) {
        skillState.isCasting = true
        skillState.castTotalTime = castTime
        skillState.castEndTime = Date.now() + castTime
        skillState.currentSkillId = skillId
        skillState.target = target
        
        logFn(`正在咏唱 ${skill.name}...`, 'info')
        
        // 简单的异步等待模拟咏唱
        await new Promise(resolve => setTimeout(resolve, castTime))
        
        // 咏唱结束检查 (这里可以加被打断逻辑)
        skillState.isCasting = false
        skillState.currentSkillId = null
    }

    // 再次检查 SP (防止咏唱期间 SP 变化)
    if (player.sp < spCost) return { success: false, msg: 'SP 不足' }

    // 3. 扣除消耗
    player.sp -= spCost

    // 4. 执行效果
    let damage = 0
    let resultLog = ''
    let resultType = 'default'

    // 物理伤害技能通用逻辑
    if (skill.dmgMod) {
        const mod = typeof skill.dmgMod === 'function' ? skill.dmgMod(lv) : skill.dmgMod
        
        // 调用公式计算基础伤害
        // 注意：这里我们模拟一次必定命中的攻击，或者带命中判定的攻击
        // 大部分物理技能需要算命中 (Bash), 魔法技能通常必中 (Bolt)
        // 这里暂时复用 calculateDamageFlow，但传入技能倍率
        
        const res = calculateDamageFlow({
            attackerAtk: player.atk,
            attackerHit: player.hit + (skill.hitBonus || 0), // 部分技能增加命中
            attackerCrit: 0, // 技能通常不暴击 (除非特定)
            defenderDef: target.def || 0,
            defenderFlee: target.flee || 1,
            isPlayerAttacking: true
        })

        if (res.type === 'miss') {
            resultLog = `${skill.name} 未命中 ${target.name}!`
            resultType = 'dim'
        } else {
            // 应用技能倍率
            damage = Math.floor(res.damage * mod)
            
            // 属性修正 (未来扩展)
            
            target.hp -= damage
            resultLog = `${skill.name}!! 对 ${target.name} 造成 ${damage} 点伤害!`
            resultType = 'warning'
        }
    } 
    // Buff 技能逻辑 (如 Heal, Blessing)
    else if (skill.type === SkillType.BUFF || skill.type === SkillType.HEAL) {
        // ... 待实现
        resultLog = `使用了 ${skill.name}`
    }

    saveGame()
    
    if (damage > 0) {
        return { success: true, msg: resultLog, damage, type: resultType }
    } else {
        return { success: true, msg: resultLog, type: resultType }
    }
}

// --- 核心：被动技能处理器 ---
// 在 Combat Loop 的关键节点调用
export const PassiveHooks = {
    // 攻击前触发：返回 { damageMod: number, extraHit: number, log: string }
    onNormalAttack(target) {
        const result = {
            damageMod: 1.0,
            extraHitCount: 0, // 0表示无额外攻击，1表示二连击
            logs: []
        }

        // --- 1. 处理二刀连击 (Double Attack) ---
        const daLv = player.skills['double_attack'] || 0
        if (daLv > 0) {
            // 限制：必须装备短剑 (Dagger)
            // 暂时没有严格的 Dagger 判断，假设所有武器或徒手都生效，或者在这里加判断
            // const wType = getPlayerWeaponType()
            // if (wType === WeaponType.DAGGER) { ... }
            
            // 这里的 chance 定义在 skills.js: (lv) => lv * 5
            const chance = Skills['double_attack'].chance(daLv)
            
            if (Math.random() * 100 < chance) {
                result.damageMod = 2.0 // 简单处理：双倍伤害
                result.logs.push({ msg: 'Double Attack!!', type: 'warning' })
            }
        }

        return result
    }
}
