var stackoverflow = {};

(function () {

    var ENDPOINT = 'https://api.stackexchange.com/2.1/';

    var resultsCount;

    var initialized = false;

    var context = {
        data: {}
    };

    var search = function (query, cb, paging) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', ENDPOINT + 'search/advanced?order=desc&sort=relevance&site=stackoverflow&filter=!9f*CwKRWa&page=' + paging.page + '&pagesize=' + resultsCount + '&q=' + query, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.onload = function (e) {
            if (xhr.status === 200) {
                context.data = JSON.parse(xhr.responseText).items;
                cb(false, context.data, paging);
            } else {
                cb(true, xhr.statusText);
            }
        };
        xhr.send(null);
    };

    var thread = function (id, cb) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', ENDPOINT + 'questions/' + id + '/answers?order=desc&sort=votes&site=stackoverflow&filter=!9f*CwP.Is', true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.onload = function (e) {
            if (xhr.status === 200) {
                cb(false, id, JSON.parse(xhr.responseText).items);
            } else {
                cb(true, id, xhr.statusText);
            }
        };
        xhr.send(null);
    };

    stackoverflow.init = function (content, tools, controllers, o, options) {
        resultsCount = options.stackoverflow.count;
        var initialize = function (fn) {
            if (initialized) {
                fn();
                return;
            }
            initialized = true;
            render('stackoverflow-tools', {
                query: context.query
            }, function (err, html) {
                tools.html(html);
                $('.search', tools).keydown(function (e) {
                    if (e.keyCode == 13) {
                        e.preventDefault();
                        context.query = $(this).val();
                        radio('stackoverflow search').broadcast(false, context.query);
                    }
                });
                fn();
            });
        };
        //page change event
        radio('page change').subscribe(function (err, id) {
            if (id !== 'stackoverflow') {
                return;
            }
            initialize(function () {
                page.update(true);
            });
        });
        //search request from the eye
        radio('eye search').subscribe(function (err, query, filters) {
            if (filters.indexOf('stackoverflow') === -1) {
                return;
            }
            query = query.trim();
            if (query.charAt(0) === '"' && query.charAt(query.length - 1) === '"') {
                query = query.substring(1, query.length - 1);
            }
            radio('stackoverflow search').broadcast(false, query);
        });
        //search response from the eye
        radio('stackoverflow results').subscribe(function (err, query, threads, paging) {
            context.url = 'https://stackoverflow.com/search?q=' + encodeURIComponent(query);
            render('stackoverflow', threads, function (err, html) {
                content.html(html);
                page.update(true);
                $('.back', tools).hide();
                $('.xpand', controllers).hide();
                $('.threads', content).on('click', '.thread a', function (e) {
                    var id = $(this).data('id');
                    context.url = $(this).data('url');
                    radio('page load').broadcast(false, 'stackoverflow');
                    thread(id, function (err, id, thread) {
                        radio('page loaded').broadcast(false, 'stackoverflow');
                        radio('stackoverflow thread loaded').broadcast(false, id, thread);
                    });
                });
            });
            render('gmail-controls', {}, function (err, html) {
                controllers.html(html);
                $('.paging', controllers).data('page', paging.page);
                if (threads.length < resultsCount) {
                    $('.next', controllers).attr('disabled', 'disabled');
                } else {
                    $('.next', controllers).unbind().click(function (e) {
                        var page = parseInt($(this).parent().data('page'), 10) + 1;
                        radio('stackoverflow search').broadcast(false, query, {
                            page: page
                        });
                    }).removeAttr('disabled');
                }
                if (paging.page == 1) {
                    $('.prev', controllers).attr('disabled', 'disabled');
                } else {
                    $('.prev', controllers).unbind().click(function (e) {
                        var page = parseInt($(this).parent().data('page'), 10) - 1;
                        radio('stackoverflow search').broadcast(false, query, {
                            page: page
                        });
                    }).removeAttr('disabled');
                }
                $('.popup', controllers).unbind().click(function (e) {
                    //create a new tab
                    chrome.tabs.create({
                        url: context.url,
                        active: false,
                        index: o.tab.index + 1
                    });
                });
            });
        });
        //search request from stackoverflow
        radio('stackoverflow search').subscribe(function (err, query, paging) {
            if (!query.match(/^[\s]*[a-zA-Z0-9]+-[0-9]+[\s]*$/ig)) {
                //issue id has been searched
                initialize(function () {
                    context.query = query;
                    context.paging = paging || { page: 1 };
                    $('.search', tools).val(query);
                    radio('page load').broadcast(false, 'stackoverflow');
                    search(query, function (err, threads, paging) {
                        radio('page loaded').broadcast(false, 'stackoverflow');
                        radio('stackoverflow results').broadcast(false, query, threads, paging);
                    }, context.paging);
                });
            }
        });

        radio('stackoverflow thread loaded').subscribe(function (err, id, thread) {
            //radio('page loaded').broadcast(false, 'stackoverflow');
            var o,
                i = 0,
                data = context.data,
                length = data.length;
            while (i < length) {
                if (data[i].question_id === id) {
                    o = data[i];
                    break;
                }
                i++;
            }
            thread = {
                query: context.query,
                subject: o.title,
                created: o.creation_date,
                owner: o.owner.display_name,
                body: o.body,
                thread: thread
            };
            render('thread-stackoverflow', thread, function (err, html) {
                content.html(html);
                page.update(true);
                $('.back', tools).unbind().click(function (e) {
                    //TODO
                    radio('stackoverflow results').broadcast(false, context.query, context.data, context.paging);
                }).show();
                $('.xpand', controllers).find('.btn').unbind().click(function (e) {
                    var el = $(this);
                    if (el.hasClass('expand')) {
                        $('.messages').find('.summary').addClass('hidden').end()
                            .find('.body').removeClass('hidden').end()
                            .find('.message').removeClass('ash');
                        el.removeClass('expand').addClass('collapze');
                    } else {
                        $('.messages').find('.body').addClass('hidden').end()
                            .find('.summary').removeClass('hidden').end()
                            .find('.message').addClass('ash');
                        el.removeClass('collapze').addClass('expand');
                    }
                    page.update(true);
                }).end().show();
                $('.messages', content).on('click', '.message',function (e) {
                    //showing body
                    var self = $(this);
                    var visible = $('.summary', self).hasClass('hidden');
                    if (visible) {
                        return;
                    }
                    $('.summary', self).addClass('hidden');
                    $('.body', self).removeClass('hidden');
                    self.removeClass('ash');
                    page.update();
                }).on('click', '.header', function (e) {
                        //hiding body
                        var self = $(this);
                        var visible = $('.summary', self).hasClass('hidden');
                        if (!visible) {
                            return;
                        }
                        e.stopPropagation();
                        $('.summary', self).removeClass('hidden');
                        self.siblings('.body').addClass('hidden');
                        self.closest('.message').addClass('ash');
                        page.update();
                    });
            });
        });
    };
}());