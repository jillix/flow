# flow
Configurable stream networks

### Installation
With NPM: `npm install jillix/flow`.

### Usage (client and server)
```js
var flow = require('flow');

// emit first flow event with adapter functions
var event = flow('instance/event', {

    // this method must return a CommonJs exports object.
    mod: function (name, callback) {
        // .. get the module, ex. require(name)
        callback(null, module);
    },

    // return a flow module instance composition (mic)
    mic: function (name, callback) {
        // .. get the config
        callback(null, config);
    }

    // custom reset handler
    _reset: function () {
        // .. reset stuff, ex. DOM
    }
});

event.on('error', console.error.bind(console));
event.on('data', function (chunk) {});
event.write('chunk1');
event.end('chunk2');
```
##### Init handler
If a module exports a method named `init`,
flow will call this method once after the module is loaded
```js
exports.init = function (config, ready) {
    // do init tasks, then call ready.
    // if an error is passed the instance will not be cached and no "ready" event will be emmitted.
    ready(new Error('Init error'));
};
```
### Stream handler
Stream handler receive the previous stream in the the event chain and can also
return a duplex/transform or readable stream, which gets piped into the chain.
```js
exports.myMethod = function (options, stream) {

    // read from flow event
    stream.pipe(fs.createWriteStream('file'));
    
    // write to flow event
    return fs.createReadStream('file');
    
    // or return a transform stream
    return otherTransformStream;
    
    // custom flow event emits
    var event = this.flow('instance/event', {/* options */});
    // do something with event stream
    event.pipe(writableStream);
    // custom flow events can just be returned
    return event;
}
```
### Data handler
Data handler receive the data chunks, that are send over the stream.
Data handlers are ment to transform the chunks and pass it down the line.
```js
exports.myMethod = function (options, data, next) {
    
    // Push data to response (readable), without calling the next data handler.
    // Note, that you have to call next again, to signal that the handler is done.
    next(data, true);
    
    // Pass transformed data to the next data handler.
    next(null, data);
    
    // Emit en error
    next(new Error('Something bad happend.'));
}
```
###Module instance config (MIC)
Config module type and flow events for module isntances.
```json
{
    "roles": {"*": true},
    "name": "instance",
    "module": "module",
    "config": {},
    "flow": {},
    "load": ["instance/event"]
}
```

##### Flow listeners
Detail flow event listeners config.
```js
{
    "eventName": {
        "d": [
            // Data handler: receives data from flow or custom streams.
            [":instance/method", {"key": "value"}],
            
            // "Once" data handler: Like a data handler,
            // but will be removed after first data chunk is processed.
            [".instance/method", {"key": "value"}],
            
            // Flow emit: write data to event and write event
            // result data to next data handlers or streams.
            [">instance/event", {"key": "value"}],
            
            // Custom stream: A method that returns a readable,
            // writable or duplex stream.
            ["*instance/method", {"key": "value"}]
        ],
        
        // if the flow stream ends, this event will be emitted, no data.
        "e": ["instance/onEndEvent", {"key": "value"}]
        
        // if an error happens somewhere in the flow stream,
        // this event will be emitted, with the error as data.
        "r": ["instance/onErrorEvent", {"key": "value"}]
    ]
}
```
If there are no options for a handler, the handler path can be just a string.
Also the instance name in a path is optional, if you call a method on the
module instance, where flow is configured.

### License (MIT)
See [LICENSE](https://github.com/jillix/flow/blob/master/LICENSE) file.
