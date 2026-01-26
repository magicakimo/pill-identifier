    // 使用立即執行函式封裝，避免污染全域空間
    let pillsData = [];
    let allSearchResults = [];
    let currentPage = 1;
    const itemsPerPage = 10;
const CONFIG = {
        COLOR_SIMILARITY: { 
            '白': { '白': 1.0, '灰': 0.2, '黃': 0.2, '藍': 0.2, '粉': 0.2, '橘': 0.2, '棕': 0.1 }, // A,A. TABLETS "JOHNSON"
            '黃': { '黃': 1.0, '白': 0.2, '橘': 0.2, '棕': 0.25 },
            '粉': { '粉': 1.0, '白': 0.2, '紅': 0.25, '紫': 0.25 },
            '紅': { '紅': 1.0, '粉': 0.2, '橘': 0.2, '棕': 0.2, '紫': 0.2 },
            '橘': { '橘': 1.0, '粉': 0.7, '紅': 0.2, '黃': 0.2, '棕': 0.3 },
            '棕': { '棕': 1.0, '橘': 0.25, '紅': 0.25, '黃': 0.2, '黑': 0.2 },
            '綠': { '綠': 1.0, '藍綠': 0.4, '黃': 0.2, '藍': 0.2 },
            '藍綠': { '藍綠': 1.0, '綠': 0.4, '藍': 0.4 },
            '藍': { '藍': 1.0, '藍綠': 0.4, '紫': 0.2, '綠': 0.2, '灰': 0.1 },
            '紫': { '紫': 1.0, '棕': 0.2 ,'藍': 0.2, '粉': 0.2, '紅': 0.2, '灰': 0.2 },
            '黑': { '黑': 1.0, '灰': 0.3, '棕': 0.1, '藍': 0.1 },
            '灰': { '灰': 1.0, '黑': 0.3, '白': 0.2, '藍': 0.2 },
            '透明': { '透明': 1.0, '白': 0.3 }},
        SHAPE_SIMILARITY: {
            '圓形': { '圓形': 1.0, '橢圓形': 0.4, '雙圓形': 0.2 },
            '橢圓形': { '橢圓形': 1.0, '圓形': 0.6, '膠囊': 0.5, '四邊形': 0.5 },
            '膠囊': { '膠囊': 1.0, '橢圓形': 0.6, '雙圓形': 0.2 },
            '四邊形': { '四邊形': 1.0, '橢圓形': 0.5, '膠囊': 0.5, '六邊形': 0.2, '八邊形': 0.2 },
            '三角形': { '三角形': 1.0, '其他': 0.2 },
            '水滴形': { '水滴形': 1.0, '其他': 0.2 },
            '五邊形': { '五邊形': 1.0, '其他': 0.2 , '六邊形': 0.1, '八邊形': 0.1, '四邊形': 0.2 },
            '六邊形': { '六邊形': 1.0, '其他': 0.2 , '五邊形': 0.1, '八邊形': 0.1, '四邊形': 0.1 },
            '八邊形': { '八邊形': 1.0, '其他': 0.2 , '六邊形': 0.1, '五邊形': 0.1, '圓形': 0.1 },
            '雙圓形': { '雙圓形': 1.0, '其他': 0.4, '圓形': 0.1, '膠囊': 0.1 },
            '其他': { '其他': 1.0, '橢圓形': 0.4, '三角形': 0.4, '四邊形':0.4, '水滴形': 0.4,  '五邊形': 0.4,  '六邊形': 0.4,  '八邊形': 0.4,  '雙圓形': 0.4 }
        },
        CHAR_MAP: { '0': 'o', 'i': 'l', '1': 'l', '|': 'l', '/': 'l', 'I': 'l' }
    };

    async function initApp() {
            try {
                const response = await fetch('data.json');
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                pillsData = await response.json();
                console.log(`成功載入 ${pillsData.length} 筆藥品資料`);
            } catch (error) {
                handleError('載入藥品資料失敗', error.message);
            }
        }

    function handleError(message, details) {
        console.error(message + ':', details);
        const resultsGrid = document.getElementById('resultsGrid');
        resultsGrid.innerHTML = `
            <div class="no-results">
                <p>❌ 載入藥品資料失敗</p>
                <p style="color: #666; font-size: 14px;">錯誤訊息: ${error.message}</p>
                <p style="color: #666; font-size: 14px;">請確認 data.json 檔案是否存在於相同資料夾中</p>
            </div>
            `
    }





        // 計算顏色相似度分數
        function getColorSimilarity(selectedColors, pillColor) {
            if (selectedColors.length === 0) return 1.0;
            
            // 處理複合顏色（例如：白;黃）
            const pillColors = String(pillColor).split(';').map(c => c.trim());
            
            let maxScore = -1.0;
            selectedColors.forEach(selectedColor => {
                // 先檢查是否有完全匹配
                if (pillColors.includes(selectedColor)) {
                    maxScore = 1.0;
                    return;
                }
                
                // 若無完全匹配，則檢查相似度表中的所有選項
                const similarityMap = CONFIG.COLOR_SIMILARITY[selectedColor] || {};
                pillColors.forEach(pillCol => {
                    const similarity = similarityMap[pillCol] || -1.0;
                    maxScore = Math.max(maxScore, similarity);
                });
            });
            
            return maxScore;
        }

        // 計算形狀相似度分數
        // 怎麼會有 圓形;四邊形 ^^
        function getShapeSimilarity(selectedShape, pillShape) {
            if (!selectedShape || selectedShape == "不限") return 1.0;
            
            // 處理複合形狀（例如：圓形;四邊形）
            const pillShapes = String(pillShape).split(';').map(s => s.trim());
            
            // 先檢查是否有完全匹配
            if (pillShapes.includes(selectedShape)) return 1.0;
            
            // 若無完全匹配，則檢查相似度表中的所有選項
            let maxScore = -1.0;
            const similarityMap = CONFIG.SHAPE_SIMILARITY[selectedShape] || {};
            
            pillShapes.forEach(shape => {
                const score = similarityMap[shape] || -1.0;
                maxScore = Math.max(maxScore, score);
            });
            
            return maxScore;
        }

        // 刻痕比對 
        // 居然有 無;直線 = =
        function getCutSimilarity(selectedCut, pillCut) {
            if (!selectedCut || selectedCut == "不限") return 1.0;
            return String(pillCut).includes(String(selectedCut)) ? 1.0 : -1;
        }

        // 大小比對 (允許±2mm誤差)
        // pillSize 有 empty, 0、null、undefined 等，表示無大小資料
        function matchSize(inputSize, pillSize) {
            // 如果用戶未輸入大小，忽略此條件
            if (!inputSize) return 1.0;
            
            // 如果藥品無大小資料，也忽略此條件
            const pillSizeNum = parseFloat(pillSize);
            if (!pillSize || isNaN(pillSizeNum) || pillSizeNum === 0) return 1.0;
            
            const diff = Math.abs(parseFloat(inputSize) - pillSizeNum);
            if (diff === 0) return 1.0;
            if (diff <= 2) return 0.8;
            if (diff <= 4) return 0.5;
            return 0;
        }



