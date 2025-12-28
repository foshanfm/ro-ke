/**
 * Size Damage Modifiers (体型修正)
 * Derived from ref/db/size_fix.txt
 */

import { WeaponType } from './equipment.js'

export const SizeType = {
    SMALL: 0,
    MEDIUM: 1,
    LARGE: 2
}

export const SizeNames = {
    [SizeType.SMALL]: '小型',
    [SizeType.MEDIUM]: '中型',
    [SizeType.LARGE]: '大型'
}

/**
 * Size Table Matrix
 * Key: WeaponType
 * Value: [Small%, Medium%, Large%]
 */
export const SIZE_TABLE = {
    [WeaponType.NONE]: [100, 100, 100],
    [WeaponType.DAGGER]: [100, 75, 50],
    [WeaponType.SWORD]: [75, 100, 75],
    [WeaponType.TWO_HAND_SWORD]: [75, 75, 100],
    [WeaponType.SPEAR]: [75, 75, 100],
    [WeaponType.TWO_HAND_SPEAR]: [75, 75, 100],
    [WeaponType.AXE]: [50, 75, 100],
    [WeaponType.TWO_HAND_AXE]: [50, 75, 100],
    [WeaponType.MACE]: [75, 100, 100],
    [WeaponType.STAFF]: [100, 100, 100],
    [WeaponType.TWO_HAND_STAFF]: [100, 100, 100],
    [WeaponType.BOW]: [100, 100, 75],
    [WeaponType.KNUCKLE]: [100, 75, 50],
    [WeaponType.INSTRUMENT]: [75, 100, 75],
    [WeaponType.WHIP]: [75, 100, 50],
    [WeaponType.BOOK]: [100, 100, 50],
    [WeaponType.KATAR]: [75, 100, 75],
    // ROD maps to staff so it uses the same as staff
    [WeaponType.ROD]: [100, 100, 100]
}

/**
 * Get size modifier for a specific weapon and monster size
 * @param {string} weaponType - WeaponType string
 * @param {number} monsterSize - 0:Small, 1:Medium, 2:Large
 * @returns {number} Modifier percentage (100 = 100%)
 */
export function getSizeModifier(weaponType, monsterSize) {
    if (monsterSize < 0 || monsterSize > 2) monsterSize = SizeType.MEDIUM

    const modifiers = SIZE_TABLE[weaponType] || [100, 100, 100]
    return modifiers[monsterSize]
}
