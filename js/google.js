var google = {};

(function () {

    var ENDPOINT = 'https://www.google.com/search?q=';

    google.init = function (content, tools, controllers, o) {
        //search request from the eye
        radio('eye search').subscribe(function (err, query, filters) {
            if (filters.indexOf('google') === -1) {
                return;
            }
            query = query.trim();
            if (query.charAt(0) === '"' && query.charAt(query.length - 1) === '"') {
                query = query.substring(1, query.length - 1);
            }
            //create a new tab
            chrome.tabs.create({
                url: ENDPOINT + query,
                active: false,
                index: o.tab.index + 1
            });
        });
    };
}());