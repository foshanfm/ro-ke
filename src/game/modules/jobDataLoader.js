/**
 * Job Data Loader Module
 * Responsible for parsing rAthena-style text databases for jobs.
 */

import { WeaponType } from '../equipment.js';

export async function loadJobStatsDB() {
    try {
        console.log('[JobDataLoader] Loading Job Databases...');

        // 1. Load Job Factors and Base ASPD from job_db1.txt
        const db1Response = await fetch('/src/game/data/system/job_db1.txt');
        const db1Text = await db1Response.text();
        const jobFactors = {};
        const jobBaseAspd = {}; // jobId -> { weaponType: aspd }

        // Columns: 
        // 0:JobID, 1:Weight, 2:HPFactor, 3:HPMulti, 4:SPFactor, 
        // 5:Unarmed, 6:Dagger, 7:1HSword, 8:2HSword, 9:1HSpear, 10:2HSpear, 
        // 11:1HAxe, 12:2HAxe, 13:1HMace, 14:2HMace, 15:Rod, 16:Bow, 17:Knuckle, 
        // 18:Instrument, 19:Whip, 20:Book, 21:Katar, 22:Revolver, 23:Rifle, 
        // 24:Gatling, 25:Shotgun, 26:Grenade, 27:Fuuma, 28:2HStaff, 29:Shield

        // Mapping index to WeaponType key
        const aspdColumnMap = {
            5: 'NONE', // Unarmed
            6: 'DAGGER',
            7: 'SWORD',
            8: 'TWO_HAND_SWORD',
            9: 'SPEAR',
            10: 'TWO_HAND_SPEAR',
            11: 'AXE',
            12: 'TWO_HAND_AXE',
            13: 'MACE',
            14: 'TWO_HAND_MACE',
            15: 'STAFF',
            16: 'BOW',
            17: 'KNUCKLE',
            18: 'INSTRUMENT',
            19: 'WHIP',
            20: 'BOOK',
            21: 'KATAR',
            22: 'REVOLVER',
            23: 'RIFLE',
            24: 'GATLING',
            25: 'SHOTGUN',
            26: 'GRENADE',
            27: 'FUUMA',
            28: 'TWO_HAND_STAFF'
            // 29 is Shield Penalty (usually subtracted, we can store it separately if needed)
        };

        db1Text.split('\n').forEach(line => {
            const cleanLine = line.trim();
            if (cleanLine.startsWith('//') || cleanLine === '') return;

            const parts = cleanLine.split(',');
            if (parts.length < 5) return;

            const jobId = parseInt(parts[0].trim());
            if (isNaN(jobId)) return;

            jobFactors[jobId] = {
                hpFactor: parseInt(parts[2].trim()) || 0,
                hpMulti: parseInt(parts[3].trim()) || 0,
                spFactor: parseInt(parts[4].trim()) || 0
            };

            // Parse ASPD
            jobBaseAspd[jobId] = {};
            for (const [colIdx, wType] of Object.entries(aspdColumnMap)) {
                if (parts[colIdx]) {
                    jobBaseAspd[jobId][wType] = parseInt(parts[colIdx].trim());
                }
            }
            // Parse Shield Penalty
            if (parts[29]) {
                jobBaseAspd[jobId]['SHIELD_PENALTY'] = parseInt(parts[29].trim());
            }
        });

        // 2. Load Base HP/SP Tables from job_basehpsp_db.txt
        const hpSpResponse = await fetch('/src/game/data/system/job_basehpsp_db.txt');
        const hpSpText = await hpSpResponse.text();
        const baseStats = {
            hp: {}, // jobId -> Array[level-1]
            sp: {}  // jobId -> Array[level-1]
        };

        hpSpText.split('\n').forEach(line => {
            const cleanLine = line.trim();
            if (cleanLine.startsWith('//') || cleanLine === '') return;

            const parts = cleanLine.split(',');
            if (parts.length < 5) return;

            const startLv = parseInt(parts[0]);
            const jobIdsStr = parts[2];
            const type = parseInt(parts[3]); // 0 = HP, 1 = SP
            const values = parts.slice(4).map(v => parseInt(v.trim()));

            const jobIds = jobIdsStr.split(':').map(id => parseInt(id.trim()));

            jobIds.forEach(jobId => {
                const target = type === 0 ? baseStats.hp : baseStats.sp;
                // Currently assuming each line covers the full range (e.g. 1 to 500)
                // If there are multiple lines for different ranges, we'd need to append/merge.
                if (!target[jobId]) {
                    target[jobId] = values;
                } else {
                    // Append if startLv is greater than current length
                    // This is simple merging, assuming valid data order
                    target[jobId] = target[jobId].concat(values);
                }
            });
        });

        // 3. Load Job Bonuses from job_db2.txt
        const db2Response = await fetch('/src/game/data/system/job_db2.txt');
        const db2Text = await db2Response.text();
        const jobBonuses = {}; // jobId -> Array[jobLv] -> { str, agi... }

        // Helper to convert code to stat name
        const statCodeMap = { 1: 'str', 2: 'agi', 3: 'vit', 4: 'int', 5: 'dex', 6: 'luk' };

        db2Text.split('\n').forEach(line => {
            const cleanLine = line.trim();
            if (cleanLine.startsWith('//') || cleanLine === '') return;

            const parts = cleanLine.split(',');
            if (parts.length < 2) return;

            const jobId = parseInt(parts[0].trim());
            // Bonus parts start from index 1 (Lv 1 bonus), 2 (Lv 2 bonus)...
            const rawBonuses = parts.slice(1).map(b => parseInt(b.trim()));

            // Pre-calculate cumulative bonuses
            const cumulative = [];
            const currentStats = { str: 0, agi: 0, vit: 0, int: 0, dex: 0, luk: 0 };

            // Push index 0 as "Job Lv 0" (empty)
            cumulative.push({ ...currentStats });

            rawBonuses.forEach(code => {
                if (statCodeMap[code]) {
                    currentStats[statCodeMap[code]]++;
                }
                cumulative.push({ ...currentStats });
            });

            jobBonuses[jobId] = cumulative;
        });

        console.log(`[JobDataLoader] Parsed ${Object.keys(jobFactors).length} jobs.`);

        return { jobFactors, baseStats, jobBaseAspd, jobBonuses };
    } catch (error) {
        console.error('[JobDataLoader] Error loading job databases:', error);
        return null;
    }
}
