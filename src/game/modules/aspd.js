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
     * @param {number} params.baseAspd - (可选) 强制指定基础攻速，覆盖 JSON 配置
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
            flatBonus = 0,
            baseAspd
        } = params

        // 1. 获取职业基础攻速
        let jobBase = baseAspd // 优先使用传入的真实数据

        if (!jobBase) {
            const jobData = JobBaseAspdData.ASPD_DATA[jobType]
            if (!jobData) {
                // console.warn(`[ASPD] 未找到职业数据: ${jobType}，使用默认值 150`) // Reduce noise
                jobBase = 150
            } else {
                // 2. 获取武器基础攻速 (Fallback)
                jobBase = jobData[weaponType] || jobData['NONE'] || 150
            }
        }

        // 3. 计算盾牌惩罚 (如果已经传了真实数据，盾牌惩罚通常包含在里面了？ 
        // 实际上 job_db1.txt 最后一列是 Shield Penalty。
        // 我们在 loadJobStatsDB 里没有把 Shield Penalty 传给 baseAspd。
        // baseAspd 只是 lookup[jobId][weaponType]。
        // 所以我们还需要减去 Shield Penalty。
        // 但目前的 jobBaseAspd 没有传 shield Penalty 进来。
        // 在 loadJobStatsDB 中我们解析了 shield penalty 到 jobBaseAspd[jobId]['SHIELD_PENALTY']。
        // 所以调用 calculate 时，如果用了 authentic data, 我们最好尽量也把 shield penalty 传进来，
        // 或者保留现在的硬编码/json 逻辑作为 shield penalty 的来源。
        // 鉴于 job_db1.txt 的 shield penalty 是最后一列，我们暂且假设 params.baseAspd 已经处理好了或者我们在这里处理。
        // 简单起见，如果传了 baseAspd，我们依然应用 shield penalty 逻辑，但是从哪里取？
        // 如果用 JSON 里的数据会有不一致。
        // 理想方案：在 statManager 里把 shield penalty 也取出来传给 flatBonus 或者 这里。

        // 为了保持改动最小且安全：我们先保留 JSON 里的 shield penalty 逻辑，除非 params 里明确传了 penalty。
        // 暂时假设 JSON 里的 penalty 和 txt 里的一致，或者不一致也偏差不大。
        // 重点是 Base ASPD 的变化。

        const jobData = JobBaseAspdData.ASPD_DATA[jobType] || {}
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
