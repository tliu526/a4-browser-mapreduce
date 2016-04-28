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
    //First request will be a SAML authentication request. The IDP must then prompt the user to enter credentials (how??)

    //Second request will be the user's credentials. The IDP must check in the SQLite database for the user, then return a SAML assertion
}

/**
 * Parses the user requesting access from 
 */


/**
 * Check SQLite database for a user's privileges
 */
function validate_user(user) {

}

/**
 * Create an XML string
 */
function create_assertion() {
    var writer = new XMLWriter(true);

    //Opening Assertion tag
    writer.startDocument();
    writer.startElement('saml:Assertion');
    writer.writeAttribute('xmlns:saml','urn:oasis:names:tc:SAML:2.0:assertion');
    writer.writeAttribute('Version','2.0');

    //Issuer
    writer.startElement('saml:Issuer');
    writer.text('Identity provider');
    writer.endElement();

    //put signature here

    //Subject, NameID
    writer.startElement('saml:Subject');
    writer.startElement('saml:NameID');
    writer.text('user id');
    writer.endElement(); 
    writer.endElement();

    //Conditions, Audience Restriction, and Audience
    writer.startElement('saml:Conditions');
    writer.writeAttribute('NotOnOrAfter','yyyy-mm-ddThh:mm:ss');
    writer.startElement('saml:AudienceRestriction');
    writer.startElement('saml:Audience');
    writer.text('Service for which user is authorized');
    writer.endElement();
    writer.endElement();
    writer.endElement();
    
    //Attribute and AttributeValue
    writer.startElement('saml:Attribute');
    writer.startElement('AttributeValue');
    writer.text('Resource volunteer');
    writer.endElement();
    writer.endElement();

    //End Assertion
    writer.endElement();
    
    var xml_string = writer.toString();
    console.log(xml_string);
}

function main() {
    create_assertion();
    var server = http.createServer(request_handler);
    server.listen(PORT, function(){
	console.log("Identity provider listening on: http://localhost:%s", PORT);
    });
}

main();