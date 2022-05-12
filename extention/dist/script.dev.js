"use strict";

function _toConsumableArray(arr) { return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread(); }

function _nonIterableSpread() { throw new TypeError("Invalid attempt to spread non-iterable instance"); }

function _iterableToArray(iter) { if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter); }

function _arrayWithoutHoles(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } }

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

window.addEventListener('message', function (e) {
  if (e.data.type == 'database') {
    chrome.runtime.sendMessage(chrome.runtime.id, {
      type: "database",
      link: e.data.link
    }, function (body) {
      window.postMessage({
        type: 'answer',
        body: body
      }, '*');
    });
  }
});

function MainScript() {
  function init() {
    var func = {
      items: [],
      base: [],
      assetid_base: [],
      init: function init() {
        var self, input;
        return regeneratorRuntime.async(function init$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                console.log('Inited');
                self = this;
                _context.t0 = true;
                _context.next = _context.t0 === self.isInventory() ? 5 : _context.t0 === self.isMarket() ? 7 : 17;
                break;

              case 5:
                setInterval(function () {
                  self.items = g_ActiveInventory.m_rgAssets;
                  self.buildStickers();
                }, 500);
                return _context.abrupt("break", 18);

              case 7:
                window.postMessage({
                  type: 'database'
                }, '*');
                window.addEventListener('message', function (e) {
                  switch (e.data.type) {
                    case 'answer':
                      self.base = JSON.parse(e.data.body);
                      document.querySelectorAll(".market_commodity_explanation").forEach(function (item) {
                        return item.remove();
                      });

                      var getPrice = function getPrice(price) {
                        return parseFloat(price.replaceAll(" ", "").replaceAll(",", ""));
                      };

                      var getDiff = function getDiff(price1, price2) {
                        return ((price1 - price2) / price1 * 100).toFixed(2);
                      };

                      var name = document.querySelector(".market_listing_nav").childElements()[1].innerText;
                      var item = self.getItem(name);

                      if (item) {
                        var price_block = document.createElement("div");
                        price_block.className = "otherSitesPrices market_commodity_orders_block";
                        setInterval(function () {
                          var price_sale = getPrice((document.querySelectorAll("#market_commodity_forsale .market_commodity_orders_header_promote")[1] || document.querySelectorAll(".market_listing_price.market_listing_price_with_fee")[0]).innerText);
                          var price_buy = getPrice(document.querySelectorAll("#market_commodity_buyrequests .market_commodity_orders_header_promote")[1].innerText);
                          price_block.innerHTML = "\n                                                <img src=\"https://cs.money/svg/logo.svg\" height=\"30px\">\n                                                <span class=\"market_commodity_orders_header_promote\">$ ".concat(item.a.toFixed(2), " | $ ").concat((item.a / 100 * 93).toFixed(2), "</span>\n                                                <span class=\"market_commodity_orders_header_promote\">").concat(getDiff(price_sale, item.a), "% | ").concat(getDiff(price_buy, item.a), "%</span>\n                                            ");
                        }, 200);
                        var appendItem = document.querySelector(".market_commodity_order_block");

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
                input = document.createElement("input");
                input.setAttribute("type", "text");
                input.setAttribute("placeholder", "Item name");
                input.classList.add("pageSwitch");
                input.addEventListener("paste", function (event) {
                  var paste = (event.clipboardData || window.clipboardData).getData('text');
                  window.location.href = 'https://steamcommunity.com/market/listings/730/' + paste;
                });
                document.querySelector(".market_listing_nav_container").insertAdjacentElement("afterEnd", input);
                input.focus();
                return _context.abrupt("break", 18);

              case 17:
                return _context.abrupt("break", 18);

              case 18:
              case "end":
                return _context.stop();
            }
          }
        }, null, this);
      },
      getItem: function getItem(name) {
        var self = this;

        for (var _i = 0, _Object$values = Object.values(self.base); _i < _Object$values.length; _i++) {
          var item = _Object$values[_i];
          if (item.m === name) return item;
        }
      },
      getItems: function getItems() {
        return new Promise(function (resolve, reject) {
          setTimeout(function () {
            if (Object.keys(g_ActiveInventory.m_rgAssets).length) {
              resolve(g_ActiveInventory.m_rgAssets);
            }
          }, 250);
        });
      },
      buildStickers: function buildStickers() {
        var self = this;

        for (var _i2 = 0, _Object$keys = Object.keys(self.items); _i2 < _Object$keys.length; _i2++) {
          var key = _Object$keys[_i2];
          var _self$items$key = self.items[key],
              descriptions = _self$items$key.description.descriptions,
              assetid = _self$items$key.assetid,
              element = _self$items$key.element;
          var description_last = descriptions.at(-1);
          var parser = new DOMParser();
          var htmlDoc = parser.parseFromString(description_last.value, 'text/html');
          var sticker_info = htmlDoc.querySelector('#sticker_info');
          if (self.assetid_base.includes(assetid) || !sticker_info) continue;
          self.assetid_base.push(assetid); // let text = sticker_info.innerText;
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

          var imgs_src = _toConsumableArray(htmlDoc.querySelectorAll('img')).map(function (item) {
            return item.src;
          });

          var stickers_block = document.createElement("div");
          stickers_block.className = "stickers";
          stickers_block.innerHTML = "<img class='sticker' src='".concat(imgs_src.join("'><img class='sticker' src='"), "'>");
          element.appendChild(stickers_block);
        }
      },
      buildPrice: function buildPrice(item) {
        var self = this;
        var selected = g_sih_selectItem2.description;
      },
      isInventory: function isInventory() {
        return /^\/(profiles|id)\/\S*\/inventory/.test(window.location.pathname);
      },
      isMarket: function isMarket() {
        return /^\/(market)\/listings/.test(window.location.pathname);
      }
    };
    func.init();
  }

  addJS_Node(init);
  addJS_Node("init();");
}