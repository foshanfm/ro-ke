import { player } from '../player.js'
import { mapState, movePlayerToward, checkWarpCollision } from '../mapManager.js'
import { warp } from '../player.js'
import { formatPos } from '../constants.js'


/**
 * MovementHandler
 * Handles all movement-related logic:
 * - Manual movement (moveTo)
 * - Returning to goal map
 * - Warp collision detection
 */

/**
 * Handle manual movement to a specific coordinate
 * @param {Object} target - {x, y} coordinates
 * @param {Function} log - Logging function
 * @returns {Object} - {shouldContinue: boolean, delay: number}
 */
export function handleManualMovement(target, log) {
    const { x, y } = target
    const dist = Math.sqrt(Math.pow(x - player.x, 2) + Math.pow(y - player.y, 2))

    if (dist < 5) {
        log(`到达目的地 ${formatPos(x, y)}`, 'success')
        return { shouldContinue: false, arrived: true }
    }

    movePlayerToward(x, y, player.moveSpeed)

    // Check warp collision
    const warpInfo = checkWarpCollision(player.x, player.y)
    if (warpInfo) {
        log(`进入传送点 [${warpInfo.name}]，传送至 ${warpInfo.targetMap}...`, 'warning')
        setTimeout(() => {
            const res = warp(warpInfo.targetMap)
            if (res.success) {
                const offsetX = (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 2)
                const offsetY = (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 2)
                player.x = warpInfo.targetX + offsetX
                player.y = warpInfo.targetY + offsetY
                log(`已到达 ${warpInfo.targetMap} ${formatPos(player.x, player.y)}`, 'success')
            }
        }, 500)
        return { shouldContinue: false, warped: true }
    }

    return { shouldContinue: true, delay: 100 }
}

/**
 * Handle returning to goal map via pathfinding
 * @param {string} currentMap - Current map ID
 * @param {string} goalMap - Goal map ID
 * @param {Function} findPath - Pathfinding function
 * @param {Function} log - Logging function
 * @param {Object} lastActionLog - Ref to last action log
 * @returns {Object} - {shouldContinue: boolean, delay: number, error: string}
 */
export function handleReturnToGoalMap(currentMap, goalMap, findPath, log, lastActionLog) {
    const path = findPath(currentMap, goalMap)

    if (!path || path.length < 2) {
        return { shouldContinue: false, error: `无法找到返回 ${goalMap} 的路径!` }
    }

    const nextMap = path[1] // path[0] is current

    // Find warp to next map
    const warpToNext = mapState.activeWarps.find(w => w.targetMap === nextMap)

    if (!warpToNext) {
        return { shouldContinue: false, error: `Unknown warp to ${nextMap} on current map!` }
    }

    if (lastActionLog.value !== `return_${nextMap}`) {
        log(`Returning to ${goalMap}... Next step: ${nextMap}`, 'system')
        lastActionLog.value = `return_${nextMap}`
    }

    // Move toward warp
    movePlayerToward(warpToNext.x, warpToNext.y, player.moveSpeed)

    // Check warp collision
    const warpInfo = checkWarpCollision(player.x, player.y)
    if (warpInfo) {
        log(`进入传送点 [${warpInfo.name}]...`, 'warning')
        const res = warp(warpInfo.targetMap)
        if (res.success) {
            // Map changed, will re-evaluate on next tick
        }
        return { shouldContinue: false, delay: 100 }
    }

    return { shouldContinue: true, delay: 100 }
}

/**
 * Handle movement toward target (chase)
 * @param {Object} target - Monster instance
 * @param {Function} log - Logging function
 * @param {Object} lastActionLog - Ref to last action log
 * @param {Function} getMobTemplate - Function to get monster template
 * @returns {Object} - {shouldContinue: boolean, delay: number}
 */
export function handleChaseTarget(target, log, lastActionLog, getMobTemplate) {
    const mobTemplate = getMobTemplate(target)

    if (lastActionLog.value !== `chase_${target.guid}`) {
        log(`Moving toward [${mobTemplate.name}] at ${formatPos(target.x, target.y)}...`, 'dim')
        lastActionLog.value = `chase_${target.guid}`
    }

    movePlayerToward(target.x, target.y, player.moveSpeed)

    // Check warp collision
    const warpInfo = checkWarpCollision(player.x, player.y)
    if (warpInfo) {
        log(`进入传送点 [${warpInfo.name}]，传送至 ${warpInfo.targetMap}...`, 'warning')
        setTimeout(() => {
            const res = warp(warpInfo.targetMap)
            if (res.success) {
                const offsetX = (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 2)
                const offsetY = (Math.random() > 0.5 ? 1 : -1) * (2 + Math.random() * 2)
                player.x = warpInfo.targetX + offsetX
                player.y = warpInfo.targetY + offsetY
                log(`已到达 ${warpInfo.targetMap} ${formatPos(player.x, player.y)}`, 'success')
            }
        }, 500)
        return { shouldContinue: false, warped: true }
    }

    return { shouldContinue: true, delay: 100 }
}
