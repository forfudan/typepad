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
            
            // 当量表 - 从 equivTable.json 配置文件加载
            this.equivTable = new Map();
            this.equivTableLoaded = false; // 标记当量表是否已加载
            
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
         * 从外部 JSON 文件加载当量表
         */
        async loadEquivTable() {
            try {
                const response = await fetch('./config/equivTable.json');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const equivConfig = await response.json();
                
                // 将JSON对象转换为Map
                Object.entries(equivConfig.data).forEach(([keys, equiv]) => {
                    this.equivTable.set(keys, equiv);
                });
                
                console.log(`成功加载当量表，共 ${this.equivTable.size} 个按键组合`);
                this.equivTableLoaded = true;
                
                // 当量表加载完成后，重新更新显示
                if (this.container) {
                    this.updateDisplay();
                }
            } catch (error) {
                console.warn('加载当量表失败，将使用空的当量表:', error);
                this.equivTableLoaded = false;
                // 如果加载失败，保持空的Map，这样当量计算会返回0
            }
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
                
                // 特殊处理包含空格的按键对
                if (key1 === 'Space' || key2 === 'Space') {
                    // 空格算作0.5个同手，0.5个互击
                    alternatingCount += count * 0.5;
                    sameHandCount += count * 0.5;
                    
                    // 根据非空格键的手部归属来分配左右互击
                    const nonSpaceKey = key1 === 'Space' ? key2 : key1;
                    const nonSpaceHand = this.getKeyHand(nonSpaceKey);
                    if (nonSpaceHand === 'left') {
                        leftToRightCount += count * 0.25; // 左手->空格(右手部分)
                        rightToLeftCount += count * 0.25; // 空格(左手部分)->左手
                    } else if (nonSpaceHand === 'right') {
                        leftToRightCount += count * 0.25; // 空格(左手部分)->右手
                        rightToLeftCount += count * 0.25; // 右手->空格(右手部分)
                    }
                    return;
                }
                
                // 跳过其他中性键的按键对
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

            const result = {
                total: Math.round(validPairs * 100) / 100, // 保留两位小数
                alternating: Math.round(alternatingCount * 100) / 100,
                rate: Math.round(rate * 100) / 100, // 保留两位小数
                leftToRight: Math.round(leftToRightCount * 100) / 100,
                rightToLeft: Math.round(rightToLeftCount * 100) / 100,
                sameHand: Math.round(sameHandCount * 100) / 100
            };
            
            return result;
        }

        /**
         * 计算加权平均当量
         * 使用按键对频率和当量表计算整体当量值
         * 详见: 琼林撷英：中文输入法常用概念术语
         * https://shurufa.app/docs/concepts.html
         */
        calculateWeightedEquivalent() {
            let totalWeightedEquiv = 0;
            let totalValidPairs = 0;
            
            Object.entries(this.keyPairStats).forEach(([pair, count]) => {
                // 将按键对转换为当量表格式
                const equivKey = this.convertPairToEquivKey(pair);
                
                if (equivKey && this.equivTable.has(equivKey)) {
                    const equiv = this.equivTable.get(equivKey);
                    totalWeightedEquiv += equiv * count;
                    totalValidPairs += count;
                }
            });
            
            const averageEquiv = totalValidPairs > 0 ? totalWeightedEquiv / totalValidPairs : 0;
            
            const result = {
                totalValidPairs,
                totalWeightedEquiv: Math.round(totalWeightedEquiv * 100) / 100,
                averageEquiv: Math.round(averageEquiv * 100) / 100
            };
            
            return result;
        }

        /**
         * 将按键对转换为当量表中的键格式
         * 例如：'A-Space' -> 'a_', 'Space-B' -> '_b'
         */
        convertPairToEquivKey(pair) {
            const [key1, key2] = pair.split('-');
            
            // 转换为当量表格式：小写字母，空格用_表示
            const convertKey = (key) => {
                if (key === 'Space') {
                    return '_';
                }
                // 只处理字母和分号，其他键忽略
                if (key.length === 1 && /[A-Za-z;]/.test(key)) {
                    return key.toLowerCase();
                }
                return null;
            };
            
            const convertedKey1 = convertKey(key1);
            const convertedKey2 = convertKey(key2);
            
            // 只有当两个键都能转换时才返回有效的当量键
            if (convertedKey1 !== null && convertedKey2 !== null) {
                return convertedKey1 + convertedKey2;
            }
            
            return null;
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
            
            // 异步加载当量表
            this.loadEquivTable();
        }

        /**
         * 创建热力图容器
         */
        createContainer() {
            const container = document.createElement('div');
            container.className = 'key-heatmap-container';
            container.innerHTML = `
                <div class="key-heatmap-header">
                    <div class="key-heatmap-title">
                        <span class="title-text">按键频率热力图</span>
                        <div class="title-inputs">
                            <input 
                                type="text" 
                                class="scheme-input" 
                                placeholder="输入方案名称"
                                maxlength="20"
                                oninput="keyHeatmap.updateTitle()"
                            >
                            <input 
                                type="text" 
                                class="user-input" 
                                placeholder="用户昵称"
                                maxlength="15"
                                oninput="keyHeatmap.updateTitle()"
                            >
                        </div>
                    </div>
                    <div class="key-heatmap-controls">
                        <button class="key-heatmap-export" onclick="keyHeatmap.exportStats()">导出数据</button>
                        <button class="key-heatmap-import" onclick="keyHeatmap.importStats()">增量导入</button>
                        <button class="key-heatmap-screenshot" onclick="keyHeatmap.captureHeatmap()">分享</button>
                        <button class="key-heatmap-reset" onclick="keyHeatmap.resetStats()">重置</button>
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
                    <div class="stats-grid">
                        <div class="stat-item">
                            <span class="stat-label">累计按键数</span>
                            <span class="stat-value total-keys">0</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">最常用按键频数</span>
                            <span class="stat-value max-frequency">0</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">左右手互击率</span>
                            <span class="stat-value alternation-rate">0%</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">互击次数</span>
                            <span class="stat-value alternation-count">0</span>
                            <span class="stat-note">(空格算作0.5)</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">同手次数</span>
                            <span class="stat-value same-hand-count">0</span>
                            <span class="stat-note">(空格算作0.5)</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">按键组合平均当量</span>
                            <span class="stat-value average-equiv">0.00</span>
                            <span class="stat-note">(频数加权)</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">有效按键组合总数</span>
                            <span class="stat-value valid-pairs">0</span>
                            <span class="stat-note">(计入当量的按键对)</span>
                        </div>
                    </div>
                </div>
                <div class="key-heatmap-footer">
                    <p class="heatmap-note">
                        💡 关于中文输入法常用概念以及其定义，请参阅
                        <a href="https://shurufa.app/docs/concepts.html" target="_blank" rel="noopener noreferrer"><span style="text-decoration: wavy underline;">琼林撷英</span></a>
                        一文
                    </p>
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
            
            // 加载保存的方案名和用户昵称
            this.loadTitleInputs();
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

            // 计算并更新当量信息
            const equivStats = this.calculateWeightedEquivalent();
            const averageEquivElement = this.container.querySelector('.average-equiv');
            const validPairsElement = this.container.querySelector('.valid-pairs');
            
            if (averageEquivElement) {
                if (this.equivTableLoaded) {
                    averageEquivElement.textContent = equivStats.averageEquiv.toFixed(2);
                } else {
                    averageEquivElement.textContent = '加载中...';
                }
            }
            if (validPairsElement) {
                if (this.equivTableLoaded) {
                    validPairsElement.textContent = equivStats.totalValidPairs.toLocaleString();
                } else {
                    validPairsElement.textContent = '加载中...';
                }
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
            const equivStats = this.calculateWeightedEquivalent();
            
            const data = {
                stats: this.keyStats,
                keyPairStats: this.keyPairStats,
                handAlternationStats: handStats, // 新增：左右手互击率数据
                equivalentStats: equivStats, // 新增：当量统计数据
                maxFrequency: this.maxFrequency,
                totalKeys: Object.values(this.keyStats).reduce((sum, count) => sum + count, 0),
                totalKeyPairs: totalKeyPairs,
                exportTime: new Date().toISOString(),
                version: '1.3', // 版本升级，表示包含当量数据
                website: 'https://genda.shurufa.app',
                description: '按鍵統計數據（包含左右手互擊率分析和當量分析）',
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
         * 截图并复制到剪贴板（增强兼容性版本）
         */
        async captureHeatmap() {
            const button = document.querySelector('.key-heatmap-screenshot');
            const originalText = button.textContent;
            
            try {
                // 显示加载状态
                button.textContent = '截图中...';
                button.disabled = true;

                // 检查 Clipboard API 支持（Edge/Safari可能有限制）
                const hasClipboardAPI = navigator.clipboard && navigator.clipboard.write;
                
                // 检测浏览器类型
                const isEdge = /Edge|Edg/.test(navigator.userAgent);
                const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
                
                // 尝试加载html2canvas库
                let canvasLibLoaded = false;
                try {
                    await this.loadHtml2Canvas();
                    canvasLibLoaded = window.html2canvas !== undefined;
                } catch (error) {
                    console.warn('html2canvas加载失败:', error);
                    canvasLibLoaded = false;
                }

                // 如果html2canvas加载失败，直接使用DOM到图片的备用方案
                if (!canvasLibLoaded) {
                    console.log('html2canvas不可用，使用备用截图方案');
                    await this.captureWithFallback();
                    return;
                }

                // 截取热力图容器
                const canvas = await html2canvas(this.container, {
                    backgroundColor: document.body.classList.contains('black') ? '#0f0f13' : '#ffffff',
                    scale: 2, // 提高清晰度
                    useCORS: true,
                    allowTaint: false, // Edge兼容性调整
                    logging: false,
                    width: this.container.offsetWidth,
                    height: this.container.offsetHeight,
                    onclone: function(clonedDoc) {
                        // 确保克隆文档中的样式正确加载
                        clonedDoc.querySelector('body').style.margin = '0';
                        clonedDoc.querySelector('body').style.padding = '0';
                    }
                });

                // 尝试复制到剪贴板，失败则提供下载
                if (hasClipboardAPI && !isEdge && !isSafari) {
                    // Chrome/Firefox: 使用 Clipboard API
                    await this.copyCanvasToClipboard(canvas);
                } else {
                    // Edge/Safari/旧版浏览器: 提供下载功能
                    this.downloadCanvas(canvas);
                }

            } catch (error) {
                console.error('截图失败:', error);
                // 最后的备用方案：提示用户手动截图
                this.showFallbackInstructions();
            } finally {
                // 恢复按钮状态
                button.textContent = originalText;
                button.disabled = false;
            }
        }

        /**
         * 备用截图方案 - 生成信息卡片
         */
        async captureWithFallback() {
            try {
                // 创建一个固定尺寸的canvas
                const canvas = document.createElement('canvas');
                canvas.width = 800;
                canvas.height = 600;
                
                const ctx = canvas.getContext('2d');
                
                // 设置背景色
                const isDark = document.body.classList.contains('black');
                ctx.fillStyle = isDark ? '#0f0f13' : '#ffffff';
                ctx.fillRect(0, 0, 800, 600);
                
                // 绘制边框
                ctx.strokeStyle = isDark ? '#333' : '#ddd';
                ctx.lineWidth = 2;
                ctx.strokeRect(20, 20, 760, 560);
                
                // 设置文本样式
                ctx.fillStyle = isDark ? '#e1e1e1' : '#333333';
                ctx.textAlign = 'center';
                
                // 绘制主标题
                ctx.font = 'bold 24px Arial, sans-serif';
                const schemeInput = document.querySelector('.scheme-input');
                const userInput = document.querySelector('.user-input');
                const schemeName = schemeInput ? schemeInput.value.trim() : '';
                const userName = userInput ? userInput.value.trim() : '';
                
                let fullTitle = '按键频率统计信息';
                if (schemeName || userName) {
                    fullTitle += ' ';
                    if (schemeName) fullTitle += ` ${schemeName}`;
                    if (userName) fullTitle += ` ${userName}`;
                }
                
                ctx.fillText(fullTitle, 400, 80);
                
                // 绘制统计信息
                ctx.font = '16px Arial, sans-serif';
                const stats = this.getBasicStats();
                let yPos = 150;
                const lineHeight = 30;
                
                ctx.fillText(`累计按键数: ${stats.totalKeys}`, 400, yPos);
                yPos += lineHeight;
                ctx.fillText(`最常用按键频数: ${stats.maxFrequency}`, 400, yPos);
                yPos += lineHeight;
                ctx.fillText(`左右手互击率: ${stats.alternationRate}`, 400, yPos);
                yPos += lineHeight;
                ctx.fillText(`按键组合平均当量: ${stats.averageEquiv}`, 400, yPos);
                
                // 绘制说明文字
                ctx.font = '14px Arial, sans-serif';
                ctx.fillStyle = isDark ? '#888' : '#666';
                yPos = 450;
                ctx.fillText('📊 这是简化版统计信息', 400, yPos);
                yPos += 25;
                ctx.fillText('🎯 完整热力图和键盘布局还请自行截图哦！', 400, yPos);
                
                // 绘制网站信息
                ctx.font = '12px Arial, sans-serif';
                ctx.fillStyle = isDark ? '#555' : '#999';
                ctx.fillText('生成于 genda.shurufa.app', 400, 550);
                
                // 直接下载
                this.downloadCanvas(canvas);
                
            } catch (error) {
                console.error('备用截图方案也失败:', error);
                this.showFallbackInstructions();
            }
        }

        /**
         * 获取基础统计信息
         */
        getBasicStats() {
            const totalKeys = Object.values(this.keyStats).reduce((sum, count) => sum + count, 0);
            const handStats = this.calculateHandAlternationRate();
            const equivStats = this.calculateWeightedEquivalent();
            
            return {
                totalKeys: totalKeys.toLocaleString(),
                maxFrequency: this.maxFrequency.toLocaleString(),
                alternationRate: `${handStats.rate}%`,
                averageEquiv: equivStats.averageEquiv.toFixed(2)
            };
        }

        /**
         * 显示手动截图说明
         */
        showFallbackInstructions() {
            const instructions = `
                📸 自动截图功能暂不可用，请手动截图：
                
                🖥️ 电脑端：
                • Windows: 按 Win + Shift + S
                • Mac: 按 Cmd + Shift + 4
                
                📱 手机端：
                • 按电源键 + 音量减键
                
                💡 建议使用 Chrome 浏览器获得最佳效果
            `;
            
            this.showCaptureError(instructions);
        }

        /**
         * 复制canvas到剪贴板
         */
        async copyCanvasToClipboard(canvas) {
            return new Promise((resolve, reject) => {
                canvas.toBlob(async (blob) => {
                    try {
                        await navigator.clipboard.write([
                            new ClipboardItem({
                                'image/png': blob
                            })
                        ]);
                        this.showCaptureSuccess('✅ 截图已复制到剪贴板，可以直接粘贴分享了哟！');
                        resolve();
                    } catch (error) {
                        // 剪贴板API失败，改为下载
                        this.downloadCanvas(canvas);
                        resolve();
                    }
                }, 'image/png', 0.9);
            });
        }

        /**
         * 下载canvas为图片文件
         */
        downloadCanvas(canvas) {
            try {
                // 生成文件名
                const schemeInput = document.querySelector('.scheme-input');
                const userInput = document.querySelector('.user-input');
                const schemeName = schemeInput ? schemeInput.value.trim() : '';
                const userName = userInput ? userInput.value.trim() : '';
                
                let filename = '按键频率热力图';
                if (schemeName) filename += `_${schemeName}`;
                if (userName) filename += `_${userName}`;
                filename += `_${new Date().toISOString().slice(0, 10)}.png`;

                // 创建下载链接
                canvas.toBlob((blob) => {
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = filename;
                    link.style.display = 'none';
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                    
                    this.showCaptureSuccess('📁 图片已保存到下载文件夹，可以分享使用了哟！');
                }, 'image/png', 0.9);
            } catch (error) {
                throw new Error('下载功能也失败了，请检查浏览器设置');
            }
        }

        /**
         * 动态加载html2canvas库（带重试和超时）
         */
        async loadHtml2Canvas() {
            if (window.html2canvas) {
                return; // 已经加载
            }

            // 多个CDN源，按优先级排列
            const cdnUrls = [
                'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
                'https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js',
                'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
            ];

            let lastError = null;

            for (const url of cdnUrls) {
                try {
                    await this.loadScriptWithTimeout(url, 10000); // 10秒超时
                    if (window.html2canvas) {
                        console.log(`html2canvas从 ${url} 加载成功`);
                        return;
                    }
                } catch (error) {
                    console.warn(`从 ${url} 加载html2canvas失败:`, error);
                    lastError = error;
                    continue;
                }
            }

            throw new Error(`所有CDN都加载失败: ${lastError?.message || '未知错误'}`);
        }

        /**
         * 带超时的脚本加载
         */
        loadScriptWithTimeout(url, timeout = 10000) {
            return new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = url;
                
                // 设置超时
                const timeoutId = setTimeout(() => {
                    script.remove();
                    reject(new Error(`加载超时: ${url}`));
                }, timeout);

                script.onload = () => {
                    clearTimeout(timeoutId);
                    resolve();
                };

                script.onerror = () => {
                    clearTimeout(timeoutId);
                    script.remove();
                    reject(new Error(`加载失败: ${url}`));
                };

                document.head.appendChild(script);
            });
        }

        /**
         * 显示截图成功消息
         */
        showCaptureSuccess(customMessage) {
            const message = document.createElement('div');
            message.className = 'capture-message success';
            message.innerHTML = customMessage || '✅ 截图已复制到剪贴板，可以直接粘贴分享！';
            this.showMessage(message);
        }

        /**
         * 显示截图错误消息
         */
        showCaptureError(errorText) {
            const message = document.createElement('div');
            message.className = 'capture-message error';
            message.innerHTML = `❌ ${errorText}`;
            this.showMessage(message);
        }

        /**
         * 显示临时消息
         */
        showMessage(messageElement) {
            // 移除之前的消息
            const existingMessage = document.querySelector('.capture-message');
            if (existingMessage) {
                existingMessage.remove();
            }

            // 添加新消息
            this.container.appendChild(messageElement);

            // 3秒后自动移除
            setTimeout(() => {
                if (messageElement.parentNode) {
                    messageElement.remove();
                }
            }, 3000);
        }

        /**
         * 重置统计数据
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
         * 更新标题显示
         */
        updateTitle() {
            const schemeInput = this.container.querySelector('.scheme-input');
            const userInput = this.container.querySelector('.user-input');
            const titleText = this.container.querySelector('.title-text');
            const separator = this.container.querySelector('.title-separator');
            
            const schemeName = schemeInput.value.trim();
            const userName = userInput.value.trim();
            
            // 根据输入内容动态调整输入框宽度
            this.adjustInputWidth(schemeInput);
            this.adjustInputWidth(userInput);
            
            // 更新标题显示
            let titleContent = '按键频率热力图';
            if (schemeName || userName) {
                titleContent += ' ——';
                if (schemeName) {
                    titleContent += ` ${schemeName}`;
                }
                if (userName) {
                    titleContent += ` ${userName}`;
                }
            }
            
            // 保存到localStorage
            localStorage.setItem('typepad_scheme_name', schemeName);
            localStorage.setItem('typepad_user_name', userName);
        }
        
        /**
         * 动态调整输入框宽度
         */
        adjustInputWidth(input) {
            const text = input.value || input.placeholder;
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            
            // 获取输入框的字体样式
            const computedStyle = window.getComputedStyle(input);
            context.font = `${computedStyle.fontSize} ${computedStyle.fontFamily}`;
            
            // 计算文本宽度，加上一些余量
            const textWidth = context.measureText(text).width;
            const padding = 20; // 输入框内边距
            const minWidth = 80; // 最小宽度
            const maxWidth = 200; // 最大宽度
            
            const newWidth = Math.max(minWidth, Math.min(maxWidth, textWidth + padding));
            input.style.width = `${newWidth}px`;
        }
        
        /**
         * 加载保存的方案名和用户昵称
         */
        loadTitleInputs() {
            const schemeInput = this.container.querySelector('.scheme-input');
            const userInput = this.container.querySelector('.user-input');
            
            const savedScheme = localStorage.getItem('typepad_scheme_name') || '';
            const savedUser = localStorage.getItem('typepad_user_name') || '';
            
            if (schemeInput) {
                schemeInput.value = savedScheme;
                this.adjustInputWidth(schemeInput);
            }
            
            if (userInput) {
                userInput.value = savedUser;
                this.adjustInputWidth(userInput);
            }
            
            this.updateTitle();
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