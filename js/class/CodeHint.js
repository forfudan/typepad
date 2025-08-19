/**
 * 编码提示类
 * 用于显示当前字符的编码信息
 */
define([], function () {
    class CodeHint {
        constructor() {
            this.codeTable = new Map(); // 存储码表数据
            this.isLoaded = false;
            this.currentTableName = '宇浩·日月'; // 当前码表名称
            this.currentCharElement = document.querySelector('.current-char');
            this.codeListElement = document.querySelector('.code-list');
            this.currentTableElement = document.querySelector('.current-table');
            this.uploadMessageElement = document.querySelector('.upload-message');

            // 内置码表配置
            this.builtinCodeTables = {
                'yuhao-ming': {
                    name: '宇浩·日月',
                    url: 'https://raw.githubusercontent.com/forfudan/yu/main/src/public/mabiao-ming.txt',
                    format: 'code_first'
                },
                'yuhao-joy': {
                    name: '卿云',
                    url: 'https://raw.githubusercontent.com/forfudan/yu/main/src/public/mabiao-joy.txt',
                    format: 'code_first'
                },
                'yuhao-light': {
                    name: '宇浩·光华',
                    url: 'https://raw.githubusercontent.com/forfudan/yu/main/src/public/mabiao-light.txt',
                    format: 'code_first'
                },
                'yuhao-star': {
                    name: '宇浩·星陈',
                    url: 'https://raw.githubusercontent.com/forfudan/yu/main/src/public/mabiao-star.txt',
                    format: 'code_first'
                },
                'sky': {
                    name: '宋天·天码',
                    url: 'https://raw.githubusercontent.com/forfudan/tianma-sky/main/mabiao-sky.txt',
                    format: 'code_first'
                },
                'hao-xi': {
                    name: '好码·淅码',
                    url: 'https://raw.githubusercontent.com/hertz-hwang/wf-hao/main/schemas/hao/hao/dazhu-xi.txt',
                    format: 'code_first'
                },
                'hao-sy': {
                    name: '好码·松烟',
                    url: 'https://raw.githubusercontent.com/hertz-hwang/wf-hao/main/schemas/hao/hao/dazhu-sy.txt',
                    format: 'code_first'
                },
            };

            // 初始化文件上传功能
            this.initFileUpload();

            // 初始化选择框和加载保存的方案
            this.initBuiltinSelector();

            // 加载默认码表
            this.loadDefaultCodeTable();
        }

        /**
         * 初始化内置码表选择器
         */
        initBuiltinSelector() {
            // 从localStorage读取保存的方案
            const savedScheme = localStorage.getItem('codeHintScheme') || 'yuhao-ming';

            // 设置选择框的值
            setTimeout(() => {
                const selectElement = document.getElementById('builtinCodeTableSelect');
                if (selectElement) {
                    selectElement.value = savedScheme;
                }
            }, 100);

            // 更新当前方案
            this.currentScheme = savedScheme;
        }

        /**
         * 初始化文件上传功能
         */
        initFileUpload() {
            const fileInput = document.getElementById('codeTableFile');
            if (fileInput) {
                fileInput.addEventListener('change', (event) => {
                    this.handleFileUpload(event);
                });
            }
        }

        /**
         * 处理文件上传
         */
        async handleFileUpload(event) {
            const file = event.target.files[0];
            if (!file) return;

            // 检查文件类型
            if (!file.name.toLowerCase().endsWith('.txt')) {
                this.showMessage('错误：请上传 .txt 格式的文件', 'error');
                return;
            }

            try {
                const text = await this.readFileAsText(file);
                const isValid = this.validateCodeTable(text);

                if (isValid) {
                    // 获取用户选择的格式
                    const formatSelect = document.getElementById('codeTableFormat');
                    const format = formatSelect ? formatSelect.value : 'code_first';
                    
                    this.parseCodeTable(text, format);
                    this.isLoaded = true;
                    this.currentTableName = file.name;
                    this.updateCurrentTableDisplay();
                    this.showMessage('码表上传成功！', 'success');

                    // 重新显示当前字符的编码
                    this.refreshCurrentChar();
                } else {
                    this.showMessage('错误：码表格式不正确。正确格式：编码[制表符或空格]字词', 'error');
                }
            } catch (error) {
                console.error('读取文件失败:', error);
                this.showMessage('错误：文件读取失败', 'error');
            }

            // 清空文件输入
            event.target.value = '';
        }

        /**
         * 读取文件内容
         */
        readFileAsText(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = () => reject(new Error('文件读取失败'));
                reader.readAsText(file, 'utf-8');
            });
        }

        /**
         * 验证码表格式
         */
        validateCodeTable(text) {
            const lines = text.split('\n').filter(line => line.trim());
            if (lines.length === 0) return false;

            // 检查前几行的格式
            const samplesToCheck = Math.min(10, lines.length);
            let validLines = 0;

            for (let i = 0; i < samplesToCheck; i++) {
                const line = lines[i].trim();
                if (line) {
                    // 支持制表符或空格分隔
                    const parts = line.split(/\t| +/);
                    if (parts.length >= 2 && parts[0].trim() && parts[1].trim()) {
                        validLines++;
                    }
                }
            }

            // 至少要有80%的行格式正确
            return validLines / samplesToCheck >= 0.8;
        }

        /**
         * 显示消息
         */
        showMessage(message, type = '') {
            if (this.uploadMessageElement) {
                this.uploadMessageElement.textContent = message;
                this.uploadMessageElement.className = `upload-message ${type}`;

                // 3秒后清除消息
                setTimeout(() => {
                    this.uploadMessageElement.textContent = '';
                    this.uploadMessageElement.className = 'upload-message';
                }, 3000);
            }
        }

        /**
         * 更新当前码表显示
         */
        updateCurrentTableDisplay() {
            if (this.currentTableElement) {
                this.currentTableElement.textContent = `当前：${this.currentTableName}`;
            }
        }

        /**
         * 加载默认码表文件
         */
        async loadDefaultCodeTable() {
            // 从localStorage读取保存的方案，如果没有则使用默认方案
            const savedScheme = localStorage.getItem('codeHintScheme') || 'yuhao-ming';
            await this.loadBuiltinCodeTable(savedScheme);
        }

        /**
         * 加载内置码表
         * @param {string} tableKey 码表键名
         */
        async loadBuiltinCodeTable(tableKey) {
            const tableConfig = this.builtinCodeTables[tableKey];
            if (!tableConfig) {
                console.error('未找到码表配置:', tableKey);
                return;
            }

            try {
                this.showMessage('正在加载码表...', '');
                const response = await fetch(tableConfig.url);
                const text = await response.text();
                this.parseCodeTable(text, tableConfig.format || 'code_first');
                this.isLoaded = true;
                this.currentTableName = tableConfig.name;
                this.updateCurrentTableDisplay();
                this.showMessage('码表加载成功！', 'success');
                console.log(`${tableConfig.name}加载完成，共`, this.codeTable.size, '条记录');
            } catch (error) {
                console.error('加载码表失败:', error);
                this.showMessage('码表加载失败，请检查网络连接', 'error');
            }
        }

        /**
         * 切换内置码表
         * @param {string} tableKey 码表键名
         */
        async switchBuiltinCodeTable(tableKey) {
            console.log('切换码表到:', tableKey);

            // 保存用户选择到localStorage
            localStorage.setItem('codeHintScheme', tableKey);
            this.currentScheme = tableKey;

            // 加载新码表
            await this.loadBuiltinCodeTable(tableKey);

            // 更新选择框
            const selectElement = document.getElementById('builtinCodeTableSelect');
            if (selectElement) {
                selectElement.value = tableKey;
            }

            // 强制刷新当前显示
            console.log('当前码表大小:', this.codeTable.size);

            // 重新显示当前字符的编码
            this.refreshCurrentChar();

            // 如果当前没有字符显示，至少显示一个示例
            if (!this.currentCharElement || this.currentCharElement.textContent === '-') {
                // 显示码表的第一个字符作为示例
                const firstChar = this.codeTable.keys().next().value;
                if (firstChar) {
                    this.showCodeForChar(firstChar);
                    console.log('显示示例字符:', firstChar);
                }
            }
        }

        /**
         * 解析码表文件
         * @param {string} text 码表文件内容
         */
        parseCodeTable(text, format = 'code_first') {
            // 清空现有码表
            this.codeTable.clear();

            const lines = text.split('\n');
            for (const line of lines) {
                const trimmedLine = line.trim();
                if (trimmedLine) {
                    // 支持制表符或空格分隔
                    const parts = trimmedLine.split(/\t| +/);
                    if (parts.length >= 2) {
                        let code, chars;
                        
                        if (format === 'char_first') {
                            // 汉字在前，编码在后
                            chars = parts[0].trim();
                            code = parts[1].trim();
                        } else {
                            // 编码在前，汉字在后 (默认)
                            code = parts[0].trim();
                            chars = parts[1].trim();
                        }

                        // 只处理单字，过滤掉词语
                        if (chars.length === 1) {
                            const char = chars;
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
         * 刷新当前字符的编码显示
         */
        refreshCurrentChar() {
            // 尝试从Engine获取当前位置和文本
            if (typeof engine !== 'undefined' && engine.currentWords) {
                const typingPad = document.getElementById('pad');
                const currentPosition = typingPad ? typingPad.value.length : 0;
                this.updateForPosition(engine.currentWords, currentPosition);
            } else {
                // 备用方案：从current-char元素获取
                const currentChar = this.currentCharElement ? this.currentCharElement.textContent : '';
                if (currentChar && currentChar !== '-') {
                    this.showCodeForChar(currentChar);
                } else {
                    this.showCodeForChar('');
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
