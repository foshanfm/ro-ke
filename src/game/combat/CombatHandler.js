import { player } from '../player.js'
import { getItemInfo } from '../items.js'
import { calculateDamageFlow } from '../formulas.js'
import { PassiveHooks } from '../skillEngine.js'

/**
 * CombatHandler
 * Handles all combat-related logic:
 * - Ammo checks
 * - Attack execution
 * - Damage calculation
 */

/**
 * Check if player has ammo for ranged weapons
 * @param {string} weaponType - Weapon type (e.g., 'BOW')
 * @param {Function} log - Logging function
 * @param {Object} lastActionLog - Ref to last action log
 * @returns {Object} - {hasAmmo: boolean, shouldStop: boolean}
 */
export function checkAmmo(weaponType, log, lastActionLog) {
    if (weaponType !== 'BOW') {
        return { hasAmmo: true, shouldStop: false }
    }

    const ammo = player.equipment.Ammo
    if (!ammo || ammo.count <= 0) {
        if (lastActionLog.value !== 'no_ammo') {
            log('You need arrows to attack!', 'error')
            lastActionLog.value = 'no_ammo'
        }
        return { hasAmmo: false, shouldStop: true }
    }

    return { hasAmmo: true, shouldStop: false }
}

/**
 * Consume one ammo
 * @param {Function} log - Logging function
 * @returns {boolean} - True if ammo was consumed, false if out of ammo
 */
export function consumeAmmo(log) {
    const ammo = player.equipment.Ammo
    if (!ammo) return false

    ammo.count--
    if (ammo.count <= 0) {
        player.equipment.Ammo = null
        log('Out of arrows!', 'warning')
        return false
    }

    return true
}

/**
 * Execute attack on target
 * @param {Object} target - Monster instance
 * @param {Function} getMobTemplate - Function to get monster template
 * @param {Function} log - Logging function
 * @returns {Object} - {damage: number, type: string, killed: boolean}
 */
export function executeAttack(target, getMobTemplate, log) {
    const passiveRes = PassiveHooks.onNormalAttack(target)
    const targetTemplate = getMobTemplate(target)

    const res = calculateDamageFlow({
        attackerAtk: player.atk,
        attackerHit: player.hit,
        attackerCrit: player.crit,
        defenderDef: targetTemplate.def || 0,
        defenderFlee: targetTemplate.flee || 1,
        isPlayerAttacking: true
    })

    if (res.type === 'miss') {
        log(`You miss [${targetTemplate.name}]!`, 'dim')
        return { damage: 0, type: 'miss', killed: false }
    }

    let damage = res.damage
    if (passiveRes.damageMod !== 1.0) {
        damage = Math.floor(damage * passiveRes.damageMod)
    }

    if (res.type === 'crit') {
        log(`CRITICAL! You deal ${damage} damage.`, 'warning')
    } else {
        log(`You attack [${targetTemplate.name}] for ${damage} damage.`, 'default')
    }

    passiveRes.logs.forEach(l => log(l.msg, l.type))

    target.hp -= damage

    return {
        damage,
        type: res.type,
        killed: target.hp <= 0
    }
}

/**
 * Get weapon type from equipped weapon
 * @returns {string} - Weapon type (e.g., 'BOW', 'SWORD', 'NONE')
 */
export function getWeaponType() {
    if (player.equipment && player.equipment.Weapon) {
        const wInfo = getItemInfo(player.equipment.Weapon.id)
        if (wInfo) return wInfo.subType
    }
    return 'NONE'
}
