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
        <div v-if="player.config.strategies" class="bg-[#1e1e1e] border border-gray-700 w-[900px] h-[600px] flex flex-col shadow-2xl rounded-lg overflow-hidden" @click.stop>
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
                        <div v-if="activeTab === 'Supply'" class="space-y-4" :class="{'opacity-50': !player.config.strategies.supply.enabled}">
                            <div class="bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-lg transition-all hover:border-gray-600">
                                <div class="flex justify-between items-center mb-4">
                                    <h4 class="text-green-400 font-bold flex items-center gap-2">
                                        <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                        HP 恢复药水 (Auto Potion)
                                    </h4>
                                    <label class="relative inline-flex items-center cursor-pointer group">
                                        <input type="checkbox" v-model="player.config.auto_hp_enabled" class="sr-only peer">
                                        <div class="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                                        <span class="ml-2 text-xs font-medium" :class="player.config.auto_hp_enabled ? 'text-green-400' : 'text-gray-500'">
                                            {{ player.config.auto_hp_enabled ? '已开启' : '已关闭' }}
                                        </span>
                                    </label>
                                </div>
                                <div class="grid grid-cols-12 gap-4" :class="{'opacity-50 pointer-events-none': !player.config.auto_hp_enabled}">
                                    <div class="col-span-8">
                                        <label class="block text-gray-500 text-[10px] uppercase font-bold mb-1 tracking-wider">使用物品名称 (Potions)</label>
                                        <input v-model="player.config.auto_hp_item" class="w-full bg-black text-white px-3 py-2 rounded-md border border-gray-700 focus:border-green-500 outline-none transition-all focus:ring-1 focus:ring-green-500/50" placeholder="例如: 红色药水" />
                                    </div>
                                    <div class="col-span-4">
                                        <label class="block text-gray-500 text-[10px] uppercase font-bold mb-1 tracking-wider">使用阈值 (%)</label>
                                        <div class="relative">
                                            <input v-model.number="player.config.auto_hp_percent" type="number" class="w-full bg-black text-white px-3 py-2 rounded-md border border-gray-700 focus:border-green-500 outline-none transition-all" />
                                            <span class="absolute right-3 top-2 text-gray-600">%</span>
                                        </div>
                                    </div>
                                    <div class="col-span-6">
                                        <label class="block text-gray-500 text-[10px] uppercase font-bold mb-1 tracking-wider">自动进货数量</label>
                                        <input v-model.number="player.config.strategies.supply.restock_hp_amount" type="number" class="w-full bg-black text-white px-3 py-2 rounded-md border border-gray-700 focus:border-green-500 outline-none transition-all" />
                                    </div>
                                    <div class="col-span-6">
                                        <label class="block text-gray-500 text-[10px] uppercase font-bold mb-1 tracking-wider">进货触发阈值</label>
                                        <input v-model.number="player.config.strategies.supply.restock_hp_trigger" type="number" class="w-full bg-black text-white px-3 py-2 rounded-md border border-gray-700 focus:border-green-500 outline-none transition-all" />
                                    </div>
                                </div>
                            </div>

                            <div class="bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-lg transition-all hover:border-gray-600">
                                <div class="flex justify-between items-center mb-4">
                                    <h4 class="text-yellow-400 font-bold flex items-center gap-2">
                                        <div class="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
                                        箭矢/弹药 (Ammo Supply)
                                    </h4>
                                    <label class="relative inline-flex items-center cursor-pointer group">
                                        <input type="checkbox" v-model="supplyConfig.ammo_enabled" class="sr-only peer">
                                        <div class="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-600"></div>
                                        <span class="ml-2 text-xs font-medium" :class="supplyConfig.ammo_enabled ? 'text-yellow-400' : 'text-gray-500'">
                                            {{ supplyConfig.ammo_enabled ? '已开启' : '已关闭' }}
                                        </span>
                                    </label>
                                </div>
                                <div class="grid grid-cols-12 gap-4" :class="{'opacity-50 pointer-events-none': !supplyConfig.ammo_enabled}">
                                    <div class="col-span-8">
                                        <label class="block text-gray-500 text-[10px] uppercase font-bold mb-1 tracking-wider">箭矢名称 (Ammo Type)</label>
                                        <input v-model="player.config.strategies.supply.restock_arrow_item" class="w-full bg-black text-white px-3 py-2 rounded-md border border-gray-700 focus:border-yellow-500 outline-none transition-all focus:ring-1 focus:ring-yellow-500/50" placeholder="例如: 箭矢" />
                                    </div>
                                    <div class="col-span-4">
                                        <label class="block text-gray-500 text-[10px] uppercase font-bold mb-1 tracking-wider">进货数量</label>
                                        <input v-model.number="player.config.strategies.supply.restock_arrow_amount" type="number" class="w-full bg-black text-white px-3 py-2 rounded-md border border-gray-700 focus:border-yellow-500 outline-none transition-all" />
                                    </div>
                                    <div class="col-span-12">
                                        <label class="block text-gray-500 text-[10px] uppercase font-bold mb-1 tracking-wider">触发阈值 (库存低于该值时回城)</label>
                                        <input v-model.number="player.config.strategies.supply.restock_arrow_trigger" type="number" class="w-full bg-black text-white px-3 py-2 rounded-md border border-gray-700 focus:border-yellow-500 outline-none transition-all" />
                                    </div>
                                </div>
                            </div>

                            <div class="bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-md">
                                <h4 class="text-blue-400 font-bold mb-3 flex items-center gap-2">
                                     <span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                     其他设置 (Misc)
                                </h4>
                                <div class="space-y-2">
                                    <label class="flex items-center gap-3 p-3 rounded-md bg-black/30 hover:bg-black/50 transition-all cursor-pointer border border-transparent hover:border-blue-500/30">
                                        <input type="checkbox" v-model="player.config.strategies.supply.use_butterfly_wing" id="chk_wing" class="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500 w-4 h-4" />
                                        <div class="flex flex-col">
                                            <span class="text-xs font-medium text-gray-200">补给完成后使用蝴蝶翅膀回城</span>
                                            <span class="text-[10px] text-gray-500">缩短返回补给点的时间 (Uses Butterfly Wing)</span>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <!-- Loot Tab (Same as before but direct access) -->
                        <div v-if="activeTab === 'Loot'" class="space-y-6" :class="{'opacity-50': !player.config.strategies.loot.enabled}">
                            <div class="bg-gray-800 p-4 rounded-lg border border-gray-700 shadow-lg">
                                <h4 class="text-cyan-400 font-bold mb-4 flex items-center gap-2">
                                    <span class="w-1.5 h-1.5 rounded-full bg-cyan-500"></span>
                                    通用拾取/售卖规则
                                </h4>
                                <div class="grid grid-cols-1 gap-2">
                                    <label class="flex items-center gap-4 p-3 rounded-md bg-black/20 hover:bg-black/40 transition-all cursor-pointer border border-transparent hover:border-cyan-500/30">
                                        <input type="checkbox" v-model="player.config.strategies.loot.sell_all_etc" class="rounded bg-gray-700 border-gray-600 text-cyan-500 focus:ring-cyan-500 w-4 h-4" />
                                        <div class="flex flex-col">
                                            <span class="text-xs font-medium">自动卖出所有 "其他" (ETC) 类物品</span>
                                            <span class="text-[10px] text-gray-500">杂物会自动在回城补给时售卖 (Sell all Misc items)</span>
                                        </div>
                                    </label>
                                    <label class="flex items-center gap-4 p-3 rounded-md bg-black/20 hover:bg-black/40 transition-all cursor-pointer border border-transparent hover:border-orange-500/30">
                                        <input type="checkbox" v-model="player.config.strategies.loot.keep_cards" class="rounded bg-gray-700 border-gray-600 text-orange-500 focus:ring-orange-500 w-4 h-4" />
                                        <div class="flex flex-col">
                                            <span class="text-xs font-medium text-orange-300">总是保留卡片 (Keep all Cards)</span>
                                            <span class="text-[10px] text-gray-500">忽略任何黑名单，保留所有掉落的卡片</span>
                                        </div>
                                    </label>
                                    <label class="flex items-center gap-4 p-3 rounded-md bg-black/20 hover:bg-black/40 transition-all cursor-pointer border border-transparent hover:border-yellow-500/30">
                                        <input type="checkbox" v-model="player.config.strategies.loot.keep_rares" class="rounded bg-gray-700 border-gray-600 text-yellow-500 focus:ring-yellow-500 w-4 h-4" />
                                        <div class="flex flex-col">
                                            <span class="text-xs font-medium text-yellow-400">保留高价物品 (Price > 5,000z)</span>
                                            <span class="text-[10px] text-gray-500">系统会自动标记并保留具备稀有属性或高价值的物品</span>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            <div class="grid grid-cols-2 gap-6">
                                <!-- Whitelist -->
                                <div class="bg-gray-800 rounded-lg border border-gray-700 flex flex-col h-[320px] shadow-lg overflow-hidden transition-all hover:border-green-500/30">
                                    <div class="px-3 py-2 bg-gray-900 border-b border-gray-700 flex justify-between items-center">
                                        <h4 class="text-white font-bold flex items-center gap-2 text-xs">
                                            <span class="w-2 h-2 rounded-full bg-green-500"></span>
                                            保留白名单 (Whitelist)
                                        </h4>
                                        <span class="px-2 py-0.5 bg-green-900 text-green-200 rounded-md text-[10px] font-bold">{{ player.config.strategies.loot.whitelist.length }}</span>
                                    </div>
                                    
                                    <div class="flex-1 overflow-y-auto p-2 bg-black/40 custom-scrollbar space-y-1">
                                        <div v-if="player.config.strategies.loot.whitelist.length === 0" class="h-full flex flex-col items-center justify-center opacity-30">
                                            <div class="text-2xl mb-2">📥</div>
                                            <div class="text-[10px]">列表为空</div>
                                        </div>
                                        <div v-for="id in player.config.strategies.loot.whitelist" :key="id" class="flex justify-between items-center bg-gray-800/50 px-3 py-2 rounded border border-gray-700 hover:border-green-500/50 group transition-all">
                                            <div class="truncate flex flex-col">
                                                <span class="text-xs text-green-300 font-medium">{{ getItemName(id) }}</span>
                                                <span class="text-[9px] text-gray-500">ID: {{ id }}</span>
                                            </div>
                                            <button @click="removeFromList('whitelist', id)" class="w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-900 text-gray-600 hover:text-white transition-all">×</button>
                                        </div>
                                    </div>
                                    
                                    <div class="p-2 bg-gray-900 border-t border-gray-700 flex gap-1">
                                        <input v-model="newItemId" @keyup.enter="addToList('whitelist')" type="number" placeholder="输入物品 ID..." class="flex-1 bg-black text-white px-3 py-1.5 rounded border border-gray-600 focus:border-green-500 outline-none text-xs transition-all w-full" />
                                        <button @click="addToList('whitelist')" class="bg-green-700 hover:bg-green-600 px-3 py-1 rounded text-white font-bold transition-all shadow-lg active:scale-95">+</button>
                                    </div>
                                </div>

                                <!-- Blacklist -->
                                <div class="bg-gray-800 rounded-lg border border-gray-700 flex flex-col h-[320px] shadow-lg overflow-hidden transition-all hover:border-red-500/30">
                                    <div class="px-3 py-2 bg-gray-900 border-b border-gray-700 flex justify-between items-center">
                                        <h4 class="text-white font-bold flex items-center gap-2 text-xs">
                                            <span class="w-2 h-2 rounded-full bg-red-500"></span>
                                            卖出黑名单 (Blacklist)
                                        </h4>
                                        <span class="px-2 py-0.5 bg-red-900 text-red-200 rounded-md text-[10px] font-bold">{{ player.config.strategies.loot.blacklist.length }}</span>
                                    </div>
                                    
                                    <div class="flex-1 overflow-y-auto p-2 bg-black/40 custom-scrollbar space-y-1">
                                        <div v-if="player.config.strategies.loot.blacklist.length === 0" class="h-full flex flex-col items-center justify-center opacity-30">
                                            <div class="text-2xl mb-2">🗑️</div>
                                            <div class="text-[10px]">列表为空</div>
                                        </div>
                                        <div v-for="id in player.config.strategies.loot.blacklist" :key="id" class="flex justify-between items-center bg-gray-800/50 px-3 py-2 rounded border border-gray-700 hover:border-red-500/50 group transition-all">
                                            <div class="truncate flex flex-col">
                                                <span class="text-xs text-red-300 font-medium">{{ getItemName(id) }}</span>
                                                <span class="text-[9px] text-gray-500">ID: {{ id }}</span>
                                            </div>
                                            <button @click="removeFromList('blacklist', id)" class="w-6 h-6 flex items-center justify-center rounded-full hover:bg-red-900 text-gray-600 hover:text-white transition-all">×</button>
                                        </div>
                                    </div>
                                    
                                    <div class="p-2 bg-gray-900 border-t border-gray-700 flex gap-1">
                                        <input v-model="newItemId" @keyup.enter="addToList('blacklist')" type="number" placeholder="输入物品 ID..." class="flex-1 bg-black text-white px-3 py-1.5 rounded border border-gray-600 focus:border-red-500 outline-none text-xs transition-all w-full" />
                                        <button @click="addToList('blacklist')" class="bg-red-700 hover:bg-red-600 px-3 py-1 rounded text-white font-bold transition-all shadow-lg active:scale-95">+</button>
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
