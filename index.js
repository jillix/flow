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
        var netOptions = {objectMode: true};
        var inStream = Stream.Net(netOptions);
        var outStream = Stream.Net(netOptions);

        CoreInst.net({i: inStream, o: outStream}, options);

        if (inStream._readableState.ended) {
            outStream.on('data', inStream.push.bind(inStream));
        }

        // flow callback
        if (typeof callback === 'function') {
            concatStream(outStream, callback);
        }

        return inStream;
    }

    // create new event stream
    var eventStream = Stream.Event(options);
    eventStream.cork();

    // load or get instance
    CoreInst.load(options.to, options.session, function (err, instance) {
        delete options.to;

        if (err) {
            return eventStream.emit('error', err);
        }

        // link event handler to event stream
        getEvent(instance, options, function (err, flowEvent) {
            delete options.emit;

            if (err) {
                return eventStream.emit('error', err);
            }

            // setup sub streams (sequences)
            var lastSeq;
            if (flowEvent.d) {
                lastSeq = linkStreams(instance, eventStream, flowEvent, options);
            }

            // end handler
            if (flowEvent.e) {
                (lastSeq || eventStream).on('end', function () {
                    if (!this._errEmit) {
                        instance.flow(flowEvent.e).end(true);
                    }
                });
            }

            // flow callback
            if (typeof callback === 'function') {
                concatStream(lastSeq || eventStream, callback);
            }

            eventStream.emit('sequence');
            eventStream.uncork();
        });
    });

    return eventStream;
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

function linkStreams (instance, eventStream, flowEvent, options) {

    var sections = flowEvent.d;
    eventStream.seq = sections[0][0];

    var count = 0;
    var errEvent = flowEvent.r ? instance.flow(flowEvent.r) : undefined;
    var input = eventStream;
    var handleError = function (err) {

        // write error to error event
        if (errEvent) {
            return errEvent.end(err);
        }

        // TODO option to end stream

        // log error in console
        console.error(err);
    };

    sections.forEach(function (section, index) {

        if (index === 0) {
            return;
        }

        if (!section[1]) {
            return;
        }

        var shOptions = Object.assign({}, section[1][1][1]);

        // create a new sub-stream to call handlers
        var output = Stream.Event(options);
        output.seq = section[0];
        output.on('error', handleError);

        // tee streams
        if (section[1][0] === '|') {
            input.pipe(output);
        }

        if (typeof section[1][1][0] === 'string') {
            var fes = instance.flow(section[1][1][0], shOptions)
            fes.on('error', handleError);
            input.pipe(fes).pipe(output);
        } else {
            Object.assign(shOptions, options);
            section[1][1][0].call(
                section[1][1][2],
                {i: input, o: output},
                shOptions,
                handleError
            );
        }

        // overwrite previous stream
        input = output;
    });

    // bypass data handler and push directly to readable
    if (sections.length && eventStream._readableState.ended) {
        input.on('data', eventStream.push.bind(eventStream));
    }

    return input;
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
