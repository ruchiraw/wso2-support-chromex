var products;

(function () {
    var dictionary = {
        a: {
            s: {
                '': 'as'
            }
        },
        b: {
            a: {
                m: {
                    '': 'bam'
                }
            }
        },
        c: {
            a: {
                r: {
                    b: {
                        o: {
                            n: {
                                '': 'carbon'
                            }
                        }
                    }
                }
            }
        },
        e: {
            s: {
                '': 'es',
                b: {
                    '': 'esb'
                }
            }
        },
        j: {
            a: {
                v: {
                    a: {
                        '': 'jdk'
                    }
                }
            },
            d: {
                k: {
                    '': 'jdk'
                }
            }
        }
    };

    products = function (text) {
        var start;
        var last = 0;
        var content = '';
        var p = [];

        var delim = function (ch) {
            return (ch === ' ' || ch === '\n' || ch === '\t' || ch === '\r');
        };

        var skip = function (text, index) {
            var ch;
            while (ch = text.charAt(index++)) {
                if (!delim(ch)) {
                    index--;
                    break;
                }
            }
            return index;
        };

        var iterate = function (dic, text, index) {
            if (text.length < index) {
                content += text.substring(last, text.length);
                return;
            }
            var ch = text.charAt(index++).toLowerCase();
            //text = text.substring(1);
            var o = dic[ch];
            if (o) {
                start = start || index - 1;
            } else {
                var code = dic[''];
                if (code) {
                    //need to check version
                    index = skip(text, index);
                    var v = '';
                    while (ch = text.charCodeAt(index++)) {
                        if (ch == 46) {
                            //.
                            v += '.';
                        } else if (48 <= ch && ch <= 57) {
                            //number
                            v += String.fromCharCode(ch);
                        } else {
                            //version end or none found
                            //this is to fix versions which has specified a sentense end period.
                            v = (v.charAt(v.length - 1) === '.') ? v.substring(0, v.length - 1) : v;
                            var l = v.split('.');
                            if (1 < l.length && l.length < 4) {
                                var key = code.toUpperCase() + ' ' + v;
                                if (p.indexOf(key) === -1) {
                                    p.push(key);
                                }
                                content += text.substring(last, start) + '<span class=\'product-code\'>' + text.substring(start, index - 1) + '</span>';
                                last = index - 1;
                            }
                            break;
                        }
                    }
                }
                index = skip(text, index);
                o = dictionary;
                start = null;
            }
            iterate(o, text, index);
        };

        iterate(dictionary, ' ' + text + ' ', 0);

        return {
            products: p,
            content: content
        };
    };
}());