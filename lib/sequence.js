const Stream = require('stream');

module.exports = (options, sequence) => {

    options = options || {};

    return Stream.Transform({
        objectMode: typeof options.objectMode === 'undefined' ? true : !!options.objectMode,
        transform: (chunk, enc, next) => {

            // once handler
            if (this.called && sequence[3]) {
                return next(null, chunk);
            }

            this.called = true;

            options._ = sequence[2];
            process.nextTick(sequence[1].bind(sequence[0], options, chunk, next, this, enc));
        }
    });
};
