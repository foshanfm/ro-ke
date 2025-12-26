// src/game/maps.js

export const Maps = {
    'prt_fild08': {
        id: 'prt_fild08',
        name: '普隆德拉南门',
        width: 400,
        height: 400,
        spawnRate: 15, // 地图最大怪物数量
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
        width: 350,
        height: 350,
        spawnRate: 12,
        minLv: 3,
        maxLv: 7,
        monsters: [
            { id: 1005, rate: 0.35 }, 
            { id: 1006, rate: 0.3 },  
            { id: 1010, rate: 0.2 },  
            { id: 1001, rate: 0.15 }  
        ]
    },
    'pay_fild04': {
        id: 'pay_fild04',
        name: '斐扬树林', 
        width: 500,
        height: 500,
        spawnRate: 20,
        minLv: 5,
        maxLv: 10,
        monsters: [
            { id: 1007, rate: 0.4 },  
            { id: 1002, rate: 0.3 },  
            { id: 1011, rate: 0.2 },  
            { id: 1001, rate: 0.1 }   
        ]
    },
    'moc_fild12': {
        id: 'moc_fild12',
        name: '梦罗克沙漠',
        width: 450,
        height: 450,
        spawnRate: 18,
        minLv: 7,
        maxLv: 12,
        monsters: [
            { id: 1009, rate: 0.4 },  
            { id: 1005, rate: 0.3 },  
            { id: 1011, rate: 0.2 },  
            { id: 1008, rate: 0.1 }   
        ]
    },
    'prt_sewb1': {
        id: 'prt_sewb1',
        name: '普隆德拉下水道1F',
        width: 300,
        height: 300,
        spawnRate: 25,
        minLv: 9,
        maxLv: 15,
        monsters: [
            { id: 1010, rate: 0.6 },  
            { id: 1006, rate: 0.3 },  
            { id: 1001, rate: 0.1 }   
        ]
    }
}

export function getMapInfo(mapId) {
    return Maps[mapId] || Maps['prt_fild08']
}
