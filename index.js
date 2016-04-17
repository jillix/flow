var EventEmitter = require('events');
var Node = require('./lib/node');
var Load = require('./lib/load');
var Parse = require('./lib/parse');

var scope;

module.exports = Flow;

/* Cache data structure: {
    instance: {
        inst: {}, 
        ready: true,
        parsed: {
            event: {
                d: [
                    [sequence]
                ],
                e: ["instance/end", {}],
                r: ["instance/error", {}],
                s: []
            }
        }
    }
}*/
function init (options) {

    if (!options.mic || !options.mod) {
        throw new Error('Flow: No module or composition mehtods found.');
    }

    scope = {
        flow: Flow,
        mic: options.mic,
        mod: options.mod,
        modules: options.modules || {},
        cache: options.cache || {},
        events: options.events || {},
        streams: options.cache || {},
        reset: function () {
            if (typeof options.reset === 'function') {
                options.reset.call(this);
            }
            this.cache = {};
        },
        path: function parsePath (path, inst) {

            if (path.indexOf('/') > 0) {
                return path.split('/');
            }

            return [inst, path];
        },
        get: function (cache, key, emitter, cb) {

            var item = cache[key];
            var newItem;
            if (!item) {
                newItem = true;
                item = cache[key] = new EventEmitter();
            }

            if (item.ready) {
                cb && process.nextTick(cb.bind(emitter, item));
            } else {
                cb && item.once('ready', cb.bind(emitter));
                item.once('error', console.error.bind(console, 'Flow.get:'));
            }

            return !!newItem;
        }

    };
}

function Flow (event, options, callback) {
    options = options || {};

    // init flow on first call
    if (!scope) {
        init(options);
    }

    event = scope.path(event, this && this._name);

    // return if event name is missing
    if (!event[0] || !event[1]) {
        throw new Error('Flow: Emit without instance or event name.');
    }

    // return cached streams
    var stream, key = event[0] + event[1];
    if (scope.streams[key]) {
        return scope.streams[key];
    }

    if (typeof options === 'function') {
        callback = options;
        options = {};
    }

    //stream = Link(scope, key, event, options);
    stream = Node(scope, key);

    // parse event and setup streams
    Parse(scope, stream, key, event[0], event[1], options, stream.link.bind(stream, options));

    scope.streams[key] = stream;

    // flow callback
    if (typeof callback === 'function') {
        concatStream(stream, callback);
    }

    return stream;
}

// TODO concat buffers
function concatStream (stream, callback) {
    var body = '';
    var error;

    stream.on('data', function (chunk) {
        body += chunk;
    })
    .on('error', function (err) {
        error = err;
        body = undefined;
    })
    .on('end', function () {
        callback(error, body);
    });
}
