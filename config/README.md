# 碼表配置文件說明

內置的方案列表拿出來放到一個配置文件中，更加方便管理，畢竟誰都不喜歡「硬編碼」。

## 文件位置

`config/codeTableConfig.json`

## 配置文件結構

```json
{
  "version": "1.0.0",
  "description": "內置碼表配置文件",
  "defaultScheme": "yuhao-ming",
  "builtinCodeTables": [...],
  "settings": {...}
}
```

## 字段說明

### 根級別字段

- `version`: 配置文件版本號
- `description`: 配置文件描述
- `defaultScheme`: 默認加載的碼表方案key
- `builtinCodeTables`: 內置碼表列表
- `settings`: 全局設置

### builtinCodeTables 數組中每個碼表的字段

#### 必需字段

- `key`: 碼表的唯一標識符
- `name`: 顯示名稱
- `url`: 碼表文件的URL地址,最好使用Github倉庫中的碼表文件
- `format`: 碼表格式
  - `"code_first"`: 編碼在前，漢字在後（如：`wo 我`）
  - `"char_first"`: 漢字在前，編碼在後（如：`我 wo`）

#### 可选字段

- `description`: 碼表描述
- `website`: 官方網站
- `category`: 分類（如：形碼、音碼、音形、形音等）
- `enabled`: 是否啓用（默認：true）

### settings 設置

- `cacheTimeout`: 緩存超時時間（毫秒）
- `maxRetries`: 最大重試次數
- `retryDelay`: 重試延遲（毫秒）

## 添加新碼表

要添加新的內置碼表，只需在 `builtinCodeTables` 數組中添加新的配置對象：

```json
{
  "key": "new-scheme",
  "name": "漢字輸入法",
  "url": "https://example.com/mabiao.txt",
  "format": "code_first",
  "description": "中華文明源遠流長",
  "website": "https://example.com",
  "category": "形碼",
  "enabled": true
}
```

## 禁用碼表

將碼表的 `enabled` 字段設置為 `false` 即可：

```json
{
  "key": "some-scheme",
  "name": "漢字輸入法",
  "enabled": false
}
```
