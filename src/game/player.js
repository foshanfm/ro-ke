import { reactive, watch } from 'vue'
import { JobType, JobConfig, getNextBaseExp, getNextJobExp } from './jobs'
import { Skills, canLearnSkill } from './skills'
import { EquipDB, EquipType, WeaponType } from './equipment'
import { getItemInfo, ItemType } from './items'
import { Maps } from './maps'
import * as Formulas from './formulas'

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
        [EquipType.ARMOR]: null,
        [EquipType.HEAD]: null,
        [EquipType.ACCESSORY]: null
    },
    config: {
        auto_hp_percent: 0,
        auto_hp_item: '红色药水',
        auto_buy_potion: 0
    },
    currentMap: 'prt_fild08',
    hp: 100, maxHp: 100, sp: 20, maxSp: 20,
    atk: 0, matk: 0, def: 0, mdef: 0, hit: 0, flee: 0, crit: 0, aspd: 0, moveSpeed: 5,
    str: 1, agi: 1, dex: 1, vit: 1, int: 1, luk: 1,
    inventory: []
}

export const player = reactive({ ...defaultStats })

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
        atk: 0, def: 0, hp: 0, sp: 0, crit: 0, flee: 0
    }

    if (player.equipment) {
        Object.values(player.equipment).forEach(instance => {
            if (!instance) return
            const e = EquipDB[instance.id]
            if (!e) return

            if (e.type === EquipType.WEAPON) {
                weaponAtk = e.atk || 0
                weaponType = e.subType || WeaponType.NONE
            }
            if (e.type === EquipType.SHIELD) {
                hasShield = true
            }
            if (e.def) equipDef += e.def

            // 收集装备的 ASPD 加成 (如果装备数据中定义了)
            if (e.aspdRate) aspdModifiers.equipRate += e.aspdRate
            if (e.aspdFlat) aspdModifiers.flatBonus += e.aspdFlat

            if (instance.cards) {
                instance.cards.forEach(cardId => {
                    if (!cardId) return
                    if (cardId === 4001) bonus.luk += 2
                    if (cardId === 4002) { bonus.vit += 1; bonus.hp += 100 }
                    if (cardId === 4005) { bonus.luk += 2; bonus.crit += 2 }
                })
            }
        })
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
    player.matk = Formulas.calcMatk(baseLv, finalInt, finalDex, finalLuk)
    player.def = Formulas.calcDef(baseLv, finalVit, finalAgi, equipDef + bonus.def)
    player.mdef = Formulas.calcMdef(baseLv, finalInt, finalVit, finalDex)
    player.hit = Formulas.calcHit(baseLv, finalDex, finalLuk)

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

    // 计算移动速度
    player.moveSpeed = Formulas.calcMoveSpeed(finalAgi, 0, equipMoveSpeedBonus)
}

const SAVE_KEY = 'ro_ke_save_v2'

export function saveGame() {
    localStorage.setItem(SAVE_KEY, JSON.stringify(player))
}

