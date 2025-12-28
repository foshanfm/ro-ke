<script setup>
import { ref, computed } from 'vue'
import { player } from '../game/player.js'
import { getItemInfo } from '../game/items.js'

const activeTab = ref('Supply') // Supply | Loot
const showInventoryList = ref(true) 

// New Item ID Input
const newItemId = ref('')

const addToList = (listName, idInput = null) => {
    let id = idInput !== null ? idInput : parseInt(newItemId.value)
    if (!id || isNaN(id)) return
    
    // Ensure lists exist
    if (!player.config.strategies.loot.whitelist) player.config.strategies.loot.whitelist = []
    if (!player.config.strategies.loot.blacklist) player.config.strategies.loot.blacklist = []

    if (listName === 'whitelist') {
        if (!player.config.strategies.loot.whitelist.includes(id)) {
            removeFromList('blacklist', id)
            player.config.strategies.loot.whitelist.push(id)
        }
    } else if (listName === 'blacklist') {
        if (!player.config.strategies.loot.blacklist.includes(id)) {
             removeFromList('whitelist', id)
            player.config.strategies.loot.blacklist.push(id)
        }
    }
    if (idInput === null) newItemId.value = ''
}

const removeFromList = (listName, id) => {
    if (listName === 'whitelist') {
        player.config.strategies.loot.whitelist = player.config.strategies.loot.whitelist.filter(x => x !== id)
    } else if (listName === 'blacklist') {
        player.config.strategies.loot.blacklist = player.config.strategies.loot.blacklist.filter(x => x !== id)
    }
}

const getItemName = (id) => {
    const info = getItemInfo(id)
    return info ? info.name : `Unknown (${id})`
}

const getListStatus = (id) => {
    if (player.config.strategies.loot.whitelist.includes(id)) return 'white'
    if (player.config.strategies.loot.blacklist.includes(id)) return 'black'
    return 'none'
}

// Inventory Filtering
const inventoryItems = computed(() => {
    if (!player.inventory) return []
    return player.inventory.map(item => {
        const info = getItemInfo(item.id)
        return {
            id: item.id,
            count: item.count,
            name: info.name,
            type: info.type
        }
    })
})

const supplyConfig = computed(() => {
    // Ensure partial objects exist to avoid v-model errors
    if (!player.config.strategies.supply.ammo_config) {
        // Migration if needed, or just rely on 'enabled' in main object if that's what we want.
        // User asked for "Switch for throwables/ammo".
        // Let's add a virtual property or assume structure exists.
        // We will add 'ammo_enabled' to supply strategy in the template v-model, 
        // and if it doesn't exist, we might need to set it.
        // But better to initialize defaults in player.js. 
        // For now, we use a local check or just modify the object directly.
        if (player.config.strategies.supply.ammo_enabled === undefined) {
            player.config.strategies.supply.ammo_enabled = true
        }
    }
    return player.config.strategies.supply
})

</script>

