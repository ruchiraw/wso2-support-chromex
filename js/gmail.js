var gmail = {};

(function () {

    var GMAIL_SEARCH_EPR = 'https://script.google.com/a/macros/wso2.com/s/AKfycbyd5Aw3QA_B0yMZ1V1-T3iFN5yMkaodheP77RM6D8Otp64bApk/exec';

    var resultsCount;

    var context = {};

    var prefix;

    var initialized = false;

    var search = function (query, paging) {
        //search gmail for the query
        var xhr = new XMLHttpRequest();
        xhr.onload = function (e) {
            if (xhr.status === 200) {
                radio('gmail searched').broadcast(false, query, (context.threads = JSON.parse(xhr.responseText)), paging);
            } else {
                radio('gmail searched').broadcast(true, query, xhr.statusText);
            }
        };
        xhr.open('GET', GMAIL_SEARCH_EPR + '?query=' + (prefix ? (prefix + query) : query) + '&start=' + paging.start + '&count=' + paging.count, true);
        xhr.send(null);
    };

    var matched = function (threads) {
        var regex = hiliter.regex(context.query);
        threads.thread.forEach(function (thread) {
            thread.matched = thread.body.match(regex);
        });
        (thread.hilits || (thread.hilits = [])).push({
            regex: regex
        });
    };

    var thread = function (id, subject) {
        //get thread content from the id
        var xhr = new XMLHttpRequest();
        xhr.onload = function (e) {
            if (xhr.status === 200) {
                radio('gmail thread loaded').broadcast(false, id, subject, JSON.parse(xhr.responseText));
            } else {
                radio('gmail thread loaded').broadcast(true, id, subject, xhr.statusText);
            }
        };
        xhr.open('GET', GMAIL_SEARCH_EPR + '?id=' + id, true);
        xhr.send(null);
    };

    gmail.init = function (content, tools, controllers, o, options) {
        resultsCount = options.gmail.count;
        prefix = options.gmail.prefix;
        var initialize = function (fn) {
            if (initialized) {
                fn();
                return;
            }
            initialized = true;
            render('gmail-tools', {
                query: context.query
            }, function (err, html) {
                tools.html(html);
                $('.search', tools).keydown(function (e) {
                    if (e.keyCode == 13) {
                        e.preventDefault();
                        context.query = $(this).val();
                        radio('gmail search').broadcast(false, context.query);
                    }
                });
                fn();
            });
        };

        //page change event
        radio('page change').subscribe(function (err, id) {
            if (id !== 'gmail') {
                return;
            }
            initialize(function () {
                page.update(true);
            });
        });

        //search request from the eye
        radio('eye search').subscribe(function (err, query, filters) {
            if (filters.indexOf('gmail') === -1) {
                return;
            }
            radio('gmail search').broadcast(false, query);
        });
        //search request from gmail
        radio('gmail search').subscribe(function (err, query, paging) {
            initialize(function () {
                paging = paging || { start: 0, count: resultsCount };
                context.id = null;
                context.query = query;
                context.paging = paging;
                $('.search', tools).val(query);
                radio('page load').broadcast(false, 'gmail');
                search(query, paging);
            });
        });

        //search response from gmail
        radio('gmail searched').subscribe(function (err, query, threads, paging) {
            radio('page loaded').broadcast(false, 'gmail');
            render('gmail', threads, function (err, html) {
                content.html(html);
                $('.back', tools).hide();
                $('.xpand', controllers).hide();
                $('.threads', content).on('click', '.thread .subject-link',function (e) {
                    var id = $(this).data('id');
                    var subject = $(this).text();
                    //remove message count
                    subject = subject.substring(0, subject.lastIndexOf(' '));
                    thread(id, subject);
                    radio('page load').broadcast(false, 'gmail');
                }).on('mouseenter', '.clabel',function (e) {
                        e.preventDefault();
                        $('.lclose', this).show();
                    }).on('mouseleave', '.clabel',function (e) {
                        e.preventDefault();
                        $('.lclose', this).hide();
                    }).on('click', '.lclose', function (e) {
                        e.preventDefault();
                        var query = '-label:' + $(this).data('label') + ' ' + context.query;
                        radio('gmail search').broadcast(false, query);
                    });
                page.update(true);
            });
            render('gmail-controls', {}, function (err, html) {
                controllers.html(html);
                $('.paging', controllers).data('start', paging.start);
                if (threads.length < resultsCount) {
                    $('.next', controllers).attr('disabled', 'disabled');
                } else {
                    $('.next', controllers).unbind().click(function (e) {
                        var start = parseInt($(this).parent().data('start'), 10) + resultsCount;
                        radio('gmail search').broadcast(false, query, {
                            start: start,
                            count: resultsCount
                        });
                    }).removeAttr('disabled');
                }
                if (paging.start == 0) {
                    $('.prev', controllers).attr('disabled', 'disabled');
                } else {
                    $('.prev', controllers).unbind().click(function (e) {
                        var start = parseInt($(this).parent().data('start'), 10) - resultsCount;
                        radio('gmail search').broadcast(false, query, {
                            start: start,
                            count: resultsCount
                        });
                    }).removeAttr('disabled');
                }
                $('.popup', controllers).unbind().click(function (e) {
                    chrome.tabs.query({
                        url: 'https://mail.google.com/mail/u/0/*'
                    }, function (tabs) {
                        var url = 'https://mail.google.com/mail/u/0/#search/' +
                            encodeURIComponent(context.query) + (context.id ? '/' + context.id : '');
                        if (!tabs.length) {
                            //create a new tab
                            chrome.tabs.create({
                                url: url,
                                active: false,
                                index: o.tab.index + 1
                            });
                            return;
                        }
                        chrome.tabs.update(tabs[0].id, {
                            url: url,
                            active: false
                        });
                    });
                });
            });
        });

        radio('gmail thread loaded').subscribe(function (err, id, subject, thread) {
            radio('page loaded').broadcast(false, 'gmail');
            if (!thread.messages.length) {
                //TODO: no result message
                return;
            }
            context.id = thread.messages[0].id;
            thread = {
                query: context.query,
                subject: subject,
                labels: thread.labels,
                thread: thread.messages
            };
            matched(thread);
            render('thread', thread, function (err, html) {
                content.html(html);
                $('.back', tools).unbind().click(function (e) {
                    radio('gmail searched').broadcast(false, context.query, context.threads, context.paging);
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
                }).removeClass('expand').addClass('collapze').end().show();
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
                }).on('click', '.header',function (e) {
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
                    }).on('click', '.gmail-extra',function (e) {
                        e.stopPropagation();
                        var self = $(this);
                        self.siblings('.gmail_extra').toggle();
                        page.update();
                    }).find('.gmail_extra').before('<div class="gmail-extra">...</div>');
                page.update(true);
            });
        });
    };
}());