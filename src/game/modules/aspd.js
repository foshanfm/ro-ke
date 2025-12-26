// src/game/modules/aspd.js
// ASPD 计算模块 - 实现 RO 复杂攻速计算机制

import JobBaseAspdData from '../data/system/job_base_aspd.json'

/**
 * ASPD 计算器类
 * 负责整合职业基础、素质、装备、药水、技能等所有攻速影响因素
 */
export class ASPDCalculator {
    /**
     * 计算最终 ASPD
     * @param {Object} params - 计算参数
     * @param {string} params.jobType - 职业类型 (如 'NOVICE', 'SWORDMAN')
     * @param {string} params.weaponType - 武器类型 (如 'SWORD', 'DAGGER')
     * @param {boolean} params.hasShield - 是否装备盾牌
     * @param {number} params.agi - AGI 素质点 (包含装备加成)
     * @param {number} params.dex - DEX 素质点 (包含装备加成)
     * @param {number} params.potionRate - 药水攻速加成百分比 (0.15 = 15%)
     * @param {number} params.skillRate - 技能攻速加成百分比
     * @param {number} params.equipRate - 装备攻速加成百分比
     * @param {number} params.flatBonus - 固定攻速加成 (ASPD +1, +2 等)
     * @returns {number} 最终 ASPD 数值 (上限 193)
     */
    calculate(params) {
        const {
            jobType,
            weaponType,
            hasShield = false,
            agi = 1,
            dex = 1,
            potionRate = 0,
            skillRate = 0,
            equipRate = 0,
            flatBonus = 0
        } = params

        // 1. 获取职业基础攻速
        const jobData = JobBaseAspdData.ASPD_DATA[jobType]
        if (!jobData) {
            console.warn(`[ASPD] 未找到职业数据: ${jobType}，使用默认值 150`)
            return 150
        }

        // 2. 获取武器基础攻速
        let jobBase = jobData[weaponType] || jobData['NONE'] || 150

        // 3. 计算盾牌惩罚
        const shieldPenalty = hasShield ? (jobData.SHIELD_PENALTY || 0) : 0

        // 4. 计算素质加成 (Renewal 公式)
        // 素质加成 = sqrt(AGI^2 + DEX^2 / 4) * 职业系数
        // 这里使用 0.1 作为通用系数，可根据职业调整
        const statBonus = Math.sqrt(Math.pow(agi, 2) + Math.pow(dex, 2) / 4) * 0.1

        // 5. 计算中间值 (向下取整是 RO 的核心机制)
        let currentAspd = jobBase + shieldPenalty + statBonus

        // 6. 应用药水和技能加成 (针对 200 点的补差计算)
        // 公式: 当前 + (200 - 当前) * (药水% + 技能%)
        const speedRate = potionRate + skillRate
        if (speedRate > 0) {
            currentAspd = currentAspd + (200 - currentAspd) * speedRate
        }

        // 7. 应用装备百分比加成 (针对 195 点的补差计算)
        if (equipRate > 0) {
            currentAspd = currentAspd + (195 - currentAspd) * equipRate
        }

        // 8. 加入固定值
        let finalAspd = currentAspd + flatBonus

        // 9. 封顶并保留两位小数
        // RO 官服上限通常为 193，私服可能为 195 或 199
        const maxAspd = 193
        return Math.min(maxAspd, Math.floor(finalAspd * 100) / 100)
    }

    /**
     * 获取职业支持的武器类型列表
     * @param {string} jobType - 职业类型
     * @returns {Array<string>} 武器类型列表
     */
    getSupportedWeapons(jobType) {
        const jobData = JobBaseAspdData.ASPD_DATA[jobType]
        if (!jobData) return ['NONE']

        return Object.keys(jobData).filter(key => key !== 'SHIELD_PENALTY')
    }

    /**
     * 获取特定职业和武器的基础攻速
     * @param {string} jobType - 职业类型
     * @param {string} weaponType - 武器类型
     * @returns {number} 基础攻速
     */
    getBaseAspd(jobType, weaponType) {
        const jobData = JobBaseAspdData.ASPD_DATA[jobType]
        if (!jobData) return 150

        return jobData[weaponType] || jobData['NONE'] || 150
    }
}

// 导出单例实例
export const aspdCalculator = new ASPDCalculator()
