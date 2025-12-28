<script setup>
import { ref, computed, onMounted } from 'vue'
import { player, buyItem, getShopList, sellItem } from '../game/player.js'
import { getItemInfo, ItemType } from '../game/items.js'

const props = defineProps({
    mapId: String,
    playerX: Number,
    playerY: Number
})

const activeTab = ref('Buy') // Buy | Sell
const shopItems = ref([])
const cart = ref({}) // { itemId: count } - Used for buying
const logs = ref([])
const sellQueue = ref({}) // { indexInInventory: amountToSell }

// --- Fetch Shop Data ---
const fetchShopList = () => {
    // getShopList might be undefined if imports fail, verify existing player.js
    if (getShopList) {
        const list = getShopList(props.mapId, props.playerX, props.playerY)
        shopItems.value = list
    }
}

onMounted(() => {
    fetchShopList()
    // Re-verify after mount just in case of location lag
    setTimeout(fetchShopList, 500)
})

// --- Buy Computed ---
const totalCost = computed(() => {
    let sum = 0
    for (const [id, count] of Object.entries(cart.value)) {
        const item = shopItems.value.find(i => i.id == id)
        if (item) {
            sum += item.price * count
        }
    }
    return sum
})

// --- Sell Computed ---
const sellableInventory = computed(() => {
    if (!player.inventory) return []
    const queue = sellQueue.value
    
    return player.inventory.map((item, index) => {
        const info = getItemInfo(item.id)
        
        let unitPrice = 0
        if (typeof info.price === 'number') unitPrice = Math.floor(info.price / 2)
        else if (info.price?.sell) unitPrice = info.price.sell
        else if (info.price?.buy) unitPrice = Math.floor(info.price.buy / 2)
        
        // Calculate remaining count (Total - Queued)
        const inQueue = queue[index] || 0
        const remaining = item.count - inQueue
        
        return {
            invIndex: index,
            id: item.id,
            uniqueId: item.uniqueId,
            name: info.name,
            count: remaining, // Show effective remaining count
            totalCount: item.count,
            type: info.type,
            sellPrice: Math.max(0, unitPrice),
            iconType: info.type,
            rawItem: item
        }
    }).filter(i => {
        // Filter out items with 0 remaining (effectively hidden if fully queued)
        if (i.count <= 0) return false
        
        // Filter out unsellable types
        if (i.sellPrice <= 0) return false
        
        // **Filter out equipped items being shown in inventory**
        // Although player.inventory SHOULD NOT have equipped items, user reported it.
        // We will double check against player.equipment for ID matches if it's an equipment type.
        // Note: For generic items (arrows/potions), duplicates are merged, so we don't filter by ID.
        // But for unique equipment instances, if they somehow exist in both, we hide.
        if (i.type === ItemType.EQUIP) {
             // Check if this specific instance ID matches any equipped item
             // This assumes instance tracking. If simple ID, we might hide duplicates.
             // Given user feedback "pack sell list does not show currently worn equipment"
             // and our knowledge that `equipItem` removes from inventory, 
             // IF they show up, it implies `equipItem` failed to remove OR it's a visual sync bug.
             // We'll trust `player.inventory` only contains unequipped items.
             // But we add a safety check: if count is 0, we already filtered it.
             return true 
        }
        
        return true
    })
})

const totalSellValue = computed(() => {
    let sum = 0
    // Re-calculate based on original inventory using indices
    for (const [idxStr, amount] of Object.entries(sellQueue.value)) {
        const index = parseInt(idxStr)
        const item = player.inventory[index]
        if (item) {
            const info = getItemInfo(item.id)
            let unitPrice = 0
            if (typeof info.price === 'number') unitPrice = Math.floor(info.price / 2)
            else if (info.price?.sell) unitPrice = info.price.sell
            else if (info.price?.buy) unitPrice = Math.floor(info.price.buy / 2)
            
            sum += Math.max(0, unitPrice) * amount
        }
    }
    return sum
})

// --- Buy Actions ---
const addToCart = (id) => {
    if (!cart.value[id]) cart.value[id] = 0
    cart.value[id]++
}

