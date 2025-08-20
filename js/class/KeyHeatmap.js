define([], function () {
    /**
     * 按键热力图管理类
     * 记录和可视化按键频率
     */
    class KeyHeatmap {
        constructor() {
            this.container = null;
            this.maxFrequency = 1;
            this.keyStats = this.loadKeyStats();
            this.keyPairStats = this.loadKeyPairStats(); // 新增：按键对统计
            this.lastKey = null; // 记录上一个按键，用于计算按键对
            
            // 左右手键位映射
            this.leftHandKeys = new Set([
                // 左手字母
                'Q', 'W', 'E', 'R', 'T',
                'A', 'S', 'D', 'F', 'G',
                'Z', 'X', 'C', 'V', 'B',
                // 左手数字
                '1', '2', '3', '4', '5',
                // 左手符号
                '`', 'Tab', 'Caps', 'LShift', 'LCtrl', 'LAlt', 'LCmd',
                // 左手符号(需要Shift的)
                '!', '@', '#', '$', '%', '~'
            ]);
            
            this.rightHandKeys = new Set([
                // 右手字母  
                'Y', 'U', 'I', 'O', 'P',
                'H', 'J', 'K', 'L',
                'N', 'M',
                // 右手数字 (宇浩：很多分体键盘的6在左手)
                '6', '7', '8', '9', '0',
                // 右手符号
                '-', '=', '[', ']', '\\', ';', "'", ',', '.', '/',
                'Backspace', 'Enter', 'RShift', 'RCtrl', 'RAlt', 'RCmd',
                // 右手符号(需要Shift的)
                '^', '&', '*', '(', ')', '_', '+', '{', '}', '|', ':', '"', '<', '>', '?'
            ]);
            
            this.init();
        }

        /**
         * 从localStorage加载按键统计数据
         */
        loadKeyStats() {
            const saved = localStorage.getItem('typepad_key_stats');
            if (saved) {
                try {
                    const data = JSON.parse(saved);
                    const stats = data.stats || {};
                    // 重新计算maxFrequency，确保准确性
                    this.maxFrequency = Object.keys(stats).length > 0 
                        ? Math.max(...Object.values(stats)) 
                        : 1;
                    return stats;
                } catch (e) {
                    console.warn('Failed to load key stats:', e);
                }
            }
            this.maxFrequency = 1;
            return {};
        }

        /**
         * 保存按键统计数据到localStorage
         */
        saveKeyStats() {
            const data = {
                stats: this.keyStats,
                keyPairStats: this.keyPairStats,
                maxFrequency: this.maxFrequency,
                lastUpdate: Date.now()
            };
            localStorage.setItem('typepad_key_stats', JSON.stringify(data));
        }

        /**
         * 加载按键对统计数据
         */
        loadKeyPairStats() {
            const saved = localStorage.getItem('typepad_key_stats');
            if (saved) {
                try {
                    const data = JSON.parse(saved);
                    return data.keyPairStats || {};
                } catch (e) {
                    console.warn('Failed to load key pair stats:', e);
                }
            }
            return {};
        }

        /**
         * 记录按键对频率
         */
        recordKeyPair(currentKey) {
            if (this.lastKey && currentKey) {
                const pair = `${this.lastKey}-${currentKey}`;
                this.keyPairStats[pair] = (this.keyPairStats[pair] || 0) + 1;
            }
            this.lastKey = currentKey;
        }

        /**
         * 重置按键对记录状态（用于新段落开始时）
         */
        resetKeyPairState() {
            this.lastKey = null;
        }

        /**
         * 判断按键属于哪只手
         */
        getKeyHand(key) {
            if (this.leftHandKeys.has(key)) {
                return 'left';
            } else if (this.rightHandKeys.has(key)) {
                return 'right';
            } else {
                // 对于Space等中性键，我们认为它是双手键
                return 'neutral';
            }
        }

        /**
         * 计算左右手互击率
         */
        calculateHandAlternationRate() {
            const totalPairs = Object.values(this.keyPairStats).reduce((sum, count) => sum + count, 0);
            if (totalPairs === 0) {
                return {
                    total: 0,
                    alternating: 0,
                    rate: 0,
                    leftToRight: 0,
                    rightToLeft: 0,
                    sameHand: 0
                };
            }

            let alternatingCount = 0;
            let leftToRightCount = 0;
            let rightToLeftCount = 0;
            let sameHandCount = 0;

            Object.entries(this.keyPairStats).forEach(([pair, count]) => {
                const [key1, key2] = pair.split('-');
                const hand1 = this.getKeyHand(key1);
                const hand2 = this.getKeyHand(key2);
                
                // 跳过包含中性键的按键对
                if (hand1 === 'neutral' || hand2 === 'neutral') {
                    return;
                }
                
                if (hand1 !== hand2) {
                    alternatingCount += count;
                    if (hand1 === 'left' && hand2 === 'right') {
                        leftToRightCount += count;
                    } else if (hand1 === 'right' && hand2 === 'left') {
                        rightToLeftCount += count;
                    }
                } else {
                    sameHandCount += count;
                }
            });

            const validPairs = alternatingCount + sameHandCount;
            const rate = validPairs > 0 ? (alternatingCount / validPairs) * 100 : 0;

            return {
                total: validPairs,
                alternating: alternatingCount,
                rate: Math.round(rate * 100) / 100, // 保留两位小数
                leftToRight: leftToRightCount,
                rightToLeft: rightToLeftCount,
                sameHand: sameHandCount
            };
        }

        /**
         * 处理修饰键的位置检测
         * 我们要严格区分左右修饰键，
         * 例如左Shift和右Shift是不同的按键。
         * 这样可以更准确地反映按键的使用频率和热力分布。
         * 并且了解左右手的实际负荷。
         */
        recordKeyWithLocation(event) {
            const key = event.key;
            let normalizedKey = this.normalizeKey(key);
            
            // 严格区分左右修饰键
            if (key === 'Shift') {
                normalizedKey = event.location === 1 ? 'LShift' : 'RShift';
            } else if (key === 'Control') {
                normalizedKey = event.location === 1 ? 'LCtrl' : 'RCtrl';
            } else if (key === 'Alt') {
                normalizedKey = event.location === 1 ? 'LAlt' : 'RAlt';
            } else if (key === 'Meta') {
                normalizedKey = event.location === 1 ? 'LCmd' : 'RCmd';
            }
            
            if (normalizedKey) {
                // 记录单个按键频率
                this.keyStats[normalizedKey] = (this.keyStats[normalizedKey] || 0) + 1;
                this.maxFrequency = Math.max(this.maxFrequency, this.keyStats[normalizedKey]);
                
                // 记录按键对频率
                this.recordKeyPair(normalizedKey);
                
                this.saveKeyStats();
                this.updateDisplay();
            }
        }

        /**
         * 记录按键
         */
        recordKey(key) {
            // 将按键转换为大写以统一处理
            const normalizedKey = this.normalizeKey(key);
            
            if (normalizedKey) {
                // 记录单个按键频率
                this.keyStats[normalizedKey] = (this.keyStats[normalizedKey] || 0) + 1;
                this.maxFrequency = Math.max(this.maxFrequency, this.keyStats[normalizedKey]);
                
                // 记录按键对频率
                this.recordKeyPair(normalizedKey);
                
                this.saveKeyStats();
                this.updateDisplay();
            }
        }

        /**
         * 标准化按键名称
         */
        normalizeKey(key) {
            // 特殊键名映射
            const keyMap = {
                ' ': 'Space',
                'Enter': 'Enter',
                'Backspace': 'Backspace',
                'Tab': 'Tab',
                'CapsLock': 'Caps',
                'Escape': 'Esc'
            };

            if (keyMap[key]) {
                return keyMap[key];
            }

            // 字母、数字、符号直接使用大写
            if (key.length === 1) {
                return key.toUpperCase();
            }

            return null;
        }

        /**
         * 初始化热力图容器
         */
        init() {
            this.createContainer();
            this.createKeyboard();
            this.updateDisplay();
        }

        /**
         * 创建热力图容器
         */
        createContainer() {
            const container = document.createElement('div');
            container.className = 'key-heatmap-container';
            container.innerHTML = `
                <div class="key-heatmap-header">
                    <h3>按键频率热力图</h3>
                    <div class="key-heatmap-controls">
                        <button class="key-heatmap-export" onclick="keyHeatmap.exportStats()">导出数据</button>
                        <button class="key-heatmap-import" onclick="keyHeatmap.importStats()">导入数据(增量)</button>
                        <button class="key-heatmap-reset" onclick="keyHeatmap.resetStats()">重置统计</button>
                    </div>
                </div>
                <input type="file" id="keyHeatmapFileInput" accept=".json" style="display: none;" onchange="keyHeatmap.handleFileImport(event)">
                <div class="key-heatmap-legend">
                    <span>低频</span>
                    <div class="legend-gradient"></div>
                    <span>高频</span>
                </div>
                <div class="key-heatmap-board"></div>
                <div class="key-heatmap-stats">
                    <div class="stats-row">
                        <span>总按键数: <span class="total-keys">0</span></span>
                        <span>最高频率: <span class="max-frequency">0</span></span>
                    </div>
                    <div class="stats-row hand-alternation-stats">
                        <span>左右手互击率: <span class="alternation-rate">0%</span></span>
                        <span>互击次数: <span class="alternation-count">0</span></span>
                        <span>同手次数: <span class="same-hand-count">0</span></span>
                    </div>
                </div>
            `;

            // 找到成绩表格容器并在其后插入热力图
            const tableContainer = document.querySelector('.table-container');
            if (tableContainer) {
                tableContainer.insertAdjacentElement('afterend', container);
            } else {
                // 如果找不到表格容器，则添加到页面底部
                document.body.appendChild(container);
            }
            this.container = container;
        }

        /**
         * 创建键盘布局
         * 和其他的网站的热力图不同，这里宇浩认为应当创建一个完整的键盘布局，
         * 包括所有的字母、数字和符号键，以及常用的功能键。
         * 这样可以更直观地展示按键的使用频率和热力分布。
         * 在输入法界，通常认为左手理论按键频率太大不好，
         * 但是实际上右手的实际按键频率也很高，因为符号区、回车键、回改键
         * 以及其他常用的功能键都在右手区域。
         */
        createKeyboard() {
            const keyboard = this.container.querySelector('.key-heatmap-board');
            
            // 键盘布局定义，严格区分左右修饰键
            const layout = [
                ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'Backspace'],
                ['Tab', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', '\\'],
                ['Caps', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'", 'Enter'],
                ['LShift', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/', 'RShift'],
                ['LCtrl', 'LAlt', 'Space', 'RAlt', 'RCtrl']
            ];

            layout.forEach(row => {
                const rowElement = document.createElement('div');
                rowElement.className = 'key-row';
                
                row.forEach(key => {
                    const keyElement = document.createElement('div');
                    keyElement.className = 'key-item';
                    keyElement.dataset.key = key;
                    
                    // 创建按键内容结构：字母 + 百分比
                    keyElement.innerHTML = `
                        <div class="key-label">${key}</div>
                        <div class="key-percentage">0%</div>
                    `;
                    
                    // 设置特殊键的宽度
                    if (key === 'Backspace') keyElement.classList.add('key-wide');
                    else if (key === 'Tab') keyElement.classList.add('key-medium');
                    else if (key === 'Caps') keyElement.classList.add('key-medium');
                    else if (key === 'Enter') keyElement.classList.add('key-medium');
                    else if (key === 'LShift' || key === 'RShift') keyElement.classList.add('key-large');
                    else if (key === 'Space') keyElement.classList.add('key-space');
                    else if (key === 'LCtrl' || key === 'RCtrl' || key === 'LAlt' || key === 'RAlt') keyElement.classList.add('key-small');
                    
                    rowElement.appendChild(keyElement);
                });
                
                keyboard.appendChild(rowElement);
            });
        }

        /**
         * 更新热力图显示
         */
        updateDisplay() {
            if (!this.container) return;

            const totalKeys = Object.values(this.keyStats).reduce((sum, count) => sum + count, 0);
            this.container.querySelector('.total-keys').textContent = totalKeys.toLocaleString();
            this.container.querySelector('.max-frequency').textContent = this.maxFrequency.toLocaleString();

            // 计算并更新左右手互击率
            const handStats = this.calculateHandAlternationRate();
            const alternationRateElement = this.container.querySelector('.alternation-rate');
            const alternationCountElement = this.container.querySelector('.alternation-count');
            const sameHandCountElement = this.container.querySelector('.same-hand-count');
            
            if (alternationRateElement) {
                alternationRateElement.textContent = `${handStats.rate}%`;
            }
            if (alternationCountElement) {
                alternationCountElement.textContent = handStats.alternating.toLocaleString();
            }
            if (sameHandCountElement) {
                sameHandCountElement.textContent = handStats.sameHand.toLocaleString();
            }

            // 更新每个按键的热力图显示
            this.container.querySelectorAll('.key-item').forEach(keyElement => {
                const key = keyElement.dataset.key;
                const frequency = this.keyStats[key] || 0;
                const intensity = this.maxFrequency > 0 ? frequency / this.maxFrequency : 0;
                const percentage = totalKeys > 0 ? ((frequency / totalKeys) * 100).toFixed(1) : '0.0';
                
                // 设置热力图颜色
                keyElement.style.setProperty('--intensity', intensity);
                keyElement.setAttribute('title', `${key}: ${frequency} 次 (${percentage}%)`);
                
                // 更新百分比显示
                const percentageElement = keyElement.querySelector('.key-percentage');
                if (percentageElement) {
                    percentageElement.textContent = `${percentage}%`;
                }
            });
        }

        /**
         * 导出统计数据
         */
        exportStats() {
            const totalKeyPairs = Object.values(this.keyPairStats).reduce((sum, count) => sum + count, 0);
            const handStats = this.calculateHandAlternationRate();
            
            const data = {
                stats: this.keyStats,
                keyPairStats: this.keyPairStats,
                handAlternationStats: handStats, // 新增：左右手互击率数据
                maxFrequency: this.maxFrequency,
                totalKeys: Object.values(this.keyStats).reduce((sum, count) => sum + count, 0),
                totalKeyPairs: totalKeyPairs,
                exportTime: new Date().toISOString(),
                version: '1.2', // 版本升级，表示包含左右手互击率数据
                website: 'https://genda.shurufa.app',
                description: '按鍵統計數據（包含左右手互擊率分析）',
            };

            const dataStr = JSON.stringify(data, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(dataBlob);
            link.download = `genda.shurufa.app-key-stats-${new Date().toISOString().split('T')[0]}.json`;
            link.click();
            
            URL.revokeObjectURL(link.href);
        }

        /**
         * 导入统计数据
         */
        importStats() {
            document.getElementById('keyHeatmapFileInput').click();
        }

        /**
         * 处理文件导入
         */
        handleFileImport(event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    if (data.stats && typeof data.stats === 'object') {
                        // 合并单键统计数据
                        Object.keys(data.stats).forEach(key => {
                            this.keyStats[key] = (this.keyStats[key] || 0) + data.stats[key];
                        });
                        
                        // 合并按键对统计数据
                        if (data.keyPairStats && typeof data.keyPairStats === 'object') {
                            Object.keys(data.keyPairStats).forEach(pair => {
                                this.keyPairStats[pair] = (this.keyPairStats[pair] || 0) + data.keyPairStats[pair];
                            });
                        }
                        
                        // 重新计算最大频率
                        this.maxFrequency = Object.keys(this.keyStats).length > 0 
                            ? Math.max(...Object.values(this.keyStats)) 
                            : 1;
                        
                        this.saveKeyStats();
                        this.updateDisplay();
                        
                        alert('数据导入成功了哟！开心开心！不过注意一下，导入数据没有覆盖现有数据，而是增量合并哦！');
                    } else {
                        alert('文件格式错误了哟！');
                    }
                } catch (error) {
                    alert('文件解析失败：' + error.message);
                }
            };
            
            reader.readAsText(file);
            
            // 清除文件输入，允许重复选择同一文件
            event.target.value = '';
        }

        /**
         * 重置统计数据
         */
        resetStats() {
            if (confirm('你确定要重置所有按键统计数据吗？最好先备份一下数据哦！')) {
                this.keyStats = {};
                this.keyPairStats = {}; // 同时清空按键对数据
                this.maxFrequency = 1;
                this.lastKey = null; // 重置上一个按键记录
                this.saveKeyStats();
                this.updateDisplay();
            }
        }

        /**
         * 获取按键统计摘要
         */
        getStatsSummary() {
            const totalKeys = Object.values(this.keyStats).reduce((sum, count) => sum + count, 0);
            const totalKeyPairs = Object.values(this.keyPairStats).reduce((sum, count) => sum + count, 0);
            const handStats = this.calculateHandAlternationRate();
            const topKeys = Object.entries(this.keyStats)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10);
            const topKeyPairs = Object.entries(this.keyPairStats)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10);
            
            return {
                totalKeys,
                totalKeyPairs,
                handAlternationStats: handStats,
                topKeys,
                topKeyPairs,
                maxFrequency: this.maxFrequency
            };
        }

        /**
         * 调试方法：在控制台显示按键对统计
         */
        debugKeyPairs() {
            console.log('=== 按键对频率统计 ===');
            console.log('总按键对数量:', Object.values(this.keyPairStats).reduce((sum, count) => sum + count, 0));
            
            const sortedPairs = Object.entries(this.keyPairStats)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 20);
            
            console.log('前20个最频繁的按键对:');
            sortedPairs.forEach(([pair, count], index) => {
                console.log(`${index + 1}. ${pair}: ${count}次`);
            });
            
            return sortedPairs;
        }
    }

    return KeyHeatmap;
});