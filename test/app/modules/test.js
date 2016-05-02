var fs = require('fs');
var path = require('path');
var zlib = require('zlib');
var read = path.resolve(__dirname + '/../composition/test.json');
var write = path.resolve(__dirname + '/test.txt');
 
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
    if (typeof data === 'string') {
        options.tapTest.match(data, options.validate);
    }

    next(null, data);
};

exports.streamDuplex = function (options, stream) {

    // validate call options
    var err = validateOptions(options);
    if (err) {
        return next(err);
    } 

    // validate configured options
    options.tapTest.match(options._.validate, options.streamValidate);

    // return a duplex stream
    return zlib.createGzip();
};

exports.streamWritable = function (options, stream) {

    // validate call options
    var err = validateOptions(options);
    if (err) {
        return next(err);
    } 

    // validate configured options
    options.tapTest.match(options._.validate, options.streamValidate);

    // pipe to a writable stream
    return fs.createWriteStream(write);
};

exports.streamReadable = function (options, stream) {

    // validate call options
    var err = validateOptions(options);
    if (err) {
        return next(err);
    } 

    // validate configured options
    options.tapTest.match(options._.validate, options.streamValidate);

    return fs.createReadStream(read);
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

var count = 0;
exports.error = function (options, data, next) {
    next(new Error(++count + ': Ups! ' + data));
};
