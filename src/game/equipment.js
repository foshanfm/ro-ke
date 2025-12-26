// src/game/equipment.js

export const EquipType = {
    WEAPON: 'Weapon',
    SHIELD: 'Shield',
    ARMOR: 'Armor',
    HEAD: 'Head',
    ACCESSORY: 'Accessory'
}

// 武器类型 (用于技能判定)
export const WeaponType = {
    DAGGER: 'Dagger', // 短剑
    SWORD: 'Sword',   // 单手剑
    BOW: 'Bow',       // 弓
    ROD: 'Rod',       // 杖
    NONE: 'None'      // 空手
}

export const EquipDB = {
    // --- Weapons ---
    1201: {
        id: 1201,
        name: '短剑',
        type: EquipType.WEAPON,
        subType: WeaponType.DAGGER,
        atk: 17,
        weight: 40,
        reqLv: 1,
        slots: 0,
        desc: '新手常用的小刀。'
    },
    1202: { 
        id: 1202, 
        name: '短剑 [3]',
        type: EquipType.WEAPON,
        subType: WeaponType.DAGGER,
        atk: 17,
        weight: 40,
        reqLv: 1,
        slots: 3,
        desc: '有插槽的短剑。' 
    },
    // --- Shields ---
    2101: {
        id: 2101,
        name: '圆盾',
        type: EquipType.SHIELD,
        def: 2,
        weight: 30,
        reqLv: 1,
        slots: 0,
        price: 500,
        desc: '初学者也能使用的简易盾牌。'
    },
    // --- Armors ---
    2301: {
        id: 2301,
        name: '棉衬衫',
        type: EquipType.ARMOR,
        def: 1,
        weight: 10,
        reqLv: 1,
        slots: 0,
        desc: '棉制的轻便衬衫。'
    }
}

export function getEquipInfo(id) {
    return EquipDB[id] || null
}
