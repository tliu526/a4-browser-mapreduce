/**
 * Identity provider for the Job Server.
 * (c) 2016 Tony Liu, Michael Shaw.
 */


//"Include" statements
var http = require('http');
var XMLWriter = require('xml-writer');

const PORT = 8890;

/**
 * Handle incoming requests 
 */
function request_handler(request,response) {
    
}

/**
 * Check SQLite database for a user's privileges
 */
function check_user(user) {

}

/**
 * Create an XML string
 */
function create_xml() {
    var writer = new XMLWriter(true);

    writer.startDocument();
    writer.startElement('saml:Assertion');
    writer.writeAttribute('xmlns:saml','urn:oasis:names:tc:SAML:2.0:assertion');
    
    writer.startElement('saml:Issuer');
    writer.text('Identity provider');
    writer.endElement();

    writer.endElement();
    
    var xml_string = writer.toString();
    console.log(xml_string);
}

function main() {
    create_xml();
    var server = http.createServer(request_handler);
    server.listen(PORT, function(){
	console.log("Identity provider listening on: http://localhost:%s", PORT);
    });
}

main();