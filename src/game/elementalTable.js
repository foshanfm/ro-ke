// src/game/elementalTable.js
// 属性克制系统 - Elemental Damage Modifier Table
// Based on rAthena's attr_fix.txt

/**
 * 属性枚举 (Element Types)
 */
export const Element = {
    NEUTRAL: 0,  // 无
    WATER: 1,    // 水
    EARTH: 2,    // 地
    FIRE: 3,     // 火
    WIND: 4,     // 风
    POISON: 5,   // 毒
    HOLY: 6,     // 圣
    DARK: 7,     // 暗
    GHOST: 8,    // 念
    UNDEAD: 9    // 不死
}

/**
 * 属性名称映射
 */
export const ElementNames = {
    [Element.NEUTRAL]: '无属性',
    [Element.WATER]: '水',
    [Element.EARTH]: '地',
    [Element.FIRE]: '火',
    [Element.WIND]: '风',
    [Element.POISON]: '毒',
    [Element.HOLY]: '圣',
    [Element.DARK]: '暗',
    [Element.GHOST]: '念',
    [Element.UNDEAD]: '不死'
}

/**
 * 属性伤害修正表 (Elemental Damage Modifier Table)
 * 
 * 格式: [攻击者属性][防御者属性等级][防御者属性]
 * 
 * 每一行: 攻击者的属性
 * 每一列: 防御者的属性
 * 每个元素: 伤害修正百分比 (100 = 100%, 150 = 150%, 25 = 25%)
 * 
 * 例如:
 * - 水属性攻击火属性1级怪物: 150% 伤害
 * - 火属性攻击水属性1级怪物: 90% 伤害
 */
const ELEMENTAL_TABLE = {
    // Level 1 防御者
    1: [
        // 攻击者属性 -> [无, 水, 地, 火, 风, 毒, 圣, 暗, 念, 不死]
        [100, 100, 100, 100, 100, 100, 100, 100, 70, 100],  // 无属性攻击
        [100, 25, 100, 150, 90, 100, 75, 100, 100, 100],  // 水属性攻击
        [100, 100, 25, 90, 150, 100, 75, 100, 100, 100],  // 地属性攻击
        [100, 90, 150, 25, 100, 100, 75, 100, 100, 125],  // 火属性攻击
        [100, 175, 90, 100, 25, 100, 75, 100, 100, 100],  // 风属性攻击
        [100, 100, 125, 125, 125, 0, 75, 50, 100, -25],  // 毒属性攻击
        [100, 100, 100, 100, 100, 100, 0, 125, 100, 150],  // 圣属性攻击
        [100, 100, 100, 100, 100, 50, 125, 0, 100, -25],  // 暗属性攻击
        [70, 100, 100, 100, 100, 100, 75, 75, 125, 100],  // 念属性攻击
        [100, 100, 100, 100, 100, 50, 100, 0, 100, 0],  // 不死属性攻击
    ],

    // Level 2 防御者
    2: [
        [100, 100, 100, 100, 100, 100, 100, 100, 50, 100],  // 无属性攻击
        [100, 0, 100, 175, 80, 100, 50, 75, 100, 100],  // 水属性攻击
        [100, 100, 0, 80, 175, 100, 50, 75, 100, 100],  // 地属性攻击
        [100, 80, 175, 0, 100, 100, 50, 75, 100, 150],  // 火属性攻击
        [100, 175, 80, 100, 0, 100, 50, 75, 100, 100],  // 风属性攻击
        [100, 75, 125, 125, 125, 0, 50, 25, 75, -50],  // 毒属性攻击
        [100, 100, 100, 100, 100, 100, -25, 150, 100, 175],  // 圣属性攻击
        [100, 100, 100, 100, 100, 25, 150, -25, 100, -50],  // 暗属性攻击
        [50, 75, 75, 75, 75, 75, 50, 50, 150, 125],  // 念属性攻击
        [100, 75, 75, 75, 75, 25, 125, 0, 100, 0],  // 不死属性攻击
    ],

    // Level 3 防御者
    3: [
        [100, 100, 100, 100, 100, 100, 100, 100, 0, 100],  // 无属性攻击
        [100, -25, 100, 200, 70, 100, 25, 50, 100, 125],  // 水属性攻击
        [100, 100, -25, 70, 200, 100, 25, 50, 100, 100],  // 地属性攻击
        [100, 70, 200, -25, 100, 100, 25, 50, 100, 175],  // 火属性攻击
        [100, 200, 70, 100, -25, 100, 25, 50, 100, 100],  // 风属性攻击
        [100, 50, 100, 100, 100, 0, 25, 0, 50, -75],  // 毒属性攻击
        [100, 100, 100, 100, 100, 125, -50, 175, 100, 200],  // 圣属性攻击
        [100, 100, 100, 100, 100, 0, 175, -50, 100, -75],  // 暗属性攻击
        [0, 50, 50, 50, 50, 50, 25, 25, 175, 150],  // 念属性攻击
        [100, 50, 50, 50, 50, 0, 150, 0, 100, 0],  // 不死属性攻击
    ],

    // Level 4 防御者
    4: [
        [100, 100, 100, 100, 100, 100, 100, 100, 0, 100],  // 无属性攻击
        [100, -50, 100, 200, 60, 75, 0, 25, 100, 150],  // 水属性攻击
        [100, 100, -50, 60, 200, 75, 0, 25, 100, 50],  // 地属性攻击
        [100, 60, 200, -50, 100, 75, 0, 25, 100, 200],  // 火属性攻击
        [100, 200, 60, 100, -50, 75, 0, 25, 100, 100],  // 风属性攻击
        [100, 25, 75, 75, 75, 0, 0, -25, 25, -100],  // 毒属性攻击
        [100, 75, 75, 75, 75, 125, -100, 200, 100, 200],  // 圣属性攻击
        [100, 75, 75, 75, 75, -25, 200, -100, 100, -100],  // 暗属性攻击
        [0, 25, 25, 25, 25, 25, 0, 0, 200, 175],  // 念属性攻击
        [100, 25, 25, 25, 25, -25, 175, 0, 100, 0],  // 不死属性攻击
    ]
}