<template>
    <div class="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[70]" @click.self="$emit('close')">
        <div v-if="player.config.strategies" class="bg-[#1e1e1e] border border-gray-700 w-[900px] h-[600px] flex flex-col shadow-2xl rounded-lg overflow-hidden">
            <!-- Header -->
            <div class="bg-gray-900 border-b border-gray-700 p-3 flex justify-between items-center">
                <div class="flex items-center gap-2">
                    <h3 class="text-white font-bold">挂机策略配置</h3>
                    <div class="flex gap-2 text-xs ml-4">
                        <label class="flex items-center gap-1 cursor-pointer select-none">
                            <input type="checkbox" v-model="player.config.strategies.supply.enabled" class="rounded bg-gray-700 border-gray-600 focus:ring-green-500 text-green-500">
                            <span :class="player.config.strategies.supply.enabled ? 'text-green-400' : 'text-gray-500'">补给启用</span>
                        </label>
                        <label class="flex items-center gap-1 cursor-pointer select-none">
                            <input type="checkbox" v-model="player.config.strategies.loot.enabled" class="rounded bg-gray-700 border-gray-600 focus:ring-cyan-500 text-cyan-500">
                            <span :class="player.config.strategies.loot.enabled ? 'text-cyan-400' : 'text-gray-500'">拾取启用</span>
                        </label>
                    </div>
                </div>
                <button @click="$emit('close')" class="text-gray-500 hover:text-white text-xl">×</button>
            </div>

            <!-- Content Container -->
            <div class="flex-1 flex overflow-hidden">
                <!-- Left: Configuration Tabs -->
                <div class="flex-1 flex flex-col border-r border-gray-700">
                     <!-- Tabs -->
                    <div class="flex border-b border-gray-700 bg-gray-800 shrink-0">
                        <button 
                            v-for="tab in ['Supply', 'Loot']" 
                            :key="tab"
                            @click="activeTab = tab"
                            class="px-4 py-3 text-sm font-medium transition-colors border-r border-gray-700 flex-1"
                            :class="activeTab === tab ? 'bg-[#1e1e1e] text-white border-b-2 border-b-cyan-500' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'"
                        >
                            {{ tab === 'Supply' ? '补给策略' : '拾取/售卖' }}
                        </button>
                    </div>

                    <div class="flex-1 overflow-y-auto p-4 custom-scrollbar text-gray-300 text-sm bg-[#1e1e1e]">
                        
                        <!-- Supply Tab -->
                        <div v-if="activeTab === 'Supply'" class="space-y-4" :class="{'opacity-50 pointer-events-none': !player.config.strategies.supply.enabled}">
                            <div class="bg-gray-800 p-3 rounded border border-gray-700 shadow-sm">
                                <h4 class="text-green-400 font-bold mb-3 flex items-center gap-2">
                                    <span class="w-2 h-2 rounded-full bg-green-500"></span>
                                    HP 恢复药水
                                </h4>
                                <div class="grid grid-cols-2 gap-4">
                                    <div class="col-span-2">
                                        <label class="block text-gray-500 text-xs mb-1">使用物品名称 (Item Name)</label>
                                        <input v-model="player.config.strategies.supply.restock_hp_item" class="w-full bg-black text-white px-3 py-2 rounded border border-gray-600 focus:border-green-500 outline-none transition-colors" placeholder="例如: 红色药水" />
                                    </div>
                                    <div>
                                        <label class="block text-gray-500 text-xs mb-1">自动进货数量 (Amount)</label>
                                        <input v-model.number="player.config.strategies.supply.restock_hp_amount" type="number" class="w-full bg-black text-white px-3 py-2 rounded border border-gray-600 focus:border-green-500 outline-none transition-colors" />
                                    </div>
                                    <div>
                                        <label class="block text-gray-500 text-xs mb-1">触发阈值 (Trigger &lt;)</label>
                                        <input v-model.number="player.config.strategies.supply.restock_hp_trigger" type="number" class="w-full bg-black text-white px-3 py-2 rounded border border-gray-600 focus:border-green-500 outline-none transition-colors" />
                                    </div>
                                </div>
                            </div>

                            <div class="bg-gray-800 p-3 rounded border border-gray-700 shadow-sm relative">
                                <div class="flex justify-between items-center mb-3">
                                     <h4 class="text-yellow-400 font-bold flex items-center gap-2">
                                        <span class="w-2 h-2 rounded-full bg-yellow-500"></span>
                                        箭矢/弹药 (Ammo)
                                    </h4>
                                    <!-- Granular Toggle -->
                                    <label class="flex items-center gap-1 cursor-pointer select-none text-xs">
                                        <input type="checkbox" v-model="supplyConfig.ammo_enabled" class="rounded bg-gray-600 border-gray-500 text-yellow-500 focus:ring-yellow-500">
                                        <span :class="supplyConfig.ammo_enabled ? 'text-yellow-400' : 'text-gray-500'">启用</span>
                                    </label>
                                </div>
                               
                                <div class="grid grid-cols-2 gap-4" :class="{'opacity-50 pointer-events-none': !supplyConfig.ammo_enabled}">
                                    <div class="col-span-2">
                                        <label class="block text-gray-500 text-xs mb-1">备用箭矢名称 (Item Name)</label>
                                        <input v-model="player.config.strategies.supply.restock_arrow_item" class="w-full bg-black text-white px-3 py-2 rounded border border-gray-600 focus:border-yellow-500 outline-none transition-colors" placeholder="例如: 箭矢" />
                                    </div>
                                    <div>
                                        <label class="block text-gray-500 text-xs mb-1">自动进货数量 (Amount)</label>
                                        <input v-model.number="player.config.strategies.supply.restock_arrow_amount" type="number" class="w-full bg-black text-white px-3 py-2 rounded border border-gray-600 focus:border-yellow-500 outline-none transition-colors" />
                                    </div>
                                    <div>
                                        <label class="block text-gray-500 text-xs mb-1">触发阈值 (Trigger &lt;)</label>
                                        <input v-model.number="player.config.strategies.supply.restock_arrow_trigger" type="number" class="w-full bg-black text-white px-3 py-2 rounded border border-gray-600 focus:border-yellow-500 outline-none transition-colors" />
                                    </div>
                                </div>
                            </div>

                            <div class="bg-gray-800 p-3 rounded border border-gray-700 shadow-sm">
                                <h4 class="text-blue-400 font-bold mb-2">其他设置</h4>
                                <div class="flex items-center gap-2 p-2 rounded hover:bg-gray-700 transition-colors cursor-pointer">
                                    <input type="checkbox" v-model="player.config.strategies.supply.use_butterfly_wing" id="chk_wing" class="rounded bg-gray-600 border-gray-500 text-blue-500 focus:ring-blue-500 w-4 h-4" />
                                    <label for="chk_wing" class="cursor-pointer select-none">补给完成后使用蝴蝶翅膀回城</label>
                                </div>
                            </div>
                        </div>

                        <!-- Loot Tab (Same as before but direct access) -->
                        <div v-if="activeTab === 'Loot'" class="space-y-4" :class="{'opacity-50 pointer-events-none': !player.config.strategies.loot.enabled}">
                            <div class="bg-gray-800 p-3 rounded border border-gray-700 space-y-2 shadow-sm">
                                <h4 class="text-cyan-400 font-bold mb-2">通用规则</h4>
                                <div class="space-y-1">
                                    <label class="flex items-center gap-3 p-2 rounded hover:bg-gray-700 transition-colors cursor-pointer">
                                        <input type="checkbox" v-model="player.config.strategies.loot.sell_all_etc" class="rounded bg-gray-600 border-gray-500 text-cyan-500 focus:ring-cyan-500 w-4 h-4" />
                                        <span>自动卖出所有 "其他" (ETC) 类物品</span>
                                    </label>
                                    <label class="flex items-center gap-3 p-2 rounded hover:bg-gray-700 transition-colors cursor-pointer">
                                        <input type="checkbox" v-model="player.config.strategies.loot.keep_cards" class="rounded bg-gray-600 border-gray-500 text-orange-500 focus:ring-orange-500 w-4 h-4" />
                                        <span>总是保留卡片 (Cards)</span>
                                    </label>
                                    <label class="flex items-center gap-3 p-2 rounded hover:bg-gray-700 transition-colors cursor-pointer">
                                        <input type="checkbox" v-model="player.config.strategies.loot.keep_rares" class="rounded bg-gray-600 border-gray-500 text-yellow-500 focus:ring-yellow-500 w-4 h-4" />
                                        <span>保留高价物品 (卖价 > 5000z)</span>
                                    </label>
                                </div>
                            </div>

                            <div class="grid grid-cols-2 gap-4">
                                <!-- Whitelist -->
                                <div class="bg-gray-800 p-3 rounded border border-gray-700 flex flex-col h-64">
                                    <h4 class="text-white font-bold mb-2 flex justify-between items-center text-xs">
                                        <span>保留白名单 (Whitelist)</span>
                                        <span class="px-1.5 py-0.5 bg-green-900 text-green-200 rounded-full text-[10px]">{{ player.config.strategies.loot.whitelist.length }}</span>
                                    </h4>
                                    
                                    <div class="bg-black p-2 rounded flex-1 overflow-y-auto mb-2 border border-gray-600 custom-scrollbar">
                                        <div v-for="id in player.config.strategies.loot.whitelist" :key="id" class="flex justify-between items-center bg-gray-900 px-2 py-1 mb-1 rounded hover:bg-gray-800 border border-transparent hover:border-gray-600 group">
                                            <div class="truncate text-xs">
                                                <div class="text-green-300">{{ getItemName(id) }}</div>
                                                <div class="text-[9px] text-gray-500">ID: {{ id }}</div>
                                            </div>
                                            <button @click="removeFromList('whitelist', id)" class="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 px-2">×</button>
                                        </div>
                                    </div>
                                    
                                    <div class="flex gap-1">
                                        <input v-model="newItemId" @keyup.enter="addToList('whitelist')" type="number" placeholder="ID..." class="flex-1 bg-black text-white px-2 py-1 rounded text-xs outline-none border border-gray-600 focus:border-green-500 w-full" />
                                        <button @click="addToList('whitelist')" class="bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-[10px] text-green-300 border border-gray-600">+</button>
                                    </div>
                                </div>

                                <!-- Blacklist -->
                                <div class="bg-gray-800 p-3 rounded border border-gray-700 flex flex-col h-64">
                                    <h4 class="text-white font-bold mb-2 flex justify-between items-center text-xs">
                                        <span>卖出黑名单 (Blacklist)</span>
                                        <span class="px-1.5 py-0.5 bg-red-900 text-red-200 rounded-full text-[10px]">{{ player.config.strategies.loot.blacklist.length }}</span>
                                    </h4>
                                    
                                    <div class="bg-black p-2 rounded flex-1 overflow-y-auto mb-2 border border-gray-600 custom-scrollbar">
                                        <div v-for="id in player.config.strategies.loot.blacklist" :key="id" class="flex justify-between items-center bg-gray-900 px-2 py-1 mb-1 rounded hover:bg-gray-800 border border-transparent hover:border-gray-600 group">
                                            <div class="truncate text-xs">
                                                <div class="text-red-300">{{ getItemName(id) }}</div>
                                                <div class="text-[9px] text-gray-500">ID: {{ id }}</div>
                                            </div>
                                            <button @click="removeFromList('blacklist', id)" class="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 px-2">×</button>
                                        </div>
                                    </div>
                                    
                                    <div class="flex gap-1">
                                        <input v-model="newItemId" @keyup.enter="addToList('blacklist')" type="number" placeholder="ID..." class="flex-1 bg-black text-white px-2 py-1 rounded text-xs outline-none border border-gray-600 focus:border-green-500 w-full" />
                                        <button @click="addToList('blacklist')" class="bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-[10px] text-red-300 border border-gray-600">+</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                <!-- Right: Inventory Picker -->
                <div class="w-64 bg-black flex flex-col border-l border-gray-700" v-if="showInventoryList && activeTab === 'Loot'">
                    <div class="p-3 bg-gray-900 border-b border-gray-700 flex justify-between items-center">
                        <h4 class="text-gray-300 font-bold text-xs uppercase tracking-wider">背包物品快速配置</h4>
                    </div>
                    <div class="flex-1 overflow-y-auto p-2 custom-scrollbar space-y-1">
                        <div v-if="inventoryItems.length === 0" class="text-center text-gray-600 text-xs mt-10">背包为空</div>
                        <div v-for="item in inventoryItems" :key="item.id" 
                             class="bg-[#1a1a1a] p-2 rounded border border-gray-800 flex flex-col gap-1 group hover:border-gray-600"
                             :class="{'border-l-2 !border-l-green-500': getListStatus(item.id) === 'white', 'border-l-2 !border-l-red-500': getListStatus(item.id) === 'black'}"
                        >
                            <div class="flex justify-between items-start">
                                <span class="text-xs text-gray-200 font-medium truncate w-32">{{ item.name }}</span>
                                <span class="text-[10px] text-gray-500">x{{ item.count }}</span>
                            </div>
                            
                            <!-- Actions -->
                            <div class="flex gap-1 mt-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                <button 
                                    @click="addToList('whitelist', item.id)" 
                                    class="flex-1 text-[10px] px-1 py-0.5 rounded border border-gray-600 hover:bg-green-900 hover:border-green-700 hover:text-green-300 transition-colors"
                                    :class="getListStatus(item.id) === 'white' ? 'bg-green-900 text-green-300 border-green-700' : 'bg-gray-800 text-gray-500'"
                                >
                                    保留
                                </button>
                                <button 
                                    @click="addToList('blacklist', item.id)" 
                                    class="flex-1 text-[10px] px-1 py-0.5 rounded border border-gray-600 hover:bg-red-900 hover:border-red-700 hover:text-red-300 transition-colors"
                                    :class="getListStatus(item.id) === 'black' ? 'bg-red-900 text-red-300 border-red-700' : 'bg-gray-800 text-gray-500'"
                                >
                                    卖出
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div v-else class="text-white">Loading Config...</div>
    </div>
</template>
