// src/game/DataManager.js
// 数据管理器 - 负责静态数据的缓存和异步加载

import { getStaticData, setStaticData, isStaticDataStale } from '../db/index.js';
import { loadItemDB, loadMobDB, loadSpawnData, loadWarpData } from './dataLoader.js';

// 数据版本号 - 当数据文件更新时,增加此版本号以触发重新解析
const DATA_VERSION = 1;

// 内存缓存
let itemsCache = null;
let mobsCache = null;
let spawnCache = null;
let warpCache = null;

/**
 * 初始化游戏数据
 * 优先从 IndexedDB 加载,如果不存在或版本过期则重新解析并缓存
 */
export async function initializeGameData(maxLevel = 20) {
    console.log('[DataManager] 开始初始化游戏数据...');

    // 检查是否需要重新加载物品数据
    const itemsStale = await isStaticDataStale('items', DATA_VERSION);
    if (itemsStale) {
        console.log('[DataManager] 物品数据缓存过期,重新解析...');
        itemsCache = await loadItemDB();
        await setStaticData('items', itemsCache, DATA_VERSION);
    } else {
        console.log('[DataManager] 从缓存加载物品数据...');
        itemsCache = await getStaticData('items');
    }

    // 检查是否需要重新加载怪物数据
    const mobsStale = await isStaticDataStale('monsters', DATA_VERSION);
    if (mobsStale) {
        console.log('[DataManager] 怪物数据缓存过期,重新解析...');
        mobsCache = await loadMobDB(maxLevel);
        await setStaticData('monsters', mobsCache, DATA_VERSION);
    } else {
        console.log('[DataManager] 从缓存加载怪物数据...');
        mobsCache = await getStaticData('monsters');
    }

    // 刷怪数据依赖怪物数据,总是重新加载 (文件较小)
    console.log('[DataManager] 加载刷怪数据...');
    spawnCache = await loadSpawnData(mobsCache, maxLevel);

    // 传送点数据总是重新加载 (文件较小)
    console.log('[DataManager] 加载传送点数据...');
    warpCache = await loadWarpData();

    console.log('[DataManager] 游戏数据初始化完成');
    console.log(`  - 物品: ${Object.keys(itemsCache).length} 个`);
    console.log(`  - 怪物: ${Object.keys(mobsCache).length} 个`);
    console.log(`  - 地图: ${Object.keys(spawnCache).length} 个`);
    console.log(`  - 传送点: ${Object.values(warpCache).reduce((sum, arr) => sum + arr.length, 0)} 个`);

    return {
        itemsDB: itemsCache,
        mobsDB: mobsCache,
        spawnData: spawnCache,
        warpDB: warpCache
    };
}

/**
 * 获取物品信息
 */
export function getItemInfo(itemId) {
    if (!itemsCache) {
        console.error('[DataManager] 物品数据未初始化');
        return null;
    }
    return itemsCache[itemId] || null;
}

/**
 * 获取怪物信息
 */
export function getMonsterInfo(monsterId) {
    if (!mobsCache) {
        console.error('[DataManager] 怪物数据未初始化');
        return null;
    }
    return mobsCache[monsterId] || null;
}

/**
 * 获取地图刷怪信息
 */
export function getSpawnInfo(mapId) {
    if (!spawnCache) {
        console.error('[DataManager] 刷怪数据未初始化');
        return null;
    }
    return spawnCache[mapId] || null;
}

/**
 * 获取所有物品
 */
export function getAllItems() {
    return itemsCache || {};
}

/**
 * 获取所有怪物
 */
export function getAllMonsters() {
    return mobsCache || {};
}

/**
 * 获取所有地图
 */
export function getAllSpawns() {
    return spawnCache || {};
}

/**
 * 获取地图传送点信息
 */
export function getWarpInfo(mapId) {
    if (!warpCache) {
        console.error('[DataManager] 传送点数据未初始化');
        return [];
    }
    return warpCache[mapId] || [];
}

/**
 * 强制刷新数据 (清除缓存并重新加载)
 */
export async function refreshGameData(maxLevel = 20) {
    console.log('[DataManager] 强制刷新游戏数据...');
    itemsCache = null;
    mobsCache = null;
    spawnCache = null;
    warpCache = null;
    return await initializeGameData(maxLevel);
}
