// src/db/index.js
// IndexedDB 数据库定义 (使用 Dexie.js)

import Dexie from 'dexie';

// 数据库版本号 - 用于控制数据迁移和缓存失效
// 注意:每次修改 schema 时必须增加版本号
const DB_VERSION = 2;

// 创建数据库实例
export const db = new Dexie('RO_Idle_Bot');

// 定义数据库架构
db.version(DB_VERSION).stores({
    // 静态数据表 - 缓存解析后的物品和怪物数据
    // key: 数据类型 ('items' 或 'monsters')
    // version: 数据版本号,用于判断是否需要重新解析
    // data: 解析后的数据对象
    // updatedAt: 最后更新时间戳
    static_data: 'key, version, updatedAt',

    // 存档表 - 存储玩家存档
    // id: 存档唯一标识 (手动分配,使用时间戳)
    // name: 角色名称
    // data: 完整的玩家状态对象
    // createdAt: 创建时间戳
    // updatedAt: 最后保存时间戳
    saves: 'id, name, createdAt, updatedAt'
});

// 导出数据库实例
export default db;

// 辅助函数：获取静态数据
export async function getStaticData(key) {
    const record = await db.static_data.get(key);
    return record ? record.data : null;
}

// 辅助函数：设置静态数据
export async function setStaticData(key, data, version = DB_VERSION) {
    await db.static_data.put({
        key,
        data,
        version,
        updatedAt: Date.now()
    });
}

// 辅助函数：检查静态数据是否需要更新
export async function isStaticDataStale(key, currentVersion = DB_VERSION) {
    const record = await db.static_data.get(key);
    if (!record) return true;
    return record.version !== currentVersion;
}

// 辅助函数：获取所有存档列表
export async function getAllSaves() {
    return await db.saves.orderBy('updatedAt').reverse().toArray();
}

// 辅助函数：获取指定存档
export async function getSave(id) {
    return await db.saves.get(id);
}

// 辅助函数:保存存档
export async function saveSave(saveData) {
    const now = Date.now();

    console.log('[DB] saveSave 调用, saveData.id:', saveData.id)
    console.log('[DB] saveData 完整结构:', saveData)

    try {
        if (saveData.id) {
            // 更新现有存档
            console.log('[DB] 更新现有存档, ID:', saveData.id)
            const result = await db.saves.put({
                ...saveData,
                updatedAt: now
            });
            console.log('[DB] 更新成功, 返回值:', result)
            return saveData.id;
        } else {
            // 创建新存档 - 使用时间戳作为 ID
            const newId = now;
            console.log('[DB] 创建新存档, 新 ID:', newId)
            const result = await db.saves.put({
                ...saveData,
                id: newId,
                createdAt: now,
                updatedAt: now
            });
            console.log('[DB] 创建成功, 返回值:', result)
            return newId;
        }
    } catch (error) {
        console.error('[DB] saveSave 失败 - 错误类型:', error.name)
        console.error('[DB] saveSave 失败 - 错误信息:', error.message)
        console.error('[DB] saveSave 失败 - 错误代码:', error.code)
        console.error('[DB] saveSave 失败 - 完整错误:', error)
        throw error;
    }
}

// 辅助函数：删除存档
export async function deleteSave(id) {
    await db.saves.delete(id);
}
