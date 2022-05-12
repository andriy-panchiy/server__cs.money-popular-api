"use strict";

chrome.runtime.onMessage.addListener(function (message, sender, callback) {
  switch (message.type) {
    case '':
      break;

    case 'database':
      console.log(message);
      $.ajax({
        type: 'GET',
        url: 'https://old.cs.money/js/database-skins/library-en-730.js?v=22',
        success: function success(body) {
          callback(body.replace("skinsBaseList[730] = ", ''));
        },
        error: function error(err) {
          callback({
            success: false
          });
        }
      });
      break;

    default:
      callback({
        success: false
      });
      break;
  }
});