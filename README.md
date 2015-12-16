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
    module: function (name, callback) {
        // .. get the module, ex. require(name)
        callback(null, module);
    },

    // return a flow instance composition
    composition: function (name, callback) {
        // .. get the config
        callback(null, config);
    }

    // connect to a external flow event stream (multiplexer)
    // this method must return a writable stream (duplex, transform, ect.)
    request: function (coreInst, options) {
        // this method is called, when the "net" option is set.
        switch (option.net) {
            case "http":
                // .. create http request stream
            case "ws":
                // .. create ws multiplexer
        }
        
        return stream;
    },

    // load markup (optional)
    markup: function (url, callback) {
        // .. load markup
        callback(null, snippet);
    },

    // load styles (optional)
    styles: function (urls) {
        // ..
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
### Instance flow method
```js
// call flow from you instance method
exports.myMethod = function () {
    var flow = this.flow('event', {/* flow options */}, function (err, data) {
        // ..
    });
    
    // Input: write data to flow stream
    flow.i.write(chunk);
    
    // Output: receive or pipe data from flow stream
    flow.o.on('data', function () {});
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
    "load": ["instance"],
    "styles": ["/path/file.css"],
    "markup": ["/path/file.html"]
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
            
            // Custom stream: A method that returns a readable, writable or duplex stream.
            ">*method",
            ">*instance/method",

            // Flow emit (leaking): Leak the data also to the next data handlers.
            "|>event",
            
            // Custom stream (leaking)
            "|*method",
            "|*instance/method",
            
            // ..same as above. but with the options argument, which is passed to the handler function
            [":method", {"key": "value"}],
            [":instance/method", {"key": "value"}],
            [".method", {"key": "value"}],
            [".instance/method", {"key": "value"}],
            [">>event", {"to": "instance", "net": "ws"}],
            [">*method", {"key": "value"}],
            [">*instance/method", {"key": "value"}],
            ["|>event", {"to": "instance", "net": "ws"}],
            ["|*method", {"key": "value"}],
            ["|*instance/method", {"key": "value"}]
        ],
        
        // if the above flow stream ends, this event will be emitted, no data.
        "e": "onEndEvent"
        
        // if an error happens somewhere in the above flow, this event will be emitted, with the error as data.
        "r": "onErrorEvent"
    ]
}
```

#####Syntax in detail:
```js
{
    // Those events can be called with `instance.flow("eventName")`     
    "eventName": {
        
        // Data handlers:
        // If someone writes to the event stream, this array defines the sequenze,
        // in which the data chunk is passed to the handler functions.
        "d": [

            // Handler:
            // A handler is a method of an instance,
            // optionally pass an `options` object to the function call.
            [
                // Define the `type` of the handler function.
                "TYPE[" +

                    // The ":" char defines a data handler.
                    ":," +

                    // The "." char defines a data hanlder,
                    // that is removed after the first data chunk.
                    "." +
                "]" +

                // The method path is a flat object key (dot notation).
                // If no instance is defined, the instance of the emitter (this.flow()) is used
                "METHOD[(instance/)method.path]",

                // An `optional` JSON object, that is passed to the handler function call.
                {"key": "value"}
            ],

            // Stream handler:
            // Stream handlers receive the raw event stream object to read from, or write to.
            // Stream handlers are always called, before the data handlers.
            [
                // LINK types define how a linked stream is connected to the flow network.
                "LINK[" +

                    // Write the data to the linked stream and let the linked stream write
                    // data to the next stream in the network.
                    ">," +

                    // Write data to the linked stream and simultaneously
                    // to the next stream in the network
                    "|" +
                "]" +
                
                // Emit events locally, over the network, or define
                // a custom handler to connect you custom streams.
                "NET[> = flow, * = custom]" +

                // In case of "<", "/" or "@", the flow stream handler is called,
                // which connects an event stream to the current data flow.
                "FLOW[(instance/)event]" +

                //..or..

                // The method path is a flat object key (dot notation).
                // If no instance is defined, the instance of the emitter (this.flow()) is used
                "METHOD[(instance/)method.path]",

                // An `optional` JSON object, that is passed to the handler function call.
                {
                    // If your custom stream is in buffer mode,
                    // disbale object mode on the event stream.
                    "objectMode": false,
                    "to": "instance",
                    "net": "http|ws",
                    "key": "value"
                }
            ]
        ],
        
        // End event
        "e": "onEndEvent"
        
        // Error event
        "r": "onErrorEvent"
    }
}
```

### License
..coming
