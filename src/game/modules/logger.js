import { reactive } from 'vue'

/**
 * Global Logger Module
 * Provides a reactive log stream for the entire game.
 * Decouples logging from individual modules.
 */

export const gameLog = reactive([])

/**
 * Add a log entry
 * @param {string} msg - Log message
 * @param {string} type - Log type: 'info', 'warning', 'success', 'error', 'dim', 'default', 'levelup', 'system'
 */
export function addLog(msg, type = 'info') {
    const timestamp = new Date().toLocaleTimeString()
    gameLog.push({
        msg,
        type,
        timestamp,
        id: Date.now() + Math.random() // Unique ID for Vue key
    })

    // Limit log size to prevent memory issues (keep last 500 entries)
    if (gameLog.length > 500) {
        gameLog.shift()
    }
}

/**
 * Clear all logs
 */
export function clearLog() {
    gameLog.length = 0
}
