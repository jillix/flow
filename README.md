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

// send data to init data handlers and end stream
event.end('data');
```
### Module instance initialization
##### "init" Method
If "init" is a function it is called once after all module resources are loaded.
```js
exports.init = function (config, ready) {
    // do init tasks, then call ready.
    // if an error is passed the instance will not be cached and no "ready" event will be emmitted.
    ready(new Error('Init error'));
};
```
### Emit a stream event
```js

exports.myMethod = function () {

    // call flow from you instance method
    var flow = this.flow('event', {/* argument options */}, function (err, data) {
        // ..
    });
    
    // Input: write data to flow stream
    flow.write(chunk);
    
    // Output: receive or pipe data from flow stream
    // Info: It's mandatory to read out the data, otherwise the stream
    // buffers will fill up.
    flow.on('data', function (chunk) {});

    // Get errors
    flow.on('error', function (err) {});
}
```
### Handlers
Here's and example how to write flow handlers in your module code:
```js
// stream handler
exports.method = function (hose, options) {

    // read from flow event
    hose.pipe(fs.createWriteStream('file'));
    
    // write to flow event
    fs.createReadStream('file').pipe(hose);
    
    // or return a transform stream
    return otherTransformStream;
}

// data handler
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

###Module instance config (composition)
A composition config, configures an instance of a module.
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

##### Flow listener config: `flow`
```js
{
    "eventName": {
        "d": [
            // Data handler: receives data from flow or custom streams.
            ":method",
            ":instance/method",
            
            // "Once" data handler: Like a data handler, but will be removed after first data chunk is processed.
            ".method",
            ".instance/method",
            
            // Flow emit: write data to event and write event result data to next data handlers or streams.
            ">event",
            ">instance/event",
            
            // Custom stream: A method that returns a readable, writable or duplex stream.
            "*method",
            "*instance/method",
            
            // ..same as above. but with the options argument, which is passed to the handler function
            [":method", {"key": "value"}],
            [":instance/method", {"key": "value"}],
            [".method", {"key": "value"}],
            [".instance/method", {"key": "value"}],
            ["*method", {"key": "value"}],
            ["*instance/method", {"key": "value"}]
        ],
        
        // if the flow stream ends, this event will be emitted, no data.
        "e": "instance/onEndEvent"
        
        // if an error happens somewhere in the flow stream, this event will be emitted, with the error as data.
        "r": "instance/onErrorEvent"
    ]
}
```

### License (MIT)
See [LICENSE](https://github.com/jillix/flow/blob/master/LICENSE) file.
