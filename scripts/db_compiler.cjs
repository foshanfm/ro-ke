// scripts/db_compiler.js
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../src/game/data');

const ITEM_DB_PATH = path.join(DATA_DIR, 'item_db.txt');
const CARD_PREFIX_PATH = path.join(DATA_DIR, 'cardprefixnametable.txt');
const CARD_POSTFIX_PATH = path.join(DATA_DIR, 'cardpostfixnametable.txt');
const DESC_TABLE_PATH = path.join(DATA_DIR, 'idnum2itemdesctable.txt');
const MOB_DB_PATH = path.join(DATA_DIR, 'mob_db.txt');
const OUTPUT_DIR = path.join(__dirname, '../src/game/data/compiled');

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}
function splitROLine(line) {
    const parts = [];
    let current = "";
    let inBraces = 0;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '{') inBraces++;
        if (char === '}') inBraces--;

        if (char === ',' && inBraces === 0) {
            parts.push(current.trim());
            current = "";
        } else {
            current += char;
        }
    }
    parts.push(current.trim());
    return parts;
}

function parseDescriptions() {
    if (!fs.existsSync(DESC_TABLE_PATH)) return {};
    console.log('Parsing Item Descriptions...');
    const content = fs.readFileSync(DESC_TABLE_PATH, 'utf-8');
    const sections = content.split(/(\d+)#/);
    const descMap = {};
    for (let i = 1; i < sections.length; i += 2) {
        const id = parseInt(sections[i]);
        const text = sections[i + 1].split('#')[0].trim();
        if (!id || !text) continue;

        // 清理描述中的颜色代码 ^0000CC 和 导航标记 <NAVI>
        let compoundOn = null;
        const compoundMatch = text.match(/Compound on:\s*(.*)/i);
        if (compoundMatch) {
            compoundOn = compoundMatch[1].replace(/\^[0-9A-Fa-f]{6}/g, '').trim();
        }

        const cleanDesc = text
            .replace(/\^[0-9A-Fa-f]{6}/g, '')
            .replace(/<NAVI>.*?<INFO>.*?<\/INFO><\/NAVI>/g, '') // 移除完整的导航标记
            .replace(/Can be enchanted by:[\s\n]*/gi, '') // 彻底移除残留的描述行
            .trim();

        descMap[id] = {
            text: cleanDesc,
            compoundOn: compoundOn
        };
    }
    return descMap;
}

function parseCardPrefixes() {
    console.log('Parsing Card Prefixes...');
    const cardPrefixes = {};
    if (!fs.existsSync(CARD_PREFIX_PATH)) {
        console.warn('Card prefix table not found, skipping prefixes.');
        return cardPrefixes;
    }
    const content = fs.readFileSync(CARD_PREFIX_PATH, 'utf-8');
    const lines = content.split('\n');
    for (const line of lines) {
        if (!line.trim() || line.startsWith('//')) continue;
        const parts = line.split('#');
        if (parts.length >= 2) {
            const id = parseInt(parts[0]);
            const prefix = parts[1].trim();
            if (id && prefix) {
                cardPrefixes[id] = prefix;
            }
        }
    }
    return cardPrefixes;
}

function parseCardPostfixes() {
    console.log('Parsing Card Postfix Table...');
    const cardPostfixes = new Set();
    if (!fs.existsSync(CARD_POSTFIX_PATH)) {
        console.warn('Card postfix table not found, skipping.');
        return cardPostfixes;
    }
    const content = fs.readFileSync(CARD_POSTFIX_PATH, 'utf-8');
    const lines = content.split('\n');
    for (const line of lines) {
        if (!line.trim() || line.startsWith('//')) continue;
        const parts = line.split('#');
        const id = parseInt(parts[0]);
        if (id) {
            cardPostfixes.add(id);
        }
    }
    return cardPostfixes;
}

const JOB_MAPPING = [
    { bit: 0x00000001, name: "初心者" },
    { bit: 0x00000002, name: "剑士" },
    { bit: 0x00000004, name: "法师" },
    { bit: 0x00000008, name: "弓箭手" },
    { bit: 0x00000010, name: "服事" },
    { bit: 0x00000020, name: "商人" },
    { bit: 0x00000040, name: "盗贼" },
    { bit: 0x00000080, name: "骑士" },
    { bit: 0x00000100, name: "祭司" },
    { bit: 0x00000200, name: "巫师" },
    { bit: 0x00000400, name: "铁匠" },
    { bit: 0x00000800, name: "猎人" },
    { bit: 0x00001000, name: "刺客" }
    // 可以继续增加，但基础 1-2 转职业比较常用
];

function getJobNames(mask) {
    if (mask === 0xFFFFFFFF || mask === -1 || (mask & 0x00000001 && mask & 0x00000002 && mask & 0x00000040)) {
        return ["所有职业"];
    }
    const jobs = [];
    JOB_MAPPING.forEach(j => {
        if (mask & j.bit) jobs.push(j.name);
    });
    return jobs.length > 0 ? jobs : ["特殊职业"];
}

const WEAPON_TYPE_MAP = {
    1: 'DAGGER', 2: 'SWORD', 3: 'TWO_HAND_SWORD', 4: 'SPEAR',
    5: 'TWO_HAND_SPEAR', 6: 'AXE', 7: 'TWO_HAND_AXE', 8: 'MACE',
    10: 'STAFF', 11: 'BOW', 12: 'KNUCKLE', 13: 'INSTRUMENT',
    14: 'WHIP', 15: 'BOOK', 16: 'KATAR', 18: 'TWO_HAND_STAFF'
};

function parseItemDB() {
    console.log('Compiling Item DB...');
    const descMap = parseDescriptions();
    const cardPrefixes = parseCardPrefixes();
    const cardPostfixMarkers = parseCardPostfixes();
    const content = fs.readFileSync(ITEM_DB_PATH, 'utf-8');
    const lines = content.split('\n');
    const items = {};

    for (const line of lines) {
        if (!line.trim() || line.trim().startsWith('//')) continue;
        const parts = splitROLine(line);
        if (parts.length < 19) continue;

        const id = parseInt(parts[0]);
        const type = parseInt(parts[3]);
        const jobMask = parseInt(parts[11]) || 0xFFFFFFFF;
        const location = parseInt(parts[14]) || 0;
        const view = parseInt(parts[18]) || 0;

        // Basic Item Object
        const buyPrice = parseInt(parts[4]) || 0;
        let sellPrice = parseInt(parts[5]) || 0;

        if (sellPrice === 0 && buyPrice > 0) {
            sellPrice = Math.floor(buyPrice / 2);
        }

        const item = {
            id,
            aegisName: parts[1],
            name: parts[2],
            type: mapItemType(type),
            price: { buy: buyPrice, sell: sellPrice },
            weight: (parseInt(parts[6]) || 0),
            atk: 0,
            matk: 0,
            def: parseInt(parts[8]) || 0,
            range: parseInt(parts[9]) || 0,
            slots: parseInt(parts[10]) || 0,
            reqLv: parseInt(parts[16]) || 1,
            jobs: getJobNames(jobMask),
            location: location,
            description: descMap[id]?.text || '',
            compoundOn: descMap[id]?.compoundOn || null,
            script: parts[19] || '',
            prefix: cardPrefixes[id] || null,
            isPostfix: cardPostfixMarkers.has(id)
        };

        // Parse ATK:MATK
        if (parts[7]) {
            const atkParts = parts[7].split(':');
            item.atk = parseInt(atkParts[0]) || 0;
            item.matk = parseInt(atkParts[1]) || 0;
        }

        // SubType Mapping
        if (item.type === 'Equip') {
            if (type === 5) { // Weapon Type
                item.subType = WEAPON_TYPE_MAP[view] || 'Weapon';
            } else {
                // Armor SubTypes
                if (location & 256) item.subType = 'HeadTop';
                else if (location & 512) item.subType = 'HeadMid';
                else if (location & 1) item.subType = 'HeadLow';
                else if (location & 16) item.subType = 'Armor';
                else if (location & 32) item.subType = 'Shield';
                else if (location & 4) item.subType = 'Garment';
                else if (location & 64) item.subType = 'Footgear';
                else if (location & 136) item.subType = 'Accessory'; // 8 or 128
            }
        }

        // Logic for Card Compounding (from Location bitmask)
        if (item.type === 'Card') {
            item.compoundOn = mapLocation(location);
        }

        // --- SCRIPT PARSING ---
        item.effects = [];
        const script = item.script;

        // Detect itemheal
        const healMatch = script.match(/itemheal\s+rand\((\d+),(\d+)\),(\d+)/i);
        if (healMatch) {
            item.effects.push({
                type: 'heal',
                hp: [parseInt(healMatch[1]), parseInt(healMatch[2])],
                sp: parseInt(healMatch[3])
            });
        }

        // Stat Bonuses
        const bonusMatches = script.matchAll(/bonus\s+b(\w+),(-?\d+);/g);
        const bonusMap = {};
        for (const m of bonusMatches) {
            const key = m[1].toLowerCase();
            const val = parseInt(m[2]);
            bonusMap[key] = (bonusMap[key] || 0) + val;
        }

        // ASPD Bonuses
        const aspdMatches = script.matchAll(/bonus2\s+bAspdRate,(\d+);/g);
        for (const m of aspdMatches) {
            bonusMap['aspdrate'] = (bonusMap['aspdrate'] || 0) + parseInt(m[1]);
        }

        if (Object.keys(bonusMap).length > 0) item.bonuses = bonusMap;

        items[id] = item;
    }

    fs.writeFileSync(path.join(OUTPUT_DIR, 'items.json'), JSON.stringify(items, null, 2));
    console.log(`Compiled ${Object.keys(items).length} items.`);
}

function mapLocation(loc) {
    if (!loc) return 'Common';
    const slots = [];
    if (loc & 2) slots.push('Weapon');
    if (loc & 32) slots.push('Shield');
    if (loc & 16) slots.push('Armor');
    if (loc & 4) slots.push('Garment');
    if (loc & 64) slots.push('Footgear');
    if (loc & 256) slots.push('Head(Top)');
    if (loc & 512) slots.push('Head(Mid)');
    if (loc & 1) slots.push('Head(Low)');
    if (loc & 136) slots.push('Accessory');
    return slots.length > 0 ? slots.join(' / ') : `Unknown(${loc})`;
}

function parseMobDB() {
    console.log('Compiling Mob DB...');
    const content = fs.readFileSync(MOB_DB_PATH, 'utf-8');
    const lines = content.split('\n');
    const mobs = {};

    for (const line of lines) {
        if (!line.trim() || line.trim().startsWith('//')) continue;
        const parts = splitROLine(line);
        if (parts.length < 50) continue;

        const id = parseInt(parts[0]);
        const attackDelay = parseInt(parts[27]) || 2000;

        const mob = {
            id,
            name: parts[2],
            lv: parseInt(parts[4]),
            hp: parseInt(parts[5]),
            exp: parseInt(parts[7]),
            jobExp: parseInt(parts[8]),
            battleStats: {
                atk: Math.floor((parseInt(parts[10]) + parseInt(parts[11])) / 2),
                def: parseInt(parts[12]) || 0,
                mdef: parseInt(parts[13]) || 0,
                hit: parseInt(parts[18]) || 0,
                flee: parseInt(parts[19]) || 0,
                attackDelay,
                aspd: Math.floor(200 - (attackDelay / 20)),
                range: parseInt(parts[9]) || 1
            },
            drops: []
        };

        for (let i = 0; i < 9; i++) {
            const dId = parseInt(parts[37 + i * 2]);
            const dRate = parseInt(parts[38 + i * 2]);
            if (dId > 0 && dRate > 0) {
                mob.drops.push({ id: dId, rate: dRate / 10000 });
            }
        }
        const cardId = parseInt(parts[55]);
        if (cardId > 0) {
            mob.drops.push({ id: cardId, rate: (parseInt(parts[56]) || 1) / 10000 });
        }

        mobs[id] = mob;
    }

    fs.writeFileSync(path.join(OUTPUT_DIR, 'mobs.json'), JSON.stringify(mobs, null, 2));
    console.log(`Compiled ${Object.keys(mobs).length} mobs.`);
}

function mapItemType(type) {
    switch (type) {
        case 0: return 'Usable';
        case 2: return 'Usable';
        case 3: return 'Etc';
        case 4: return 'Equip';
        case 5: return 'Equip';
        case 6: return 'Card';
        case 10: return 'Usable';
        default: return 'Etc';
    }
}

parseItemDB();
parseMobDB();
