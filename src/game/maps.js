import { reactive } from 'vue'

const CELL_SIZE = 10

export const Maps = reactive({
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
    },
    'test_lv1': { id: 'test_lv1', name: '试练场 Lv.1-10', width: 400 * CELL_SIZE, height: 400 * CELL_SIZE, minLv: 1, maxLv: 10 },
    'test_lv11': { id: 'test_lv11', name: '试练场 Lv.11-20', width: 400 * CELL_SIZE, height: 400 * CELL_SIZE, minLv: 11, maxLv: 20 },
    'test_lv21': { id: 'test_lv21', name: '试练场 Lv.21-30', width: 400 * CELL_SIZE, height: 400 * CELL_SIZE, minLv: 21, maxLv: 30 },
    'test_lv31': { id: 'test_lv31', name: '试练场 Lv.31-40', width: 400 * CELL_SIZE, height: 400 * CELL_SIZE, minLv: 31, maxLv: 40 },
    'test_lv41': { id: 'test_lv41', name: '试练场 Lv.41-50', width: 500 * CELL_SIZE, height: 500 * CELL_SIZE, minLv: 41, maxLv: 50 },
    'test_lv51': { id: 'test_lv51', name: '试练场 Lv.51-60', width: 500 * CELL_SIZE, height: 500 * CELL_SIZE, minLv: 51, maxLv: 60 },
    'test_lv61': { id: 'test_lv61', name: '试练场 Lv.61-70', width: 600 * CELL_SIZE, height: 600 * CELL_SIZE, minLv: 61, maxLv: 70 },
    'test_lv71': { id: 'test_lv71', name: '试练场 Lv.71-80', width: 600 * CELL_SIZE, height: 600 * CELL_SIZE, minLv: 71, maxLv: 80 },
    'test_lv81': { id: 'test_lv81', name: '试练场 Lv.81-90', width: 800 * CELL_SIZE, height: 800 * CELL_SIZE, minLv: 81, maxLv: 90 },
    'test_lv91': { id: 'test_lv91', name: '试练场 Lv.91-100', width: 800 * CELL_SIZE, height: 800 * CELL_SIZE, minLv: 91, maxLv: 100 }
})

export function getMapInfo(mapId) {
    const id = (mapId || '').toLowerCase()
    return Maps[id] || Maps['prt_fild08']
}

/**
 * 动态注册地图 (由 dataLoader 调用)
 * 仅保存地图元数据，不再包含刷怪配置
 */
export function registerMap(mapId, mapInfo) {
    const id = mapId.toLowerCase()
    if (!Maps[id]) {
        Maps[id] = {
            id: id,
            name: mapInfo.name || id,
            width: (mapInfo.width || 400) * CELL_SIZE,
            height: (mapInfo.height || 400) * CELL_SIZE,
            minLv: mapInfo.minLv || 1,
            maxLv: mapInfo.maxLv || 99
        }
    } else if (Maps[id].name === id && mapInfo.name && mapInfo.name !== id) {
        // 如果已存在的地图只有 ID 没有名字，则尝试更新名字
        Maps[id].name = mapInfo.name
    }
}
