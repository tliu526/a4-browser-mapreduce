import java.io.File;
import java.io.StringWriter;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import javax.xml.transform.OutputKeys;
import javax.xml.transform.Transformer;
import javax.xml.transform.TransformerException;
import javax.xml.transform.TransformerFactory;
import javax.xml.transform.dom.DOMSource;
import javax.xml.transform.stream.StreamResult;

import org.w3c.dom.Attr;
import org.w3c.dom.Document;
import org.w3c.dom.Element;

public class SamlRequestBuilder {

    //Returns the string representation of a SAML request
    public String buildRequest() {
	
	try {
	    //Create document
	    Document doc = DocumentBuilderFactory.newInstance().newDocumentBuilder().newDocument();

	    //Create root element
	    Element authnElement = doc.createElement("samlp:AuthnRequest");
	    doc.appendChild(authnElement);
	    authnElement.setAttribute("xmlns:samlp","urn:oasis:names:tc:SAML:2.0:protocl");
	    authnElement.setAttribute("xmlns:saml","urn:oasis:names:tc:SAML:2.0:assertion");	    

	    //Create issuer element
	    Element issuer = doc.createElement("saml:Issuer");
	    issuer.appendChild(doc.createTextNode("Service Provider"));
	    authnElement.appendChild(issuer);
	    
	    //Create and configure transformer
	    Transformer transformer = TransformerFactory.newInstance().newTransformer();
	    transformer.setOutputProperty(OutputKeys.INDENT, "yes");

	    //Transform document and return as a string
	    StringWriter writer = new StringWriter();
	    StreamResult result = new StreamResult(writer);
	    DOMSource source = new DOMSource(doc);
	    transformer.transform(source,result);

	    return writer.toString();					      

	} catch (ParserConfigurationException pce) {
	    pce.printStackTrace();
	} catch (TransformerException tfe) {
	    tfe.printStackTrace();
	}

	return "";
    }

    public static void main(String[] args) {
	SamlRequestBuilder builder = new SamlRequestBuilder();
	String request = builder.buildRequest();
	System.out.println(request);	
    }

}