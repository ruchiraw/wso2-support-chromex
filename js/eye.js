var eye = {};

(function () {

    var initialized = false;

    eye.init = function (content, tools, controllers, o, options) {
        var initialize = function () {
            if (!initialized) {
                initialized = true;
                render('eye-controls', {}, function (err, html) {
                    controllers.html(html);
                    $('.load-project-info', controllers).click(function (e) {
                        radio('page load').broadcast(false, 'eye');
                        radio('jira project info').broadcast(false, o.issue.project);
                    });
                });
                render('eye', options, function (err, html) {
                    content.html(html);
                    $('.pager', content).on('click', '.btn', function (e) {
                        $(this).toggleClass('active');
                    });

                    $('.search .query', content).keydown(function (e) {
                        if (e.keyCode == 13) {
                            e.preventDefault();
                            var query = $(this).val();
                            var buttons = $('.filters .btn.active', content);
                            var filters = [];
                            buttons.each(function () {
                                filters.push($(this).data('id'));
                            });
                            radio('eye search').broadcast(false, query, filters);
                        }
                    });
                    if (options.eye.project) {
                        radio('page load').broadcast(false, 'eye');
                        radio('jira project info').broadcast(false, o.issue.project);
                        $('.load-project-info', controllers).hide();
                    }
                });
            }
        };
        //page change event
        radio('page change').subscribe(function (err, id) {
            if (id !== 'eye') {
                return;
            }
            initialize();
        });

        radio('jira project info loaded').subscribe(function (err, id, result) {
            radio('page loaded').broadcast(false, 'eye');
            result.description = result.description.replace(/^\s*<br\/?>/i, '');
            render('eye-project-info', result, function (err, html) {
                $('.project-info', content).html(html);
                content.perfectScrollbar('destroy').scrollTop(0).perfectScrollbar({
                    suppressScrollX: true,
                    minScrollbarLength: 40,
                    wheelSpeed: 40
                });
                $('.load-project-info', controllers).hide();
            });
        });
    };
}());