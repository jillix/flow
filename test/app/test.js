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

module.exports = function createTest (event) {
    return function (test) {
        var options = {
            test: test,
            data: {test: true},
            options: {test: true},
            modified: {test: true},
        };

        if (first) {
            options.mic = adapter.mic;
            options.mod = adapter.mod;
            first = false;
        }

        var stream = Flow(event, options);

        stream.on('error', function (error) {
            test.error(error);
        });

        stream.on('data', function (data) {
            console.log('User data:', data);
            test.match(data, options.modified);
        });

        stream.on('end', function () {
            console.log('User end: true');
            test.end();
        });

        stream.write({test: true});
        
        stream.end({test: true});
    };
};
