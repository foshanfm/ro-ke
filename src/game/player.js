import { reactive, watch } from 'vue'
import { JobType, JobConfig, getNextBaseExp, getNextJobExp } from './jobs'
import { Skills, canLearnSkill } from './skills'
import { EquipDB, EquipType, WeaponType, WeaponRangeTable } from './equipment'
import { getItemInfo, ItemType } from './items'
import { Maps } from './maps'
import * as Formulas from './formulas'
import { saveSave, getSave, getAllSaves, deleteSave } from '../db/index.js'

const defaultStats = {
    name: 'Novice',
    job: JobType.NOVICE,
    lv: 1, exp: 0, nextExp: 100,
    jobLv: 1, jobExp: 0, nextJobExp: 50,
    statPoints: 0, skillPoints: 0, zeny: 0,
    skills: {},
    equipment: {
        [EquipType.WEAPON]: null,
        [EquipType.SHIELD]: null,
        [EquipType.HEAD_TOP]: null,
        [EquipType.HEAD_MID]: null,
        [EquipType.HEAD_LOW]: null,
        [EquipType.ARMOR]: null,
        [EquipType.GARMENT]: null,
        [EquipType.FOOTGEAR]: null,
        [EquipType.ACCESSORY1]: null,
        [EquipType.ACCESSORY2]: null,
        [EquipType.AMMO]: null
    },
    config: {
        auto_hp_percent: 0,
        auto_hp_item: '红色药水',
        auto_buy_potion: 0,
        viewRange: 30 * 10, // 30格视野
        attackRange: 10
    },
    currentMap: 'prt_fild08',
    x: 400 * 10 / 2, y: 400 * 10 / 2, // 初始位置设在地图中央
    hp: 100, maxHp: 100, sp: 20, maxSp: 20,
    atk: 0, matk: 0, def: 0, mdef: 0, hit: 0, flee: 0, crit: 0, aspd: 0, moveSpeed: 5,
    str: 1, agi: 1, dex: 1, vit: 1, int: 1, luk: 1,
    savePoint: {
        map: 'prontera',
        x: 156 * 10,
        y: 178 * 10
    },
    inventory: []
}

export const player = reactive({ ...defaultStats })

// 当前存档 ID (用于更新现有存档)
export let currentSaveId = null

export const getStatPointCost = Formulas.getStatPointCost

