var page = {};

$(function () {
    var contents = $('.contents');
    var pager = $('.pager');
    var tools = $('.tools');
    var controllers = $('.controllers');

    var pages = ['eye', 'gmail', 'jira'];

    var contexts = {};

    var s4 = function () {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    };

    var URL = 'https://support.wso2.com';

    var ISSUE_PREFIX = URL + '/jira/browse/';

    var decodeUrl = function (url) {
        var key = url.substring(ISSUE_PREFIX.length);
        var index = key.lastIndexOf('-');
        return {
            key: key,
            project: key.substring(0, index),
            id: key.substring(index + 1)
        };
    };

    var guid = function () {
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
    };

    page.render = function (path, data, cb) {
        var req = new XMLHttpRequest();
        req.open('GET', chrome.extension.getURL('templates/' + path + '.hbs'), true);
        req.onload = function () {
            if (req.status === 200) {
                var id = guid();
                var iframe = document.getElementById('sandbox');
                iframe.contentWindow.postMessage({
                    id: id,
                    source: req.responseText,
                    data: data
                }, '*');
                contexts[id] = cb;
            } else {
                cb(true);
            }
        };
        req.send(null);
    };

    window.addEventListener('message', function (event) {
        var cb = contexts[event.data.id];
        if (event.data.error) {
            cb(true);
            return;
        }
        cb(false, event.data.html);
    });

    $('#sandbox').load(function () {
        pages.forEach(function (id) {
            window[id].init($('.' + id, contents), $('.' + id, tools), $('.' + id, controllers));
        });

        chrome.tabs.query({
            active: true
        }, function (tabs) {
            var tab = tabs[0];
            chrome.tabs.executeScript({
                code: 'window.getSelection().toString();'
            }, function (selection) {
                selection = selection ? selection[0] : null;
                if (selection) {
                    radio('eye search').broadcast(false, '"' + selection + '"');
                    radio('page change').broadcast(false, 'gmail');
                } else if (tab.url.indexOf(ISSUE_PREFIX) === 0) {
                    var o = decodeUrl(tab.url);
                    radio('eye search').broadcast(false, o.key);
                    radio('page change').broadcast(false, 'gmail');
                } else {
                    radio('page change').broadcast(false, 'eye');
                }
            });
        });
    });

    pager.on('click', '.btn', function (e) {
        radio('page change').broadcast(false, $(this).data('id'));
    });

    radio('page change').subscribe(function (err, id) {
        $('.pager').find('.btn').removeClass('active').end()
            .find('.btn.' + id).addClass('active');

        var tools = $('.tools');
        tools.find('.content').removeClass('active').hide();
        tools.find('.' + id).addClass('active').show();

        var controllers = $('.controllers');
        controllers.find('.content').removeClass('active').hide();
        controllers.find('.' + id).addClass('active').show();

        var contents = $('.contents');
        contents.find('.content').removeClass('active').hide();
        contents.find('.' + id).addClass('active').show();
    });

    radio('page load').subscribe(function (err, id) {
        $('.' + id, pager).addClass('loading');
    });

    radio('page loaded').subscribe(function (err, id) {
        $('.' + id, pager).removeClass('loading');
    });
});