export function loadGame() {
    const savedData = localStorage.getItem(SAVE_KEY)
    if (savedData) {
        try {
            const parsed = JSON.parse(savedData)

            if (parsed.equipment) {
                Object.keys(parsed.equipment).forEach(slot => {
                    const val = parsed.equipment[slot]
                    if (val !== null && typeof val !== 'object') {
                        const info = EquipDB[val]
                        parsed.equipment[slot] = {
                            id: val,
                            cards: info && info.slots ? new Array(info.slots).fill(null) : []
                        }
                    }
                })
            }

            Object.assign(player, parsed)

            if (!player.inventory) player.inventory = []

            // 兼容性处理：将旧的职业枚举值转换为新格式
            const jobMapping = {
                'Novice': 'NOVICE',
                'Swordman': 'SWORDMAN',
                'Mage': 'MAGICIAN',
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
            if (player.zeny === undefined) player.zeny = 0

            if (!player.equipment) {
                player.equipment = {
                    [EquipType.WEAPON]: null,
                    [EquipType.SHIELD]: null,
                    [EquipType.ARMOR]: null,
                    [EquipType.HEAD]: null,
                    [EquipType.ACCESSORY]: null
                }
            }

            const keys = ['str', 'agi', 'dex', 'vit', 'int', 'luk']
            keys.forEach(k => {
                if (player[k] === undefined || player[k] === null || isNaN(player[k])) {
                    player[k] = 1
                }
            })

            player.nextExp = getNextBaseExp(player.lv)
            player.nextJobExp = getNextJobExp(player.jobLv)
            recalculateMaxStats()

            console.log('[System] Save loaded successfully.')
            return true
        } catch (e) {
            console.error('[System] Save file corrupted, resetting.', e)
            return false
        }
    }
    return false
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

export function addExp(baseAmount, jobAmount) {
    let leveledUp = false
    let jobLeveledUp = false

    player.exp += baseAmount
    if (player.exp >= player.nextExp) {
        player.lv++
        player.exp -= player.nextExp
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
        player.jobExp += jobAmount
        if (player.jobExp >= player.nextJobExp) {
            player.jobLv++
            player.jobExp -= player.nextJobExp
            player.nextJobExp = getNextJobExp(player.jobLv)
            player.skillPoints++

            jobLeveledUp = true
        }
    }

    return { leveledUp, jobLeveledUp }
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
    const equipData = EquipDB[invSlot.id]

    if (!equipData) {
        return { success: false, msg: '这不是一件可装备的物品。' }
    }

    if (player.lv < equipData.reqLv) {
        return { success: false, msg: `等级不足 (需要 Lv.${equipData.reqLv})` }
    }

    const type = equipData.type

    if (player.equipment[type]) {
        const oldInstance = player.equipment[type]
        addItem(oldInstance.id, 1)
    }

    player.equipment[type] = invSlot.instance || {
        id: invSlot.id,
        cards: equipData.slots ? new Array(equipData.slots).fill(null) : []
    }

    invSlot.count--
    if (invSlot.count <= 0) {
        player.inventory.splice(slotIndex, 1)
    }

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
        count: 1,
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

    const emptySlotIndex = equipment.cards.indexOf(null)
    if (emptySlotIndex === -1) {
        return { success: false, msg: '该装备没有剩余插槽。' }
    }

    const cardItem = player.inventory[cardIndex]
    equipment.cards[emptySlotIndex] = cardItem.id

    cardItem.count--
    if (cardItem.count <= 0) {
        player.inventory.splice(cardIndex, 1)
    }

    recalculateMaxStats()
    saveGame()

    const cardInfo = getItemInfo(cardItem.id)
    const equipInfo = getItemInfo(equipment.id)
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
        const val = info.effect(player)
        if (val > 0) {
            effectMsg = `(HP +${val})`
        }
    } else {
        return { success: false, msg: '物品没有任何效果。' }
    }

    invSlot.count--
    if (invSlot.count <= 0) {
        player.inventory.splice(slotIndex, 1)
    }

    saveGame()
    return { success: true, msg: `使用了 ${info.name} ${effectMsg}` }
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
    const map = Maps[mapId]
    if (!map) return { success: false, msg: `未知地图 ID: ${mapId}` }

    if (player.currentMap === mapId) {
        return { success: false, msg: `你已经在 ${map.name} 了。` }
    }

    player.currentMap = mapId
    saveGame()
    return { success: true, msg: `Warped to ${map.name}` }
}

export function sellItem(itemNameOrId, count = 1) {
    if (itemNameOrId === 'all') {
        let totalZeny = 0
        let soldCount = 0
        for (let i = player.inventory.length - 1; i >= 0; i--) {
            const slot = player.inventory[i]
            const info = getItemInfo(slot.id)
            if (info.type === ItemType.ETC) {
                const price = info.price || 0
                const earning = price * slot.count
                totalZeny += earning
                soldCount += slot.count
                player.inventory.splice(i, 1)
            }
        }
        if (soldCount > 0) {
            player.zeny += totalZeny
            saveGame()
            return { success: true, msg: `卖出了 ${soldCount} 个杂物，获得 ${totalZeny} Zeny。` }
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
    const unitPrice = info.price || 100

    player.zeny += unitPrice * amountToSell
    slot.count -= amountToSell
    if (slot.count <= 0) {
        player.inventory.splice(slotIndex, 1)
    }

    saveGame()
    return { success: true, msg: `卖出 ${info.name} x ${amountToSell}，获得 ${unitPrice * amountToSell} Zeny。` }
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
        return { success: false, msg: `Zeny 不足 (需要 ${totalCost}, 拥有 ${player.zeny})。` }
    }

    player.zeny -= totalCost
    addItem(shopItem.id, count)

    saveGame()

    const info = getItemInfo(shopItem.id)
    return { success: true, msg: `购买了 ${info.name} x ${count}。` }
}
