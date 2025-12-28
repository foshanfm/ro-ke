import { mapState, findNearestMonster, randomWalk, isNearWarp } from '../mapManager.js'
import { formatPos } from '../constants.js'

/**
 * TargetingHandler
 * Handles monster searching and target selection logic
 */

/**
 * Search for nearest monster and set as target
 * @param {number} viewRange - Player's view range
 * @param {Function} log - Logging function
 * @param {Function} getMobTemplate - Function to get monster template
 * @returns {Object} - {monster: Object|null, shouldPatrol: boolean, delay: number}
 */
export function searchForTarget(viewRange, log, getMobTemplate) {
    // 安全过滤: 忽略靠近传送点的怪物 (5格 = 50px)
    const { monster, distance } = findNearestMonster(viewRange, (m) => !isNearWarp(m.x, m.y, 50))

    if (monster) {
        const mobTemplate = getMobTemplate(monster)
        log(`[${mobTemplate.name}] detected at ${formatPos(monster.x, monster.y)}!`, 'dim')
        return { monster, shouldPatrol: false }
    }

    // No monster found, patrol
    const isFirstPatrol = !mapState.patrolTarget
    const arrived = randomWalk()

    if (isFirstPatrol) {
        log(`No monsters nearby. Patrolling to ${formatPos(mapState.patrolTarget.x, mapState.patrolTarget.y)}...`, 'dim')
    }

    return { monster: null, shouldPatrol: true, delay: arrived ? 500 : 100 }
}

/**
 * Validate target is still alive
 * @param {Object} target - Monster instance
 * @returns {boolean} - True if target is valid
 */
export function isTargetValid(target) {
    return target && target.hp > 0
}