/**
 * 获取属性伤害修正
 * @param {number} attackerElement - 攻击者属性 (0-9)
 * @param {number} defenderElement - 防御者属性 (0-9)
 * @param {number} defenderElementLevel - 防御者属性等级 (1-4)
 * @returns {number} 伤害修正百分比 (100 = 100%)
 */
export function getElementalModifier(attackerElement, defenderElement, defenderElementLevel = 1) {
    // 参数验证
    if (attackerElement < 0 || attackerElement > 9) attackerElement = Element.NEUTRAL
    if (defenderElement < 0 || defenderElement > 9) defenderElement = Element.NEUTRAL
    if (defenderElementLevel < 1 || defenderElementLevel > 4) defenderElementLevel = 1

    // 查表
    const levelTable = ELEMENTAL_TABLE[defenderElementLevel]
    if (!levelTable || !levelTable[attackerElement]) {
        return 100 // 默认无修正
    }

    return levelTable[attackerElement][defenderElement]
}

/**
 * 解析属性代码 (从 mob_db.txt 的 Element 字段)
 * 格式: XY (X = 属性, Y = 等级)
 * 例如: 21 = 水属性1级, 43 = 火属性3级
 * 
 * @param {number} elementCode - 属性代码
 * @returns {{ element: number, level: number }}
 */
export function parseElementCode(elementCode) {
    if (!elementCode || elementCode === 0) {
        return { element: Element.NEUTRAL, level: 1 }
    }

    const element = Math.floor(elementCode / 10)
    const level = elementCode % 10

    return {
        element: element >= 0 && element <= 9 ? element : Element.NEUTRAL,
        level: level >= 1 && level <= 4 ? level : 1
    }
}