export function recalculateMaxStats() {
    const jobCfg = JobConfig[player.job] || JobConfig.NOVICE

    const str = player.str || 1
    const agi = player.agi || 1
    const vit = player.vit || 1
    const int = player.int || 1
    const dex = player.dex || 1
    const luk = player.luk || 1
    const baseLv = player.lv || 1

    player.maxHp = Formulas.calcMaxHp(baseLv, vit, jobCfg.hpMod)
    player.maxSp = Formulas.calcMaxSp(baseLv, int, jobCfg.spMod)

    if (isNaN(player.hp)) player.hp = player.maxHp
    if (player.hp > player.maxHp) player.hp = player.maxHp
    if (isNaN(player.sp)) player.sp = player.maxSp
    if (player.sp > player.maxSp) player.sp = player.maxSp

    let weaponAtk = 0
    let equipDef = 0
    let equipMoveSpeedBonus = 0
    let weaponType = WeaponType.NONE
    let hasShield = false

    // ASPD 修正值收集
    const aspdModifiers = {
        potionRate: 0,   // 药水加成 (暂未实装)
        skillRate: 0,    // 技能加成 (暂未实装)
        equipRate: 0,    // 装备百分比加成
        flatBonus: 0     // 固定加成
    }

    const bonus = {
        str: 0, agi: 0, vit: 0, int: 0, dex: 0, luk: 0,
        atk: 0, def: 0, matk: 0, mdef: 0, hp: 0, sp: 0,
        crit: 0, flee: 0, hit: 0
    }

    if (player.equipment) {
        Object.values(player.equipment).forEach(instance => {
            if (!instance) return
            const e = getItemInfo(instance.id)
            if (!e) return

            if (e.type === ItemType.EQUIP) {
                // 1. 基础攻击与子类型
                if (e.subType && Object.values(WeaponType).includes(e.subType)) {
                    weaponAtk = e.atk || 0
                    weaponType = e.subType
                } else if (e.name.includes('弓') || e.subType === 'BOW') { // 后备兼容
                    weaponAtk = e.atk || 0
                    weaponType = WeaponType.BOW
                }

                if (e.subType === 'Shield' || e.subType === EquipType.SHIELD) {
                    hasShield = true
                }

                // 2. 基础加成 (ATK, DEF)
                // 注意: rAthena DB 的 atk 字段对于武器是基础攻击，对于防具通常是 0
                // 而 def 则是防御。这里我们需要区分开。
                if (e.def) equipDef += e.def
                // 如果是卡片或饰品带的攻击，应该在 bonuses 里处理

                // 3. 通用脚本加成 (bStr, bAtk, etc.)
                if (e.bonuses) {
                    Object.entries(e.bonuses).forEach(([key, val]) => {
                        if (bonus.hasOwnProperty(key)) bonus[key] += val
                        else if (key === 'maxhp') bonus.hp += val
                        else if (key === 'maxsp') bonus.sp += val
                        else if (key === 'aspdrate') aspdModifiers.equipRate += val
                    })
                }

                // 4. 插卡加成
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

    // Ammo Bonus
    // Ammo counts as equipment instance in the slot AMMO.
    // It usually provides Atk.
    if (player.equipment[EquipType.AMMO]) {
        const ammoInstance = player.equipment[EquipType.AMMO]
        const ammoInfo = getItemInfo(ammoInstance.id)
        if (ammoInfo) {
            bonus.atk += (ammoInfo.atk || 0)
            // Arrows can have elements, etc., handled later in Combat damage calculation if needed
        }
    }

    const finalStr = str + bonus.str
    const finalAgi = agi + bonus.agi
    const finalVit = vit + bonus.vit
    const finalInt = int + bonus.int
    const finalDex = dex + bonus.dex
    const finalLuk = luk + bonus.luk

    player.maxHp += bonus.hp
    player.maxSp += bonus.sp

    player.atk = Formulas.calcAtk(baseLv, finalStr, finalDex, finalLuk, weaponAtk + bonus.atk)
    player.matk = Formulas.calcMatk(baseLv, finalInt, finalDex, finalLuk, bonus.matk)
    player.def = Formulas.calcDef(baseLv, finalVit, finalAgi, equipDef + bonus.def)
    player.mdef = Formulas.calcMdef(baseLv, finalInt, finalVit, finalDex, bonus.mdef)
    player.hit = Formulas.calcHit(baseLv, finalDex, finalLuk) + bonus.hit

    let fleeBonus = bonus.flee
    if (player.skills['improve_dodge']) {
        fleeBonus += (player.skills['improve_dodge'] || 0) * 3
    }
    player.flee = Formulas.calcFlee(baseLv, finalAgi, finalLuk, fleeBonus)

    player.crit = Formulas.calcCrit(finalLuk, bonus.crit)

    // 使用新的 ASPD 计算接口
    player.aspd = Formulas.calcAspd(
        player.job,      // 职业类型
        weaponType,      // 武器类型
        hasShield,       // 是否装备盾牌
        finalAgi,        // AGI (含装备加成)
        finalDex,        // DEX (含装备加成)
        aspdModifiers    // 修正值对象
    )


    // 计算移动速度 (RO 机制: 数值越小越快, 150 为基准)
    // 未来可根据 AGI UP 或 Peco 修正此数值
    let roSpeedValue = 100 // 默认给个快一点的速度 (原 150)

    // 逻辑：加速术或大嘴鸟通常取最快值 (112), 不叠加
    // if (player.buffs['agi_up'] || player.config.hasPeco) roSpeedValue = 112

    player.moveSpeed = Formulas.calcMoveSpeed(roSpeedValue, 10)

    // 计算攻击距离
    // 1 Cell = 10 px (RO标准: 逻辑像素)
    const CELL_SIZE = 10
    let rangeInCells = WeaponRangeTable[weaponType] || 1

    // 苍鹰之眼修正 (仅限弓箭类)
    if (weaponType === WeaponType.BOW) {
        rangeInCells += (player.skills['vultures_eye'] || 0)
    }

    player.attackRange = rangeInCells * CELL_SIZE
}

/**
 * 保存游戏 (异步)
 * 如果 currentSaveId 存在,则更新现有存档,否则创建新存档
 */
export async function saveGame() {
    try {
        console.log('[Player] 开始保存游戏...')
        console.log('[Player] currentSaveId:', currentSaveId)
        console.log('[Player] player.name:', player.name)

        // 创建一个干净的 player 数据副本
        const playerData = JSON.parse(JSON.stringify(player))

        const saveData = {
            id: currentSaveId,
            name: player.name,
            data: playerData
        }

        console.log('[Player] saveData 结构:', {
            id: saveData.id,
            name: saveData.name,
            dataKeys: Object.keys(saveData.data)
        })

        const savedId = await saveSave(saveData)
        console.log('[Player] 保存成功, savedId:', savedId)

        if (!currentSaveId) {
            currentSaveId = savedId
        }

        return { success: true }
    } catch (error) {
        console.error('[Player] 保存失败 - 错误类型:', error.name)
        console.error('[Player] 保存失败 - 错误信息:', error.message)
        console.error('[Player] 保存失败 - 完整错误:', error)
        console.error('[Player] 保存失败 - 堆栈:', error.stack)
        return { success: false, error }
    }
}

/**
 * 加载游戏 (异步)
 * @param {number} saveId - 存档 ID
 */
export async function loadGame(saveId) {
    try {
        const saveRecord = await getSave(saveId)
        if (!saveRecord) {
            console.error('[Player] 存档不存在:', saveId)
            return false
        }

        const parsed = saveRecord.data

        // 装备兼容性处理
        if (parsed.equipment) {
            if (parsed.equipment) {
                // Migration for old slots
                if (parsed.equipment['Head']) {
                    parsed.equipment[EquipType.HEAD_TOP] = parsed.equipment['Head']
                    delete parsed.equipment['Head']
                }
                if (parsed.equipment['Accessory']) {
                    parsed.equipment[EquipType.ACCESSORY1] = parsed.equipment['Accessory']
                    delete parsed.equipment['Accessory']
                }

                Object.keys(parsed.equipment).forEach(slot => {
                    const val = parsed.equipment[slot]
                    if (val !== null && typeof val !== 'object') {
                        const info = getItemInfo(val) // Use global parser
                        parsed.equipment[slot] = {
                            id: val,
                            cards: info && info.slots ? new Array(info.slots).fill(null) : []
                        }
                    }
                })
            }
        }

        Object.assign(player, parsed)

        if (!player.inventory) player.inventory = []

        // 兼容性处理:将旧的职业枚举值转换为新格式
        const jobMapping = {
            'Novice': 'NOVICE',
            'Swordman': 'SWORDMAN',
            'Swardman': 'SWORDMAN',
            'Mage': 'MAGICIAN',
            'Magician': 'MAGICIAN',
            'Archer': 'ARCHER',
            'Thief': 'THIEF',
            'Acolyte': 'ACOLYTE'
        }
        if (player.job && jobMapping[player.job]) {
            player.job = jobMapping[player.job]
        }
        if (!player.job) player.job = JobType.NOVICE

        if (!player.jobLv) player.jobLv = 1
        if (player.jobExp === undefined) player.jobExp = 0
        if (!player.nextJobExp) player.nextJobExp = getNextJobExp(player.jobLv)
        if (!player.skillPoints) player.skillPoints = 0
        if (player.statPoints === undefined) player.statPoints = 0
        if (!player.skills) player.skills = {}
        if (!player.config) player.config = {}

        if (!player.currentMap) player.currentMap = 'prt_fild08'
        player.currentMap = player.currentMap.toLowerCase()
        if (player.zeny === undefined) player.zeny = 0

        if (!player.equipment) {
            player.equipment = {}
        }

        // 确保所有必需的槽位都存在 (旧账号迁移)
        const requiredSlots = [
            EquipType.WEAPON, EquipType.SHIELD, EquipType.HEAD_TOP,
            EquipType.HEAD_MID, EquipType.HEAD_LOW, EquipType.ARMOR,
            EquipType.GARMENT, EquipType.FOOTGEAR, EquipType.ACCESSORY1,
            EquipType.ACCESSORY2, EquipType.AMMO
        ]
        requiredSlots.forEach(slot => {
            if (player.equipment[slot] === undefined) {
                player.equipment[slot] = null
            }
        })

        const keys = ['str', 'agi', 'dex', 'vit', 'int', 'luk']
        keys.forEach(k => {
            if (player[k] === undefined || player[k] === null || isNaN(player[k])) {
                player[k] = 1
            }
        })

        // 坐标校验与修复
        if (player.x === undefined || player.x === null || isNaN(player.x)) player.x = 400 * 10 / 2
        if (player.y === undefined || player.y === null || isNaN(player.y)) player.y = 400 * 10 / 2

        // 存档点兼容 (旧存档可能没有 savePoint 或 map)
        if (!player.savePoint) {
            player.savePoint = { map: 'prontera', x: 156 * 10, y: 178 * 10 }
        }
        if (!player.savePoint.map) {
            player.savePoint.map = 'prontera'
        }
        player.savePoint.map = player.savePoint.map.toLowerCase()

        if (!player.currentMap) player.currentMap = 'prt_fild08'
        player.currentMap = player.currentMap.toLowerCase()

        player.nextExp = getNextBaseExp(player.lv)
        player.nextJobExp = getNextJobExp(player.jobLv)
        recalculateMaxStats()

        // 设置当前存档 ID
        currentSaveId = saveId

        console.log('[Player] 存档加载成功:', player.name)
        return true
    } catch (error) {
        console.error('[Player] 加载存档失败:', error)
        return false
    }
}

/**
 * 获取所有存档列表 (异步)
 */
export async function listSaves() {
    return await getAllSaves()
}

/**
 * 创建新角色
 */
export function createNewCharacter(name) {
    Object.assign(player, defaultStats)
    player.name = name
    player.nextExp = getNextBaseExp(1)
    player.nextJobExp = getNextJobExp(1)
    currentSaveId = null // 重置存档 ID
}

/**
 * 删除存档
 * @param {number} saveId - 存档 ID
 */
export async function deleteCharacter(saveId) {
    try {
        await deleteSave(saveId)

        // 如果删除的是当前正在运行的角色,重置 player 状态
        if (currentSaveId === saveId) {
            Object.assign(player, defaultStats)
            currentSaveId = null
        }
        return true
    } catch (error) {
        console.error('[Player] 删除存档失败:', error)
        return false
    }
}


export function resetGame() {
    Object.assign(player, defaultStats)
    player.nextExp = getNextBaseExp(1)
    player.nextJobExp = getNextJobExp(1)
    saveGame()
}

export function addItem(itemId, count = 1) {
    if (!player.inventory) player.inventory = []

    const info = getItemInfo(itemId)
    if (info.type === ItemType.EQUIP) {
        for (let i = 0; i < count; i++) {
            player.inventory.push({
                id: itemId,
                count: 1,
                instance: {
                    id: itemId,
                    cards: info.slots ? new Array(info.slots).fill(null) : []
                }
            })
        }
        return
    }

    const existingItem = player.inventory.find(i => i.id === itemId)
    if (existingItem) {
        existingItem.count += count
    } else {
        player.inventory.push({ id: itemId, count: count })
    }
}

export function addExp(baseAmount, jobAmount, monsterLv = 1) {
    let leveledUp = false
    let jobLeveledUp = false

    // 1. 应用等级差惩罚
    const rate = Formulas.calcLevelDiffRate(player.lv, monsterLv)

    // 确保最小收益为 1 (除非率是 0)
    const finalBase = Math.floor(baseAmount * rate)
    const finalJob = Math.floor(jobAmount * rate)

    player.exp += finalBase

    // 2. Base Level Up Loop
    while (player.exp >= player.nextExp && player.lv < 99) {
        player.exp -= player.nextExp
        player.lv++
        player.nextExp = getNextBaseExp(player.lv)

        const pointReward = Math.min(20, Math.floor(player.lv / 5) + 5)
        player.statPoints += pointReward

        recalculateMaxStats()
        player.hp = player.maxHp
        player.sp = player.maxSp

        leveledUp = true
    }

    const currentJobCfg = JobConfig[player.job]
    if (player.jobLv < currentJobCfg.maxJobLv) {
        player.jobExp += finalJob

        // 3. Job Level Up Loop
        while (player.jobExp >= player.nextJobExp && player.jobLv < currentJobCfg.maxJobLv) {
            player.jobExp -= player.nextJobExp
            player.jobLv++

            // Pass job type to get correct table
            player.nextJobExp = getNextJobExp(player.jobLv, player.job)

            player.skillPoints++
            jobLeveledUp = true
        }
    }

    return { leveledUp, jobLeveledUp, finalBase, finalJob }
}

export function changeJob(newJob) {
    if (player.job !== JobType.NOVICE) {
        return { success: false, msg: '只有初学者可以转职。' }
    }
    if (player.jobLv < 10) {
        return { success: false, msg: 'Job 等级不足 (需要 Lv.10)。' }
    }
    if (!JobConfig[newJob]) {
        return { success: false, msg: `未知职业: ${newJob}` }
    }

    player.job = newJob
    player.jobLv = 1
    player.jobExp = 0
    player.nextJobExp = getNextJobExp(1)

    recalculateMaxStats()
    player.hp = player.maxHp
    player.sp = player.maxSp

    saveGame()
    return { success: true, msg: `恭喜！你已成功转职为 ${JobConfig[newJob].name}！` }
}

export function increaseStat(stat, amount = 1) {
    const s = stat.toLowerCase()
    const validStats = ['str', 'agi', 'vit', 'int', 'dex', 'luk']

    if (!validStats.includes(s)) {
        return { success: false, msg: `未知属性: ${stat}` }
    }

    let cost = 0
    let currentVal = player[s]

    for (let i = 0; i < amount; i++) {
        cost += Formulas.getStatPointCost(currentVal + i)
    }

    if (player.statPoints < cost) {
        return { success: false, msg: `素质点不足 (需要: ${cost}, 剩余: ${player.statPoints})。` }
    }

    player[s] += amount
    player.statPoints -= cost

    recalculateMaxStats()
    saveGame()

    return { success: true, msg: `${s.toUpperCase()} 提升了 ${amount} 点 (消耗 ${cost} 点)` }
}

export function learnSkill(skillId, levels = 1) {
    const skill = Skills[skillId]
    if (!skill) return { success: false, msg: `技能不存在: ${skillId}` }

    if (player.skillPoints < levels) {
        return { success: false, msg: `技能点不足 (剩余: ${player.skillPoints})` }
    }

    const check = canLearnSkill(player, skillId)
    if (!check.ok) {
        return { success: false, msg: check.msg }
    }

    const currentLv = player.skills[skillId] || 0
    if (currentLv + levels > skill.maxLv) {
        return { success: false, msg: `${skill.name} 已达上限或超过上限 (Lv.${skill.maxLv})` }
    }

    player.skills[skillId] = currentLv + levels
    player.skillPoints -= levels

    recalculateMaxStats()
    saveGame()

    return { success: true, msg: `已习得技能: ${skill.name} Lv.${player.skills[skillId]}` }
}

export function equipItem(itemNameOrId) {
    let slotIndex = -1
    if (typeof itemNameOrId === 'number') {
        slotIndex = player.inventory.findIndex(i => i.id === itemNameOrId)
    } else {
        const lowerName = itemNameOrId.toLowerCase()
        slotIndex = player.inventory.findIndex(i => {
            const info = getItemInfo(i.id)
            return info.name.toLowerCase().includes(lowerName)
        })
    }

    if (slotIndex === -1) {
        return { success: false, msg: '背包中未找到该物品。' }
    }

    const invSlot = player.inventory[slotIndex]
    // Use getItemInfo for richer data (including item_db.txt) instead of just EquipDB
    const equipData = getItemInfo(invSlot.id)

    if (!equipData || (equipData.type !== ItemType.EQUIP && equipData.type !== ItemType.AMMO)) {
        return { success: false, msg: '这不是一件可装备的物品。' }
    }

    if (player.lv < equipData.reqLv) {
        return { success: false, msg: `等级不足 (需要 Lv.${equipData.reqLv})` }
    }


    // Determine target slot
    let targetSlot = equipData.subType // e.g., Weapon, Shield, Armor, etc. from dataLoader mapping

    // --- Conflict Logic: Two-handed Weapon vs Shield ---
    const isTwoHanded = [
        WeaponType.TWO_HAND_SWORD,
        WeaponType.TWO_HAND_AXE,
        WeaponType.TWO_HAND_SPEAR,
        WeaponType.TWO_HAND_STAFF,
        WeaponType.BOW,
        WeaponType.KATAR
    ].includes(targetSlot)

    if (isTwoHanded && player.equipment[EquipType.SHIELD]) {
        unequipItem(EquipType.SHIELD)
    }
    if ((targetSlot === 'Shield' || targetSlot === EquipType.SHIELD)) {
        const currentWeapon = player.equipment[EquipType.WEAPON]
        if (currentWeapon) {
            const wInfo = getItemInfo(currentWeapon.id)
            const currentIsTwoHanded = [
                WeaponType.TWO_HAND_SWORD,
                WeaponType.TWO_HAND_AXE,
                WeaponType.TWO_HAND_SPEAR,
                WeaponType.TWO_HAND_STAFF,
                WeaponType.BOW,
                WeaponType.KATAR
            ].includes(wInfo.subType)
            if (currentIsTwoHanded) {
                unequipItem(EquipType.WEAPON)
            }
        }
    }

    // Special handling for Accessories (1 or 2)
    if (targetSlot === 'Accessory') {
        if (!player.equipment[EquipType.ACCESSORY1]) targetSlot = EquipType.ACCESSORY1
        else if (!player.equipment[EquipType.ACCESSORY2]) targetSlot = EquipType.ACCESSORY2
        else targetSlot = EquipType.ACCESSORY1 // Default to 1 if both full
    } else if (targetSlot === 'Head') {
        // Default headgear to Top if not specified (should be mapped in dataLoader)
        targetSlot = EquipType.HEAD_TOP
    } else if (targetSlot === 'Weapon' || Object.values(WeaponType).includes(targetSlot)) {
        targetSlot = EquipType.WEAPON
    } else if (targetSlot === 'Shield') {
        targetSlot = EquipType.SHIELD
    }

    // Check if subType is a valid slot key
    if (!player.equipment.hasOwnProperty(targetSlot)) {
        // Try to map raw type if needed, or error out
        return { success: false, msg: `无法装备: 未知的部位类型 (${targetSlot})` }
    }

    if (player.equipment[targetSlot]) {
        // If equipping ammo, try to merge if same ID, or swap
        if (targetSlot === EquipType.AMMO) {
            const oldInstance = player.equipment[targetSlot]
            addItem(oldInstance.id, oldInstance.count || 1)
        } else {
            const oldInstance = player.equipment[targetSlot]
            addItem(oldInstance.id, 1)
        }
    }

    let equipInstance = invSlot.instance || {
        id: invSlot.id,
        cards: equipData.slots ? new Array(equipData.slots).fill(null) : []
    }

    // Special Handling for Ammo: Move ALL count
    if (targetSlot === EquipType.AMMO) {
        equipInstance.count = invSlot.count
        player.inventory.splice(slotIndex, 1)
        // No decrement logic needed as we moved everything
    } else {
        // Normal Equip: Move 1
        invSlot.count--
        if (invSlot.count <= 0) {
            player.inventory.splice(slotIndex, 1)
        }
    }

    player.equipment[targetSlot] = equipInstance

    recalculateMaxStats()
    saveGame()

    return { success: true, msg: `已装备: ${equipData.name}` }
}

export function unequipItem(type) {
    const currentInstance = player.equipment[type]
    if (!currentInstance) {
        return { success: false, msg: '该部位没有装备。' }
    }

    const info = getItemInfo(currentInstance.id)
    player.inventory.push({
        id: currentInstance.id,
        count: type === EquipType.AMMO ? (currentInstance.count || 1) : 1,
        instance: currentInstance
    })

    player.equipment[type] = null

    recalculateMaxStats()
    saveGame()

    return { success: true, msg: `已卸下: ${info.name}` }
}

export function insertCard(cardName, equipType) {
    const lowerCardName = cardName.toLowerCase()
    const cardIndex = player.inventory.findIndex(i => {
        const info = getItemInfo(i.id)
        return info.type === ItemType.CARD && info.name.toLowerCase().includes(lowerCardName)
    })

    if (cardIndex === -1) {
        return { success: false, msg: '背包中未找到该卡片。' }
    }

    const equipment = player.equipment[equipType]
    if (!equipment) {
        return { success: false, msg: '该部位没有装备。' }
    }

    const cardItem = player.inventory[cardIndex]
    const cardInfo = getItemInfo(cardItem.id)
    const equipInfo = getItemInfo(equipment.id)

    // Location compatibility check
    // Cards usually have a bitmask representing valid slots.
    // Weapons: 2, Armor: 16, Shield: 32, etc.
    // Equipment has a bitmask representing its own slot.
    if (cardInfo.location && equipInfo.location) {
        if (!(cardInfo.location & equipInfo.location)) {
            return { success: false, msg: `这张卡片无法插在此装备上 (该卡片适用于: ${cardInfo.compoundOn || '其他部位'})。` }
        }
    }

    const emptySlotIndex = equipment.cards.indexOf(null)
    if (emptySlotIndex === -1) {
        return { success: false, msg: '该装备没有剩余插槽。' }
    }

    equipment.cards[emptySlotIndex] = cardItem.id

    cardItem.count--
    if (cardItem.count <= 0) {
        player.inventory.splice(cardIndex, 1)
    }

    recalculateMaxStats()
    saveGame()

    return { success: true, msg: `已将 [${cardInfo.name}] 插入 [${equipInfo.name}]！` }
}

export function useItem(itemNameOrId) {
    let slotIndex = -1

    if (typeof itemNameOrId === 'number') {
        slotIndex = player.inventory.findIndex(i => i.id === itemNameOrId)
    } else {
        const lowerName = itemNameOrId.toLowerCase()
        slotIndex = player.inventory.findIndex(i => {
            const info = getItemInfo(i.id)
            return info.name.toLowerCase().includes(lowerName)
        })
    }

    if (slotIndex === -1 && player.config.auto_buy_potion > 0 && itemNameOrId === '红色药水') {
        const buyRes = buyItem('红色药水', 50)
        if (buyRes.success) {
            slotIndex = player.inventory.findIndex(i => i.id === 501)
        }
    }

    if (slotIndex === -1) {
        return { success: false, msg: '背包中没有该物品。' }
    }

    const invSlot = player.inventory[slotIndex]
    const info = getItemInfo(invSlot.id)

    if (info.type !== ItemType.USABLE) {
        return { success: false, msg: '该物品无法使用。' }
    }

    let effectMsg = ''
    if (info.effect) {
        const result = info.effect(player)
        if (result && result.value > 0) {
            effectMsg = `(${result.type.toUpperCase()} +${result.value})`
        }
    }

    invSlot.count--
    if (invSlot.count <= 0) {
        player.inventory.splice(slotIndex, 1)
    }

    saveGame()
    return { success: true, msg: `使用了 [${info.name}] ${effectMsg}` }
}

export function setConfig(key, value) {
    if (!player.config) player.config = {}

    if (key === 'auto_hp_percent') {
        let v = parseInt(value)
        if (isNaN(v)) v = 0
        if (v < 0) v = 0
        if (v > 100) v = 100
        player.config.auto_hp_percent = v
        saveGame()
        return { success: true, msg: `自动吃药设定为: HP < ${v}%` }
    }
    else if (key === 'auto_hp_item') {
        player.config.auto_hp_item = value
        saveGame()
        return { success: true, msg: `自动药品设定为: ${value}` }
    }
    else if (key === 'auto_buy_potion') {
        let v = parseInt(value)
        if (isNaN(v) || v < 0) v = 0
        if (v > 1) v = 1
        player.config.auto_buy_potion = v
        saveGame()
        return { success: true, msg: `自动买药 (红药水): ${v === 1 ? '开启' : '关闭'}` }
    }

    return { success: false, msg: `未知配置项: ${key}` }
}

export function warp(mapId) {
    const id = (mapId || '').toLowerCase()
    const map = Maps[id]
    if (!map) return { success: false, msg: `未知地图 ID: ${id}` }

    if (player.currentMap === id) {
        return { success: false, msg: `你已经在 ${map.name} 了。` }
    }

    player.currentMap = id
    saveGame()
    return { success: true, msg: `Warped to ${map.name}` }
}

/**
 * 设置存储点 (只有在主城可以设置)
 */
const CITIES = ['prontera', 'payon', 'morocc', 'geffen', 'alberta', 'aldebaran', 'izlude']

export function setSavePoint() {
    const currentMap = player.currentMap.toLowerCase()

    // 检查是否在城市
    const isCity = CITIES.some(city => currentMap.includes(city))

    if (!isCity) {
        return { success: false, msg: '只有在各大主城才可以设置存档点。' }
    }

    player.savePoint = {
        map: player.currentMap,
        x: Math.floor(player.x),
        y: Math.floor(player.y)
    }

    saveGame()
    return { success: true, msg: `存储点已更新至: ${Maps[player.currentMap]?.name || player.currentMap} (${Math.floor(player.savePoint.x / 20)}, ${Math.floor(player.savePoint.y / 20)})` }
}

/**
 * 死亡复活逻辑
 */
export function respawn() {
    if (!player.savePoint) {
        player.savePoint = { map: 'prontera', x: 156 * 10, y: 178 * 10 }
    }

    // 1. 恢复状态
    player.hp = player.maxHp
    player.sp = player.maxSp

    // 2. 传送回存档点
    player.currentMap = player.savePoint.map
    player.x = player.savePoint.x
    player.y = player.savePoint.y

    saveGame()
    return { success: true, msg: '你已在存储点复活，状态已恢复。' }
}

export function sellItem(itemNameOrId, count = 1) {
    // Zeny 安全性检查
    player.zeny = player.zeny || 0
    if (isNaN(player.zeny)) player.zeny = 0

    if (itemNameOrId === 'all') {
        let totalZeny = 0
        let soldCount = 0
        for (let i = player.inventory.length - 1; i >= 0; i--) {
            const slot = player.inventory[i]
            const info = getItemInfo(slot.id)
            if (info.type === ItemType.ETC) {
                const price = info.sellPrice || 0
                const earning = price * slot.count
                totalZeny += earning
                soldCount += slot.count
                player.inventory.splice(i, 1)
            }
        }
        if (soldCount > 0) {
            player.zeny += totalZeny
            saveGame()
            return { success: true, msg: `卖出了 ${soldCount} 个杂物，获得 ${totalZeny.toLocaleString()} Zeny。` }
        } else {
            return { success: false, msg: '背包里没有可贩卖的杂物。' }
        }
    }

    let slotIndex = -1
    if (typeof itemNameOrId === 'number') {
        slotIndex = player.inventory.findIndex(i => i.id === itemNameOrId)
    } else {
        const lowerName = itemNameOrId.toLowerCase()
        slotIndex = player.inventory.findIndex(i => {
            const info = getItemInfo(i.id)
            return info.name.toLowerCase().includes(lowerName)
        })
    }

    if (slotIndex === -1) {
        return { success: false, msg: '背包中没有该物品。' }
    }

    const slot = player.inventory[slotIndex]
    const info = getItemInfo(slot.id)

    if (info.type !== ItemType.ETC && info.type !== ItemType.EQUIP) {
        return { success: false, msg: '该物品暂时无法贩卖 (仅限杂物和装备)。' }
    }

    const amountToSell = Math.min(slot.count, count)
    const unitPrice = info.sellPrice || 0

    const earning = unitPrice * amountToSell
    player.zeny += earning
    slot.count -= amountToSell
    if (slot.count <= 0) {
        player.inventory.splice(slotIndex, 1)
    }

    saveGame()
    return { success: true, msg: `卖出 ${info.name} x ${amountToSell}，获得 ${earning.toLocaleString()} Zeny。` }
}

const ShopList = [
    { id: 501, price: 50 },
]

export function getShopList() {
    return ShopList.map(item => {
        const info = getItemInfo(item.id)
        return { ...info, price: item.price }
    })
}

export function buyItem(itemName, count = 1) {
    const lowerName = itemName.toLowerCase()
    const shopItem = ShopList.find(item => {
        const info = getItemInfo(item.id)
        return info.name.toLowerCase().includes(lowerName)
    })

    if (!shopItem) {
        return { success: false, msg: '商店里没有这个商品。' }
    }

    const totalCost = shopItem.price * count
    if (player.zeny < totalCost) {
        return { success: false, msg: `Zeny 不足 (需要 ${totalCost.toLocaleString()}, 拥有 ${player.zeny.toLocaleString()})。` }
    }

    player.zeny -= totalCost
    addItem(shopItem.id, count)

    saveGame()

    const info = getItemInfo(shopItem.id)
    return { success: true, msg: `购买了 ${info.name} x ${count}，花费 ${totalCost.toLocaleString()} Zeny。` }
}
