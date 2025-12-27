import { mapState, findNearestMonster, randomWalk } from '../mapManager.js'

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
    const { monster, distance } = findNearestMonster(viewRange)

    if (monster) {
        const mobTemplate = getMobTemplate(monster)
        log(`[${mobTemplate.name}] detected at (${Math.floor(monster.x / 10)}, ${Math.floor(monster.y / 10)})!`, 'dim')
        return { monster, shouldPatrol: false }
    }

    // No monster found, patrol
    const isFirstPatrol = !mapState.patrolTarget
    const arrived = randomWalk()

    if (isFirstPatrol) {
        log(`No monsters nearby. Patrolling to (${Math.floor(mapState.patrolTarget.x / 10)}, ${Math.floor(mapState.patrolTarget.y / 10)})...`, 'dim')
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
