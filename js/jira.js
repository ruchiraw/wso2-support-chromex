var jira = {};

(function () {

    var data = {};

    var URL = (jira.URL = 'https://support.wso2.com');

    var SEARCH_EPR = URL + '/jira/rest/api/2.0.alpha1/search';

    var ISSUE_EPR = URL + '/jira/rest/api/2.0.alpha1/issue/';

    var url = function (path) {
        return URL + path;
    };

    var issue = function (id, cb) {
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

    jira.init = function(content, tools, controllers) {

    };

}());
