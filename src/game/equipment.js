export const EquipType = {
    WEAPON: 'Weapon',
    SHIELD: 'Shield',
    HEAD_TOP: 'HeadTop',
    HEAD_MID: 'HeadMid',
    HEAD_LOW: 'HeadLow',
    ARMOR: 'Armor',
    GARMENT: 'Garment',
    FOOTGEAR: 'Footgear',
    ACCESSORY1: 'Accessory1',
    ACCESSORY2: 'Accessory2',
    AMMO: 'Ammo'
}


// 武器类型 (用于技能判定和攻速计算)
export const WeaponType = {
    NONE: 'NONE',                     // 空手
    DAGGER: 'DAGGER',                 // 短剑
    SWORD: 'SWORD',                   // 单手剑
    TWO_HAND_SWORD: 'TWO_HAND_SWORD', // 双手剑
    AXE: 'AXE',                       // 斧
    TWO_HAND_AXE: 'TWO_HAND_AXE',     // 双手斧
    MACE: 'MACE',                     // 钝器
    SPEAR: 'SPEAR',                   // 长矛
    TWO_HAND_SPEAR: 'TWO_HAND_SPEAR', // 双手矛
    STAFF: 'STAFF',                   // 法杖
    TWO_HAND_STAFF: 'TWO_HAND_STAFF', // 双手杖
    BOW: 'BOW',                       // 弓
    KNUCKLE: 'KNUCKLE',               // 拳套
    KATAR: 'KATAR',                   // 拳刃
    INSTRUMENT: 'INSTRUMENT',         // 乐器
    WHIP: 'WHIP',                     // 鞭子
    BOOK: 'BOOK',                     // 书
    ROD: 'ROD'                        // 杖 (向后兼容，映射到 STAFF)
}

// 武器攻击距离表 (单位: 格子/Cells)
export const WeaponRangeTable = {
    [WeaponType.NONE]: 1,
    [WeaponType.DAGGER]: 1,
    [WeaponType.SWORD]: 1,
    [WeaponType.TWO_HAND_SWORD]: 1,
    [WeaponType.AXE]: 1,
    [WeaponType.TWO_HAND_AXE]: 1,
    [WeaponType.MACE]: 1,
    [WeaponType.SPEAR]: 3,           // 长矛优势：3格
    [WeaponType.TWO_HAND_SPEAR]: 3,
    [WeaponType.STAFF]: 1,
    [WeaponType.TWO_HAND_STAFF]: 1,
    [WeaponType.BOW]: 5,             // 弓基础 5 格 (加上苍鹰之眼最高 15)
    [WeaponType.KNUCKLE]: 1,
    [WeaponType.KATAR]: 1,
    [WeaponType.INSTRUMENT]: 3,      // 乐器/鞭子 3格
    [WeaponType.WHIP]: 3,
    [WeaponType.BOOK]: 1,
    [WeaponType.ROD]: 1
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
        subType: 'Armor',
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
