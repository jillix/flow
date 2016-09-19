const Stream = require('stream');

module.exports = (options, sequence) => {

    options = options || {};

    const seq = Stream.Transform({
        objectMode: typeof options.objectMode === 'undefined' ? true : !!options.objectMode,
        transform: (chunk, enc, next) => {

            // once handler
            if (seq.called && sequence[3]) {
                return next(null, chunk);
            }

            seq.called = true;

            options._ = sequence[2];
            process.nextTick(() => {
                sequence[1].call(sequence[0], options, chunk, next, seq, enc);
            });
        }
    });

    return seq;
};