/**
     * 核心搜尋邏輯：優化後的比對演算法
     */
    function searchPills(criteria) {
        // [Optimization] 預處理搜尋條件，避免在迴圈內反覆執行
        // 注意：保留空格以支持關鍵詞分隔
        const searchMarksNormalized = criteria.marks
            ? criteria.marks.toLowerCase().split('').map(c => CONFIG.CHAR_MAP[c] || c).join('')
            : null;

        const searchMedName = criteria.med_name ? criteria.med_name.toLowerCase() : null;

        const results = pillsData.map(pill => {
            let totalScore = 0;
            let totalWeight = 0;

            // 1. 刻字比對 (優化：傳入已預處理的搜尋字串)
            if (searchMarksNormalized) {
                const marksScore = matchMarksOptimized(searchMarksNormalized, pill.marks_search, pill.marks_origin);
                totalScore += marksScore * 1.0;
                totalWeight += 1.0;
            }

            if (criteria.marks === "" && (!pill.marks_origin || pill.marks_origin.trim() === "" || pill.marks_origin.includes("無"))) {
                totalScore += 1.1;
                totalWeight += 1.0;
            } else if (criteria.marks === "" && pill.marks_origin && pill.marks_origin.trim() !== "" && !pill.marks_origin.includes("無")) {
                totalScore += 0.9;
                totalWeight += 1.0;
            }


            // 商品名 / 學名比對
            if (searchMedName) {
                const pillMedName = `${pill.name_ch} ${pill.name_en} ${pill.med_name}`.toLowerCase();
                if (pillMedName.includes(searchMedName)) {
                    totalScore += 1.0;
                    totalWeight += 1.0;
                } else {
                    return { ...pill, score: -1 };
                }
            }


            // 2. 輔助條件 (加分制)
            const bonusWeight = 0.2;
            const conditions = [
                { val: criteria.colors.length, score: () => getColorSimilarity(criteria.colors, pill.color) },
                { val: criteria.shape, score: () => getShapeSimilarity(criteria.shape, pill.shape) },
                { val: criteria.cut, score: () => getCutSimilarity(criteria.cut,pill.cut) },
                { val: criteria.size, score: () => matchSize(criteria.size, pill.size) }
            ];

            // 檢查是否有任何條件返回負分（不符合）
            let hasNegativeScore = false;
            conditions.forEach(c => {
                if (c.val) {
                    const score = c.score();
                    if (score < 0) {
                        hasNegativeScore = true;
                        return; // 停止檢查，直接標記為不符合
                    }
                    totalScore += score * bonusWeight;
                    totalWeight += bonusWeight;
                }
            });

            // 如果有任何選中條件不符合，則返回 -1（強制排除）
            if (hasNegativeScore) {
                return { ...pill, score: -1 };
            }

            return { ...pill, score: totalWeight > 0 ? (totalScore / totalWeight) : 0 };
        })
        .filter(pill => pill.score > 0.4)
        .sort((a, b) => b.score - a.score);

        return results;
    }

