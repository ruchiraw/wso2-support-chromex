var jira = {};

(function () {

    var URL = (jira.URL = 'https://support.wso2.com');

    var SEARCH_EPR = URL + '/jira/rest/api/2.0.alpha1/search';

    var resultsCount = 10;

    var ISSUE_EPR = URL + '/jira/rest/api/2.0.alpha1/issue/';

    var PROJECT_EPR = URL + '/jira/rest/api/2.0.alpha1/project/';

    var initialized = false;

    var processed = false;

    var context = {
        data: {}
    };

    var inProject = false;

    var url = function (path) {
        return URL + path;
    };

    /*var dictionary = {};*/

    var v = function (issues) {
        var regex = /(?:[a-zA-Z]+[\s-]+){1,3}[0-9]\.[0-9](\.[0-9]+)?/ig;
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
                /*var words = comment.body.split(/\W/ig);
                 var dic = dictionary;
                 words.forEach(function(word) {
                 var i, ch, arr,
                 o = dic,
                 l = word.length;
                 for(i = 0; i < l; i++) {
                 ch = word.charAt(i).toLowerCase();
                 o = o[ch] || (o[ch] = {});
                 }
                 arr = o[''] || (o[''] = []);
                 arr.push(issue.key);
                 });*/
            });
            issue.allv = all;
            (issue.hilits || (issue.hilits = [])).push({
                css: 'version',
                regex: regex
            });
        });
    };

    var p = function (issues) {
        var regex = /((patch)[-\s]?[0-9]{2,4})|(WSO2-CARBON-PATCH-)[0-9]\.[0-9]\.[0-9]-[0-9]{2,6}/ig;
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
            (issue.hilits || (issue.hilits = [])).push({
                css: 'patch',
                regex: regex
            });
        });
    };

    var matched = function (thread) {
        var regex = hiliter.regex(context.query);
        var description = thread.fields.description;
        description.matched = description.value.match(regex);
        thread.fields.comment.value.forEach(function (c) {
            c.matched = c.body.match(regex);
        });
        (thread.hilits || (thread.hilits = [])).push({
            regex: regex
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

    var project = function (id, cb) {
        var o = context.project;
        if (o) {
            cb(false, o);
            return;
        }

        var xhr = new XMLHttpRequest();
        xhr.open('GET', PROJECT_EPR + id, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.onload = function (e) {
            if (xhr.status === 200) {
                o = JSON.parse(xhr.responseText);
                context.project = o;
                cb(false, o);
            } else {
                cb(false, null);
            }
        };
        xhr.send(null);
    };

    var recent = function (o, paging, cb) {
        if (context.recent) {
            var i, length, start,
                results = {
                    issues: []
                };
            start = context.recent - paging.start;
            length = start - resultsCount > 0 ? start - resultsCount : 0;
            for (i = start; i > length; i--) {
                results.issues.push({
                    key: o.project + '-' + i
                });
            }
            cb(false, results);
            return;
        }
        var order = (paging.sort === 'asc' ? 'ASC' : 'DESC');
        searchJira({
            query: 'project = ' + o.project + ' ORDER BY key ' + order + ', status ' + order + ', priority ' + order
        }, paging, function (err, results) {
            var key = results.issues[0].key;
            context.recent = parseInt(key.substring(key.lastIndexOf('-') + 1), 10);
            cb(err, results);
        });
    };

    var history = function (o, paging, cb) {
        var i, length, start,
            results = {
                issues: []
            };
        start = o.id > paging.start ? o.id - paging.start : 0;
        length = start - resultsCount > 0 ? start - resultsCount : 0;
        for (i = start; i > length; i--) {
            results.issues.push({
                key: o.project + '-' + i
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

    jira.init = function (content, tools, controllers, o, options) {
        resultsCount = options.jira.count;
        context.issue = o.issue;
        var initialize = function () {
            if (!initialized) {
                initialized = true;
                render('jira-tools', {
                    query: context.query
                }, function (err, html) {
                    tools.html(html);
                    var search = $('.search', tools);
                    search.keydown(function (e) {
                        if (e.keyCode == 13) {
                            e.preventDefault();
                            context.query = $(this).val();
                            radio('jira search').broadcast(false, context.query);
                        }
                    });
                    var project = $('.in-project', tools);
                    project.click(function (e) {
                        var el = $(this);
                        if (el.hasClass('active')) {
                            inProject = false;
                            el.removeClass('active');
                            return;
                        }
                        inProject = true;
                        el.addClass('active');
                    });
                });

                render('jira-controls', {}, function (err, html) {
                    controllers.html(html);
                    $('.next', controllers).click(function (e) {
                        var start = parseInt($(this).parent().data('start'), 10) + resultsCount;
                        if (context.type === 'search') {
                            radio('jira search').broadcast(false, context.query, {
                                start: start,
                                count: resultsCount
                            });
                            return;
                        }
                        if (context.type === 'recent') {
                            radio('jira recent').broadcast(false, context.issue, {
                                start: start,
                                count: resultsCount
                            });
                            return;
                        }
                        radio('jira history').broadcast(false, context.issue, {
                            start: start,
                            count: resultsCount
                        });
                    });
                    //}
                    $('.prev', controllers).click(function (e) {
                        var start = parseInt($(this).parent().data('start'), 10) - resultsCount;
                        if (context.type === 'search') {
                            radio('jira search').broadcast(false, context.query, {
                                start: start,
                                count: resultsCount
                            });
                            return;
                        }
                        if (context.type === 'recent') {
                            radio('jira recent').broadcast(false, context.issue, {
                                start: start,
                                count: resultsCount
                            });
                            return;
                        }
                        radio('jira history').broadcast(false, context.issue, {
                            start: start,
                            count: resultsCount
                        });
                    });
                    $('.history', controllers).click(function (e) {
                        radio('jira history').broadcast(false, context.issue);
                    });
                    $('.recent', controllers).click(function (e) {
                        radio('jira recent').broadcast(false, context.issue);
                    });
                    $('.search', controllers).click(function (e) {
                        radio('jira search').broadcast(false, context.query);
                    });
                    radio('jira ' + options.jira.tab).broadcast(false,
                        options.jira.tab === 'search' ? context.query : context.issue);
                });
            }
        };
        //page change event
        radio('page change').subscribe(function (err, id) {
            if (id !== 'jira') {
                return;
            }
            content.scrollTop(0).perfectScrollbar('update');
            initialize();
        });
        //search request from the eye
        radio('eye search').subscribe(function (err, query, filters) {
            if (filters.indexOf('jira') === -1) {
                return;
            }
            radio('jira search').broadcast(false, query);
        });
        //search response from the eye
        radio('jira results').subscribe(function (err, query, issues, paging) {
            context.issues = issues;
            render('jira', issues, function (err, html) {
                content.html(html);
                content.perfectScrollbar('destroy').scrollTop(0).perfectScrollbar({
                    suppressScrollX: true,
                    minScrollbarLength: 40,
                    wheelSpeed: 40
                });
                $('.back', tools).hide();
                $('.xpand', controllers).hide();
                $('.paging', controllers).data('start', context.paging.start).show();
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
                        html: true,
                        container: 'body'
                    }).popover('show');
                });

                var next = $('.next', controllers).show();
                if (issues.length < resultsCount) {
                    next.attr('disabled', 'disabled');
                } else {
                    next.removeAttr('disabled');
                }

                var prev = $('.prev', controllers).show();
                if (context.paging.start == 0) {
                    prev.attr('disabled', 'disabled');
                } else {
                    prev.removeAttr('disabled');
                }
            });
        });

        var process = function (err, results) {
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
                radio('jira results').broadcast(err, context.query, issues, context.paging);
            });
        };

        //search request from jira
        radio('jira search').subscribe(function (err, query, paging) {
            initialize();
            context.type = 'search';
            $(this).addClass('active');
            $('.back', tools).hide();
            $('.tabs .btn', controllers).removeClass('active');
            $('.' + context.type, controllers).addClass('active');
            $('.search', tools).val(query).show();
            $('.in-project', tools).show();
            if (!query) {
                $('.paging', controllers).hide();
                content.empty();
                return;
            }
            paging = paging || {
                start: 0,
                count: resultsCount
            };
            context.paging = paging;
            radio('page load').broadcast(false, 'jira');
            //jira search
            context.query = (query = query.match(/^".*"$/ig) ? query : '"' + query + '"');
            query = 'summary ~ ' + query + ' OR description ~ ' + query + ' OR comment ~ ' + query;
            if (inProject) {
                query = 'project = ' + context.issue.project + ' AND (' + query + ')';
            }
            searchJira({
                query: query
            }, paging, process);
        });

        radio('jira history').subscribe(function (err, issue, paging) {
            initialize();
            context.type = 'history';
            $('.search', tools).hide();
            $('.in-project', tools).hide();
            $('.back', tools).hide();
            $('.tabs .btn', controllers).removeClass('active');
            $('.' + context.type, controllers).addClass('active');
            paging = paging || {
                start: 0,
                count: resultsCount
            };
            context.paging = paging;
            radio('page load').broadcast(false, 'jira');
            history(issue, paging, process);
        });

        radio('jira recent').subscribe(function (err, issue, paging) {
            initialize();
            context.type = 'recent';
            $('.search', tools).hide();
            $('.in-project', tools).hide();
            $('.back', tools).hide();
            $('.tabs .btn', controllers).removeClass('active');
            $('.' + context.type, controllers).addClass('active');
            paging = paging || {
                start: 0,
                count: resultsCount
            };
            context.paging = paging;
            radio('page load').broadcast(false, 'jira');
            recent(issue, paging, process);
        });

        radio('jira thread loaded').subscribe(function (err, id, thread) {
            //radio('page loaded').broadcast(false, 'jira');
            if (context.type === 'search') {
                matched(thread);
            }
            render('thread-jira', thread, function (err, html) {
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
                    content.perfectScrollbar('destroy').scrollTop(0).perfectScrollbar({
                        suppressScrollX: true,
                        minScrollbarLength: 40,
                        wheelSpeed: 40
                    });
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

        radio('jira project info').subscribe(function (err, id) {
            project(id, function (err, result) {
                setTimeout(function () {
                    radio('jira project info loaded').broadcast(err, id, result);
                }, 0);
            });
        });
    };

}());