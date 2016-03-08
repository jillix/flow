var Stream = require('./stream');
var Load = require('./load');
var Parse = require('./parse');

module.exports = function Link (scope, event, options) {

    var stream = Stream.Pass();

    // buffer writes until event stream is setup
    stream.cork();
    stream.on('_flow_err', stream.emit.bind(stream, 'error'));

    // load instance, parse event and get flow stream sequences
    Load(scope, stream, event[0], options).once('_flow_load', function (instance) {

        console.log('flow load:', instance);

        Parse(scope, stream, instance, event[1], options).once('_flow_event', function (sequence) {

            console.log('flow event:', sequence);

            // ..seq
            //sequence.s.forEach(this.emit.bind(this, '_flow_seq', instance));
            //this.emit('_flow_end', instance);
            sequence.s.forEach(function (sequence) {
                console.log('LINK SEQUENCE:', sequence);
                // TODO

                var seqStream = new Stream.Event();

                // append sequence
                if (sequence.s) {
                    seqStream.seq = sequence;
                }

                // callstream handler: sequence.p
                var stream_handler = typeof sequence.p[1] === 'string' ? sequence.p[0].flow(sequence.p[1]) : sequence.p[1].call(sequence.p[0]);

                // ..link streams
                stream = stream.pipe(seqStream).pipe(stream_handler);
            });

            console.log('LINK SEQ END');

            //stream.pipe(stream);
            stream.emit('ready');
            stream.uncork(); 
        });
    });

    return stream; 
}

function linkSequence (stream) {

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
    */
