var Stream = require('stream');

module.exports = function Sequence (options, sequence) {

    options = options || {};

    var seq = Stream.Transform({
        objectMode: typeof options.objectMode === 'undefined' ? true : !!options.objectMode,
        transform: function (chunk, enc, next) {

            var pos = -1;
            var handler;
            var runSeq = function (err, data) {

                // emit error
                if (err instanceof Error) {
                    err.chunk = chunk;
                    return next(err);
                }

                // just push data to readable if data and error is true
                if (err && data === true) {
                    return seq.push(err);
                }

                // get handler
                if (!(handler = sequence[++pos])) {
                    return next(null, data);
                }

                // call next data handler
                if (!handler[4]) {

                    // once handler
                    if (handler[3]) {
                        handler[4] = true;
                    }

                    // attach flow composition options to caller arguments
                    options._ = handler[1];

                    // call data handler
                    handler[0].call(handler[2], options, data, runSeq);
                } else {
                    runSeq(null, data);
                }
            };

            if (!sequence) {
                return next(null, chunk);
            }

            runSeq(null, chunk);
        }
    });

    return seq;
};
