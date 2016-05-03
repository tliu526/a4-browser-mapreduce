/**
 * The Job Server for serving both volunteer and job requests.
 * (c) 2016 Tony Liu, Michael Shaw.
 */

//"Include" statements
var http = require('http');
var url = require('url');
var qs = require('querystring');
var structs = require('./structs');
var map_red = require('./map_red');

/**** WEB SERVER FUNCTIONS AND VARS ****/
const PORT = 8889;

/**
 * Handles the requests sent to the webserver.
 * TODO actually handle requests
 */
function request_handler(request, response){
//    console.log(url.parse(request.url).pathname);
//    response.end('Hello world! Path hit: ' + request.url);
   
    if(request.method == 'GET'){
        
	    //Send a SAML Authentication Request in an HTML form
       var saml_form = create_SAML_form();
       var volunteer_form = create_volunteer_form();
       var html = '<html>\n';
       html += saml_form + '\n';
       html += volunteer_form + '\n';
       html += '</html>';

       response.writeHead(200, {
           'Content-Type' : 'text/html',
           'Content-Length' : html.length,
           'Access-Control-Allow-Origin' : '*'
       });
       response.end(html);
    }

    else if(request.method == 'POST'){
        //TODO figure out if we're getting a volunteer or SAML response

        console.log('got a post request!');
        var body = '';
        request.on('data', function (data) {
            body += data;
        });
        request.on('end', function() {
            var post = qs.parse(body);

            //we know we have a volunteer request
            if(post.Volunteer != null){
                console.log('volunteer request received');

                var html = process_volunteer_request();
                console.log(html);
                response.writeHead(200, {
                    'Content-Type' : 'text/html',
                    'Content-Length' : html.length,
                    'Expires' : new Date().toUTCString(),
                    'Access-Control-Allow-Origin' : '*'
                });
                response.end(html);
            }

            //we know we have a volunteer response with data
            else if(post.task_id != null){
                console.log('volunteer data received');
                var task_id = post.task_id;
                var data = post.result;
                var data = JSON.parse(data);
                process_volunteer_output(task_id, data);
            }

        });
    }
}



/**
 * Creates an HTML form to send to the user with a SAML Authentication Request
 * TODO Put real values for SAMLRequest and RelayState
 */
function create_SAML_form() {
    var form = '<form method=\"POST\" action=\"http://localhost:8890\" id=\"form\">\n';
    form += '<input type=\"hidden\" name=\"SAMLRequest\" value = \"request\" />\n';
    form += '<input type=\"hidden\" name=\"RelayState\" value=\"state\" />\n';
    form += '<input type=\"submit\" value=\"Access resources\" />\n';
    form += '</form>\n';
    return form;
}

function create_volunteer_form() {
    var form = '<form method = \"POST\" action=\"http://localhost:8889\">\n';
    form += '<input type=\"hidden\" name=\"Volunteer\" value=\"True\" />\n';
    form += '<input type=\"submit\" value=\"Volunteer resources\" />\n';
    form += '</form>\n';
    return form;
}

/**
 * Send a new user's token to the IDP to allow for future authentication
 */
function send_new_user(newUser,expires) {
    var options = {
	host: 'localhost',
	path: '/',
	port: '8890',
	method: 'POST',
    }

    callback = function(response) {
	var str = '';
	response.on('data',function(chunk) {
		str += chunk;
	    });
	response.on('end', function () {
		console.log(str);
	    });
    }

    var req = http.request(options,callback);
    req.write('newUser=' + newUser + '&expires=' + expires);
    req.end();
}


/**** JOB MANAGEMENT FUNCTIONS AND VARS ****/

//A queue of jobs managed by the job server
var jobs = new structs.Queue();
var cur_job = null;

/**
 * Submits a job with the specified map and reduce functions to the job server. TODOO
 */
function submit_job(map, reduce, data){
    //TODO
}

/**
 * Helper function for retrieving the function name of func
 */
function get_func_name(func){
    var f_str = func.toString();
    f_str = f_str.substring('function '.length);
    return f_str.substring(0, f_str.indexOf('('));
}

/**
 * Creates the worker html page.
 * TODO think about parameters more, this is just a working prototype
 * task is currently the javascript function 
 * task_name is currently the function name implemented in task
 */
