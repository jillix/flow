const EventEmitter = require('events');
const Node = require('./lib/node');
const Setup = require('./lib/parse');
var scope;

module.exports = Flow;

function init (options) {

    if (!options.mic || !options.mod) {
        throw new Error('Flow: No Module or MIC adapter found.');
    }

    scope = {
        flow: Flow,
        mic: options.mic,
        mod: options.mod,
        modules: options.modules || {},
        instances: options.instances || {},
        events: options.events || {},
        streams: options.cache || {},
        reset: () => {
            if (typeof options.reset === 'function') {
                options.reset.call(this);
            }
            this.cache = {};
        },
        path: (path, inst) => {

            let event = [inst, path];
            if (path.indexOf('/') > 0) {
                event = path.split('/');
            }

            event[2] = event[0] + event[1];
            return event;
        },
        get: (cache, key, emitter, cb) => {

            let item = cache[key];
            let newItem;
            if (!item) {
                newItem = true;
                item = cache[key] = new EventEmitter();
                item.on('error', console.error.bind(console));
            }

            if (item.ready) {
                process.nextTick(cb.bind(emitter, item));
            } else {
                item.once('ready', cb.bind(emitter));
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
        delete options.mic, options.mod, options.reset;
    }

    event = scope.path(event, this && this._name);

    // return if event name is missing
    if (!event[0] || !event[1]) {
        throw new Error('Flow: Emit without instance or event name.');
    }

    // return cached streams
    let stream;
    if (scope.streams[event[2]]) {
        return scope.streams[event[2]];
    }

    if (typeof options === 'function') {
        callback = options;
        options = {};
    }

    stream = Node(scope, event[2]);

    // parse event and setup streams
    Setup(scope, stream, event, options);

    scope.streams[event[2]] = stream;

    // flow callback
    if (typeof callback === 'function') {
        concatStream(stream, callback);
    }

    return stream;
}

// TODO concat buffers
function concatStream (stream, callback) {
    let body = '';
    let error;

    stream.on('data', (chunk) => {
        body += chunk;
    })
    .on('error', (err) => {
        error = err;
        body = undefined;
    })
    .on('end', () => {
        callback(error, body);
    });
}
