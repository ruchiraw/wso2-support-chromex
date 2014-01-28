var render;

(function () {
    var contexts = {};

    var s4 = function () {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    };

    var guid = function () {
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
    };

    render = function (path, data, cb) {
        var req = new XMLHttpRequest();
        req.open('GET', chrome.extension.getURL('templates/' + path + '.hbs'), true);
        req.onload = function () {
            if (req.status === 200) {
                var id = guid();
                var iframe = document.getElementById('sandbox');
                iframe.contentWindow.postMessage({
                    id: id,
                    source: req.responseText,
                    data: data
                }, '*');
                contexts[id] = cb;
            } else {
                cb(true);
            }
        };
        req.send(null);
    };

    window.addEventListener('message', function (event) {
        var cb = contexts[event.data.id];
        if (event.data.error) {
            cb(true);
            return;
        }
        cb(false, event.data.html);
    });
}());