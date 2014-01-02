var gmail = {};

(function () {

    var GMAIL_SEARCH_EPR = 'https://script.google.com/a/macros/wso2.com/s/AKfycbyd5Aw3QA_B0yMZ1V1-T3iFN5yMkaodheP77RM6D8Otp64bApk/exec';

    var RESULT_COUNT = 20;

    var context = {};

    var initialized = false;

    var search = function (query, paging) {
        paging = paging || { start: 0, count: RESULT_COUNT };
        //search gmail for the query
        var xhr = new XMLHttpRequest();
        xhr.onload = function (e) {
            if (xhr.status === 200) {
                radio('gmail searched').broadcast(false, query, (context.threads = JSON.parse(xhr.responseText)), paging);
            } else {
                radio('gmail searched').broadcast(true, query, xhr.statusText);
            }
        };
        xhr.open('GET', GMAIL_SEARCH_EPR + '?query=' + query + '&start=' + paging.start + '&count=' + paging.count, true);
        xhr.send(null);
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

    gmail.init = function (content, tools, controllers) {
        //page change event
        radio('page change').subscribe(function (err, id) {
            if (id !== 'gmail') {
                return;
            }
            content.scrollTop(0).perfectScrollbar('update');
            if (!initialized) {
                initialized = true;
                page.render('gmail-tools', {
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
                });
            }
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
            context.id = null;
            context.query = query;
            context.paging = paging;
            radio('page load').broadcast(false, 'gmail');
            search(query, paging);
        });

        //search response from gmail
        radio('gmail searched').subscribe(function (err, query, threads, paging) {
            radio('page loaded').broadcast(false, 'gmail');
            page.render('gmail', threads, function (err, html) {
                content.html(html);
                content.perfectScrollbar('destroy').scrollTop(0).perfectScrollbar({
                    suppressScrollX: true,
                    minScrollbarLength: 40,
                    wheelSpeed: 40
                }).scrollTop(0);
                $('.back', tools).hide();
                $('.threads', content).on('click', '.thread a', function (e) {
                    var id = $(this).data('id');
                    var subject = $(this).text();
                    //remove message count
                    subject = subject.substring(0, subject.lastIndexOf(' '));
                    thread(id, subject);
                    radio('page load').broadcast(false, 'gmail');
                });
            });
            page.render('gmail-controls', {}, function (err, html) {
                controllers.html(html);
                $('.paging', controllers).data('start', paging.start);
                if (threads.length < RESULT_COUNT) {
                    $('.next', controllers).attr('disabled', 'disabled');
                } else {
                    $('.next', controllers).click(function (e) {
                        var start = parseInt($(this).parent().data('start'), 10) + RESULT_COUNT;
                        radio('gmail search').broadcast(false, query, {
                            start: start,
                            count: RESULT_COUNT
                        });
                    }).removeAttr('disabled');
                }
                if (paging.start == 0) {
                    $('.prev', controllers).attr('disabled', 'disabled');
                } else {
                    $('.prev', controllers).click(function (e) {
                        var start = parseInt($(this).parent().data('start'), 10) - RESULT_COUNT;
                        radio('gmail search').broadcast(false, query, {
                            start: start,
                            count: RESULT_COUNT
                        });
                    }).removeAttr('disabled');
                }
                $('.popup', controllers).click(function (e) {
                    chrome.tabs.query({
                        url: 'https://mail.google.com/mail/u/0/*'
                    }, function (tabs) {
                        var url = 'https://mail.google.com/mail/u/0/#search/' +
                            encodeURIComponent(context.query) + (context.id ? '/' + context.id : '');
                        if (!tabs.length) {
                            //create a new tab
                            chrome.tabs.create({
                                url: url,
                                active: false
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
            if (!thread.length) {
                //TODO: no result message
                return;
            }
            context.id = thread[0].id;
            thread = {
                query: context.query.substring(1, context.query.length - 1),
                subject: subject,
                thread: thread
            };
            console.log(thread.query);
            page.render('thread', thread, function (err, html) {
                content.html(html);
                content.perfectScrollbar('destroy').scrollTop(0).perfectScrollbar({
                    suppressScrollX: true,
                    minScrollbarLength: 40,
                    wheelSpeed: 40
                });
                $('.back', tools).unbind().click(function (e) {
                    radio('gmail searched').broadcast(false, context.query, context.threads, context.paging);
                }).show();
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
                    content.perfectScrollbar('update');
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
                        content.perfectScrollbar('update');
                    }).on('click', '.gmail-extra',function (e) {
                        e.stopPropagation();
                        var self = $(this);
                        self.siblings('.gmail_extra').toggle();
                        content.perfectScrollbar('update');
                    }).find('.gmail_extra').before('<div class="gmail-extra">...</div>');
            });
        });
    };
}());