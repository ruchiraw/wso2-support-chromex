var hiliter = {};
(function () {
    //TODO: separate this into a hiliter.js lib
    /*    hiliter.search = function (key, content) {
     //console.log(key);
     //content = content.replace(/<wbr>/ig, '');
     var p_html = "(<\\/?\\w+((\\s+\\w+(\\s*=\\s*(?:\\\".*?\"|'.*?'|[^'\\\">\\s]+))?)+\\s*|\\s*)\\/?>)+";
     var pat = "\\s*(<\\/?\\w+((\\s+\\w+(\\s*=\\s*(?:\\\".*?\"|'.*?'|[^'\\\">\\s]+))?)+\\s*|\\s*)\\/?>)*\\s*";
     //pat = '=';
     var pattern = key;
     pattern = pattern.replace(new RegExp(p_html, 'gi'), '');
     pattern = pattern.replace(/\s+/, ' ');
     //console.log(pattern);
     pattern = pattern.replace(/\(/ig, '\\(').replace(/\)/ig, '\\)');
     //console.log(pattern);
     var debug = pattern;
     pattern = pattern.replace(/((\\\()|(\\\)))|[^A-Za-z0-9_]/ig, ')' + pat + '($&)' + pat + '(');
     console.log('(' + debug.replace(/((\\\()|(\\\)))|[^A-Za-z0-9_]/ig, ')' + '-' + '($&)' + '-' + '(') + ')');
     //console.log(pattern);
     pattern = '(' + pattern + ')';
     //pattern = pattern.substring(0, pattern.length - 3);
     console.log(pattern);
     console.log(content);
     console.log(content.replace(new RegExp(pattern, 'gi'), '<span class="hiliter">$&</span>'));
     return content.replace(new RegExp(pattern, 'gi'), '<span class="hiliter">$&</span>');
     }; */

    hiliter.search = function (key, content, css) {
        (key = (key.replace(/^'(.*)'$|^"(.*)"$/ig,'$1$2').replace(/(<\/?\w+((\s+\w+(\s*=\s*(?:".*?"|'.*?'|[^'">\s]+))?)+\s*|\s*)\/?>)+/ig, '').replace(/\(/ig, '\\(').replace(/\)/ig, '\\)').replace(/\./ig, '\\.') + ' ').split(/\W+/)).pop();
        return content.replace(new RegExp('\\b((' + key.join(')|(') + '))\\b', 'gi'), '<span class="hiliter' + (css ? (' ' + css) : '') + '">$&</span>');
    };
}());