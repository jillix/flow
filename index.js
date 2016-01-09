"use strict";

var Stream = require('./lib/stream');
var Instance = require('./lib/instance');
var parseEvent = require('./lib/parse');
var CoreInst;
var requiredAdapterMethods = ['module', 'composition', 'net'];

// set adapter api object (singleton)
module.exports = function (adapter) {

    if (CoreInst) {
        return CoreInst;
    }

    // check if adapter has all the required methods.
    requiredAdapterMethods.forEach(function (key) {
        if (typeof adapter[key] !== 'function') {
            throw new Error('Flow: "adapter.' + key + '" is not a function.');
        }
    });

    // create core instance
    CoreInst = factory(adapter);

    CoreInst.load = Instance.factory;
    CoreInst.factory = factory;
    CoreInst._name = '@';
    CoreInst._roles = {'*': true};
    CoreInst._ready = true;
    CoreInst._events = {};
    CoreInst._reset = Instance.reset;

    // save core instance in instances cache
    Instance.instances[CoreInst._name] = CoreInst;

    // init event parser with core instance
    parseEvent = parseEvent(CoreInst);

    return CoreInst;
};

// flow factory
function factory (object) {

    var clone = Object.create(object);
    clone.flow = emit;
    clone._flow = clone._flow || {};
    return clone;
}

function emit (eventName,  options, callback) {

    /*
        this.flow(flowEvent, {
            emit: 'event',
            to: 'instance',
            end: function () {}
            session: {}
        });
    */

    options = typeof options === 'function' ? {end: options} : options || {};
    options.emit = eventName;

    if (typeof options.end === 'function') {
        callback = options.end;
        delete options.end;
    }

    // return if event name is missing
    if (!options.emit) {
        throw new Error('Flow call without event name.');
    }

    options.session = options.session || {};
    options.to = options.to || this._name;

    // if request handler request call like a stream handler
    if (options.net) {
        var netStream = CoreInst.net(this, options);

        // flow callback
        if (typeof callback === 'function') {
            concatStream(netStream.o, callback);
        }

        return netStream;
    }

    // create new event stream
    var initial = {
        i: Stream.Pass(),
        o: Stream.Pass()
    };
    initial.i.cork();

    // load or get instance
    CoreInst.load(options.to, options.session, function (err, instance) {

        if (err) {
            return initial.o.emit('error', err);
        }

        // link event handler to event stream
        getEvent(instance, options, function (err, flowEvent) {

            if (err) {
                return initial.o.emit('error', err);
            }

            // setup sub streams (sequences)
            if (flowEvent.d) {
                linkStreams(instance, initial, flowEvent, options);
            }

            // end handler
            if (flowEvent.e) {
                initial.o.on('end', function () {
                    if (!initial.i._errEH) {
                        instance.flow(flowEvent.e[0], flowEvent.e[1]).i.on('ready', function () {
                            endEvent.i.end(options);
                        });
                    }
                });
            }

            // flow callback
            if (typeof callback === 'function') {
                concatStream(initial.o, callback);
            }

            initial.i.emit('ready');
            initial.ready = true;
            initial.i.uncork();
        });
    });

    return initial;
};

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

function linkStreams (instance, initial, flowEvent, options) {

    var input = initial.i;
    var first = true;
    var errEvent;
    var handleError = function (err) {

        // emit error on origin ouput stream
        initial.o.emit('error', err);

        // write error to error event
        if (flowEvent.r) {
            errEvent = errEvent || instance.flow(flowEvent.r[0], flowEvent.r[1]);
            if (errEvent.ready) {
                errEvent.i.write(err);
            } else {
                errEvent.i.on('ready', function () {
                    errEvent.i.write(err);
                });
            }

            // end error stream on initial end
            initial.o.on('end', errEvent.i.end.bind(errEvent));
        }

        // TODO keep streams piped
        // https://github.com/nodejs/node/issues/3045#issuecomment-142975237
    };

    // emit error event on initial error
    initial.i.on('error', handleError);

    flowEvent.d.forEach(function (section, index) {

        // create a new sub-stream to call handlers
        var output = Stream.Event(options);
        output.seq = section[0];
        output.on('error', handleError);

        // tee streams
        if (section[1] && section[1][0] === '|' || first) {
            input.pipe(output);
            first = false;
        }

        // pipe to next stream
        if (section[1]) {

            var shOptions = Object.assign({}, section[1][1][1]);
            shOptions.arg = options;
            shOptions.session = options.session || {};

            if (typeof section[1][1][0] === 'string') {
                var fes = instance.flow(section[1][1][0], shOptions);
                input.pipe(fes.i);
                fes.o.on('error', output.emit.bind(output, 'error'));
                fes.o.pipe(output);

            } else if (typeof section[1][1][0] === 'function') {
                section[1][1][0].call(
                    section[1][1][2],
                    {i: input, o: output},
                    shOptions,
                    handleError
                );
            }
        }

        // event stream sequence handler is the new input
        input = output;
    });

    input.pipe(initial.o);

    // read out data if no data listener is added, to prevent buffer overflow
    if (!initial.o._events.data) {
        initial.o.on('data', function (chunk) {
            console.error(new Error('Flow: Uncaught data chunk: Event: ', options.emit));
        });
    }
}

var cbBuffer = {};
function getEvent (instance, options, callback) {

    // return cached event
    if (instance._events[options.emit]) {
        return callback(null, instance._events[options.emit]);
    }

    // buffer callback
    if (cbBuffer[options.emit]) {
        return cbBuffer[options.emit].push(callback);
    }

    // check if event is configured
    if (!instance._flow[options.emit]) {
        return callback(new Error('Flow.getEvent: Event "' + options.emit + '" not found on instance "' + instance._name+ '".'));
    }

    // collect all handlers for specific flow event
    cbBuffer[options.emit] = [];
    parseEvent(instance, options, function (err, event) {
        
        if (!err) {

            // cache event
            instance._events[options.emit] = event;
        }

        callback(err, event);

        // call buffered callbacks
        if (cbBuffer[options.emit]) {
            cbBuffer[options.emit].forEach(function (cb) {
                cb(err, event);
            });
            delete cbBuffer[options.emit];
        }
    });
}
