function validateOptions (options) {
    if (!options || !options.test) {
        return new Error('Flow.test: No tap test instance found.');
    }

    if (!options.data || !options.options) {
        return new Error('Flow.test: No test patterns found.');
    }
}

exports.data = function (options, data, next) {

    // validate call options
    var err = validateOptions(options);
    if (err) {
        return next(err);
    } 

    // validate configured options
    options.test.match(options._, options.options);

    // validate data chunk
    options.test.match(data, options.data);

    // modify data chunk
    data = options.modified;

    next(null, data);
};

exports.node = function (options) {

    // validate call options
    var err = validateOptions(options);
    if (err) {
        return next(err);
    } 

    // validate configured options
    options.test.match(options._, options.options);

    if (!options._.flow) {
        return next(new Error('Flow.test.node: No flow event config.'));
    }

    // TODO http example
    // stream.pipe(req);
    // res.pipe(stream);

    // TODO ws example
    // stream.pipe(ws).pipe(stream)

    var stream = this.flow(options._.flow, options);
    return stream;
};

exports.end = function (options, data, next) {
    console.log('End:', data);
    next(null, data);
};

exports.error = function (options, data, next) {
    console.log('Error:', data);
    next(null, data);
};
