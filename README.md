# flow
Configurable stream networks

### Installation
With NPM: `npm install jillix/flow`.

### Usage (client and server)
```js
var Flow = require('flow');

// create a flow (core) instance
var flow = Flow({

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

// load entrypoint (client usage)
flow.load('*')
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
##### "ready" listener
A `ready` event is emitted once after a module is successfully initialized.
```json
{
    "flow": {
        "ready": {"d": ["..."]}
    }
}
```
### Emit a stream event
```js

exports.myMethod = function () {

    // call flow from you instance method
    var flow = this.flow('event', {/* argument options */}, function (err, data) {
        // ..
    });
    
    // Input: write data to flow stream
    flow.i.write(chunk);
    
    // Output: receive or pipe data from flow stream
    // Info: It's mandatory to read out the data, otherwise the stream
    // buffers will fill up.
    flow.o.on('data', function (chunk) {});

    // Get errors
    flow.o.on('error', function (err) {});
}
```
### Handlers
Here's and example how to write flow handlers in your module code:
```js
// stream handler
exports.method = function (chain, options, onError) {

    // chain.i (input)
    chain.i.pipe(fs.createWriteStream('file'));
    
    // chain.o (output)
    fs.createReadStream('file').pipe(chain.o);
    
    // transform example
    chain.i.pipe(transformStream).pipe(chain.o);

    // append error handler (recommended)
    myAwesomeStream.on('error', onError);
}

// data handler
function myMethod (options, data, next) {
    
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
    "load": ["instance"]
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
            ">>event",
            ">>instance/event",
            
            // Custom stream: A method that returns a readable, writable or duplex stream.
            ">*method",
            ">*instance/method",

            // Flow emit (leaking): Leak the data also to the next data handlers.
            "|>event",
            "|>instance/event",
            
            // Stream handler (leaking)
            "|*method",
            "|*instance/method",
            
            // ..same as above. but with the options argument, which is passed to the handler function
            [":method", {"key": "value"}],
            [":instance/method", {"key": "value"}],
            [".method", {"key": "value"}],
            [".instance/method", {"key": "value"}],
            [">*method", {"key": "value"}],
            [">*instance/method", {"key": "value"}],
            ["|*method", {"key": "value"}],
            ["|*instance/method", {"key": "value"}]
        ],
        
        // if the flow stream ends, this event will be emitted, no data.
        "e": ["onEndEvent", {"to": "instance", "net": "ws"}]
        
        // if an error happens somewhere in the flow stream, this event will be emitted, with the error as data.
        "r": ["onErrorEvent", {"to": "instance", "net": "ws"}]
    ]
}
```

### License (MIT)
See [LICENSE](https://github.com/jillix/flow/blob/master/LICENSE) file.
