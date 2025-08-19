define([], function () {
    /**
     * 按键热力图管理类
     * 记录和可视化按键频率
     */
    class KeyHeatmap {
        constructor() {
            this.keyStats = this.loadKeyStats();
            this.container = null;
            this.maxFrequency = 1;
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
                maxFrequency: this.maxFrequency,
                lastUpdate: Date.now()
            };
            localStorage.setItem('typepad_key_stats', JSON.stringify(data));
        }

        /**
         * 记录按键
         */
        recordKey(key) {
            // 将按键转换为大写以统一处理
            const normalizedKey = this.normalizeKey(key);
            
            if (normalizedKey) {
                this.keyStats[normalizedKey] = (this.keyStats[normalizedKey] || 0) + 1;
                this.maxFrequency = Math.max(this.maxFrequency, this.keyStats[normalizedKey]);
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
                'Shift': 'Shift',
                'Control': 'Ctrl',
                'Alt': 'Alt',
                'Meta': 'Cmd',
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
                        <button class="key-heatmap-reset" onclick="keyHeatmap.resetStats()">重置统计</button>
                        <button class="key-heatmap-toggle" onclick="keyHeatmap.toggleDisplay()">隐藏/显示</button>
                    </div>
                </div>
                <div class="key-heatmap-legend">
                    <span>低频</span>
                    <div class="legend-gradient"></div>
                    <span>高频</span>
                </div>
                <div class="key-heatmap-board"></div>
                <div class="key-heatmap-stats">
                    <span>总按键数: <span class="total-keys">0</span></span>
                    <span>最高频率: <span class="max-frequency">0</span></span>
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
         */
        createKeyboard() {
            const keyboard = this.container.querySelector('.key-heatmap-board');
            
            // 键盘布局定义
            const layout = [
                ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'Backspace'],
                ['Tab', 'Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '[', ']', '\\'],
                ['Caps', 'A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ';', "'", 'Enter'],
                ['Shift', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', '/', 'Shift'],
                ['Ctrl', 'Alt', 'Space', 'Alt', 'Ctrl']
            ];

            layout.forEach(row => {
                const rowElement = document.createElement('div');
                rowElement.className = 'key-row';
                
                row.forEach(key => {
                    const keyElement = document.createElement('div');
                    keyElement.className = 'key-item';
                    keyElement.dataset.key = this.normalizeKey(key) || key;
                    
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
                    else if (key === 'Shift') keyElement.classList.add('key-large');
                    else if (key === 'Space') keyElement.classList.add('key-space');
                    else if (key === 'Ctrl' || key === 'Alt') keyElement.classList.add('key-small');
                    
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
         * 重置统计数据
         */
        resetStats() {
            if (confirm('确定要重置所有按键统计数据吗？')) {
                this.keyStats = {};
                this.maxFrequency = 1;
                this.saveKeyStats();
                this.updateDisplay();
            }
        }

        /**
         * 切换显示/隐藏
         */
        toggleDisplay() {
            if (this.container) {
                this.container.classList.toggle('hidden');
            }
        }

        /**
         * 获取按键统计摘要
         */
        getStatsSummary() {
            const totalKeys = Object.values(this.keyStats).reduce((sum, count) => sum + count, 0);
            const topKeys = Object.entries(this.keyStats)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 10);
            
            return {
                totalKeys,
                topKeys,
                maxFrequency: this.maxFrequency
            };
        }
    }

    return KeyHeatmap;
});