/**
     * 優化後的刻字比對 (移除內部重複計算) // 處理無刻字
     * 支援空格分隔的多個關鍵詞：輸入的每個關鍵詞都要在 marks_search 中找到
     */
    function matchMarksOptimized(normalizedSearch, marksSearch, marksOrigin) {
        const searchWithoutSpace = normalizedSearch.replace(/\s/g, '');
        const marksNormalized = marksSearch.toLowerCase(); // 保留空格
        const marksWithoutSpace = marksNormalized.replace(/\s/g, '');
        const originalMarksNormalized = marksOrigin.toLowerCase().replace(/\s/g, '');


        // console.log('Comparing:', normalizedSearch, '->', marksNormalized);
        // 1. 完全匹配（忽略空格）
        if (marksWithoutSpace === searchWithoutSpace) return 1.5;
        
        // 2. 按空格分隔成多個關鍵詞，檢查每個都要出現（在保留空格的版本中）
        const keywords = normalizedSearch.split(" ").filter(k => k.length > 0);
        const keywordsOrigin = marksNormalized.split(" ").filter(k => k.length > 0);

        if (keywords.length > 1) {
            // 多個關鍵詞模式
            let allKeywordsFound = true;
            let keywordsEqual = 0;
            for (let keyword of keywords) {


                if (keywordsOrigin.length >= 1) {
                    for (let kw of keywordsOrigin) {
                        if (kw == keyword) {
                            keywordsEqual += 1;
                            break;
                        }
                }

                }
                if (!marksNormalized.includes(keyword)) {
                    allKeywordsFound = false;
                    break;
                }
            }
            if (allKeywordsFound) return 0.85 - (keywords.length - keywordsEqual) * 0.1;
        } else if (keywords.length === 1) { 
            // 單個關鍵詞，檢查是否包含
            let keywordsEqual = 0;
            if (keywordsOrigin.length >= 1) {
                for (let kw of keywordsOrigin) {
                    if (kw == keywords[0]) {
                        keywordsEqual += 1;
                        break;
                    }
                }
            }

            if (keywordsEqual == 1) return 0.85;
            if (marksNormalized.includes(keywords[0])) return 0.5;
        }
        

        // 3. 逐一檢查輸入的每個字符是否都在標記中（不考慮順序）
        // 例如：輸入"HS"可以匹配"S H"（有空格的情況）
        const searchCharsArray = searchWithoutSpace.split('');
        let allCharsFound = true;
        let charsCount = 0;
        let charsNotFoundCount = 0;
        for (let char of searchCharsArray) {
            if (!marksWithoutSpace.includes(char)) {
                allCharsFound = false;
            } else {
                charsCount += 1;
            }
        }

        for (let char of marksWithoutSpace.split('')) {
            if (!searchWithoutSpace.includes(char)) {
                charsNotFoundCount += 1;
            }
            if (charsNotFoundCount / marksWithoutSpace > 0.5) {return -1}
        }

        // console.log(originalMarksNormalized, originalMarksNormalized, 'Chars matched:', charsCount, 'out of', searchCharsArray.length, originalMarksNormalized.length, Math.abs(charsCount - originalMarksNormalized.length) == 1 && Math.abs(charsCount -searchCharsArray.length) == 1)
        if (allCharsFound) {
            return 0.25 * (1- Math.abs(charsCount - originalMarksNormalized.length) / originalMarksNormalized.length) - 0.1 * (charsNotFoundCount);

        } else if ( Math.abs(charsCount - originalMarksNormalized.length) <= 1 && Math.abs(charsCount -searchCharsArray.length) <= 1) {
            
            if (charsCount < originalMarksNormalized.length) {
              return 0.2 * (1- Math.abs((charsCount+1) - originalMarksNormalized.length) / originalMarksNormalized.length)- 0.01 * (charsNotFoundCount);
            } else {
              return 0.2 * (1- Math.abs((charsCount-1) - originalMarksNormalized.length) / originalMarksNormalized.length)- 0.01 * (charsNotFoundCount);
            }


        }
        
        return 0;
    }


