var http = require('http');

const PORT = 8889;

function handleRequest(request, response){
    response.end('Hello world! Path hit: ' + request.url);
}

var server = http.createServer(handleRequest);
server.listen(PORT, function(){
    console.log("Server listening on: http://localhost:%s", PORT);
});