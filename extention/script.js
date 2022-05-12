if (document.readyState == 'complete') {
    MainScript();
} else {
    window.addEventListener("load", MainScript, false);
}

function addJS_Node(text, s_URL, funcToRun, runOnLoad) {
    var D = document;
    var scriptNode = D.createElement('script');
    if (runOnLoad) {
        scriptNode.addEventListener("load", runOnLoad, false);
    }
    scriptNode.type = "text/javascript";
    if (text) scriptNode.textContent = text;
    if (s_URL) scriptNode.src = s_URL;
    if (funcToRun) scriptNode.textContent = '(' + funcToRun.toString() + ')()';

    var targ = D.getElementsByTagName('head')[0] || D.body || D.documentElement;
    targ.appendChild(scriptNode);
}

window.addEventListener('message', function(e) {
    if (e.data.type == 'database') {
        chrome.runtime.sendMessage(chrome.runtime.id, {
            type: "database",
            link: e.data.link
        }, function(body) {
            window.postMessage({
                type: 'answer',
                body: body
            }, '*');
        });
    }
});

function MainScript() {
    function init() {
        let func = {
            items: [],
            base: [],
            assetid_base: [],
            init: async function() {
                console.log('Inited');
                let self = this;
                switch (true) {
                    case self.isInventory():
                        setInterval(function(){
                            self.items = g_ActiveInventory.m_rgAssets;
                            self.buildStickers();
                        }, 500);
                        break;
                    case self.isMarket():
                        window.postMessage({type: 'database'}, '*');
                        window.addEventListener('message', function(e) {
                            switch (e.data.type) {
                                case 'answer':
                                    self.base = JSON.parse(e.data.body);
                                    document.querySelectorAll(".market_commodity_explanation").forEach(item => item.remove());
                                    const getPrice = (price) => parseFloat(price.replaceAll(" ","").replaceAll(",",""));
                                    const getDiff = (price1, price2) => (((price1-price2)/price1) * 100).toFixed(2);
                                    let name = document.querySelector(".market_listing_nav").childElements()[1].innerText;
                                    let item = self.getItem(name);
                                    if (item) {
                                        let price_block = document.createElement("div");
                                        price_block.className = "otherSitesPrices market_commodity_orders_block";
                                        setInterval(function() {
                                            let price_sale = getPrice((
                                                document.querySelectorAll("#market_commodity_forsale .market_commodity_orders_header_promote")[1] ||
                                                document.querySelectorAll(".market_listing_price.market_listing_price_with_fee")[0]
                                            ).innerText);
                                            let price_buy = getPrice(document.querySelectorAll("#market_commodity_buyrequests .market_commodity_orders_header_promote")[1].innerText);
                                            price_block.innerHTML = `
                                                <img src="https://cs.money/svg/logo.svg" height="30px">
                                                <span class="market_commodity_orders_header_promote">$ ${item.a.toFixed(2)} | $ ${(item.a / 100 * 93).toFixed(2)}</span>
                                                <span class="market_commodity_orders_header_promote">${getDiff(price_sale, item.a)}% | ${getDiff(price_buy, item.a)}%</span>
                                            `;
                                        }, 200);
                                        let appendItem = document.querySelector(".market_commodity_order_block");
                                        if (appendItem) {
                                            appendItem.insertAdjacentElement("beforeBegin", price_block);
                                        } else {
                                            document.querySelector("#searchResultsTable").insertAdjacentElement("beforeBegin", price_block);
                                        }
                                    }
                                    break;
                                default:
                                    break;
                            }
                        });
                        let input = document.createElement("input");
                        input.setAttribute("type", "text");
                        input.setAttribute("placeholder", "Item name");
                        input.classList.add("pageSwitch");
                        input.addEventListener("paste", (event) => {
                            let paste = (event.clipboardData || window.clipboardData).getData('text');
                            window.location.href = 'https://steamcommunity.com/market/listings/730/' + paste;
                        })
                        document.querySelector(".market_listing_nav_container").insertAdjacentElement("afterEnd", input);
                        input.focus();
                        break;
                    default:
                        break;
                }
            },
            getItem: function(name){
                var self = this;
                for (let item of Object.values(self.base)){
                    if (item.m === name) return item
                }
            },
            getItems: function(){
                return new Promise((resolve, reject) => {
                    setTimeout(function(){
                        if (Object.keys(g_ActiveInventory.m_rgAssets).length) {
                            resolve(g_ActiveInventory.m_rgAssets);
                        }
                    }, 250);
                });
            },
            buildStickers: function() {
                let self = this;
                for (let key of Object.keys(self.items)) {
                    let { description: { descriptions }, assetid, element } = self.items[key];
                    let description_last = descriptions.at(-1);

                    let parser = new DOMParser();
                    let htmlDoc = parser.parseFromString(description_last.value, 'text/html');
                    let sticker_info = htmlDoc.querySelector('#sticker_info');

                    if (self.assetid_base.includes(assetid) || !sticker_info) continue;
                    self.assetid_base.push(assetid);

                    // let text = sticker_info.innerText;
                    // let pre = text.includes('Sticker') ? 'Sticker' : 'Patch';
                    // let stickers = text.replace(`${pre}: `, '').trim().split(', ');
                    // let stickers_html = images_html = '';
                    // for (let i = 0; i < stickers.length; i++) {
                    //     let sticker = stickers[i];
                    //     images_html += `<a class="sticker_image" target="_blank" href="https://steamcommunity.com/market/listings/730/${pre} | ${sticker}">${htmlDoc.querySelectorAll('img')[i].outerHTML}</a>`;
                    //     stickers_html += `<a class="sticker_name" target="_blank" href="https://steamcommunity.com/market/listings/730/${pre} | ${sticker}">${sticker}</a>`;
                    // }
                    // description_last.value = `
                    //     <br>
                    //     <div id="sticker_info" name="sticker_info" title="Sticker" style="border: 2px solid rgb(102, 102, 102); border-radius: 6px; width=100; margin:4px; padding:8px;">
                    //         <center>
                    //             ${images_html}
                    //             ${stickers_html}
                    //         </center>
                    //     </div>
                    // `;

                    let imgs_src = [...htmlDoc.querySelectorAll('img')].map(item => item.src);
                    let stickers_block = document.createElement("div");
                    stickers_block.className = "stickers";
                    stickers_block.innerHTML = `<img class='sticker' src='${imgs_src.join(`'><img class='sticker' src='`)}'>`;
                    element.appendChild(stickers_block);
                }
            },
            buildPrice: function(item) {
                let self = this;
                let selected = g_sih_selectItem2.description;
            },
            isInventory: function() {
                return /^\/(profiles|id)\/\S*\/inventory/.test(window.location.pathname);
            },
            isMarket: function() {
                return /^\/(market)\/listings/.test(window.location.pathname);
            },
        }
        func.init();
    }
    addJS_Node(init);
    addJS_Node("init();");
}