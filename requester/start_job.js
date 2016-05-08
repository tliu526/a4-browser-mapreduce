/**
For the requester page to start jobs and download output.
*/
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
    xhr.send(data);

    //TODO kick off querying loop here
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
