// src/game/maps.js

export const Maps = {
    'prt_fild08': {
        id: 'prt_fild08',
        name: '普隆德拉南门',
        minLv: 1,
        maxLv: 5,
        monsters: [
            { id: 1001, rate: 0.5 },  // 波利 50%
            { id: 1002, rate: 0.3 },  // 绿棉虫 30%
            { id: 1004, rate: 0.15 }, // 疯兔 15%
            { id: 1003, rate: 0.05 }  // 虫蛹 5%
        ]
    },
    'prt_fild06': {
        id: 'prt_fild06',
        name: '普隆德拉西门', 
        minLv: 3,
        maxLv: 7,
        monsters: [
            { id: 1005, rate: 0.35 }, // 小鸡 35%
            { id: 1006, rate: 0.3 },  // 苍蝇 30%
            { id: 1010, rate: 0.2 },  // 盗虫 20%
            { id: 1001, rate: 0.15 }  // 波利 15%
        ]
    },
    'pay_fild04': {
        id: 'pay_fild04',
        name: '斐扬树林', 
        minLv: 5,
        maxLv: 10,
        monsters: [
            { id: 1007, rate: 0.4 },  // 树木精 40%
            { id: 1002, rate: 0.3 },  // 绿棉虫 30%
            { id: 1011, rate: 0.2 },  // 大嘴鸟蛋 20%
            { id: 1001, rate: 0.1 }   // 波利 10%
        ]
    },
    'moc_fild12': {
        id: 'moc_fild12',
        name: '梦罗克沙漠',
        minLv: 7,
        maxLv: 12,
        monsters: [
            { id: 1009, rate: 0.4 },  // 秃鹰 40%
            { id: 1005, rate: 0.3 },  // 小鸡 30%
            { id: 1011, rate: 0.2 },  // 大嘴鸟蛋 20%
            { id: 1008, rate: 0.1 }   // 小野猪 10%
        ]
    },
    'prt_sewb1': {
        id: 'prt_sewb1',
        name: '普隆德拉下水道1F',
        minLv: 9,
        maxLv: 15,
        monsters: [
            { id: 1010, rate: 0.6 },  // 盗虫 60%
            { id: 1006, rate: 0.3 },  // 苍蝇 30%
            { id: 1001, rate: 0.1 }   // 波利 10% (偶尔迷路的)
        ]
    }
}

export function getMapInfo(mapId) {
    return Maps[mapId] || Maps['prt_fild08']
}
