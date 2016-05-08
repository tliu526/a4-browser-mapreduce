/**
For the requester page to start jobs and download output.
(c) 2016 Tony Liu and Michael Shaw.
*/

//The current map and reduce percentages
var cur_map = -1;
var cur_red = -1;

var JOB_STATUS = "job_status=true"; //the POST data for a job_status request

/**
Combines the the two form fields and sends as a single post request
*/
function submit_forms(){
    var map_form = document.getElementById("num_maps");
    var red_form = document.getElementById("num_reduces");
    var formData = new FormData();

    var data = map_form.name + "=" + map_form.value + "&";
    data += red_form.name + "=" + map_form.value;
    var xhr = createCORSRequest("POST", "/");



    if(xhr){
        xhr.onreadystatechange = function() {
            if (xhr.readyState == XMLHttpRequest.DONE) {
                //kick off querying loop
                check_job_status();                
            }
        }
    }

    xhr.send(data);



}


/**
 * Creates and sends a post message; used for checking job status
 */
function send_post(message){
    //Create and send back POST form
    var xmlhttp = createCORSRequest("POST", "/");

    //parses the response from the sent output, and parses the response, if applicable
    if(xmlhttp){
        xmlhttp.onreadystatechange = function() {
            if (xmlhttp.readyState == XMLHttpRequest.DONE) {
                var response = xmlhttp.responseText.split(",");
                var map_percent = parseInt(response[0]);
                var red_percent = parseInt(response[1]);
                if(map_percent == 100 && red_percent == 100){
                    var download_button = document.getElementById("download");
                    download_button.disabled = false;
                }

                if((map_percent != cur_map) || (red_percent != cur_red)){
                    document.body.innerHTML += "Map Completion: " + map_percent + "%, Reduce Completion: " + red_percent + "%<br>";
                    cur_red = red_percent;
                    cur_map = map_percent;
                }
            }
        }
    }

    xmlhttp.send(message);
}

/**
 * Appropriately formats and creates an XMLHttpRequest (to deal with cross domain)
 */
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
/**
 * continually asks the job_server for the current job status, downloads finished
 * output if applicable
 */
function check_job_status(){
    console.log("checking job status");
    //TODO check for job completion too
    send_post(JOB_STATUS);
    setTimeout(check_job_status, 3000);
}