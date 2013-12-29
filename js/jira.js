var jira = {};

(function () {

    var URL = (jira.URL = 'https://support.wso2.com');

    var SEARCH_EPR = URL + '/jira/rest/api/2.0.alpha1/search';

    var ISSUE_EPR = URL + '/jira/rest/api/2.0.alpha1/issue/';

    var initialized = false;

    var context = {
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

    var issue = function (id, cb) {
        var data = context.data;
        var o = data[id];
        if (o) {
            cb(false, o);
            return;
        }

        var xhr = new XMLHttpRequest();
        xhr.open('GET', ISSUE_EPR + id, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.onload = function (e) {
            if (xhr.status === 200) {
                o = JSON.parse(xhr.responseText);
                cb(false, o);
                data[id] = o;
            } else {
                cb(true, xhr.statusText);
            }
        };
        xhr.send(null);
    };

    var recent = function (o, cb) {
        var order = (o.sort === 'asc' ? 'ASC' : 'DESC');
        searchJira({
            query: 'project = ' + o.query.project + ' ORDER BY key ' + order + ', status ' + order + ', priority ' + order,
            start: o.start,
            count: o.count
        }, cb);
    };

    var history = function (o, cb) {
        var order = (o.sort === 'asc' ? 'ASC' : 'DESC');
        searchJira({
            query: 'project = ' + o.query.project + ' ORDER BY key ' + order + ', status ' + order + ', priority ' + order,
            start: o.start,
            count: o.count
        }, cb);
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

    var searchJira = function (o, cb) {
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
            startAt: o.start || 0,
            maxResults: o.count || 10
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
        radio('jira recent result').subscribe(function (err, issues) {
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
                        radio('jira thread loaded').broadcast(false, id, thread);
                    });
                });
            });
            page.render('gmail-controls', {}, function (err, html) {
                controllers.html(html);
            });
        });
        //search request from jira
        radio('jira search').subscribe(function (err, query) {
            if (query.match(/^[\s]*[a-zA-Z0-9]+-[0-9]+[\s]*$/ig)) {
                //issue id has been searched
                var o = decode(query.trim());
                context.query = o;
                radio('page load').broadcast(false, 'jira');
                recent({
                    query: o
                }, function (err, results) {
                    var tasks = [];
                    results.issues.forEach(function (o) {
                        tasks.push(function (cb) {
                            issue(o.key, cb);
                        });
                    });
                    async.parallel(tasks, function (err, issues) {
                        context.recent = issues;
                        radio('page loaded').broadcast(false, 'jira');
                        radio('jira recent result').broadcast(err, issues);
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
                    radio('jira recent result').broadcast(false, context.recent);
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
            });
        });
    };

}());
