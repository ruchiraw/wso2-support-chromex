var eye = {};

(function () {

    eye.init = function (content, tools, controllers, o) {
        //page change event
        radio('page change').subscribe(function (err, id) {
            if (id !== 'eye') {
                return;
            }

            radio('jira project info').broadcast(false, o.issue.project);

            page.render('eye', {}, function (err, html) {
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

            });

            radio('page load').broadcast(false, 'eye');
        });

        radio('jira project info loaded').subscribe(function (err, id, result) {
            radio('page loaded').broadcast(false, 'eye');
            result.description = result.description.replace(/^\s*<br\/?>/i, '');
            page.render('eye-project-info', result, function (err, html) {
                $('.project-info', content).html(html);
                content.perfectScrollbar('destroy').scrollTop(0).perfectScrollbar({
                    suppressScrollX: true,
                    minScrollbarLength: 40,
                    wheelSpeed: 40
                });
            });
        });
    };
}());