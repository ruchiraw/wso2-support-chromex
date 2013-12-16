

$(function () {

    var ISSUE_PREFIX = jira.URL + '/jira/browse/';

    var decodeUrl = function (url) {
        var key = url.substring(ISSUE_PREFIX.length);
        var index = key.lastIndexOf('-');
        return {
            key: key,
            project: key.substring(0, index),
            id: key.substring(index + 1)
        };
    };

    $('.tools').on('click', '.btn', function (e) {
        $('.tools').find('.btn').removeClass('active');
        var id = $(this).addClass('active').data('id');

        var tools = $('.content-tools');
        tools.find('.content').removeClass('active').hide();
        tools.find('.' + id).addClass('active').show();

        var contents = $('.contents');
        contents.find('.content').removeClass('active').hide();
        contents.find('.' + id).addClass('active').show();
    });

    chrome.tabs.query({
        active: true
    }, function (tabs) {
        var tab = tabs[0];
        if (tab.url.indexOf(ISSUE_PREFIX) === 0) {
            var o = decodeUrl(tab.url);
            /*environment(o, function (err, env) {
             alert(env);
             });*/
            /*versions(o, function (err, o) {
             render('versions', o, function (err, html) {
             $('#products').html(html);
             $('.product-badges .badge').popover({
             placement: 'auto',
             trigger: 'manual'
             });
             $('.product-badges').on('click', '.badge', function (e) {
             $('.product-badges .badge').popover('destroy');
             $(this).popover({
             placement: 'auto',
             trigger: 'manual',
             html: true
             });
             $(this).popover('show');
             e.stopPropagation();
             });
             });
             $(document).click(function (e) {
             $('.product-badges .badge').popover('destroy');
             });
             });*/

            mails.init($('.contents .gmail'), $('.content-tools .gmail'));
            eye.init($('.contents .eye'), $('.content-tools .eye'));

            /*recent({
             query: o
             }, function (err, results) {
             if (err) {
             return;
             }
             var tasks = [];
             results.issues.forEach(function (o) {
             tasks.push(function (cb) {
             issue(o.key, cb);
             });
             });
             async.parallel(tasks, function (err, issues) {
             render('jiras', issues, function (err, html) {
             $('#history').html(html);
             });
             });
             }); */
            $('.container').show();
        }
    });

});