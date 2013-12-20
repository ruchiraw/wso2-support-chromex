var hiliter = {};
(function () {
    //TODO: separate this into a hiliter.js lib
    hiliter.search = function (key, content) {
        console.log(key);
        var pattern = '(' + key.replace('(', '\\(').replace(')', '\\)').split(/\s+/).join(")\\s*(<\\/?\\w+((\\s+\\w+(\\s*=\\s*(?:\\\".*?\"|'.*?'|[^'\\\">\\s]+))?)+\\s*|\\s*)\\/?>)*\\s*(") + ')';
        console.log(pattern);
        return content.replace(new RegExp(pattern, 'gi'), '<span class="hiliter">$&</span>');
    };
}());