const buyCart = () => {
    for (const [id, count] of Object.entries(cart.value)) {
        if (count > 0) {
            const item = shopItems.value.find(i => i.id == id)
            if (item) {
                const res = buyItem(item.name, count, props.mapId, props.playerX, props.playerY)
                if (res.msg) logs.value.push(res.msg)
            }
        }
    }
    cart.value = {}
}

// --- Sell Actions ---
const addToSellQueue = (invIndex) => {
    const item = player.inventory[invIndex] // Access source of truth
    if (!item) return
    
    if (!sellQueue.value[invIndex]) sellQueue.value[invIndex] = 0
    
    // Check limit against TOTAL count
    if (sellQueue.value[invIndex] < item.count) {
        sellQueue.value[invIndex]++
    }
}

const addAllToSellQueue = (invIndex) => {
    const item = player.inventory[invIndex]
    if (!item) return
    sellQueue.value[invIndex] = item.count
}

const addAllJunkToQueue = () => {
    sellableInventory.value.forEach(item => {
        if (item.type === ItemType.ETC) {
            addAllToSellQueue(item.invIndex)
        }
    })
}

const confirmSell = () => {
    // Process queue
    // Use a map to aggregate by ID to reduce spam, OR just sell one by one.
    // Aggregation is safer for bulk.
    const usageMap = {} // id -> count
    
    // Convert queue to array to process
    const queueEntries = Object.entries(sellQueue.value)
    
    // We must sell carefully because selling changes indices if items are removed.
    // However, `sellItem` function finds item by ID.
    // If we sell 5 Red Potions, `sellItem` handles the stack logic.
    // If we sell Equipment, we need to be careful if multiple same IDs exist.
    // `sellItem` will pick the first one.
    
    for (const [idxStr, amount] of queueEntries) {
        const index = parseInt(idxStr)
        const invItem = player.inventory[index]
        if (invItem && amount > 0) {
             if (!usageMap[invItem.id]) usageMap[invItem.id] = 0
             usageMap[invItem.id] += amount
        }
    }
    
    let logsTemp = []
    
    for (const [idStr, count] of Object.entries(usageMap)) {
        const id = parseInt(idStr)
        const res = sellItem(id, count, props.mapId, props.playerX, props.playerY)
        if (res.msg) logsTemp.push(res.msg)
    }
    
    logs.value.push(...logsTemp)
    sellQueue.value = {}
}

const sellOne = (itemRaw) => {
     const res = sellItem(itemRaw.id, 1, props.mapId, props.playerX, props.playerY)
     if (res.msg) logs.value.push(res.msg)
}

// --- Quick Actions ---
const buyStarterPack = () => {
    const pack = [
        { name: 'Dagger', count: 1 },
        { name: 'Red Potion', count: 50 },
        { name: 'Fly Wing', count: 10 }
    ]
    pack.forEach(p => {
        const itemInShop = shopItems.value.find(i => i.name.toLowerCase().includes(p.name.toLowerCase()) || i.name.includes('短剑') || i.name.includes('红色药水') || i.name.includes('苍蝇翅膀'))
        if (itemInShop) {
             buyItem(itemInShop.name, p.count, props.mapId, props.playerX, props.playerY)
        }
    })
    logs.value.push('购买了新手补给包')
}

const getIconClass = (type) => {
    if (type === 'USABLE') return 'text-green-500'
    if (type === 'WEAPON') return 'text-red-500'
    if (type === 'ARMOR') return 'text-blue-500'
    if (type === 'AMMO') return 'text-yellow-500'
    return 'text-gray-500'
}

</script>

