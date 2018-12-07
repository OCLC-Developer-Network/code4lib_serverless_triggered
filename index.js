'use strict';

const aws = require('aws-sdk');
const axios = require("axios");
const dom = require('xmldom').DOMParser;
const fs = require('fs');
const nodeauth = require("nodeauth");
const parse = require('csv-parse/lib/sync');
const stringify = require('csv-stringify');
const xpath = require('xpath');
const yaml = require('js-yaml');

const s3 = new aws.S3();

const kms = new aws.KMS({'region': 'us-east-1'});
let environment = 'prod';
const params = {
  CiphertextBlob: fs.readFileSync(environment + "_config_encrypted.txt")
}

exports.handler = async (event) => {
	try {
		let data = await kms.decrypt(params).promise();
		
		let config = yaml.load(data['Plaintext'].toString());
		const options = {
			    services: ["WorldCatMetadataAPI"]
			};

		const user = new nodeauth.User(config['institution'], config['principalID'], config['principalIDNS']);
		const wskey = new nodeauth.Wskey(config['wskey'], config['secret'], options);
		
		let accessToken = await wskey.getAccessTokenWithClientCredentials(config['institution'], config['institution'], user)
		
		// Get the object from the event and show its content type
	    const bucket = event.Records[0].s3.bucket.name;
	    const key = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));
		var dstKey = "event_log_" + key;
	    
		try {
			let data = await s3.getObject({Bucket: bucket, Key: key}).promise();
			let records = parse(data.Body, {columns: true});
			// create comma seperated list of OCLC numbers
			let ids = records.map(record => record.oclcnumber);
			
			var request_config = {
	    			  headers: {
	    				  'Authorization': 'Bearer ' + accessToken.getAccessTokenString(),
	    				  'Accept': 'application/atom+xml',
	    				  'User-Agent': 'node.js KAC client'
	    			  }
	    			};
	      	let url = "https://worldcat.org/bib/checkcontrolnumbers?oclcNumbers=" + ids;
	      	try {
	      		let request_response = await axios.get(url, request_config);
	      		let doc = new dom().parseFromString(request_response.data);
	  			let select = xpath.useNamespaces({"atom": "http://www.w3.org/2005/Atom", "metadata": "http://worldcat.org/metadata-api-service"});
	  			let newIdNodes = select('//atom:content/metadata:oclcNumberRecordResult/metadata:currentOclcNumber', doc);
	  			let newIds = newIdNodes.map(newIdNode => newIdNode.firstChild.data);
	  			try {
	  				let result = await s3.putObject({Bucket: bucket, Key: dstKey, Body: ids.join(",")}).promise();
	  			    	console.log('success')
	  				return { status: 'success' }  
	  			} catch (Error) {
	  			    console.log(Error, Error.stack);
	  			    return Error;
	  			}
	      	}catch (Error){
	      		console.log(Error, Error.stack);
			    return Error;
	      	}
		} catch (Error) {
			console.log(Error, Error.stack);
	        return Error;
		}
		
	} catch (Error){
		console.log(Error, Error.stack);
	    return Error;
	}       
};