function displayResults(isNewSearch = true, keywords = '') {
        if (isNewSearch) {
            currentPage = 1;
            document.getElementById('resultsGrid').innerHTML = '';
            // 7. 搜尋時滾動到結果區
            document.getElementById('results-area').scrollIntoView({ behavior: 'smooth' });
        }

        const start = (currentPage - 1) * itemsPerPage;
        const end = start + itemsPerPage;
        const currentBatch = allSearchResults.slice(start, end);
        const resultsGrid = document.getElementById('resultsGrid');

        currentBatch.forEach((pill, index) => {
            const globalIndex = start + index;
            const card = document.createElement('div');
            card.className = 'pill-card';
            
            
            const imgUrls = pill.img_urls || [];
            const hasMultipleImages = imgUrls.length > 1;
            card.innerHTML = `
                <div class="pill-image-container">
                    <img src="${encodeURIComponent(imgUrls[0])}" 
                        loading="lazy"
                        alt="${pill.name_ch}" 
                        class="pill-image" 
                        id="img-${pill.id}"
                        onclick="openModal('${pill.id}')"
                        onerror="this.src='icon/noimage.png'">
                    
                    ${hasMultipleImages ? `
                        <div class="img-switcher">
                            ${imgUrls.map((url, index) => `
                                <button 
                                    class="sw-btn-${pill.id} ${index === 0 ? 'active' : ''}" 
                                    onclick="switchPillImage(event, '${pill.id}', '${url}', ${index})">
                                    ${index + 1}
                                </button>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
                 <div class="pill-info">
                     <h3><a href="${pill.link_label}" target="_blank">${pill.name_ch}</a></h3>
                     <p style="color:#666; margin-bottom:5px;">${pill.name_en}<br><span style="color:#AAA; font-size: 12px">${pill.med_name}</span></p>
                     <p>外觀：${pill.color}、${pill.shape}<br>　　　${pill.size} mm、${pill.cut}刻痕</p>
                     <p>藥品標記：${pill.marks_origin || '無資料'}</p>
                 </div>
            `;

            resultsGrid.appendChild(card);
        });

        // 5. 顯示更多按鈕控制
        const loadMoreBtn = document.getElementById('loadMoreContainer');
        if (allSearchResults.length > end) {
            loadMoreBtn.style.display = 'block';
        } else {
            loadMoreBtn.style.display = 'none';
        }
        
        if (keywords != '') {
            document.getElementById('resultsCount').textContent = keywords
            document.getElementById('resultsCount').innerHTML += `<br>共找到 ${allSearchResults.length} 筆藥品`;
        }
    }


    // 修改原有的 performSearch 以對接新分頁邏輯
    function performSearch() {
        const criteria = {
            marks: document.getElementById('marks').value.replace(/[^A-Za-z0-9\s]/g, ' ').trim(),
            med_name: document.getElementById('med-name').value.trim(),
            colors: Array.from(document.querySelectorAll('input[name="color"]:checked')).map(cb => cb.value),
            shape: document.querySelector('input[name="shape"]:checked')?.value || '',
            cut: document.querySelector('input[name="cut"]:checked')?.value || '',
            size: document.getElementById('size').value.trim()
        };
        
        // 構建搜尋關鍵字顯示
        let keywordParts = [];
        if (criteria.marks === "") {keywordParts.push("無")} else {keywordParts.push(criteria.marks);}
        if (criteria.med_name) keywordParts.push(`藥品名稱: ${criteria.med_name}`);
        if (criteria.colors.length > 0) keywordParts.push(`${criteria.colors.join('、')}色`);
        if (criteria.shape !== "不限") keywordParts.push(`${criteria.shape}形狀`);
        if (criteria.cut !== "不限") keywordParts.push(`${criteria.cut}刻痕`);
        if (criteria.size) keywordParts.push(`${criteria.size} mm`);
        keywords = keywordParts.length > 0 ? `您的關鍵字 → 藥品標記: ${keywordParts.join('、')}` : '';
        
        // 呼叫您原本的 searchPills
        allSearchResults = searchPills(criteria);
        displayResults(true, keywords);
    }



// 事件綁定
    document.getElementById('searchBtn').addEventListener('click', performSearch);

    document.getElementById('searchForm').addEventListener('submit', function(e) {
        e.preventDefault();
        performSearch();
    });
    document.getElementById('marks').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            performSearch();
        }
    });

    document.getElementById('med-name').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            performSearch();
        }
    });

    document.getElementById('size').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            performSearch();
        }
    });

    document.getElementById('loadMoreBtn').addEventListener('click', () => {
        currentPage++;
        displayResults(false);
    });


