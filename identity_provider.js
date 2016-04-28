/**
 * Identity provider for the Job Server.
 * (c) 2016 Tony Liu, Michael Shaw.
 */


//"Include" statements
var http = require('http');

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
    var writer = new XMLWriter();

    writer.BeginNode("saml:Assertion");
    writer.Attrib("xmlns:saml","urn:oasis:names:tc:SAML:2.0:assertion");
    writer.Attrib("xmlns:xs","http://www.w3.org/2001/XMLScheme");
    
    writer.BeginNode("saml:Issuer");
    writer.WriteString("Name of identity provider");
    writer.EndNode();

    writer.EndNode();

    var xml_string = writer.ToString();
    console.log(xml_string);
}


/** 
 *  This function is taken from http://www.codeproject.com/Articles/12504/Writing-XML-using-JavaScript 
 */
function XMLWriter()
{
    this.XML=[];
    this.Nodes=[];
    this.State="";
    this.FormatXML = function(Str)
    {
        if (Str)
            return Str.replace(/&/g, "&amp;").replace(/\"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        return ""
    }
    this.BeginNode = function(Name)
    {
        if (!Name) return;
        if (this.State=="beg") this.XML.push(">");
        this.State="beg";
        this.Nodes.push(Name);
        this.XML.push("<"+Name);
    }
    this.EndNode = function()
    {
        if (this.State=="beg")
	    {
		this.XML.push("/>");
		this.Nodes.pop();
	    }
        else if (this.Nodes.length>0)
            this.XML.push("</"+this.Nodes.pop()+">");
        this.State="";
    }
    this.Attrib = function(Name, Value)
    {
        if (this.State!="beg" || !Name) return;
        this.XML.push(" "+Name+"=\""+this.FormatXML(Value)+"\"");
    }
    this.WriteString = function(Value)
    {
        if (this.State=="beg") this.XML.push(">");
	this.XML.push(this.FormatXML(Value));
        this.State="";
    }
    this.Node = function(Name, Value)
    {
        if (!Name) return;
        if (this.State=="beg") this.XML.push(">");
        this.XML.push((Value=="" || !Value)?"<"+Name+"/>":"<"+Name+">"+this.FormatXML(Value)+"</"+Name+">");
        this.State="";
    }
    this.Close = function()
    {
        while (this.Nodes.length>0)
            this.EndNode();
        this.State="closed";
    }
    this.ToString = function(){return this.XML.join("");}
}


function main() {
    var server = http.createServer(request_handler);
    server.listen(PORT, function(){
	console.log("Identity provider listening on: http://localhost:%s", PORT);
    });
}

main();