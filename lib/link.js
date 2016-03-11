var Stream = require('./stream');
var Load = require('./load');
var Parse = require('./parse');

module.exports = function Link (scope, event, options) {

    var node = Stream.Node(options);

    // load instance, parse event and get flow stream sequences
    Load(scope, node, event[0], options).once('_flow_load', function (instance) {
        Parse(scope, node, instance, event[1], options).once('_flow_event', function (event) {

            var seq, link, first; 
            event.s.forEach(function (sequence) {

                if (sequence.s) {
                    seq = Stream.Seq(options, sequence.s);
                    seq.on('error', node.emit.bind(node, 'error'));
                }

                if (sequence.p) {

                    // pipe to flow event
                    if (typeof sequence.p[1] === 'string') {
                        link = sequence.p[0].flow(sequence.p[1], options);

                    // call stream handler
                    } else {
                        options._ = sequence.a || {};
                        link = sequence.p[1].call(sequence.p[0], options);
                    }

                    link.on('error', node.emit.bind(node, 'error'));
                    seq = seq ? seq.pipe(link) : link;
                }

                if (!first) {
                    first = seq;
                }
            });

            // TODO end even
            // TODO error event

            // set sequence on node
            node.link(first);
        });
    });

    return node;
}

/*
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

// read out data if no data listener is added, to prevent buffer overflow
if (!initial.o._events.data) {
    initial.o.on('data', function (chunk) {
        console.error(new Error('Flow: Uncaught data chunk: Event:',instance._name + '/' + event));
    });
}
*/
