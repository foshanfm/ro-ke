// scripts/db_compiler.js
const fs = require('fs');
const path = require('path');

const ITEM_DB_PATH = path.join(__dirname, '../src/game/data/item_db.txt');
const MOB_DB_PATH = path.join(__dirname, '../src/game/data/mob_db.txt');
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

function parseItemDB() {
    console.log('Compiling Item DB...');
    const content = fs.readFileSync(ITEM_DB_PATH, 'utf-8');
    const lines = content.split('\n');
    const items = {};

    for (const line of lines) {
        if (!line.trim() || line.trim().startsWith('//')) continue;
        const parts = splitROLine(line);
        if (parts.length < 20) continue; // Keep original check as parts[19] is script

        const id = parseInt(parts[0]);
        const type = parseInt(parts[3]);
        const location = parseInt(parts[14]) || 0;

        // Basic Item Object
        const item = {
            id,
            aegisName: parts[1],
            name: parts[2],
            type: mapItemType(type),
            price: { buy: parseInt(parts[4]) || 0, sell: parseInt(parts[5]) || 0 },
            weight: parseInt(parts[6]) || 0,
            atk: 0,
            matk: 0,
            def: parseInt(parts[8]) || 0,
            range: parseInt(parts[9]) || 0,
            slots: parseInt(parts[10]) || 0,
            reqLv: parseInt(parts[16]) || 1,
            script: parts[19] || ''
        };

        // Parse ATK:MATK
        if (parts[7]) {
            const atkParts = parts[7].split(':');
            item.atk = parseInt(atkParts[0]) || 0;
            item.matk = parseInt(atkParts[1]) || 0;
        }

        // SubType Mapping
        if (type === 4) item.subType = 'Weapon';
        else if (type === 5) {
            if (location & 256) item.subType = 'HeadTop';
            else if (location & 512) item.subType = 'HeadMid';
            else if (location & 2048) item.subType = 'HeadTop'; // rAthena often uses 2048 for HeadTop
            else if (location & 1) item.subType = 'HeadLow';
            else if (location & 16) item.subType = 'Armor';
            else if (location & 32) item.subType = 'Shield';
            else if (location & 4) item.subType = 'Garment';
            else if (location & 64) item.subType = 'Footgear';
            else if ((location & 8) || (location & 128)) item.subType = 'Accessory';
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
        } else {
            const staticHeal = script.match(/itemheal\s+(\d+),(\d+)/i);
            if (staticHeal) {
                item.effects.push({
                    type: 'heal',
                    hp: parseInt(staticHeal[1]),
                    sp: parseInt(staticHeal[2])
                });
            }
        }

        // Detect Stat Bonuses
        const bonusMatches = script.matchAll(/bonus\s+b(\w+),(-?\d+);/g);
        const bonusMap = {};
        for (const m of bonusMatches) {
            const key = m[1].toLowerCase();
            const val = parseInt(m[2]);
            bonusMap[key] = (bonusMap[key] || 0) + val;
        }
        if (Object.keys(bonusMap).length > 0) {
            item.bonuses = bonusMap;
        }

        items[id] = item;
    }

    fs.writeFileSync(path.join(OUTPUT_DIR, 'items.json'), JSON.stringify(items, null, 2));
    console.log(`Compiled ${Object.keys(items).length} items.`);
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
        const atk1 = parseInt(parts[10]) || 0;
        const atk2 = parseInt(parts[11]) || 0;
        const attackDelay = parseInt(parts[27]) || 2000;

        const mob = {
            id,
            name: parts[2],
            lv: parseInt(parts[4]),
            hp: parseInt(parts[5]),
            exp: parseInt(parts[7]),
            jobExp: parseInt(parts[8]),
            battleStats: {
                atk: Math.floor((atk1 + atk2) / 2),
                def: parseInt(parts[12]) || 0,
                mdef: parseInt(parts[13]) || 0,
                hit: parseInt(parts[18]) || 0,
                flee: parseInt(parts[19]) || 0,
                attackDelay,
                aspd: Math.floor(200 - (attackDelay / 20)),
                range: parseInt(parts[9]) || 1
            },
            attributes: {
                str: parseInt(parts[14]),
                agi: parseInt(parts[15]),
                vit: parseInt(parts[16]),
                int: parseInt(parts[17]),
                dex: parseInt(parts[18]),
                luk: parseInt(parts[19])
            },
            drops: []
        };

        // Parse Drops
        for (let i = 0; i < 9; i++) {
            const dropIdIndex = 37 + i * 2;
            const dropRateIndex = 38 + i * 2;
            const dId = parseInt(parts[dropIdIndex]);
            const dRate = parseInt(parts[dropRateIndex]);
            if (dId > 0 && dRate > 0) {
                mob.drops.push({ id: dId, rate: dRate / 10000 });
            }
        }
        // Card
        const cardId = parseInt(parts[55]);
        const cardRate = parseInt(parts[56]);
        if (cardId > 0 && cardRate > 0) {
            mob.drops.push({ id: cardId, rate: cardRate / 10000 });
        }

        mobs[id] = mob;
    }

    fs.writeFileSync(path.join(OUTPUT_DIR, 'mobs.json'), JSON.stringify(mobs, null, 2));
    console.log(`Compiled ${Object.keys(mobs).length} mobs.`);
}

function mapItemType(type) {
    switch (type) {
        case 0: return 'Usable';
        case 2: return 'Usable'; // Use
        case 3: return 'Etc';
        case 4: return 'Equip';
        case 5: return 'Equip';
        case 6: return 'Card';
        case 10: return 'Usable'; // Ammo? Actually 10 is ammo, but we map to Usable for now
        default: return 'Etc';
    }
}

parseItemDB();
parseMobDB();
