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
                if (err instanceof Error || (err && data === undefined)) {
                    err._ = chunk;
                    return next(err);
                }

                // get handler
                if (!(handler = sequence[++pos])) {

                    // just push to next stream,
                    // if there are no more handlers
                    if (err && data === true) {
                        return seq.push(err);
                    }

                    return next(null, data);
                }

                // reset handler position on push
                if (err && data === true) {
                    --pos;
                    data = err;
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
                    handler[0][1].call(handler[0][0], options, data, runSeq);
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
