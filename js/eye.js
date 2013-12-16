var eye = {};

(function () {

    eye.init = function (content, tools) {
        //page change event
        radio('page change').subscribe(function (err, id) {
            if (id !== 'eye') {
                return;
            }
            page.render('eye', {}, function (err, html) {
                content.html(html);
                $('.pager', content).on('click', '.btn', function (e) {
                    $(this).toggleClass('active');
                });

                $('.search .query', content).keydown(function (e) {
                    if (e.keyCode == 13) {
                        e.preventDefault();
                        var query = $(this).val();
                        radio('eye search').broadcast(false, query);
                    }
                });

            });
        });
    };
}());