var Stream = require('stream');

module.exports = function Sequence (options, sequence) {

    options = options || {};

    var seq = Stream.Transform({
        called: 0,
        objectMode: typeof options.objectMode === 'undefined' ? true : !!options.objectMode,
        transform: function (chunk, enc, next) {

            // once handler
            if (this.called > 0 && sequence[3]) {
                return next(null, chunk);
            }

            ++this.called;

            options._ = sequence[1];
            sequence[0][1].call(sequence[0][0], options, chunk, next, this, enc);
        }
    });

    return seq;
};
