// src/game/skills.js
import { JobType } from './jobs'

export const SkillType = {
  PASSIVE: 'Passive',
  ACTIVE: 'Active',
  BUFF: 'Buff'
}

export const Skills = {
  // --- Novice Skills ---
  'basic_skill': {
    id: 'basic_skill',
    name: 'Basic Skill',
    type: SkillType.PASSIVE,
    maxLv: 9,
    desc: '基础技能，允许交易、表情和坐下。',
    req: { job: JobType.NOVICE, jobLv: 1 }
  },

  // --- Swordman Skills ---
  'bash': {
    id: 'bash',
    name: 'Bash',
    type: SkillType.ACTIVE,
    maxLv: 10,
    spCost: (lv) => 8, // 简易固定消耗，RO原版是变动的
    // 伤害倍率: 130% + Lv * 30% -> Lv10 = 430%
    dmgMod: (lv) => 1.0 + (lv * 0.33), 
    desc: '狂击：对敌人造成强力物理伤害。',
    req: { job: JobType.SWORDMAN, jobLv: 1 }
  },
  'hp_recovery': {
    id: 'hp_recovery',
    name: 'Increase HP Recovery',
    type: SkillType.PASSIVE,
    maxLv: 10,
    // 每 10 秒回复: 5 + (Lv * 3) + (MaxHP * 0.002 * Lv) -> 简化版
    desc: '快速回复：增加站立时的 HP 回复速度。',
    req: { job: JobType.SWORDMAN, jobLv: 1 }
  },
  'magnum_break': {
    id: 'magnum_break',
    name: 'Magnum Break',
    type: SkillType.ACTIVE,
    maxLv: 10,
    spCost: (lv) => 30,
    dmgMod: (lv) => 1.0 + (lv * 0.2), // 范围伤害通常低一点
    desc: '怒爆：消耗 HP 造成火属性范围伤害。',
    req: { job: JobType.SWORDMAN, skills: { 'bash': 5 } } // 前置技能: Bash Lv5
  },

  // --- Thief Skills ---
  'double_attack': {
    id: 'double_attack',
    name: 'Double Attack',
    type: SkillType.PASSIVE,
    maxLv: 10,
    // 触发几率: Lv * 5% -> Lv10 = 50%
    chance: (lv) => lv * 5,
    desc: '二刀连击：使用短剑攻击时，有机率造成双倍伤害。',
    req: { job: JobType.THIEF, jobLv: 1 }
  },
  'improve_dodge': {
    id: 'improve_dodge',
    name: 'Improve Dodge',
    type: SkillType.PASSIVE,
    maxLv: 10,
    // 增加 Flee: Lv * 3
    fleeBonus: (lv) => lv * 3,
    desc: '残影：永久增加回避率(Flee)。',
    req: { job: JobType.THIEF, jobLv: 1 }
  }
}

// 检查是否满足学习条件
export function canLearnSkill(player, skillId) {
    const skill = Skills[skillId]
    if (!skill) return { ok: false, msg: '技能不存在' }

    // 1. 检查职业
    // 简化逻辑：如果是 Novice，只能学 Novice 技能
    // 如果是 Swordman，可以学 Swordman + Novice 技能
    // 这里简单判断: req.job 必须匹配玩家当前的 job (或者玩家是一转，req是Novice)
    if (skill.req.job !== player.job && skill.req.job !== JobType.NOVICE) {
        return { ok: false, msg: `职业不符 (需要: ${skill.req.job})` }
    }

    // 2. 检查前置技能
    if (skill.req.skills) {
        for (const [reqSkillId, reqLv] of Object.entries(skill.req.skills)) {
            const playerSkillLv = player.skills[reqSkillId] || 0
            if (playerSkillLv < reqLv) {
                const reqSkillName = Skills[reqSkillId].name
                return { ok: false, msg: `前置不足: ${reqSkillName} Lv.${reqLv}` }
            }
        }
    }

    return { ok: true }
}
