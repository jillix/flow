const EventEmitter = require('events');
const Node = require('./lib/node');
const Setup = require('./lib/parse');

module.exports = (options) => {

    if (!options.read || !options.mod) {
        throw new Error('Flow: No Module or MIC adapter found.');
    }

    let scope = {
        env: options.env,
        read: options.read,
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
        /*path: (path, inst) => {

            let event = [inst, path];
            if (path.indexOf('/') > 0) {
                event = path.split('/');
            }

            event_id = event[0] + event[1];
            return event;
        },*/
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

    scope.flow = Flow.bind(null, scope);
    return scope.flow;
};

function Flow (scope, instance, event, options, callback) {
    options = options || {};

    // return if event name is missing
    if (!instance || !event) {
        throw new Error('Flow: Emit without instance or event name.');
    }

    let event_id = instance + event;//scope.path(event, instance);

    // return cached streams
    let stream;
    if (scope.streams[event_id]) {
        return scope.streams[event_id];
    }

    if (typeof options === 'function') {
        callback = options;
        options = {};
    }

    stream = Node(scope, event_id);

    // parse event and setup streams
    Setup(scope, stream, instance, event, event_id, options);

    scope.streams[event_id] = stream;

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
