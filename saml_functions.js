/**
* Provides functions for SAML creation and validation
*/


var XMLWriter = require('xml-writer');
var xmldoc = require('xmldoc');
var select = require('xml-crypto').xpath;
var dom = require('xmldom').DOMParser;
var SignedXml = require('xml-crypto').SignedXml;
var FileKeyInfo = require('xml-crypto').FileKeyInfo;
var fs = require('fs');




module.exports = {

	/**
	* Returns a base64 encoded SAML request
	*/	
	create_saml_authnRequest: function() {
		//Create XML writer
		var writer = new XMLWriter(true);

		//Write elements and attributes
		writer.startDocument();
		writer.startElement('samlp:AuthnRequest');
		writer.writeAttribute('xmlns:samlp','urn:oasis:names:tc:SAML:2.0:protocol');
		writer.writeAttribute('xmlns:saml','urn:oasis:names:tc:SAML:2.0:assertion');
		writer.writeAttribute('Version','2.0');
		var now = new Date().getTime();
		writer.writeAttribute('IssueInstant',now);
		writer.writeElement('saml:Issuer','localhost:8889');
		writer.endElement();

	    //Convert to a string and base64 encode
	    var samlRequest = writer.toString();
	    var samlRequestBase64 = new Buffer(samlRequest).toString('base64');
	    return samlRequestBase64;
	},	

	/**
	* Returns a signed SAML Response string
	*/
	create_response: function(user,expire,authenticated) {
		//Start document
		var writer = new XMLWriter(true);
		writer.startDocument();

	    //Start samlp:Response element and write attributes
	    writer.startElement('samlp:Response');
	    writer.writeAttribute('xmlns:samlp','urn:oasis:names:tc:SAML:2.0:protocol');
	    writer.writeAttribute('xmlns:saml','urn:oasis:names:tc:SAML:2.0:assertion');
	    writer.writeAttribute('Version','2.0');
	    var datetime = new Date().getTime();
	    writer.writeAttribute('IssueInstant',datetime);

	    //Issuer element                                                   
	    writer.startElement('saml:Issuer');
	    writer.text('http://localhost:8890');
	    writer.endElement();    

	    //Start saml:Assertion element and write attributes
	    writer.startElement('saml:Assertion');
	    writer.writeAttribute('xmlns:saml', 'urn:oasis:names:tc:SAML:2.0:assertion');
	    writer.writeAttribute('IssueInstant',datetime);
	    writer.writeAttribute('Version','2.0');

	    //Issuer
	    writer.startElement('saml:Issuer');
	    writer.text('http://localhost:8890');
	    writer.endElement();

	    //put signature here

	    //Subject, NameID
	    writer.startElement('saml:Subject');
	    writer.writeElement('saml:NameID',user.toString());
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

	    if (authenticated) writer.text('Resource volunteer');
	    else writer.text('Not a resource volunteer');
	    writer.endElement();
	    writer.endElement();
	    writer.endElement();

	    //End Assertion
	    writer.endElement();

	    //End SAMLResponse
	    writer.endElement();

	    //Get saml response in a string
	    var samlResponse = writer.toString();

	    //Sign the response
	    samlResponse = module.exports.sign_saml(samlResponse);

	    //Encode saml response in base64
	    var samlResponseBase64 = new Buffer(samlResponse).toString('base64');

	    return samlResponseBase64;
    },


	/**
	 * Takes a SAMLResponse, signs it, and returns it
	 */

	 sign_saml: function(samlResponse) {
	    var signature = new SignedXml();
	    signature.addReference('//*[local-name(.)=\'Assertion\']');
	    signature.signingKey = fs.readFileSync('privateNoPass.pem');
	    signature.computeSignature(samlResponse);
	    samlResponse = signature.getSignedXml();
	    return samlResponse;
	},


	/**
	* Takes a base64 encoded SAML Response and determines user access
	* Returns a status code based on the response:
	*	fail to validate signature 	-> 'INVALID SIGNATURE'
	*	unrecognized idp 			-> 'INVALID IDP'
	*	expired saml assertion 		-> 'EXPIRED ASSERTION'
	*	no volunteer attribute  	-> 'NOT A RESOURCE VOLUNTEER'
	*	all success 				-> 'VALIDATED RESOURCE VOLUNTEER'
	*/
	validate_response: function(samlResponseBase64) {
		//Decode from base64
		var samlResponse = new Buffer(samlResponseBase64,'base64').toString('utf8');

		//Check signature
		if (module.exports.validate_signature(samlResponse)) {
			console.log('Signature successfully verified');
		} else {
			console.log('Signature not verified. Access will be denied');
			return 'INVALID SIGNATURE';
		}

		//Now that signature is verified, parse the response
		var xmlObject = new xmldoc.XmlDocument(samlResponse);

		//Get issuer and ensure it's the correct identity provider
		var issuer = xmlObject.childNamed('saml:Issuer');
		if (issuer.val.trim() != 'http://localhost:8890') {
			console.log('Invalid identity provider. Response ignored');
			return 'INVALID IDP';
		}

		//Get assertion in an object
		var assertion = xmlObject.childNamed('saml:Assertion');

		//Check NotOnOrAfter condition
		var conditions = assertion.childNamed('saml:Conditions');
		var expires = conditions.attr.NotOnOrAfter;
		var now = new Date().getTime();
		if (expires < now) {
			console.log('SAML Assertion has expired. Access will be denied');
			return 'EXPIRED ASSERTION';
		}

		//Check attribute given my IDP
		var attributeValue = assertion.childNamed('saml:AttributeStatement').childNamed('saml:Attribute').childNamed('saml:AttributeValue').val; 
		if (attributeValue == 'Resource volunteer') {
			console.log('SAML Response has confirmed that user is a resource volunteer. Access will be granted');
			return 'VALIDATED RESOURCE VOLUNTEER';
		} else {
			console.log('SAML Response has not confirmed that user is a resource volunteer. Access will be denied');
			return 'NOT A RESOURCE VOLUTEER';
		}
	},

	/**
	* Validates the signature of a signed SAML Response
	*/
	validate_signature: function(samlResponse) {

	 	//Get DOM object
	 	var samlResponseDom = new dom({ignoreWhiteSpace: true}).parseFromString(samlResponse);

	 			console.log('here1');


	    //Extract signature
	    var signature = select(samlResponseDom,'//*[local-name(.)=\"Signature\" and namespace-uri(.)=\"http://www.w3.org/2000/09/xmldsig#\"]')[0];

	    //Create signature checker
	    var sigChecker = new SignedXml();
	    sigChecker.keyInfoProvider = new FileKeyInfo('public.pem');
	    sigChecker.loadSignature(signature.toString());

	    //Check signautre
	    var result = sigChecker.checkSignature(samlResponse);
	    if (!result) {
	    	console.log(sigChecker.validationErrors);
	    	return false;
	    } else {
	    	return true;
	    } 
	},

	/**
	 * TODO do we need this function?
	 * Takes a parsed qs object and extracts the SAML request
	 */
	 extract_saml: function(post) {
	    //Get saml in string
	    var samlString = post.SAMLRequest;

	    //Convert to XML doc                                               
	    var samlXml = new XmlDocument(samlString);
	    var samlAuthnRequest = samlXml.childNamed('samlp:AuthnRequest');
	    var issuer = samlAuthnRequest.childNamed('saml:Issuer');

	    if (!issuer.val.equals('PUT NAME OF SERVICE PROVIDER HERE')) {
	    	console.log('Identity provider does not service this provider');
	    }
	}


}