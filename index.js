var Link = require('./lib/link');
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
        cache: options.cache || {},
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
        get: function (item, emitter, event) {

            if (item.ready) {
                process.nextTick(emitter.emit.bind(emitter, '_flow_' + event, item));
                return true;
            }

            item.once('ready', emitter.emit.bind(emitter, '_flow_' + event, item));
            item.once('error', console.error.bind(console, 'Flow.' + event + ':'));

            return;
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

    if (typeof options === 'function') {
        callback = options;
        options = {};
    }

    var stream = Link(scope, event, options);

    // flow callback
    if (typeof callback === 'function') {
        concatStream(stream, callback);
    }

    return stream;
}

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
