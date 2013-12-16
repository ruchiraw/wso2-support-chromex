var gmail = {};

(function () {

    var GMAIL_SEARCH_EPR = 'https://script.google.com/a/macros/wso2.com/s/AKfycbyd5Aw3QA_B0yMZ1V1-T3iFN5yMkaodheP77RM6D8Otp64bApk/exec';

    var context = {};

    var initialized = false;

    var search = function (query) {
        //search gmail for the query
        var xhr = new XMLHttpRequest();
        xhr.onload = function (e) {
            if (xhr.status === 200) {
                radio('gmail searched').broadcast(false, query, (context.threads = JSON.parse(xhr.responseText)));
            } else {
                radio('gmail searched').broadcast(true, query, xhr.statusText);
            }
        };
        xhr.open('GET', GMAIL_SEARCH_EPR + '?query=' + query, true);
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
        radio('eye search').subscribe(function (err, query) {
            radio('gmail search').broadcast(false, query);
        });
        //search request from gmail
        radio('gmail search').subscribe(function (err, query) {
            context.query = query;
            radio('page load').broadcast(false, 'gmail');
            search(query);
        });

        //search response from gmail
        radio('gmail searched').subscribe(function (err, query, threads) {
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
            });
        });

        radio('gmail thread loaded').subscribe(function (err, id, subject, thread) {
            radio('page loaded').broadcast(false, 'gmail');
            thread = {
                subject: subject,
                thread: thread
            };
            page.render('thread', thread, function (err, html) {
                content.html(html);
                content.perfectScrollbar('destroy').scrollTop(0).perfectScrollbar({
                    suppressScrollX: true,
                    minScrollbarLength: 40,
                    wheelSpeed: 40
                });
                $('.back', tools).unbind().click(function (e) {
                    radio('gmail searched').broadcast(false, context.query, context.threads);
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