document.getElementById('resetBtn').addEventListener('click', () => {
        document.getElementById('searchForm').reset();
        allSearchResults = [];
        document.getElementById('resultsGrid').innerHTML = '';
        document.getElementById('resultsCount').textContent = '請輸入條件開始搜尋';
        document.getElementById('loadMoreContainer').style.display = 'none';
        document.getElementById('marks').focus()
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    
initApp();




// 在 main.js 最外層或適當位置加入
let currentModalImages = []; // 存儲目前 Modal 開啟的圖片陣列
let currentModalIndex = 0;   // 存儲目前 Modal 顯示的索引
let pillActiveIndexMap = {};




function switchPillImage(event, pillId, url, index) {
    if (event) event.stopPropagation();
    
    // 1. 取得安全 ID (移除空格)
    // const safeId = pillId.replace(/\s+/g, '');
    
    // 2. 更換圖片
    const imgElement = document.getElementById(`img-${pillId}`);
    if (imgElement) imgElement.src = url;

    // 3. 更新按鈕樣式 (移除舊的 active，加上新的 active)
    const btns = document.querySelectorAll(`.sw-btn-${pillId}`);
    btns.forEach(btn => btn.classList.remove('active'));
    btns[index].classList.add('active');

    // 4. 紀錄這張藥卡目前的索引，供 openModal 使用
    pillActiveIndexMap[pillId] = index;
}


let currentOpeningPillId = null; // 新增：追蹤目前是哪一個藥品開啟了 Modal

// 修改原有的 openModal
function openModal(pillId) {
    // 從 pillsData 中找到該筆資料
    const pill = pillsData.find(p => p.id === pillId);
    const pill_original_link = pill.all_photo_links.split(';;;') || [];

    if (!pill) return;

    currentOpeningPillId = pillId; // 記住 ID
    currentModalImages = pill_original_link || [];
    currentModalIndex = pillActiveIndexMap[pillId] || 0;


    updateModalContent();

    const modal = document.getElementById('imageModal');
    modal.style.display = 'flex';
}

function closeModal() {
    // 1. 取得目前 Modal 顯示的圖片 URL
    if (currentOpeningPillId && currentModalImages.length > 1) {
        const currentUrl = currentModalImages[currentModalIndex];
        
        // 2. 呼叫之前的 switchPillImage 函式
        // 這會同步更新：小卡片圖片、按鈕 Active 狀態、以及 pillActiveIndexMap
        switchPillImage(null, currentOpeningPillId, currentUrl, currentModalIndex);
    }

    // 3. 關閉視窗並清空追蹤
    document.getElementById('imageModal').style.display = 'none';
    currentOpeningPillId = null; 
}

// 更新 Modal 內容與箭頭顯示
function updateModalContent() {
    const modalImg = document.getElementById('modalImg');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    modalImg.src = 'icon/loading.png';

    const targetUrl = currentModalImages[currentModalIndex] || 'icon/noimage.png';

    
    // 建立一個暫時的 Image 物件來預載
        const tempImg = new Image();
        tempImg.src = targetUrl;
        
        tempImg.onload = function() {
            // 當圖片真正下載完畢後，才替換掉 Modal 上的 loading 圖
            modalImg.src = targetUrl;
        };

        tempImg.onerror = function() {
            modalImg.src = 'icon/noimage.png';
        };


    // 如果圖片大於一張，顯示左右箭頭
    if (currentModalImages.length > 1) {
        prevBtn.style.display = 'block';
        nextBtn.style.display = 'block';
    } else {
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
    }
}

// 左右切換函式
function changeModalImage(step) {
    if (event) event.stopPropagation(); // 重點：防止點擊按鈕時觸發關閉視窗

    currentModalIndex += step;
    


    // 循環切換
    if (currentModalIndex >= currentModalImages.length) currentModalIndex = 0;
    if (currentModalIndex < 0) currentModalIndex = currentModalImages.length - 1;
    
    updateModalContent();
}


document.addEventListener('keydown', function(e) {
    const modal = document.getElementById('imageModal');
    if (modal.style.display === 'flex') {
        if (e.key === 'ArrowLeft' ) {
            changeModalImage(-1);
        } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
            changeModalImage(1);
        } else if (e.key === 'Escape') {
            closeModal();
        }
    }
});