function create_task_html(task, task_id, data){
    //TODO change
    var url = "http://localhost:8889";
    var func_name = get_func_name(task);
    var html = '<!DOCTYPE html>';
    html += '<html> <head> <script type=\"text/javascript\">\n';
    html += "var url=" + "\"" + url + "\"" + ";\n";
    html += "var task_id=" + "\"" + task_id + "\"" + ";\n";
    html += task.toString();
    html += createCORSRequest.toString();
    html += process_task.toString();
    html += "</script> </head>";
    html += "<body onload=" + "\"process_task(" + func_name + ", task_id, url);" + "\">\n";
    //html += "<header>" + task_id + "</header>\n";
    html += JSON.stringify(data);
    html += "</body>";
    html += "</html>";

    return html;
}

/**
 * Processes a volunteer request and gives them a specific task to complete.
 *
 * Returns the html of the task they have been assigned.
 */
function process_volunteer_request(){
    var task = cur_job.get_task();
    return create_task_html(task['func'], task['id'], task['data']);
}

/**
 * Processes the data returned from the volunteer request, and updates the cur_job.
 * TODO then redirect volunteer to a new task.
 */
function process_volunteer_output(task_id, data){
    cur_job.submit_output(task_id, data);

    if(cur_job.is_complete()){
        console.log("Complete output:");
        console.log(cur_job.get_output());
    }
}

/**
 * Processes a single task appropriately, and sends the response. 
 * This function is embedded in the html page of the volunteer client.
 */
function process_task(func, id, url){
    console.log("process_task called!");
    var json_data = document.body.innerHTML;
    var data = JSON.parse(json_data);
    var out = [];

    //map task
    if(id.substring(0,1) == 'm'){
        for (var i = 0; i < data.length; i++){
            var k = data[i][0];
            var v = data[i][1];
            //TODO assumes that output of the map is a list
            out = out.concat(func(k, v));
        }
    }
    else if(id.substring(0,1) == 'r'){
        for (var i = 0; i < data.length; i++){
            var k = data[i][0];
            var v = data[i][1];
            out.push([k, func(k, v)]);
        }
    }

    var out_str = JSON.stringify(out);
    //Create and send back POST form
    var request = createCORSRequest("post", url);

    if(request){
        console.log("sending post!");
        var response = "task_id=" + id + "&" + "result=" + out_str;
        request.send(response);
    }
}

/** a test function */
function add(){
    var vals = document.body.innerHTML.split(",");
    //maps the strings in val to numbers
    for(var i = 0; i < vals.length; i++){
        vals[i] = parseInt(vals[i],10);
    }
    var total = vals.reduce(function(a,b){
        return a + b;
    });

    //Create and send back POST form
    var request = createCORSRequest("post", "http://localhost:8889");

    if(request){
        request.send(total);
    }
}

function createCORSRequest(method, url){
    var xhr = new XMLHttpRequest();
    if ("withCredentials" in xhr){
        xhr.open(method, url, true);
    } else if (typeof XDomainRequest != "undefined"){
        xhr = new XDomainRequest();
        xhr.open(method, url);
    } else {
        xhr = null;
    }
    return xhr;
}

/**** MAIN ****/
function main(){
    var server = http.createServer(request_handler);
    server.listen(PORT, function(){
        console.log("Server listening on: http://localhost:%s", PORT);
    });

    /*
    while(!cur_job.is_complete()){
        //do nothing, for now
    //    setTimeout(cur_job.print_progress(), 300000);
    }
    
    console.log("Final output");
    console.log(cur_job.get_output());
    */
}

function test(){
    /*
    var t = new structs.Task('id3', function(){console.log('hi')}, 'dataaaaa');
    console.log(t['id']);
    console.log(t['func']);
    console.log(t['data']);
    */
    
    var data = [
    ['frase primera', 'primer trozo de informacion para procesado primer trozo'],
    ['segunda frase', 'segundo trozo de informacion trozo de'],
    ['cacho 3', 'otro trozo para ser procesado otro otro otro trozo'],
    ['cuarta frase', 'primer trozo de informacion para procesado primer trozo'],
    ['frase 5', 'segundo trozo de informacion trozo de'],
    ['sexto cacho', 'otro trozo para ser procesado otro otro otro trozo']
    ];

    var job = new map_red.Job(wc_map, wc_red, data);
    var num_tasks = job.create_map_tasks(6);
    console.log("The number of map tasks:" + num_tasks);
    cur_job = job;
}

//TEST MAP FOR MAPREDUCE
function wc_map(k, v){
    var vals = v.split(" ");
    var res = [];
    for (var i = 0; i < vals.length; i++){
        var tup = [vals[i], 1];
        res.push(tup);
    }

    return res;
}

//TEST REDUCE FOR MAPREDUCE
function wc_red(k, l){
    var result = 0;
    for (var i = 0; i < l.length; i++){
        result += l[i];
    }

    return result;
}

test();
main();