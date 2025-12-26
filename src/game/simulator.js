// src/game/simulator.js
import { spawnMonster } from './monsters'
import { calculateDamageFlow, calcAspdDelay } from './formulas'
import { player } from './player' 
import { getItemInfo } from './items' // 获取药水价格

export function runSimulation(mapId, iterations = 1000) {
    console.log(`[Simulator] Starting ${iterations} runs on map ${mapId}...`)
    
    // 1. 克隆玩家状态
    const simPlayer = {
        hp: player.maxHp,
        maxHp: player.maxHp,
        atk: player.atk,
        def: player.def,
        hit: player.hit,
        flee: player.flee,
        crit: player.crit,
        aspdDelay: calcAspdDelay(player.aspd),
        doubleAttackLv: player.skills['double_attack'] || 0,
        autoPotionThreshold: player.maxHp * (player.config.auto_hp_percent / 100)
    }

    // 2. 统计数据结构
    const stats = {
        // 基础
        iterations: iterations,
        totalTime: 0, // ms
        wins: 0,
        deaths: 0,
        
        // 收益
        totalExp: 0,
        totalLootVal: 0, // 卖店价值
        
        // 消耗
        potionsUsed: 0,
        potionCost: 0, // 药水总成本
        
        // 战斗细节
        totalDamageDealt: 0, // 总造成伤害
        totalHits: 0,        // 出手次数
        totalMisses: 0,      // Miss次数
        totalCrits: 0,       // 暴击次数
        totalDouble: 0,      // 二连触发次数
        
        // 生存细节
        totalDamageTaken: 0, // 总承受伤害
        minHpEnd: simPlayer.maxHp, // 战斗结束最低血量 (安全线)
        avgHitsToKill: 0     // 平均几刀死
    }

    // 获取药水价格 (假设使用 Config 里的药水，默认红药)
    const potionName = player.config.auto_hp_item || '红色药水'
    // 简单查找药水价格，找不到默认 50
    let potionPrice = 50
    // 这里为了简便，硬编码红药价格，严谨应该去查 ShopList
    if (potionName === '红色药水') potionPrice = 50

    for (let i = 0; i < iterations; i++) {
        if (simPlayer.hp <= 0) simPlayer.hp = simPlayer.maxHp 
        
        const monster = spawnMonster(mapId)
        let timeElapsed = 0
        let playerNextAct = 0
        let monsterNextAct = Math.random() * 500 
        let hitsThisFight = 0

        let battleOver = false

        while (!battleOver) {
            const step = 50
            timeElapsed += step
            playerNextAct -= step
            monsterNextAct -= step

            // --- Player Action ---
            if (playerNextAct <= 0) {
                // Auto Potion
                if (simPlayer.hp < simPlayer.autoPotionThreshold) {
                    simPlayer.hp += 45 
                    stats.potionsUsed++
                    stats.potionCost += potionPrice
                }

                // Attack
                stats.totalHits++
                const res = calculateDamageFlow({
                    attackerAtk: simPlayer.atk,
                    attackerHit: simPlayer.hit,
                    attackerCrit: simPlayer.crit,
                    defenderDef: monster.def || 0,
                    defenderFlee: monster.flee || 1
                })
                
                if (res.type === 'miss') {
                    stats.totalMisses++
                } else {
                    let dmg = res.damage
                    if (res.type === 'crit') stats.totalCrits++
                    
                    // Double Attack check
                    if (simPlayer.doubleAttackLv > 0 && Math.random() * 100 < simPlayer.doubleAttackLv * 5) {
                        dmg += res.damage // 简单翻倍
                        stats.totalDouble++
                    }
                    
                    monster.hp -= dmg
                    stats.totalDamageDealt += dmg
                    hitsThisFight++
                }

                if (monster.hp <= 0) {
                    battleOver = true
                    stats.wins++
                    stats.totalExp += monster.exp
                    stats.avgHitsToKill += hitsThisFight
                    stats.minHpEnd = Math.min(stats.minHpEnd, simPlayer.hp)
                    
                    // Loot Simulation
                    monster.drops.forEach(drop => {
                        if (Math.random() < drop.rate) {
                            const info = getItemInfo(drop.id)
                            // 只有 Etc 和 Equip 能卖钱，这里简化计算所有掉落物价值
                            // 如果是贵重物品(卡片)，价值可能很高，这里按商店回收价算
                            stats.totalLootVal += (info.price || 0)
                        }
                    })
                    
                    stats.totalTime += (timeElapsed + 800) 
                    break
                }
                
                playerNextAct = simPlayer.aspdDelay
            }

            // --- Monster Action ---
            if (!battleOver && monsterNextAct <= 0) {
                const res = calculateDamageFlow({
                    attackerAtk: monster.atk,
                    attackerHit: monster.hit || 50,
                    attackerCrit: 0,
                    defenderDef: simPlayer.def,
                    defenderFlee: simPlayer.flee,
                    isPlayerAttacking: false
                })

                if (res.type !== 'miss') {
                    simPlayer.hp -= res.damage
                    stats.totalDamageTaken += res.damage
                }

                if (simPlayer.hp <= 0) {
                    battleOver = true
                    stats.deaths++
                    stats.totalTime += timeElapsed
                    break
                }

                monsterNextAct = monster.attackDelay || 2000
            }
            
            if (timeElapsed > 60000) { 
                battleOver = true
                stats.totalTime += timeElapsed
            }
        }
    }

    // Post-processing averages
    if (stats.wins > 0) {
        stats.avgHitsToKill = stats.avgHitsToKill / stats.wins
    }
    
    // Calculate Rates
    stats.hitRate = ((stats.totalHits - stats.totalMisses) / stats.totalHits * 100) || 0
    stats.critRate = (stats.totalCrits / stats.totalHits * 100) || 0
    
    // DPS calculation (Total Damage / Total Time in seconds)
    // 注意：TotalTime 包含了索敌时间，算 DPS 时应该只算战斗时间？
    // 为了反映真实挂机效率，我们用总时间算“有效DPS”，或者我们可以算“战斗DPS”
    // 这里简单用总时间
    stats.dps = stats.totalDamageDealt / (stats.totalTime / 1000)

    return stats
}
