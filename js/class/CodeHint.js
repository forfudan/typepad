/**
 * 编码提示类
 * 用于显示当前字符的编码信息
 */
define([], function() {
    class CodeHint {
        constructor() {
            this.codeTable = new Map(); // 存储码表数据
            this.isLoaded = false;
            this.currentCharElement = document.querySelector('.current-char');
            this.codeListElement = document.querySelector('.code-list');
            
            // 加载码表
            this.loadCodeTable();
        }
        
        /**
         * 加载码表文件
         */
        async loadCodeTable() {
            try {
                const response = await fetch('public/宇浩日月.txt');
                const text = await response.text();
                this.parseCodeTable(text);
                this.isLoaded = true;
                console.log('码表加载完成，共', this.codeTable.size, '条记录');
            } catch (error) {
                console.error('加载码表失败:', error);
            }
        }
        
        /**
         * 解析码表文件
         * @param {string} text 码表文件内容
         */
        parseCodeTable(text) {
            const lines = text.split('\n');
            for (const line of lines) {
                const trimmedLine = line.trim();
                if (trimmedLine) {
                    const parts = trimmedLine.split('\t');
                    if (parts.length >= 2) {
                        const code = parts[0];
                        const chars = parts[1];
                        
                        // 为每个字符记录其编码
                        for (const char of chars) {
                            if (!this.codeTable.has(char)) {
                                this.codeTable.set(char, []);
                            }
                            this.codeTable.get(char).push(code);
                        }
                    }
                }
            }
        }
        
        /**
         * 显示指定字符的编码
         * @param {string} char 要显示编码的字符
         */
        showCodeForChar(char) {
            if (!this.isLoaded) {
                this.updateDisplay('-', ['码表加载中...']);
                return;
            }
            
            if (!char || char.trim() === '') {
                this.updateDisplay('-', ['请开始打字']);
                return;
            }
            
            const codes = this.codeTable.get(char);
            if (codes && codes.length > 0) {
                // 去重并排序
                const uniqueCodes = [...new Set(codes)].sort((a, b) => a.length - b.length);
                this.updateDisplay(char, uniqueCodes);
            } else {
                this.updateDisplay(char, ['无编码']);
            }
        }
        
        /**
         * 更新显示内容
         * @param {string} char 当前字符
         * @param {string[]} codes 编码数组
         */
        updateDisplay(char, codes) {
            // 更新当前字符
            if (this.currentCharElement) {
                this.currentCharElement.textContent = char;
            }
            
            // 更新编码列表
            if (this.codeListElement) {
                this.codeListElement.innerHTML = '';
                
                codes.forEach(code => {
                    const codeItem = document.createElement('div');
                    codeItem.className = 'code-item';
                    codeItem.textContent = code;
                    this.codeListElement.appendChild(codeItem);
                });
            }
        }
        
        /**
         * 根据当前输入位置显示编码提示
         * @param {string} templateText 对照文本
         * @param {number} currentPosition 当前位置
         */
        updateForPosition(templateText, currentPosition) {
            if (currentPosition < templateText.length) {
                const currentChar = templateText[currentPosition];
                this.showCodeForChar(currentChar);
            } else {
                this.showCodeForChar('');
            }
        }
        
        /**
         * 清空显示
         */
        clear() {
            this.updateDisplay('-', ['请开始打字']);
        }
    }
    
    return CodeHint;
});
