var Stream = require('stream');

exports.Node = function (options) {

    var node = Stream.Transform({
        objectMode: objectMode(options),
        transform: function (chunk, enc, next) {
            if (node.seq) {
                if (!node.seq.write(chunk)) {
                    node.cork();
                } else {
                    next();
                }
            } else {
                node.chunks.push(chunk);
                next();
            }
        }
    });

    node.chunks = [];
    node.link = function (seq) {
        node.seq = seq;

        seq.on('data', function (chunk) {
            if (node.ended) {
                node.emit('data', chunk);
            } else {
                node.push(chunk);
            }
        });

        seq.on('drain', node.uncork.bind(node));

        // write chunks to seq if node has ended already
        if (node.ended) {
            node.chunks.forEach(seq.write.bind(seq));
            node.chunks = [];
        }

        node.uncork();
    };

    node.cork();
    node.on('end', function () {
        node.ended = true;
    });

    return node;
};

exports.Seq = function (options, sequence) {

    var seq = Stream.Transform({
        objectMode: objectMode(options),
        transform: function (chunk, enc, next) {

            var push;
            var pos = -1;
            var handler;
            var runSeq = function (err, data) {

                if (err && data) {
                    data = err;
                    err = null;
                    push = true;
                } else {
                    push = false;
                }

                // emit error
                if (err) {
                    return next(err);
                };

                // just push data to readable if data and error is true
                if (push) {
                    return seq.push(data);
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

            runSeq(null, chunk);
        }
    });

    return seq;
};

function objectMode (options) {
    options = options || {};
    if (typeof options.objectMode === 'undefined') {
        return true;
    }

    return !!options.objectMode;
}
