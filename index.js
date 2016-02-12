"use strict";

var Stream = require('./lib/stream');
var Instance = require('./lib/instance');
var Parse = require('./lib/parse');
var requiredAdapterMethods = ['mod', 'mic'];
var Flow;

// create flow controller api object (singleton)
module.exports = function (config, adapter) {

    if (!adapter) {
        adapter = config;
        config = {};
    }

    Flow = {
        flow: emit,
        load: Instance.factory,
        reset: function () {
            Instance.reset();

            // call custom reset method
            if (typeof this._reset === 'function') {
                this._reset.apply(this, Array.apply(null, arguments));
            }
        },
        config: config,
        _parse: Parse.event
    };

    // check if adapter has all the required methods.
    requiredAdapterMethods.forEach(function (key) {

        // check adapter methods
        if (typeof adapter[key] !== 'function') {
            throw new Error('Flow: "adapter.' + key + '" is not a function.');
        }

        // extend flow controller with adapter methods
        Flow[key] = adapter[key];
    });

    return (module.exports = Flow);
};

// create a new flow event stream
function emit (event, options, callback) {

    var instance = this._name;
    if (event.indexOf('/') > 0) {
        event = event.split('/');
        instance = event[0];
        event = event[1];
    }

    if (typeof options === 'function') {
        callback = options;
        options = {};
    }

    // return if event name is missing
    if (!event) {
        throw new Error('Flow call without event name.');
    }

    options = options || {};
    var session = options.session || {};

    // create new event stream
    var initial = {
        i: Stream.Pass(),
        o: Stream.Pass()
    };
    initial.i.cork();

    // load or get instance
    Flow.load(instance, session, function (err, instance) {

        if (err) {
            return initial.o.emit('error', err);
        }

        // link event handler to event stream
        getEvent(instance, event, session, function (err, event_stream) {

            if (err) {
                return initial.o.emit('error', err);
            }

            // setup sub streams (sequences)
            if (event_stream.d) {
                linkStreams(instance, event, initial, event_stream, options);
            }

            // end handler
            if (event_stream.e) {
                initial.o.on('end', function () {
                    if (!initial.i._errEH) {
                        instance.flow(event_stream.e, options).i.on('ready', function () {
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

function linkStreams (instance, event, initial, event_stream, options) {

    var input = initial.i;
    var first = true;
    var errEvent;
    var handleError = function (err) {

        // emit error on origin ouput stream
        initial.o.emit('error', err);

        // write error to error event
        if (event_stream.r) {
            errEvent = errEvent || instance.flow(event_stream.r, options);
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

    event_stream.d.forEach(function (section, index) {

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

            if (typeof section[1][1] === 'string') {
                var fes = instance.flow(section[1][1], options);
                input.pipe(fes.i);
                fes.o.on('error', output.emit.bind(output, 'error'));
                fes.o.pipe(output);

            } else if (typeof section[1][1][0] === 'function') {

                // attach flow composition options to caller arguments
                options._ = section[1][1][1] || {};

                // call stream handler
                section[1][1][0].call(
                    section[1][1][2],
                    {i: input, o: output},
                    options,
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
            console.error(new Error('Flow: Uncaught data chunk: Event:',instance._name + '/' + event));
        });
    }
}

var cbBuffer = {};
function getEvent (instance, event, session, callback) {

    // return cached event
    if (instance._events[event]) {
        return callback(null, instance._events[event]);
    }

    // buffer callback
    if (cbBuffer[event]) {
        return cbBuffer[event].push(callback);
    }

    // check if event is configured
    if (!instance._flow[event]) {
        return callback(new Error('Flow.getEvent: Event "' + event + '" not found on instance "' + instance._name+ '".'));
    }

    // collect all handlers for specific flow event
    cbBuffer[event] = [];
    Flow._parse(instance, event, session, function (err, event_stream) {
        
        if (!err) {

            // cache event
            instance._events[event] = event_stream;
        }

        callback(err, event_stream);

        // call buffered callbacks
        if (cbBuffer[event]) {
            cbBuffer[event].forEach(function (cb) {
                cb(err, event_stream);
            });
            delete cbBuffer[event];
        }
    });
}
