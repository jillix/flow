function validateOptions (options) {
    if (!options || !options.tapTest) {
        return new Error('Flow.test: No tap test instance found.');
    }

    if (!options.validate) {
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
    options.tapTest.match(options._.validate, options.streamValidate);

    // validate data chunk
    options.tapTest.match(data, options.validate);

    next(null, data);
};

exports.streamDuplex = function (options, stream) {
    return this.flow('A', options); 
};

exports.streamWritable = function (options, stream) {
    // TODO return a writable stream
    return;
};

exports.streamReadable = function (options, stream) {
    // TODO return a readable stream
    return;
};

exports.streamNoReturn = function (options, stream) {

    // validate call options
    var err = validateOptions(options);
    if (err) {
        return next(err);
    } 

    // validate configured options
    options.tapTest.match(options._.validate, options.streamValidate);
};

exports.end = function (options, data, next) {
    console.log('End:', data);
    next(null, data);
};

exports.error = function (options, data, next) {
    console.log('Error:', data);
    next(null, data);
};
