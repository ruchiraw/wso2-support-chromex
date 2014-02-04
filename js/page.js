var page = {};

$(function () {
    var contents = $('.contents');
    var pager = $('.pager');
    var tools = $('.tools');
    var controllers = $('.controllers');

    var pages = ['eye', 'gmail', 'jira', 'stackoverflow', 'google'];

    var URL = 'https://support.wso2.com';

    var ISSUE_PREFIX = URL + '/jira/browse/';

    var decodeUrl = function (url) {
        var key = url.substring(ISSUE_PREFIX.length);
        var index = key.indexOf('?');
        if (index !== -1) {
            key = key.substring(0, index);
        }
        index = key.lastIndexOf('-');
        return {
            key: key,
            project: key.substring(0, index),
            id: parseInt(key.substring(index + 1), 10)
        };
    };

    $('#sandbox').load(function () {
        chrome.storage.local.get('options', function (result) {
            var opts = result.options || options;
            if (!opts) {
                chrome.storage.local.set({
                    options: opts
                });
            }
            chrome.tabs.query({
                active: true
            }, function (tabs) {
                var tab = tabs[0];
                chrome.tabs.executeScript({
                    code: 'window.getSelection().toString();'
                }, function (selection) {
                    var issue = tab.url.indexOf(ISSUE_PREFIX) === 0 ? decodeUrl(tab.url) : null;
                    pages.forEach(function (id) {
                        window[id].init($('.' + id, contents), $('.' + id, tools), $('.' + id, controllers), {
                            issue: issue,
                            tab: tab
                        }, opts);
                    });
                    selection = selection ? selection[0] : null;
                    if (selection) {
                        var tabs = [];
                        if (opts.gmail.selection) {
                            tabs.push('gmail');
                        }
                        if (opts.jira.selection) {
                            tabs.push('jira');
                        }
                        if (opts.stackoverflow.selection) {
                            tabs.push('stackoverflow');
                        }
                        if (opts.google.selection) {
                            tabs.push('google');
                        }
                        radio('eye search').broadcast(false, '"' + selection + '"', tabs);
                        radio('page change').broadcast(false, opts.tab);
                    } else if (issue) {
                        if (opts.gmail.issue) {
                            radio('gmail search').broadcast(false, issue.key);
                        }
                        if (opts.jira.issue) {
                            radio('jira ' + opts.jira.tab).broadcast(false, (opts.jira.tab !== 'search' ? issue : null));
                        }
                        radio('page change').broadcast(false, opts.tab);
                    } else {
                        radio('page change').broadcast(false, opts.tab);
                    }
                });
            });
        });
    });

    pager.on('click', '.btn', function (e) {
        radio('page change').broadcast(false, $(this).data('id'));
    });

    radio('page change').subscribe(function (err, id) {
        $('.toolbar .pager').find('.btn').removeClass('active').end()
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

    $(document).on('click', '.popover', function (e) {
        e.stopPropagation();
    });

    $(document).on('click', function (e) {
        $('.popper').popover('destroy');
    });

    contents.perfectScrollbar({
        suppressScrollX: true,
        minScrollbarLength: 40,
        wheelSpeed: 40
    });

    page.update = function (scroll) {
        if (scroll) {
            contents.scrollTop(0);
        }
        contents.perfectScrollbar('update');
    };
});