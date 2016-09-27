const Stream = require('stream');

module.exports = (args, handler) => {

    const seq = Stream.Transform({
        objectMode: typeof args.objectMode === 'undefined' ? true : !!args.objectMode,
        transform: (chunk, enc, next) => {

            // once handler
            if (seq.called && handler.once) {
                return next(null, chunk);
            }
            seq.called = true;

            handler.method.call(handler.instance, args, chunk, next, seq, enc);
        }
    });

    return seq;
};
