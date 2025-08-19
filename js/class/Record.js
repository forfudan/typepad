define(['Utility', 'ArticleType'], function (Utility,ArticleType) {
   /**
    * 打字记录
    */
   class Record {
      constructor(speed, codeLength, hitRate, backspace, wordCount, articleName,  timeStart, duration) {
         this.speed       = speed;       // 速度
         this.codeLength  = codeLength;  // 码长
         this.hitRate     = hitRate;     // 击键
         this.backspace   = backspace;   // 回退
         this.wordCount   = wordCount;   // 字数
         this.articleName = articleName; // 文章名字
         this.timeStart   = timeStart;   // 开始时间
         this.duration    = duration;    // 打字时长
      }
      getHtml(config, lastRepeatCount){
         let level = Math.floor(this.speed/SPEED_GAP);
         level = level > 6 ? 6 : level; // 速度等级为 6+ 时按 6 处理
         let articleTypeName = ArticleType.getTypeNameWith(config.articleType);
         let textClass = ArticleType.getTextClassNameOf(config.articleType)
         let articleName =
             config.isAutoRepeat ?
                 config.articleName + ' : ' + lastRepeatCount :
                 config.articleName;
         return `<tr>  
              <td class="text-center">${config.IDBIndex}</td>                               <! --id-->
              <td class="bold galvji speed text-right lv-${level}">${this.speed.toFixed(Utility.RECORD_DISPLAY_ACCURACY)}</td>       <! --速度-->
              <td class="hidden-sm">${this.hitRate.toFixed(Utility.RECORD_DISPLAY_ACCURACY)}</td>                                    <! --击键-->
              <td class="hidden-sm">${this.codeLength.toFixed(Utility.RECORD_DISPLAY_ACCURACY)}</td>                                 <! --码长-->
              <td class="hidden-sm">${this.backspace}</td>                                  <! --回退-->
              <td>${this.wordCount}</td>                                                    <! --字数-->
              <td class="time">${Utility.formatTimeLeft(this.duration)}</td>                <! --用时-->
              <td class="text-center ${textClass}">${articleTypeName}</td>                  <! --文章类型-->
              <td>${articleName}</td>                                                       <! --文章名称-->
              <td class="hidden-sm">${Utility.dateFormatter(new Date(this.timeStart))}</td> <! --开始时间-->
              <td><button class="btn btn-danger btn-sm" onclick="engine.delete(${config.IDBIndex}, this)" type="button">删除</button></td>
              <td><button class="btn btn-primary btn-sm" onclick="engine.copyScore(this)" type="button" title="复制成绩到剪贴板">📋</button></td>
            </tr>`;
      }

      getHtmlForRecord(config){
         let level = Math.floor(this.speed/SPEED_GAP);
         level = level > 6 ? 6 : level; // 速度等级为 6+ 时按 6 处理
         let articleType = ArticleType.getTypeNameWith(config.articleType);
         let textClass = ArticleType.getTextClassNameOf(articleType)
         return `
               <div class="speed lv-${level}">${this.speed}</div>
               <div class="meta">
                  <div class="hit-rate">${this.hitRate}</div>
                  <div class="code-length">${this.codeLength}</div>
               </div>`;
      }
   }

   return Record
})
