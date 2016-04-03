var Flow = require('../../index');
var compositions = './composition/';
var modules = './modules/';
var adapter =  {
    mic: function (name, callback) {
        callback(null, require(compositions + name + '.json'));
    },
    mod: function (name, callback) {
        callback(null, require(modules + name));
    }
};
var first = true;

function UID (len) {
    len = len || 23;
    for (var i = 0, random = ''; i < len; ++i) {
        random += '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'[0 | Math.random() * 62];
    }
    return random;
};

module.exports = function createTest (event) {
    return function (test) {
        var chunk = UID();
        var options = {
            tapTest: test,
            validate: chunk,
            transform: UID(),
            streamValidate: 42
        };

        if (first) {
            options.mic = adapter.mic;
            options.mod = adapter.mod;
            first = false;
        }

        var stream = Flow(event, options);

        stream.on('data', function (chunk) {
            console.log('TEST "' + event + '" Chunk:', chunk);

            // test if data chunk was transformed
            if (typeof chunk === 'string') {
                test.match(chunk, options.validate);
            }
        });

        stream.on('end', function (chunk) {
            console.log('TEST "' + event + '" End:', chunk);
            test.end();
        });

        // TODO errors
        stream.on('error', function (error) {
            console.log('TEST "' + event + '" Error:', error);
            //test.error(error);
        });

        // 2writes + 2test per write = 4 tests
        stream.write(chunk);
        stream.end(chunk);
    };
};
