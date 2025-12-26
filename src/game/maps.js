// src/game/maps.js
// 地图元数据 - 仅包含地图基础信息，刷怪数据现在从 spawnData 加载

const CELL_SIZE = 10

export const Maps = {
    'prt_fild08': {
        id: 'prt_fild08',
        name: '普隆德拉南门',
        width: 400 * CELL_SIZE,
        height: 400 * CELL_SIZE,
        minLv: 1,
        maxLv: 5
    },
    'prt_fild06': {
        id: 'prt_fild06',
        name: '普隆德拉西门',
        width: 350 * CELL_SIZE,
        height: 350 * CELL_SIZE,
        minLv: 3,
        maxLv: 7
    },
    'pay_fild04': {
        id: 'pay_fild04',
        name: '斐扬树林',
        width: 500 * CELL_SIZE,
        height: 500 * CELL_SIZE,
        minLv: 5,
        maxLv: 10
    },
    'moc_fild12': {
        id: 'moc_fild12',
        name: '梦罗克沙漠',
        width: 450 * CELL_SIZE,
        height: 450 * CELL_SIZE,
        minLv: 7,
        maxLv: 12
    },
    'prt_sewb1': {
        id: 'prt_sewb1',
        name: '普隆德拉下水道1F',
        width: 300 * CELL_SIZE,
        height: 300 * CELL_SIZE,
        minLv: 9,
        maxLv: 15
    }
}

export function getMapInfo(mapId) {
    return Maps[mapId] || Maps['prt_fild08']
}

/**
 * 动态注册地图 (由 dataLoader 调用)
 * 仅保存地图元数据，不再包含刷怪配置
 */
export function registerMap(mapId, mapInfo) {
    if (!Maps[mapId]) {
        Maps[mapId] = {
            id: mapId,
            name: mapInfo.name || mapId,
            width: (mapInfo.width || 400) * CELL_SIZE,
            height: (mapInfo.height || 400) * CELL_SIZE,
            minLv: mapInfo.minLv || 1,
            maxLv: mapInfo.maxLv || 99
        }
    }
}
