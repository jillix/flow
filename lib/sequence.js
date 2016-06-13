var Stream = require('stream');

module.exports = function Sequence (options, sequence) {

    options = options || {};

    var seq = Stream.Transform({
        objectMode: typeof options.objectMode === 'undefined' ? true : !!options.objectMode,
        transform: function (chunk, enc, next) {

            // once handler
            if (this.called && sequence[3]) {
                return next(null, chunk);
            }

            this.called = true;

            options._ = sequence[1];
            process.nextTick(sequence[0][1].bind(sequence[0][0], options, chunk, next, this, enc));
        }
    });

    return seq;
};