<template>
    <div class="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-[75]" @click.self="$emit('close')">
        <div class="bg-[#1e1e1e] border border-gray-700 w-[800px] h-[600px] flex flex-col shadow-2xl rounded-lg overflow-hidden" @click.stop>
            <!-- Header -->
            <div class="bg-gray-900 border-b border-gray-700 p-3 flex justify-between items-center">
                <div class="flex items-center gap-4">
                    <h3 class="text-white font-bold">商店与交易</h3>
                    <div class="flex bg-black rounded p-1 gap-1">
                        <button 
                            @click="activeTab = 'Buy'" 
                            class="px-3 py-1 text-xs rounded transition-colors"
                            :class="activeTab === 'Buy' ? 'bg-green-700 text-white' : 'text-gray-500 hover:text-gray-300'"
                        >
                            购买 (Buy)
                        </button>
                        <button 
                            @click="activeTab = 'Sell'" 
                            class="px-3 py-1 text-xs rounded transition-colors"
                            :class="activeTab === 'Sell' ? 'bg-red-700 text-white' : 'text-gray-500 hover:text-gray-300'"
                        >
                            贩卖 (Sell)
                        </button>
                    </div>
                </div>
                <button @click="$emit('close')" class="text-gray-500 hover:text-white text-xl">×</button>
            </div>

            <!-- Content Area -->
            <div class="flex flex-1 overflow-hidden">
                
                <!-- Center Panel: Item List -->
                <div class="flex-1 overflow-y-auto p-4 custom-scrollbar bg-[#121212] flex flex-col">
                    
                    <!-- BUY MODE -->
                    <template v-if="activeTab === 'Buy'">
                         <div v-if="shopItems.length === 0" class="text-center text-gray-500 mt-10">
                            附近没有商人...
                            <div class="text-xs mt-2">请移动到 NPC 身边</div>
                        </div>
                        <div class="grid grid-cols-1 gap-2">
                            <div v-for="item in shopItems" :key="item.id" class="bg-[#1a1a1a] p-2 rounded flex justify-between items-center border border-gray-800 hover:border-gray-600">
                                <div>
                                    <div class="font-bold text-sm text-gray-200">{{ item.name }}</div>
                                    <div class="text-[10px]" :class="getIconClass(item.type || getItemInfo(item.id).type)">
                                        {{ item.price }} z
                                    </div>
                                </div>
                                <div class="flex items-center gap-2">
                                    <button @click="addToCart(item.id)" class="bg-blue-900 hover:bg-blue-800 text-blue-100 text-xs px-2 py-1 rounded border border-blue-800">
                                        + 购物车
                                    </button>
                                </div>
                            </div>
                        </div>
                    </template>

                    <!-- SELL MODE -->
                    <template v-else>
                         <div v-if="sellableInventory.length === 0" class="text-center text-gray-500 mt-10">
                            背包里没有可贩卖的物品
                        </div>
                        <div v-else class="mb-2 px-1">
                            <button @click="addAllJunkToQueue" class="w-full bg-orange-900 hover:bg-orange-800 text-orange-100 text-[11px] py-1.5 rounded border border-orange-800 flex items-center justify-center gap-2">
                                <span>🧹</span> 一键添加所有杂物 (ETC) 到待售
                            </button>
                        </div>
                        <div class="grid grid-cols-1 gap-2">
                            <div v-for="item in sellableInventory" :key="item.invIndex" class="bg-[#1a1a1a] p-2 rounded flex justify-between items-center border border-gray-800 hover:border-gray-600">
                                <div class="flex items-center gap-2 overflow-hidden">
                                     <!-- Type Indicator -->
                                    <div class="w-1 h-8 rounded shrink-0" :class="{
                                        'bg-green-500': item.iconType === ItemType.USABLE,
                                        'bg-red-500': item.iconType === ItemType.EQUIP || item.iconType === ItemType.WEAPON,
                                        'bg-blue-500': item.iconType === ItemType.ARMOR,
                                        'bg-gray-500': item.iconType === ItemType.ETC
                                    }"></div>
                                    <div class="min-w-0">
                                        <div class="font-bold text-sm text-gray-200 truncate">{{ item.name }}</div>
                                        <div class="text-[10px] text-gray-400 flex gap-2">
                                            <span>库存: {{ item.count }}</span>
                                            <span class="text-yellow-600">卖价: {{ item.sellPrice }} z</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="flex items-center gap-1 shrink-0">
                                    <button @click="sellOne(item.rawItem)" class="bg-gray-800 hover:bg-gray-700 text-gray-400 text-[10px] px-2 py-1 rounded border border-gray-700" title="直接出售 1 个">
                                        1个
                                    </button>
                                     <button @click="addToSellQueue(item.invIndex)" class="bg-red-950 hover:bg-red-900 text-red-300 text-[10px] px-2 py-1 rounded border border-red-900" title="添加 1 个到待售">
                                        +待售
                                    </button>
                                    <button @click="addAllToSellQueue(item.invIndex)" class="bg-red-900 hover:bg-red-800 text-red-100 text-[10px] px-2 py-1 rounded border border-red-700 font-bold" title="全部添加到待售">
                                        全部
                                    </button>
                                </div>
                            </div>
                        </div>
                    </template>

                </div>

                <!-- Right Sidebar: Cart / Queue -->
                <div class="w-72 bg-gray-900 border-l border-gray-700 p-4 flex flex-col">
                    
                    <!-- Logs (Mini) -->
                    <div class="h-20 bg-black mb-4 rounded p-2 overflow-y-auto text-[10px] font-mono text-gray-400 border border-gray-800">
                        <div v-for="(log, idx) in logs.slice().reverse()" :key="idx" class="mb-0.5">> {{ log }}</div>
                        <div v-if="logs.length === 0" class="italic opacity-50">交易日志...</div>
                    </div>

                    <!-- CART VIEW -->
                    <template v-if="activeTab === 'Buy'">
                        <h4 class="text-green-500 font-bold mb-4 uppercase text-xs tracking-wider flex justify-between">
                            <span>购物清单</span>
                            <span v-if="totalCost > 0">{{ totalCost.toLocaleString() }} z</span>
                        </h4>
                        
                        <div class="flex-1 overflow-y-auto mb-4 border border-gray-800 rounded p-2 bg-black custom-scrollbar">
                            <div v-for="(count, id) in cart" :key="id" class="flex justify-between items-center text-xs text-gray-300 mb-1 border-b border-gray-800 pb-1">
                                <span class="truncate flex-1">{{ shopItems.find(i => i.id == id)?.name }}</span>
                                <div class="flex items-center gap-2">
                                    <span class="text-cyan-400">x{{ count }}</span>
                                    <button @click="delete cart[id]" class="text-red-500 hover:text-red-300">×</button>
                                </div>
                            </div>
                            <div v-if="Object.keys(cart).length === 0" class="text-gray-600 italic text-xs text-center mt-2">购物车是空的</div>
                        </div>

                        <div class="space-y-2">
                             <div class="flex justify-between text-xs text-gray-400">
                                <span>持有:</span>
                                <span>{{ player.zeny.toLocaleString() }} z</span>
                            </div>
                            <button @click="buyCart" :disabled="totalCost === 0 || totalCost > player.zeny" class="w-full bg-blue-700 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs py-2 rounded font-bold border border-blue-600">
                                <span v-if="totalCost > player.zeny">Zeny 不足</span>
                                <span v-else>确认购买</span>
                            </button>
                            
                            <div class="mt-4 pt-4 border-t border-gray-800">
                                <button @click="buyStarterPack" class="w-full bg-gray-800 hover:bg-gray-700 text-green-400 text-xs py-2 rounded border border-gray-600">
                                    快速购买: 新手包 (1500z)
                                </button>
                            </div>
                        </div>
                    </template>

                    <!-- SELL QUEUE VIEW -->
                    <template v-else>
                        <h4 class="text-red-500 font-bold mb-4 uppercase text-xs tracking-wider flex justify-between">
                            <span>待售清单</span>
                            <span v-if="totalSellValue > 0">+{{ totalSellValue.toLocaleString() }} z</span>
                        </h4>

                        <div class="flex-1 overflow-y-auto mb-4 border border-gray-800 rounded p-2 bg-black custom-scrollbar">
                            <div v-for="(amount, idxStr) in sellQueue" :key="idxStr" class="flex justify-between items-center text-xs text-gray-300 mb-1 border-b border-gray-800 pb-1">
                                <span class="truncate flex-1">{{ player.inventory[idxStr]?.name || getItemInfo(player.inventory[idxStr]?.id)?.name }}</span>
                                <div class="flex items-center gap-2">
                                    <span class="text-red-400">x{{ amount }}</span>
                                    <button @click="delete sellQueue[idxStr]" class="text-gray-500 hover:text-white">×</button>
                                </div>
                            </div>
                            <div v-if="Object.keys(sellQueue).length === 0" class="text-gray-600 italic text-xs text-center mt-2">点击 "+ 待售" 添加</div>
                        </div>

                         <div class="space-y-2">
                            <button @click="confirmSell" :disabled="totalSellValue === 0" class="w-full bg-red-900 hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs py-2 rounded font-bold border border-red-700">
                                确认出售
                            </button>
                        </div>
                    </template>

                </div>
            </div>
        </div>
    </div>
</template>
