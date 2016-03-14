var test = require('./app/test');
var tap = require('tap');

//tap.test('Data handlers only:', test('test/data'));
//tap.test('Emit:', test('test/end'));
tap.test('Node:', test('test/stream'));
//tap.test('Stream handler only:', test('test/stream'));
