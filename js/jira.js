var jira = {};

(function () {

    var URL = (jira.URL = 'https://support.wso2.com');

    var SEARCH_EPR = URL + '/jira/rest/api/2.0.alpha1/search';

    var RESULT_COUNT = 10;

    var ISSUE_EPR = URL + '/jira/rest/api/2.0.alpha1/issue/';

    var initialized = false;

    var context = {
        type: 'history',
        data: {}
    };

    var url = function (path) {
        return URL + path;
    };

    var decode = function (key) {
        key = key.trim();
        var index = key.lastIndexOf('-');
        return {
            key: key,
            project: key.substring(0, index),
            id: key.substring(index + 1)
        };
    };

    var v = function (issues) {
        console.log(issues);
        var regex = /(?:[a-zA-Z]+[\s-]+){1,3}[0-9]\.[0-9](\.[0-9]+)?\s/ig;
        issues.forEach(function (issue) {
            var description = issue.fields.description;
            var a = description.value.match(regex);
            var all = [];
            if (a && a.length) {
                description.v = a;
                all = a;
            }
            var comments = issue.fields.comment.value;
            comments.forEach(function (comment) {
                var a = comment.body.match(regex);
                if (a && a.length) {
                    comment.v = a;
                    all = all.concat(a);
                }
            });
            issue.allv = all;
        });
    };

    var p = function (issues) {
        var regex = /((patch)[-\s]?[0-9]{2,4})|(WSO2-CARBON-PATCH-)[0-9]\.[0-9]\.[0-9]-[0-9]{4}/ig;
        issues.forEach(function (issue) {
            var description = issue.fields.description;
            var a = description.value.match(regex);
            var all = [];
            if (a && a.length) {
                description.p = a;
                all = a;
            }
            var comments = issue.fields.comment.value;
            comments.forEach(function (comment) {
                var a = comment.body.match(regex);
                if (a && a.length) {
                    comment.p = a;
                    all = all.concat(a);
                }
            });
            issue.allp = all;
        });
    };

    var fix = function (issues) {
        var arr = [];
        issues.forEach(function (issue) {
            if (issue) {
                arr.push(issue);
            }
        });
        return arr;
    };

    var issue = function (id, cb) {
        var data = context.data;
        var o = data[id];
        if (o) {
            cb(false, o);
            return;
        }

        var xhr = new XMLHttpRequest();
        xhr.open('GET', ISSUE_EPR + id + '?expand=html', true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.onload = function (e) {
            if (xhr.status === 200) {
                o = JSON.parse(xhr.responseText);
                var comments = o.html.comment;
                var i = 0;
                o.fields.description.html = o.html.description;
                o.fields.comment.value.forEach(function (c) {
                    c.html = comments[i++];
                });
                data[id] = o;
                cb(false, o);
            } else {
                cb(false, null);
            }
        };
        xhr.send(null);
    };

    var recent = function (o, paging, cb) {
        var order = (o.sort === 'asc' ? 'ASC' : 'DESC');
        searchJira({
            query: 'project = ' + o.query.project + ' ORDER BY key ' + order + ', status ' + order + ', priority ' + order
        }, paging, cb);
    };

    var history = function (o, paging, cb) {
        var i, length, start,
            results = {
                issues: []
            };
        start = o.query.id > paging.start ? o.query.id - paging.start : 0;
        length = start - RESULT_COUNT > 0 ? start - RESULT_COUNT : 0;
        for (i = start; i > length; i--) {
            results.issues.push({
                key: o.query.project + '-' + i
            });
        }
        cb(false, results);
    };

    var thread = function (o, cb) {

    };

    /**
     * This will traverse through the history and try to find environment
     * @param o
     * @param cb
     */
    var environment = function (o, cb) {
        issue(o.key, function (err, result) {
            var env = result.fields.environment.value;
            if (env) {
                cb(false, env);
                return;
            }
            if (o.id === 1) {
                //not found, try to infer from comments
                cb(false, null);
                return;
            }
            var id = o.id - 1;
            environment({
                key: o.project + '-' + id,
                project: o.project,
                id: id
            }, cb);
        });
    };

    /**
     * This will traverse through the issue and try to find product versions
     * @param o
     * @param cb
     */
    var versions = function (o, cb) {
        issue(o.key, function (err, result) {
            var o = [];
            var p = products(result.fields.summary.value);
            if (p.products.length > 0) {
                o.push({
                    type: 'summary',
                    versions: p.products,
                    link: result.self,
                    content: p.content
                });
            }
            p = products(result.fields.description.value);
            if (p.products.length > 0) {
                o.push({
                    type: 'description',
                    versions: p.products,
                    link: result.self,
                    content: p.content
                });
            }
            result.fields.comment.value.forEach(function (comment) {
                p = products(comment.body);
                if (p.products.length > 0) {
                    o.push({
                        type: 'comment',
                        versions: p.products,
                        link: comment.self,
                        content: p.content
                    })
                }
            });
            cb(false, o);
        });
    };

    var searchJira = function (o, paging, cb) {
        var xhr = new XMLHttpRequest();
        xhr.open('POST', SEARCH_EPR, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.onload = function (e) {
            if (xhr.status === 200) {
                cb(false, JSON.parse(xhr.responseText));
            } else {
                cb(true, xhr.statusText);
            }
        };
        var data = {
            jql: o.query,
            startAt: paging.start,
            maxResults: paging.count
        };
        xhr.send(JSON.stringify(data));
    };

    jira.init = function (content, tools, controllers) {
        //page change event
        radio('page change').subscribe(function (err, id) {
            if (id !== 'jira') {
                return;
            }
            content.scrollTop(0).perfectScrollbar('update');
            if (!initialized) {
                initialized = true;
                page.render('jira-tools', {
                    query: context.query.key
                }, function (err, html) {
                    tools.html(html);
                    $('.search', tools).keydown(function (e) {
                        if (e.keyCode == 13) {
                            e.preventDefault();
                            context.query = $(this).val();
                            radio('jira search').broadcast(false, context.query);
                        }
                    });
                });
            }
        });
        //search request from the eye
        radio('eye search').subscribe(function (err, query) {
            radio('jira search').broadcast(false, query);
        });
        //search response from the eye
        radio('jira results').subscribe(function (err, query, issues, paging) {
            context.issues = issues;
            page.render('jira', issues, function (err, html) {
                content.html(html);
                content.perfectScrollbar('destroy').scrollTop(0).perfectScrollbar({
                    suppressScrollX: true,
                    minScrollbarLength: 40,
                    wheelSpeed: 40
                });
                $('.back', tools).hide();
                $('.threads', content).on('click', '.thread a', function (e) {
                    var id = $(this).data('id');
                    issue(id, function (err, thread) {
                        radio('jira thread loaded').broadcast(err, id, thread);
                    });
                });
                content.on('click', '.details > .info .popper', function (e) {
                    e.stopPropagation();
                    $('.details .popper', content).popover('destroy');
                    var self = $(this);
                    self.popover('destroy').popover({
                        content: function () {
                            return self.siblings('.' + self.data('id') + '-popper').html();
                        },
                        placement: 'left',
                        trigger: 'manual',
                        html: true
                    }).popover('show');
                });
                /*content.on('click', '.details > .info .patch', function (e) {
                 e.stopPropagation();
                 $('.details .popper', content).popover('destroy');
                 var self = $(this);
                 self.popover('destroy').popover({
                 content: function () {
                 return self.siblings('.patch-popper').html();
                 },
                 placement: 'left',
                 trigger: 'manual',
                 html: true
                 }).popover('show');
                 });*/
                content.on('click', function (e) {
                    $('.details .popper', content).popover('destroy');
                });
            });
            page.render('jira-controls', {}, function (err, html) {
                controllers.html(html);
                $('.paging', controllers).data('start', paging.start);
                if (issues.length < RESULT_COUNT) {
                    $('.next', controllers).attr('disabled', 'disabled');
                } else {
                    $('.next', controllers).click(function (e) {
                        var start = parseInt($(this).parent().data('start'), 10) + RESULT_COUNT;
                        radio('jira search').broadcast(false, context.query.key, {
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
                        radio('jira search').broadcast(false, context.query.key, {
                            start: start,
                            count: RESULT_COUNT
                        });
                    }).removeAttr('disabled');
                }
                $('.history', controllers).click(function (e) {
                    context.type = 'history';
                    $('.tabs .btn', controllers).removeClass('active');
                    $(this).addClass('active');
                    radio('jira search').broadcast(false, context.query.key);
                });
                $('.recent', controllers).click(function (e) {
                    context.type = 'recent';
                    $('.tabs .btn', controllers).removeClass('active');
                    $(this).addClass('active');
                    radio('jira search').broadcast(false, context.query.key);
                });
                $('.' + context.type, controllers).addClass('active');
            });
        });
        //search request from jira
        radio('jira search').subscribe(function (err, query, paging) {
            if (query.match(/^[\s]*[a-zA-Z0-9]+-[0-9]+[\s]*$/ig)) {
                //issue id has been searched
                var o = decode(query.trim());
                context.query = o;
                paging = paging || {
                    start: 0,
                    count: RESULT_COUNT
                };
                context.paging = paging;
                radio('page load').broadcast(false, 'jira');

                (context.type === 'history' ? history : recent)({
                    query: o
                }, paging, function (err, results) {
                    var tasks = [];
                    results.issues.forEach(function (obj) {
                        tasks.push(function (cb) {
                            //TODO ????
                            issue(obj.key, cb);
                        });
                    });
                    async.parallel(tasks, function (err, issues) {
                        //context[context.type] = issues;
                        issues = fix(issues);
                        v(issues);
                        p(issues);
                        radio('page loaded').broadcast(false, 'jira');
                        radio('jira results').broadcast(err, query, issues, paging);
                    });
                });
                return;
            }
        });

        radio('jira thread loaded').subscribe(function (err, id, thread) {
            //radio('page loaded').broadcast(false, 'jira');
            page.render('thread-jira', thread, function (err, html) {
                content.html(html);
                content.perfectScrollbar('destroy').scrollTop(0).perfectScrollbar({
                    suppressScrollX: true,
                    minScrollbarLength: 40,
                    wheelSpeed: 40
                });
                $('.back', tools).unbind().click(function (e) {
                    //TODO
                    radio('jira results').broadcast(false, context.query, context.issues, context.paging);
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
                        content.perfectScrollbar('update');
                    });
                $('.popup', controllers).click(function (e) {
                    chrome.tabs.create({
                        url: URL + '/jira/browse/' + id,
                        active: false
                    });
                }).removeClass('hidden');
            });
        });
    };

}());

//"a wso2 esb 4.5.1 and esb wso2 application server 5.1 esb several bps version we have is 2.0.1 and also there is another cluster of ESB 4.8.0 servers".match(/(?:[a-zA-Z]+[\s]+){1,3}[0-9]\.[0-9](\.[0-9]+)?\b/ig)