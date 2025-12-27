import { getItemInfo, ItemType } from '../items.js'
import { EquipType, WeaponType, WeaponRangeTable } from '../equipment.js'
import * as Formulas from '../formulas.js'
import { JobConfig } from '../jobs.js'

/**
 * Stat Manager Module
 * Handles all player stat calculations.
 * Extracted from player.js for better modularity.
 */

/**
 * BonusParser: Parses and accumulates bonuses from equipment and cards
 * @param {Object} equipment - Player equipment object
 * @returns {Object} Aggregated bonuses and equipment info
 */
export function parseBonuses(equipment) {
    const bonus = {
        str: 0, agi: 0, vit: 0, int: 0, dex: 0, luk: 0,
        atk: 0, def: 0, matk: 0, mdef: 0, hp: 0, sp: 0,
        crit: 0, flee: 0, hit: 0
    }

    const aspdModifiers = {
        potionRate: 0,
        skillRate: 0,
        equipRate: 0,
        flatBonus: 0
    }

    let weaponAtk = 0
    let equipDef = 0
    let weaponType = WeaponType.NONE
    let hasShield = false

    if (equipment) {
        Object.values(equipment).forEach(instance => {
            if (!instance) return
            const e = getItemInfo(instance.id)
            if (!e) return

            if (e.type === ItemType.EQUIP) {
                // 1. Weapon type and base attack
                if (e.subType && Object.values(WeaponType).includes(e.subType)) {
                    weaponAtk = e.atk || 0
                    weaponType = e.subType
                } else if (e.name.includes('弓') || e.subType === 'BOW') {
                    weaponAtk = e.atk || 0
                    weaponType = WeaponType.BOW
                }

                // Shield detection
                if (e.subType === 'Shield' || e.subType === EquipType.SHIELD) {
                    hasShield = true
                }

                // 2. Base defense
                if (e.def) equipDef += e.def

                // 3. Script bonuses
                if (e.bonuses) {
                    Object.entries(e.bonuses).forEach(([key, val]) => {
                        if (bonus.hasOwnProperty(key)) bonus[key] += val
                        else if (key === 'maxhp') bonus.hp += val
                        else if (key === 'maxsp') bonus.sp += val
                        else if (key === 'aspdrate') aspdModifiers.equipRate += val
                    })
                }

                // 4. Card bonuses
                if (instance.cards) {
                    instance.cards.forEach(cardId => {
                        if (!cardId) return
                        const c = getItemInfo(cardId)
                        if (c && c.bonuses) {
                            Object.entries(c.bonuses).forEach(([key, val]) => {
                                if (bonus.hasOwnProperty(key)) bonus[key] += val
                                else if (key === 'maxhp') bonus.hp += val
                                else if (key === 'maxsp') bonus.sp += val
                            })
                        }
                    })
                }
            }
        })
    }

    // Ammo bonus (only for bows)
    if (equipment[EquipType.AMMO] && weaponType === WeaponType.BOW) {
        const ammoInstance = equipment[EquipType.AMMO]
        const ammoInfo = getItemInfo(ammoInstance.id)
        if (ammoInfo) {
            bonus.atk += (ammoInfo.atk || 0)
        }
    }

    return {
        bonus,
        aspdModifiers,
        weaponAtk,
        equipDef,
        weaponType,
        hasShield
    }
}

/**
 * StatCalculator: Recalculates all player stats
 * @param {Object} player - Player reactive object
 */
export function recalculatePlayerStats(player) {
    const jobCfg = JobConfig[player.job] || JobConfig.NOVICE

    const str = player.str || 1
    const agi = player.agi || 1
    const vit = player.vit || 1
    const int = player.int || 1
    const dex = player.dex || 1
    const luk = player.luk || 1
    const baseLv = player.lv || 1

    // Calculate base HP/SP
    player.maxHp = Formulas.calcMaxHp(baseLv, vit, jobCfg.hpMod)
    player.maxSp = Formulas.calcMaxSp(baseLv, int, jobCfg.spMod)

    // Safety checks
    if (isNaN(player.hp)) player.hp = player.maxHp
    if (player.hp > player.maxHp) player.hp = player.maxHp
    if (isNaN(player.sp)) player.sp = player.maxSp
    if (player.sp > player.maxSp) player.sp = player.maxSp

    // Parse equipment bonuses
    const { bonus, aspdModifiers, weaponAtk, equipDef, weaponType, hasShield } = parseBonuses(player.equipment)

    // Apply stat bonuses
    const finalStr = str + bonus.str
    const finalAgi = agi + bonus.agi
    const finalVit = vit + bonus.vit
    const finalInt = int + bonus.int
    const finalDex = dex + bonus.dex
    const finalLuk = luk + bonus.luk

    // Apply HP/SP bonuses
    player.maxHp += bonus.hp
    player.maxSp += bonus.sp

    // Calculate combat stats
    player.atk = Formulas.calcAtk(baseLv, finalStr, finalDex, finalLuk, weaponAtk + bonus.atk)
    player.matk = Formulas.calcMatk(baseLv, finalInt, finalDex, finalLuk, bonus.matk)
    player.def = Formulas.calcDef(baseLv, finalVit, finalAgi, equipDef + bonus.def)
    player.mdef = Formulas.calcMdef(baseLv, finalInt, finalVit, finalDex, bonus.mdef)
    player.hit = Formulas.calcHit(baseLv, finalDex, finalLuk) + bonus.hit

    // Flee with skill bonus
    let fleeBonus = bonus.flee
    if (player.skills['improve_dodge']) {
        fleeBonus += (player.skills['improve_dodge'] || 0) * 3
    }
    player.flee = Formulas.calcFlee(baseLv, finalAgi, finalLuk, fleeBonus)

    player.crit = Formulas.calcCrit(finalLuk, bonus.crit)

    // ASPD calculation
    player.aspd = Formulas.calcAspd(
        player.job,
        weaponType,
        hasShield,
        finalAgi,
        finalDex,
        aspdModifiers
    )

    // Movement speed
    let roSpeedValue = 100
    player.moveSpeed = Formulas.calcMoveSpeed(roSpeedValue, 10)

    // Attack range
    const CELL_SIZE = 10
    let rangeInCells = WeaponRangeTable[weaponType] || 1

    // Vulture's Eye bonus for bows
    if (weaponType === WeaponType.BOW) {
        rangeInCells += (player.skills['vultures_eye'] || 0)
    }

    player.attackRange = rangeInCells * CELL_SIZE
}
